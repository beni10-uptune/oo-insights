import { NextRequest, NextResponse } from 'next/server';
import { crawlAllMarketsFromSitemaps } from '@/lib/services/sitemap-crawler';

export const maxDuration = 300; // 5 minutes

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret if configured
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[CRON] Starting daily sitemap crawl at', new Date().toISOString());

    // Crawl all markets with AI processing
    const results = await crawlAllMarketsFromSitemaps({
      forceRefresh: false, // Only crawl new or old pages
      summarize: true,     // Generate English summaries
      classify: true,      // Categorize content
    });

    // Calculate statistics
    const stats = {
      timestamp: new Date().toISOString(),
      marketsProcessed: Object.keys(results).length,
      totalNewPages: 0,
      totalUpdatedPages: 0,
      totalErrors: 0,
      successfulMarkets: [] as string[],
      failedMarkets: [] as string[],
    };

    for (const [market, result] of Object.entries(results)) {
      stats.totalNewPages += result.newPages;
      stats.totalUpdatedPages += result.updatedPages;
      stats.totalErrors += result.errors.length;

      if (result.errors.length === 0 && (result.newPages > 0 || result.updatedPages > 0)) {
        stats.successfulMarkets.push(market);
      } else if (result.errors.length > 0) {
        stats.failedMarkets.push(market);
      }
    }

    console.log('[CRON] Daily sitemap crawl completed:', stats);

    // Store crawl results in database for monitoring
    try {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      
      // Store a summary event
      await prisma.pageEvent.create({
        data: {
          pageId: 'cron-summary', // Special ID for cron events
          url: 'cron://daily-sitemap',
          eventType: 'created',
          market: 'all',
          title: 'Daily Sitemap Crawl',
          summary: `Found ${stats.totalNewPages} new pages and ${stats.totalUpdatedPages} updated pages across ${stats.marketsProcessed} markets`,
          eventAt: new Date(),
        },
      }).catch(err => {
        console.error('[CRON] Failed to store summary event:', err);
      });

      await prisma.$disconnect();
    } catch (error) {
      console.error('[CRON] Failed to store crawl results:', error);
    }

    return NextResponse.json({
      success: true,
      message: 'Daily sitemap crawl completed',
      stats,
      results,
    });

  } catch (error) {
    console.error('[CRON] Daily sitemap crawl failed:', error);
    return NextResponse.json(
      { 
        error: 'Daily sitemap crawl failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}