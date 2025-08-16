import { NextRequest, NextResponse } from 'next/server';
import { crawlWebsite, fetchSitemapUrls, updatePagesFromSitemap } from '@/lib/services/website-crawler';
import { MARKET_CONFIG } from '@/lib/firecrawl';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { market, maxPages = 50, updateFromSitemap = true } = await request.json();
    
    if (!market) {
      return NextResponse.json(
        { error: 'Market parameter is required' },
        { status: 400 }
      );
    }
    
    if (!MARKET_CONFIG[market]) {
      return NextResponse.json(
        { error: `Invalid market: ${market}` },
        { status: 400 }
      );
    }
    
    console.log(`[FULL-CRAWL] Starting full site crawl for ${market}`);
    
    // First, get sitemap URLs to understand site structure
    let sitemapData = null;
    if (updateFromSitemap) {
      console.log(`[FULL-CRAWL] Fetching sitemap for ${market}`);
      sitemapData = await fetchSitemapUrls(market);
      console.log(`[FULL-CRAWL] Sitemap has ${sitemapData.urls.length} URLs`);
    }
    
    // Perform the crawl
    const crawlResult = await crawlWebsite(market, maxPages);
    
    // Update dates from sitemap if available
    let sitemapUpdateResult = null;
    if (updateFromSitemap && !sitemapData?.error) {
      console.log(`[FULL-CRAWL] Updating page dates from sitemap`);
      sitemapUpdateResult = await updatePagesFromSitemap(market);
    }
    
    // Log the crawl job - using proper column names from Prisma schema
    const contentPage = await prisma.contentPage.findFirst({
      where: { market },
      orderBy: { createdAt: 'desc' }
    });
    
    if (contentPage) {
      await prisma.pageEvent.create({
        data: {
          pageId: contentPage.id,
          url: contentPage.url,
          eventType: 'crawl_completed',
          market,
          summary: JSON.stringify({
            pagesCrawled: crawlResult.pagesCrawled,
            sitemapUrls: sitemapData?.urls.length || 0,
            datesUpdated: sitemapUpdateResult?.updated || 0,
          })
        }
      });
    }
    
    return NextResponse.json({
      success: crawlResult.success,
      market,
      pagesCrawled: crawlResult.pagesCrawled,
      sitemap: {
        urlsFound: sitemapData?.urls.length || 0,
        datesUpdated: sitemapUpdateResult?.updated || 0,
        error: sitemapData?.error,
      },
      errors: crawlResult.errors,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('[FULL-CRAWL] Error:', error);
    return NextResponse.json(
      { 
        error: 'Crawl failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check crawl status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const market = searchParams.get('market');
    
    // Get crawl statistics using Prisma query
    const statsQuery = market 
      ? await prisma.contentPage.groupBy({
          by: ['market'],
          where: { market },
          _count: { _all: true },
        })
      : await prisma.contentPage.groupBy({
          by: ['market'],
          _count: { _all: true },
        });
    
    // Format statistics
    const stats = await Promise.all(statsQuery.map(async (group) => {
      const pages = await prisma.contentPage.findMany({
        where: { market: group.market },
        select: {
          path: true,
          createdAt: true
        }
      });
      
      const uniquePaths = new Set(pages.map(p => p.path)).size;
      const dates = pages.map(p => p.createdAt);
      
      return {
        market: group.market,
        total_pages: group._count._all,
        unique_paths: uniquePaths,
        last_crawl: dates.length > 0 ? Math.max(...dates.map(d => d.getTime())) : null,
        first_crawl: dates.length > 0 ? Math.min(...dates.map(d => d.getTime())) : null
      };
    }));
    
    return NextResponse.json({
      success: true,
      stats,
      markets: Object.keys(MARKET_CONFIG),
    });
    
  } catch (error) {
    console.error('[FULL-CRAWL] Status check error:', error);
    return NextResponse.json(
      { error: 'Failed to get crawl status' },
      { status: 500 }
    );
  }
}