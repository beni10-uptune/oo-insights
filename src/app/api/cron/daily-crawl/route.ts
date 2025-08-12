import { NextRequest, NextResponse } from 'next/server';
import { crawlAllEucanMarkets } from '@/lib/services/enhanced-crawl';
import { headers } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Verify the request is from Vercel Cron
    const authHeader = headers().get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Starting daily CET crawl at', new Date().toISOString());
    
    // Check if we're in the correct time window (9 AM CET)
    const now = new Date();
    const cetTime = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Paris"}));
    const hour = cetTime.getHours();
    
    // Allow some flexibility (8-10 AM CET window)
    if (hour < 8 || hour > 10) {
      console.log(`Skipping crawl - current CET hour is ${hour}, expecting 8-10`);
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: `Not in crawl window (current CET hour: ${hour})`,
        timestamp: now.toISOString(),
      });
    }

    // Start the crawl
    const startTime = Date.now();
    const results = await crawlAllEucanMarkets({
      summarize: true,
      classify: true,
      limit: 25, // Reasonable limit for daily crawl
    });
    
    const duration = Date.now() - startTime;
    
    // Calculate statistics
    const stats = {
      marketsProcessed: Object.keys(results).length,
      totalPagesFound: 0,
      totalPagesProcessed: 0,
      marketsWithErrors: 0,
      errors: [] as string[],
    };
    
    for (const [market, result] of Object.entries(results)) {
      stats.totalPagesFound += result.pagesFound;
      stats.totalPagesProcessed += result.pagesProcessed;
      
      if (result.errors.length > 0) {
        stats.marketsWithErrors++;
        stats.errors.push(`${market}: ${result.errors.join(', ')}`);
      }
    }
    
    // Log results for monitoring
    console.log('Daily crawl completed:', {
      duration: `${Math.round(duration / 1000)}s`,
      ...stats,
    });
    
    // Store crawl log (you might want to save this to database)
    const crawlLog = {
      timestamp: now.toISOString(),
      type: 'daily_scheduled',
      duration,
      stats,
      success: stats.marketsWithErrors === 0,
    };
    
    return NextResponse.json({
      success: true,
      crawlLog,
      results: Object.fromEntries(
        Object.entries(results).map(([market, result]) => [
          market,
          {
            pagesFound: result.pagesFound,
            pagesProcessed: result.pagesProcessed,
            hasErrors: result.errors.length > 0,
          },
        ])
      ),
    });
  } catch (error) {
    console.error('Daily crawl failed:', error);
    return NextResponse.json(
      { 
        error: 'Daily crawl failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Vercel Cron configuration
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max