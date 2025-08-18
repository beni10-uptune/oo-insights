// API endpoint for search volume and rising queries
import { NextRequest, NextResponse } from 'next/server';
import { getKeywordData, getRelatedKeywords, BRAND_KEYWORDS, MARKET_TO_LOCATION, categorizeKeywords } from '@/lib/services/dataforseo';
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

    // Get keyword volume data
    const volumeData = await getKeywordData(BRAND_KEYWORDS, market);
    const relatedData = await getRelatedKeywords(BRAND_KEYWORDS, market);
    
    if (!volumeData && !relatedData) {
      // Return empty structure on API failure
      return NextResponse.json({
        success: false,
        market,
        window,
        rising: [],
        highVolume: [],
        error: 'Failed to fetch volume data',
      });
    }

    // Process rising queries
    const risingQueries = relatedData?.rising || [];
    const rising = risingQueries.slice(0, 10).map((item: any) => ({
      query: item.keyword,
      brand: detectBrand(item.keyword),
      volume: item.search_volume || 0,
      growth: item.trend || 0,
      cpc: item.cpc || 0,
      competition: item.competition || 0,
    }));

    // Process high volume queries
    const highVolumeQueries = relatedData?.highVolume || [];
    const themes = categorizeKeywords(highVolumeQueries.map((q: any) => q.keyword));
    
    const highVolume = highVolumeQueries.slice(0, 20).map((item: any) => ({
      query: item.keyword,
      brand: detectBrand(item.keyword),
      theme: detectTheme(item.keyword, themes),
      volume: item.search_volume || 0,
      change: item.trend || 0,
      cpc: item.cpc || 0,
    }));

    // Save to database for caching
    if (rising.length > 0) {
      const dataToInsert = rising.map((item: any) => ({
        marketCode: market,
        keyword: item.query,
        growthRate: item.growth,
        searchVolume: item.volume,
        createdAt: new Date(),
      }));

      prisma.relatedQueries.createMany({
        data: dataToInsert,
        skipDuplicates: true,
      }).catch(console.error);
    }

    return NextResponse.json({
      success: true,
      market,
      window,
      rising,
      highVolume,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error in /api/trends/volume:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        rising: [],
        highVolume: [],
      },
      { status: 500 }
    );
  }
}

// Helper function to detect brand from keyword
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

// Helper function to detect theme
function detectTheme(keyword: string, themes: Record<string, string[]>): string {
  for (const [theme, keywords] of Object.entries(themes)) {
    if (keywords.includes(keyword)) {
      return theme;
    }
  }
  return 'general';
}