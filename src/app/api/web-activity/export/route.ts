import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const market = searchParams.get('market');
    const format = searchParams.get('format') || 'json';
    const includeContent = searchParams.get('includeContent') === 'true';
    
    if (!market) {
      return NextResponse.json(
        { error: 'Market parameter is required' },
        { status: 400 }
      );
    }

    // Fetch latest content for the specified market
    const pages = await prisma.$queryRaw`
      SELECT 
        cp.url,
        cp.title,
        cp.description,
        cp.market,
        cp.language,
        cp.category,
        cp.subcategory,
        cp.summary,
        cp."summaryEn",
        cp."hasHcpLocator",
        cp.signals,
        cp."wordCount",
        cp."lastCrawledAt",
        cp."lastModifiedAt",
        ${includeContent ? 'cp."textContent",' : ''}
        ${includeContent ? 'cp."rawHtml",' : ''}
        pe."eventType" as "latestEventType",
        pe."eventAt" as "latestEventAt"
      FROM "content_pages" cp
      LEFT JOIN LATERAL (
        SELECT "eventType", "eventAt"
        FROM "page_events"
        WHERE "pageId" = cp.id
        ORDER BY "eventAt" DESC
        LIMIT 1
      ) pe ON true
      WHERE cp.market = ${market}
      ORDER BY cp."lastCrawledAt" DESC
    `;

    // Format data based on request
    if (format === 'csv') {
      // Convert to CSV format
      const csvRows = ['URL,Title,Description,Category,Subcategory,Summary (English),Last Modified,Has HCP Locator,Latest Event'];
      
      for (const page of pages as Array<{
        url: string;
        title: string | null;
        description: string | null;
        category: string | null;
        subcategory: string | null;
        summary: string | null;
        summaryEn: string | null;
        lastModifiedAt: Date | null;
        hasHcpLocator: boolean | null;
        latestEventType: string | null;
      }>) {
        const row = [
          page.url,
          `"${(page.title || '').replace(/"/g, '""')}"`,
          `"${(page.description || '').replace(/"/g, '""')}"`,
          page.category || '',
          page.subcategory || '',
          `"${(page.summaryEn || page.summary || '').replace(/"/g, '""')}"`,
          page.lastModifiedAt ? new Date(page.lastModifiedAt).toISOString() : '',
          page.hasHcpLocator ? 'Yes' : 'No',
          page.latestEventType || ''
        ].join(',');
        csvRows.push(row);
      }
      
      const csv = csvRows.join('\n');
      
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${market}-web-activity-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    } else if (format === 'llm') {
      // Format optimized for LLM context
      const llmContext = {
        market,
        exportDate: new Date().toISOString(),
        pageCount: pages.length,
        categories: {} as Record<string, number>,
        hasHcpLocator: false,
        recentUpdates: [] as Array<{ url: string; title: string; daysAgo: number }>,
        summaries: [] as Array<{ url: string; title: string; summary: string }>,
      };
      
      for (const page of pages as Array<{
        url: string;
        title: string | null;
        category: string | null;
        hasHcpLocator: boolean | null;
        summaryEn: string | null;
        summary: string | null;
        latestEventType: string | null;
        latestEventAt: Date | null;
      }>) {
        // Count categories
        if (page.category) {
          llmContext.categories[page.category] = (llmContext.categories[page.category] || 0) + 1;
        }
        
        // Check for HCP locator
        if (page.hasHcpLocator) {
          llmContext.hasHcpLocator = true;
        }
        
        // Add summaries
        if (page.summaryEn || page.summary) {
          llmContext.summaries.push({
            url: page.url,
            title: page.title || 'Untitled',
            summary: page.summaryEn || page.summary,
          });
        }
        
        // Track recent updates
        if (page.latestEventType === 'updated' && page.latestEventAt) {
          const daysSinceUpdate = Math.floor(
            (Date.now() - new Date(page.latestEventAt).getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysSinceUpdate <= 7) {
            llmContext.recentUpdates.push({
              url: page.url,
              title: page.title,
              daysAgo: daysSinceUpdate,
            });
          }
        }
      }
      
      // Create a condensed context string for LLM
      const contextString = `
# Web Activity Export for ${market} Market

Export Date: ${llmContext.exportDate}
Total Pages: ${llmContext.pageCount}
HCP Locator Available: ${llmContext.hasHcpLocator ? 'Yes' : 'No'}

## Content Categories
${Object.entries(llmContext.categories)
  .map(([cat, count]) => `- ${cat}: ${count} pages`)
  .join('\n')}

## Recent Updates (Last 7 Days)
${llmContext.recentUpdates.length > 0 
  ? llmContext.recentUpdates
      .slice(0, 10)
      .map((u) => `- ${u.title} (${u.daysAgo} days ago): ${u.url}`)
      .join('\n')
  : 'No recent updates'}

## Key Content Summaries
${llmContext.summaries
  .slice(0, 20)
  .map(s => `### ${s.title}\nURL: ${s.url}\nSummary: ${s.summary}`)
  .join('\n\n')}
`;
      
      return new NextResponse(contextString, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': `attachment; filename="${market}-llm-context-${new Date().toISOString().split('T')[0]}.txt"`,
        },
      });
    } else {
      // Default JSON format
      const exportData = {
        market,
        exportDate: new Date().toISOString(),
        pageCount: pages.length,
        pages: pages as Array<Record<string, unknown>>,
      };
      
      return NextResponse.json(exportData, {
        status: 200,
        headers: {
          'Content-Disposition': `attachment; filename="${market}-web-activity-${new Date().toISOString().split('T')[0]}.json"`,
        },
      });
    }
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { 
        error: 'Export failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}