import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { MARKET_LOCATIONS } from '@/lib/dataforseo/client';

const prisma = new PrismaClient();

// Generate realistic daily trends data
function generateTrendsData(brand: string, days: number): Array<{ date: Date; value: number }> {
  const data = [];
  const today = new Date();
  const baseValue = brand === 'Wegovy' ? 65 : brand === 'Ozempic' ? 45 : 85;
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Add some realistic variation
    const dayOfWeek = date.getDay();
    const weekendFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.85 : 1;
    const randomVariation = (Math.random() - 0.5) * 20;
    const trendFactor = brand === 'Mounjaro' ? 1 + (days - i) * 0.002 : 1; // Mounjaro trending up
    
    let value = Math.round(baseValue * weekendFactor * trendFactor + randomVariation);
    value = Math.max(10, Math.min(100, value)); // Keep between 10 and 100
    
    data.push({ date, value });
  }
  
  return data;
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const market = searchParams.get('market') as keyof typeof MARKET_LOCATIONS || 'UK';
    const days = parseInt(searchParams.get('days') || '90');
    
    if (!MARKET_LOCATIONS[market]) {
      return NextResponse.json(
        { error: 'Invalid market parameter' },
        { status: 400 }
      );
    }
    
    console.log(`Seeding ${days} days of trends data for ${market}`);
    
    // Clear existing data for this market
    await prisma.$executeRaw`
      DELETE FROM trends_series 
      WHERE market = ${market}
    `;
    
    const brands = ['Wegovy', 'Ozempic', 'Mounjaro'];
    let totalPoints = 0;
    
    for (const brand of brands) {
      const trendData = generateTrendsData(brand, days);
      
      for (const point of trendData) {
        await prisma.$executeRaw`
          INSERT INTO trends_series (market, language, brand, date, interest_index)
          VALUES (
            ${market}, 
            ${MARKET_LOCATIONS[market].language_code}, 
            ${brand}, 
            ${point.date.toISOString().split('T')[0]}::date, 
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
      message: `Successfully seeded ${totalPoints} data points`,
      market,
      days,
      summary: verification.map(v => ({
        brand: v.brand,
        dataPoints: Number(v.data_points),
        earliest: v.earliest,
        latest: v.latest,
        avgInterest: v.avg_interest
      }))
    });
    
  } catch (error) {
    console.error('Seed trends daily error:', error);
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