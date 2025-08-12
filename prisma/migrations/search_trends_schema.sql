-- Search Trends Module Schema
-- This migration adds tables for DataForSEO-powered search trends tracking

-- Trends series data (interest over time)
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
);

-- Related queries with growth metrics
CREATE TABLE IF NOT EXISTS "related_queries" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "market" TEXT NOT NULL,
  "language" TEXT NOT NULL,
  "brand" TEXT,
  "query" TEXT NOT NULL,
  "timeframe" TEXT NOT NULL, -- '7d', '30d', '90d', '12m'
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
);

-- Top volume queries
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
);

-- Theme rollups for driver analysis
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
);

-- Jobs tracking for DataForSEO calls
CREATE TABLE IF NOT EXISTS "jobs_trends" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "market" TEXT NOT NULL,
  "language" TEXT NOT NULL,
  "job_type" TEXT NOT NULL, -- 'trends', 'related', 'volume'
  "run_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" TEXT NOT NULL, -- 'pending', 'running', 'success', 'failed'
  "provider_payload" JSONB,
  "provider_job_id" TEXT,
  "error_message" TEXT,
  "completed_at" TIMESTAMP(3),
  
  CONSTRAINT "jobs_trends_pkey" PRIMARY KEY ("id")
);

-- Watchlist for alerts
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
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "trends_series_market_brand_date_idx" 
  ON "trends_series" ("market", "brand", "date" DESC);

CREATE INDEX IF NOT EXISTS "trends_series_date_idx" 
  ON "trends_series" ("date" DESC);

CREATE INDEX IF NOT EXISTS "related_queries_market_timeframe_idx" 
  ON "related_queries" ("market", "timeframe", "rising_score" DESC);

CREATE INDEX IF NOT EXISTS "related_queries_theme_idx" 
  ON "related_queries" ("theme");

CREATE INDEX IF NOT EXISTS "top_volume_queries_market_volume_idx" 
  ON "top_volume_queries" ("market", "volume_monthly" DESC);

CREATE INDEX IF NOT EXISTS "themes_rollup_market_timeframe_idx" 
  ON "themes_rollup" ("market", "timeframe", "rising_score" DESC);

CREATE INDEX IF NOT EXISTS "jobs_trends_market_status_idx" 
  ON "jobs_trends" ("market", "status", "run_at" DESC);

-- GIN index for fast query text search
CREATE INDEX IF NOT EXISTS "related_queries_query_gin_idx" 
  ON "related_queries" USING gin(to_tsvector('english', "query"));

CREATE INDEX IF NOT EXISTS "top_volume_queries_query_gin_idx" 
  ON "top_volume_queries" USING gin(to_tsvector('english', "query"));