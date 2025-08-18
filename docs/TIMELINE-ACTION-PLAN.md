# Web Activity Timeline - Implementation Action Plan

**Created:** August 17, 2025  
**Status:** Ready for Implementation  
**Database:** Fully harmonized with existing PostgreSQL schema  

---

## 🎯 Executive Summary

This action plan delivers a streamlined approach to fix the Web Activity Timeline's critical issues while leveraging existing infrastructure. All changes build upon current database schema, AI services, and cron jobs - no new infrastructure required.

**Core Philosophy:** Fix what's broken, enhance what works, remove duplicates.

---

## 📊 Current State Analysis

### ✅ What's Already Working
- **Database Schema:** ContentPage, PageEvent, Market tables fully configured
- **AI Service:** Gemini Flash 2.5 already integrated in `simple-ai.ts`
- **Daily Crawl:** Vercel Cron running at 9 AM CET
- **Export System:** CSV, JSON, and LLM context formats working
- **Timeline UI:** Component structure and filtering in place

### 🔴 Critical Gaps
1. **English summaries not displayed** (field exists but not used)
2. **Wrong dates shown** (using crawl time instead of publishDate)
3. **Insufficient crawl depth** (25 pages when we need 50+)
4. **No pattern detection** (logic exists but not activated)

---

## 🚀 Phase 1: Critical Fixes (Days 1-3)

### Task 1.1: Fix English Display (Day 1 Morning)
**File:** `/api/web-activity/timeline/route.ts`
```typescript
// Line 92: Change from
description: event.page?.summaryEn || event.summary || event.page?.description || 'Page content has been updated',
// To:
description: event.page?.summaryEn || event.page?.summary || event.summary || 'Content update detected',
```

**File:** `EnhancedTimeline.tsx`
```typescript
// Line 419: Add language indicator
<div className="flex items-center gap-2">
  <Badge variant="outline" className="text-xs">
    {getMarketFlag(event.market)} {event.language?.toUpperCase()}
  </Badge>
  <p className="text-xs text-gray-600">
    {event.description} {/* This now shows English */}
  </p>
</div>
```

**Validation:**
```bash
# Test the endpoint
curl http://localhost:3000/api/web-activity/timeline?markets=fr
# Verify summaryEn appears in description field
```

### Task 1.2: Fix Date Display (Day 1 Afternoon)
**File:** `/api/web-activity/timeline/route.ts`
```typescript
// Line 88: Change from
timestamp: event.eventAt.toISOString(),
// To:
timestamp: event.page?.publishDate?.toISOString() || event.eventAt.toISOString(),
publishedAt: event.page?.publishDate?.toISOString(),
crawledAt: event.eventAt.toISOString(),
```

**File:** `EnhancedTimeline.tsx`
```typescript
// Line 434: Update display
<span className="flex items-center gap-1">
  <Clock className="h-3 w-3" />
  Published {formatTimeAgo(event.publishedAt || event.timestamp)}
  {event.crawledAt && event.publishedAt !== event.crawledAt && (
    <span className="text-xs text-gray-400">
      • Checked {formatTimeAgo(event.crawledAt)}
    </span>
  )}
</span>
```

### Task 1.3: Increase Crawl Depth (Day 2 Morning)
**File:** `/api/cron/daily-crawl/route.ts`
```typescript
// Line 42: Change from
limit: 25, // Reasonable limit for daily crawl
// To:
limit: 50, // Comprehensive coverage for core markets
```

**File:** `/api/crawl/all-markets/route.ts`
```typescript
// Add prioritization for core markets
const CORE_MARKETS = ['uk', 'it', 'es', 'fr', 'de', 'pl', 'ca'];
const coreFirst = markets.sort((a, b) => {
  const aCore = CORE_MARKETS.includes(a) ? 0 : 1;
  const bCore = CORE_MARKETS.includes(b) ? 0 : 1;
  return aCore - bCore;
});
```

