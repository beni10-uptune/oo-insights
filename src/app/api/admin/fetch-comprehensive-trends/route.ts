import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getDataForSEOClient, MARKET_LOCATIONS, BRAND_KEYWORDS } from '@/lib/dataforseo/client';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Check for admin secret
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    const testMode = searchParams.get('test') === 'true';
    const specificMarket = searchParams.get('market');
    
    if (secret !== 'fetch-comprehensive-2024') {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid secret' },
        { status: 401 }
      );
    }
    
    console.log('Starting comprehensive data fetch from DataForSEO...');
    
    // Check environment variables
    if (!process.env.DATAFORSEO_LOGIN || !process.env.DATAFORSEO_PASSWORD) {
      return NextResponse.json({
        success: false,
        error: 'Missing DataForSEO credentials',
      }, { status: 500 });
    }
    
    const client = getDataForSEOClient();
    const markets = specificMarket ? [specificMarket] : Object.keys(MARKET_LOCATIONS);
    
    const results = {
      markets_processed: [] as string[],
      trends_fetched: 0,
      volumes_fetched: 0,
      related_fetched: 0,
      errors: [] as string[],
    };
    
    for (const market of markets) {
      console.log(`\n📍 Processing market: ${market}`);
      
      try {
        // 1. Fetch Google Trends data (daily interest index 0-100)
        console.log(`  📈 Fetching Google Trends for ${market}...`);
        const trendsData = await client.getTrends(market as keyof typeof MARKET_LOCATIONS, '90d');
        
        if (trendsData.length > 0) {
          // Clear old trends data for this market
          await prisma.$executeRawUnsafe(
            `DELETE FROM trends_series WHERE market = $1`,
            market
          );
          
          // Insert new trends data
          for (const series of trendsData) {
            for (const point of series.points) {
              await prisma.$executeRawUnsafe(
                `INSERT INTO trends_series (market, language, brand, date, interest_index)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (market, brand, date) 
                 DO UPDATE SET interest_index = $5, updated_at = CURRENT_TIMESTAMP`,
                market,
                MARKET_LOCATIONS[market as keyof typeof MARKET_LOCATIONS].language_code,
                series.brand,
                point.date,
                point.value
              );
              results.trends_fetched++;
            }
          }
        }
        
        // 2. Fetch monthly search volumes with historical data
        console.log(`  📊 Fetching search volumes for ${market}...`);
        const volumeData = await client.getSearchVolume(
          market as keyof typeof MARKET_LOCATIONS,
          BRAND_KEYWORDS
        );
        
        if (volumeData.length > 0) {
          for (const item of volumeData) {
            // Store in top_volume_queries (delete old entry first to avoid duplicates)
            await prisma.$executeRawUnsafe(
              `DELETE FROM top_volume_queries WHERE market = $1 AND query = $2`,
              market,
              item.keyword
            );
            
            await prisma.$executeRawUnsafe(
              `INSERT INTO top_volume_queries (market, language, query, volume_monthly, cpc)
               VALUES ($1, $2, $3, $4, $5)`,
              market,
              MARKET_LOCATIONS[market as keyof typeof MARKET_LOCATIONS].language_code,
              item.keyword,
              item.volume,
              item.cpc || 0
            );
            results.volumes_fetched++;
            
            // Store monthly historical data if available
            if (item.monthly_searches && item.monthly_searches.length > 0) {
              for (const monthly of item.monthly_searches) {
                const date = `${monthly.year}-${String(monthly.month).padStart(2, '0')}-01`;
                await prisma.$executeRawUnsafe(
                  `INSERT INTO monthly_volumes (market, keyword, date, volume)
                   VALUES ($1, $2, $3, $4)
                   ON CONFLICT (market, keyword, date)
                   DO UPDATE SET volume = $4, updated_at = CURRENT_TIMESTAMP`,
                  market,
                  item.keyword,
                  date,
                  monthly.search_volume
                );
              }
            }
          }
        }
        
        // 3. Fetch related/rising queries for each brand
        console.log(`  🔍 Fetching related queries for ${market}...`);
        for (const brand of BRAND_KEYWORDS) {
          const relatedQueries = await client.getRelatedQueries(
            market as keyof typeof MARKET_LOCATIONS,
            brand,
            '30d',
            100
          );
          
          for (const query of relatedQueries) {
            await prisma.$executeRawUnsafe(
              `INSERT INTO related_queries (
                market, query, brand, growth_pct, rising_score, 
                volume_monthly, cpc, theme, theme_confidence, 
                period_start, period_end, timeframe
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
              ON CONFLICT (market, query, timeframe)
              DO UPDATE SET 
                growth_pct = $4, 
                rising_score = $5,
                volume_monthly = $6,
                cpc = $7,
                theme = $8,
                theme_confidence = $9,
                updated_at = CURRENT_TIMESTAMP`,
              market,
              query.query,
              brand,
              query.growth_pct || 0,
              query.rising_score || 0,
              query.volume_monthly || 0,
              query.cpc || 0,
              query.theme || 'general',
              query.theme_confidence || 0,
              new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
              new Date(), // now
              '30d'
            );
            results.related_fetched++;
          }
        }
        
        results.markets_processed.push(market);
        console.log(`  ✅ ${market} completed`);
        
      } catch (error) {
        const errorMsg = `Error processing ${market}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(`  ❌ ${errorMsg}`);
        results.errors.push(errorMsg);
      }
    }
    
    // Log job completion
    await prisma.$executeRawUnsafe(
      `INSERT INTO jobs_trends (market, language, job_type, status, completed_at)
       VALUES ('ALL', 'multi', 'comprehensive_fetch', 'success', CURRENT_TIMESTAMP)`
    );
    
    const executionTime = Math.round((Date.now() - startTime) / 1000);
    
    return NextResponse.json({
      success: true,
      message: 'Comprehensive trends data fetch completed',
      execution_time: `${executionTime} seconds`,
      results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Fatal error in comprehensive fetch:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch comprehensive data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}