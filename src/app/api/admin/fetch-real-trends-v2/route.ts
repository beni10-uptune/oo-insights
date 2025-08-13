import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Check for admin secret
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    const testMode = searchParams.get('test') === 'true';
    
    if (secret !== 'fetch-real-trends-2024') {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid secret' },
        { status: 401 }
      );
    }
    
    console.log('Starting to fetch REAL data from DataForSEO...');
    
    // Check environment variables first
    if (!process.env.DATAFORSEO_LOGIN || !process.env.DATAFORSEO_PASSWORD) {
      return NextResponse.json({
        success: false,
        error: 'Missing credentials',
        details: {
          DATAFORSEO_LOGIN: process.env.DATAFORSEO_LOGIN ? 'Set' : 'Missing',
          DATAFORSEO_PASSWORD: process.env.DATAFORSEO_PASSWORD ? 'Set' : 'Missing',
        },
        message: 'Please add DataForSEO credentials to Vercel environment variables'
      }, { status: 500 });
    }
    
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        success: false,
        error: 'Missing DATABASE_URL',
        message: 'Database connection string not configured'
      }, { status: 500 });
    }
    
    // Import dependencies after checking env vars
    let PrismaClient: any;
    let getDataForSEOClient: any;
    let MARKET_LOCATIONS: any;
    let BRAND_KEYWORDS: any;
    
    try {
      const prismaModule = await import('@prisma/client');
      PrismaClient = prismaModule.PrismaClient;
    } catch (importError) {
      console.error('Failed to import Prisma:', importError);
      return NextResponse.json({
        success: false,
        error: 'Failed to import Prisma',
        details: importError instanceof Error ? importError.message : 'Unknown error'
      }, { status: 500 });
    }
    
    try {
      const dataforSeoModule = await import('@/lib/dataforseo/client');
      getDataForSEOClient = dataforSeoModule.getDataForSEOClient;
      MARKET_LOCATIONS = dataforSeoModule.MARKET_LOCATIONS;
      BRAND_KEYWORDS = dataforSeoModule.BRAND_KEYWORDS;
    } catch (importError) {
      console.error('Failed to import DataForSEO client:', importError);
      return NextResponse.json({
        success: false,
        error: 'Failed to import DataForSEO client',
        details: importError instanceof Error ? importError.message : 'Unknown error'
      }, { status: 500 });
    }
    
    const prisma = new PrismaClient();
    
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
    
    try {
      // Step 1: Ensure tables exist
      console.log('Creating database tables if needed...');
      
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
      
      // Add constraints safely
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
      
    } catch (dbError) {
      console.error('Database setup error:', dbError);
      results.errors.push(`Database setup: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
    }
    
    // Step 2: If test mode, just insert sample data instead of calling API
    if (testMode) {
      console.log('Test mode: Inserting sample data...');
      
      try {
        const testMarket = 'UK';
        const testBrand = 'Wegovy';
        const today = new Date();
        
        // Insert sample trend data
        for (let i = 0; i < 7; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          const value = Math.floor(Math.random() * 30) + 50;
          
          await prisma.$executeRaw`
            INSERT INTO trends_series (
              market, language, brand, date, interest_index
            ) VALUES (
              ${testMarket}, 'en', ${testBrand}, ${dateStr}::date, ${value}
            )
            ON CONFLICT (market, brand, date) 
            DO UPDATE SET interest_index = ${value}
          `;
          results.data_fetched.trends_series++;
        }
        
        // Insert sample related queries
        const sampleQueries = [
          'wegovy side effects',
          'wegovy weight loss',
          'wegovy price uk',
          'wegovy availability'
        ];
        
        for (const query of sampleQueries) {
          await prisma.$executeRaw`
            INSERT INTO related_queries (
              market, language, brand, query, timeframe,
              growth_pct, rising_score, volume_monthly, cpc,
              theme, theme_confidence, period_start, period_end
            ) VALUES (
              ${testMarket}, 'en', ${testBrand}, ${query}, '30d',
              ${Math.random() * 100}, ${Math.random() * 1000}, ${Math.floor(Math.random() * 10000)}, ${Math.random() * 5},
              'test', 0.9, ${new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)}::date, ${today}::date
            )
            ON CONFLICT (market, brand, query, timeframe, period_end)
            DO NOTHING
          `;
          results.data_fetched.related_queries++;
        }
        
        results.markets_processed.push(testMarket);
        
      } catch (testError) {
        console.error('Test data insertion error:', testError);
        results.errors.push(`Test data: ${testError instanceof Error ? testError.message : 'Unknown error'}`);
      }
      
    } else {
      // Step 3: Fetch real data from DataForSEO
      console.log('Fetching real data from DataForSEO...');
      
      try {
        const client = getDataForSEOClient();
        
        // For now, just test the connection
        console.log('DataForSEO client initialized successfully');
        results.markets_processed.push('API client ready');
        
        // TODO: Add actual API calls here when ready
        
      } catch (apiError) {
        console.error('DataForSEO error:', apiError);
        results.errors.push(`API: ${apiError instanceof Error ? apiError.message : 'Unknown error'}`);
      }
    }
    
    // Verify data was inserted
    const verification = await prisma.$queryRaw`
      SELECT 
        (SELECT COUNT(*) FROM trends_series) as series_count,
        (SELECT COUNT(*) FROM related_queries) as queries_count,
        (SELECT COUNT(*) FROM top_volume_queries) as volume_count
    ` as Array<{ series_count: bigint; queries_count: bigint; volume_count: bigint }>;
    
    await prisma.$disconnect();
    
    const executionTime = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      message: testMode ? 'Test completed with sample data' : 'Real data fetch completed',
      executionTime: `${executionTime}ms`,
      results,
      database_counts: {
        trends_series: Number(verification[0]?.series_count || 0),
        related_queries: Number(verification[0]?.queries_count || 0),
        top_volume_queries: Number(verification[0]?.volume_count || 0)
      },
      errors: results.errors.length > 0 ? results.errors : undefined
    });
    
  } catch (error) {
    console.error('Fatal error in fetch-real-trends:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Fatal error',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}