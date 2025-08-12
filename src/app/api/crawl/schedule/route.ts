import { NextRequest, NextResponse } from 'next/server';
import { TRUTHABOUTWEIGHT_SITES, scrapeUrl } from '@/lib/firecrawl';
import { storeCrawlResult } from '@/lib/services/web-activity';

// This endpoint can be called by Vercel Cron or any external scheduler
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret if configured
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Starting scheduled crawl of core markets...');
    
    const results: Record<string, unknown> = {};
    // Focus on core markets
    const coreMarkets = ['uk', 'it', 'es', 'fr', 'de', 'pl', 'ca', 'global'];
    
    // Crawl each market's homepage
    for (const market of coreMarkets) {
      try {
        const url = TRUTHABOUTWEIGHT_SITES[market as keyof typeof TRUTHABOUTWEIGHT_SITES];
        if (!url) continue;
        
        console.log(`Crawling ${market}: ${url}`);
        
        const crawlResult = await scrapeUrl(url);
        
        if (crawlResult) {
          const page = await storeCrawlResult(crawlResult);
          results[market] = {
            success: true,
            pageId: page.id,
            url: page.url,
            title: page.title,
            crawledAt: page.lastCrawledAt
          };
        } else {
          results[market] = {
            success: false,
            error: 'Failed to crawl URL'
          };
        }
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Failed to crawl ${market}:`, error);
        results[market] = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
    
    const successCount = Object.values(results).filter(r => (r as any).success).length;
    
    return NextResponse.json({
      success: true,
      message: `Crawled ${successCount}/${coreMarkets.length} core markets successfully`,
      timestamp: new Date().toISOString(),
      results
    });
  } catch (error) {
    console.error('Scheduled crawl failed:', error);
    return NextResponse.json(
      { 
        error: 'Scheduled crawl failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}