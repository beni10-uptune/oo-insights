import { NextRequest, NextResponse } from 'next/server';
import { crawlAllEucanMarkets } from '@/lib/services/enhanced-crawl';

/**
 * Manual trigger endpoint for crawling all markets
 * This endpoint bypasses time checks and allows manual triggering
 */
export async function POST(request: NextRequest) {
  try {
    // Simple auth check - skip if CRON_SECRET not configured
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && process.env.CRON_SECRET !== 'your-secure-cron-secret-here') {
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    console.log('🚀 Starting manual crawl for all markets...');
    const startTime = Date.now();
    
    // Crawl all markets with reasonable limits
    const results = await crawlAllEucanMarkets({
      summarize: false, // Skip AI for speed
      classify: false,   // Skip AI for speed
      limit: 10,        // Start with 10 pages per market for testing
    });
    
    const duration = Date.now() - startTime;
    
    // Calculate statistics
    const stats = {
      marketsProcessed: Object.keys(results).length,
      totalPagesFound: 0,
      totalPagesProcessed: 0,
      marketsWithErrors: 0,
      successfulMarkets: [],
      failedMarkets: [],
    };
    
    for (const [market, result] of Object.entries(results)) {
      stats.totalPagesFound += result.pagesFound;
      stats.totalPagesProcessed += result.pagesProcessed;
      
      if (result.errors.length > 0) {
        stats.marketsWithErrors++;
        stats.failedMarkets.push(market);
      } else if (result.pagesProcessed > 0) {
        stats.successfulMarkets.push(market);
      }
    }
    
    console.log(`✅ Crawl completed in ${Math.round(duration / 1000)}s`);
    console.log(`📊 Processed ${stats.totalPagesProcessed}/${stats.totalPagesFound} pages across ${stats.marketsProcessed} markets`);
    
    return NextResponse.json({
      success: true,
      message: 'Crawl completed successfully',
      duration: `${Math.round(duration / 1000)}s`,
      stats,
      marketSummary: Object.fromEntries(
        Object.entries(results).map(([market, result]) => [
          market,
          {
            pagesFound: result.pagesFound,
            pagesProcessed: result.pagesProcessed,
            hasErrors: result.errors.length > 0,
            timestamp: result.timestamp,
          },
        ])
      ),
    });
  } catch (error) {
    console.error('❌ Manual crawl failed:', error);
    return NextResponse.json(
      { 
        error: 'Manual crawl failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max