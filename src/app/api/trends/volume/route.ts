import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { MARKET_LOCATIONS } from '@/lib/dataforseo/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const market = searchParams.get('market') as keyof typeof MARKET_LOCATIONS;
    const window = searchParams.get('window') || '30d';
    
    if (!market || !MARKET_LOCATIONS[market]) {
      return NextResponse.json(
        { error: 'Invalid market parameter' },
        { status: 400 }
      );
    }
    
    // Get period dates
    const startDate = new Date();
    switch (window) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }
    
    try {
      // Fetch top volume queries from database with proper month-over-month calculation
      const topVolumeQueries = await prisma.$queryRawUnsafe(`
        SELECT 
          query,
          brand_hint as brand,
          volume_monthly,
          cpc,
          theme,
          CASE 
            WHEN volume_prev IS NOT NULL AND volume_prev > 0 THEN 
              ROUND(((volume_monthly - volume_prev)::NUMERIC / volume_prev) * 100)
            ELSE 
              COALESCE(volume_delta_pct, 0)
          END as growth_pct
        FROM top_volume_queries
        WHERE market = $1
        ORDER BY volume_monthly DESC
        LIMIT 20
      `, market) as Array<{
        query: string;
        brand: string | null;
        volume_monthly: number;
        cpc: number | null;
        theme: string | null;
        growth_pct: number;
      }>;
      
      // Fetch rising queries
      const risingQueries = await prisma.$queryRawUnsafe(`
        SELECT 
          query,
          brand,
          volume_monthly AS volume,
          growth_pct AS growth,
          theme
        FROM related_queries
        WHERE market = $1
          AND timeframe = $2
          AND period_end >= $3
          AND growth_pct > 30
        ORDER BY rising_score DESC
        LIMIT 10
      `, market, window, startDate) as Array<{
        query: string;
        brand: string | null;
        volume: number;
        growth: number;
        theme: string | null;
      }>;
      
      // Format high volume queries with rounded change
      const highVolume = topVolumeQueries.map(q => ({
        query: q.query,
        volume: q.volume_monthly,
        change: Math.round(q.growth_pct ?? 0),
        brand: q.brand ?? 'Unknown',
        theme: q.theme ?? 'general',
      }));
      
      // Format rising queries with rounded growth
      const rising = risingQueries.map(q => ({
        query: q.query,
        volume: q.volume,
        growth: Math.round(q.growth),
        brand: q.brand ?? 'Unknown',
        theme: q.theme ?? 'general',
      }));
      
      return NextResponse.json({
        success: true,
        rising,
        highVolume,
        market,
        window,
      });
    } catch (dbError) {
      console.error('Database error fetching volume data:', dbError);
      // Return empty data on database error
      return NextResponse.json({
        success: true,
        rising: [],
        highVolume: [],
        market,
        window,
        error: 'No data available',
      });
    }
  } catch (error) {
    console.error('Trends volume error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch volume data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}