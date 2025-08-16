// Import Firecrawl
import FirecrawlApp from '@mendable/firecrawl-js';
import { fetchSitemap } from './services/sitemap-parser';

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

    console.log('Scrape result received');
    console.log('Result type:', typeof result);
    console.log('Result keys:', result ? Object.keys(result) : 'null');
    
    // Firecrawl v1.x returns data in a specific structure
    // Check if we have a successful response
    if (result) {
      // The response might be wrapped in a data property or be direct
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const responseData = (result as any).data || result;
      
      console.log('Response data keys:', Object.keys(responseData || {}));
      console.log('Has markdown:', !!responseData?.markdown);
      console.log('Markdown length:', responseData?.markdown?.length || 0);
      
      // Only return if we actually have content
      if (responseData?.markdown || responseData?.content || responseData?.html) {
        return {
          url: responseData.url || url,
          title: responseData.metadata?.title || responseData.title || '',
          description: responseData.metadata?.description || responseData.description,
          content: responseData.markdown || responseData.content || '',
          markdown: responseData.markdown,
          html: responseData.html,
          metadata: responseData.metadata || {},
          links: responseData.links || [],
          screenshot: responseData.screenshot,
          createdAt: new Date().toISOString(),
        };
      } else {
        console.error('No content in response:', {
          hasMarkdown: !!responseData?.markdown,
          hasContent: !!responseData?.content,
          hasHtml: !!responseData?.html,
        });
      }
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
  
  // Core EUCAN Markets with actual domains
  if (urlLower.includes('ueber-gewicht.de')) return 'de';
  if (urlLower.includes('audeladupoids.fr')) return 'fr';
  if (urlLower.includes('novoio.it')) return 'it';
  if (urlLower.includes('laverdaddesupeso.es')) return 'es';
  if (urlLower.includes('truthaboutweight.ca/en')) return 'ca_en';
  if (urlLower.includes('truthaboutweight.ca/fr')) return 'ca_fr';
  if (urlLower.includes('truthaboutweight.ca')) return 'ca_en'; // Default to English
  
  // Switzerland multilingual
  if (urlLower.includes('meingewichtverstehen.ch')) return 'ch_de';
  if (urlLower.includes('laveritasulpeso.ch')) return 'ch_it';
  if (urlLower.includes('laveritesurlepoids.ch')) return 'ch_fr';
  
  // Nordics
  if (urlLower.includes('meromobesitas.se')) return 'se';
  if (urlLower.includes('snakkomvekt.no')) return 'no';
  
  // Baltics
  if (urlLower.includes('manssvars.lv')) return 'lv';
  if (urlLower.includes('minukaal.ee')) return 'ee';
  if (urlLower.includes('manosvoris.lt')) return 'lt';
  
  // Croatia
  if (urlLower.includes('istinaodebljini.hr')) return 'hr';
  
  // Global domain with subpaths
  if (urlLower.includes('truthaboutweight.global')) {
    // Extract market from path
    const pathMatch = url.match(/truthaboutweight\.global\/([a-z]{2})(?:\/([a-z]{2}))?/i);
    if (pathMatch) {
      const [, country, lang] = pathMatch;
      if (lang) {
        return `${country}_${lang}`;
      }
      return country;
    }
    return 'global';
  }
  
  // Legacy UK domain (if it exists)
  if (urlLower.includes('truthaboutweight.uk')) return 'uk';
  
  return 'Unknown';
}

/**
 * Extract language from URL or content
 */
