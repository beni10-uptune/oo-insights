import { NextRequest, NextResponse } from 'next/server';
import { crawlWebsite, fetchSitemapUrls } from '@/lib/services/website-crawler';
import { MARKET_CONFIG } from '@/lib/firecrawl';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { 
      marketCodes,  // optional array of market codes to crawl
      maxPagesPerMarket = 500,  // Firecrawl can handle 500+ pages
      onlyCoreMarkets = false,
      testMode = false  // if true, only crawl 5 pages per market
    } = await request.json();
    
    // Get markets to crawl
    let marketsToProcess: string[] = [];
    
    if (marketCodes && Array.isArray(marketCodes)) {
      marketsToProcess = marketCodes;
    } else if (onlyCoreMarkets) {
      // Only process core EUCAN markets
      marketsToProcess = ['de', 'fr', 'it', 'es', 'ca_en', 'ca_fr', 'uk', 'pl'];
    } else {
      // Process all markets
      marketsToProcess = Object.keys(MARKET_CONFIG);
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results: Record<string, any> = {};
    const startTime = Date.now();
    
    console.log(`[CRAWL-ALL] Starting crawl for ${marketsToProcess.length} markets`);
    console.log(`[CRAWL-ALL] Max pages per market: ${testMode ? 5 : maxPagesPerMarket}`);
    
    // Process markets sequentially to avoid rate limiting
    for (const marketCode of marketsToProcess) {
      console.log(`[CRAWL-ALL] Processing market: ${marketCode}`);
      
      // Record job start (skip if table doesn't exist)
      let job: any = null;
      try {
        job = await prisma.marketDataJob.create({
          data: {
            marketCode,
            jobType: 'crawl',
            status: 'running',
            startedAt: new Date(),
            metadata: {
              maxPages: testMode ? 5 : maxPagesPerMarket,
              testMode
            }
          }
        });
      } catch (e) {
        console.log(`[CRAWL-ALL] MarketDataJob table not available, skipping job tracking`);
      }
      
      try {
        // First get sitemap to understand full scope
        const sitemapData = await fetchSitemapUrls(marketCode);
        console.log(`[CRAWL-ALL] ${marketCode}: Found ${sitemapData.urls.length} URLs in sitemap`);
        
        // Perform the crawl
        const crawlResult = await crawlWebsite(
          marketCode,
          testMode ? 5 : Math.min(maxPagesPerMarket, sitemapData.urls.length)
        );
        
        // Update job with results (if job tracking is available)
        if (job) {
          try {
            await prisma.marketDataJob.update({
              where: { id: job.id },
              data: {
                status: 'completed',
                completedAt: new Date(),
                itemsProcessed: crawlResult.pagesCrawled,
                metadata: {
                  maxPages: testMode ? 5 : maxPagesPerMarket,
                  testMode,
                  sitemapUrls: sitemapData.urls.length,
                  errors: crawlResult.errors
                }
              }
            });
          } catch (e) {
            // Table doesn't exist, skip
          }
        }
        
        results[marketCode] = {
          success: crawlResult.success,
          pagesCrawled: crawlResult.pagesCrawled,
          sitemapUrls: sitemapData.urls.length,
          errors: crawlResult.errors.slice(0, 5), // First 5 errors only
          percentCrawled: Math.round((crawlResult.pagesCrawled / sitemapData.urls.length) * 100)
        };
        
        // Get actual stored pages count
        const storedCount = await prisma.contentPage.count({
          where: { market: marketCode }
        });
        results[marketCode].storedPages = storedCount;
        
        console.log(`[CRAWL-ALL] ${marketCode}: Crawled ${crawlResult.pagesCrawled}/${sitemapData.urls.length} pages (${results[marketCode].percentCrawled}%)`);
        
        // Small delay between markets to be respectful
        if (!testMode) {
          await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay
        }
        
      } catch (error) {
        console.error(`[CRAWL-ALL] Error crawling ${marketCode}:`, error);
        
        // Update job with error (if job tracking is available)
        if (job) {
          try {
            await prisma.marketDataJob.update({
              where: { id: job.id },
              data: {
                status: 'failed',
                completedAt: new Date(),
                errors: {
                  message: error instanceof Error ? error.message : 'Unknown error',
                  stack: error instanceof Error ? error.stack : undefined
                }
              }
            });
          } catch (e) {
            // Table doesn't exist, skip
          }
        }
        
        results[marketCode] = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
    
    const executionTime = Math.round((Date.now() - startTime) / 1000);
    
    // Calculate summary statistics
    const summary = {
      marketsProcessed: marketsToProcess.length,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      successfulMarkets: Object.values(results).filter((r: any) => r.success).length,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      totalPagesCrawled: Object.values(results).reduce((sum: number, r: any) => sum + (r.pagesCrawled || 0), 0),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      totalPagesStored: Object.values(results).reduce((sum: number, r: any) => sum + (r.storedPages || 0), 0),
      executionTimeSeconds: executionTime,
      averageTimePerMarket: Math.round(executionTime / marketsToProcess.length)
    };
    
    console.log('[CRAWL-ALL] Crawl completed:', summary);
    
    return NextResponse.json({
      success: true,
      testMode,
      summary,
      results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[CRAWL-ALL] Fatal error:', error);
    return NextResponse.json(
      { 
        error: 'Crawl all markets failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check crawl statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const onlyCoreMarkets = searchParams.get('core') === 'true';
    
    // Try to get markets from table, fallback to config
    let markets: any[] = [];
    try {
      markets = await prisma.market.findMany({
        where: onlyCoreMarkets ? { isCore: true } : {},
        orderBy: { priority: 'asc' }
      });
    } catch (e) {
      // Market table doesn't exist, use config
      const marketCodes = onlyCoreMarkets 
        ? ['de', 'fr', 'it', 'es', 'ca_en', 'ca_fr', 'uk', 'pl']
        : Object.keys(MARKET_CONFIG);
      
      markets = marketCodes.map(code => ({
        code,
        name: code.toUpperCase(),
        country: code,
        language: MARKET_CONFIG[code]?.language || 'unknown',
        websiteUrl: MARKET_CONFIG[code]?.url || '',
        isCore: ['de', 'fr', 'it', 'es', 'ca_en', 'ca_fr', 'uk', 'pl'].includes(code)
      }));
    }
    
    // Get page counts per market
    const stats = await Promise.all(markets.map(async (market) => {
      const pageCount = await prisma.contentPage.count({
        where: { market: market.code }
      });
      
      let lastJob: any = null;
      try {
        lastJob = await prisma.marketDataJob.findFirst({
          where: { 
            marketCode: market.code,
            jobType: 'crawl'
          },
          orderBy: { createdAt: 'desc' }
        });
      } catch (e) {
        // Table doesn't exist
      }
      
      return {
        code: market.code,
        name: market.name,
        country: market.country,
        language: market.language,
        websiteUrl: market.websiteUrl,
        isCore: market.isCore,
        pagesStored: pageCount,
        lastCrawl: lastJob?.completedAt,
        lastCrawlStatus: lastJob?.status,
        lastCrawlPages: lastJob?.itemsProcessed
      };
    }));
    
    const totalPages = stats.reduce((sum, s) => sum + s.pagesStored, 0);
    const crawledMarkets = stats.filter(s => s.pagesStored > 0).length;
    
    return NextResponse.json({
      success: true,
      summary: {
        totalMarkets: markets.length,
        coreMarkets: markets.filter(m => m.isCore).length,
        crawledMarkets,
        totalPagesStored: totalPages
      },
      markets: stats
    });
    
  } catch (error) {
    console.error('[CRAWL-ALL] Status check error:', error);
    return NextResponse.json(
      { error: 'Failed to get crawl status' },
      { status: 500 }
    );
  }
}