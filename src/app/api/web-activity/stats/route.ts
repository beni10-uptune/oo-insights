import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    
    const since = new Date();
    since.setDate(since.getDate() - days);
    
    // Get total pages
    const totalPages = await prisma.contentPage.count();
    
    // Get total changes/events in period
    const totalChanges = await prisma.pageEvent.count({
      where: {
        eventAt: { gte: since }
      }
    });
    
    // Get unique markets
    const marketsData = await prisma.contentPage.findMany({
      select: { market: true },
      distinct: ['market'],
      where: { market: { not: null } }
    });
    const marketsTracked = marketsData.length;
    
    // Get last crawl time
    const lastCrawl = await prisma.contentPage.findFirst({
      orderBy: { lastCrawledAt: 'desc' },
      select: { lastCrawledAt: true }
    });
    
    // Get changes by market
    const changesByMarketData = await prisma.pageEvent.groupBy({
      by: ['market'],
      where: {
        eventAt: { gte: since }
      },
      _count: true,
    });
    
    const changesByMarket: Record<string, number> = {};
    changesByMarketData.forEach(item => {
      if (item.market) {
        changesByMarket[item.market] = item._count;
      }
    });
    
    // Get changes by type
    const changesByTypeData = await prisma.pageEvent.groupBy({
      by: ['eventType'],
      where: {
        eventAt: { gte: since }
      },
      _count: true,
    });
    
    const changesByType = {
      created: 0,
      updated: 0,
    };
    
    changesByTypeData.forEach(item => {
      if (item.eventType === 'created' || item.eventType === 'updated') {
        changesByType[item.eventType] = item._count;
      }
    });
    
    return NextResponse.json({
      success: true,
      stats: {
        totalPages,
        totalChanges,
        marketsTracked,
        lastCrawl: lastCrawl?.lastCrawledAt?.toISOString(),
        changesByMarket,
        changesByType,
      }
    });
  } catch (error) {
    console.error('Failed to get activity stats:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get activity stats',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}