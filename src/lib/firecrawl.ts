// Import Firecrawl
import FirecrawlApp from '@mendable/firecrawl-js';

// Initialize Firecrawl with API key
const apiKey = process.env.FIRECRAWL_API_KEY;
if (!apiKey) {
  console.warn('FIRECRAWL_API_KEY not found in environment variables');
}

const firecrawl = new FirecrawlApp({
  apiKey: apiKey || '',
});

// Define core markets for truthaboutweight.global sites
// Core markets: UK, Italy, Spain, France, Germany, Poland, Canada
export const TRUTHABOUTWEIGHT_SITES = {
  // Core Markets
  uk: 'https://truthaboutweight.uk',
  it: 'https://truthaboutweight.it',
  es: 'https://truthaboutweight.es',
  fr: 'https://truthaboutweight.fr',
  de: 'https://truthaboutweight.de',
  pl: 'https://truthaboutweight.pl',
  ca: 'https://truthaboutweight.ca',
  
  // Global site
  global: 'https://truthaboutweight.global',
  
  // Additional European markets
  be_nl: 'https://truthaboutweight.be/nl',
  be_fr: 'https://truthaboutweight.be/fr',
  ch_de: 'https://truthaboutweight.ch/de',
  ch_fr: 'https://truthaboutweight.ch/fr',
  ch_it: 'https://truthaboutweight.ch/it',
  nl: 'https://truthaboutweight.nl',
  at: 'https://truthaboutweight.at',
  pt: 'https://truthaboutweight.pt',
  se: 'https://truthaboutweight.se',
  dk: 'https://truthaboutweight.dk',
  no: 'https://truthaboutweight.no',
  fi: 'https://truthaboutweight.fi',
};

