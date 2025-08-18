import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Get all markets from config
    const markets = [
      { code: 'de', name: 'Germany' },
      { code: 'fr', name: 'France' },
      { code: 'it', name: 'Italy' },
      { code: 'es', name: 'Spain' },
      { code: 'ca_en', name: 'Canada (EN)' },
      { code: 'ca_fr', name: 'Canada (FR)' },
      { code: 'uk', name: 'United Kingdom' },
      { code: 'pl', name: 'Poland' },
      { code: 'ch_de', name: 'Switzerland (DE)' },
      { code: 'ch_fr', name: 'Switzerland (FR)' },
      { code: 'ch_it', name: 'Switzerland (IT)' },
      { code: 'se', name: 'Sweden' },
      { code: 'no', name: 'Norway' },
    ];

    const healthScores = await Promise.all(markets.map(async (market) => {
      // Get page statistics for this market
      const totalPages = await prisma.contentPage.count({
        where: { market: market.code }
      });

      if (totalPages === 0) {
        return {
          market: market.code,
          marketName: market.name,
          overallScore: 0,
          contentFreshness: 0,
          contentCoverage: 0,
          updateFrequency: 0,
          totalPages: 0,
          recentUpdates: 0,
          lastCrawled: new Date().toISOString(),
          trend: 'stable' as const,
          alerts: ['No pages crawled yet']
        };
      }

      // Calculate content freshness (pages updated in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentlyUpdated = await prisma.contentPage.count({
        where: {
          market: market.code,
          lastModifiedAt: { gte: thirtyDaysAgo }
        }
      });

      const contentFreshness = Math.round((recentlyUpdated / totalPages) * 100);

      // Calculate content coverage (assume 50 pages is good coverage)
      const expectedPages = 50;
      const contentCoverage = Math.min(100, Math.round((totalPages / expectedPages) * 100));

      // Calculate update frequency (events in last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const recentEvents = await prisma.pageEvent.count({
        where: {
          market: market.code,
          createdAt: { gte: sevenDaysAgo }
        }
      });

      const updateFrequency = Math.min(100, recentEvents * 10); // Scale to 100

      // Calculate overall score (weighted average)
      const overallScore = Math.round(
        (contentFreshness * 0.4) +
        (contentCoverage * 0.3) +
        (updateFrequency * 0.3)
      );

      // Get last crawl time
      const lastCrawled = await prisma.contentPage.findFirst({
        where: { market: market.code },
        orderBy: { lastCrawledAt: 'desc' },
        select: { lastCrawledAt: true }
      });

      // Determine trend (compare to last week)
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
      
      const olderEvents = await prisma.pageEvent.count({
        where: {
          market: market.code,
          createdAt: { 
            gte: fourteenDaysAgo,
            lt: sevenDaysAgo 
          }
        }
      });

      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (recentEvents > olderEvents * 1.2) trend = 'up';
      else if (recentEvents < olderEvents * 0.8) trend = 'down';

      // Generate alerts
      const alerts: string[] = [];
      if (contentFreshness < 20) alerts.push('Stale content - needs refresh');
      if (contentCoverage < 50) alerts.push('Low page coverage');
      if (updateFrequency < 20) alerts.push('Infrequent updates');
      if (totalPages < 10) alerts.push('Very few pages crawled');

      return {
        market: market.code,
        marketName: market.name,
        overallScore,
        contentFreshness,
        contentCoverage,
        updateFrequency,
        totalPages,
        recentUpdates: recentEvents,
        lastCrawled: lastCrawled?.lastCrawledAt?.toISOString() || new Date().toISOString(),
        trend,
        alerts
      };
    }));

    // Sort by overall score (ascending to show problematic markets first)
    healthScores.sort((a, b) => a.overallScore - b.overallScore);

    return NextResponse.json({
      success: true,
      scores: healthScores,
      summary: {
        total: healthScores.length,
        healthy: healthScores.filter(s => s.overallScore >= 80).length,
        warning: healthScores.filter(s => s.overallScore >= 40 && s.overallScore < 80).length,
        critical: healthScores.filter(s => s.overallScore < 40).length,
      }
    });

  } catch (error) {
    console.error('Error calculating health scores:', error);
    return NextResponse.json(
      { error: 'Failed to calculate health scores' },
      { status: 500 }
    );
  }
}