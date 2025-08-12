import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getDataForSEOClient, MARKET_LOCATIONS } from '@/lib/dataforseo/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('[CRON] Starting daily trends data fetch at', new Date().toISOString());
    
    const client = getDataForSEOClient();
    const brands = ['Wegovy', 'Ozempic', 'Mounjaro'];
    const timeWindows = ['7d', '30d', '90d'] as const;
    const results = {
      success: 0,
      failed: 0,
      markets: [] as string[],
    };
    
    // Process each market
    for (const [marketCode, marketInfo] of Object.entries(MARKET_LOCATIONS)) {
      console.log(`[CRON] Processing market: ${marketCode}`);
      
      try {
        // Fetch trends series for each brand
        for (const brand of brands) {
          try {
            const series = await client.getTrendsSeries(
              marketCode as keyof typeof MARKET_LOCATIONS,
              [brand],
              '30d'
            );
            
            // Store series data
            for (const s of series) {
              const points = s.points || [];
              for (const point of points) {
                await prisma.$executeRaw`
                  INSERT INTO trends_series (
                    market, brand, date, value, timeframe
                  ) VALUES (
                    ${marketCode}, ${s.brand}, ${point.date}, ${point.value}, '30d'
                  )
                  ON CONFLICT (market, brand, date, timeframe) 
                  DO UPDATE SET value = ${point.value}
                `;
              }
            }
          } catch (brandError) {
            console.error(`[CRON] Error fetching ${brand} for ${marketCode}:`, brandError);
          }
        }
        
        // Fetch related queries for each time window
        for (const window of timeWindows) {
          for (const brand of brands) {
            try {
              const queries = await client.getRelatedQueries(
                marketCode as keyof typeof MARKET_LOCATIONS,
                brand,
                window,
                100
              );
              
              const endDate = new Date();
              const startDate = new Date();
              switch (window) {
                case '7d':
                  startDate.setDate(startDate.getDate() - 7);
                  break;
                case '30d':
                  startDate.setDate(startDate.getDate() - 30);
                  break;
                case '90d':
                  startDate.setDate(startDate.getDate() - 90);
                  break;
              }
              
              // Store related queries
              for (const q of queries) {
                await prisma.$executeRaw`
                  INSERT INTO related_queries (
                    market, language, brand, query, timeframe,
                    growth_pct, rising_score, volume_monthly, cpc,
                    theme, theme_confidence, period_start, period_end
                  ) VALUES (
                    ${marketCode}, ${marketInfo.language_code}, ${brand}, ${q.query}, ${window},
                    ${q.growth_pct}, ${q.rising_score}, ${q.volume_monthly}, ${q.cpc},
                    ${q.theme}, ${q.theme_confidence}, ${startDate}, ${endDate}
                  )
                  ON CONFLICT (market, brand, query, timeframe, period_end)
                  DO UPDATE SET 
                    growth_pct = ${q.growth_pct},
                    rising_score = ${q.rising_score},
                    volume_monthly = ${q.volume_monthly}
                `;
              }
            } catch (queryError) {
              console.error(`[CRON] Error fetching queries for ${brand} ${window} in ${marketCode}:`, queryError);
            }
          }
        }
        
        // Fetch top volume queries
        for (const brand of brands) {
          try {
            const volumeQueries = await client.getTopVolumeQueries(
              marketCode as keyof typeof MARKET_LOCATIONS,
              brand,
              20
            );
            
            const now = new Date();
            for (const q of volumeQueries) {
              await prisma.$executeRaw`
                INSERT INTO top_volume_queries (
                  market, brand, query, volume_monthly, cpc,
                  timeframe, period_end
                ) VALUES (
                  ${marketCode}, ${brand}, ${q.keyword}, ${q.volume}, ${q.cpc},
                  '30d', ${now}
                )
                ON CONFLICT (market, brand, query, timeframe, period_end)
                DO UPDATE SET 
                  volume_monthly = ${q.volume},
                  cpc = ${q.cpc}
              `;
            }
          } catch (volumeError) {
            console.error(`[CRON] Error fetching volume for ${brand} in ${marketCode}:`, volumeError);
          }
        }
        
        results.success++;
        results.markets.push(marketCode);
      } catch (marketError) {
        console.error(`[CRON] Error processing market ${marketCode}:`, marketError);
        results.failed++;
      }
    }
    
    // Log job completion
    await prisma.$executeRaw`
      INSERT INTO jobs_trends (
        market, language, job_type, status, error_message
      ) VALUES (
        'ALL', 'multi', 'trends', 'success', NULL
      )
    `;
    
    console.log('[CRON] Daily trends fetch completed:', results);
    
    return NextResponse.json({
      success: true,
      message: 'Daily trends data fetch completed',
      results,
    });
  } catch (error) {
    console.error('[CRON] Fatal error in trends daily job:', error);
    
    // Log job failure
    try {
      await prisma.$executeRaw`
        INSERT INTO jobs_trends (
          market, language, job_type, status, error_message
        ) VALUES (
          'ALL', 'multi', 'trends', 'failed', 
          ${error instanceof Error ? error.message : 'Unknown error'}
        )
      `;
    } catch (logError) {
      console.error('[CRON] Failed to log job error:', logError);
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch trends data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}