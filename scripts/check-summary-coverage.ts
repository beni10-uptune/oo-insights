#!/usr/bin/env tsx
/**
 * Check summary coverage across all markets
 * Run with: npx tsx scripts/check-summary-coverage.ts
 */

import { prisma } from '../src/lib/db';

async function checkSummaries() {
  const stats = await prisma.contentPage.groupBy({
    by: ['market'],
    _count: {
      _all: true,
      summaryEn: true,
      summary: true
    }
  });
  
  console.log('\n📊 Summary Coverage by Market:');
  console.log('=' .repeat(70));
  console.log('Market   | Total | Has Summary | Has English | Coverage');
  console.log('---------+-------+-------------+-------------+----------');
  
  for (const stat of stats.sort((a, b) => (a.market || '').localeCompare(b.market || ''))) {
    const coverage = stat._count._all > 0 ? Math.round((stat._count.summaryEn / stat._count._all) * 100) : 0;
    const emoji = coverage === 100 ? '✅' : coverage >= 90 ? '🟡' : '🔴';
    console.log(
      `${emoji} ${(stat.market || 'unknown').padEnd(5)} | ${stat._count._all.toString().padEnd(5)} | ${stat._count.summary.toString().padEnd(11)} | ${stat._count.summaryEn.toString().padEnd(11)} | ${coverage}%`
    );
  }
  
  const total = stats.reduce((sum, s) => sum + s._count._all, 0);
  const totalEn = stats.reduce((sum, s) => sum + s._count.summaryEn, 0);
  const totalSummary = stats.reduce((sum, s) => sum + s._count.summary, 0);
  const totalCoverage = Math.round((totalEn / total) * 100);
  
  console.log('---------+-------+-------------+-------------+----------');
  console.log(`   TOTAL | ${total.toString().padEnd(5)} | ${totalSummary.toString().padEnd(11)} | ${totalEn.toString().padEnd(11)} | ${totalCoverage}%`);
  console.log('=' .repeat(70));
  
  // Check for pages that have summary but not summaryEn
  const needsTranslation = await prisma.contentPage.count({
    where: {
      summary: { not: null },
      summaryEn: null
    }
  });
  
  if (needsTranslation > 0) {
    console.log(`\n⚠️  ${needsTranslation} pages have summaries but need English translation`);
    console.log('   Run: npx tsx scripts/backfill-english-summaries.ts');
  } else {
    console.log('\n✅ All pages with summaries have English translations!');
  }
  
  // Show sample of pages without English summaries
  const missingSummaries = await prisma.contentPage.findMany({
    where: { summaryEn: null },
    take: 5,
    select: {
      url: true,
      market: true,
      title: true,
      language: true
    }
  });
  
  if (missingSummaries.length > 0) {
    console.log('\n📝 Sample pages without English summaries:');
    missingSummaries.forEach(page => {
      console.log(`   - ${page.market}: ${page.title?.substring(0, 50)}...`);
    });
  }
}

checkSummaries()
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });