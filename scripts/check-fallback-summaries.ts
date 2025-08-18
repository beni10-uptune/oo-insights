#!/usr/bin/env tsx

import { prisma } from '../src/lib/db';

async function checkFallbacks() {
  const fallbackPages = await prisma.contentPage.count({
    where: {
      summaryEn: {
        contains: 'AI translation unavailable'
      }
    }
  });

  const properSummaries = await prisma.contentPage.count({
    where: {
      summaryEn: {
        not: null
      },
      NOT: {
        summaryEn: {
          contains: 'AI translation unavailable'
        }
      }
    }
  });

  console.log('\n📊 Summary Status:');
  console.log('=' .repeat(50));
  console.log(`Pages with fallback text: ${fallbackPages}`);
  console.log(`Pages with proper English summaries: ${properSummaries}`);
  console.log(`Total pages: ${fallbackPages + properSummaries}`);
  console.log(`Success rate: ${Math.round((properSummaries / (fallbackPages + properSummaries)) * 100)}%`);
  console.log('=' .repeat(50));
  
  if (fallbackPages > 0) {
    console.log('\n⚠️  Some pages still have fallback text due to API rate limits.');
    console.log('   Run the backfill script again later to complete them.');
  }
}

checkFallbacks()
  .catch(console.error)
  .finally(() => prisma.$disconnect());