import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { MARKET_CONFIG } from '@/lib/firecrawl';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Get coverage data for all markets
    const marketStats = await prisma.$queryRaw`
      SELECT 
        market,
        COUNT(DISTINCT id) as "pageCount",
        MAX("lastCrawledAt") as "lastCrawl",
        COUNT(DISTINCT CASE WHEN "hasHcpLocator" = true THEN id END) as "hcpPages",
        COUNT(DISTINCT CASE WHEN category IS NOT NULL THEN id END) as "categorizedPages",
        COUNT(DISTINCT CASE WHEN "summaryEn" IS NOT NULL THEN id END) as "summarizedPages",
        COUNT(DISTINCT CASE 
          WHEN "lastModifiedAt" > NOW() - INTERVAL '7 days' 
          THEN id 
        END) as "recentlyUpdated"
      FROM "content_pages"
      WHERE market IS NOT NULL
      GROUP BY market
    ` as Array<{
      market: string;
      pageCount: bigint;
      lastCrawl: Date | null;
      hcpPages: bigint;
      categorizedPages: bigint;
      summarizedPages: bigint;
      recentlyUpdated: bigint;
    }>;

    // Get recent events for activity indication
    const recentEvents = await prisma.$queryRaw`
      SELECT 
        market,
        COUNT(*) as "eventCount"
      FROM "page_events"
      WHERE "eventAt" > NOW() - INTERVAL '24 hours'
        AND market IS NOT NULL
      GROUP BY market
    ` as Array<{
      market: string;
      eventCount: bigint;
    }>;

    // Create a map of recent events
    const eventMap = new Map(
      recentEvents.map(e => [e.market, Number(e.eventCount)])
    );

    // Build coverage matrix
    const coverage = [];
    
    for (const [marketKey, config] of Object.entries(MARKET_CONFIG)) {
      const stats = marketStats.find(s => s.market === marketKey);
      const hasRecentActivity = eventMap.get(marketKey) ? eventMap.get(marketKey) > 0 : false;
      
      coverage.push({
        market: marketKey,
        flag: config.flag,
        language: config.language,
        url: config.url,
        timezone: config.timezone,
        pageCount: stats ? Number(stats.pageCount) : 0,
        lastCrawl: stats?.lastCrawl || null,
        hasHcpLocator: stats && Number(stats.hcpPages) > 0,
        categorizedPages: stats ? Number(stats.categorizedPages) : 0,
        summarizedPages: stats ? Number(stats.summarizedPages) : 0,
        recentlyUpdated: stats ? Number(stats.recentlyUpdated) : 0,
        hasRecentActivity,
        healthScore: calculateHealthScore(stats, hasRecentActivity),
      });
    }

    // Sort by importance (page count, then alphabetically)
    coverage.sort((a, b) => {
      if (b.pageCount !== a.pageCount) return b.pageCount - a.pageCount;
      return a.market.localeCompare(b.market);
    });

    // Calculate summary statistics
    const summary = {
      totalMarkets: coverage.length,
      marketsWithContent: coverage.filter(m => m.pageCount > 0).length,
      marketsWithHcp: coverage.filter(m => m.hasHcpLocator).length,
      totalPages: coverage.reduce((sum, m) => sum + m.pageCount, 0),
      fullyCategorized: coverage.filter(m => 
        m.pageCount > 0 && m.categorizedPages === m.pageCount
      ).length,
      fullySummarized: coverage.filter(m => 
        m.pageCount > 0 && m.summarizedPages === m.pageCount
      ).length,
      lastGlobalUpdate: coverage
        .filter(m => m.lastCrawl)
        .reduce((latest, m) => {
          const crawlTime = new Date(m.lastCrawl!).getTime();
          return crawlTime > latest ? crawlTime : latest;
        }, 0),
    };

    return NextResponse.json({
      success: true,
      summary,
      coverage,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Coverage matrix error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get coverage matrix',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

function calculateHealthScore(
  stats: {
    pageCount: bigint;
    lastCrawl: Date | null;
    categorizedPages: bigint;
    summarizedPages: bigint;
    recentlyUpdated: bigint;
  } | undefined,
  hasRecentActivity: boolean
): number {
  if (!stats || Number(stats.pageCount) === 0) return 0;
  
  let score = 0;
  const pageCount = Number(stats.pageCount);
  
  // Has content (30 points)
  if (pageCount > 0) score += 30;
  
  // Recent crawl (20 points)
  if (stats.lastCrawl) {
    const daysSinceCrawl = (Date.now() - new Date(stats.lastCrawl).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCrawl < 1) score += 20;
    else if (daysSinceCrawl < 7) score += 15;
    else if (daysSinceCrawl < 30) score += 10;
  }
  
  // Categorization coverage (20 points)
  const categorizationRate = Number(stats.categorizedPages) / pageCount;
  score += Math.floor(categorizationRate * 20);
  
  // Summarization coverage (20 points)
  const summarizationRate = Number(stats.summarizedPages) / pageCount;
  score += Math.floor(summarizationRate * 20);
  
  // Recent activity (10 points)
  if (hasRecentActivity) score += 10;
  
  return Math.min(100, score);
}