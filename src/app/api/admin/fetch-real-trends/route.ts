import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getDataForSEOClient, MARKET_LOCATIONS, BRAND_KEYWORDS } from '@/lib/dataforseo/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Check for admin secret
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    const testMode = searchParams.get('test') === 'true';
    
    if (secret !== 'fetch-real-trends-2024') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('Starting to fetch REAL data from DataForSEO...');
    
    const results = {
      tables_created: [] as string[],
      data_fetched: {
        trends_series: 0,
        related_queries: 0,
        top_volume: 0
      },
      markets_processed: [] as string[],
      errors: [] as string[]
    };
    
    // Step 1: Ensure tables exist
    console.log('Ensuring database tables exist...');
    
    try {
      // Create trends_series table
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "trends_series" (
          "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
          "market" TEXT NOT NULL,
          "language" TEXT NOT NULL,
          "brand" TEXT NOT NULL,
          "date" DATE NOT NULL,
          "interest_index" INTEGER NOT NULL,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          
          CONSTRAINT "trends_series_pkey" PRIMARY KEY ("id")
        )
      `);
      
      // Add unique constraint
      await prisma.$executeRawUnsafe(`
        DO $$ 
        BEGIN 
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'trends_series_unique_key'
          ) THEN
            ALTER TABLE trends_series 
            ADD CONSTRAINT trends_series_unique_key 
            UNIQUE (market, brand, date);
          END IF;
        END $$;
      `);
      results.tables_created.push('trends_series');
      
      // Create related_queries table
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "related_queries" (
          "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
          "market" TEXT NOT NULL,
          "language" TEXT NOT NULL,
          "brand" TEXT,
          "query" TEXT NOT NULL,
          "timeframe" TEXT NOT NULL,
          "growth_pct" DOUBLE PRECISION NOT NULL,
          "rising_score" DOUBLE PRECISION NOT NULL,
          "volume_monthly" INTEGER NOT NULL,
          "cpc" DOUBLE PRECISION,
          "theme" TEXT,
          "theme_confidence" DOUBLE PRECISION,
          "period_start" DATE NOT NULL,
          "period_end" DATE NOT NULL,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          
          CONSTRAINT "related_queries_pkey" PRIMARY KEY ("id")
        )
      `);
      
      // Add unique constraint
      await prisma.$executeRawUnsafe(`
        DO $$ 
        BEGIN 
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'related_queries_unique_key'
          ) THEN
            ALTER TABLE related_queries 
            ADD CONSTRAINT related_queries_unique_key 
            UNIQUE (market, brand, query, timeframe, period_end);
          END IF;
        END $$;
      `);
      results.tables_created.push('related_queries');
      
      // Create top_volume_queries table
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "top_volume_queries" (
          "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
          "market" TEXT NOT NULL,
          "language" TEXT NOT NULL,
          "query" TEXT NOT NULL,
          "volume_monthly" INTEGER NOT NULL,
          "volume_prev" INTEGER,
          "volume_delta_pct" DOUBLE PRECISION,
          "cpc" DOUBLE PRECISION,
          "theme" TEXT,
          "brand_hint" TEXT,
          "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          
          CONSTRAINT "top_volume_queries_pkey" PRIMARY KEY ("id")
        )
      `);
      results.tables_created.push('top_volume_queries');
      
      // Create jobs_trends table for tracking
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "jobs_trends" (
          "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
          "market" TEXT NOT NULL,
          "language" TEXT NOT NULL,
          "job_type" TEXT NOT NULL,
          "run_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "status" TEXT NOT NULL,
          "provider_payload" JSONB,
          "provider_job_id" TEXT,
          "error_message" TEXT,
          "completed_at" TIMESTAMP(3),
          
          CONSTRAINT "jobs_trends_pkey" PRIMARY KEY ("id")
        )
      `);
      results.tables_created.push('jobs_trends');
      
      // Create indexes
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "trends_series_market_brand_date_idx" 
        ON "trends_series" ("market", "brand", "date" DESC)
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "related_queries_market_timeframe_idx" 
        ON "related_queries" ("market", "timeframe", "rising_score" DESC)
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "top_volume_queries_market_volume_idx" 
        ON "top_volume_queries" ("market", "volume_monthly" DESC)
      `);
      
    } catch (e) {
      const error = e as Error;
      console.error('Table creation error:', error);
      results.errors.push(`Table creation: ${error.message}`);
    }
    
    // Step 2: Fetch REAL data from DataForSEO
    console.log('Fetching real data from DataForSEO API...');
    
    // Check if credentials are available
    if (!process.env.DATAFORSEO_LOGIN || !process.env.DATAFORSEO_PASSWORD) {
      return NextResponse.json({
        success: false,
        message: 'DataForSEO credentials not configured',
        error: 'Missing DATAFORSEO_LOGIN or DATAFORSEO_PASSWORD environment variables',
        results,
        note: 'Please add DataForSEO credentials to Vercel environment variables'
      });
    }
    
    try {
      const client = getDataForSEOClient();
      
      // Select markets to process (test mode = just UK, otherwise all)
      const marketsToProcess = testMode 
        ? (['UK'] as Array<keyof typeof MARKET_LOCATIONS>)
        : (Object.keys(MARKET_LOCATIONS) as Array<keyof typeof MARKET_LOCATIONS>);
      
      for (const market of marketsToProcess) {
        console.log(`Processing market: ${market}`);
        const location = MARKET_LOCATIONS[market];
        
        try {
          // Log job start
          await prisma.$executeRaw`
            INSERT INTO jobs_trends (market, language, job_type, status)
            VALUES (${market}, ${location.language_code}, 'full_fetch', 'running')
          `;
          
          // 1. Fetch trends series (interest over time)
          console.log(`Fetching trends for ${market}...`);
          const trendsData = await client.getTrends(market, '30d', BRAND_KEYWORDS);
          
          for (const brandSeries of trendsData) {
            for (const point of brandSeries.points) {
              try {
                await prisma.$executeRaw`
                  INSERT INTO trends_series (
                    market, language, brand, date, interest_index
                  ) VALUES (
                    ${market}, 
                    ${location.language_code}, 
                    ${brandSeries.brand}, 
                    ${point.date}::date, 
                    ${point.value}
                  )
                  ON CONFLICT (market, brand, date) 
                  DO UPDATE SET 
                    interest_index = ${point.value},
                    updated_at = CURRENT_TIMESTAMP
                `;
                results.data_fetched.trends_series++;
              } catch (e) {
                console.error(`Error inserting trend point: ${e}`);
              }
            }
          }
          
          // 2. Fetch related queries for each brand
          console.log(`Fetching related queries for ${market}...`);
          const now = new Date();
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          
          for (const brand of BRAND_KEYWORDS) {
            try {
              const relatedQueries = await client.getRelatedQueries(market, brand, '30d', 50);
              
              for (const query of relatedQueries) {
                try {
                  await prisma.$executeRaw`
                    INSERT INTO related_queries (
                      market, language, brand, query, timeframe,
                      growth_pct, rising_score, volume_monthly, cpc,
                      theme, theme_confidence, period_start, period_end
                    ) VALUES (
                      ${market}, 
                      ${location.language_code}, 
                      ${brand}, 
                      ${query.query}, 
                      '30d',
                      ${query.growth_pct}, 
                      ${query.rising_score}, 
                      ${query.volume_monthly}, 
                      ${query.cpc || null},
                      ${query.theme || null}, 
                      ${query.theme_confidence || null}, 
                      ${thirtyDaysAgo}::date, 
                      ${now}::date
                    )
                    ON CONFLICT (market, brand, query, timeframe, period_end)
                    DO UPDATE SET 
                      growth_pct = ${query.growth_pct},
                      rising_score = ${query.rising_score},
                      volume_monthly = ${query.volume_monthly},
                      cpc = ${query.cpc || null},
                      theme = ${query.theme || null},
                      theme_confidence = ${query.theme_confidence || null}
                  `;
                  results.data_fetched.related_queries++;
                } catch (e) {
                  console.error(`Error inserting related query: ${e}`);
                }
              }
            } catch (e) {
              console.error(`Error fetching related queries for ${brand} in ${market}: ${e}`);
            }
          }
          
          // 3. Fetch top volume queries
          console.log(`Fetching top volume queries for ${market}...`);
          for (const brand of BRAND_KEYWORDS) {
            try {
              const topVolumeQueries = await client.getTopVolumeQueries(market, brand, 20);
              
              for (const volumeQuery of topVolumeQueries) {
                // Determine theme based on query
                let theme = 'brand';
                const queryLower = volumeQuery.keyword.toLowerCase();
                if (queryLower.includes('weight loss') || queryLower.includes('results')) theme = 'weight_loss';
                else if (queryLower.includes('side effect')) theme = 'side_effects';
                else if (queryLower.includes('price') || queryLower.includes('cost')) theme = 'price';
                else if (queryLower.includes('buy') || queryLower.includes('pharmacy')) theme = 'pharmacy';
                else if (queryLower.includes('dosage') || queryLower.includes('dose')) theme = 'dosage';
                
                try {
                  await prisma.$executeRaw`
                    INSERT INTO top_volume_queries (
                      market, language, query, volume_monthly, cpc,
                      theme, brand_hint
                    ) VALUES (
                      ${market}, 
                      ${location.language_code}, 
                      ${volumeQuery.keyword}, 
                      ${volumeQuery.volume}, 
                      ${volumeQuery.cpc || null},
                      ${theme}, 
                      ${brand}
                    )
                    ON CONFLICT DO NOTHING
                  `;
                  results.data_fetched.top_volume++;
                } catch (e) {
                  console.error(`Error inserting top volume query: ${e}`);
                }
              }
            } catch (e) {
              console.error(`Error fetching top volume queries for ${brand} in ${market}: ${e}`);
            }
          }
          
          // Log job completion
          await prisma.$executeRaw`
            UPDATE jobs_trends 
            SET status = 'success', completed_at = CURRENT_TIMESTAMP
            WHERE market = ${market} 
              AND job_type = 'full_fetch' 
              AND status = 'running'
          `;
          
          results.markets_processed.push(market);
          
        } catch (marketError) {
          console.error(`Error processing market ${market}:`, marketError);
          results.errors.push(`Market ${market}: ${marketError}`);
          
          // Log job failure
          await prisma.$executeRaw`
            UPDATE jobs_trends 
            SET status = 'failed', 
                error_message = ${String(marketError)},
                completed_at = CURRENT_TIMESTAMP
            WHERE market = ${market} 
              AND job_type = 'full_fetch' 
              AND status = 'running'
          `;
        }
        
        // Add delay between markets to avoid rate limiting
        if (!testMode) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
    } catch (apiError) {
      console.error('DataForSEO API error:', apiError);
      results.errors.push(`API Error: ${apiError}`);
      
      // If API fails, return error but keep tables
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch data from DataForSEO',
        error: String(apiError),
        results,
        note: 'Tables created but no data fetched. Check DataForSEO credentials and try again.'
      });
    }
    
    // Verify data was inserted
    const verification = await prisma.$queryRaw`
      SELECT 
        (SELECT COUNT(*) FROM trends_series) as series_count,
        (SELECT COUNT(*) FROM related_queries) as queries_count,
        (SELECT COUNT(*) FROM top_volume_queries) as volume_count,
        (SELECT COUNT(DISTINCT market) FROM trends_series) as markets_count
    ` as Array<{ 
      series_count: bigint; 
      queries_count: bigint; 
      volume_count: bigint;
      markets_count: bigint;
    }>;
    
    return NextResponse.json({
      success: true,
      message: testMode 
        ? 'Test fetch completed (UK market only)' 
        : 'Successfully fetched REAL data from DataForSEO',
      results,
      database_counts: {
        trends_series: Number(verification[0]?.series_count || 0),
        related_queries: Number(verification[0]?.queries_count || 0),
        top_volume_queries: Number(verification[0]?.volume_count || 0),
        markets_with_data: Number(verification[0]?.markets_count || 0)
      },
      next_steps: [
        'Visit /search-trends to see the real data',
        'Set up cron job to refresh data regularly',
        'Monitor DataForSEO API usage'
      ]
    });
  } catch (error) {
    console.error('Fetch real trends failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch real trends',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}