import { PrismaClient } from '@prisma/client';
import { MARKET_CONFIG, scrapeUrl } from '@/lib/firecrawl';
import { fetchSitemap } from './sitemap-parser';
import { summarizeContent } from './simple-ai';
import { categorizeContent } from './ai-categorization';
import crypto from 'crypto';

const prisma = new PrismaClient();

interface SitemapCrawlResult {
  market: string;
  totalPages: number;
  newPages: number;
  updatedPages: number;
  errors: string[];
  duration: number;
}

/**
 * Crawl a market based on its sitemap
 * This is the main function that should run daily
 */
export async function crawlMarketFromSitemap(
  market: string,
  options: {
    forceRefresh?: boolean;
    summarize?: boolean;
    classify?: boolean;
  } = {}
): Promise<SitemapCrawlResult> {
  const startTime = Date.now();
  const result: SitemapCrawlResult = {
    market,
    totalPages: 0,
    newPages: 0,
    updatedPages: 0,
    errors: [],
    duration: 0,
  };

  try {
    const config = MARKET_CONFIG[market];
    if (!config) {
      throw new Error(`Unknown market: ${market}`);
    }

    console.log(`[${market}] Starting sitemap-based crawl for ${config.url}`);

    // Step 1: Fetch sitemap
    const sitemapEntries = await fetchSitemap(config.url);
    result.totalPages = sitemapEntries.length;
    console.log(`[${market}] Found ${sitemapEntries.length} pages in sitemap`);

    // Step 2: Get existing pages from database
    const existingPages = await prisma.contentPage.findMany({
      where: { market },
      select: { url: true, changeHash: true, lastCrawledAt: true },
    });

    const existingUrlMap = new Map(
      existingPages.map(p => [p.url, { hash: p.changeHash, lastCrawled: p.lastCrawledAt }])
    );

    // Step 3: Process each sitemap entry
    for (const entry of sitemapEntries) {
      try {
        const isNew = !existingUrlMap.has(entry.url);
        const existingData = existingUrlMap.get(entry.url);
        
        // Skip utility pages
        if (entry.contentType === 'utility') {
          console.log(`[${market}] Skipping utility page: ${entry.url}`);
          continue;
        }

        // Determine if we should crawl this page
        let shouldCrawl = false;
        
        if (isNew) {
          shouldCrawl = true;
          console.log(`[${market}] New page found: ${entry.url}`);
        } else if (options.forceRefresh) {
          shouldCrawl = true;
        } else if (existingData?.lastCrawled) {
          // Re-crawl if older than 7 days
          const daysSinceCrawl = (Date.now() - new Date(existingData.lastCrawled).getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceCrawl > 7) {
            shouldCrawl = true;
            console.log(`[${market}] Page needs refresh (${Math.floor(daysSinceCrawl)} days old): ${entry.url}`);
          }
        }

        if (!shouldCrawl) {
          continue;
        }

        // Step 4: Scrape the page
        console.log(`[${market}] Scraping: ${entry.url}`);
        const scraped = await scrapeUrl(entry.url);
        
        if (!scraped || !scraped.content) {
          console.error(`[${market}] Failed to scrape: ${entry.url}`);
          result.errors.push(`Failed to scrape: ${entry.url}`);
          continue;
        }

        // Step 5: Generate content hash
        const contentHash = crypto
          .createHash('sha256')
          .update(scraped.content)
          .digest('hex');

        // Check if content changed
        const contentChanged = !existingData || existingData.hash !== contentHash;

        // Step 6: AI Processing (only if content is new or changed)
        let summary = null;
        let summaryEn = null;
        let category = null;
        let contentType = null;
        let confidence = null;
        let keywords: string[] = [];
        let signals: Record<string, boolean | number> = {};

        if (contentChanged && (options.summarize || options.classify)) {
          // Summarize content
          if (options.summarize !== false) {
            try {
              const summaryResult = await summarizeContent(scraped.content, config.language);
              summary = summaryResult.original;
              summaryEn = summaryResult.english;
              console.log(`[${market}] Generated summary for: ${entry.url}`);
            } catch (error) {
              console.error(`[${market}] Failed to summarize: ${entry.url}`, error);
              result.errors.push(`Summarization failed: ${entry.url}`);
            }
          }

          // Categorize content using new MECE system
          if (options.classify !== false) {
            try {
              const categorization = await categorizeContent(
                scraped.content,
                scraped.title || '',
                entry.url
              );
              category = categorization.category;
              contentType = categorization.contentType;
              confidence = categorization.confidence;
              keywords = categorization.keywords;
              signals = categorization.signals;
              console.log(`[${market}] Categorized as ${category} (${contentType}) with ${Math.round(confidence * 100)}% confidence: ${entry.url}`);
            } catch (error) {
              console.error(`[${market}] Failed to categorize: ${entry.url}`, error);
              result.errors.push(`Categorization failed: ${entry.url}`);
            }
          }
        }

        // Step 7: Store in database
        const urlObj = new URL(entry.url);
        const pageData = {
          url: entry.url,
          domain: urlObj.hostname,
          path: urlObj.pathname,
          market,
          language: config.language,
          title: scraped.title,
          description: scraped.description,
          rawHtml: scraped.html?.substring(0, 65535),
          textContent: scraped.content,
          wordCount: scraped.content.split(/\s+/).length,
          tags: extractTags(scraped, entry),
          isArticle: entry.isArticle,
          source: 'sitemap',
          publishDate: entry.publishDate || null,
          summary,
          summaryEn,
          category,
          contentType,
          confidence,
          keywords,
          hasVideo: signals.hasVideo || false,
          hasCalculator: signals.hasCalculator || false,
          hasForm: signals.hasForm || false,
          readingTime: signals.readingTime || null,
          signals,
          lastCrawledAt: new Date(),
          lastModifiedAt: entry.publishDate || new Date(),
          changeHash: contentHash,
          changePct: 0,
        };

        if (isNew) {
          // Create new page
          const page = await prisma.contentPage.create({ data: pageData });
          
          // Create "created" event
          await prisma.pageEvent.create({
            data: {
              pageId: page.id,
              url: entry.url,
              eventType: 'created',
              market,
              language: config.language,
              title: scraped.title,
              summary: summaryEn || summary,
              category,
              eventAt: entry.publishDate || new Date(),
            },
          });
          
          result.newPages++;
          console.log(`[${market}] ✓ Created new page: ${entry.url}`);
        } else if (contentChanged) {
          // Update existing page
          await prisma.contentPage.update({
            where: { url: entry.url },
            data: {
              ...pageData,
              updatedAt: new Date(),
            },
          });

          // Create "updated" event
          const page = await prisma.contentPage.findUnique({ where: { url: entry.url } });
          if (page) {
            await prisma.pageEvent.create({
              data: {
                pageId: page.id,
                url: entry.url,
                eventType: 'updated',
                market,
                language: config.language,
                title: scraped.title,
                summary: summaryEn || summary,
                category,
                changePct: calculateChangePercentage(existingData?.hash || '', contentHash),
                eventAt: new Date(),
              },
            });
          }

          result.updatedPages++;
          console.log(`[${market}] ✓ Updated page: ${entry.url}`);
        } else {
          // Just update last crawled time
          await prisma.contentPage.update({
            where: { url: entry.url },
            data: { lastCrawledAt: new Date() },
          });
          console.log(`[${market}] ✓ No changes: ${entry.url}`);
        }

        // Add small delay to be respectful
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`[${market}] Error processing ${entry.url}:`, error);
        result.errors.push(`Error processing ${entry.url}: ${error}`);
      }
    }

  } catch (error) {
    console.error(`[${market}] Fatal error:`, error);
    result.errors.push(`Fatal error: ${error}`);
  }

  result.duration = Date.now() - startTime;
  console.log(`[${market}] Completed in ${Math.round(result.duration / 1000)}s - New: ${result.newPages}, Updated: ${result.updatedPages}`);
  
  return result;
}

