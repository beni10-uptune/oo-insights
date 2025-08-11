import { NextRequest, NextResponse } from 'next/server';
import { scrapeUrl } from '@/lib/firecrawl';
import { storeCrawlResult } from '@/lib/services/web-activity';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }
    
    // Crawl the URL
    console.log('Crawling URL:', url);
    const result = await scrapeUrl(url);
    
    if (!result) {
      return NextResponse.json(
        { error: 'Failed to crawl URL' },
        { status: 500 }
      );
    }
    
    // Store in database
    const page = await storeCrawlResult(result);
    
    return NextResponse.json({
      success: true,
      page: {
        id: page.id,
        url: page.url,
        title: page.title,
        market: page.market,
        language: page.language,
        wordCount: page.wordCount,
        changePct: page.changePct,
        lastCrawledAt: page.lastCrawledAt,
      },
    });
  } catch (error) {
    console.error('Crawl error:', error);
    return NextResponse.json(
      { error: 'Crawl failed', details: String(error) },
      { status: 500 }
    );
  }
}