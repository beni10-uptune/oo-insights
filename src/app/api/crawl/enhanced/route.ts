import { NextRequest, NextResponse } from 'next/server';
import { crawlMarket, crawlAllEucanMarkets } from '@/lib/services/enhanced-crawl';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { markets, all, summarize = true, classify = true } = body;
    
    console.log('Enhanced crawl request:', { markets, all, summarize, classify });
    
    let results;
    
    if (all) {
      // Crawl all EUCAN markets
      console.log('Crawling all EUCAN markets...');
      results = await crawlAllEucanMarkets({
        summarize,
        classify,
        limit: 20, // Limit per market to keep it manageable
      });
    } else if (markets && Array.isArray(markets)) {
      // Crawl specific markets
      results = {};
      for (const market of markets) {
        console.log(`Crawling market: ${market}`);
        const marketResult = await crawlMarket({
          market,
          summarize,
          classify,
          limit: 30,
        });
        results[market] = marketResult;
      }
    } else {
      return NextResponse.json(
        { error: 'Please specify markets array or set all=true' },
        { status: 400 }
      );
    }
    
    // Calculate summary statistics
    const stats = {
      totalMarkets: Object.keys(results).length,
      totalPagesFound: Object.values(results).reduce((sum, r) => sum + r.pagesFound, 0),
      totalPagesProcessed: Object.values(results).reduce((sum, r) => sum + r.pagesProcessed, 0),
      marketsWithErrors: Object.values(results).filter(r => r.errors.length > 0).length,
    };
    
    return NextResponse.json({
      success: true,
      stats,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Enhanced crawl error:', error);
    return NextResponse.json(
      { 
        error: 'Enhanced crawl failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}