export function getLanguageFromUrl(url: string): string {
  const urlLower = url.toLowerCase();
  
  // Check domain-based languages
  if (urlLower.includes('ueber-gewicht.de')) return 'de';
  if (urlLower.includes('audeladupoids.fr')) return 'fr';
  if (urlLower.includes('novoio.it')) return 'it';
  if (urlLower.includes('laverdaddesupeso.es')) return 'es';
  if (urlLower.includes('meingewichtverstehen.ch')) return 'de';
  if (urlLower.includes('laveritasulpeso.ch')) return 'it';
  if (urlLower.includes('laveritesurlepoids.ch')) return 'fr';
  if (urlLower.includes('meromobesitas.se')) return 'sv';
  if (urlLower.includes('snakkomvekt.no')) return 'no';
  if (urlLower.includes('manssvars.lv')) return 'lv';
  if (urlLower.includes('minukaal.ee')) return 'et';
  if (urlLower.includes('manosvoris.lt')) return 'lt';
  if (urlLower.includes('istinaodebljini.hr')) return 'hr';
  
  // Check path-based languages
  if (urlLower.includes('/nl')) return 'nl';
  if (urlLower.includes('/fr')) return 'fr';
  if (urlLower.includes('/en')) return 'en';
  if (urlLower.includes('/bg')) return 'bg';
  if (urlLower.includes('/fi')) return 'fi';
  if (urlLower.includes('/el')) return 'el';
  if (urlLower.includes('/hu')) return 'hu';
  if (urlLower.includes('/is')) return 'is';
  if (urlLower.includes('/sk')) return 'sk';
  if (urlLower.includes('/sr')) return 'sr';
  
  // Canada specific
  if (urlLower.includes('truthaboutweight.ca/fr')) return 'fr';
  if (urlLower.includes('truthaboutweight.ca')) return 'en';
  
  // UK specific
  if (urlLower.includes('truthaboutweight.uk')) return 'en';
  
  return 'en';
}

/**
 * Enhanced crawl that combines Firecrawl scraping with sitemap data
 * This enriches the crawl results with publish dates from sitemaps
 */
export async function scrapeUrlWithSitemapData(
  url: string,
  market: string
): Promise<(CrawlResult & { publishDate?: Date }) | null> {
  try {
    // First, perform the regular scrape
    const crawlResult = await scrapeUrl(url);
    if (!crawlResult) return null;
    
    // Get the market config for the base URL
    const config = MARKET_CONFIG[market];
    if (!config) return crawlResult;
    
    // Fetch sitemap data for this market
    const sitemapEntries = await fetchSitemap(config.url);
    
    // Find the matching entry in the sitemap
    const matchingEntry = sitemapEntries.find(entry => {
      // Normalize URLs for comparison
      const normalizedEntryUrl = entry.url.replace(/\/$/, '');
      const normalizedTargetUrl = url.replace(/\/$/, '');
      return normalizedEntryUrl === normalizedTargetUrl;
    });
    
    // Enrich the result with publish date if found
    if (matchingEntry && matchingEntry.publishDate) {
      return {
        ...crawlResult,
        publishDate: matchingEntry.publishDate,
      };
    }
    
    return crawlResult;
  } catch (error) {
    console.error('Error in enhanced scrape:', error);
    // Fall back to regular scrape if sitemap fails
    return scrapeUrl(url);
  }
}

/**
 * Crawl all markets with sitemap enrichment
 */
export async function crawlAllMarketsEnhanced(
  options: CrawlOptions = {}
): Promise<Record<string, Array<CrawlResult & { publishDate?: Date }>>> {
  const results: Record<string, Array<CrawlResult & { publishDate?: Date }>> = {};
  
  for (const [market, config] of Object.entries(MARKET_CONFIG)) {
    console.log(`Enhanced crawl for ${market}: ${config.url}`);
    
    try {
      // Get sitemap data first
      const sitemapEntries = await fetchSitemap(config.url);
      const sitemapMap = new Map(
        sitemapEntries.map(entry => [entry.url.replace(/\/$/, ''), entry])
      );
      
      // Regular crawl
      const crawlResults = await crawlWebsite(config.url, {
        ...options,
        limit: options.limit || 50,
      });
      
      // Enrich results with sitemap data
      const enrichedResults = crawlResults.map(result => {
        const normalizedUrl = result.url.replace(/\/$/, '');
        const sitemapEntry = sitemapMap.get(normalizedUrl);
        
        return {
          ...result,
          publishDate: sitemapEntry?.publishDate,
        };
      });
      
      results[market] = enrichedResults;
      console.log(`Found ${enrichedResults.length} pages for ${market}`);
    } catch (error) {
      console.error(`Failed to crawl ${market}:`, error);
      results[market] = [];
    }
  }
  
  return results;
}

const firecrawlExports = {
  scrapeUrl,
  scrapeUrlWithSitemapData,
  crawlWebsite,
  crawlAllMarkets,
  crawlAllMarketsEnhanced,
  getSitemap,
  getMarketFromUrl,
  getLanguageFromUrl,
  TRUTHABOUTWEIGHT_SITES,
  MARKET_CONFIG,
};

export default firecrawlExports;