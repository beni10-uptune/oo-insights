import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getDataForSEOClient, MARKET_LOCATIONS } from '@/lib/dataforseo/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const market = searchParams.get('market') as keyof typeof MARKET_LOCATIONS;
    const lang = searchParams.get('lang') || 'en';
    const window = searchParams.get('window') || '90d';
    const useCache = searchParams.get('cache') !== 'false';
    
    if (!market || !MARKET_LOCATIONS[market]) {
      return NextResponse.json(
        { error: 'Invalid market parameter' },
        { status: 400 }
      );
    }
    
    // Calculate date range
    const endDate = new Date();
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
      case '12m':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 90);
    }
    
    // Check cache first (data within last 15 minutes)
    if (useCache) {
      const cacheTime = new Date();
      cacheTime.setMinutes(cacheTime.getMinutes() - 15);
      
      const cachedData = await prisma.$queryRaw`
        SELECT brand, date, interest_index
        FROM trends_series
        WHERE market = ${market}
          AND date >= ${startDate}
          AND date <= ${endDate}
          AND updated_at >= ${cacheTime}
        ORDER BY brand, date
      ` as Array<{ brand: string; date: Date; interest_index: number }>;
      
      if (cachedData.length > 0) {
        // Format cached data
        const series = formatSeriesData(cachedData);
        return NextResponse.json({
          success: true,
          series,
          cached: true,
          market,
          window,
        });
      }
    }
    
    // Fetch fresh data from DataForSEO
    try {
      const client = getDataForSEOClient();
      const freshData = await client.getTrends(
        market,
        window as '7d' | '30d' | '90d' | '12m'
      );
      
      // Store in database
      for (const brandSeries of freshData) {
        for (const point of brandSeries.points) {
          await prisma.$executeRaw`
            INSERT INTO trends_series (market, language, brand, date, interest_index, updated_at)
            VALUES (${market}, ${lang}, ${brandSeries.brand}, ${new Date(point.date)}::date, ${point.value}, NOW())
            ON CONFLICT (market, brand, date) 
            DO UPDATE SET 
              interest_index = ${point.value},
              updated_at = NOW()
          `;
        }
      }
      
      // Log the job
      await prisma.$executeRaw`
        INSERT INTO jobs_trends (market, language, job_type, status, completed_at)
        VALUES (${market}, ${lang}, 'trends', 'success', NOW())
      `;
      
      return NextResponse.json({
        success: true,
        series: freshData,
        cached: false,
        market,
        window,
      });
    } catch (apiError) {
      console.error('DataForSEO API error:', apiError);
      
      // Log failed job
      await prisma.$executeRaw`
        INSERT INTO jobs_trends (market, language, job_type, status, error_message, completed_at)
        VALUES (${market}, ${lang}, 'trends', 'failed', ${String(apiError)}, NOW())
      `;
      
      // Return any cached data we have
      const fallbackData = await prisma.$queryRaw`
        SELECT brand, date, interest_index
        FROM trends_series
        WHERE market = ${market}
          AND date >= ${startDate}
          AND date <= ${endDate}
        ORDER BY brand, date
      ` as Array<{ brand: string; date: Date; interest_index: number }>;
      
      if (fallbackData.length > 0) {
        const series = formatSeriesData(fallbackData);
        return NextResponse.json({
          success: true,
          series,
          cached: true,
          stale: true,
          market,
          window,
          error: 'Using cached data due to API error',
        });
      }
      
      throw apiError;
    }
  } catch (error) {
    console.error('Trends series error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch trends data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Helper to format series data
function formatSeriesData(data: Array<{ brand: string; date: Date; interest_index: number }>) {
  const brandMap = new Map<string, Array<{ date: string; value: number }>>();
  
  for (const row of data) {
    if (!brandMap.has(row.brand)) {
      brandMap.set(row.brand, []);
    }
    brandMap.get(row.brand)!.push({
      date: row.date.toISOString().split('T')[0],
      value: row.interest_index,
    });
  }
  
  return Array.from(brandMap.entries()).map(([brand, points]) => ({
    brand,
    points: points.sort((a, b) => a.date.localeCompare(b.date)),
  }));
}