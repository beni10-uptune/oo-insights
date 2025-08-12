import { NextResponse } from 'next/server';
import FirecrawlApp from '@mendable/firecrawl-js';

export async function GET() {
  try {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    
    // Check if API key exists
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'FIRECRAWL_API_KEY not found',
        env: Object.keys(process.env).filter(k => k.includes('FIRE')),
      });
    }
    
    // Try to initialize Firecrawl
    const firecrawl = new FirecrawlApp({
      apiKey: apiKey,
    });
    
    // Try a simple scrape
    const testUrl = 'https://www.ueber-gewicht.de/';
    console.log('Attempting to scrape:', testUrl);
    
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = await firecrawl.scrapeUrl(testUrl, {
        formats: ['markdown', 'html'],
      });
      
      console.log('Raw result:', JSON.stringify(result, null, 2).substring(0, 500));
      
      return NextResponse.json({
        success: true,
        apiKeyLength: apiKey.length,
        apiKeyPrefix: apiKey.substring(0, 10),
        resultKeys: result ? Object.keys(result) : [],
        hasData: !!result,
        url: result?.url,
        title: result?.metadata?.title || result?.title,
        contentLength: result?.markdown?.length || result?.content?.length || 0,
        fullResult: result,
      });
    } catch (scrapeError) {
      console.error('Scrape error:', scrapeError);
      const error = scrapeError as Error & { response?: { data?: unknown } };
      return NextResponse.json({
        success: false,
        error: 'Scrape failed',
        errorMessage: error.message,
        errorResponse: error.response?.data,
        apiKeyLength: apiKey.length,
        apiKeyPrefix: apiKey.substring(0, 10),
      });
    }
  } catch (error) {
    console.error('Debug endpoint error:', error);
    const err = error as Error;
    return NextResponse.json({
      success: false,
      error: 'Initialization failed',
      errorMessage: err.message,
      stack: err.stack,
    });
  }
}