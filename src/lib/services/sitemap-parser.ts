import { MARKET_CONFIG } from '@/lib/firecrawl';

interface SitemapEntry {
  url: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
  publishDate?: Date;
  isArticle: boolean;
  contentType: 'article' | 'home' | 'utility' | 'product' | 'other';
}

/**
 * Parse sitemap XML and extract URLs with metadata
 */
export function parseSitemapXML(xml: string): SitemapEntry[] {
  const entries: SitemapEntry[] = [];
  
  // Extract URL entries using regex (more reliable than XML parsing for sitemaps)
  const urlPattern = /<url>([\s\S]*?)<\/url>/g;
  const locPattern = /<loc>(.*?)<\/loc>/;
  const lastmodPattern = /<lastmod>(.*?)<\/lastmod>/;
  const changefreqPattern = /<changefreq>(.*?)<\/changefreq>/;
  const priorityPattern = /<priority>(.*?)<\/priority>/;
  
  let match;
  while ((match = urlPattern.exec(xml)) !== null) {
    const urlBlock = match[1];
    
    const loc = locPattern.exec(urlBlock)?.[1];
    const lastmod = lastmodPattern.exec(urlBlock)?.[1];
    const changefreq = changefreqPattern.exec(urlBlock)?.[1];
    const priority = priorityPattern.exec(urlBlock)?.[1];
    
    if (loc) {
      const entry: SitemapEntry = {
        url: loc,
        lastmod,
        changefreq,
        priority,
        publishDate: lastmod ? new Date(lastmod) : undefined,
        isArticle: isArticleUrl(loc),
        contentType: classifyUrl(loc),
      };
      
      entries.push(entry);
    }
  }
  
  return entries;
}

/**
 * Fetch and parse sitemap for a given domain
 */
export async function fetchSitemap(baseUrl: string): Promise<SitemapEntry[]> {
  try {
    // Try common sitemap locations
    const sitemapUrls = [
      `${baseUrl}/sitemap.xml`,
      `${baseUrl}/sitemap_index.xml`,
      `${baseUrl}/post-sitemap.xml`,
      `${baseUrl}/page-sitemap.xml`,
      `${baseUrl}/news-sitemap.xml`,
    ];
    
    for (const sitemapUrl of sitemapUrls) {
      try {
        console.log(`Trying sitemap: ${sitemapUrl}`);
        const response = await fetch(sitemapUrl);
        
        if (response.ok) {
          const xml = await response.text();
          
          // Check if it's a sitemap index
          if (xml.includes('<sitemapindex')) {
            // Parse sitemap index and fetch individual sitemaps
            const sitemaps = parseSitemapIndex(xml);
            const allEntries: SitemapEntry[] = [];
            
            for (const sitemapUrl of sitemaps) {
              try {
                const subResponse = await fetch(sitemapUrl);
                if (subResponse.ok) {
                  const subXml = await subResponse.text();
                  allEntries.push(...parseSitemapXML(subXml));
                }
              } catch (e) {
                console.error(`Failed to fetch sub-sitemap ${sitemapUrl}:`, e);
              }
            }
            
            return allEntries;
          } else {
            // Regular sitemap
            return parseSitemapXML(xml);
          }
        }
      } catch (e) {
        console.error(`Failed to fetch ${sitemapUrl}:`, e);
      }
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching sitemap:', error);
    return [];
  }
}

/**
 * Parse sitemap index to get individual sitemap URLs
 */
function parseSitemapIndex(xml: string): string[] {
  const sitemaps: string[] = [];
  const sitemapPattern = /<sitemap>[\s\S]*?<loc>(.*?)<\/loc>[\s\S]*?<\/sitemap>/g;
  
  let match;
  while ((match = sitemapPattern.exec(xml)) !== null) {
    sitemaps.push(match[1]);
  }
  
  return sitemaps;
}

/**
 * Determine if a URL is likely an article based on patterns
 */
function isArticleUrl(url: string): boolean {
  const articlePatterns = [
    /\/blog\//i,
    /\/news\//i,
    /\/article\//i,
    /\/post\//i,
    /\/stories\//i,
    /\/insights\//i,
    /\/updates\//i,
    /\/\d{4}\/\d{2}\//,  // Date patterns like /2024/03/
    /\/p\//i,  // Common article path
  ];
  
  // Check for article indicators
  if (articlePatterns.some(pattern => pattern.test(url))) {
    return true;
  }
  
  // Check URL structure - articles often have longer paths with hyphens
  const path = new URL(url).pathname;
  const segments = path.split('/').filter(s => s);
  
  // Articles typically have descriptive slugs with hyphens
  if (segments.length > 0) {
    const lastSegment = segments[segments.length - 1];
    const hasArticleSlug = lastSegment.includes('-') && lastSegment.length > 20;
    if (hasArticleSlug) return true;
  }
  
  return false;
}

/**
 * Classify URL into content types for filtering
 */
function classifyUrl(url: string): 'article' | 'home' | 'utility' | 'product' | 'other' {
  const urlLower = url.toLowerCase();
  const path = new URL(url).pathname.toLowerCase();
  
  // Home page
  if (path === '/' || path === '' || path === '/home' || path === '/index') {
    return 'home';
  }
  
  // Utility pages (filter these out)
  const utilityPatterns = [
    /privacy/i,
    /terms/i,
    /cookie/i,
    /legal/i,
    /disclaimer/i,
    /contact/i,
    /about/i,
    /sitemap/i,
    /search/i,
    /404/i,
    /error/i,
    /login/i,
    /register/i,
    /account/i,
    /careers/i,
  ];
  
  if (utilityPatterns.some(pattern => pattern.test(urlLower))) {
    return 'utility';
  }
  
  // Product/treatment pages
  const productPatterns = [
    /treatment/i,
    /product/i,
    /medicine/i,
    /therapy/i,
    /solution/i,
    /service/i,
    /wegovy/i,
    /mounjaro/i,
    /ozempic/i,
    /saxenda/i,
  ];
  
  if (productPatterns.some(pattern => pattern.test(urlLower))) {
    return 'product';
  }
  
  // Articles (detailed check)
  if (isArticleUrl(url)) {
    return 'article';
  }
  
  return 'other';
}

/**
 * Get articles from sitemap for a specific market
 */
export async function getMarketArticles(market: string): Promise<SitemapEntry[]> {
  const config = MARKET_CONFIG[market];
  if (!config) return [];
  
  const entries = await fetchSitemap(config.url);
  
  // Filter and sort articles by date
  const articles = entries
    .filter(entry => entry.contentType === 'article' && entry.publishDate)
    .sort((a, b) => {
      const dateA = a.publishDate?.getTime() || 0;
      const dateB = b.publishDate?.getTime() || 0;
      return dateB - dateA; // Most recent first
    });
  
  return articles;
}

/**
 * Get all content organized by type for a market
 */
export async function getMarketContent(market: string): Promise<{
  articles: SitemapEntry[];
  products: SitemapEntry[];
  home: SitemapEntry[];
  other: SitemapEntry[];
}> {
  const config = MARKET_CONFIG[market];
  if (!config) {
    return { articles: [], products: [], home: [], other: [] };
  }
  
  const entries = await fetchSitemap(config.url);
  
  return {
    articles: entries.filter(e => e.contentType === 'article'),
    products: entries.filter(e => e.contentType === 'product'),
    home: entries.filter(e => e.contentType === 'home'),
    other: entries.filter(e => e.contentType === 'other'),
  };
}