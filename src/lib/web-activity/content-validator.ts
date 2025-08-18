/**
 * Content Validation Utilities for Web Activity Module
 * 
 * Ensures high-quality content in the timeline by filtering out
 * irrelevant, broken, or low-value pages.
 */

import { ContentPage, PageEvent } from '@prisma/client';

/**
 * Patterns that indicate low-quality or irrelevant content
 */
export const EXCLUDED_PATTERNS = {
  // Title patterns to exclude
  titles: [
    '404',
    'not found',
    'error',
    'page not found',
    'oops',
    'coming soon',
    'under construction',
    'maintenance',
    'access denied',
    'forbidden',
    'unauthorized'
  ],
  
  // URL patterns to exclude
  urls: [
    '/404',
    '/error',
    '/admin',
    '/login',
    '/wp-admin',
    '/wp-login',
    '/test',
    '/_next',
    '/api/',
    '/cgi-bin/',
    '/.well-known/',
    '/robots.txt',
    '/sitemap.xml'
  ],
  
  // Content indicators of low quality
  contentIndicators: [
    'lorem ipsum',
    'coming soon',
    'under development',
    'test content',
    'example content'
  ]
};

/**
 * Minimum quality thresholds for content
 */
export const QUALITY_THRESHOLDS = {
  minWordCount: 100,          // Minimum words for meaningful content
  minTitleLength: 10,         // Minimum title character length
  maxTitleLength: 200,        // Maximum title character length
  minDescriptionLength: 20,   // Minimum description length
  maxUrlLength: 500,          // Maximum URL length (likely broken)
};

/**
 * Priority content types that provide marketing insights
 */
export const PRIORITY_CONTENT_TYPES = [
  'article',
  'landing_page',
  'product_page',
  'campaign',
  'blog_post',
  'press_release',
  'news',
  'guide',
  'resource'
];

/**
 * Check if a title indicates low-quality content
 */
export function isExcludedTitle(title: string | null): boolean {
  if (!title) return true;
  
  const lowerTitle = title.toLowerCase();
  return EXCLUDED_PATTERNS.titles.some(pattern => 
    lowerTitle.includes(pattern)
  );
}

/**
 * Check if a URL indicates low-quality content
 */
export function isExcludedUrl(url: string | null): boolean {
  if (!url) return true;
  
  const lowerUrl = url.toLowerCase();
  
  // Check for excluded patterns
  if (EXCLUDED_PATTERNS.urls.some(pattern => lowerUrl.includes(pattern))) {
    return true;
  }
  
  // Check for suspicious URL length
  if (url.length > QUALITY_THRESHOLDS.maxUrlLength) {
    return true;
  }
  
  // Check for file extensions that aren't web pages
  const nonPageExtensions = ['.pdf', '.jpg', '.png', '.gif', '.zip', '.exe'];
  if (nonPageExtensions.some(ext => lowerUrl.endsWith(ext))) {
    return true;
  }
  
  return false;
}

/**
 * Check if content meets minimum quality standards
 */
export function meetsQualityThreshold(content: Partial<ContentPage>): boolean {
  // Must have a title
  if (!content.title || content.title.length < QUALITY_THRESHOLDS.minTitleLength) {
    return false;
  }
  
  // Title shouldn't be too long (likely corrupted)
  if (content.title.length > QUALITY_THRESHOLDS.maxTitleLength) {
    return false;
  }
  
  // Should have meaningful word count
  if (content.wordCount && content.wordCount < QUALITY_THRESHOLDS.minWordCount) {
    return false;
  }
  
  // Check for test content indicators
  if (content.textContent) {
    const lowerContent = content.textContent.toLowerCase();
    if (EXCLUDED_PATTERNS.contentIndicators.some(indicator => 
      lowerContent.includes(indicator)
    )) {
      return false;
    }
  }
  
  return true;
}

/**
 * Validate content before storing in database
 */
export function validateContentForStorage(content: Partial<ContentPage>): {
  isValid: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  
  // Check URL
  if (!content.url) {
    reasons.push('Missing URL');
  } else if (isExcludedUrl(content.url)) {
    reasons.push('URL matches exclusion pattern');
  }
  
  // Check title
  if (!content.title) {
    reasons.push('Missing title');
  } else if (isExcludedTitle(content.title)) {
    reasons.push('Title indicates low-quality content');
  }
  
  // Check quality thresholds
  if (!meetsQualityThreshold(content)) {
    reasons.push('Content does not meet quality thresholds');
  }
  
  // Check market
  if (!content.market) {
    reasons.push('Missing market identifier');
  }
  
  // Should have at least one summary
  if (!content.summary && !content.summaryEn) {
    reasons.push('Missing content summary');
  }
  
  return {
    isValid: reasons.length === 0,
    reasons
  };
}

/**
 * Validate event before displaying in timeline
 */
export function validateEventForTimeline(event: Partial<PageEvent>): boolean {
  // Must have basic required fields
  if (!event.eventType || !event.eventAt) {
    return false;
  }
  
  // Check if title is excluded
  if (event.title && isExcludedTitle(event.title)) {
    return false;
  }
  
  // Check if URL is excluded
  if (event.url && isExcludedUrl(event.url)) {
    return false;
  }
  
  // Pattern and alert events are always valid (they're system-generated)
  if (event.eventType === 'pattern' || event.eventType === 'alert') {
    return true;
  }
  
  return true;
}

