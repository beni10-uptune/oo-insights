import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { categorizeContent } from '@/lib/services/ai-categorization';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    // Check for admin authorization
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET || 'test-cron-secret'}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Optional parameters
    const { market, limit = 100, offset = 0 } = await request.json().catch(() => ({}));

    // Build query filters
    const where: Record<string, unknown> = {};
    if (market) {
      where.market = market;
    }

    // Get pages that need categorization
    const pages = await prisma.contentPage.findMany({
      where: {
        ...where,
        OR: [
          { category: null },
          { contentType: null },
        ],
      },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
    });

    const results = {
      total: pages.length,
      categorized: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each page
    for (const page of pages) {
      try {
        const content = page.textContent || page.rawHtml || '';
        const title = page.title || '';
        const url = page.url;

        if (!content || content.length < 100) {
          console.log(`Skipping ${url} - insufficient content`);
          continue;
        }

        // Categorize using AI
        const categorization = await categorizeContent(content, title, url);

        // Update the page with categorization results
        await prisma.contentPage.update({
          where: { id: page.id },
          data: {
            category: categorization.category,
            contentType: categorization.contentType,
            confidence: categorization.confidence,
            keywords: categorization.keywords,
            hasVideo: categorization.signals.hasVideo,
            hasCalculator: categorization.signals.hasCalculator,
            hasForm: categorization.signals.hasForm,
            readingTime: categorization.signals.readingTime,
            signals: categorization.signals,
          },
        });

        // Also create/update page metrics if we have data
        if (categorization.category) {
          await prisma.pageMetrics.upsert({
            where: { pageId: page.id },
            create: {
              pageId: page.id,
              period: new Date().toISOString().slice(0, 7), // YYYY-MM format
              categoryViews: {
                [categorization.category]: 1,
              },
            },
            update: {
              categoryViews: {
                [categorization.category]: 1,
              },
              lastUpdated: new Date(),
            },
          });
        }

        results.categorized++;
        console.log(`Categorized: ${url} -> ${categorization.category} (${categorization.contentType})`);
      } catch (error) {
        results.failed++;
        const errorMsg = `Failed to categorize ${page.url}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        results.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    // Get total uncategorized count
    const remaining = await prisma.contentPage.count({
      where: {
        ...where,
        OR: [
          { category: null },
          { contentType: null },
        ],
      },
    });

    return NextResponse.json({
      success: true,
      results,
      remaining: remaining - results.categorized,
      message: `Categorized ${results.categorized} pages, ${results.failed} failed, ${remaining - results.categorized} remaining`,
    });
  } catch (error) {
    console.error('Recategorization error:', error);
    return NextResponse.json(
      { error: 'Recategorization failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check categorization status
export async function GET(request: NextRequest) {
  try {
    // Check for admin authorization
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET || 'test-cron-secret'}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get categorization statistics
    const [total, categorized, byCategory, byContentType] = await Promise.all([
      prisma.contentPage.count(),
      prisma.contentPage.count({
        where: {
          AND: [
            { category: { not: null } },
            { contentType: { not: null } },
          ],
        },
      }),
      prisma.contentPage.groupBy({
        by: ['category'],
        _count: true,
        where: { category: { not: null } },
      }),
      prisma.contentPage.groupBy({
        by: ['contentType'],
        _count: true,
        where: { contentType: { not: null } },
      }),
    ]);

    const uncategorized = total - categorized;

    return NextResponse.json({
      total,
      categorized,
      uncategorized,
      percentComplete: ((categorized / total) * 100).toFixed(2) + '%',
      byCategory: byCategory.map(item => ({
        category: item.category,
        count: item._count,
      })),
      byContentType: byContentType.map(item => ({
        contentType: item.contentType,
        count: item._count,
      })),
    });
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: 'Failed to get status', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}