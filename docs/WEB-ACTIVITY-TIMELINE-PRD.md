# Web Activity Timeline - Product Requirements Document

**Product Name:** Web Activity Timeline Module  
**Version:** 2.0  
**Date:** August 17, 2025  
**Author:** Senior Product Manager  
**Stakeholders:** EUCAN Marketing Team  

---

## 1. Executive Summary

The Web Activity Timeline is a critical intelligence tool for EUCAN marketing teams to monitor, analyze, and respond to content changes across 25+ regional truthaboutweight websites. Currently functional but underutilized due to language barriers and data accuracy issues, this PRD outlines a strategic enhancement plan to transform it into an indispensable marketing intelligence platform.

**Key Value Proposition:** Enable marketing teams to identify cross-market patterns, detect campaign launches, and respond to competitive moves within minutes rather than days.

**Database Architecture:** Fully integrated with existing PostgreSQL schema using ContentPage, PageEvent, and Market tables for consistency across all modules.

---

## 2. Problem Statement

### Current Pain Points
1. **Language Accessibility (Critical):** 60% of content displays in non-English languages, creating barriers for UK/US-based marketers
2. **Temporal Confusion:** Shows "2 hours ago" for content published months ago (mixing crawl time with publish dates)
3. **Incomplete Coverage:** Missing critical updates from core markets (Italy, Spain showing <10 pages)
4. **Lack of Actionable Insights:** Raw data without pattern recognition or strategic recommendations
5. **No Export/Reporting:** Cannot generate executive summaries or campaign reports

### Business Impact
- **Missed Opportunities:** 3-5 day delay in detecting competitor campaigns
- **Resource Waste:** Teams spend 2+ hours/week manually checking multiple sites
- **Strategic Blind Spots:** Cannot identify successful content patterns for replication

---

## 3. User Personas & Jobs to Be Done

### Primary Persona: Regional Marketing Manager (Sarah)
**Demographics:** 32, based in London, manages 7 European markets  
**Tech Savvy:** Medium - comfortable with dashboards, not technical  
**Time Available:** 30 minutes/day for monitoring  

**Jobs to Be Done:**
1. "I need to quickly understand what content launched this week across my markets"
2. "I need to identify which markets are lagging behind in campaign rollouts"
3. "I need to spot trending topics before competitors"
4. "I need to generate weekly reports for leadership"

### Secondary Persona: Content Strategist (Marcus)
**Demographics:** 28, remote, responsible for content planning  
**Tech Savvy:** High - uses multiple analytics tools  
**Time Available:** 2 hours/week for analysis  

**Jobs to Be Done:**
1. "I need to track content velocity and identify high-performing topics"
2. "I need to understand seasonal patterns across markets"
3. "I need to coordinate multi-market content launches"

### Tertiary Persona: Campaign Coordinator (Elena)
**Demographics:** 35, Milan-based, coordinates EU campaigns  
**Tech Savvy:** Medium  
**Time Available:** 1 hour/day  

**Jobs to Be Done:**
1. "I need to ensure all markets implement HQ campaigns"
2. "I need to track compliance and messaging consistency"
3. "I need to identify local adaptations that perform well"

---

## 4. Success Metrics

### User Engagement
- **Daily Active Users:** Increase from 3 to 15+ within 30 days
- **Time to Insight:** Reduce from 15 minutes to <30 seconds
- **Actions per Session:** Increase from 2 to 8+ (filters, exports, drill-downs)

### Business Outcomes
- **Campaign Detection Speed:** Within 2 hours of publication (vs. 3-5 days)
- **Cross-Market Insights:** 10+ actionable patterns identified weekly
- **Report Generation:** 20+ automated reports exported weekly
- **Coverage Completeness:** 95%+ of core market content tracked

### Quality Metrics
- **Translation Accuracy:** 95%+ English summaries available
- **Date Accuracy:** 100% correct publish dates displayed
- **Alert Precision:** <5% false positive rate on pattern detection

