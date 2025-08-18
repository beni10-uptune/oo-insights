import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getMarketFromUrl, getLanguageFromUrl } from '@/lib/firecrawl';

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret for security
    const cronSecret = request.headers.get('X-Cron-Secret');
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const data = await request.json();
    const {
      url,
      market,
      title,
      description,
      content,
      html,
      lastmod,
      crawlId,
      metadata
    } = data;

    // Validate required fields
    if (!url || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: url and content' },
        { status: 400 }
      );
    }

    // Calculate derived fields
    const detectedMarket = market || getMarketFromUrl(url);
    const language = getLanguageFromUrl(url);
    const wordCount = content ? content.split(/\s+/).length : 0;

    // Extract tags from content (simple keyword extraction)
    const tags = [];
    if (content) {
      const keywords = ['adipositas', 'obesity', 'weight', 'bmi', 'treatment', 'übergewicht'];
      keywords.forEach(keyword => {
        if (content.toLowerCase().includes(keyword)) {
          tags.push(keyword);
        }
      });
    }

    // Check if page exists
    const existingPage = await prisma.contentPage.findUnique({
      where: { url }
    });

    let result;
    
    if (existingPage) {
      // Update existing page
      const hasChanged = existingPage.content !== content;
      
      result = await prisma.contentPage.update({
        where: { url },
        data: {
          title: title || existingPage.title,
          description: description || existingPage.description,
          content,
          html: html || existingPage.html,
          market: detectedMarket,
          language,
          wordCount,
          tags,
          lastModifiedAt: lastmod ? new Date(lastmod) : new Date(),
          lastCrawledAt: new Date(),
          metadata: metadata || existingPage.metadata,
        }
      });

      // Create update event if content changed
      if (hasChanged) {
        const changePct = existingPage.wordCount > 0 
          ? Math.round(((wordCount - existingPage.wordCount) / existingPage.wordCount) * 100)
          : 0;

        await prisma.pageEvent.create({
          data: {
            pageId: result.id,
            eventType: 'updated',
            market: detectedMarket,
            title: result.title,
            summary: `Content updated - ${Math.abs(changePct)}% change in word count`,
            url,
            changePct,
            metadata: {
              crawlId,
              previousWordCount: existingPage.wordCount,
              newWordCount: wordCount
            }
          }
        });
      }
    } else {
      // Create new page
      result = await prisma.contentPage.create({
        data: {
          url,
          title: title || 'Untitled',
          description: description || '',
          content,
          html: html || '',
          market: detectedMarket,
          language,
          wordCount,
          tags,
          source: 'firecrawl',
          lastModifiedAt: lastmod ? new Date(lastmod) : new Date(),
          lastCrawledAt: new Date(),
          metadata: metadata || {},
        }
      });

      // Create creation event
      await prisma.pageEvent.create({
        data: {
          pageId: result.id,
          eventType: 'created',
          market: detectedMarket,
          title: result.title,
          summary: description || 'New page discovered',
          url,
          changePct: 0,
          metadata: {
            crawlId,
            wordCount
          }
        }
      });
    }

    return NextResponse.json({
      success: true,
      pageId: result.id,
      url: result.url,
      market: result.market,
      isNew: !existingPage,
      message: existingPage ? 'Page updated' : 'Page created'
    });

  } catch (error) {
    console.error('Error storing web activity:', error);
    return NextResponse.json(
      { error: 'Failed to store content', details: String(error) },
      { status: 500 }
    );
  }
}

// GET endpoint to check API health
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    endpoint: '/api/web-activity/store',
    method: 'POST',
    requiredHeaders: {
      'Content-Type': 'application/json',
      'X-Cron-Secret': 'Your cron secret'
    },
    requiredFields: {
      url: 'string',
      content: 'string',
      market: 'string (optional)',
      title: 'string (optional)',
      description: 'string (optional)',
      html: 'string (optional)',
      lastmod: 'string (optional)',
      crawlId: 'string (optional)',
      metadata: 'object (optional)'
    }
  });
}