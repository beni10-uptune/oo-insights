#!/usr/bin/env npx tsx
/**
 * Crawl markets that have REAL sitemaps (Germany, France, Italy, etc.)
 * These are the dedicated domain markets with proper content
 */

import { prisma } from '../src/lib/db';
import { scrapeUrl, MARKET_CONFIG } from '../src/lib/firecrawl';
import { fetchSitemap } from '../src/lib/services/sitemap-parser';
import { summarizeContent } from '../src/lib/services/simple-ai';
import { categorizeContent } from '../src/lib/services/ai-categorization';
import crypto from 'crypto';

// Markets with dedicated domains and real sitemaps
const MARKETS_WITH_SITEMAPS = [
  'de',  // Germany - https://www.ueber-gewicht.de/
  'fr',  // France - https://www.audeladupoids.fr/
  'it',  // Italy - https://www.novoio.it/
  'es',  // Spain - https://www.laverdaddesupeso.es/
  'se',  // Sweden - https://www.meromobesitas.se/
  'no',  // Norway - https://www.snakkomvekt.no/
  'lv',  // Latvia - https://www.manssvars.lv/
  'ee',  // Estonia - https://www.minukaal.ee/
  'lt',  // Lithuania - https://www.manosvoris.lt/
  'hr',  // Croatia - https://www.istinaodebljini.hr/
];