---

## 5. Feature Requirements (Prioritized)

### P0 - Critical Foundation (Week 1)

#### 5.1 English-First Content Display
**User Story:** As Sarah, I need all content in English so I can understand updates from any market instantly.

**Requirements:**
- Display `summaryEn` field as primary description (already in ContentPage table)
- Show original language as secondary metadata
- Add language badge with flag emoji from Market table (e.g., "🇫🇷 French")
- Implement fallback: summaryEn → summary → description → "No summary available"

**Technical Implementation:**
- Database: Use existing `summaryEn` field in ContentPage table
- AI Service: Already configured with Gemini Flash 2.5 in `simple-ai.ts`
- API: Modify `/api/web-activity/timeline/route.ts` to prioritize English
- Frontend: Update `EnhancedTimeline.tsx` display logic

#### 5.2 Accurate Temporal Display
**User Story:** As Marcus, I need to see when content was actually published, not when it was crawled.

**Requirements:**
- Use `publishDate` from ContentPage table (sourced from sitemap)
- Display format: "Published 3 weeks ago • Updated 2 days ago"
- Show absolute date on hover: "March 15, 2024 at 14:23 UTC"
- Separate "Content Age" from "Last Checked"

**Technical Implementation:**
- Database: `publishDate` field in ContentPage, `eventAt` in PageEvent
- Crawling: Enhanced-crawl service already extracts sitemap dates
- API: Update timeline route to use publishDate as primary timestamp
- Frontend: Modify `formatTimeAgo()` in EnhancedTimeline.tsx

#### 5.3 Complete Market Coverage
**User Story:** As Elena, I need comprehensive data from all core markets to coordinate campaigns.

**Requirements:**
- Automated daily crawl at 8 AM UTC (9 AM CET) - ALREADY CONFIGURED
- Increase to 50 pages per core market (currently 25)
- Alert when market has <10 pages or >48 hours since last crawl
- Visual indicator of data freshness per market

**Technical Implementation:**
- Cron: `/api/cron/daily-crawl` already runs at 9 AM CET via Vercel
- Database: MarketDataJob table tracks crawl status
- Service: `crawlAllEucanMarkets()` in enhanced-crawl.ts
- Update: Change limit from 25 to 50 in daily-crawl route

### P1 - Enhanced Intelligence (Week 2)

#### 5.4 Smart Event Grouping
**User Story:** As Sarah, I need to see related updates grouped together to identify coordinated campaigns.

**Requirements:**
- Group events by similarity (title, topic, timing)
- Collapse into single card with expansion
- Show "Campaign Detected" badge for 3+ similar updates
- Display market badges for all affected regions

**Algorithm:**
- Use Levenshtein distance for title similarity (threshold: 0.8)
- Time window: updates within 48 hours
- Minimum 3 markets for "campaign" classification

#### 5.5 Visual Timeline View
**User Story:** As Marcus, I need a visual representation to spot patterns and gaps quickly.

**Requirements:**
- Horizontal timeline with time axis
- Vertical swim lanes per market
- Color coding by event type
- Density heatmap overlay
- Zoom/pan navigation

**Technical:**
- Consider D3.js or Recharts for visualization
- Progressive loading for performance
- Mobile-responsive design

#### 5.6 Enhanced Export & Reporting
**User Story:** As Sarah, I need to generate executive summaries for weekly leadership meetings.

**Requirements:**
- Leverage existing export formats (CSV, JSON, LLM context) - ALREADY BUILT
- Add PDF export with charts
- Expand LLM context format for whole-site summaries
- Pre-configured report templates:
  - Weekly Activity Summary
  - Campaign Performance Report
  - Market Comparison Dashboard

**Technical Implementation:**
- Existing: `/api/web-activity/export` supports CSV, JSON, LLM formats
- Add: PDF generation using existing data structures
- Enhance: LLM format to include full site context

