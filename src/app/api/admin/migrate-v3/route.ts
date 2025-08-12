import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Check for admin secret
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    
    if (secret !== 'migrate-publish-date-v3-2024') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('Running Publish Date V3 migration - Adding publishDate columns...');
    
    const results = [];
    
    // Add publishDate column to content_pages table
    const contentPagesColumns = [
      { 
        name: 'publishDate', 
        sql: 'ALTER TABLE "content_pages" ADD COLUMN IF NOT EXISTS "publishDate" TIMESTAMP'
      },
    ];
    
    for (const column of contentPagesColumns) {
      try {
        await prisma.$executeRawUnsafe(column.sql);
        results.push(`✓ Added column to content_pages: ${column.name}`);
        console.log(`Added column to content_pages: ${column.name}`);
      } catch (e) {
        const error = e as Error;
        if (error.message.includes('already exists')) {
          results.push(`✓ Column already exists in content_pages: ${column.name}`);
        } else {
          results.push(`✗ Failed to add to content_pages ${column.name}: ${error.message}`);
          console.error(`Failed to add to content_pages ${column.name}:`, error);
        }
      }
    }
    
    // Add publishDate column to page_events table
    const pageEventsColumns = [
      { 
        name: 'publishDate', 
        sql: 'ALTER TABLE "page_events" ADD COLUMN IF NOT EXISTS "publishDate" TIMESTAMP'
      },
    ];
    
    for (const column of pageEventsColumns) {
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
    
    // Verify the columns were added to content_pages
    const contentPagesInfo = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'content_pages'
      AND column_name = 'publishDate'
    `;
    
    // Verify the columns were added to page_events
    const pageEventsInfo = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'page_events'
      AND column_name = 'publishDate'
    `;
    
    return NextResponse.json({
      success: true,
      message: 'Migration V3 completed - Added publishDate columns',
      operations: results,
      verification: {
        content_pages: contentPagesInfo,
        page_events: pageEventsInfo
      },
      note: 'Database schema updated with publishDate columns for storing article publish dates from sitemaps',
    });
  } catch (error) {
    console.error('Migration V3 failed:', error);
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