// Import Firecrawl
import FirecrawlApp from '@mendable/firecrawl-js';

// Get Firecrawl instance (lazy initialization)
function getFirecrawl() {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    console.error('FIRECRAWL_API_KEY not found in environment variables');
    throw new Error('FIRECRAWL_API_KEY is required');
  }
  
  return new FirecrawlApp({
    apiKey: apiKey,
  });
}

// EUCAN Markets - Comprehensive list with correct URLs
export const TRUTHABOUTWEIGHT_SITES = {
  // Core EUCAN Markets with dedicated sites
  de: 'https://www.ueber-gewicht.de/',
  fr: 'https://www.audeladupoids.fr/',
  it: 'https://www.novoio.it/',
  es: 'https://www.laverdaddesupeso.es/',
  ca_en: 'https://www.truthaboutweight.ca/en/',
  ca_fr: 'https://www.truthaboutweight.ca/fr/',
  
  // Switzerland multilingual
  ch_de: 'https://www.meingewichtverstehen.ch/',
  ch_it: 'https://www.laveritasulpeso.ch/',
  ch_fr: 'https://www.laveritesurlepoids.ch/',
  
  // Nordics
  se: 'https://www.meromobesitas.se/',
  no: 'https://www.snakkomvekt.no/',
  
  // Baltics
  lv: 'https://www.manssvars.lv/',
  ee: 'https://www.minukaal.ee/',
  lt: 'https://www.manosvoris.lt/',
  
  // Croatia
  hr: 'https://www.istinaodebljini.hr/',
  
  // Global subpaths (need path restrictions)
  be_nl: 'https://www.truthaboutweight.global/be/nl.html',
  be_fr: 'https://www.truthaboutweight.global/be/fr.html',
  bg: 'https://www.truthaboutweight.global/bg/bg.html',
  fi: 'https://www.truthaboutweight.global/fi/fi.html',
  gr: 'https://www.truthaboutweight.global/gr/el.html',
  hu: 'https://www.truthaboutweight.global/hu/hu.html',
  is: 'https://www.truthaboutweight.global/is/is.html',
  ie: 'https://www.truthaboutweight.global/ie/en.html',
  sk: 'https://www.truthaboutweight.global/sk/sk.html',
  rs: 'https://www.truthaboutweight.global/rs/sr.html',
  
  // Global site (fallback)
  global: 'https://www.truthaboutweight.global/',
};

