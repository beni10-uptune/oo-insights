#!/usr/bin/env tsx

import { prisma } from '../src/lib/db';

async function debug() {
  const event = await prisma.pageEvent.findFirst({
    where: { market: 'fr' },
    include: {
      page: {
        select: {
          title: true,
          summary: true,
          summaryEn: true,
          description: true
        }
      }
    }
  });

  console.log('Event:', {
    title: event?.title,
    summary: event?.summary,
    page: event?.page
  });
  
  // Check for pages with summaryEn
  const pagesWithEnglish = await prisma.contentPage.findMany({
    where: {
      market: 'fr',
      summaryEn: { not: null }
    },
    take: 3,
    select: {
      title: true,
      summaryEn: true,
      summary: true
    }
  });
  
  console.log('\nPages with English summaries:');
  pagesWithEnglish.forEach(page => {
    console.log(`- ${page.title}`);
    console.log(`  English: ${page.summaryEn?.substring(0, 100)}...`);
    console.log(`  Original: ${page.summary?.substring(0, 100)}...`);
  });
}

debug()
  .catch(console.error)
  .finally(() => prisma.$disconnect());