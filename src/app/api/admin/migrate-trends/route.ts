import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Check for admin secret
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    
    if (secret !== 'migrate-search-trends-2024') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('Running Search Trends migration - Creating tables and indexes...');
    
    const results = [];
    
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
    } catch (e) {
      const error = e as Error;
      results.push(`✗ trends_series: ${error.message}`);
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
    } catch (e) {
      const error = e as Error;
      results.push(`✗ related_queries: ${error.message}`);
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
      results.push(`✗ top_volume_queries: ${error.message}`);
    }
    
    // Create themes_rollup table
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "themes_rollup" (
          "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
          "market" TEXT NOT NULL,
          "language" TEXT NOT NULL,
          "timeframe" TEXT NOT NULL,
          "theme" TEXT NOT NULL,
          "rising_score" DOUBLE PRECISION NOT NULL,
          "volume_sum" INTEGER NOT NULL,
          "query_count" INTEGER NOT NULL,
          "period_start" DATE NOT NULL,
          "period_end" DATE NOT NULL,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          
          CONSTRAINT "themes_rollup_pkey" PRIMARY KEY ("id")
        )
      `);
      results.push('✓ Created themes_rollup table');
    } catch (e) {
      const error = e as Error;
      results.push(`✗ themes_rollup: ${error.message}`);
    }
    
    // Create jobs_trends table
    try {
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
      results.push('✓ Created jobs_trends table');
    } catch (e) {
      const error = e as Error;
      results.push(`✗ jobs_trends: ${error.message}`);
    }
    
    // Create trends_watchlist table
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "trends_watchlist" (
          "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
          "user_email" TEXT NOT NULL,
          "query" TEXT NOT NULL,
          "market" TEXT NOT NULL,
          "threshold_growth_pct" DOUBLE PRECISION,
          "threshold_volume" INTEGER,
          "last_triggered" TIMESTAMP(3),
          "is_active" BOOLEAN NOT NULL DEFAULT true,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          
          CONSTRAINT "trends_watchlist_pkey" PRIMARY KEY ("id")
        )
      `);
      results.push('✓ Created trends_watchlist table');
    } catch (e) {
      const error = e as Error;
      results.push(`✗ trends_watchlist: ${error.message}`);
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
      },
      {
        name: 'themes_rollup_market_timeframe_idx',
        sql: 'CREATE INDEX IF NOT EXISTS "themes_rollup_market_timeframe_idx" ON "themes_rollup" ("market", "timeframe", "rising_score" DESC)'
      },
      {
        name: 'jobs_trends_market_status_idx',
        sql: 'CREATE INDEX IF NOT EXISTS "jobs_trends_market_status_idx" ON "jobs_trends" ("market", "status", "run_at" DESC)'
      },
    ];
    
    for (const index of indexes) {
      try {
        await prisma.$executeRawUnsafe(index.sql);
        results.push(`✓ Created index: ${index.name}`);
      } catch (e) {
        const error = e as Error;
        results.push(`✗ Index ${index.name}: ${error.message}`);
      }
    }
    
    // Verify tables were created
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('trends_series', 'related_queries', 'top_volume_queries', 'themes_rollup', 'jobs_trends', 'trends_watchlist')
    `;
    
    return NextResponse.json({
      success: true,
      message: 'Search Trends migration completed',
      operations: results,
      verifiedTables: tables,
      note: 'Database schema ready for DataForSEO search trends data',
    });
  } catch (error) {
    console.error('Search Trends migration failed:', error);
    return NextResponse.json(
      { 
        error: 'Migration failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}