import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { MARKET_LOCATIONS } from '@/lib/dataforseo/client';

const prisma = new PrismaClient();

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
      // Fetch top volume queries from database
      const topVolumeQueries = await prisma.$queryRaw`
        SELECT 
          query,
          brand,
          volume_monthly,
          cpc,
          theme,
          growth_pct
        FROM top_volume_queries
        WHERE market = ${market}
          AND timeframe = ${window}
          AND period_end >= ${startDate}
        ORDER BY volume_monthly DESC
        LIMIT 20
      ` as Array<{
        query: string;
        brand: string | null;
        volume_monthly: number;
        cpc: number | null;
        theme: string | null;
        growth_pct: number | null;
      }>;
      
      // Fetch rising queries
      const risingQueries = await prisma.$queryRaw`
        SELECT 
          query,
          brand,
          volume_monthly AS volume,
          growth_pct AS growth,
          theme
        FROM related_queries
        WHERE market = ${market}
          AND timeframe = ${window}
          AND period_end >= ${startDate}
          AND growth_pct > 30
        ORDER BY rising_score DESC
        LIMIT 10
      ` as Array<{
        query: string;
        brand: string | null;
        volume: number;
        growth: number;
        theme: string | null;
      }>;
      
      // Format high volume queries
      const highVolume = topVolumeQueries.map(q => ({
        query: q.query,
        volume: q.volume_monthly,
        change: q.growth_pct ?? 0,
        brand: q.brand ?? 'Unknown',
        theme: q.theme ?? 'general',
      }));
      
      // Format rising queries
      const rising = risingQueries.map(q => ({
        query: q.query,
        volume: q.volume,
        growth: q.growth,
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