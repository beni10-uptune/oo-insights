import { NextRequest, NextResponse } from 'next/server';
import { crawlWebsite } from '@/lib/services/website-crawler';

export async function POST(request: NextRequest) {
  try {
    const { market, maxPages = 100 } = await request.json();
    
    if (!market) {
      return NextResponse.json(
        { error: 'Market is required' },
        { status: 400 }
      );
    }
    
    console.log(`[API] Starting full website crawl for ${market} (max ${maxPages} pages)`);
    
    // Trigger the comprehensive crawl
    const result = await crawlWebsite(market, maxPages);
    
    return NextResponse.json({
      success: result.success,
      market,
      pagesCrawled: result.pagesCrawled,
      errors: result.errors,
      message: `Crawled ${result.pagesCrawled} pages for ${market}`
    });
    
  } catch (error) {
    console.error('Full website crawl error:', error);
    return NextResponse.json(
      { error: 'Crawl failed', details: String(error) },
      { status: 500 }
    );
  }
}

// GET endpoint to check available markets
export async function GET() {
  return NextResponse.json({
    message: 'Use POST with { market: "de", maxPages: 100 } to crawl a website',
    availableMarkets: [
      'de', 'fr', 'it', 'es', 'ca_en', 'ca_fr',
      'ch_de', 'ch_it', 'ch_fr', 'se', 'no',
      'lv', 'ee', 'lt', 'hr', 'be_nl', 'be_fr',
      'bg', 'fi', 'gr', 'hu', 'is', 'ie', 'sk', 'rs'
    ]
  });
}