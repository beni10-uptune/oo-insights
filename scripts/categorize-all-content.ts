#!/usr/bin/env npx tsx
/**
 * Script to categorize all existing content using the new MECE categories
 * Run with: npx tsx scripts/categorize-all-content.ts
 */

import { prisma } from '../src/lib/db';
import { categorizeContent } from '../src/lib/services/ai-categorization';

async function categorizeAllContent() {
  console.log('Starting bulk categorization of all content...\n');

  try {
    // Get total count
    const totalCount = await prisma.contentPage.count();
    const uncategorizedCount = await prisma.contentPage.count({
      where: {
        OR: [
          { category: null },
          { contentType: null },
        ],
      },
    });

    console.log(`Total pages: ${totalCount}`);
    console.log(`Uncategorized pages: ${uncategorizedCount}\n`);

    if (uncategorizedCount === 0) {
      console.log('All content is already categorized!');
      return;
    }

    // Process in batches
    const batchSize = 10;
    let processed = 0;
    let errors = 0;
    let offset = 0;

    const categoryStats: Record<string, number> = {};
    const contentTypeStats: Record<string, number> = {};

    while (processed < uncategorizedCount) {
      // Get next batch
      const pages = await prisma.contentPage.findMany({
        where: {
          OR: [
            { category: null },
            { contentType: null },
          ],
        },
        take: batchSize,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      });

      if (pages.length === 0) {
        break;
      }

      console.log(`\nProcessing batch ${Math.floor(offset / batchSize) + 1} (${pages.length} pages)...`);

      // Process each page
      for (const page of pages) {
        try {
          const content = page.textContent || page.rawHtml || '';
          const title = page.title || '';
          const url = page.url;

          if (!content || content.length < 100) {
            console.log(`  ⚠ Skipping ${url} - insufficient content`);
            continue;
          }

          // Categorize using AI
          const categorization = await categorizeContent(content, title, url);

          // Update the page
          await prisma.contentPage.update({
            where: { id: page.id },
            data: {
              category: categorization.category,
              contentType: categorization.contentType,
              confidence: categorization.confidence,
              keywords: categorization.keywords,
              hasVideo: categorization.signals.hasVideo,
              hasCalculator: categorization.signals.hasCalculator,
              hasForm: categorization.signals.hasForm,
              readingTime: categorization.signals.readingTime,
              signals: categorization.signals as any,
            },
          });

          // Update stats
          categoryStats[categorization.category] = (categoryStats[categorization.category] || 0) + 1;
          contentTypeStats[categorization.contentType] = (contentTypeStats[categorization.contentType] || 0) + 1;

          processed++;
          console.log(`  ✓ ${page.market || 'global'} | ${categorization.category} | ${categorization.contentType} | ${url}`);

          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          errors++;
          console.error(`  ✗ Error processing ${page.url}:`, error instanceof Error ? error.message : error);
        }
      }

      offset += batchSize;

      // Progress update
      const percentComplete = ((processed / uncategorizedCount) * 100).toFixed(1);
      console.log(`\nProgress: ${processed}/${uncategorizedCount} (${percentComplete}%) | Errors: ${errors}`);
    }

    // Final statistics
    console.log('\n' + '='.repeat(60));
    console.log('CATEGORIZATION COMPLETE');
    console.log('='.repeat(60));
    console.log(`\nProcessed: ${processed} pages`);
    console.log(`Errors: ${errors} pages`);
    
    console.log('\nCategory Distribution:');
    Object.entries(categoryStats)
      .sort((a, b) => b[1] - a[1])
      .forEach(([category, count]) => {
        const percentage = ((count / processed) * 100).toFixed(1);
        console.log(`  ${category}: ${count} (${percentage}%)`);
      });

    console.log('\nContent Type Distribution:');
    Object.entries(contentTypeStats)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        const percentage = ((count / processed) * 100).toFixed(1);
        console.log(`  ${type}: ${count} (${percentage}%)`);
      });

    // Get final stats from database
    const finalCategorized = await prisma.contentPage.count({
      where: {
        AND: [
          { category: { not: null } },
          { contentType: { not: null } },
        ],
      },
    });

    console.log(`\nFinal Status: ${finalCategorized}/${totalCount} pages categorized (${((finalCategorized / totalCount) * 100).toFixed(1)}%)`);

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
categorizeAllContent().catch(console.error);