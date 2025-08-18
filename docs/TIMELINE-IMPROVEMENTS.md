# Timeline Feature - Product & UX Improvement Plan

**Date:** August 17, 2025  
**Feature:** Web Activity Timeline  
**Priority:** High  
**Product Owner:** EUCAN Marketing Team  

---

## 📊 Current State Analysis

### What's Working
- ✅ Timeline successfully aggregates events from 25+ markets
- ✅ Real-time filtering by market, event type, and date range
- ✅ Visual hierarchy with impact indicators (high/medium/low)
- ✅ Cross-market pattern detection and insights

### Critical Issues
1. **🔴 Language Barrier**: Descriptions showing in original language (French, Italian, etc.) instead of English
2. **🔴 Date Inaccuracy**: Shows "hours ago" for content published weeks/months ago
3. **🔴 Incomplete Data**: Missing content from key markets (Italy, Spain)
4. **🟡 Confusing Metadata**: Mixing crawl dates with publish dates

---

## 🎯 User Jobs to Be Done

1. **Marketing Manager**: "I need to quickly understand what content was published across all markets this week"
2. **Campaign Coordinator**: "I need to spot coordinated launches and identify gaps in market coverage"
3. **Content Strategist**: "I need to track which topics are trending and when they were actually published"

---

## 🚀 Priority Improvements

### P0 - Critical Fixes (This Sprint)

#### 1. English-First Content
**Problem**: Non-English speakers can't understand content from other markets  
**Solution**: 
- Ensure AI summarization runs for ALL content
- Display English summary as primary, original as secondary
- Add language badge to show original language

**Implementation**:
```javascript
// Timeline card should show:
[🇫🇷 FR] Title in English
English summary of the content (2-3 sentences)
Published: March 15, 2024 | Updated: August 16, 2024
```

#### 2. Accurate Publish Dates
**Problem**: Showing crawl time instead of actual publish date  
**Solution**:
- Pull publish dates from sitemap `<lastmod>` tags
- Show relative time from PUBLISH date, not crawl date
- Display both dates when relevant

**Display Format**:
```
Published 3 weeks ago • Last updated 2 days ago
```

#### 3. Complete Market Coverage
**Problem**: Missing data from Italy, Spain, and other core markets  
**Solution**:
- Run comprehensive sitemap crawl for all markets
- Set up monitoring dashboard for crawl health
- Alert when market has <10 pages or >7 days since last crawl

---

### P1 - Enhanced Usability (Next Sprint)

#### 1. Smart Grouping
- Group related events (same topic across markets)
- Collapse similar updates into single card with market badges
- Show "Campaign detected" for coordinated launches

#### 2. Visual Timeline
- Replace list with actual timeline visualization
- Show content density over time
- Highlight gaps and spikes

#### 3. Quick Actions
- "Translate Full Article" button
- "View Original" link
- "Export Campaign Report" for grouped events
- "Compare Markets" for similar content

---

### P2 - Intelligence Layer (Future)

#### 1. Trend Detection
- Identify emerging topics across markets
- Predict content gaps
- Suggest content opportunities

#### 2. Competitive Intelligence
- Track competitor campaigns (when they launch similar content)
- Benchmark content velocity
- Alert on competitive threats

---

## 🎨 UX Improvements

### Information Architecture
```
┌─────────────────────────────────────┐
│ Timeline Header                     │
│ ├── Smart Filters (Markets, Topics) │
│ ├── Date Range Selector             │
│ └── View Toggle (List/Timeline/Grid)│
├─────────────────────────────────────┤
│ Insights Bar                        │
│ ├── "5 markets launched X"          │
│ └── "Gap detected in Spain"         │
├─────────────────────────────────────┤
│ Event Cards                         │
│ ├── [Flag] Market Badge             │
│ ├── English Title (bold)            │
│ ├── English Summary                 │
│ ├── Metadata (dates, impact)        │
│ └── Actions (translate, export)     │
└─────────────────────────────────────┘
```

### Visual Design Principles
1. **Scanability**: English content prominent, metadata subtle
2. **Grouping**: Related events visually connected
3. **Hierarchy**: Most important (high impact, recent) at top
4. **Responsiveness**: Works on mobile for on-the-go checks

---

## 📏 Success Metrics

### Engagement
- Time to find relevant content: <10 seconds
- Cross-market insights identified: >5 per week
- Export/share actions: >20 per week

### Quality
- English summary accuracy: >95%
- Date accuracy: 100%
- Market coverage: >90% markets with fresh data

### Performance
- Page load: <2 seconds
- Filter response: <500ms
- Crawl freshness: <24 hours

---

## 🔧 Technical Requirements

### Data Pipeline
1. **Sitemap Crawler**: Daily at 6 AM UTC
2. **AI Processing**: Gemini 1.5 Flash for all content
3. **Change Detection**: Track actual content changes, not crawl events

### API Requirements
- `/api/timeline`: Return English summaries primarily
- Include both `publishDate` and `lastModified`
- Support pagination for large datasets

### Frontend Requirements
- React components with loading states
- Client-side filtering for instant response
- Lazy loading for performance
- Export functionality (CSV, PDF)

---

## 🗓️ Implementation Roadmap

### Week 1 (Current)
- [x] Fix sitemap-based crawling
- [ ] Ensure English summaries in database
- [ ] Fix date display logic
- [ ] Complete Italy/Spain crawl

### Week 2
- [ ] Redesign timeline cards
- [ ] Add language badges
- [ ] Implement smart grouping
- [ ] Add export functionality

### Week 3
- [ ] Visual timeline view
- [ ] Performance optimizations
- [ ] Mobile responsive design
- [ ] User testing

### Week 4
- [ ] Pattern detection algorithms
- [ ] Monitoring dashboard
- [ ] Documentation
- [ ] Launch to stakeholders

---

## 📝 Notes for Development Team

### Priority Fixes Needed
1. **Backend**: Ensure `summaryEn` field is populated for all content
2. **Backend**: Use `publishDate` from sitemap, not `createdAt`
3. **Frontend**: Display `summaryEn` as primary description
4. **Frontend**: Calculate relative time from `publishDate`
5. **DevOps**: Monitor crawl health per market

### Testing Checklist
- [ ] All markets show English summaries
- [ ] Dates reflect actual publish dates
- [ ] Italy, Spain, Germany have >50 pages each
- [ ] Filter by market works correctly
- [ ] Export includes English summaries
- [ ] Mobile view is usable

---

## 🎯 Definition of Done

The timeline feature is complete when:
1. Marketing team can understand ALL content regardless of language
2. Dates accurately reflect when content was published
3. All core markets have comprehensive coverage
4. Users can identify patterns and opportunities within 30 seconds
5. Data can be exported for reporting

---

**Next Steps**: 
1. Fix data pipeline (English summaries, correct dates)
2. Update UI components 
3. Run comprehensive crawl
4. User acceptance testing