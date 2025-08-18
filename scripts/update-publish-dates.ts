#!/usr/bin/env npx tsx
/**
 * Script to update all publish dates from sitemaps
 * Run with: npx tsx scripts/update-publish-dates.ts
 */

import { prisma } from '../src/lib/db';
import { fetchSitemap } from '../src/lib/services/sitemap-parser';
import { MARKET_CONFIG } from '../src/lib/firecrawl';

async function updatePublishDates() {
  console.log('Starting to update publish dates from sitemaps...\n');

  const markets = Object.keys(MARKET_CONFIG);
  const results = {
    total: 0,
    updated: 0,
    errors: 0,
    marketStats: {} as Record<string, { total: number; updated: number }>,
  };

  for (const market of markets) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Processing market: ${market} (${MARKET_CONFIG[market].url})`);
    console.log('='.repeat(60));

    try {
      // Fetch sitemap entries
      const sitemapEntries = await fetchSitemap(MARKET_CONFIG[market].url);
      console.log(`Found ${sitemapEntries.length} URLs in sitemap`);

      // Get existing pages for this market
      const existingPages = await prisma.contentPage.findMany({
        where: { market },
        select: { id: true, url: true, publishDate: true },
      });

      const existingUrlMap = new Map(
        existingPages.map(p => [p.url, { id: p.id, publishDate: p.publishDate }])
      );

      let marketUpdated = 0;
      let marketTotal = 0;

      // Update each page with sitemap date
      for (const entry of sitemapEntries) {
        const existing = existingUrlMap.get(entry.url);
        
        if (existing) {
          marketTotal++;
          
          // Check if we have a date from sitemap and it's different
          if (entry.publishDate && entry.publishDate instanceof Date) {
            const sitemapDate = entry.publishDate;
            const currentDate = existing.publishDate;
            
            // Update if no current date or if dates differ significantly
            const shouldUpdate = !currentDate || 
              Math.abs(sitemapDate.getTime() - currentDate.getTime()) > 86400000; // More than 1 day difference
            
            if (shouldUpdate) {
              try {
                await prisma.contentPage.update({
                  where: { id: existing.id },
                  data: { 
                    publishDate: sitemapDate,
                    lastModifiedAt: entry.lastmod ? new Date(entry.lastmod) : sitemapDate,
                  },
                });
                
                marketUpdated++;
                results.updated++;
                console.log(`  ✓ Updated: ${entry.url} -> ${sitemapDate.toISOString().split('T')[0]}`);
              } catch (error) {
                console.error(`  ✗ Failed to update ${entry.url}:`, error);
                results.errors++;
              }
            }
          }
        }
      }

      results.marketStats[market] = {
        total: marketTotal,
        updated: marketUpdated,
      };

      results.total += marketTotal;

      console.log(`\n${market} Summary: ${marketUpdated}/${marketTotal} pages updated`);

    } catch (error) {
      console.error(`Error processing market ${market}:`, error);
      results.errors++;
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('PUBLISH DATE UPDATE COMPLETE');
  console.log('='.repeat(60));
  console.log(`\nTotal pages processed: ${results.total}`);
  console.log(`Total pages updated: ${results.updated}`);
  console.log(`Errors: ${results.errors}`);
  
  console.log('\nMarket Breakdown:');
  Object.entries(results.marketStats)
    .filter(([_, stats]) => stats.total > 0)
    .forEach(([market, stats]) => {
      const percentage = stats.total > 0 ? ((stats.updated / stats.total) * 100).toFixed(1) : '0';
      console.log(`  ${market}: ${stats.updated}/${stats.total} updated (${percentage}%)`);
    });

  // Check for pages without publish dates
  const withoutDates = await prisma.contentPage.count({
    where: { publishDate: null },
  });

  console.log(`\nPages still without publish dates: ${withoutDates}`);

  await prisma.$disconnect();
}

// Run the script
updatePublishDates().catch(console.error);