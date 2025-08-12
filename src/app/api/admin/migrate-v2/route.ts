import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Check for admin secret
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    
    if (secret !== 'migrate-web-activity-v2-2024') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('Running Web Activity V2 migration - Adding new columns...');
    
    const results = [];
    
    // Add new columns to content_pages table
    const newColumns = [
      { name: 'summary', sql: 'ALTER TABLE "content_pages" ADD COLUMN IF NOT EXISTS "summary" TEXT' },
      { name: 'summaryEn', sql: 'ALTER TABLE "content_pages" ADD COLUMN IF NOT EXISTS "summaryEn" TEXT' },
      { name: 'category', sql: 'ALTER TABLE "content_pages" ADD COLUMN IF NOT EXISTS "category" TEXT' },
      { name: 'subcategory', sql: 'ALTER TABLE "content_pages" ADD COLUMN IF NOT EXISTS "subcategory" TEXT' },
      { name: 'hasHcpLocator', sql: 'ALTER TABLE "content_pages" ADD COLUMN IF NOT EXISTS "hasHcpLocator" BOOLEAN DEFAULT false' },
      { name: 'signals', sql: 'ALTER TABLE "content_pages" ADD COLUMN IF NOT EXISTS "signals" JSONB' },
      { name: 'crawlError', sql: 'ALTER TABLE "content_pages" ADD COLUMN IF NOT EXISTS "crawlError" TEXT' },
    ];
    
    for (const column of newColumns) {
      try {
        await prisma.$executeRawUnsafe(column.sql);
        results.push(`✓ Added column: ${column.name}`);
        console.log(`Added column: ${column.name}`);
      } catch (e) {
        const error = e as Error;
        if (error.message.includes('already exists')) {
          results.push(`✓ Column already exists: ${column.name}`);
        } else {
          results.push(`✗ Failed to add ${column.name}: ${error.message}`);
          console.error(`Failed to add ${column.name}:`, error);
        }
      }
    }
    
    // Add new columns to page_events table
    const eventColumns = [
      { name: 'summary', sql: 'ALTER TABLE "page_events" ADD COLUMN IF NOT EXISTS "summary" TEXT' },
      { name: 'category', sql: 'ALTER TABLE "page_events" ADD COLUMN IF NOT EXISTS "category" TEXT' },
    ];
    
    for (const column of eventColumns) {
      try {
        await prisma.$executeRawUnsafe(column.sql);
        results.push(`✓ Added column to page_events: ${column.name}`);
        console.log(`Added column to page_events: ${column.name}`);
      } catch (e) {
        const error = e as Error;
        if (error.message.includes('already exists')) {
          results.push(`✓ Column already exists in page_events: ${column.name}`);
        } else {
          results.push(`✗ Failed to add to page_events ${column.name}: ${error.message}`);
          console.error(`Failed to add to page_events ${column.name}:`, error);
        }
      }
    }
    
    // Verify the columns were added
    const tableInfo = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'content_pages'
      AND column_name IN ('summary', 'summaryEn', 'category', 'subcategory', 'hasHcpLocator', 'signals', 'crawlError')
    `;
    
    return NextResponse.json({
      success: true,
      message: 'Migration V2 completed',
      operations: results,
      verifiedColumns: tableInfo,
      note: 'Database schema updated with new columns for enhanced Web Activity features',
    });
  } catch (error) {
    console.error('Migration V2 failed:', error);
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