#!/usr/bin/env npx tsx
/**
 * Script to add English summaries to all content that doesn't have them
 * Run with: npx tsx scripts/add-english-summaries.ts
 */

import { prisma } from '../src/lib/db';
import { summarizeContent } from '../src/lib/services/simple-ai';

async function addEnglishSummaries() {
  console.log('Starting to add English summaries to all content...\n');

  try {
    // Get pages without English summaries
    const pagesWithoutSummaries = await prisma.contentPage.findMany({
      where: {
        OR: [
          { summaryEn: null },
          { summaryEn: '' },
        ],
        NOT: {
          textContent: null,
        },
      },
      select: {
        id: true,
        url: true,
        market: true,
        language: true,
        title: true,
        textContent: true,
        summary: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log(`Found ${pagesWithoutSummaries.length} pages without English summaries\n`);

    if (pagesWithoutSummaries.length === 0) {
      console.log('All content already has English summaries!');
      return;
    }

    const results = {
      total: pagesWithoutSummaries.length,
      processed: 0,
      succeeded: 0,
      failed: 0,
      marketStats: {} as Record<string, number>,
    };

    // Process in batches
    const batchSize = 5;
    for (let i = 0; i < pagesWithoutSummaries.length; i += batchSize) {
      const batch = pagesWithoutSummaries.slice(i, i + batchSize);
      
      console.log(`\nProcessing batch ${Math.floor(i / batchSize) + 1} (${batch.length} pages)...`);

      // Process batch in parallel
      const batchPromises = batch.map(async (page) => {
        try {
          // Skip if content is too short
          if (!page.textContent || page.textContent.length < 100) {
            console.log(`  ⚠ Skipping ${page.url} - insufficient content`);
            return { success: false, page };
          }

          // Generate English summary
          const summaryResult = await summarizeContent(
            page.textContent.substring(0, 5000), // Limit content for API
            page.language || 'en'
          );

          // Update the page with English summary
          await prisma.contentPage.update({
            where: { id: page.id },
            data: {
              summary: summaryResult.original || page.summary,
              summaryEn: summaryResult.english,
            },
          });

          // Update market stats
          const market = page.market || 'unknown';
          results.marketStats[market] = (results.marketStats[market] || 0) + 1;

          console.log(`  ✓ ${market} | ${page.title?.substring(0, 50)}... | ${page.url}`);
          return { success: true, page };
        } catch (error) {
          console.error(`  ✗ Failed: ${page.url}`, error instanceof Error ? error.message : error);
          return { success: false, page, error };
        }
      });

      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises);
      
      // Update counters
      batchResults.forEach(result => {
        results.processed++;
        if (result.success) {
          results.succeeded++;
        } else {
          results.failed++;
        }
      });

      // Progress update
      const percentComplete = ((results.processed / results.total) * 100).toFixed(1);
      console.log(`Progress: ${results.processed}/${results.total} (${percentComplete}%) | Success: ${results.succeeded} | Failed: ${results.failed}`);

      // Small delay between batches to avoid rate limits
      if (i + batchSize < pagesWithoutSummaries.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('ENGLISH SUMMARY GENERATION COMPLETE');
    console.log('='.repeat(60));
    console.log(`\nTotal processed: ${results.processed}`);
    console.log(`Succeeded: ${results.succeeded}`);
    console.log(`Failed: ${results.failed}`);
    
    console.log('\nBy Market:');
    Object.entries(results.marketStats)
      .sort((a, b) => b[1] - a[1])
      .forEach(([market, count]) => {
        console.log(`  ${market}: ${count} pages`);
      });

    // Check remaining pages without summaries
    const remaining = await prisma.contentPage.count({
      where: {
        OR: [
          { summaryEn: null },
          { summaryEn: '' },
        ],
      },
    });

    console.log(`\nPages still without English summaries: ${remaining}`);

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
addEnglishSummaries().catch(console.error);