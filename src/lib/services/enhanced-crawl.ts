import { MARKET_CONFIG, scrapeUrl, crawlWebsite } from '@/lib/firecrawl';
import { storePageContent } from '@/lib/services/web-activity';
import { summarizeContent, classifyContent } from '@/lib/services/ai-analysis';

interface CrawlMarketOptions {
  market: string;
  limit?: number;
  depth?: number;
  summarize?: boolean;
  classify?: boolean;
}

interface MarketCrawlResult {
  market: string;
  pagesFound: number;
  pagesProcessed: number;
  errors: string[];
  timestamp: Date;
}

/**
 * Enhanced crawl function for a specific market with path restrictions
 */
export async function crawlMarket({
  market,
  limit = 50,
  depth = 3,
  summarize = true,
  classify = true,
}: CrawlMarketOptions): Promise<MarketCrawlResult> {
  const result: MarketCrawlResult = {
    market,
    pagesFound: 0,
    pagesProcessed: 0,
    errors: [],
    timestamp: new Date(),
  };

  try {
    const config = MARKET_CONFIG[market];
    if (!config) {
      throw new Error(`Unknown market: ${market}`);
    }

    console.log(`Starting enhanced crawl for ${market} (${config.flag})`);
    console.log(`URL: ${config.url}`);
    console.log(`Language: ${config.language}`);
    
    // Configure crawl options based on market
    const crawlOptions = {
      limit,
      maxDepth: depth,
      includePaths: config.allowedPaths,
      excludePaths: [
        '/api/*',
        '/admin/*',
        '*.pdf',
        '*.zip',
        '*.doc*',
        '*.xls*',
        '*.ppt*',
      ],
    };

    // For global subdomain markets, use targeted scraping
    if (config.allowedPaths && config.allowedPaths.length > 0) {
      // Scrape specific pages for markets on global domain
      const targetUrl = config.url;
      console.log(`Scraping specific page for ${market}: ${targetUrl}`);
      
      const pageData = await scrapeUrl(targetUrl);
      if (pageData) {
        result.pagesFound = 1;
        
        // Process the page
        const processedData = {
          ...pageData,
          market,
          language: config.language,
        };

        // Add AI enhancements if enabled
        if (summarize && pageData.content) {
          try {
            const summary = await summarizeContent(pageData.content, config.language);
            processedData.summary = summary.original;
            processedData.summaryEn = summary.english;
          } catch (error) {
            console.error(`Failed to summarize content for ${market}:`, error);
            result.errors.push(`Summarization failed: ${error}`);
          }
        }

        if (classify && pageData.content) {
          try {
            const classification = await classifyContent(pageData.content);
            processedData.category = classification.category;
            processedData.subcategory = classification.subcategory;
            processedData.signals = classification.signals;
          } catch (error) {
            console.error(`Failed to classify content for ${market}:`, error);
            result.errors.push(`Classification failed: ${error}`);
          }
        }

        // Store in database
        await storePageContent([processedData]);
        result.pagesProcessed = 1;
      }
    } else {
      // Full site crawl for dedicated market domains
      const crawlResults = await crawlWebsite(config.url, crawlOptions);
      result.pagesFound = crawlResults.length;

      // Process each page
      for (const page of crawlResults) {
        try {
          const processedData = {
            ...page,
            market,
            language: config.language,
          };

          // Add AI enhancements if enabled
          if (summarize && page.content) {
            try {
              const summary = await summarizeContent(page.content, config.language);
              processedData.summary = summary.original;
              processedData.summaryEn = summary.english;
            } catch (error) {
              console.error(`Failed to summarize page ${page.url}:`, error);
              result.errors.push(`Summarization failed for ${page.url}`);
            }
          }

          if (classify && page.content) {
            try {
              const classification = await classifyContent(page.content);
              processedData.category = classification.category;
              processedData.subcategory = classification.subcategory;
              processedData.signals = classification.signals;
              processedData.hasHcpLocator = classification.hasHcpLocator;
            } catch (error) {
              console.error(`Failed to classify page ${page.url}:`, error);
              result.errors.push(`Classification failed for ${page.url}`);
            }
          }

          // Store in database
          await storePageContent([processedData]);
          result.pagesProcessed++;
        } catch (error) {
          console.error(`Failed to process page ${page.url}:`, error);
          result.errors.push(`Processing failed for ${page.url}: ${error}`);
        }
      }
    }

    console.log(`Completed crawl for ${market}: ${result.pagesProcessed}/${result.pagesFound} pages`);
  } catch (error) {
    console.error(`Crawl failed for ${market}:`, error);
    result.errors.push(`Crawl failed: ${error}`);
  }

  return result;
}

/**
 * Crawl all EUCAN markets in parallel batches
 */
export async function crawlAllEucanMarkets(
  options: Partial<CrawlMarketOptions> = {}
): Promise<Record<string, MarketCrawlResult>> {
  const markets = Object.keys(MARKET_CONFIG);
  const results: Record<string, MarketCrawlResult> = {};
  
  // Process markets in batches to avoid overwhelming the API
  const batchSize = 5;
  for (let i = 0; i < markets.length; i += batchSize) {
    const batch = markets.slice(i, i + batchSize);
    
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1}: ${batch.join(', ')}`);
    
    const batchPromises = batch.map(market => 
      crawlMarket({ ...options, market }).catch(error => ({
        market,
        pagesFound: 0,
        pagesProcessed: 0,
        errors: [`Fatal error: ${error}`],
        timestamp: new Date(),
      }))
    );
    
    const batchResults = await Promise.all(batchPromises);
    
    for (const result of batchResults) {
      results[result.market] = result;
    }
    
    // Add a small delay between batches to be respectful to the API
    if (i + batchSize < markets.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  return results;
}

/**
 * Get coverage matrix for all markets
 */
export async function getMarketCoverage(): Promise<{
  markets: Array<{
    market: string;
    flag: string;
    language: string;
    url: string;
    lastCrawl: Date | null;
    pageCount: number;
    hasNewContent: boolean;
    hasHcpLocator: boolean;
  }>;
  totalPages: number;
  marketsWithContent: number;
  lastUpdate: Date | null;
}> {
  // This would query the database for coverage information
  // Implementation depends on your Prisma schema
  const markets = [];
  let totalPages = 0;
  let marketsWithContent = 0;
  const lastUpdate = null;

  for (const [market, config] of Object.entries(MARKET_CONFIG)) {
    // Query database for this market's stats
    // This is a placeholder - implement with actual Prisma queries
    const marketData = {
      market,
      flag: config.flag,
      language: config.language,
      url: config.url,
      lastCrawl: null,
      pageCount: 0,
      hasNewContent: false,
      hasHcpLocator: false,
    };
    
    markets.push(marketData);
    
    if (marketData.pageCount > 0) {
      marketsWithContent++;
      totalPages += marketData.pageCount;
    }
  }

  return {
    markets,
    totalPages,
    marketsWithContent,
    lastUpdate,
  };
}