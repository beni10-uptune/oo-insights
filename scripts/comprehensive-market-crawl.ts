#!/usr/bin/env npx tsx
/**
 * Comprehensive crawl for ALL markets
 * Especially focused on markets that only have homepage content
 * Run with: npx tsx scripts/comprehensive-market-crawl.ts
 */

import { prisma } from '../src/lib/db';
import { scrapeUrl, MARKET_CONFIG } from '../src/lib/firecrawl';
import { fetchSitemap } from '../src/lib/services/sitemap-parser';
import { summarizeContent } from '../src/lib/services/simple-ai';
import { categorizeContent } from '../src/lib/services/ai-categorization';
import crypto from 'crypto';

// Markets that are on the global domain and need special handling
const GLOBAL_DOMAIN_MARKETS = [
  'be_nl', 'be_fr', 'bg', 'fi', 'gr', 'hu', 'is', 'ie', 'sk', 'rs'
];

// Markets that have their own domains
const DEDICATED_DOMAIN_MARKETS = [
  'de', 'fr', 'it', 'es', 'ca_en', 'ca_fr', 
  'ch_de', 'ch_it', 'ch_fr', 
  'se', 'no', 'lv', 'ee', 'lt', 'hr'
];

async function crawlMarket(market: string, config: any) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Crawling ${market}: ${config.url}`);
  console.log(`Language: ${config.language}, Timezone: ${config.timezone}`);
  console.log('='.repeat(60));

  const stats = {
    total: 0,
    new: 0,
    updated: 0,
    failed: 0,
    translated: 0,
    categorized: 0,
  };

  try {
    // For global domain markets, we need to manually crawl the pages
    // since they don't have proper sitemaps
    let urlsToProcess: string[] = [];

    if (GLOBAL_DOMAIN_MARKETS.includes(market)) {
      // For global domain markets, we'll crawl a set of known pages
      const baseUrl = config.url.replace('.html', '');
      const commonPages = [
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

      urlsToProcess = commonPages.map(page => {
        // Handle the special case where the URL ends with .html
        if (config.url.endsWith('.html') && page === '') {
          return config.url; // Homepage
        }
        return baseUrl + page + '.html';
      });

      console.log(`Manual crawl for ${market} - checking ${urlsToProcess.length} potential pages`);
    } else {
      // For dedicated domain markets, try to get sitemap
      const sitemapEntries = await fetchSitemap(config.url);
      
      if (sitemapEntries.length > 0) {
        console.log(`Found ${sitemapEntries.length} pages in sitemap`);
        urlsToProcess = sitemapEntries.slice(0, 50).map(entry => entry.url); // Limit to 50 pages
      } else {
        console.log('No sitemap found, trying manual crawl');
        // Fallback to homepage only
        urlsToProcess = [config.url];
      }
    }

    // Get existing pages from database
    const existingPages = await prisma.contentPage.findMany({
      where: { market },
      select: { url: true, id: true },
    });
    const existingUrlSet = new Set(existingPages.map(p => p.url));

    // Process each URL
    for (const url of urlsToProcess) {
      stats.total++;
      
      try {
        console.log(`\n  Scraping: ${url}`);
        
        // Check if page already exists
        const existingPage = existingPages.find(p => p.url === url);
        
        // Scrape the page
        const scraped = await scrapeUrl(url);
        
        if (!scraped || !scraped.content) {
          // Try without .html extension if it failed
          if (url.endsWith('.html')) {
            const altUrl = url.replace('.html', '');
            console.log(`    Trying alternative URL: ${altUrl}`);
            const altScraped = await scrapeUrl(altUrl);
            if (altScraped && altScraped.content) {
              Object.assign(scraped || {}, altScraped);
            } else {
              console.log('    ✗ Failed to scrape');
              stats.failed++;
              continue;
            }
          } else {
            console.log('    ✗ Failed to scrape');
            stats.failed++;
            continue;
          }
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
          stats.translated++;
          console.log('    ✓ Generated English summary');
        } catch (error) {
          console.error('    ✗ Failed to generate summary:', error);
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
          stats.categorized++;
          console.log(`    ✓ Categorized as: ${category} (${contentType})`);
        } catch (error) {
          console.error('    ✗ Failed to categorize:', error);
        }

        // Generate content hash
        const contentHash = crypto
          .createHash('sha256')
          .update(scraped.content)
          .digest('hex');

        // Parse URL
        const urlObj = new URL(url);

        // Store in database
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
          isArticle: url.includes('/article') || url.includes('/stories'),
          source: 'comprehensive-crawl',
          publishDate: new Date(), // We don't have sitemap dates for these
          summary,
          summaryEn,
          category,
          contentType,
          confidence,
          keywords,
          hasVideo: signals.hasVideo || false,
          hasCalculator: signals.hasCalculator || false,
          hasForm: signals.hasForm || false,
          readingTime: signals.readingTime || null,
          signals,
          lastCrawledAt: new Date(),
          lastModifiedAt: new Date(),
          changeHash: contentHash,
          changePct: 0,
        };

        let page;
        let eventType: 'created' | 'updated' = 'created';
        
        if (existingPage) {
          // Update existing page
          page = await prisma.contentPage.update({
            where: { id: existingPage.id },
            data: pageData,
          });
          eventType = 'updated';
          stats.updated++;
          console.log(`    ✓ Updated existing page`);
        } else {
          // Create new page
          page = await prisma.contentPage.create({ data: pageData });
          stats.new++;
          console.log(`    ✓ Created new page`);
        }
        
        // Create event
        await prisma.pageEvent.create({
          data: {
            pageId: page.id,
            url,
            eventType,
            market,
            language: config.language,
            title: scraped.title,
            summary: summaryEn || summary,
            category,
            eventAt: new Date(),
          },
        });
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`    ✗ Error processing ${url}:`, error);
        stats.failed++;
      }
    }

  } catch (error) {
    console.error(`Error crawling market ${market}:`, error);
  }

  console.log(`\n${market} Summary:`);
  console.log(`  Total URLs: ${stats.total}`);
  console.log(`  New pages: ${stats.new}`);
  console.log(`  Failed: ${stats.failed}`);
  console.log(`  Translated: ${stats.translated}`);
  console.log(`  Categorized: ${stats.categorized}`);

  return stats;
}

async function main() {
  console.log('Starting comprehensive market crawl...');
  console.log('This will crawl ALL markets, especially those with limited content\n');

  const results: Record<string, any> = {};

  // First, crawl global domain markets that need special attention
  console.log('\n' + '='.repeat(60));
  console.log('PHASE 1: Global Domain Markets (need special handling)');
  console.log('='.repeat(60));

  for (const market of GLOBAL_DOMAIN_MARKETS) {
    const config = MARKET_CONFIG[market];
    if (config) {
      results[market] = await crawlMarket(market, config);
    } else {
      console.log(`⚠ No configuration found for ${market}`);
    }
  }

  // Then crawl markets with dedicated domains that might be missing content
  console.log('\n' + '='.repeat(60));
  console.log('PHASE 2: Dedicated Domain Markets');
  console.log('='.repeat(60));

  // Check which dedicated markets have low content
  for (const market of DEDICATED_DOMAIN_MARKETS) {
    const pageCount = await prisma.contentPage.count({ where: { market } });
    
    if (pageCount < 10) {
      console.log(`\n${market} has only ${pageCount} pages - needs crawling`);
      const config = MARKET_CONFIG[market];
      if (config) {
        results[market] = await crawlMarket(market, config);
      }
    } else {
      console.log(`\n${market} already has ${pageCount} pages - skipping`);
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('COMPREHENSIVE CRAWL COMPLETE');
  console.log('='.repeat(60));

  let totalNew = 0;
  let totalFailed = 0;
  let totalTranslated = 0;
  let totalCategorized = 0;

  Object.entries(results).forEach(([market, stats]) => {
    totalNew += stats.new || 0;
    totalFailed += stats.failed || 0;
    totalTranslated += stats.translated || 0;
    totalCategorized += stats.categorized || 0;
    console.log(`${market}: ${stats.new} new, ${stats.failed} failed`);
  });

  console.log(`\nTotals:`);
  console.log(`  New pages: ${totalNew}`);
  console.log(`  Failed: ${totalFailed}`);
  console.log(`  Translated: ${totalTranslated}`);
  console.log(`  Categorized: ${totalCategorized}`);

  // Show current content status
  console.log('\n' + '='.repeat(60));
  console.log('CURRENT DATABASE STATUS');
  console.log('='.repeat(60));

  for (const market of [...GLOBAL_DOMAIN_MARKETS, ...DEDICATED_DOMAIN_MARKETS]) {
    const count = await prisma.contentPage.count({ where: { market } });
    const withSummary = await prisma.contentPage.count({ 
      where: { 
        market,
        summaryEn: { not: null }
      } 
    });
    const withCategory = await prisma.contentPage.count({ 
      where: { 
        market,
        category: { not: null }
      } 
    });
    
    const flag = MARKET_CONFIG[market]?.flag || '🌍';
    console.log(`${flag} ${market.padEnd(8)} - ${count} pages (${withSummary} translated, ${withCategory} categorized)`);
  }

  await prisma.$disconnect();
}

// Run the script
main().catch(console.error);