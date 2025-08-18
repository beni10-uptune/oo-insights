-- Add publishDate column to content_pages table
ALTER TABLE "content_pages" 
ADD COLUMN IF NOT EXISTS "publishDate" TIMESTAMP(3);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS "content_pages_publishDate_idx" 
ON "content_pages" ("publishDate");

-- Add index for market and publishDate combination
CREATE INDEX IF NOT EXISTS "content_pages_market_publishDate_idx" 
ON "content_pages" ("market", "publishDate");