### P2 - Advanced Analytics (Week 3-4)

#### 5.7 AI-Powered Pattern Detection
**User Story:** As Marcus, I need the system to surface insights I might miss.

**Requirements:**
- Trend identification across markets
- Anomaly detection (unusual activity spikes)
- Topic clustering and emergence tracking
- Predictive alerts ("Spain usually follows France by 3 days")

**ML Components:**
- Use existing Gemini integration
- Implement sliding window analysis
- Store patterns in dedicated table

#### 5.8 Competitive Intelligence Layer
**User Story:** As Sarah, I need to track competitor activities alongside our content.

**Requirements:**
- Add competitor URLs to tracking
- Side-by-side timeline comparison
- Competitive gap analysis
- Response time metrics

#### 5.9 Workflow Automation
**User Story:** As Elena, I need automated actions based on timeline events.

**Requirements:**
- Slack/Teams notifications for high-impact events
- Auto-generate JIRA tickets for content gaps
- Trigger email alerts for specific patterns
- API webhooks for third-party integrations

---

## 6. User Experience Design

### Information Architecture
```
┌─────────────────────────────────────────────┐
│ Timeline Header                              │
│ ├── View Toggle (List/Timeline/Grid)         │
│ ├── Time Range (Today/Week/Month/Quarter)    │
│ └── Quick Actions (Export/Subscribe/Share)   │
├──────────────────────────────────────────────┤
│ Intelligence Bar                             │
│ ├── "🚀 Campaign detected across 5 markets"  │
│ ├── "⚠️ Italy missing updates for 3 days"    │
│ └── "📈 32% increase in activity vs last week"│
├──────────────────────────────────────────────┤
│ Smart Filters                                │
│ ├── Markets (Multi-select with favorites)    │
│ ├── Event Types                              │
│ ├── Impact Level                             │
│ ├── Language                                 │
│ └── Search (with autocomplete)               │
├──────────────────────────────────────────────┤
│ Timeline Content                             │
│ ├── Grouped Event Cards                      │
│ │   ├── [🇬🇧🇫🇷🇩🇪] Campaign: New Treatment │
│ │   ├── English Title (Bold, 16px)           │
│ │   ├── English Summary (14px, 2 lines max)  │
│ │   ├── Metadata Bar                         │
│ │   └── Actions (Translate/Compare/Export)   │
│ └── Load More / Infinite Scroll              │
└───────────────────────────────────────────────┘
```

### Design Principles
1. **Scannable:** Key info visible in 2 seconds
2. **Actionable:** Every insight leads to clear next steps
3. **Contextual:** Related information grouped logically
4. **Progressive:** Details on demand, not overwhelming
5. **Responsive:** Fully functional on mobile devices

### Interaction Patterns
- **Single Click:** Expand/collapse details
- **Double Click:** Open original page
- **Right Click:** Context menu with quick actions
- **Drag & Drop:** Reorder timeline cards
- **Keyboard Shortcuts:** J/K for navigation, / for search

---

## 7. Technical Architecture

### Data Pipeline (Current Architecture)
```mermaid
graph LR
    A[Vercel Cron] -->|9 AM CET Daily| B[enhanced-crawl.ts]
    B --> C[Firecrawl API]
    C --> D[Content Extraction]
    D --> E[AI Processing]
    E -->|Gemini Flash 2.5| F[Translation & Summary]
    F --> G[PostgreSQL]
    G -->|ContentPage| H[Change Detection]
    H -->|PageEvent| I[Event Generation]
    I --> J[Pattern Analysis]
    J --> K[/api/web-activity/timeline]
    K --> L[EnhancedTimeline.tsx]
```

### API Endpoints
- `GET /api/web-activity/timeline` - Main timeline data
- `GET /api/web-activity/patterns` - AI-detected patterns
- `POST /api/web-activity/export` - Generate reports
- `GET /api/web-activity/subscribe` - WebSocket for real-time
- `POST /api/web-activity/feedback` - User feedback loop