/**
 * Crawl all markets from their sitemaps
 */
export async function crawlAllMarketsFromSitemaps(
  options: {
    forceRefresh?: boolean;
    summarize?: boolean;
    classify?: boolean;
  } = {}
): Promise<Record<string, SitemapCrawlResult>> {
  const results: Record<string, SitemapCrawlResult> = {};
  const markets = Object.keys(MARKET_CONFIG);

  // Process markets in batches
  const batchSize = 3;
  for (let i = 0; i < markets.length; i += batchSize) {
    const batch = markets.slice(i, i + batchSize);
    
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1}: ${batch.join(', ')}`);
    
    const batchPromises = batch.map(market =>
      crawlMarketFromSitemap(market, options).catch(error => ({
        market,
        totalPages: 0,
        newPages: 0,
        updatedPages: 0,
        errors: [`Fatal error: ${error}`],
        duration: 0,
      }))
    );

    const batchResults = await Promise.all(batchPromises);
    
    for (const result of batchResults) {
      results[result.market] = result;
    }

    // Add delay between batches
    if (i + batchSize < markets.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  return results;
}

/**
 * Extract tags from scraped content
 */
function extractTags(scraped: any, sitemapEntry: any): string[] {
  const tags: string[] = [];

  // Add content type
  if (sitemapEntry.contentType) {
    tags.push(sitemapEntry.contentType);
  }

  // Extract from metadata
  if (scraped.metadata?.keywords) {
    tags.push(...scraped.metadata.keywords.split(',').map((k: string) => k.trim()));
  }

  // Extract medication mentions
  const medications = ['wegovy', 'mounjaro', 'ozempic', 'saxenda', 'zepbound'];
  const content = (scraped.content || '').toLowerCase();
  
  medications.forEach(med => {
    if (content.includes(med)) {
      tags.push(med);
    }
  });

  // Add URL-based tags
  const url = sitemapEntry.url.toLowerCase();
  if (url.includes('/blog')) tags.push('blog');
  if (url.includes('/news')) tags.push('news');
  if (url.includes('/treatment')) tags.push('treatment');
  if (url.includes('/adipositas') || url.includes('/obesity')) tags.push('obesity');
  if (url.includes('/bmi')) tags.push('bmi');
  if (url.includes('/hcp') || url.includes('/doctor')) tags.push('hcp');

  return [...new Set(tags)];
}

/**
 * Calculate change percentage between two hashes
 */
function calculateChangePercentage(oldHash: string, newHash: string): number {
  if (!oldHash || oldHash === newHash) return 0;
  // Since we're comparing hashes, any change is 100%
  // In a real implementation, you'd compare actual content
  return 100;
}

/**
 * Get sitemap statistics for a market
 */
export async function getSitemapStats(market: string): Promise<{
  totalUrls: number;
  articles: number;
  products: number;
  lastUpdated: Date | null;
  oldestPage: Date | null;
  newestPage: Date | null;
}> {
  const config = MARKET_CONFIG[market];
  if (!config) {
    return {
      totalUrls: 0,
      articles: 0,
      products: 0,
      lastUpdated: null,
      oldestPage: null,
      newestPage: null,
    };
  }

  const entries = await fetchSitemap(config.url);
  
  const articles = entries.filter(e => e.contentType === 'article').length;
  const products = entries.filter(e => e.contentType === 'product').length;
  
  const dates = entries
    .map(e => e.publishDate)
    .filter(d => d)
    .sort((a, b) => a!.getTime() - b!.getTime());

  return {
    totalUrls: entries.length,
    articles,
    products,
    lastUpdated: new Date(),
    oldestPage: dates[0] || null,
    newestPage: dates[dates.length - 1] || null,
  };
}