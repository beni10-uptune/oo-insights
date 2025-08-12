-- Create content_pages table if it doesn't exist
CREATE TABLE IF NOT EXISTS "content_pages" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "market" TEXT,
    "language" TEXT,
    "title" TEXT,
    "description" TEXT,
    "rawHtml" TEXT,
    "textContent" TEXT,
    "wordCount" INTEGER,
    "tags" TEXT[],
    "isArticle" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'firecrawl',
    "lastCrawledAt" TIMESTAMP(3),
    "lastModifiedAt" TIMESTAMP(3),
    "changeHash" TEXT,
    "changePct" DOUBLE PRECISION,
    "embedding" BYTEA,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "content_pages_pkey" PRIMARY KEY ("id")
);

-- Create unique index on url
CREATE UNIQUE INDEX IF NOT EXISTS "content_pages_url_key" ON "content_pages"("url");

-- Create page_events table if it doesn't exist
CREATE TABLE IF NOT EXISTS "page_events" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "market" TEXT,
    "language" TEXT,
    "title" TEXT,
    "changePct" DOUBLE PRECISION,
    "eventAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "page_events_pkey" PRIMARY KEY ("id")
);

-- Create page_changes table if it doesn't exist
CREATE TABLE IF NOT EXISTS "page_changes" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "changeDescription" TEXT,
    "oldContentHash" TEXT NOT NULL,
    "newContentHash" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "page_changes_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'page_events_pageId_fkey') THEN
        ALTER TABLE "page_events" ADD CONSTRAINT "page_events_pageId_fkey" 
        FOREIGN KEY ("pageId") REFERENCES "content_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'page_changes_pageId_fkey') THEN
        ALTER TABLE "page_changes" ADD CONSTRAINT "page_changes_pageId_fkey" 
        FOREIGN KEY ("pageId") REFERENCES "content_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;