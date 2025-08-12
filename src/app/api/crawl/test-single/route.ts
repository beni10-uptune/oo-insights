import { NextResponse } from 'next/server';
import { scrapeUrl } from '@/lib/firecrawl';

export async function GET() {
  try {
    // Test with a known working URL
    const testUrl = 'https://www.ueber-gewicht.de/';
    
    console.log('Testing Firecrawl with URL:', testUrl);
    console.log('API Key available:', !!process.env.FIRECRAWL_API_KEY);
    console.log('API Key prefix:', process.env.FIRECRAWL_API_KEY?.substring(0, 10));
    
    const result = await scrapeUrl(testUrl);
    
    if (!result) {
      return NextResponse.json({
        success: false,
        error: 'No result from Firecrawl',
        apiKeyPresent: !!process.env.FIRECRAWL_API_KEY,
      });
    }
    
    return NextResponse.json({
      success: true,
      url: result.url,
      title: result.title,
      contentLength: result.content?.length || 0,
      hasMarkdown: !!result.markdown,
      hasHtml: !!result.html,
      linksCount: result.links?.length || 0,
      metadata: result.metadata,
    });
  } catch (error) {
    console.error('Test crawl error:', error);
    return NextResponse.json({
      success: false,
      error: String(error),
      apiKeyPresent: !!process.env.FIRECRAWL_API_KEY,
    });
  }
}