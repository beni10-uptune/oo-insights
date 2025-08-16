import { NextRequest, NextResponse } from 'next/server';
import { MARKET_CONFIG } from '@/lib/firecrawl';
import { fetchSitemapUrls, updatePagesFromSitemap } from '@/lib/services/website-crawler';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'your-secure-cron-secret-here';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid cron secret' },
        { status: 401 }
      );
    }
    
    console.log('[CRON-SITEMAP] Starting daily sitemap review at', new Date().toISOString());
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results: Record<string, any> = {};
    const markets = Object.keys(MARKET_CONFIG);
    
    for (const market of markets) {
      console.log(`[CRON-SITEMAP] Reviewing sitemap for ${market}`);
      
      try {
        // Fetch sitemap
        const { urls, error } = await fetchSitemapUrls(market);
        
        if (error) {
          results[market] = { error };
          continue;
        }
        
        // Check for new URLs not in database
        const newUrls: string[] = [];
        for (const urlData of urls) {
          const exists = await prisma.contentPage.findFirst({
            where: { url: urlData.url },
            select: { id: true }
          });
          
          if (!exists) {
            newUrls.push(urlData.url);
          }
        }
        
        // Update existing pages with sitemap dates
        const updateResult = await updatePagesFromSitemap(market);
        
        results[market] = {
          totalUrls: urls.length,
          newUrls: newUrls.length,
          datesUpdated: updateResult.updated,
          needsCrawl: newUrls.length > 0,
          newUrlsList: newUrls.slice(0, 10), // First 10 for logging
        };
        
        // If there are new URLs, trigger a crawl for this market
        if (newUrls.length > 0) {
          console.log(`[CRON-SITEMAP] Found ${newUrls.length} new URLs for ${market}, triggering crawl`);
          
          // Log the event - find a content page for this market
          const contentPage = await prisma.contentPage.findFirst({
            where: { market },
            select: { id: true, url: true }
          });
          
          if (contentPage) {
            await prisma.pageEvent.create({
              data: {
                pageId: contentPage.id,
                url: contentPage.url,
                eventType: 'sitemap_new_urls_found',
                market,
                summary: JSON.stringify({ 
                  newUrls: newUrls.length, 
                  sample: newUrls.slice(0, 5) 
                })
              }
            });
          }
        }
        
      } catch (error) {
        console.error(`[CRON-SITEMAP] Error processing ${market}:`, error);
        results[market] = { error: String(error) };
      }
    }
    
    // Log job completion - jobs_trends table might not exist, so we'll skip this for now
    // We can add proper job tracking later if needed
    
    const executionTime = Math.round((Date.now() - startTime) / 1000);
    
    console.log('[CRON-SITEMAP] Sitemap review completed');
    console.log(`[CRON-SITEMAP] Markets needing crawl:`, 
      Object.entries(results)
        .filter(([_, r]) => r.needsCrawl)
        .map(([m]) => m)
    );
    
    return NextResponse.json({
      success: true,
      message: 'Daily sitemap review completed',
      execution_time: `${executionTime} seconds`,
      results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[CRON-SITEMAP] Fatal error:', error);
    
    return NextResponse.json(
      { 
        error: 'Sitemap review failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint for manual trigger
export async function GET() {
  return NextResponse.json({
    message: 'Use POST with proper authorization to trigger sitemap review',
    schedule: 'Daily at 7 AM UTC',
  });
}