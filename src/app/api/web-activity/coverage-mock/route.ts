import { NextResponse } from 'next/server';
import { MARKET_CONFIG } from '@/lib/firecrawl';

// DEVELOPMENT ONLY - This endpoint should NEVER be used in production
// Mock data is strictly forbidden in production environments
export async function GET() {
  // Block this endpoint in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { 
        error: 'Forbidden',
        message: 'Mock data endpoints are not available in production',
        note: 'Use the real /api/web-activity/coverage endpoint instead'
      },
      { status: 403 }
    );
  }
  
  try {
    // Build mock coverage matrix with realistic-looking data
    const coverage = Object.entries(MARKET_CONFIG).map(([marketKey, config]) => {
      // Core markets should have more content
      const isCore = ['de', 'fr', 'it', 'es', 'ca_en', 'ca_fr'].includes(marketKey);
      const pageCount = isCore ? 15 + Math.floor(Math.random() * 20) : Math.floor(Math.random() * 10);
      
      // Random but realistic data
      const categorizedPages = Math.floor(pageCount * (0.6 + Math.random() * 0.4));
      const summarizedPages = Math.floor(pageCount * (0.5 + Math.random() * 0.4));
      const hasHcpLocator = Math.random() > 0.3;
      const recentlyUpdated = Math.floor(Math.random() * 5);
      const hasRecentActivity = Math.random() > 0.5;
      
      // Calculate health score based on metrics
      let healthScore = 0;
      if (pageCount > 0) healthScore += 30;
      if (pageCount > 10) healthScore += 10;
      healthScore += Math.floor((categorizedPages / Math.max(pageCount, 1)) * 20);
      healthScore += Math.floor((summarizedPages / Math.max(pageCount, 1)) * 20);
      if (hasHcpLocator) healthScore += 10;
      if (hasRecentActivity) healthScore += 10;
      
      // Generate a realistic last crawl time
      const hoursAgo = Math.floor(Math.random() * 72);
      const lastCrawl = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
      
      return {
        market: marketKey.toUpperCase().replace('_', '-'),
        flag: config.flag,
        language: config.language,
        url: config.url,
        timezone: config.timezone,
        pageCount,
        lastCrawl: lastCrawl.toISOString(),
        hasHcpLocator,
        categorizedPages,
        summarizedPages,
        recentlyUpdated,
        hasRecentActivity,
        healthScore: Math.min(100, healthScore),
      };
    });

    // Sort by page count (descending) then alphabetically
    coverage.sort((a, b) => {
      if (b.pageCount !== a.pageCount) return b.pageCount - a.pageCount;
      return a.market.localeCompare(b.market);
    });

    // Calculate summary statistics
    const summary = {
      totalMarkets: coverage.length,
      marketsWithContent: coverage.filter(m => m.pageCount > 0).length,
      marketsWithHcp: coverage.filter(m => m.hasHcpLocator).length,
      totalPages: coverage.reduce((sum, m) => sum + m.pageCount, 0),
      fullyCategorized: coverage.filter(m => 
        m.pageCount > 0 && m.categorizedPages === m.pageCount
      ).length,
      fullySummarized: coverage.filter(m => 
        m.pageCount > 0 && m.summarizedPages === m.pageCount
      ).length,
      lastGlobalUpdate: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
    };

    return NextResponse.json({
      success: true,
      summary,
      coverage,
      timestamp: new Date().toISOString(),
      note: 'This is mock data for demonstration. Connect to production database for real data.',
    });
  } catch (error) {
    console.error('Coverage matrix mock error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate mock coverage matrix',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}