import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Check for admin secret
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    
    if (secret !== 'fix-trends-2024') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('Fixing trends schema...');
    
    const operations = [];
    
    // Add missing column to top_volume_queries if it doesn't exist
    try {
      await prisma.$executeRaw`
        ALTER TABLE top_volume_queries 
        ADD COLUMN IF NOT EXISTS growth_pct NUMERIC(10,2)
      `;
      operations.push('✓ Added growth_pct column to top_volume_queries');
    } catch (error) {
      console.error('Column might already exist:', error);
      operations.push('⚠ growth_pct column already exists or error');
    }
    
    // Add missing theme column if it doesn't exist
    try {
      await prisma.$executeRaw`
        ALTER TABLE top_volume_queries 
        ADD COLUMN IF NOT EXISTS theme TEXT
      `;
      operations.push('✓ Added theme column to top_volume_queries');
    } catch (error) {
      console.error('Theme column might already exist:', error);
      operations.push('⚠ theme column already exists or error');
    }
    
    return NextResponse.json({
      success: true,
      message: 'Schema fixes applied',
      operations,
    });
  } catch (error) {
    console.error('Schema fix error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fix schema',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}