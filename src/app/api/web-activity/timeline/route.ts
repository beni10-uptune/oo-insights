import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getMarketDisplay } from '@/lib/constants/markets';
import { 
  buildQualityFilterClause, 
  validateEventForTimeline,
  sortEventsByRelevance,
  detectCrossMarketPatterns
} from '@/lib/web-activity/content-validator';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '7d';
    const markets = searchParams.get('markets')?.split(',').filter(Boolean) || [];
    const eventTypes = searchParams.get('eventTypes')?.split(',').filter(Boolean) || [];
    const searchQuery = searchParams.get('search') || '';
    const minChange = parseInt(searchParams.get('minChange') || '0');

    // Calculate date range
    const startDate = new Date();
    switch (timeRange) {
      case '24h':
        startDate.setHours(startDate.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
    }

    // Build where clause with quality filters
    const baseFilters = buildQualityFilterClause();
    const where: Record<string, unknown> = {
      ...baseFilters,
      eventAt: { gte: startDate }
    };

    if (markets.length > 0) {
      where.market = { in: markets };
    }

    if (eventTypes.length > 0) {
      where.eventType = { in: eventTypes };
    }

    if (searchQuery) {
      where.OR = [
        { title: { contains: searchQuery, mode: 'insensitive' } },
        { summary: { contains: searchQuery, mode: 'insensitive' } },
        { url: { contains: searchQuery, mode: 'insensitive' } }
      ];
    }

    if (minChange > 0) {
      where.changePct = { gte: minChange };
    }

    // Fetch events from database
    const dbEvents = await prisma.pageEvent.findMany({
      where,
      orderBy: { eventAt: 'desc' },
      take: 100, // Limit to 100 events
      include: {
        page: {
          select: {
            title: true,
            description: true,
            tags: true,
            wordCount: true,
            summaryEn: true, // Always use English summary
            publishDate: true, // Get actual publish date from sitemap
            language: true, // Include language field
          }
        }
      }
    });

    // Transform and validate events for timeline
    const timelineEvents = dbEvents
      .filter(event => validateEventForTimeline(event))
      .map(event => {
      // Determine impact based on change percentage
      let impact: 'high' | 'medium' | 'low' = 'low';
      if (event.changePct && event.changePct > 50) impact = 'high';
      else if (event.changePct && event.changePct > 20) impact = 'medium';

      return {
        id: event.id,
        type: event.eventType as 'created' | 'updated' | 'pattern' | 'alert',
        // Use actual publish date if available, otherwise use event date
        timestamp: event.page?.publishDate?.toISOString() || event.eventAt.toISOString(),
        publishedAt: event.page?.publishDate?.toISOString(),
        crawledAt: event.eventAt.toISOString(),
        market: event.market || 'unknown',
        marketName: getMarketDisplay(event.market || ''),
        title: event.title || event.page?.title || 'Content Update',
        // ALWAYS prioritize English summary
        description: event.page?.summaryEn || event.page?.description || event.summary || 'Content update detected',
        originalLanguage: event.language || event.page?.language,
        url: event.url,
        changePercent: event.changePct,
        tags: event.page?.tags || [],
        impact,
        relatedCount: 0 // Will be calculated if needed
      };
    });

    // Add pattern detection events (AI insights)
    if (timelineEvents.length > 5) {
      // Group events by market to detect patterns
      const marketGroups: { [key: string]: typeof timelineEvents } = {};
      timelineEvents.forEach(event => {
        if (!marketGroups[event.market]) {
          marketGroups[event.market] = [];
        }
        marketGroups[event.market].push(event);
      });

      // Check for cross-market patterns
      const patterns: typeof timelineEvents = [];
      
      // Pattern 1: Multiple markets updating similar content
      const marketUpdateCounts = Object.entries(marketGroups)
        .filter(([, events]) => events.length > 3)
        .map(([market, events]) => ({
          market,
          count: events.length
        }));

      if (marketUpdateCounts.length > 2) {
        patterns.push({
          id: 'pattern-1',
          type: 'pattern' as const,
          timestamp: new Date().toISOString(),
          publishedAt: undefined,
          crawledAt: new Date().toISOString(),
          market: 'all',
          marketName: 'Cross-Market',
          title: 'Coordinated Content Update Detected',
          description: `${marketUpdateCounts.length} markets showing increased activity. This could indicate a coordinated campaign rollout.`,
          originalLanguage: null,
          url: null,
          changePercent: null,
          impact: 'high' as const,
          relatedCount: marketUpdateCounts.reduce((sum, m) => sum + m.count, 0),
          tags: ['insight', 'pattern', 'cross-market']
        });
      }

      // Pattern 2: Unusual activity spike
      const recentEvents = timelineEvents.filter(e => {
        const eventTime = new Date(e.timestamp);
        const hourAgo = new Date();
        hourAgo.setHours(hourAgo.getHours() - 1);
        return eventTime > hourAgo;
      });

      if (recentEvents.length > 10) {
        patterns.push({
          id: 'pattern-2',
          type: 'alert' as const,
          timestamp: new Date().toISOString(),
          publishedAt: undefined,
          crawledAt: new Date().toISOString(),
          market: 'all',
          marketName: 'All Markets',
          title: 'Unusual Activity Spike',
          description: `${recentEvents.length} events in the last hour. This is ${Math.round(recentEvents.length / 2)}x higher than average.`,
          originalLanguage: null,
          url: null,
          changePercent: null,
          impact: 'medium' as const,
          relatedCount: recentEvents.length,
          tags: ['alert', 'spike', 'monitoring']
        });
      }

      // Add patterns to timeline
      timelineEvents.unshift(...patterns);
    }

    // Sort by relevance and quality
    const sortedEvents = sortEventsByRelevance(timelineEvents);
    
    // Detect additional patterns if we have enough data
    const patternDetection = detectCrossMarketPatterns(sortedEvents);
    if (patternDetection.hasPattern && sortedEvents.length > 10) {
      console.log('Cross-market pattern detected:', patternDetection);
    }

    return NextResponse.json({
      success: true,
      events: sortedEvents,
      total: sortedEvents.length,
      timeRange,
      filters: {
        markets,
        eventTypes,
        searchQuery,
        minChange
      }
    });

  } catch (error) {
    console.error('Error fetching timeline:', error);
    return NextResponse.json(
      { error: 'Failed to fetch timeline events' },
      { status: 500 }
    );
  }
}