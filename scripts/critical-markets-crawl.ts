#!/usr/bin/env npx tsx
/**
 * Focused crawl for critical markets that have no content
 * Specifically: Ireland, Iceland, Finland, Greece, and other empty markets
 */

import { prisma } from '../src/lib/db';
import { scrapeUrl, MARKET_CONFIG } from '../src/lib/firecrawl';
import { summarizeContent } from '../src/lib/services/simple-ai';
import { categorizeContent } from '../src/lib/services/ai-categorization';
import crypto from 'crypto';

// Critical markets that user explicitly mentioned
const CRITICAL_MARKETS = ['ie', 'is', 'fi', 'gr'];

// Additional empty markets to crawl
const EMPTY_MARKETS = [
  'ca_en', 'ca_fr', 'ch_de', 'ch_it', 'ch_fr', 
  'se', 'no', 'lv', 'ee', 'lt', 'hr',
  'bg', 'hu', 'sk', 'rs'
];

// Common pages to check for global domain markets
const COMMON_PAGES = [
  '', // Homepage
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
];

async function crawlMarket(market: string, config: any) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔍 Crawling ${market}: ${config.url}`);
  console.log(`   Language: ${config.language}, Flag: ${config.flag}`);
  console.log('='.repeat(60));

  const stats = {
    total: 0,
    new: 0,
    updated: 0,
    failed: 0,
    translated: 0,
    categorized: 0,
  };

  // Get existing pages
  const existingPages = await prisma.contentPage.findMany({
    where: { market },
    select: { url: true, id: true },
  });
  const existingMap = new Map(existingPages.map(p => [p.url, p.id]));

  // Determine URLs to crawl
  let urlsToProcess: string[] = [];
  
  // For global domain markets, build URLs manually
  if (config.url.includes('truthaboutweight.global')) {
    const baseUrl = config.url.replace('.html', '');
    urlsToProcess = COMMON_PAGES.map(page => {
      if (config.url.endsWith('.html') && page === '') {
        return config.url; // Homepage
      }
      return baseUrl + page + '.html';
    });
    console.log(`📋 Checking ${urlsToProcess.length} potential pages`);
  } else {
    // For dedicated domains, just try homepage and a few key pages
    urlsToProcess = [
      config.url,
      config.url + 'what-is-obesity',
      config.url + 'treatment-options',
      config.url + 'bmi-calculator',
    ];
  }

  // Process each URL
  for (const url of urlsToProcess) {
    stats.total++;
    
    try {
      console.log(`\n  📄 Scraping: ${url}`);
      
      // Scrape the page
      const scraped = await scrapeUrl(url);
      
      if (!scraped || !scraped.content) {
        console.log('    ❌ No content found');
        stats.failed++;
        continue;
      }

      console.log(`    ✓ Found content (${scraped.content.length} chars)`);

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
        stats.translated++;
        console.log('    ✓ Generated English summary');
      } catch (error) {
        console.error('    ❌ Summary generation failed');
      }

      // Categorize content with improved prompting
      let category = null;
      let contentType = null;
      
      try {
        const categorization = await categorizeContent(
          scraped.content,
          scraped.title || '',
          url
        );
        category = categorization.category;
        contentType = categorization.contentType;
        stats.categorized++;
        console.log(`    ✓ Categorized as: ${category}`);
      } catch (error) {
        console.error('    ❌ Categorization failed');
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
        isArticle: false,
        source: 'critical-markets-crawl',
        publishDate: new Date(),
        summary,
        summaryEn,
        category,
        contentType,
        lastCrawledAt: new Date(),
        lastModifiedAt: new Date(),
        changeHash: contentHash,
        changePct: 0,
      };

      // Check if page exists
      const existingId = existingMap.get(url);
      
      if (existingId) {
        // Update existing page
        await prisma.contentPage.update({
          where: { id: existingId },
          data: pageData,
        });
        stats.updated++;
        console.log('    ✓ Updated existing page');
      } else {
        // Create new page
        const page = await prisma.contentPage.create({ data: pageData });
        
        // Create event
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
            eventAt: new Date(),
          },
        });
        
        stats.new++;
        console.log('    ✓ Created new page');
      }
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`    ❌ Error: ${error.message}`);
      stats.failed++;
    }
  }

  console.log(`\n📊 ${market} Summary:`);
  console.log(`   Total attempts: ${stats.total}`);
  console.log(`   New pages: ${stats.new}`);
  console.log(`   Updated: ${stats.updated}`);
  console.log(`   Failed: ${stats.failed}`);
  console.log(`   Translated: ${stats.translated}`);
  console.log(`   Categorized: ${stats.categorized}`);

  return stats;
}

async function main() {
  console.log('🚀 Starting Critical Markets Crawl');
  console.log('   Focus: Ireland, Iceland, Finland, Greece + empty markets\n');

  const results: Record<string, any> = {};

  // Phase 1: Critical markets mentioned by user
  console.log('\n' + '='.repeat(60));
  console.log('PHASE 1: CRITICAL MARKETS (User Priority)');
  console.log('='.repeat(60));

  for (const market of CRITICAL_MARKETS) {
    const config = MARKET_CONFIG[market];
    if (config) {
      results[market] = await crawlMarket(market, config);
    } else {
      console.log(`⚠️  No configuration for ${market}`);
    }
  }

  // Phase 2: Other empty markets
  console.log('\n' + '='.repeat(60));
  console.log('PHASE 2: OTHER EMPTY MARKETS');
  console.log('='.repeat(60));

  for (const market of EMPTY_MARKETS) {
    const config = MARKET_CONFIG[market];
    if (config) {
      // Check if market already has content
      const pageCount = await prisma.contentPage.count({ where: { market } });
      
      if (pageCount === 0) {
        console.log(`\n⚠️  ${market} has 0 pages - crawling...`);
        results[market] = await crawlMarket(market, config);
      } else {
        console.log(`\n✅ ${market} already has ${pageCount} pages - skipping`);
      }
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('🎯 CRAWL COMPLETE - SUMMARY');
  console.log('='.repeat(60));

  let totalNew = 0;
  let totalUpdated = 0;
  let totalFailed = 0;

  Object.entries(results).forEach(([market, stats]) => {
    totalNew += stats.new || 0;
    totalUpdated += stats.updated || 0;
    totalFailed += stats.failed || 0;
    console.log(`${MARKET_CONFIG[market]?.flag} ${market}: ${stats.new} new, ${stats.updated} updated, ${stats.failed} failed`);
  });

  console.log(`\n📈 Totals:`);
  console.log(`   New pages: ${totalNew}`);
  console.log(`   Updated: ${totalUpdated}`);
  console.log(`   Failed: ${totalFailed}`);

  await prisma.$disconnect();
}

// Run the script
main().catch(console.error);