// API endpoint for trends series data (interest over time)
import { NextRequest, NextResponse } from 'next/server';
import { getGoogleTrends, BRAND_KEYWORDS, MARKET_TO_LOCATION } from '@/lib/services/dataforseo';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const market = searchParams.get('market') || 'UK';
    const window = searchParams.get('window') || '30d';
    const useCache = searchParams.get('cache') !== 'false';
    
    // Validate market
    if (!MARKET_TO_LOCATION[market]) {
      return NextResponse.json(
        { error: 'Invalid market specified' },
        { status: 400 }
      );
    }

    // Check cache first (valid for 1 hour)
    if (useCache) {
      const cached = await prisma.trendsSeries.findMany({
        where: {
          marketCode: market,
          date: {
            gte: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
          },
        },
        orderBy: {
          date: 'desc',
        },
      });

      if (cached.length > 0) {
        // Transform cached data to frontend format
        const series = BRAND_KEYWORDS.map(brand => {
          const brandData = cached.filter(c => c.keyword === brand);
          return {
            brand: brand.charAt(0).toUpperCase() + brand.slice(1),
            points: brandData.map(d => ({
              date: d.date.toISOString().split('T')[0],
              value: Math.round(d.value),
            })),
          };
        });

        return NextResponse.json({
          success: true,
          market,
          window,
          series,
          cached: true,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Fetch fresh data from DataForSEO
    const trendsData = await getGoogleTrends(BRAND_KEYWORDS, market, window);
    
    if (!trendsData) {
      // Return empty data structure on API failure
      return NextResponse.json({
        success: false,
        market,
        window,
        series: [],
        error: 'Failed to fetch trends data',
      });
    }

    // Transform and save to database
    const series = BRAND_KEYWORDS.map(brand => ({
      brand: brand.charAt(0).toUpperCase() + brand.slice(1),
      points: trendsData.interestOverTime.map((item: any) => ({
        date: item.date,
        value: item.values[brand] || 0,
      })),
    }));

    // Save to database for caching (background job)
    if (trendsData.interestOverTime.length > 0) {
      const dataToInsert = [];
      for (const brand of BRAND_KEYWORDS) {
        for (const item of trendsData.interestOverTime) {
          dataToInsert.push({
            marketCode: market,
            keyword: brand,
            date: new Date(item.date),
            value: item.values[brand] || 0,
            dataSource: 'dataforseo',
          });
        }
      }

      // Upsert in background (don't wait)
      prisma.trendsSeries.createMany({
        data: dataToInsert,
        skipDuplicates: true,
      }).catch(console.error);
    }

    return NextResponse.json({
      success: true,
      market,
      window,
      series,
      cached: false,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error in /api/trends/series:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        series: [],
      },
      { status: 500 }
    );
  }
}