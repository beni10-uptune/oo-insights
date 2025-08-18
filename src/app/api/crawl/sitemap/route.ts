import { NextRequest, NextResponse } from 'next/server';
import { crawlMarketFromSitemap, crawlAllMarketsFromSitemaps } from '@/lib/services/sitemap-crawler';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { market, forceRefresh = false, summarize = true, classify = true } = body;

    if (market) {
      // Crawl specific market
      console.log(`Starting sitemap crawl for market: ${market}`);
      const result = await crawlMarketFromSitemap(market, {
        forceRefresh,
        summarize,
        classify,
      });

      return NextResponse.json({
        success: true,
        result,
        message: `Crawled ${result.newPages} new and ${result.updatedPages} updated pages for ${market}`,
      });
    } else {
      // Crawl all markets
      console.log('Starting sitemap crawl for all markets');
      const results = await crawlAllMarketsFromSitemaps({
        forceRefresh,
        summarize,
        classify,
      });

      const stats = {
        totalMarkets: Object.keys(results).length,
        totalNewPages: Object.values(results).reduce((sum, r) => sum + r.newPages, 0),
        totalUpdatedPages: Object.values(results).reduce((sum, r) => sum + r.updatedPages, 0),
        totalErrors: Object.values(results).reduce((sum, r) => sum + r.errors.length, 0),
      };

      return NextResponse.json({
        success: true,
        results,
        stats,
        message: `Crawled ${stats.totalNewPages} new and ${stats.totalUpdatedPages} updated pages across ${stats.totalMarkets} markets`,
      });
    }
  } catch (error) {
    console.error('Sitemap crawl error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to crawl sitemap',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check sitemap stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const market = searchParams.get('market');

    if (!market) {
      return NextResponse.json(
        { error: 'Market parameter is required' },
        { status: 400 }
      );
    }

    const { getSitemapStats } = await import('@/lib/services/sitemap-crawler');
    const stats = await getSitemapStats(market);

    return NextResponse.json({
      success: true,
      market,
      stats,
    });
  } catch (error) {
    console.error('Sitemap stats error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get sitemap stats',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}