export interface CrawlResult {
  url: string;
  title: string;
  description?: string;
  content: string;
  markdown?: string;
  html?: string;
  metadata?: {
    title?: string;
    description?: string;
    keywords?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    canonicalUrl?: string;
    language?: string;
    sourceURL?: string;
    statusCode?: number;
    error?: string;
  };
  links?: string[];
  screenshot?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CrawlOptions {
  maxDepth?: number;
  limit?: number;
  includePaths?: string[];
  excludePaths?: string[];
  extractorOptions?: {
    mode?: 'llm-extraction' | 'markdown' | 'raw-html';
  };
  timeout?: number;
}

/**
 * Crawl a single URL and get detailed data
 */
export async function scrapeUrl(url: string): Promise<CrawlResult | null> {
  try {
    console.log(`Scraping URL: ${url}`);
    console.log('Using API key:', apiKey ? 'Found' : 'Missing');
    
    const result = await firecrawl.scrapeUrl(url, {
      formats: ['markdown', 'html', 'links'] as ("rawHtml" | "content" | "markdown" | "html" | "links" | "screenshot" | "screenshot@fullPage" | "extract" | "json" | "changeTracking")[],
    });

    console.log('Scrape result:', result ? 'Success' : 'Failed');

    if (result) {
      // Handle both result.data and direct result structures
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (result as any).data || result;
      
      return {
        url: data.url || url,
        title: data.metadata?.title || data.title || '',
        description: data.metadata?.description || data.description,
        content: data.markdown || data.content || '',
        markdown: data.markdown,
        html: data.html,
        metadata: data.metadata || {},
        links: data.links || [],
        screenshot: data.screenshot,
        createdAt: new Date().toISOString(),
      };
    }

    return null;
  } catch (error) {
    console.error('Error scraping URL:', url, error);
    return null;
  }
}

/**
 * Crawl an entire website with depth
 */
export async function crawlWebsite(
  url: string,
  options: CrawlOptions = {}
): Promise<CrawlResult[]> {
  try {
    console.log(`Starting crawl for: ${url}`);
    
    const crawlOptions = {
      limit: options.limit || 100,
      maxDepth: options.maxDepth || 3,
      includePaths: options.includePaths,
      excludePaths: options.excludePaths || [
        '/api/*',
        '/admin/*',
        '*.pdf',
        '*.zip',
      ],
      scrapeOptions: {
        formats: ['markdown', 'html', 'links', 'screenshot'] as ("rawHtml" | "content" | "markdown" | "html" | "links" | "screenshot" | "screenshot@fullPage" | "extract" | "json" | "changeTracking")[],
      },
    };

    const crawlResult = await firecrawl.crawlUrl(url, crawlOptions);
    
    if (crawlResult.success && crawlResult.data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return crawlResult.data.map((item: any) => ({
        url: item.url,
        title: item.metadata?.title || '',
        description: item.metadata?.description,
        content: item.markdown || item.content || '',
        markdown: item.markdown,
        html: item.html,
        metadata: item.metadata,
        links: item.links,
        screenshot: item.screenshot,
        createdAt: new Date().toISOString(),
      }));
    }

    return [];
  } catch (error) {
    console.error('Error crawling website:', url, error);
    return [];
  }
}

/**
 * Crawl all truthaboutweight.global sites
 */
export async function crawlAllMarkets(
  options: CrawlOptions = {}
): Promise<Record<string, CrawlResult[]>> {
  const results: Record<string, CrawlResult[]> = {};
  
  for (const [market, url] of Object.entries(TRUTHABOUTWEIGHT_SITES)) {
    console.log(`Crawling ${market} site: ${url}`);
    
    try {
      const marketResults = await crawlWebsite(url, {
        ...options,
        limit: options.limit || 50, // Limit per market to avoid huge crawls
      });
      
      results[market] = marketResults;
      console.log(`Found ${marketResults.length} pages for ${market}`);
    } catch (error) {
      console.error(`Failed to crawl ${market}:`, error);
      results[market] = [];
    }
  }
  
  return results;
}

/**
 * Get sitemap for a website
 */
export async function getSitemap(url: string): Promise<string[]> {
  try {
    const sitemapUrls: string[] = [];
    
    // Try common sitemap locations
    const sitemapPaths = ['/sitemap.xml', '/sitemap_index.xml', '/sitemap'];
    
    for (const path of sitemapPaths) {
      const sitemapUrl = new URL(path, url).toString();
      const result = await scrapeUrl(sitemapUrl);
      
      if (result && result.content) {
        // Extract URLs from sitemap content
        const urlMatches = result.content.match(/https?:\/\/[^\s<>"]+/g);
        if (urlMatches) {
          sitemapUrls.push(...urlMatches);
        }
      }
    }
    
    return [...new Set(sitemapUrls)]; // Remove duplicates
  } catch (error) {
    console.error('Error fetching sitemap:', error);
    return [];
  }
}

/**
 * Map a URL to its market
 */
export function getMarketFromUrl(url: string): string {
  const urlLower = url.toLowerCase();
  
  // Core Markets
  if (urlLower.includes('truthaboutweight.uk')) return 'UK';
  if (urlLower.includes('truthaboutweight.it')) return 'IT';
  if (urlLower.includes('truthaboutweight.es')) return 'ES';
  if (urlLower.includes('truthaboutweight.fr')) return 'FR';
  if (urlLower.includes('truthaboutweight.de')) return 'DE';
  if (urlLower.includes('truthaboutweight.pl')) return 'PL';
  if (urlLower.includes('truthaboutweight.ca')) return 'CA';
  
  // Global
  if (urlLower.includes('truthaboutweight.global')) return 'Global';
  
  // Additional European markets
  if (urlLower.includes('truthaboutweight.be/nl')) return 'BE-NL';
  if (urlLower.includes('truthaboutweight.be/fr')) return 'BE-FR';
  if (urlLower.includes('truthaboutweight.ch/de')) return 'CH-DE';
  if (urlLower.includes('truthaboutweight.ch/fr')) return 'CH-FR';
  if (urlLower.includes('truthaboutweight.ch/it')) return 'CH-IT';
  if (urlLower.includes('truthaboutweight.nl')) return 'NL';
  if (urlLower.includes('truthaboutweight.at')) return 'AT';
  if (urlLower.includes('truthaboutweight.pt')) return 'PT';
  if (urlLower.includes('truthaboutweight.se')) return 'SE';
  if (urlLower.includes('truthaboutweight.dk')) return 'DK';
  if (urlLower.includes('truthaboutweight.no')) return 'NO';
  if (urlLower.includes('truthaboutweight.fi')) return 'FI';
  
  return 'Unknown';
}

/**
 * Extract language from URL or content
 */
export function getLanguageFromUrl(url: string): string {
  const urlLower = url.toLowerCase();
  
  if (urlLower.includes('/nl') || urlLower.includes('truthaboutweight.be/nl')) return 'nl';
  if (urlLower.includes('/fr')) return 'fr';
  if (urlLower.includes('/de')) return 'de';
  if (urlLower.includes('/it')) return 'it';
  if (urlLower.includes('.uk')) return 'en-GB';
  if (urlLower.includes('.ca')) return 'en-CA';
  
  return 'en';
}

const firecrawlExports = {
  scrapeUrl,
  crawlWebsite,
  crawlAllMarkets,
  getSitemap,
  getMarketFromUrl,
  getLanguageFromUrl,
  TRUTHABOUTWEIGHT_SITES,
};

export default firecrawlExports;