/**
 * Calculate content quality score (0-100)
 */
export function calculateQualityScore(content: Partial<ContentPage>): number {
  let score = 0;
  const weights = {
    hasTitle: 20,
    hasDescription: 15,
    hasPublishDate: 15,
    hasSummaryEn: 20,
    hasGoodWordCount: 15,
    isPriorityType: 15
  };
  
  // Has title
  if (content.title && content.title.length > QUALITY_THRESHOLDS.minTitleLength) {
    score += weights.hasTitle;
  }
  
  // Has description
  if (content.description && content.description.length > QUALITY_THRESHOLDS.minDescriptionLength) {
    score += weights.hasDescription;
  }
  
  // Has publish date
  if (content.publishDate) {
    score += weights.hasPublishDate;
  }
  
  // Has English summary
  if (content.summaryEn && content.summaryEn.length > 50) {
    score += weights.hasSummaryEn;
  }
  
  // Has good word count
  if (content.wordCount && content.wordCount > 300) {
    score += weights.hasGoodWordCount;
  }
  
  // Is priority content type
  if (content.contentType && PRIORITY_CONTENT_TYPES.includes(content.contentType)) {
    score += weights.isPriorityType;
  }
  
  return Math.min(100, score);
}

/**
 * Build Prisma where clause for filtering low-quality content
 */
export function buildQualityFilterClause() {
  return {
    NOT: [
      // Exclude by title patterns
      ...EXCLUDED_PATTERNS.titles.map(pattern => ({
        title: { contains: pattern, mode: 'insensitive' as const }
      })),
      // Exclude by URL patterns
      ...EXCLUDED_PATTERNS.urls.map(pattern => ({
        url: { contains: pattern }
      })),
      // Exclude content with very low word count
      { wordCount: { lt: QUALITY_THRESHOLDS.minWordCount } }
    ],
    // Ensure has minimum required fields
    AND: [
      { title: { not: null } },
      { url: { not: null } }
    ]
  };
}

/**
 * Sort events by relevance and quality
 */
export function sortEventsByRelevance(events: Array<{
  type?: string;
  impact?: string;
  changePercent?: number;
  timestamp: string;
}>): typeof events {
  return events.sort((a, b) => {
    // Patterns and alerts first
    if (a.type === 'pattern' || a.type === 'alert') return -1;
    if (b.type === 'pattern' || b.type === 'alert') return 1;
    
    // Then by impact
    const impactOrder = { high: 3, medium: 2, low: 1, undefined: 0 };
    const impactDiff = (impactOrder[a.impact] || 0) - (impactOrder[b.impact] || 0);
    if (impactDiff !== 0) return -impactDiff;
    
    // Then by change percentage
    if (a.changePercent && b.changePercent) {
      return b.changePercent - a.changePercent;
    }
    
    // Finally by timestamp (most recent first)
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
}

/**
 * Group similar events for pattern detection
 */
export function groupSimilarEvents(events: Array<{
  market: string;
  type: string;
  timestamp: string;
  title?: string;
}>): Map<string, typeof events> {
  const groups = new Map<string, typeof events>();
  
  events.forEach(event => {
    // Group by market and event type
    const key = `${event.market}-${event.type}`;
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(event);
  });
  
  return groups;
}

/**
 * Detect cross-market patterns
 */
export function detectCrossMarketPatterns(events: Array<{
  market: string;
  type: string;
  timestamp: string;
  title: string;
}>): {
  hasPattern: boolean;
  patternType?: string;
  affectedMarkets?: string[];
  confidence?: number;
} {
  const marketGroups = groupSimilarEvents(events);
  
  // Check for simultaneous updates across multiple markets
  const recentThreshold = 60 * 60 * 1000; // 1 hour
  const now = Date.now();
  
  const recentMarkets = new Set<string>();
  events.forEach(event => {
    const eventTime = new Date(event.timestamp).getTime();
    if (now - eventTime < recentThreshold) {
      recentMarkets.add(event.market);
    }
  });
  
  if (recentMarkets.size >= 3) {
    return {
      hasPattern: true,
      patternType: 'simultaneous_update',
      affectedMarkets: Array.from(recentMarkets),
      confidence: Math.min(0.9, recentMarkets.size * 0.2)
    };
  }
  
  // Check for similar content patterns
  const similarTitles = events.filter((event, index) => {
    return events.some((other, otherIndex) => {
      if (index === otherIndex || event.market === other.market) return false;
      
      // Simple similarity check (could be enhanced with better algorithms)
      const similarity = calculateTitleSimilarity(event.title, other.title);
      return similarity > 0.7;
    });
  });
  
  if (similarTitles.length >= 3) {
    return {
      hasPattern: true,
      patternType: 'similar_content',
      affectedMarkets: [...new Set(similarTitles.map(e => e.market))],
      confidence: 0.75
    };
  }
  
  return { hasPattern: false };
}

/**
 * Calculate similarity between two titles (simple implementation)
 */
function calculateTitleSimilarity(title1: string, title2: string): number {
  if (!title1 || !title2) return 0;
  
  const words1 = title1.toLowerCase().split(/\s+/);
  const words2 = title2.toLowerCase().split(/\s+/);
  
  const commonWords = words1.filter(word => words2.includes(word));
  const similarity = (commonWords.length * 2) / (words1.length + words2.length);
  
  return similarity;
}