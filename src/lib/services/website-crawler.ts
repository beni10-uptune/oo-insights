import FirecrawlApp from '@mendable/firecrawl-js';
import { MARKET_CONFIG } from '@/lib/firecrawl';
import { storeCrawlResult } from '@/lib/services/web-activity';
import { prisma } from '@/lib/db';

// Get Firecrawl instance
function getFirecrawl() {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    throw new Error('FIRECRAWL_API_KEY is required');
  }
  return new FirecrawlApp({ apiKey });
}

// Parse market from URL
export function detectMarketFromUrl(url: string): string {
  const urlObj = new URL(url);
  const domain = urlObj.hostname;
  const path = urlObj.pathname;
  
  // Check for global domain with country paths
  if (domain.includes('truthaboutweight.global')) {
    // Extract country code from path like /be/nl.html -> be_nl
    const pathMatch = path.match(/^\/([a-z]{2})\/([a-z]{2})\.html$/);
    if (pathMatch) {
      const [, country, lang] = pathMatch;
      return `${country}_${lang}`;
    }
    
    // Single country code like /ie/en.html -> ie
    const singleMatch = path.match(/^\/([a-z]{2})\//);
    if (singleMatch) {
      return singleMatch[1];
    }
    
    return 'global';
  }
  
  // Check for Canada with language paths
  if (domain.includes('truthaboutweight.ca')) {
    if (path.includes('/fr/')) return 'ca_fr';
    if (path.includes('/en/')) return 'ca_en';
    return 'ca_en'; // Default to English
  }
  
  // Map domain to market
  const domainMappings: Record<string, string> = {
    'ueber-gewicht.de': 'de',
    'audeladupoids.fr': 'fr',
    'novoio.it': 'it',
    'laverdaddesupeso.es': 'es',
    'meingewichtverstehen.ch': 'ch_de',
    'laveritasulpeso.ch': 'ch_it',
    'laveritesurlepoids.ch': 'ch_fr',
    'meromobesitas.se': 'se',
    'snakkomvekt.no': 'no',
    'manssvars.lv': 'lv',
    'minukaal.ee': 'ee',
    'manosvoris.lt': 'lt',
    'istinaodebljini.hr': 'hr',
  };
  
  // Check each mapping
  for (const [domainPart, market] of Object.entries(domainMappings)) {
    if (domain.includes(domainPart)) {
      return market;
    }
  }
  
  return 'unknown';
}

// Crawl entire website with sitemap
export async function crawlWebsite(
  market: string,
  maxPages: number = 100
): Promise<{
  success: boolean;
  pagesCrawled: number;
  errors: string[];
}> {
  const config = MARKET_CONFIG[market];
  if (!config) {
    throw new Error(`Invalid market: ${market}`);
  }
  
  const firecrawl = getFirecrawl();
  const errors: string[] = [];
  let pagesCrawled = 0;
  
  try {
    console.log(`[CRAWLER] Starting full website crawl for ${market}: ${config.url}`);
    
    // Prepare crawl options
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const crawlOptions: any = {
      url: config.url,
      crawlerOptions: {
        maxDepth: 5,
        limit: maxPages,
        allowBackwardCrawling: false,
        allowExternalContentLinks: false,
      },
      pageOptions: {
        includeHtml: true,
        includeMarkdown: true,
        waitFor: 1000, // Wait for dynamic content
        screenshot: false,
      }
    };
    
    // For global domain markets, add path restrictions
    if (config.allowedPaths && config.allowedPaths.length > 0) {
      crawlOptions.crawlerOptions.includePaths = config.allowedPaths;
      crawlOptions.crawlerOptions.excludePaths = [
        // Exclude other country paths
        '/be/', '/bg/', '/fi/', '/gr/', '/hu/', '/is/', '/ie/', '/sk/', '/rs/'
      ].filter(path => !config.allowedPaths?.includes(path));
    }
    
    // Start the crawl - Using Firecrawl's crawl API
    // Since Firecrawl SDK might not have full crawl support, we'll use scrape with multiple URLs
    // First, get sitemap URLs
    const { urls: sitemapUrls } = await fetchSitemapUrls(market);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const crawlResult = { success: true, data: [] as any[], error: null as string | null };
    
    // If we have sitemap URLs, use them; otherwise crawl from the base URL
    const urlsToCrawl = sitemapUrls.length > 0 
      ? sitemapUrls.slice(0, maxPages).map(u => u.url)
      : [config.url];
    
    // For global domain markets, filter URLs by allowed paths
    const filteredUrls = config.allowedPaths 
      ? urlsToCrawl.filter(url => config.allowedPaths!.some(path => url.includes(path)))
      : urlsToCrawl;
    
    console.log(`[CRAWLER] Crawling ${filteredUrls.length} URLs for ${market}`);
    
    // Scrape each URL
    for (const url of filteredUrls) {
      try {
        console.log(`[CRAWLER] Scraping ${url}`);
        const scrapeResult = await firecrawl.scrapeUrl(url, {
          formats: ['markdown', 'html'],
          waitFor: 1000,
        });
        
        if (scrapeResult.success) {
          // The scrapeResult itself is the document data
          // Add the URL to the result since it might not be in the response
          const resultWithUrl = { ...scrapeResult, url: url };
          crawlResult.data.push(resultWithUrl);
          console.log(`[CRAWLER] Successfully scraped ${url}`);
        } else {
          console.log(`[CRAWLER] Failed to scrape ${url}:`, scrapeResult.error);
        }
      } catch (err) {
        console.error(`[CRAWLER] Error scraping ${url}:`, err);
        errors.push(`Failed to scrape ${url}: ${err}`);
      }
    }
    
    if (!crawlResult.success) {
      throw new Error(`Crawl failed: ${crawlResult.error || 'Unknown error'}`);
    }
    
    // Process each crawled page
    const pages = crawlResult.data || [];
    console.log(`[CRAWLER] Found ${pages.length} pages for ${market}`);
    
    for (const page of pages) {
      try {
        // Ensure we have a URL
        if (!page.url) {
          console.log(`[CRAWLER] Skipping page without URL`);
          continue;
        }
        
        // Skip if no content
        if (!page.markdown && !page.html) {
          console.log(`[CRAWLER] Skipping ${page.url} - no content`);
          continue;
        }
        
        // Store the page - storeCrawlResult calculates market and language internally
        await storeCrawlResult({
          url: page.url,
          title: page.metadata?.title || page.metadata?.ogTitle || 'Untitled',
          description: page.metadata?.description || page.metadata?.ogDescription,
          content: page.markdown || '',
          html: page.html || '',
          publishDate: page.metadata?.publishedTime ? new Date(page.metadata.publishedTime) : undefined,
          metadata: page.metadata || {},
        });
        
        pagesCrawled++;
        console.log(`[CRAWLER] Stored page ${pagesCrawled}: ${page.url}`);
        
      } catch (pageError) {
        const errorMsg = `Error processing ${page.url}: ${pageError}`;
        console.error(`[CRAWLER] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }
    
    console.log(`[CRAWLER] Completed crawl for ${market}: ${pagesCrawled} pages stored`);
    
    return {
      success: true,
      pagesCrawled,
      errors,
    };
    
  } catch (error) {
    console.error(`[CRAWLER] Fatal error crawling ${market}:`, error);
    return {
      success: false,
      pagesCrawled,
      errors: [...errors, String(error)],
    };
  }
}

// Fetch and parse sitemap for a market
export async function fetchSitemapUrls(market: string): Promise<{
  urls: Array<{
    url: string;
    lastmod?: string;
    changefreq?: string;
    priority?: number;
  }>;
  error?: string;
}> {
  const config = MARKET_CONFIG[market];
  if (!config) {
    return { urls: [], error: `Invalid market: ${market}` };
  }
  
  try {
    const urlObj = new URL(config.url);
    const sitemapUrl = `${urlObj.origin}/sitemap.xml`;
    
    console.log(`[SITEMAP] Fetching sitemap for ${market}: ${sitemapUrl}`);
    
    const response = await fetch(sitemapUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const xml = await response.text();
    
    // Parse sitemap XML
    const urlMatches = xml.matchAll(/<url>[\s\S]*?<\/url>/g);
    const urls: Array<{
      url: string;
      lastmod?: string;
      changefreq?: string;
      priority?: number;
    }> = [];
    
    for (const match of urlMatches) {
      const urlBlock = match[0];
      
      const locMatch = urlBlock.match(/<loc>(.*?)<\/loc>/);
      if (!locMatch) continue;
      
      const url = locMatch[1];
      
      // For global domain, check if URL belongs to this market
      if (config.allowedPaths) {
        const shouldInclude = config.allowedPaths.some(path => url.includes(path));
        if (!shouldInclude) continue;
      }
      
      const lastmodMatch = urlBlock.match(/<lastmod>(.*?)<\/lastmod>/);
      const changefreqMatch = urlBlock.match(/<changefreq>(.*?)<\/changefreq>/);
      const priorityMatch = urlBlock.match(/<priority>(.*?)<\/priority>/);
      
      urls.push({
        url,
        lastmod: lastmodMatch?.[1],
        changefreq: changefreqMatch?.[1],
        priority: priorityMatch ? parseFloat(priorityMatch[1]) : undefined,
      });
    }
    
    console.log(`[SITEMAP] Found ${urls.length} URLs for ${market}`);
    return { urls };
    
  } catch (error) {
    console.error(`[SITEMAP] Error fetching sitemap for ${market}:`, error);
    return { urls: [], error: String(error) };
  }
}

// Update page dates from sitemap
export async function updatePagesFromSitemap(market: string): Promise<{
  updated: number;
  errors: string[];
}> {
  const { urls, error } = await fetchSitemapUrls(market);
  
  if (error) {
    return { updated: 0, errors: [error] };
  }
  
  let updated = 0;
  const errors: string[] = [];
  
  for (const urlData of urls) {
    try {
      if (urlData.lastmod) {
        const result = await prisma.contentPage.updateMany({
          where: { url: urlData.url },
          data: { lastModifiedAt: new Date(urlData.lastmod) }
        });
        
        if (result.count > 0) {
          updated++;
        }
      }
    } catch (err) {
      errors.push(`Error updating ${urlData.url}: ${err}`);
    }
  }
  
  return { updated, errors };
}