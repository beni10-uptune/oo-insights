#!/usr/bin/env npx tsx
/**
 * Comprehensive sitemap-based crawler for ALL EUCAN markets
 * This fetches ALL pages from each market's sitemap
 */

import { prisma } from '../src/lib/db';
import { scrapeUrl, MARKET_CONFIG } from '../src/lib/firecrawl';
import { fetchSitemap } from '../src/lib/services/sitemap-parser';
import { summarizeContent } from '../src/lib/services/simple-ai';
import { categorizeContent } from '../src/lib/services/ai-categorization';
import crypto from 'crypto';

// All EUCAN markets to crawl
const ALL_MARKETS = Object.keys(MARKET_CONFIG);

async function crawlMarketFromSitemap(market: string) {
  const config = MARKET_CONFIG[market];
  if (!config) {
    console.log(`❌ No config for ${market}`);
    return { market, total: 0, new: 0, updated: 0, failed: 0 };
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log(`${config.flag} Crawling ${market.toUpperCase()} - ${config.url}`);
  console.log(`Language: ${config.language}`);
  console.log('='.repeat(70));

  const stats = {
    market,
    total: 0,
    new: 0,
    updated: 0,
    failed: 0,
    withTranslation: 0,
    withCategory: 0,
  };

  try {
    // Fetch sitemap
    console.log('📍 Fetching sitemap...');
    const sitemapEntries = await fetchSitemap(config.url);
    
    if (sitemapEntries.length === 0) {
      console.log('⚠️  No sitemap found, trying manual URLs...');
      
      // Fallback: try common URLs for markets without sitemaps
      const baseUrl = config.url.endsWith('.html') 
        ? config.url.substring(0, config.url.lastIndexOf('/'))
        : config.url.replace(/\/$/, '');
        
      const commonPaths = [
        '',
        '/what-is-obesity',
        '/causes-of-obesity',
        '/obesity-and-health',
        '/managing-weight',
        '/treatment-options',
        '/find-support',
        '/patient-stories',
        '/healthcare-professionals',
        '/bmi-calculator',
        '/resources',
        '/about',
        '/contact',
        '/obesity-complications',
        '/weight-loss-medications',
        '/lifestyle-changes',
        '/medical-support',
        '/obesity-myths',
        '/healthy-recipes',
        '/exercise-tips',
      ];
      
      // Build URLs based on market structure
      const urlsToTry = [];
      if (config.url.includes('truthaboutweight.global')) {
        // Global domain markets need special handling
        const parts = config.url.split('/');
        const countryCode = parts[parts.length - 2];
        const langCode = parts[parts.length - 1].replace('.html', '');
        
        commonPaths.forEach(path => {
          if (path === '') {
            urlsToTry.push(config.url);
          } else {
            urlsToTry.push(`https://www.truthaboutweight.global/${countryCode}/${langCode}${path}.html`);
          }
        });
      } else {
        // Dedicated domain markets
        commonPaths.forEach(path => {
          urlsToTry.push(baseUrl + path);
        });
      }
      
      // Create pseudo-sitemap entries
      sitemapEntries.push(...urlsToTry.map(url => ({
        url,
        publishDate: new Date(),
        lastmod: new Date(),
        changefreq: 'weekly' as const,
        priority: 0.5,
      })));
    }
    
    console.log(`📋 Found ${sitemapEntries.length} URLs to process`);
    
    // Get existing pages for this market
    const existingPages = await prisma.contentPage.findMany({
      where: { market },
      select: { url: true, id: true },
    });
    const existingMap = new Map(existingPages.map(p => [p.url, p.id]));
    
    // Process each URL from sitemap
    let processedCount = 0;
    for (const entry of sitemapEntries) {
      processedCount++;
      stats.total++;
      
      // Progress indicator
      if (processedCount % 10 === 0) {
        console.log(`  Progress: ${processedCount}/${sitemapEntries.length}`);
      }
      
      try {
        const url = entry.url;
        
        // Check if already exists
        const existingId = existingMap.get(url);
        
        // Skip if recently updated (within last 24 hours)
        if (existingId) {
          const existing = await prisma.contentPage.findUnique({
            where: { id: existingId },
            select: { lastCrawledAt: true, summaryEn: true, category: true }
          });
          
          const hoursSinceLastCrawl = existing?.lastCrawledAt 
            ? (Date.now() - existing.lastCrawledAt.getTime()) / (1000 * 60 * 60)
            : 999;
            
          // If recently crawled and has translations/categories, skip
          if (hoursSinceLastCrawl < 24 && existing?.summaryEn && existing?.category) {
            console.log(`  ⏭️  Skipping ${url} (recently updated)`);
            stats.withTranslation++;
            stats.withCategory++;
            continue;
          }
        }
        
        console.log(`  📄 Processing: ${url}`);
        
        // Scrape the page
        const scraped = await scrapeUrl(url);
        
        if (!scraped || !scraped.content || scraped.content.length < 50) {
          console.log(`    ❌ No content found`);
          stats.failed++;
          continue;
        }
        
        // Generate English summary
        let summaryEn = null;
        let summary = null;
        
        try {
          const summaryResult = await summarizeContent(
            scraped.content.substring(0, 5000),
            config.language
          );
          summary = summaryResult.original;
          summaryEn = summaryResult.english;
          stats.withTranslation++;
        } catch (error) {
          console.error(`    ⚠️  Summary generation failed`);
        }
        
        // Categorize content
        let category = null;
        let contentType = null;
        let confidence = null;
        let keywords: string[] = [];
        let signals: any = {};
        
        try {
          const categorization = await categorizeContent(
            scraped.content,
            scraped.title || '',
            url
          );
          category = categorization.category;
          contentType = categorization.contentType;
          confidence = categorization.confidence;
          keywords = categorization.keywords;
          signals = categorization.signals;
          stats.withCategory++;
        } catch (error) {
          console.error(`    ⚠️  Categorization failed`);
        }
        
        // Generate content hash
        const contentHash = crypto
          .createHash('sha256')
          .update(scraped.content)
          .digest('hex');
        
        // Parse URL
        const urlObj = new URL(url);
        
        // Prepare page data
        const pageData = {
          url,
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
          isArticle: url.includes('/article') || url.includes('/stories') || url.includes('/blog'),
          source: 'sitemap-full-crawl',
          publishDate: entry.publishDate || new Date(),
          lastModifiedAt: entry.lastmod || new Date(),
          summary,
          summaryEn,
          category,
          contentType,
          confidence,
          keywords,
          hasVideo: signals?.hasVideo || false,
          hasCalculator: signals?.hasCalculator || false,
          hasForm: signals?.hasForm || false,
          readingTime: signals?.readingTime || null,
          signals,
          lastCrawledAt: new Date(),
          changeHash: contentHash,
          changePct: 0,
        };
        
        if (existingId) {
          // Update existing page
          await prisma.contentPage.update({
            where: { id: existingId },
            data: pageData,
          });
          stats.updated++;
          console.log(`    ✅ Updated`);
          
          // Create update event
          await prisma.pageEvent.create({
            data: {
              pageId: existingId,
              url,
              eventType: 'updated',
              market,
              language: config.language,
              title: scraped.title,
              summary: summaryEn || summary,
              category,
              eventAt: new Date(),
              changePct: 10, // Assume 10% change for updates
            },
          });
        } else {
          // Create new page
          const page = await prisma.contentPage.create({ data: pageData });
          stats.new++;
          console.log(`    ✅ Created`);
          
          // Create creation event
          await prisma.pageEvent.create({
            data: {
              pageId: page.id,
              url,
              eventType: 'created',
              market,
              language: config.language,
              title: scraped.title,
              summary: summaryEn || summary,
              category,
              eventAt: entry.publishDate || new Date(),
            },
          });
        }
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.error(`    ❌ Error: ${error.message}`);
        stats.failed++;
      }
    }
    
  } catch (error) {
    console.error(`Failed to crawl ${market}:`, error);
  }
  
  console.log(`\n📊 ${market.toUpperCase()} Summary:`);
  console.log(`  Total URLs: ${stats.total}`);
  console.log(`  New pages: ${stats.new}`);
  console.log(`  Updated: ${stats.updated}`);
  console.log(`  Failed: ${stats.failed}`);
  console.log(`  With translations: ${stats.withTranslation}`);
  console.log(`  With categories: ${stats.withCategory}`);
  
  return stats;
}

async function main() {
  console.log('🚀 COMPREHENSIVE SITEMAP-BASED CRAWL FOR ALL EUCAN MARKETS');
  console.log('This will fetch ALL pages from each market\'s sitemap\n');
  
  const results: any[] = [];
  
  // Priority markets first
  const priorityMarkets = ['ie', 'is', 'fi', 'gr', 'sk', 'it', 'fr', 'de', 'es', 'ca_en', 'ca_fr'];
  const otherMarkets = ALL_MARKETS.filter(m => !priorityMarkets.includes(m));
  
  console.log('\n📌 PHASE 1: PRIORITY MARKETS');
  console.log('=' .repeat(70));
  
  for (const market of priorityMarkets) {
    const result = await crawlMarketFromSitemap(market);
    results.push(result);
  }
  
  console.log('\n📌 PHASE 2: OTHER MARKETS');
  console.log('=' .repeat(70));
  
  for (const market of otherMarkets) {
    const result = await crawlMarketFromSitemap(market);
    results.push(result);
  }
  
  // Final summary
  console.log('\n' + '='.repeat(70));
  console.log('🎯 COMPLETE CRAWL SUMMARY');
  console.log('='.repeat(70));
  
  let totalNew = 0;
  let totalUpdated = 0;
  let totalFailed = 0;
  let totalWithTranslation = 0;
  let totalWithCategory = 0;
  
  results.forEach(r => {
    totalNew += r.new;
    totalUpdated += r.updated;
    totalFailed += r.failed;
    totalWithTranslation += r.withTranslation;
    totalWithCategory += r.withCategory;
    
    const flag = MARKET_CONFIG[r.market]?.flag || '🌍';
    console.log(`${flag} ${r.market.padEnd(8)} - ${r.new} new, ${r.updated} updated, ${r.failed} failed`);
  });
  
  console.log(`\n📈 Overall Totals:`);
  console.log(`  New pages: ${totalNew}`);
  console.log(`  Updated pages: ${totalUpdated}`);
  console.log(`  Failed: ${totalFailed}`);
  console.log(`  With translations: ${totalWithTranslation}`);
  console.log(`  With categories: ${totalWithCategory}`);
  
  // Final database status
  const totalPages = await prisma.contentPage.count();
  const pagesWithEnglish = await prisma.contentPage.count({
    where: { summaryEn: { not: null } }
  });
  const pagesWithCategory = await prisma.contentPage.count({
    where: { category: { not: null } }
  });
  
  console.log(`\n📊 Database Status:`);
  console.log(`  Total pages: ${totalPages}`);
  console.log(`  With English: ${pagesWithEnglish} (${Math.round(pagesWithEnglish/totalPages*100)}%)`);
  console.log(`  With categories: ${pagesWithCategory} (${Math.round(pagesWithCategory/totalPages*100)}%)`);
  
  await prisma.$disconnect();
}

// Run the script
main().catch(console.error);