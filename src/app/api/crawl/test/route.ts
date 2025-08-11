import { NextResponse } from 'next/server';
import { scrapeUrl, TRUTHABOUTWEIGHT_SITES } from '@/lib/firecrawl';

export async function GET() {
  try {
    // Test crawl the global homepage
    const testUrl = TRUTHABOUTWEIGHT_SITES.global;
    
    console.log('Testing Firecrawl with:', testUrl);
    const result = await scrapeUrl(testUrl);
    
    if (!result) {
      return NextResponse.json(
        { error: 'Failed to crawl URL' },
        { status: 500 }
      );
    }

    // Return the full structure so we can see what data is available
    return NextResponse.json({
      success: true,
      url: testUrl,
      data: result,
      dataStructure: {
        hasTitle: !!result.title,
        hasDescription: !!result.description,
        hasContent: !!result.content,
        hasMarkdown: !!result.markdown,
        hasHtml: !!result.html,
        hasMetadata: !!result.metadata,
        hasLinks: !!result.links,
        hasScreenshot: !!result.screenshot,
        contentLength: result.content?.length || 0,
        linksCount: result.links?.length || 0,
        metadataKeys: result.metadata ? Object.keys(result.metadata) : [],
      }
    });
  } catch (error) {
    console.error('Test crawl error:', error);
    return NextResponse.json(
      { error: 'Crawl test failed', details: String(error) },
      { status: 500 }
    );
  }
}