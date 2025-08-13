# Claude Command: Optimize

Optimize the codebase for performance, bundle size, and efficiency.

## Usage

```
/optimize [target]
```

Examples:
- `/optimize` - Optimize entire project
- `/optimize bundle` - Focus on bundle size
- `/optimize performance` - Focus on runtime performance
- `/optimize images` - Optimize image assets

## What This Command Does

### Bundle Optimization
1. **Tree shaking** - Remove unused code
2. **Code splitting** - Create optimal chunks
3. **Lazy loading** - Defer non-critical resources
4. **Minification** - Compress JavaScript/CSS
5. **Import analysis** - Convert to dynamic imports

### Performance Optimization
1. **React optimizations**
   - Add React.memo where beneficial
   - Implement useMemo/useCallback
   - Optimize re-renders
   - Virtual scrolling for long lists

2. **Database optimizations**
   - Add missing indexes
   - Optimize N+1 queries
   - Implement query caching
   - Connection pooling

3. **API optimizations**
   - Implement response caching
   - Add pagination
   - Optimize payload size
   - Enable compression

### Image Optimization
1. **Format conversion** - WebP/AVIF for better compression
2. **Responsive images** - Multiple sizes for different screens
3. **Lazy loading** - Load images as needed
4. **Compression** - Reduce file sizes without quality loss

### CSS Optimization
1. **Remove unused CSS** - PurgeCSS integration
2. **Critical CSS** - Inline above-the-fold styles
3. **CSS-in-JS optimization** - Extract static styles
4. **PostCSS optimization** - Autoprefixer, minification

## Optimization Report

```
📊 Optimization Results
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Bundle Size Reduction
  Before: 1.2MB
  After:  680KB
  Saved:  43% 🎉

Performance Metrics
  First Contentful Paint: -200ms
  Time to Interactive: -500ms
  Largest Contentful Paint: -300ms

Specific Optimizations Applied:
  ✅ Converted 5 components to lazy loading
  ✅ Added memo to 12 components
  ✅ Optimized 23 images (saved 2.1MB)
  ✅ Removed 45KB of unused CSS
  ✅ Split vendor bundle into 3 chunks
  ✅ Added 3 database indexes
  ✅ Implemented query result caching
```

## Next.js Specific Optimizations

1. **Image Component** - Use next/image for automatic optimization
2. **Font Optimization** - Use next/font for web fonts
3. **Script Optimization** - Use next/script for third-party scripts
4. **Dynamic Imports** - Use next/dynamic for code splitting
5. **API Routes** - Optimize serverless functions

## Configuration

Create `.claude/optimize.config.json`:
```json
{
  "bundle": {
    "maxSize": "500KB",
    "analyzeOnBuild": true
  },
  "images": {
    "formats": ["webp", "avif"],
    "quality": 85
  },
  "performance": {
    "budgets": {
      "fcp": 1500,
      "lcp": 2500,
      "tti": 3500
    }
  }
}
```

## Strategies

### Quick Wins
- Enable gzip/brotli compression
- Add caching headers
- Optimize images
- Remove console.logs

### Medium Effort
- Implement code splitting
- Add React.memo
- Optimize database queries
- Implement lazy loading

### Major Refactoring
- Server-side rendering
- Static site generation
- Microservices architecture
- CDN implementation

## Monitoring

After optimization:
1. Run Lighthouse audit
2. Check bundle analyzer
3. Monitor Core Web Vitals
4. Track real user metrics
5. Set up performance budgets

## Best Practices

- Optimize incrementally
- Measure before and after
- Focus on user-facing metrics
- Don't over-optimize
- Test on real devices
- Monitor production performance