### Task 1.4: Ensure English Summaries Exist (Day 2 Afternoon)
**Script:** Create `/scripts/backfill-english-summaries.ts`
```typescript
import { prisma } from '@/lib/db';
import { summarizeContent } from '@/lib/services/simple-ai';

async function backfillEnglishSummaries() {
  const pages = await prisma.contentPage.findMany({
    where: {
      summaryEn: null,
      textContent: { not: null }
    },
    take: 100
  });

  for (const page of pages) {
    if (!page.textContent) continue;
    
    try {
      const result = await summarizeContent(
        page.textContent.substring(0, 5000),
        page.language || 'en'
      );
      
      await prisma.contentPage.update({
        where: { id: page.id },
        data: { 
          summaryEn: result.english,
          summary: result.original
        }
      });
      
      console.log(`✅ Updated ${page.url}`);
    } catch (error) {
      console.error(`❌ Failed ${page.url}:`, error);
    }
  }
}

// Run with: npx tsx scripts/backfill-english-summaries.ts
```

---

## 🎨 Phase 2: UX Enhancements (Days 3-5)

### Task 2.1: Add Market Health Indicators (Day 3)
**Create:** `/components/web-activity/MarketHealthIndicator.tsx`
```typescript
export function MarketHealthIndicator({ market }: { market: string }) {
  const [health, setHealth] = useState<'healthy' | 'warning' | 'critical'>('healthy');
  
  useEffect(() => {
    // Check last crawl time and page count
    fetch(`/api/web-activity/health?market=${market}`)
      .then(res => res.json())
      .then(data => {
        if (data.pageCount < 10) setHealth('critical');
        else if (data.hoursSinceLastCrawl > 48) setHealth('warning');
        else setHealth('healthy');
      });
  }, [market]);
  
  const colors = {
    healthy: 'bg-green-500',
    warning: 'bg-yellow-500',
    critical: 'bg-red-500'
  };
  
  return <div className={`w-2 h-2 rounded-full ${colors[health]}`} />;
}
```

### Task 2.2: Smart Event Grouping (Day 4)
**File:** `/api/web-activity/timeline/route.ts`
```typescript
// Add after line 100
function groupSimilarEvents(events: TimelineEvent[]) {
  const groups: Map<string, TimelineEvent[]> = new Map();
  
  events.forEach(event => {
    // Group by similar title (using Levenshtein distance)
    const groupKey = findSimilarGroup(event.title, groups);
    if (groupKey) {
      groups.get(groupKey)!.push(event);
    } else {
      groups.set(event.title, [event]);
    }
  });
  
  // Create grouped events
  return Array.from(groups.entries()).map(([title, items]) => {
    if (items.length >= 3) {
      return {
        id: `group-${items[0].id}`,
        type: 'campaign' as const,
        title: `Campaign: ${title}`,
        description: `Coordinated update across ${items.length} markets`,
        markets: items.map(i => i.market),
        timestamp: items[0].timestamp,
        impact: 'high' as const,
        relatedEvents: items
      };
    }
    return items;
  }).flat();
}
```

### Task 2.3: Enhanced LLM Export (Day 5)
**File:** `/api/web-activity/export/route.ts`
```typescript
// Add new export option for full site context
if (format === 'llm-site') {
  // Export entire site structure for LLM analysis
  const siteStructure = await prisma.contentPage.groupBy({
    by: ['category', 'contentType'],
    where: { market },
    _count: true
  });
  
  const keyPages = await prisma.contentPage.findMany({
    where: { 
      market,
      OR: [
        { path: '/' },
        { contentType: 'tool' },
        { hasHcpLocator: true }
      ]
    },
    select: {
      url: true,
      title: true,
      summaryEn: true,
      category: true,
      contentType: true,
      hasHcpLocator: true,
      wordCount: true
    }
  });
  
  const context = `
# Complete Site Analysis: ${market}

## Site Structure
${siteStructure.map(s => `- ${s.category}/${s.contentType}: ${s._count} pages`).join('\n')}

## Key Pages
${keyPages.map(p => `
### ${p.title}
- URL: ${p.url}
- Type: ${p.contentType}
- Category: ${p.category}
- HCP Locator: ${p.hasHcpLocator ? 'Yes' : 'No'}
- Summary: ${p.summaryEn}
`).join('\n')}

## Recent Activity
[Include last 30 days of changes...]
`;
  
  return new NextResponse(context, {
    headers: {
      'Content-Type': 'text/plain',
      'Content-Disposition': `attachment; filename="${market}-site-context.txt"`
    }
  });
}
```

