import { NextResponse } from 'next/server';
import FirecrawlApp from '@mendable/firecrawl-js';

export async function GET() {
  try {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({
        error: 'No API key found',
        envKeys: Object.keys(process.env).filter(k => k.includes('FIRE')),
      });
    }
    
    const firecrawl = new FirecrawlApp({ apiKey });
    
    // Test with a simple page
    const testUrl = 'https://www.example.com';
    console.log('Testing with:', testUrl);
    
    const result = await firecrawl.scrapeUrl(testUrl, {
      formats: ['markdown', 'html'],
    });
    
    // Log the EXACT structure we get back
    console.log('Full result:', JSON.stringify(result, null, 2));
    
    // Check different possible structures
    const analysis = {
      hasResult: !!result,
      isObject: typeof result === 'object',
      topLevelKeys: result ? Object.keys(result) : [],
      hasSuccess: 'success' in (result || {}),
      hasData: 'data' in (result || {}),
      hasMarkdown: 'markdown' in (result || {}),
      hasContent: 'content' in (result || {}),
      hasMetadata: 'metadata' in (result || {}),
    };
    
    // If there's a data property, check its structure
    if ((result as any)?.data) {
      analysis.dataKeys = Object.keys((result as any).data);
    }
    
    // Try to extract content in different ways
    const content = {
      directMarkdown: (result as any)?.markdown,
      directContent: (result as any)?.content,
      dataMarkdown: (result as any)?.data?.markdown,
      dataContent: (result as any)?.data?.content,
    };
    
    return NextResponse.json({
      apiKeyPresent: true,
      analysis,
      content,
      sampleResult: JSON.stringify(result).substring(0, 500),
      fullResult: result,
    });
  } catch (error: any) {
    console.error('Test error:', error);
    return NextResponse.json({
      error: 'Test failed',
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
    });
  }
}