async function crawlMarketWithSitemap(market: string, maxPages: number = 50) {
  const config = MARKET_CONFIG[market];
  if (!config) {
    console.log(`❌ No config for ${market}`);
    return null;
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log(`${config.flag} Crawling ${market.toUpperCase()} - ${config.url}`);
  console.log('='.repeat(70));

  const stats = {
    market,
    sitemapUrls: 0,
    processed: 0,
    new: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
  };

  try {
    // Fetch sitemap
    console.log('📍 Fetching sitemap...');
    const sitemapEntries = await fetchSitemap(config.url);
    stats.sitemapUrls = sitemapEntries.length;
    
    console.log(`✅ Found ${sitemapEntries.length} URLs in sitemap`);
    
    if (sitemapEntries.length === 0) {
      console.log('⚠️  No sitemap entries found');
      return stats;
    }
    
    // Get existing pages
    const existingPages = await prisma.contentPage.findMany({
      where: { market },
      select: { url: true, id: true, lastCrawledAt: true },
    });
    const existingMap = new Map(existingPages.map(p => [p.url, p]));
    
    console.log(`📊 ${existingPages.length} pages already in database`);
    
    // Process sitemap entries (limit to maxPages)
    const entriesToProcess = sitemapEntries.slice(0, maxPages);
    console.log(`🔄 Processing ${entriesToProcess.length} pages (max: ${maxPages})`);
    
    for (let i = 0; i < entriesToProcess.length; i++) {
      const entry = entriesToProcess[i];
      stats.processed++;
      
      // Progress indicator
      if ((i + 1) % 10 === 0) {
        console.log(`  Progress: ${i + 1}/${entriesToProcess.length}`);
      }
      
      try {
        const existing = existingMap.get(entry.url);
        
        // Skip if crawled in last 6 hours
        if (existing && existing.lastCrawledAt) {
          const hoursSinceLastCrawl = (Date.now() - existing.lastCrawledAt.getTime()) / (1000 * 60 * 60);
          if (hoursSinceLastCrawl < 6) {
            stats.skipped++;
            continue;
          }
        }
        
        console.log(`  📄 [${i + 1}/${entriesToProcess.length}] ${entry.url.substring(entry.url.lastIndexOf('/') + 1)}`);
        
        // Scrape the page
        const scraped = await scrapeUrl(entry.url);
        
        if (!scraped || !scraped.content || scraped.content.length < 100) {
          console.log('    ❌ No content');
          stats.failed++;
          continue;
        }
        
        // Summarize
        const summaryResult = await summarizeContent(
          scraped.content.substring(0, 5000),
          config.language
        );
        
        // Categorize
        const categorization = await categorizeContent(
          scraped.content,
          scraped.title || '',
          entry.url
        );
        
        // Prepare data
        const urlObj = new URL(entry.url);
        const pageData = {
          url: entry.url,
          domain: urlObj.hostname,
          path: urlObj.pathname,
          market,
          language: config.language,
          title: scraped.title,
          description: scraped.description,
          rawHtml: scraped.html?.substring(0, 65535),
          textContent: scraped.content,
          wordCount: scraped.content.split(/\s+/).length,
          tags: [],
          isArticle: entry.isArticle,
          source: 'sitemap-crawl',
          publishDate: entry.publishDate || new Date(),
          lastModifiedAt: entry.lastmod ? new Date(entry.lastmod) : new Date(),
          summary: summaryResult.original,
          summaryEn: summaryResult.english,
          category: categorization.category,
          contentType: categorization.contentType,
          confidence: categorization.confidence,
          keywords: categorization.keywords,
          hasVideo: categorization.signals?.hasVideo || false,
          hasCalculator: categorization.signals?.hasCalculator || false,
          hasForm: categorization.signals?.hasForm || false,
          readingTime: categorization.signals?.readingTime || null,
          signals: categorization.signals,
          lastCrawledAt: new Date(),
          changeHash: crypto.createHash('sha256').update(scraped.content).digest('hex'),
          changePct: 0,
        };
        
        if (existing) {
          // Update
          await prisma.contentPage.update({
            where: { id: existing.id },
            data: pageData,
          });
          stats.updated++;
          console.log('    ✅ Updated');
        } else {
          // Create
          const page = await prisma.contentPage.create({ data: pageData });
          
          // Create event
          await prisma.pageEvent.create({
            data: {
              pageId: page.id,
              url: entry.url,
              eventType: 'created',
              market,
              language: config.language,
              title: scraped.title,
              summary: summaryResult.english,
              category: categorization.category,
              eventAt: entry.publishDate || new Date(),
            },
          });
          
          stats.new++;
          console.log('    ✅ Created');
        }
        
        // Small delay
        await new Promise(r => setTimeout(r, 200));
        
      } catch (error) {
        console.log(`    ❌ Error: ${error.message}`);
        stats.failed++;
      }
    }
    
  } catch (error) {
    console.error(`Failed to crawl ${market}:`, error);
  }
  
  console.log(`\n📊 ${market.toUpperCase()} Results:`);
  console.log(`  Sitemap URLs: ${stats.sitemapUrls}`);
  console.log(`  Processed: ${stats.processed}`);
  console.log(`  New: ${stats.new}`);
  console.log(`  Updated: ${stats.updated}`);
  console.log(`  Skipped: ${stats.skipped}`);
  console.log(`  Failed: ${stats.failed}`);
  
  return stats;
}

async function main() {
  console.log('🚀 CRAWLING MARKETS WITH REAL SITEMAPS');
  console.log('This will fetch actual sitemap content from dedicated domains\n');
  
  const results = [];
  
  for (const market of MARKETS_WITH_SITEMAPS) {
    const result = await crawlMarketWithSitemap(market, 50); // Max 50 pages per market
    if (result) {
      results.push(result);
    }
    
    // Check current database totals
    const totalInDb = await prisma.contentPage.count({ where: { market } });
    console.log(`  📈 Total in database: ${totalInDb}`);
  }
  
  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('🎯 CRAWL SUMMARY');
  console.log('='.repeat(70));
  
  let totalNew = 0;
  let totalUpdated = 0;
  let totalFailed = 0;
  
  results.forEach(r => {
    totalNew += r.new;
    totalUpdated += r.updated;
    totalFailed += r.failed;
    
    const flag = MARKET_CONFIG[r.market]?.flag || '🌍';
    console.log(`${flag} ${r.market.padEnd(4)} - Found ${r.sitemapUrls} URLs, Created ${r.new}, Updated ${r.updated}`);
  });
  
  console.log(`\n📈 Totals:`);
  console.log(`  New pages: ${totalNew}`);
  console.log(`  Updated: ${totalUpdated}`);
  console.log(`  Failed: ${totalFailed}`);
  
  // Final check
  const totalPages = await prisma.contentPage.count();
  const withEnglish = await prisma.contentPage.count({
    where: { summaryEn: { not: null } }
  });
  const withCategory = await prisma.contentPage.count({
    where: { category: { not: null } }
  });
  
  console.log(`\n📊 Database Totals:`);
  console.log(`  Total pages: ${totalPages}`);
  console.log(`  With English: ${withEnglish} (${Math.round(withEnglish/totalPages*100)}%)`);
  console.log(`  With categories: ${withCategory} (${Math.round(withCategory/totalPages*100)}%)`);
  
  await prisma.$disconnect();
}

main().catch(console.error);