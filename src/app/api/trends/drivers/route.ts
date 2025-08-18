// API endpoint for theme drivers and query categorization
import { NextRequest, NextResponse } from 'next/server';
import { getRelatedKeywords, BRAND_KEYWORDS, MARKET_TO_LOCATION, categorizeKeywords } from '@/lib/services/dataforseo';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const market = searchParams.get('market') || 'UK';
    const window = searchParams.get('window') || '30d';
    
    // Validate market
    if (!MARKET_TO_LOCATION[market]) {
      return NextResponse.json(
        { error: 'Invalid market specified' },
        { status: 400 }
      );
    }

    // Check cache first
    const cached = await prisma.relatedQueries.findMany({
      where: {
        marketCode: market,
        createdAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000), // 1 hour cache
        },
      },
      orderBy: {
        growthRate: 'desc',
      },
      take: 10,
    });

    if (cached.length > 0) {
      // Also get related queries for each theme
      const queries = await prisma.relatedQueries.findMany({
        where: {
          marketCode: market,
          keyword: {
            in: cached.map(t => t.keyword),
          },
        },
        orderBy: {
          growthRate: 'desc',
        },
        take: 50,
      });

      return NextResponse.json({
        success: true,
        market,
        window,
        themes: [],
        queries: queries.map(q => ({
          query: q.keyword,
          theme: 'general',
          growth: q.growthRate,
          volume: q.searchVolume,
          brand: detectBrand(q.keyword),
        })),
        cached: true,
        timestamp: new Date().toISOString(),
      });
    }

    // Fetch fresh data from DataForSEO
    const relatedData = await getRelatedKeywords(BRAND_KEYWORDS, market);
    
    if (!relatedData) {
      return NextResponse.json({
        success: false,
        market,
        window,
        themes: [],
        queries: [],
        error: 'Failed to fetch driver data',
      });
    }

    // Categorize all keywords into themes
    const allKeywords = [...(relatedData.all || [])];
    const themes = categorizeKeywords(allKeywords.map((k: any) => k.keyword));
    
    // Calculate theme metrics
    const themeMetrics: Record<string, any> = {};
    
    for (const [theme, keywords] of Object.entries(themes)) {
      const themeQueries = allKeywords.filter((k: any) => 
        keywords.includes(k.keyword)
      );
      
      if (themeQueries.length > 0) {
        const totalVolume = themeQueries.reduce((sum: number, q: any) => 
          sum + (q.search_volume || 0), 0
        );
        const avgGrowth = themeQueries.reduce((sum: number, q: any) => 
          sum + (q.trend || 0), 0
        ) / themeQueries.length;
        
        themeMetrics[theme] = {
          theme,
          rising_score: avgGrowth,
          volume_sum: totalVolume,
          query_count: themeQueries.length,
          queries: themeQueries.slice(0, 5),
        };
      }
    }

    // Sort themes by rising score
    const sortedThemes = Object.values(themeMetrics)
      .sort((a, b) => b.rising_score - a.rising_score)
      .slice(0, 10);

    // Prepare response data
    const themesResponse = sortedThemes.map(t => ({
      theme: t.theme,
      rising_score: t.rising_score,
      volume_sum: t.volume_sum,
      query_count: t.query_count,
    }));

    const queriesResponse = sortedThemes.flatMap(t => 
      t.queries.map((q: any) => ({
        query: q.keyword,
        theme: t.theme,
        growth: q.trend || 0,
        volume: q.search_volume || 0,
        brand: detectBrand(q.keyword),
      }))
    );

    // Save to database for caching
    if (sortedThemes.length > 0) {
      const themeData = sortedThemes.map(t => ({
        market,
        language: MARKET_TO_LOCATION[market].language_code,
        timeframe: window,
        theme: t.theme,
        rising_score: t.rising_score,
        volume_sum: t.volume_sum,
        query_count: t.query_count,
        period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        period_end: new Date(),
      }));

      // Skip saving themes for now since we don't have that table
    }

    return NextResponse.json({
      success: true,
      market,
      window,
      themes: themesResponse,
      queries: queriesResponse,
      cached: false,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error in /api/trends/drivers:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        themes: [],
        queries: [],
      },
      { status: 500 }
    );
  }
}

// Helper function to detect brand
function detectBrand(keyword: string): string {
  const kw = keyword.toLowerCase();
  if (kw.includes('wegovy')) return 'Wegovy';
  if (kw.includes('ozempic')) return 'Ozempic';
  if (kw.includes('mounjaro')) return 'Mounjaro';
  if (kw.includes('saxenda')) return 'Saxenda';
  if (kw.includes('rybelsus')) return 'Rybelsus';
  if (kw.includes('zepbound')) return 'Zepbound';
  return 'General';
}