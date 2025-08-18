import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { MARKET_NAMES } from '@/lib/constants/markets';

export async function GET() {
  try {
    // Get all markets from constants
    const allMarkets = Object.entries(MARKET_NAMES).map(([code, market]) => ({
      code,
      name: market.name,
      flag: market.flag,
      language: market.language,
      isCore: market.isCore,
    }));

    // Get page counts for each market
    const marketStats = await Promise.all(
      allMarkets.map(async (market) => {
        const pageCount = await prisma.contentPage.count({
          where: { market: market.code }
        });
        return {
          ...market,
          pageCount,
          isActive: pageCount > 0
        };
      })
    );

    // Sort by page count (active markets first)
    marketStats.sort((a, b) => b.pageCount - a.pageCount);

    return NextResponse.json({
      success: true,
      markets: marketStats.map(m => ({
        ...m,
        // Use proper format for display in UI
        displayName: `${m.flag || ''} ${m.name}`.trim(),
      })),
      summary: {
        total: marketStats.length,
        active: marketStats.filter(m => m.isActive).length,
        inactive: marketStats.filter(m => !m.isActive).length,
      }
    });

  } catch (error) {
    console.error('Error fetching markets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch markets' },
      { status: 500 }
    );
  }
}