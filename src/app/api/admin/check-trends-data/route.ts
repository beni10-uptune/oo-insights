import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    
    if (secret !== 'check-trends-2024') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check trends_series data
    const trendsCounts = await prisma.$queryRaw`
      SELECT 
        market,
        brand,
        COUNT(*) as count,
        MIN(date) as first_date,
        MAX(date) as last_date
      FROM trends_series
      GROUP BY market, brand
      ORDER BY market, brand
    ` as Array<{market: string; brand: string; count: bigint; first_date: Date; last_date: Date}>;
    
    // Check top_volume_queries
    const volumeCheck = await prisma.$queryRaw`
      SELECT 
        market,
        COUNT(*) as total,
        COUNT(CASE WHEN volume_prev IS NOT NULL THEN 1 END) as with_prev_volume,
        COUNT(CASE WHEN volume_delta_pct IS NOT NULL THEN 1 END) as with_delta_pct
      FROM top_volume_queries
      GROUP BY market
      ORDER BY market
    ` as Array<{market: string; total: bigint; with_prev_volume: bigint; with_delta_pct: bigint}>;
    
    // Check related_queries
    const relatedCheck = await prisma.$queryRaw`
      SELECT 
        market,
        brand,
        COUNT(*) as count,
        AVG(growth_pct) as avg_growth
      FROM related_queries
      GROUP BY market, brand
      ORDER BY market, brand
    ` as Array<{market: string; brand: string; count: bigint; avg_growth: number}>;
    
    return NextResponse.json({
      success: true,
      trends_series: trendsCounts.map(t => ({
        ...t,
        count: Number(t.count)
      })),
      top_volume_queries: volumeCheck.map(v => ({
        market: v.market,
        total: Number(v.total),
        with_prev_volume: Number(v.with_prev_volume),
        with_delta_pct: Number(v.with_delta_pct)
      })),
      related_queries: relatedCheck.map(r => ({
        ...r,
        count: Number(r.count),
        avg_growth: r.avg_growth ? Math.round(r.avg_growth) : 0
      }))
    });
    
  } catch (error) {
    console.error('Check trends data error:', error);
    return NextResponse.json({
      error: 'Failed to check data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}