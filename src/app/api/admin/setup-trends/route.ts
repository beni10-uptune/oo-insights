import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Check for admin secret
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    
    if (secret !== 'setup-trends-2024') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('Setting up Search Trends tables and data...');
    
    const results = [];
    
    // Step 1: Create tables
    console.log('Creating tables...');
    
    // Create trends_series table
    try {
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
      results.push('✓ Created trends_series table');
      
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
      results.push('✓ Added unique constraint to trends_series');
    } catch (e) {
      const error = e as Error;
      results.push(`⚠ trends_series: ${error.message}`);
    }
    
    // Create related_queries table
    try {
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
      results.push('✓ Created related_queries table');
      
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
      results.push('✓ Added unique constraint to related_queries');
    } catch (e) {
      const error = e as Error;
      results.push(`⚠ related_queries: ${error.message}`);
    }
    
    // Create top_volume_queries table
    try {
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
      results.push('✓ Created top_volume_queries table');
    } catch (e) {
      const error = e as Error;
      results.push(`⚠ top_volume_queries: ${error.message}`);
    }
    
    // Create indexes
    const indexes = [
      {
        name: 'trends_series_market_brand_date_idx',
        sql: 'CREATE INDEX IF NOT EXISTS "trends_series_market_brand_date_idx" ON "trends_series" ("market", "brand", "date" DESC)'
      },
      {
        name: 'related_queries_market_timeframe_idx',
        sql: 'CREATE INDEX IF NOT EXISTS "related_queries_market_timeframe_idx" ON "related_queries" ("market", "timeframe", "rising_score" DESC)'
      },
      {
        name: 'top_volume_queries_market_volume_idx',
        sql: 'CREATE INDEX IF NOT EXISTS "top_volume_queries_market_volume_idx" ON "top_volume_queries" ("market", "volume_monthly" DESC)'
      }
    ];
    
    for (const index of indexes) {
      try {
        await prisma.$executeRawUnsafe(index.sql);
        results.push(`✓ Created index: ${index.name}`);
      } catch (e) {
        const error = e as Error;
        results.push(`⚠ Index ${index.name}: ${error.message}`);
      }
    }
    
    // Step 2: Seed sample data
    console.log('Seeding sample data...');
    
    const MARKETS = ['UK', 'FR', 'DE', 'IT', 'ES', 'CA', 'PL'];
    const BRANDS = ['Wegovy', 'Ozempic', 'Mounjaro'];
    let seedCount = { series: 0, queries: 0, volume: 0 };
    
    // Seed trends_series data (30 days of data)
    for (const market of MARKETS) {
      for (const brand of BRANDS) {
        for (let i = 29; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          
          // Generate realistic trend values
          let baseValue = 50;
          if (brand === 'Wegovy') baseValue = 70;
          if (brand === 'Ozempic') baseValue = 65;
          if (brand === 'Mounjaro') baseValue = 45 + (29 - i) * 0.8; // Rising trend
          
          const value = Math.round(baseValue + Math.sin(i / 5) * 15 + Math.random() * 10);
          
          try {
            await prisma.$executeRaw`
              INSERT INTO trends_series (
                market, language, brand, date, interest_index
              ) VALUES (
                ${market}, 'en', ${brand}, ${dateStr}::date, ${value}
              )
              ON CONFLICT (market, brand, date) 
              DO UPDATE SET interest_index = ${value}
            `;
            seedCount.series++;
          } catch {
            // Skip duplicates
          }
        }
      }
    }
    
    // Seed related_queries data
    const themes = ['side_effects', 'weight_loss', 'availability', 'price'];
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    for (const market of MARKETS) {
      for (const brand of BRANDS) {
        for (const theme of themes) {
          const query = `${brand.toLowerCase()} ${theme.replace('_', ' ')}`;
          const volume = Math.floor(Math.random() * 10000) + 1000;
          const growth = Math.random() * 150 - 25; // -25% to +125%
          const risingScore = growth > 0 ? growth * Math.log(volume + 1) : 0;
          
          try {
            await prisma.$executeRaw`
              INSERT INTO related_queries (
                market, language, brand, query, timeframe,
                growth_pct, rising_score, volume_monthly, cpc,
                theme, theme_confidence, period_start, period_end
              ) VALUES (
                ${market}, 'en', ${brand}, ${query}, '30d',
                ${growth}, ${risingScore}, ${volume}, ${Math.random() * 5},
                ${theme}, ${0.9}, ${thirtyDaysAgo}::date, ${now}::date
              )
              ON CONFLICT (market, brand, query, timeframe, period_end)
              DO UPDATE SET 
                growth_pct = ${growth},
                rising_score = ${risingScore},
                volume_monthly = ${volume}
            `;
            seedCount.queries++;
          } catch {
            // Skip duplicates
          }
        }
      }
    }
    
    // Seed top_volume_queries
    const highVolumeQueries = [
      'wegovy', 'ozempic', 'mounjaro',
      'wegovy weight loss', 'ozempic side effects', 'mounjaro price'
    ];
    
    for (const market of MARKETS) {
      for (const query of highVolumeQueries) {
        const brand = BRANDS.find(b => query.toLowerCase().includes(b.toLowerCase()));
        const volume = Math.floor(Math.random() * 50000) + 10000;
        
        // Determine theme
        let theme = 'brand';
        if (query.includes('weight loss')) theme = 'weight_loss';
        else if (query.includes('side effects')) theme = 'side_effects';
        else if (query.includes('price')) theme = 'price';
        
        try {
          await prisma.$executeRaw`
            INSERT INTO top_volume_queries (
              market, language, query, volume_monthly, cpc,
              theme, brand_hint
            ) VALUES (
              ${market}, 'en', ${query}, ${volume}, ${Math.random() * 10},
              ${theme}, ${brand || 'Unknown'}
            )
            ON CONFLICT DO NOTHING
          `;
          seedCount.volume++;
        } catch {
          // Skip duplicates
        }
      }
    }
    
    results.push(`✓ Seeded ${seedCount.series} trends series records`);
    results.push(`✓ Seeded ${seedCount.queries} related queries records`);
    results.push(`✓ Seeded ${seedCount.volume} top volume queries records`);
    
    // Verify data
    const verification = await prisma.$queryRaw`
      SELECT 
        (SELECT COUNT(*) FROM trends_series) as series_count,
        (SELECT COUNT(*) FROM related_queries) as queries_count,
        (SELECT COUNT(*) FROM top_volume_queries) as volume_count
    ` as Array<{ series_count: bigint; queries_count: bigint; volume_count: bigint }>;
    
    return NextResponse.json({
      success: true,
      message: 'Search Trends setup completed successfully',
      operations: results,
      dataCount: {
        trends_series: Number(verification[0]?.series_count || 0),
        related_queries: Number(verification[0]?.queries_count || 0),
        top_volume_queries: Number(verification[0]?.volume_count || 0)
      },
      note: 'Tables created and populated with sample data. Visit /search-trends to view.'
    });
  } catch (error) {
    console.error('Setup failed:', error);
    return NextResponse.json(
      { 
        error: 'Setup failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}