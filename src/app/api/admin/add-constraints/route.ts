import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Check for admin secret
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    
    if (secret !== 'add-constraints-2024') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('Adding unique constraints...');
    
    const operations = [];
    
    // Add unique constraint to trends_series
    try {
      await prisma.$executeRaw`
        ALTER TABLE trends_series 
        ADD CONSTRAINT trends_series_unique_key 
        UNIQUE (market, brand, date)
      `;
      operations.push('✓ Added unique constraint to trends_series');
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        operations.push('⚠ trends_series constraint already exists');
      } else {
        console.error('Error adding trends_series constraint:', error);
        operations.push('✗ Failed to add trends_series constraint');
      }
    }
    
    // Add unique constraint to related_queries
    try {
      await prisma.$executeRaw`
        ALTER TABLE related_queries 
        ADD CONSTRAINT related_queries_unique_key 
        UNIQUE (market, brand, query, timeframe, period_end)
      `;
      operations.push('✓ Added unique constraint to related_queries');
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        operations.push('⚠ related_queries constraint already exists');
      } else {
        console.error('Error adding related_queries constraint:', error);
        operations.push('✗ Failed to add related_queries constraint');
      }
    }
    
    // Add unique constraint to top_volume_queries
    try {
      await prisma.$executeRaw`
        ALTER TABLE top_volume_queries 
        ADD CONSTRAINT top_volume_queries_unique_key 
        UNIQUE (market, brand, query, timeframe, period_end)
      `;
      operations.push('✓ Added unique constraint to top_volume_queries');
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        operations.push('⚠ top_volume_queries constraint already exists');
      } else {
        console.error('Error adding top_volume_queries constraint:', error);
        operations.push('✗ Failed to add top_volume_queries constraint');
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Constraints added',
      operations,
    });
  } catch (error) {
    console.error('Constraint error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to add constraints',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}