---

## 📈 Phase 3: Intelligence Layer (Days 6-8)

### Task 3.1: Pattern Detection Service (Day 6)
**Create:** `/lib/services/pattern-detection.ts`
```typescript
import { prisma } from '@/lib/db';

export async function detectPatterns() {
  // 1. Cross-market campaigns
  const recentEvents = await prisma.pageEvent.findMany({
    where: {
      eventAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) }
    },
    include: { page: true }
  });
  
  // 2. Group by similar content
  const patterns = [];
  
  // 3. Detect coordinated launches
  const marketGroups = groupBy(recentEvents, 'market');
  if (Object.keys(marketGroups).length >= 3) {
    patterns.push({
      type: 'coordinated_launch',
      confidence: 0.85,
      markets: Object.keys(marketGroups),
      message: 'Coordinated content launch detected across markets'
    });
  }
  
  // 4. Detect content gaps
  const coreMarkets = ['uk', 'it', 'es', 'fr', 'de', 'pl', 'ca'];
  const missingMarkets = coreMarkets.filter(m => !marketGroups[m]);
  if (missingMarkets.length > 0) {
    patterns.push({
      type: 'content_gap',
      confidence: 0.95,
      markets: missingMarkets,
      message: `Content gap detected in: ${missingMarkets.join(', ')}`
    });
  }
  
  return patterns;
}
```

### Task 3.2: Real-time Notifications (Day 7)
**Create:** `/api/web-activity/subscribe/route.ts`
```typescript
import { EventEmitter } from 'events';

const eventStream = new EventEmitter();

export async function GET(request: NextRequest) {
  const stream = new ReadableStream({
    start(controller) {
      const listener = (data: any) => {
        controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
      };
      
      eventStream.on('update', listener);
      
      request.signal.addEventListener('abort', () => {
        eventStream.off('update', listener);
        controller.close();
      });
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}

// Emit events when new content detected
export function emitTimelineUpdate(event: any) {
  eventStream.emit('update', event);
}
```

### Task 3.3: Weekly Digest Generation (Day 8)
**Create:** `/scripts/generate-weekly-digest.ts`
```typescript
async function generateWeeklyDigest() {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  // Get all events from past week
  const events = await prisma.pageEvent.findMany({
    where: { eventAt: { gte: weekAgo } },
    include: { page: true },
    orderBy: { eventAt: 'desc' }
  });
  
  // Group by market
  const marketSummaries = {};
  
  // Generate AI summary using Gemini Flash 2.5
  const prompt = `Create an executive summary of this week's web activity...`;
  
  // Save digest
  await prisma.digest.create({
    data: {
      userEmail: 'marketing-team@company.com',
      periodStart: weekAgo,
      periodEnd: new Date(),
      topicFocus: ['campaigns', 'updates', 'patterns'],
      articleIds: events.map(e => e.id)
    }
  });
}
```

---

## 🔍 Testing & Validation

### Unit Tests Required
```typescript
// __tests__/timeline.test.ts
describe('Timeline API', () => {
  test('returns English summaries', async () => {
    const res = await fetch('/api/web-activity/timeline?markets=fr');
    const data = await res.json();
    
    expect(data.events[0].description).toMatch(/[A-Za-z]/); // English text
    expect(data.events[0].marketName).toBe('France');
  });
  
  test('uses publish dates correctly', async () => {
    const res = await fetch('/api/web-activity/timeline');
    const data = await res.json();
    
    data.events.forEach(event => {
      if (event.publishedAt) {
        expect(new Date(event.publishedAt)).toBeInstanceOf(Date);
        expect(event.timestamp).toBe(event.publishedAt);
      }
    });
  });
});
```

### Integration Tests
```bash
# 1. Test crawl depth
curl -X POST http://localhost:3000/api/crawl/all-markets \
  -H "Content-Type: application/json" \
  -d '{"markets": ["uk"], "limit": 50}'

# 2. Test export formats
curl "http://localhost:3000/api/web-activity/export?market=uk&format=llm"
curl "http://localhost:3000/api/web-activity/export?market=uk&format=llm-site"

