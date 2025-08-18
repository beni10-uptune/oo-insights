#!/usr/bin/env tsx
/**
 * Backfill English summaries for all content pages that are missing them
 * Run with: npx tsx scripts/backfill-english-summaries.ts
 */

import { prisma } from '../src/lib/db';
import { summarizeContent } from '../src/lib/services/simple-ai';

async function backfillEnglishSummaries() {
  console.log('🔍 Starting English summary backfill...\n');
  
  // Count total pages needing backfill (including those with placeholder text)
  const totalMissing = await prisma.contentPage.count({
    where: {
      OR: [
        { summaryEn: null },
        { summaryEn: 'Summary not available' },
        { summaryEn: '' },
        { summaryEn: { contains: 'AI translation unavailable' } }
      ],
      textContent: { not: null }
    }
  });
  
  console.log(`📊 Found ${totalMissing} pages missing English summaries\n`);
  
  if (totalMissing === 0) {
    console.log('✅ All pages already have English summaries!');
    return;
  }
  
  // Process in batches to avoid overwhelming the AI API
  const BATCH_SIZE = 5; // Smaller batch size to avoid rate limits
  const DELAY_MS = 5000; // 5 second delay between batches for rate limit compliance
  
  let processed = 0;
  let successful = 0;
  let failed = 0;
  
  while (processed < totalMissing) {
    // Get next batch
    const pages = await prisma.contentPage.findMany({
      where: {
        OR: [
          { summaryEn: null },
          { summaryEn: 'Summary not available' },
          { summaryEn: '' },
          { summaryEn: { contains: 'AI translation unavailable' } }
        ],
        textContent: { not: null }
      },
      take: BATCH_SIZE,
      select: {
        id: true,
        url: true,
        market: true,
        language: true,
        title: true,
        textContent: true,
        summary: true
      }
    });
    
    if (pages.length === 0) break;
    
    console.log(`\n📦 Processing batch ${Math.floor(processed / BATCH_SIZE) + 1}...`);
    
    // Process each page in the batch
    for (const page of pages) {
      if (!page.textContent) {
        console.log(`⚠️  Skipping ${page.url} - no content`);
        processed++;
        continue;
      }
      
      // Retry logic with exponential backoff
      let retries = 0;
      const maxRetries = 3;
      let success = false;
      
      while (retries < maxRetries && !success) {
        try {
          // If page already has a non-English summary but no English version
          if (page.summary && !page.language?.startsWith('en')) {
            // Try to translate the existing summary
            console.log(`🔄 Translating summary for ${page.market}: ${page.title?.substring(0, 50)}...`);
          } else {
            console.log(`📝 Generating summary for ${page.market}: ${page.title?.substring(0, 50)}...`);
          }
          
          // Generate or translate summary
          const result = await summarizeContent(
            page.textContent.substring(0, 5000),
            page.language || 'en'
          );
          
          // Update the page with both summaries
          await prisma.contentPage.update({
            where: { id: page.id },
            data: { 
              summaryEn: result.english,
              summary: result.original || page.summary // Keep existing or use new
            }
          });
          
          console.log(`  ✅ Updated: ${page.url}`);
          successful++;
          success = true;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          // Check if it's a rate limit error
          if (errorMessage.includes('429') && retries < maxRetries - 1) {
            retries++;
            const backoffDelay = Math.pow(2, retries) * 1000; // Exponential backoff: 2s, 4s, 8s
            console.log(`  ⏳ Rate limited, retrying in ${backoffDelay/1000}s... (attempt ${retries}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
          } else {
            console.error(`  ❌ Failed: ${page.url}`);
            console.error(`     Error: ${errorMessage}`);
            failed++;
            success = true; // Exit the retry loop
          }
        }
      }
      
      processed++;
      
      // Show progress
      const progress = Math.round((processed / totalMissing) * 100);
      console.log(`  📊 Progress: ${processed}/${totalMissing} (${progress}%)`);
    }
    
    // Delay between batches to avoid rate limiting
    if (processed < totalMissing) {
      console.log(`\n⏳ Waiting ${DELAY_MS / 1000}s before next batch...`);
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }
  
  // Final summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Backfill Complete!');
  console.log('='.repeat(50));
  console.log(`✅ Successfully updated: ${successful} pages`);
  console.log(`❌ Failed: ${failed} pages`);
  console.log(`📈 Success rate: ${Math.round((successful / processed) * 100)}%`);
  
  // Show coverage by market
  console.log('\n📍 Coverage by Market:');
  const marketStats = await prisma.contentPage.groupBy({
    by: ['market'],
    _count: {
      summaryEn: true,
      _all: true
    }
  });
  
  for (const stat of marketStats) {
    const coverage = Math.round((stat._count.summaryEn / stat._count._all) * 100);
    const emoji = coverage === 100 ? '✅' : coverage >= 90 ? '🟡' : '🔴';
    console.log(`  ${emoji} ${stat.market}: ${coverage}% (${stat._count.summaryEn}/${stat._count._all})`);
  }
}

// Run the backfill
backfillEnglishSummaries()
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('\n✨ Done!');
  });