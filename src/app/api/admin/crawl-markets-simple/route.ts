import { NextRequest, NextResponse } from 'next/server';
import { crawlWebsite, fetchSitemapUrls } from '@/lib/services/website-crawler';
import { MARKET_CONFIG } from '@/lib/firecrawl';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { 
      marketCodes,  // array of market codes to crawl
      maxPagesPerMarket = 300  // Firecrawl can handle 300+ pages easily
    } = await request.json();
    
    if (!marketCodes || !Array.isArray(marketCodes) || marketCodes.length === 0) {
      return NextResponse.json(
        { error: 'marketCodes array is required' },
        { status: 400 }
      );
    }
    
    const results: Record<string, any> = {};
    const startTime = Date.now();
    
    console.log(`[CRAWL-SIMPLE] Starting crawl for ${marketCodes.length} markets`);
    console.log(`[CRAWL-SIMPLE] Max pages per market: ${maxPagesPerMarket}`);
    
    // Process markets sequentially to avoid rate limiting
    for (const marketCode of marketCodes) {
      if (!MARKET_CONFIG[marketCode]) {
        results[marketCode] = { 
          success: false, 
          error: `Invalid market code: ${marketCode}` 
        };
        continue;
      }
      
      console.log(`[CRAWL-SIMPLE] Processing market: ${marketCode}`);
      
      try {
        // First get sitemap to understand full scope
        const sitemapData = await fetchSitemapUrls(marketCode);
        console.log(`[CRAWL-SIMPLE] ${marketCode}: Found ${sitemapData.urls.length} URLs in sitemap`);
        
        // Perform the crawl
        const crawlResult = await crawlWebsite(
          marketCode,
          Math.min(maxPagesPerMarket, sitemapData.urls.length)
        );
        
        // Get actual stored pages count
        const storedCount = await prisma.contentPage.count({
          where: { market: marketCode }
        });
        
        results[marketCode] = {
          success: crawlResult.success,
          config: {
            url: MARKET_CONFIG[marketCode].url,
            language: MARKET_CONFIG[marketCode].language,
            timezone: MARKET_CONFIG[marketCode].timezone,
          },
          crawl: {
            pagesCrawled: crawlResult.pagesCrawled,
            pagesStored: storedCount,
            sitemapUrls: sitemapData.urls.length,
            percentCrawled: Math.round((crawlResult.pagesCrawled / sitemapData.urls.length) * 100),
            errors: crawlResult.errors.slice(0, 3) // First 3 errors only
          }
        };
        
        console.log(`[CRAWL-SIMPLE] ${marketCode}: Crawled ${crawlResult.pagesCrawled}/${sitemapData.urls.length} pages (${results[marketCode].crawl.percentCrawled}%)`);
        
        // Small delay between markets to be respectful to Firecrawl API
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
        
      } catch (error) {
        console.error(`[CRAWL-SIMPLE] Error crawling ${marketCode}:`, error);
        results[marketCode] = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
    
    const executionTime = Math.round((Date.now() - startTime) / 1000);
    
    // Calculate summary statistics
    const summary = {
      marketsRequested: marketCodes.length,
      marketsProcessed: Object.keys(results).length,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      successfulMarkets: Object.values(results).filter((r: any) => r.success).length,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      totalPagesCrawled: Object.values(results).reduce((sum: number, r: any) => 
        sum + (r.crawl?.pagesCrawled || 0), 0),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      totalPagesStored: Object.values(results).reduce((sum: number, r: any) => 
        sum + (r.crawl?.pagesStored || 0), 0),
      executionTimeSeconds: executionTime,
      averageTimePerMarket: Math.round(executionTime / marketCodes.length)
    };
    
    console.log('[CRAWL-SIMPLE] Crawl completed:', summary);
    
    return NextResponse.json({
      success: true,
      summary,
      markets: results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[CRAWL-SIMPLE] Fatal error:', error);
    return NextResponse.json(
      { 
        error: 'Crawl failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check current crawl statistics
export async function GET() {
  try {
    // Get all market codes from config
    const allMarkets = Object.keys(MARKET_CONFIG);
    
    // Get page counts per market
    const stats = await Promise.all(allMarkets.map(async (marketCode) => {
      const pageCount = await prisma.contentPage.count({
        where: { market: marketCode }
      });
      
      // Get a sample page to show last crawl time
      const lastPage = await prisma.contentPage.findFirst({
        where: { market: marketCode },
        orderBy: { lastCrawledAt: 'desc' },
        select: { lastCrawledAt: true }
      });
      
      return {
        code: marketCode,
        url: MARKET_CONFIG[marketCode].url,
        language: MARKET_CONFIG[marketCode].language,
        pagesStored: pageCount,
        lastCrawl: lastPage?.lastCrawledAt
      };
    }));
    
    // Sort by pages stored (descending)
    stats.sort((a, b) => b.pagesStored - a.pagesStored);
    
    const totalPages = stats.reduce((sum, s) => sum + s.pagesStored, 0);
    const crawledMarkets = stats.filter(s => s.pagesStored > 0);
    
    return NextResponse.json({
      success: true,
      summary: {
        totalMarkets: allMarkets.length,
        crawledMarkets: crawledMarkets.length,
        uncrawledMarkets: allMarkets.length - crawledMarkets.length,
        totalPagesStored: totalPages
      },
      crawled: crawledMarkets,
      uncrawled: stats.filter(s => s.pagesStored === 0).map(s => ({
        code: s.code,
        url: s.url
      }))
    });
    
  } catch (error) {
    console.error('[CRAWL-SIMPLE] Status check error:', error);
    return NextResponse.json(
      { error: 'Failed to get crawl status' },
      { status: 500 }
    );
  }
}