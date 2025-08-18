#!/usr/bin/env tsx
/**
 * Limited backfill for testing - just do 10 French pages
 */

import { prisma } from '../src/lib/db';
import { summarizeContent } from '../src/lib/services/simple-ai';

async function limitedBackfill() {
  console.log('Running limited backfill for French pages...\n');
  
  const pages = await prisma.contentPage.findMany({
    where: {
      market: 'fr',
      OR: [
        { summaryEn: 'Summary not available' },
        { summaryEn: '' },
        { summaryEn: null }
      ],
      textContent: { not: null }
    },
    take: 10,
    select: {
      id: true,
      url: true,
      title: true,
      language: true,
      textContent: true
    }
  });
  
  console.log(`Found ${pages.length} pages to update\n`);
  
  for (const page of pages) {
    if (!page.textContent) continue;
    
    try {
      console.log(`📝 Processing: ${page.title?.substring(0, 50)}...`);
      
      const result = await summarizeContent(
        page.textContent.substring(0, 3000),
        page.language || 'fr'
      );
      
      await prisma.contentPage.update({
        where: { id: page.id },
        data: {
          summary: result.original,
          summaryEn: result.english
        }
      });
      
      console.log(`   ✅ English: ${result.english.substring(0, 80)}...`);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`   ❌ Failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }
  
  console.log('\n✅ Limited backfill complete!');
}

limitedBackfill()
  .catch(console.error)
  .finally(() => prisma.$disconnect());