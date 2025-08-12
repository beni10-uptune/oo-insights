import { NextRequest, NextResponse } from 'next/server';
import { TRUTHABOUTWEIGHT_SITES, scrapeUrlWithSitemapData } from '@/lib/firecrawl';
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
      
      console.log(`[CRAWL] Starting crawl for ${market}: ${url}`);
      
      try {
        // Use enhanced crawl with sitemap data to get publish dates
        const crawlResult = await scrapeUrlWithSitemapData(url, market);
        
        console.log(`[CRAWL] Result for ${market}:`, {
          hasResult: !!crawlResult,
          hasContent: !!crawlResult?.content,
          contentLength: crawlResult?.content?.length || 0,
          hasPublishDate: !!crawlResult?.publishDate,
        });
        
        if (crawlResult && crawlResult.content) {
          console.log(`[CRAWL] Storing result for ${market}...`);
          const page = await storeCrawlResult(crawlResult);
          console.log(`[CRAWL] Stored with ID: ${page.id}`);
          
          results[market] = {
            success: true,
            pagesCrawled: 1,
            homepage: {
              id: page.id,
              url: page.url,
              title: page.title,
              wordCount: page.wordCount,
              // @ts-expect-error - publishDate might not exist yet
              publishDate: page.publishDate,
            },
          };
        } else {
          console.log(`[CRAWL] No content received for ${market}`);
          results[market] = {
            success: false,
            error: 'No content received from Firecrawl',
            debug: {
              hasResult: !!crawlResult,
              hasContent: !!crawlResult?.content,
              resultKeys: crawlResult ? Object.keys(crawlResult) : [],
            },
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