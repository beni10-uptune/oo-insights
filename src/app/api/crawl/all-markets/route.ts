import { NextRequest, NextResponse } from 'next/server';
import { TRUTHABOUTWEIGHT_SITES, scrapeUrl } from '@/lib/firecrawl';
import { storeCrawlResult } from '@/lib/services/web-activity';

export async function POST(request: NextRequest) {
  try {
    const { markets } = await request.json();
    
    // Determine which markets to crawl
    const marketsToCrawl = markets || Object.keys(TRUTHABOUTWEIGHT_SITES);
    const results: Record<string, unknown> = {};
    
    for (const market of marketsToCrawl) {
      const url = TRUTHABOUTWEIGHT_SITES[market as keyof typeof TRUTHABOUTWEIGHT_SITES];
      
      if (!url) continue;
      
      console.log(`Crawling ${market}: ${url}`);
      
      try {
        // For now, just crawl the homepage of each market
        // In production, you'd want to crawl more pages
        const crawlResult = await scrapeUrl(url);
        
        if (crawlResult) {
          const page = await storeCrawlResult(crawlResult);
          results[market] = {
            success: true,
            pagesCrawled: 1,
            homepage: {
              id: page.id,
              url: page.url,
              title: page.title,
              wordCount: page.wordCount,
            },
          };
        } else {
          results[market] = {
            success: false,
            error: 'Failed to crawl',
          };
        }
      } catch (error) {
        console.error(`Error crawling ${market}:`, error);
        results[market] = {
          success: false,
          error: String(error),
        };
      }
    }
    
    return NextResponse.json({
      success: true,
      marketsCrawled: Object.keys(results).length,
      results,
    });
  } catch (error) {
    console.error('Crawl all markets error:', error);
    return NextResponse.json(
      { error: 'Crawl failed', details: String(error) },
      { status: 500 }
    );
  }
}

// GET endpoint to check available markets
export async function GET() {
  return NextResponse.json({
    markets: Object.keys(TRUTHABOUTWEIGHT_SITES),
    sites: TRUTHABOUTWEIGHT_SITES,
  });
}