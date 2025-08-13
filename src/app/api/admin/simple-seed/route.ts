import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    
    if (secret !== 'simple-seed-2024') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('Simple seeding...');
    
    // Clear existing data first
    await prisma.$executeRaw`DELETE FROM trends_series`;
    await prisma.$executeRaw`DELETE FROM related_queries`;
    
    const results = { series: 0, queries: 0 };
    
    // Add some simple trends_series data
    const markets = ['UK', 'FR', 'DE', 'IT', 'ES', 'CA', 'PL'];
    const brands = ['Wegovy', 'Ozempic', 'Mounjaro'];
    
    for (const market of markets) {
      for (const brand of brands) {
        // Just add a few data points
        for (let i = 0; i < 30; i++) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          
          // Generate value based on brand
          let value = 50;
          if (brand === 'Wegovy') value = 70 + Math.floor(Math.random() * 20);
          if (brand === 'Ozempic') value = 60 + Math.floor(Math.random() * 20);
          if (brand === 'Mounjaro') value = 40 + i; // Rising trend
          
          try {
            await prisma.$executeRaw`
              INSERT INTO trends_series (market, language, brand, date, interest_index)
              VALUES (${market}, 'en', ${brand}, ${dateStr}::date, ${value})
            `;
            results.series++;
          } catch (e) {
            // Skip duplicates
          }
        }
      }
    }
    
    // Add some related queries
    const themes = ['side_effects', 'weight_loss', 'availability', 'price'];
    
    for (const market of markets) {
      for (const brand of brands) {
        for (const theme of themes) {
          const query = `${brand.toLowerCase()} ${theme.replace('_', ' ')}`;
          const growth = Math.floor(Math.random() * 100);
          const volume = Math.floor(Math.random() * 10000) + 1000;
          const score = growth * Math.log(volume + 1);
          
          try {
            await prisma.$executeRaw`
              INSERT INTO related_queries (
                market, language, brand, query, timeframe,
                growth_pct, rising_score, volume_monthly, cpc,
                theme, theme_confidence, period_start, period_end
              ) VALUES (
                ${market}, 'en', ${brand}, ${query}, '30d',
                ${growth}, ${score}, ${volume}, ${Math.random() * 5},
                ${theme}, 0.9, CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE
              )
            `;
            results.queries++;
          } catch (e) {
            // Skip errors
          }
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Simple seed completed',
      results,
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { error: 'Failed to seed', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}