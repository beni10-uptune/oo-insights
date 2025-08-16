import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getDataForSEOClient, MARKET_LOCATIONS } from '@/lib/dataforseo/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const market = searchParams.get('market') as keyof typeof MARKET_LOCATIONS;
    const lang = searchParams.get('lang') || 'en';
    const window = searchParams.get('window') || '30d';
    const brand = searchParams.get('brand');
    const theme = searchParams.get('theme');
    
    if (!market || !MARKET_LOCATIONS[market]) {
      return NextResponse.json(
        { error: 'Invalid market parameter' },
        { status: 400 }
      );
    }
    
    // Get period dates
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
      default:
        startDate.setDate(startDate.getDate() - 30);
    }
    
    // Check for cached related queries
    let queryStr = `
      SELECT 
        query,
        brand,
        growth_pct,
        rising_score,
        volume_monthly,
        cpc,
        theme,
        theme_confidence
      FROM related_queries
      WHERE market = $1
        AND timeframe = $2
        AND period_end >= $3
    `;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any[] = [market, window, startDate];
    
    if (brand) {
      params.push(brand);
      queryStr += ` AND brand = $${params.length}`;
    }
    if (theme) {
      params.push(theme);
      queryStr += ` AND theme = $${params.length}`;
    }
    queryStr += ' ORDER BY rising_score DESC LIMIT 100';
    
    const cachedQueries = await prisma.$queryRawUnsafe(queryStr, ...params) as Array<{
      query: string;
      brand: string | null;
      growth_pct: number;
      rising_score: number;
      volume_monthly: number;
      cpc: number | null;
      theme: string | null;
      theme_confidence: number | null;
    }>;
    
    if (cachedQueries.length === 0) {
      // Fetch fresh data from DataForSEO
      try {
        const client = getDataForSEOClient();
        
        // Fetch for each brand
        const brands = brand ? [brand] : ['Wegovy', 'Ozempic', 'Mounjaro'];
        const allQueries = [];
        
        for (const b of brands) {
          const queries = await client.getRelatedQueries(
            market,
            b,
            window as '7d' | '30d' | '90d'
          );
          
          // Store in database
          for (const q of queries) {
            await prisma.$executeRaw`
              INSERT INTO related_queries (
                market, language, brand, query, timeframe,
                growth_pct, rising_score, volume_monthly, cpc,
                theme, theme_confidence, period_start, period_end
              ) VALUES (
                ${market}, ${lang}, ${b}, ${q.query}, ${window},
                ${q.growth_pct}, ${q.rising_score}, ${q.volume_monthly}, ${q.cpc},
                ${q.theme}, ${q.theme_confidence}, ${startDate}, ${endDate}
              )
            `;
            
            allQueries.push({ ...q, brand: b });
          }
        }
        
        // Calculate theme rollups
        const themes = await calculateThemeRollups(market, lang, window, allQueries);
        
        return NextResponse.json({
          success: true,
          themes,
          queries: allQueries.slice(0, 50), // Top 50 rising queries
          market,
          window,
          cached: false,
        });
      } catch (apiError) {
        console.error('DataForSEO API error:', apiError);
        // Continue with any cached data
      }
    }
    
    // Calculate theme rollups from cached data
    const themeRollupsRaw = await prisma.$queryRawUnsafe(`
      SELECT 
        theme,
        SUM(rising_score)::integer as rising_score,
        SUM(volume_monthly)::integer as volume_sum,
        COUNT(*)::integer as query_count
      FROM related_queries
      WHERE market = $1
        AND timeframe = $2
        AND period_end >= $3
        AND theme IS NOT NULL
      GROUP BY theme
      ORDER BY SUM(rising_score) DESC
      LIMIT 10
    `, market, window, startDate) as Array<{
      theme: string;
      rising_score: number;
      volume_sum: number;
      query_count: number;
    }>;
    
    // No need to convert BigInt anymore
    const themeRollups = themeRollupsRaw;
    
    // Get top queries for each theme
    const themes = await Promise.all(
      themeRollups.map(async (t) => {
        const topQueries = cachedQueries
          .filter(q => q.theme === t.theme)
          .slice(0, 5)
          .map(q => ({
            q: q.query,
            growth_pct: q.growth_pct,
            sv: q.volume_monthly,
          }));
        
        return {
          theme: t.theme,
          rising_score: t.rising_score,
          volume_sum: t.volume_sum,
          query_count: t.query_count,
          queries: topQueries,
        };
      })
    );
    
    return NextResponse.json({
      success: true,
      themes,
      market,
      window,
      cached: true,
    });
  } catch (error) {
    console.error('Trends drivers error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch drivers data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

async function calculateThemeRollups(
  market: string,
  language: string,
  timeframe: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  queries: any[]
) {
  const themeMap = new Map<string, {
    rising_score: number;
    volume_sum: number;
    query_count: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queries: any[];
  }>();
  
  for (const q of queries) {
    if (!q.theme) continue;
    
    if (!themeMap.has(q.theme)) {
      themeMap.set(q.theme, {
        rising_score: 0,
        volume_sum: 0,
        query_count: 0,
        queries: [],
      });
    }
    
    const theme = themeMap.get(q.theme)!;
    theme.rising_score += q.rising_score;
    theme.volume_sum += q.volume_monthly;
    theme.query_count += 1;
    theme.queries.push({
      q: q.query,
      growth_pct: q.growth_pct,
      sv: q.volume_monthly,
    });
  }
  
  // Sort themes by rising score and limit queries
  return Array.from(themeMap.entries())
    .map(([theme, data]) => ({
      theme,
      rising_score: data.rising_score,
      volume_sum: data.volume_sum,
      query_count: data.query_count,
      queries: data.queries
        .sort((a, b) => b.sv - a.sv)
        .slice(0, 5),
    }))
    .sort((a, b) => b.rising_score - a.rising_score)
    .slice(0, 10);
}