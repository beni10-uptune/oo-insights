import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

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
    
    // Read the migration SQL file
    const migrationPath = path.join(process.cwd(), 'prisma', 'migrations', 'add_web_activity_tables.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf-8');
    
    // Execute the migration
    await prisma.$executeRawUnsafe(migrationSQL);
    
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