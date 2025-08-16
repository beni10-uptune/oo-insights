import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getDataForSEOClient, MARKET_LOCATIONS, BRAND_KEYWORDS } from '@/lib/dataforseo/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const market = searchParams.get('market') as keyof typeof MARKET_LOCATIONS || 'UK';
    const window = searchParams.get('window') as '7d' | '30d' | '90d' | '12m' || '90d';
    
    if (!MARKET_LOCATIONS[market]) {
      return NextResponse.json(
        { error: 'Invalid market parameter' },
        { status: 400 }
      );
    }
    
    console.log(`Fetching fresh trends data for ${market} - ${window} window`);
    
    // Initialize DataForSEO client
    const client = getDataForSEOClient();
    
    try {
      // Fetch trends data for all brands
      const trendsData = await client.getTrends(market, window, BRAND_KEYWORDS);
      
      console.log(`Received trends data for ${trendsData.length} brands`);
      
      // Clear old data for this market
      await prisma.$executeRaw`
        DELETE FROM trends_series 
        WHERE market = ${market}
      `;
      
      // Store fresh data in database
      let totalPoints = 0;
      for (const brandSeries of trendsData) {
        console.log(`Processing ${brandSeries.brand}: ${brandSeries.points.length} data points`);
        
        for (const point of brandSeries.points) {
          await prisma.$executeRaw`
            INSERT INTO trends_series (market, language, brand, date, interest_index)
            VALUES (
              ${market}, 
              ${MARKET_LOCATIONS[market].language_code}, 
              ${brandSeries.brand}, 
              ${point.date}::date, 
              ${point.value}
            )
            ON CONFLICT (market, brand, date) 
            DO UPDATE SET 
              interest_index = ${point.value},
              updated_at = NOW()
          `;
          totalPoints++;
        }
      }
      
      // Log the job
      await prisma.$executeRaw`
        INSERT INTO jobs_trends (market, language, job_type, status, completed_at)
        VALUES (
          ${market}, 
          ${MARKET_LOCATIONS[market].language_code}, 
          'trends_daily', 
          'success', 
          NOW()
        )
      `;
      
      // Verify the data was stored
      const verification = await prisma.$queryRaw`
        SELECT 
          brand, 
          COUNT(*) as data_points,
          MIN(date) as earliest,
          MAX(date) as latest,
          AVG(interest_index)::integer as avg_interest
        FROM trends_series 
        WHERE market = ${market}
        GROUP BY brand
        ORDER BY brand
      ` as Array<{
        brand: string;
        data_points: bigint;
        earliest: Date;
        latest: Date;
        avg_interest: number;
      }>;
      
      return NextResponse.json({
        success: true,
        message: `Successfully fetched and stored ${totalPoints} data points`,
        market,
        window,
        summary: verification.map(v => ({
          brand: v.brand,
          dataPoints: Number(v.data_points),
          earliest: v.earliest,
          latest: v.latest,
          avgInterest: v.avg_interest
        }))
      });
      
    } catch (apiError) {
      console.error('DataForSEO API error:', apiError);
      
      // Log failed job
      await prisma.$executeRaw`
        INSERT INTO jobs_trends (market, language, job_type, status, error_message, completed_at)
        VALUES (
          ${market}, 
          ${MARKET_LOCATIONS[market].language_code}, 
          'trends_daily', 
          'failed', 
          ${String(apiError)}, 
          NOW()
        )
      `;
      
      return NextResponse.json(
        { 
          error: 'Failed to fetch trends data from DataForSEO',
          details: apiError instanceof Error ? apiError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Fetch trends daily error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}