// Market configuration with allowed paths for global subdomains
export const MARKET_CONFIG: Record<string, { 
  url: string; 
  allowedPaths?: string[];
  language: string;
  timezone: string;
  flag: string;
}> = {
  de: { url: TRUTHABOUTWEIGHT_SITES.de, language: 'de', timezone: 'Europe/Berlin', flag: '🇩🇪' },
  fr: { url: TRUTHABOUTWEIGHT_SITES.fr, language: 'fr', timezone: 'Europe/Paris', flag: '🇫🇷' },
  it: { url: TRUTHABOUTWEIGHT_SITES.it, language: 'it', timezone: 'Europe/Rome', flag: '🇮🇹' },
  es: { url: TRUTHABOUTWEIGHT_SITES.es, language: 'es', timezone: 'Europe/Madrid', flag: '🇪🇸' },
  ca_en: { url: TRUTHABOUTWEIGHT_SITES.ca_en, language: 'en', timezone: 'America/Toronto', flag: '🇨🇦' },
  ca_fr: { url: TRUTHABOUTWEIGHT_SITES.ca_fr, language: 'fr', timezone: 'America/Toronto', flag: '🇨🇦' },
  ch_de: { url: TRUTHABOUTWEIGHT_SITES.ch_de, language: 'de', timezone: 'Europe/Zurich', flag: '🇨🇭' },
  ch_it: { url: TRUTHABOUTWEIGHT_SITES.ch_it, language: 'it', timezone: 'Europe/Zurich', flag: '🇨🇭' },
  ch_fr: { url: TRUTHABOUTWEIGHT_SITES.ch_fr, language: 'fr', timezone: 'Europe/Zurich', flag: '🇨🇭' },
  se: { url: TRUTHABOUTWEIGHT_SITES.se, language: 'sv', timezone: 'Europe/Stockholm', flag: '🇸🇪' },
  no: { url: TRUTHABOUTWEIGHT_SITES.no, language: 'no', timezone: 'Europe/Oslo', flag: '🇳🇴' },
  lv: { url: TRUTHABOUTWEIGHT_SITES.lv, language: 'lv', timezone: 'Europe/Riga', flag: '🇱🇻' },
  ee: { url: TRUTHABOUTWEIGHT_SITES.ee, language: 'et', timezone: 'Europe/Tallinn', flag: '🇪🇪' },
  lt: { url: TRUTHABOUTWEIGHT_SITES.lt, language: 'lt', timezone: 'Europe/Vilnius', flag: '🇱🇹' },
  hr: { url: TRUTHABOUTWEIGHT_SITES.hr, language: 'hr', timezone: 'Europe/Zagreb', flag: '🇭🇷' },
  be_nl: { url: TRUTHABOUTWEIGHT_SITES.be_nl, allowedPaths: ['/be/'], language: 'nl', timezone: 'Europe/Brussels', flag: '🇧🇪' },
  be_fr: { url: TRUTHABOUTWEIGHT_SITES.be_fr, allowedPaths: ['/be/'], language: 'fr', timezone: 'Europe/Brussels', flag: '🇧🇪' },
  bg: { url: TRUTHABOUTWEIGHT_SITES.bg, allowedPaths: ['/bg/'], language: 'bg', timezone: 'Europe/Sofia', flag: '🇧🇬' },
  fi: { url: TRUTHABOUTWEIGHT_SITES.fi, allowedPaths: ['/fi/'], language: 'fi', timezone: 'Europe/Helsinki', flag: '🇫🇮' },
  gr: { url: TRUTHABOUTWEIGHT_SITES.gr, allowedPaths: ['/gr/'], language: 'el', timezone: 'Europe/Athens', flag: '🇬🇷' },
  hu: { url: TRUTHABOUTWEIGHT_SITES.hu, allowedPaths: ['/hu/'], language: 'hu', timezone: 'Europe/Budapest', flag: '🇭🇺' },
  is: { url: TRUTHABOUTWEIGHT_SITES.is, allowedPaths: ['/is/'], language: 'is', timezone: 'Atlantic/Reykjavik', flag: '🇮🇸' },
  ie: { url: TRUTHABOUTWEIGHT_SITES.ie, allowedPaths: ['/ie/'], language: 'en', timezone: 'Europe/Dublin', flag: '🇮🇪' },
  sk: { url: TRUTHABOUTWEIGHT_SITES.sk, allowedPaths: ['/sk/'], language: 'sk', timezone: 'Europe/Bratislava', flag: '🇸🇰' },
  rs: { url: TRUTHABOUTWEIGHT_SITES.rs, allowedPaths: ['/rs/'], language: 'sr', timezone: 'Europe/Belgrade', flag: '🇷🇸' },
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
    const firecrawl = getFirecrawl();
    console.log('Firecrawl initialized');
    
    const result = await firecrawl.scrapeUrl(url, {
      formats: ['markdown', 'html', 'links'] as ("rawHtml" | "content" | "markdown" | "html" | "links" | "screenshot" | "screenshot@fullPage" | "extract" | "json" | "changeTracking")[],
    });

    console.log('Scrape result:', result ? 'Success' : 'Failed');
    console.log('Result structure:', JSON.stringify(Object.keys(result || {})));

    if (result && result.success !== false) {
      // Firecrawl v1 returns the data directly
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = result as any;
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

    const firecrawl = getFirecrawl();
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