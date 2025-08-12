import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Check for admin secret
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    
    if (secret !== 'migrate-web-activity-2024') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('Running Web Activity migration...');
    
    // Execute migrations as separate commands
    const results = [];
    
    // Create content_pages table
    try {
      await prisma.$executeRawUnsafe(`
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
          "summary" TEXT,
          "summaryEn" TEXT,
          "category" TEXT,
          "subcategory" TEXT,
          "hasHcpLocator" BOOLEAN DEFAULT false,
          "signals" JSONB,
          "crawlError" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "content_pages_pkey" PRIMARY KEY ("id")
        )
      `);
      results.push('content_pages table created');
    } catch (e) {
      console.log('content_pages table might already exist:', e);
      results.push('content_pages table already exists');
    }
    
    // Create unique index
    try {
      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "content_pages_url_key" ON "content_pages"("url")
      `);
      results.push('content_pages_url_key index created');
    } catch (e) {
      console.log('Index might already exist:', e);
    }
    
    // Create page_events table
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "page_events" (
          "id" TEXT NOT NULL,
          "pageId" TEXT NOT NULL,
          "url" TEXT NOT NULL,
          "eventType" TEXT NOT NULL,
          "market" TEXT,
          "language" TEXT,
          "title" TEXT,
          "changePct" DOUBLE PRECISION,
          "summary" TEXT,
          "category" TEXT,
          "eventAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "page_events_pkey" PRIMARY KEY ("id")
        )
      `);
      results.push('page_events table created');
    } catch (e) {
      console.log('page_events table might already exist:', e);
      results.push('page_events table already exists');
    }
    
    // Create page_changes table
    try {
      await prisma.$executeRawUnsafe(`
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
        )
      `);
      results.push('page_changes table created');
    } catch (e) {
      console.log('page_changes table might already exist:', e);
      results.push('page_changes table already exists');
    }
    
    // Add foreign key for page_events
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "page_events" 
        ADD CONSTRAINT "page_events_pageId_fkey" 
        FOREIGN KEY ("pageId") REFERENCES "content_pages"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE
      `);
      results.push('page_events foreign key added');
    } catch (e) {
      console.log('page_events foreign key might already exist:', e);
      results.push('page_events foreign key already exists');
    }
    
    // Add foreign key for page_changes
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "page_changes" 
        ADD CONSTRAINT "page_changes_pageId_fkey" 
        FOREIGN KEY ("pageId") REFERENCES "content_pages"("id") 
        ON DELETE CASCADE ON UPDATE CASCADE
      `);
      results.push('page_changes foreign key added');
    } catch (e) {
      console.log('page_changes foreign key might already exist:', e);
      results.push('page_changes foreign key already exists');
    }
    
    // Verify tables were created
    const tableCheck = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('content_pages', 'page_events', 'page_changes')
    `;
    
    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully',
      operations: results,
      tablesCreated: tableCheck
    });
  } catch (error) {
    console.error('Migration failed:', error);
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