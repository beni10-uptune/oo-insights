import { NextRequest, NextResponse } from 'next/server';
import FirecrawlApp from '@mendable/firecrawl-js';
import { MARKET_CONFIG } from '@/lib/firecrawl';

export async function POST(request: NextRequest) {
  try {
    const { market = 'de' } = await request.json();
    
    const config = MARKET_CONFIG[market];
    if (!config) {
      return NextResponse.json({ error: `Invalid market: ${market}` }, { status: 400 });
    }
    
    const apiKey = process.env.FIRECRAWL_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'FIRECRAWL_API_KEY not configured' }, { status: 500 });
    }
    
    const firecrawl = new FirecrawlApp({ apiKey });
    
    // First, fetch the sitemap
    const sitemapUrl = new URL('/sitemap.xml', config.url).toString();
    console.log(`[DEBUG] Fetching sitemap: ${sitemapUrl}`);
    
    const sitemapResponse = await fetch(sitemapUrl);
    const sitemapXml = await sitemapResponse.text();
    
    // Extract URLs from sitemap
    const urlMatches = sitemapXml.matchAll(/<loc>(.*?)<\/loc>/g);
    const sitemapUrls: string[] = [];
    for (const match of urlMatches) {
      sitemapUrls.push(match[1]);
    }
    
    console.log(`[DEBUG] Found ${sitemapUrls.length} URLs in sitemap`);
    
    // Try to scrape the first URL
    const testUrl = sitemapUrls[0] || config.url;
    console.log(`[DEBUG] Testing scrape of: ${testUrl}`);
    
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const scrapeResult: any = await firecrawl.scrapeUrl(testUrl, {
        formats: ['markdown', 'html'],
      });
      
      console.log(`[DEBUG] Scrape result:`, {
        success: scrapeResult.success,
        hasUrl: !!scrapeResult.url,
        hasMarkdown: !!scrapeResult.markdown,
        hasHtml: !!scrapeResult.html,
        hasMetadata: !!scrapeResult.metadata,
        metadataKeys: scrapeResult.metadata ? Object.keys(scrapeResult.metadata) : [],
        markdownLength: scrapeResult.markdown?.length || 0,
        htmlLength: scrapeResult.html?.length || 0,
      });
      
      return NextResponse.json({
        market,
        sitemapUrl,
        sitemapUrlCount: sitemapUrls.length,
        sitemapSample: sitemapUrls.slice(0, 5),
        testUrl,
        scrapeResult: {
          success: scrapeResult.success,
          url: scrapeResult.url || testUrl,
          title: scrapeResult.metadata?.title || 'No title',
          hasContent: !!scrapeResult.markdown || !!scrapeResult.html,
          contentLength: (scrapeResult.markdown?.length || 0) + (scrapeResult.html?.length || 0),
          metadata: scrapeResult.metadata,
          error: scrapeResult.error,
        }
      });
      
    } catch (scrapeError) {
      console.error(`[DEBUG] Scrape error:`, scrapeError);
      return NextResponse.json({
        market,
        sitemapUrl,
        sitemapUrlCount: sitemapUrls.length,
        testUrl,
        scrapeError: String(scrapeError),
      });
    }
    
  } catch (error) {
    console.error('[DEBUG] Fatal error:', error);
    return NextResponse.json(
      { 
        error: 'Debug failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}