### Performance Requirements
- Initial Load: <2 seconds
- Filter Application: <500ms
- Export Generation: <5 seconds
- Real-time Updates: <1 second latency

---

## 8. Implementation Roadmap

### Week 1: Foundation (Dec 2-6)
- [ ] Fix English summary display
- [ ] Implement accurate date handling
- [ ] Complete market coverage crawl
- [ ] Deploy monitoring dashboard

### Week 2: Intelligence (Dec 9-13)
- [ ] Build smart grouping algorithm
- [ ] Implement visual timeline
- [ ] Add export functionality
- [ ] Create report templates

### Week 3: Enhancement (Dec 16-20)
- [ ] Deploy pattern detection
- [ ] Add competitive tracking
- [ ] Implement notifications
- [ ] Mobile optimization

### Week 4: Polish (Dec 23-27)
- [ ] User testing sessions
- [ ] Performance optimization
- [ ] Documentation
- [ ] Training materials

---

## 9. Risk Mitigation

### Technical Risks
| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| AI translation errors | High | Medium | Human review queue for critical content |
| Crawling blocked | High | Low | Multiple fallback methods, user agents |
| Database performance | Medium | Medium | Implement caching, pagination |
| Pattern false positives | Medium | High | Adjustable confidence thresholds |

### Business Risks
| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Low adoption | High | Medium | Embedded training, quick wins showcase |
| Information overload | Medium | Medium | Progressive disclosure, smart defaults |
| Compliance concerns | High | Low | Legal review, data retention policies |

---

## 10. Success Criteria & KPIs

### Launch Success (30 days)
- ✓ 80% of marketing team using daily
- ✓ 50+ exports generated
- ✓ 10+ patterns identified and actioned
- ✓ NPS score >7

### Long-term Success (90 days)
- ✓ 30% reduction in campaign detection time
- ✓ 20% increase in cross-market campaign success
- ✓ Integration with 3+ other tools
- ✓ Executive dashboard adoption

---

## 11. Open Questions & Decisions Needed

1. **Data Retention:** How long to keep historical timeline data? (Recommend: 12 months)
2. **Access Control:** Should all users see all markets? (Recommend: Yes, with favorites)
3. **Competitive Tracking:** Which competitor sites to include? (Need list from marketing)
4. **Integration Priority:** Slack vs Teams vs Email? (Need team survey)
5. **Mobile App:** Native app or responsive web? (Recommend: Start with responsive)

---

## 12. Appendices

### A. Competitive Analysis
- **Conductor Searchlight:** Strong SEO focus, weak on multilingual
- **Crayon:** Good competitive intel, expensive, US-focused
- **Custom Solutions:** High maintenance, lack of AI features

### B. User Research Insights
- 87% want English summaries as top priority
- 72% check timeline first thing in morning
- 65% share insights via screenshot (need better sharing)
- 43% use mobile during commute

### C. Technical Dependencies (Already Configured)
- Firecrawl API (FIRECRAWL_API_KEY configured)
- Gemini Flash 2.5 via direct API (GEMINI_API_KEY configured)
- PostgreSQL via Prisma (DATABASE_URL configured)
- Vercel hosting with Cron jobs (CRON_SECRET configured)
- NextJS 15.4.6 framework
- Market reference table with 25+ markets pre-configured

---

## Approval & Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product Manager | [Your Name] | Aug 17, 2025 | _________ |
| Engineering Lead | _________ | _________ | _________ |
| Marketing Director | _________ | _________ | _________ |
| Legal Compliance | _________ | _________ | _________ |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Aug 17, 2025 | PM | Initial PRD |
| | | | |

---

**Next Steps:**
1. Review with engineering team for technical feasibility
2. Get marketing team feedback on priorities
3. Estimate development effort
4. Create detailed sprint plans
5. Begin implementation of P0 features