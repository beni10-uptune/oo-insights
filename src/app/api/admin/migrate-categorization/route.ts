import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    // Check for admin authorization (simple secret for now)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET || 'test-cron-secret'}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Try to add the PageMetrics table
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS page_metrics (
          id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
          "pageId" VARCHAR(36) UNIQUE NOT NULL,
          impressions INTEGER DEFAULT 0,
          clicks INTEGER DEFAULT 0,
          ctr DOUBLE PRECISION,
          "avgPosition" DOUBLE PRECISION,
          "avgTimeOnPage" DOUBLE PRECISION,
          "bounceRate" DOUBLE PRECISION,
          "exitRate" DOUBLE PRECISION,
          "socialShares" INTEGER DEFAULT 0,
          backlinks INTEGER DEFAULT 0,
          "categoryViews" JSONB,
          "conversionRate" DOUBLE PRECISION,
          period VARCHAR(255),
          "lastUpdated" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("pageId") REFERENCES content_pages(id) ON DELETE CASCADE
        )
      `;
      
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS idx_page_metrics_page_period ON page_metrics("pageId", period)
      `;
      
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS idx_page_metrics_period ON page_metrics(period)
      `;
      
      console.log('PageMetrics table created successfully');
    } catch (error) {
      console.log('PageMetrics table might already exist:', error);
    }

    // Check if categorization columns exist, add them if not
    const checkColumns = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'content_pages' 
      AND column_name IN ('category', 'contentType', 'confidence', 'keywords', 'hasVideo', 'hasCalculator', 'hasForm', 'readingTime')
    ` as Array<{ column_name: string }>;

    const existingColumns = new Set(checkColumns.map(row => row.column_name));
    
    // Add missing columns
    if (!existingColumns.has('category')) {
      await prisma.$executeRaw`ALTER TABLE content_pages ADD COLUMN IF NOT EXISTS category VARCHAR(255)`;
    }
    if (!existingColumns.has('contentType')) {
      await prisma.$executeRaw`ALTER TABLE content_pages ADD COLUMN IF NOT EXISTS "contentType" VARCHAR(255)`;
    }
    if (!existingColumns.has('confidence')) {
      await prisma.$executeRaw`ALTER TABLE content_pages ADD COLUMN IF NOT EXISTS confidence DOUBLE PRECISION`;
    }
    if (!existingColumns.has('keywords')) {
      await prisma.$executeRaw`ALTER TABLE content_pages ADD COLUMN IF NOT EXISTS keywords TEXT[]`;
    }
    if (!existingColumns.has('hasVideo')) {
      await prisma.$executeRaw`ALTER TABLE content_pages ADD COLUMN IF NOT EXISTS "hasVideo" BOOLEAN DEFAULT false`;
    }
    if (!existingColumns.has('hasCalculator')) {
      await prisma.$executeRaw`ALTER TABLE content_pages ADD COLUMN IF NOT EXISTS "hasCalculator" BOOLEAN DEFAULT false`;
    }
    if (!existingColumns.has('hasForm')) {
      await prisma.$executeRaw`ALTER TABLE content_pages ADD COLUMN IF NOT EXISTS "hasForm" BOOLEAN DEFAULT false`;
    }
    if (!existingColumns.has('readingTime')) {
      await prisma.$executeRaw`ALTER TABLE content_pages ADD COLUMN IF NOT EXISTS "readingTime" INTEGER`;
    }

    // Create indexes for better query performance
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_content_pages_category ON content_pages(market, category)`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_content_pages_contentType ON content_pages("contentType")`;

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully',
      tablesCreated: ['page_metrics'],
      columnsAdded: ['category', 'contentType', 'confidence', 'keywords', 'hasVideo', 'hasCalculator', 'hasForm', 'readingTime'],
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: 'Migration failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}