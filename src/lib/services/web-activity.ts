import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { getMarketFromUrl, getLanguageFromUrl, type CrawlResult } from '../firecrawl';

const prisma = new PrismaClient();

/**
 * Store or update a crawled page in the database
 */
export async function storeCrawlResult(result: CrawlResult & { publishDate?: Date }) {
  const url = result.url;
  const urlObj = new URL(url);
  const domain = urlObj.hostname;
  const path = urlObj.pathname;
  const market = getMarketFromUrl(url);
  const language = getLanguageFromUrl(url);
  
  // Generate content hash for change detection
  const contentHash = crypto
    .createHash('sha256')
    .update(result.content || '')
    .digest('hex');
  
  // Check if page exists
  const existingPage = await prisma.contentPage.findUnique({
    where: { url },
  });
  
  let changePct = 0;
  let eventType: 'created' | 'updated' | null = null;
  
  if (existingPage) {
    // Calculate change percentage if content changed
    if (existingPage.changeHash !== contentHash) {
      const oldContent = existingPage.textContent || '';
      const newContent = result.content || '';
      changePct = calculateChangePercentage(oldContent, newContent);
      eventType = 'updated';
    }
  } else {
    eventType = 'created';
  }
  
  // Store or update the page
  const page = await prisma.contentPage.upsert({
    where: { url },
    create: {
      url,
      domain,
      path,
      market,
      language,
      title: result.title,
      description: result.description,
      rawHtml: result.html?.substring(0, 65535), // Limit HTML size
      textContent: result.content,
      wordCount: result.content?.split(/\s+/).length || 0,
      tags: extractTags(result),
      isArticle: isArticlePage(url, result),
      source: 'firecrawl',
      lastCrawledAt: new Date(),
      lastModifiedAt: new Date(),
      changeHash: contentHash,
      changePct,
      // @ts-expect-error - publishDate column might not exist yet
      publishDate: result.publishDate || null,
    },
    update: {
      title: result.title,
      description: result.description,
      rawHtml: result.html?.substring(0, 65535),
      textContent: result.content,
      wordCount: result.content?.split(/\s+/).length || 0,
      tags: extractTags(result),
      lastCrawledAt: new Date(),
      lastModifiedAt: existingPage?.changeHash !== contentHash ? new Date() : existingPage.lastModifiedAt,
      changeHash: contentHash,
      changePct,
      updatedAt: new Date(),
      // @ts-expect-error - publishDate column might not exist yet
      publishDate: result.publishDate || null,
    },
  });
  
  // Create event if there was a change
  if (eventType) {
    await prisma.pageEvent.create({
      data: {
        pageId: page.id,
        url,
        eventType,
        market,
        language,
        title: result.title,
        changePct,
        eventAt: new Date(),
      },
    });
  }
  
  return page;
}

/**
 * Calculate percentage of change between two texts
 */
function calculateChangePercentage(oldText: string, newText: string): number {
  if (!oldText || !newText) return 100;
  
  const oldWords = oldText.split(/\s+/);
  const newWords = newText.split(/\s+/);
  
  const added = newWords.filter(w => !oldWords.includes(w)).length;
  const removed = oldWords.filter(w => !newWords.includes(w)).length;
  
  const totalChanges = added + removed;
  const totalWords = Math.max(oldWords.length, newWords.length);
  
  return Math.round((totalChanges / totalWords) * 100);
}

/**
 * Extract tags from crawl result
 */
function extractTags(result: CrawlResult): string[] {
  const tags: string[] = [];
  
  // Extract from metadata keywords
  if (result.metadata?.keywords) {
    tags.push(...result.metadata.keywords.split(',').map(k => k.trim()));
  }
  
  // Extract medication names if mentioned
  const medications = ['wegovy', 'mounjaro', 'ozempic', 'saxenda', 'zepbound'];
  const content = (result.content || '').toLowerCase();
  
  medications.forEach(med => {
    if (content.includes(med)) {
      tags.push(med);
    }
  });
  
  // Add page type tags
  if (isArticlePage(result.url, result)) tags.push('article');
  if (result.url.includes('/blog')) tags.push('blog');
  if (result.url.includes('/news')) tags.push('news');
  if (result.url.includes('/about')) tags.push('about');
  if (result.url === '/' || result.url.endsWith('.com') || result.url.endsWith('.global')) {
    tags.push('homepage');
  }
  
  return [...new Set(tags)]; // Remove duplicates
}

/**
 * Determine if a page is an article
 */
function isArticlePage(url: string, result: CrawlResult): boolean {
  // Check URL patterns
  if (url.includes('/blog/') || url.includes('/news/') || url.includes('/article/')) {
    return true;
  }
  
  // Check content length (articles are usually longer)
  if ((result.content?.length || 0) > 2000) {
    return true;
  }
  
  // Check for article schema
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((result.metadata as any)?.['og:type'] === 'article') {
    return true;
  }
  
  return false;
}