# 3. Test pattern detection
curl "http://localhost:3000/api/web-activity/timeline?timeRange=24h"
```

---

## 📋 Implementation Checklist

### Week 1 Deliverables
- [ ] English summaries displaying correctly
- [ ] Publish dates showing instead of crawl dates
- [ ] 50-page crawl depth for core markets
- [ ] Backfill script for missing English summaries
- [ ] Market health indicators in UI

### Week 2 Deliverables
- [ ] Smart event grouping for campaigns
- [ ] Enhanced LLM export with full site context
- [ ] Pattern detection service running
- [ ] Real-time update notifications
- [ ] Weekly digest generation

### Success Metrics
- [ ] 95%+ content has English summaries
- [ ] 100% accurate publish dates
- [ ] All core markets have 50+ pages
- [ ] Campaign detection within 2 hours
- [ ] 15+ daily active users

---

## 🚨 Risk Mitigation

### Potential Issues & Solutions

1. **AI Rate Limits**
   - Solution: Implement exponential backoff
   - Fallback: Queue for batch processing

2. **Database Performance**
   - Solution: Add indexes on publishDate, summaryEn
   - Monitor: Query performance in production

3. **Crawl Failures**
   - Solution: Retry logic with different user agents
   - Alert: Slack notification on 3+ failures

4. **Memory Issues with Large Exports**
   - Solution: Stream responses for large datasets
   - Limit: Max 1000 pages per export

---

## 📊 Monitoring & Analytics

### Key Metrics to Track
```sql
-- Daily crawl success rate
SELECT 
  DATE(completedAt) as date,
  COUNT(*) as total_jobs,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful,
  AVG(itemsProcessed) as avg_pages_per_market
FROM market_data_jobs
WHERE jobType = 'crawl'
GROUP BY DATE(completedAt);

-- English summary coverage
SELECT 
  market,
  COUNT(*) as total_pages,
  SUM(CASE WHEN summaryEn IS NOT NULL THEN 1 ELSE 0 END) as with_english,
  ROUND(100.0 * SUM(CASE WHEN summaryEn IS NOT NULL THEN 1 ELSE 0 END) / COUNT(*), 2) as coverage_pct
FROM content_pages
GROUP BY market
ORDER BY coverage_pct DESC;

-- Timeline usage
SELECT 
  DATE(createdAt) as date,
  COUNT(DISTINCT userEmail) as unique_users,
  COUNT(*) as total_requests
FROM api_logs
WHERE endpoint LIKE '%timeline%'
GROUP BY DATE(createdAt);
```

---

## 🎯 Definition of Done

The Web Activity Timeline is considered complete when:

1. ✅ All content displays with English summaries (95%+ coverage)
2. ✅ Dates show actual publish times, not crawl times
3. ✅ Core markets have 50+ pages tracked daily
4. ✅ Smart grouping identifies campaigns across 3+ markets
5. ✅ Export supports full-site LLM context
6. ✅ Pattern detection runs automatically
7. ✅ Weekly digests generated and sent
8. ✅ 15+ marketing team members using daily
9. ✅ All tests passing (unit + integration)
10. ✅ Production monitoring in place

---

## 📞 Support & Escalation

### Technical Contacts
- **Frontend Issues:** Review EnhancedTimeline.tsx component
- **API Issues:** Check timeline/route.ts and export/route.ts
- **Crawling Issues:** Review enhanced-crawl.ts service
- **AI Issues:** Check simple-ai.ts and GEMINI_API_KEY

### Common Troubleshooting
```bash
# Check if English summaries exist
npm run script:check-summaries

# Force re-crawl for specific market
curl -X POST http://localhost:3000/api/crawl/market -d '{"market": "fr", "force": true}'

# Clear timeline cache
redis-cli FLUSHDB

# Check cron job status
vercel crons ls
```

---

## 🚀 Next Steps

1. **Immediate:** Start with Phase 1 critical fixes (Days 1-3)
2. **This Week:** Complete English display and date accuracy
3. **Next Week:** Roll out UX enhancements and pattern detection
4. **Following Week:** Launch intelligence features and monitoring

**Remember:** All infrastructure already exists. We're optimizing what's built, not creating new systems.