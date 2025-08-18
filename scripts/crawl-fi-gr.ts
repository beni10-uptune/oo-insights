#!/usr/bin/env npx tsx
/**
 * Quick crawl for Finland and Greece specifically
 */

import { prisma } from '../src/lib/db';
import { scrapeUrl, MARKET_CONFIG } from '../src/lib/firecrawl';
import { summarizeContent } from '../src/lib/services/simple-ai';
import { categorizeContent } from '../src/lib/services/ai-categorization';
import crypto from 'crypto';

const PAGES_TO_TRY = [
  '', // Homepage
  '/what-is-obesity',
  '/treatment-options',
  '/bmi-calculator',
  '/healthcare-professionals',
];

async function crawlMarket(market: string) {
  const config = MARKET_CONFIG[market];
  if (!config) {
    console.log(`❌ No config for ${market}`);
    return;
  }

  console.log(`\n🔍 Crawling ${market}: ${config.url}`);
  
  const baseUrl = config.url.replace('.html', '');
  let created = 0;
  
  for (const page of PAGES_TO_TRY) {
    const url = config.url.endsWith('.html') && page === '' 
      ? config.url 
      : baseUrl + page + '.html';
    
    try {
      console.log(`  📄 ${url}`);
      
      // Check if exists
      const existing = await prisma.contentPage.findFirst({ where: { url } });
      if (existing) {
        console.log('    ⚠️ Already exists');
        continue;
      }
      
      // Scrape
      const scraped = await scrapeUrl(url);
      if (!scraped || !scraped.content) {
        console.log('    ❌ No content');
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
        url
      );
      
      // Store
      const urlObj = new URL(url);
      await prisma.contentPage.create({
        data: {
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
          source: 'fi-gr-crawl',
          publishDate: new Date(),
          summary: summaryResult.original,
          summaryEn: summaryResult.english,
          category: categorization.category,
          contentType: categorization.contentType,
          lastCrawledAt: new Date(),
          lastModifiedAt: new Date(),
          changeHash: crypto.createHash('sha256').update(scraped.content).digest('hex'),
          changePct: 0,
        }
      });
      
      created++;
      console.log('    ✅ Created');
      
      await new Promise(r => setTimeout(r, 500));
    } catch (error) {
      console.log(`    ❌ Error: ${error.message}`);
    }
  }
  
  console.log(`  Total created: ${created}`);
}

async function main() {
  console.log('🚀 Crawling Finland and Greece\n');
  
  await crawlMarket('fi');
  await crawlMarket('gr');
  
  // Check final status
  const fi = await prisma.contentPage.count({ where: { market: 'fi' } });
  const gr = await prisma.contentPage.count({ where: { market: 'gr' } });
  
  console.log('\n✅ Final Status:');
  console.log(`  Finland: ${fi} pages`);
  console.log(`  Greece: ${gr} pages`);
  
  await prisma.$disconnect();
}

main().catch(console.error);