/**
 * Get recent page events
 */
export async function getRecentEvents(
  filters: {
    market?: string;
    language?: string;
    eventType?: 'created' | 'updated';
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  } = {}
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  
  if (filters.market) where.market = filters.market;
  if (filters.language) where.language = filters.language;
  if (filters.eventType) where.eventType = filters.eventType;
  
  if (filters.startDate || filters.endDate) {
    where.eventAt = {};
    if (filters.startDate) where.eventAt.gte = filters.startDate;
    if (filters.endDate) where.eventAt.lte = filters.endDate;
  }
  
  return prisma.pageEvent.findMany({
    where,
    orderBy: { eventAt: 'desc' },
    take: filters.limit || 100,
    include: {
      page: {
        select: {
          id: true,
          url: true,
          title: true,
          description: true,
          market: true,
          language: true,
          wordCount: true,
          tags: true,
          summary: true,
          summaryEn: true,
          category: true,
          subcategory: true,
          isArticle: true,
          changePct: true,
          // @ts-expect-error - publishDate column might not exist yet
          publishDate: true,
        },
      },
    },
  });
}

/**
 * Get statistics for web activity
 */
export async function getWebActivityStats(
  filters: {
    market?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (filters.market) where.market = filters.market;
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const eventWhere: any = {};
  if (filters.market) eventWhere.market = filters.market;
  if (filters.startDate || filters.endDate) {
    eventWhere.eventAt = {};
    if (filters.startDate) eventWhere.eventAt.gte = filters.startDate;
    if (filters.endDate) eventWhere.eventAt.lte = filters.endDate;
  }
  
  // Get counts
  const [totalPages, totalEvents, createdCount, updatedCount] = await Promise.all([
    prisma.contentPage.count({ where }),
    prisma.pageEvent.count({ where: eventWhere }),
    prisma.pageEvent.count({ where: { ...eventWhere, eventType: 'created' } }),
    prisma.pageEvent.count({ where: { ...eventWhere, eventType: 'updated' } }),
  ]);
  
  // Get events by day for the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const dailyEvents = await prisma.pageEvent.groupBy({
    by: ['eventType'],
    where: {
      ...eventWhere,
      eventAt: { gte: thirtyDaysAgo },
    },
    _count: true,
  });
  
  return {
    totalPages,
    totalEvents,
    createdCount,
    updatedCount,
    last30Days: {
      created: dailyEvents.find(e => e.eventType === 'created')?._count || 0,
      updated: dailyEvents.find(e => e.eventType === 'updated')?._count || 0,
    },
  };
}

/**
 * Search pages by content or title
 */
export async function searchPages(
  query: string,
  filters: {
    market?: string;
    language?: string;
    tags?: string[];
    limit?: number;
  } = {}
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    OR: [
      { title: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
      { textContent: { contains: query, mode: 'insensitive' } },
    ],
  };
  
  if (filters.market) where.market = filters.market;
  if (filters.language) where.language = filters.language;
  if (filters.tags && filters.tags.length > 0) {
    where.tags = { hasSome: filters.tags };
  }
  
  return prisma.contentPage.findMany({
    where,
    orderBy: { lastModifiedAt: 'desc' },
    take: filters.limit || 50,
    select: {
      id: true,
      url: true,
      title: true,
      description: true,
      market: true,
      language: true,
      wordCount: true,
      tags: true,
      lastModifiedAt: true,
      changePct: true,
    },
  });
}

/**
 * Store multiple page content results (for enhanced crawl)
 */
export async function storePageContent(results: Array<CrawlResult & {
  market?: string;
  language?: string;
  summary?: string;
  summaryEn?: string;
  category?: string;
  subcategory?: string;
  signals?: Record<string, unknown>;
  hasHcpLocator?: boolean;
  publishDate?: Date;
}>) {
  const storedPages = [];
  
  for (const result of results) {
    try {
      const page = await storeCrawlResult(result);
      
      // Update with enhanced fields if present (only if columns exist)
      // TODO: Remove this check after migration is run
      if (result.summary || result.summaryEn || result.category) {
        try {
          await prisma.contentPage.update({
            where: { id: page.id },
            data: {
              summary: result.summary,
              summaryEn: result.summaryEn,
              category: result.category,
              subcategory: result.subcategory,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              signals: result.signals as any,
              hasHcpLocator: result.hasHcpLocator,
            },
          });
        } catch (updateError) {
          console.log('Enhanced fields not yet available in database:', updateError);
          // Continue without enhanced fields - basic crawl still works
        }
      }
      
      storedPages.push(page);
    } catch (error) {
      console.error('Failed to store page content:', error);
    }
  }
  
  return storedPages;
}

const webActivityExports = {
  storeCrawlResult,
  storePageContent,
  getRecentEvents,
  getWebActivityStats,
  searchPages,
};

export default webActivityExports;