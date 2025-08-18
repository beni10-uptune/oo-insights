// Cron job for collecting search trends data daily
import { NextRequest, NextResponse } from 'next/server';
import { batchProcessMarkets, BRAND_KEYWORDS, MARKET_TO_LOCATION } from '@/lib/services/dataforseo';
import { prisma } from '@/lib/db';

// This runs daily at 9 AM CET via Vercel Cron
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Trends Collection] Starting daily collection...');
    
    // Get all active markets
    const markets = Object.keys(MARKET_TO_LOCATION);
    const timeWindows = ['7d', '30d', '90d'];
    
    // Track job
    const job = await prisma.jobs_trends.create({
      data: {
        market: 'ALL',
        language: 'multi',
        job_type: 'daily_collection',
        status: 'running',
        run_at: new Date(),
      },
    });

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Process each time window
    for (const window of timeWindows) {
      console.log(`[Trends Collection] Processing window: ${window}`);
      
      try {
        // Batch process all markets
        const results = await batchProcessMarkets(markets, BRAND_KEYWORDS, window);
        
        // Save results to database
        for (const result of results) {
          if (result.trends?.interestOverTime) {
            // Save trends series data
            const seriesData = [];
            for (const brand of BRAND_KEYWORDS) {
              for (const point of result.trends.interestOverTime) {
                seriesData.push({
                  marketCode: result.market,
                  keyword: brand,
                  date: new Date(point.date),
                  value: point.values[brand] || 0,
                  dataSource: 'dataforseo',
                });
              }
            }
            
            if (seriesData.length > 0) {
              await prisma.trendsSeries.createMany({
                data: seriesData,
                skipDuplicates: true,
              });
              successCount++;
            }
          }
          
          if (result.volumeData) {
            // Save volume data
            const volumeData = result.volumeData.map((item: any) => ({
              marketCode: result.market,
              keyword: item.keyword,
              searchVolume: item.searchVolume,
              cpc: item.cpc,
              competition: item.competition,
            }));
            
            if (volumeData.length > 0) {
              await prisma.topVolumeQueries.createMany({
                data: volumeData,
                skipDuplicates: true,
              });
            }
          }
        }
      } catch (error) {
        errorCount++;
        const errorMsg = `Failed to process window ${window}: ${error}`;
        console.error(`[Trends Collection] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    // Update job status
    await prisma.jobs_trends.update({
      where: { id: job.id },
      data: {
        status: errorCount > 0 ? 'partial' : 'success',
        completed_at: new Date(),
        error_message: errors.length > 0 ? errors.join('\n') : null,
        provider_payload: {
          successCount,
          errorCount,
          marketsProcessed: markets.length,
          timeWindowsProcessed: timeWindows.length,
        },
      },
    });

    console.log(`[Trends Collection] Completed. Success: ${successCount}, Errors: ${errorCount}`);

    return NextResponse.json({
      success: true,
      message: 'Trends collection completed',
      stats: {
        marketsProcessed: markets.length,
        successCount,
        errorCount,
      },
    });

  } catch (error) {
    console.error('[Trends Collection] Fatal error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to collect trends data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Manual trigger endpoint (POST)
export async function POST(request: NextRequest) {
  try {
    // This endpoint can be called manually to trigger collection
    const body = await request.json();
    const { markets = ['UK', 'FR', 'DE', 'IT', 'ES'], window = '30d' } = body;

    console.log(`[Trends Collection] Manual trigger for markets: ${markets.join(', ')}`);

    const results = await batchProcessMarkets(markets, BRAND_KEYWORDS, window);
    
    // Save results
    let recordsCreated = 0;
    for (const result of results) {
      if (result.trends?.interestOverTime) {
        const seriesData = [];
        for (const brand of BRAND_KEYWORDS) {
          for (const point of result.trends.interestOverTime) {
            seriesData.push({
              marketCode: result.market,
              keyword: brand,
              date: new Date(point.date),
              value: point.values[brand] || 0,
              dataSource: 'dataforseo',
            });
          }
        }
        
        if (seriesData.length > 0) {
          const created = await prisma.trendsSeries.createMany({
            data: seriesData,
            skipDuplicates: true,
          });
          recordsCreated += created.count;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Manual collection completed',
      recordsCreated,
      markets: markets,
    });

  } catch (error) {
    console.error('[Trends Collection] Manual trigger error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to collect trends data',
      },
      { status: 500 }
    );
  }
}