import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Sample data for testing
const MARKETS = ['UK', 'FR', 'DE', 'IT', 'ES', 'CA', 'PL'];
const BRANDS = ['Wegovy', 'Ozempic', 'Mounjaro'];

export async function GET(request: NextRequest) {
  try {
    // Check for admin secret
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    
    if (secret !== 'seed-trends-2024') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('Seeding trends data...');
    
    const now = new Date();
    const results = {
      series: 0,
      queries: 0,
      volume: 0,
    };
    
    // 1. Seed trends_series data (30 days of data per brand per market)
    for (const market of MARKETS) {
      for (const brand of BRANDS) {
        // Generate 30 days of trend data
        for (let i = 29; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          
          // Generate realistic trend values
          let baseValue = 50;
          if (brand === 'Wegovy') baseValue = 70;
          if (brand === 'Ozempic') baseValue = 65;
          if (brand === 'Mounjaro') baseValue = 45 + i; // Rising trend
          
          const value = baseValue + Math.sin(i / 5) * 20 + Math.random() * 10;
          
          await prisma.$executeRaw`
            INSERT INTO trends_series (
              market, language, brand, date, interest_index
            ) VALUES (
              ${market}, 'en', ${brand}, ${dateStr}::date, ${Math.round(value)}
            )
            ON CONFLICT (market, brand, date) 
            DO UPDATE SET interest_index = ${Math.round(value)}
          `;
          results.series++;
        }
      }
    }
    
    // 2. Seed related_queries data
    const themes = [
      'side_effects', 'weight_loss', 'availability', 'price', 
      'comparison', 'dosage', 'clinical', 'insurance'
    ];
    
    const queryTemplates = {
      side_effects: [
        '{brand} nausea', '{brand} side effects long term', 
        '{brand} headache', '{brand} fatigue'
      ],
      weight_loss: [
        '{brand} weight loss results', '{brand} before after',
        '{brand} how much weight loss', '{brand} success stories'
      ],
      availability: [
        '{brand} availability {market}', '{brand} stock shortage',
        'where to buy {brand}', '{brand} pharmacy near me'
      ],
      price: [
        '{brand} cost', '{brand} price {market}',
        '{brand} insurance coverage', '{brand} cheaper alternative'
      ],
      comparison: [
        '{brand} vs wegovy', '{brand} vs ozempic',
        '{brand} vs mounjaro', 'which is better {brand} or'
      ],
      dosage: [
        '{brand} dosage', '{brand} how to inject',
        '{brand} pen instructions', '{brand} dose escalation'
      ],
      clinical: [
        '{brand} clinical trials', '{brand} efficacy',
        '{brand} studies', '{brand} FDA approval'
      ],
      insurance: [
        '{brand} insurance', '{brand} coverage',
        '{brand} prior authorization', '{brand} copay card'
      ]
    };
    
    for (const market of MARKETS) {
      for (const brand of BRANDS) {
        for (const theme of themes) {
          const templates = queryTemplates[theme as keyof typeof queryTemplates] || [];
          
          for (const template of templates.slice(0, 2)) { // Take 2 queries per theme
            const query = template
              .replace('{brand}', brand.toLowerCase())
              .replace('{market}', market.toLowerCase());
            
            const volume = Math.floor(Math.random() * 10000) + 1000;
            const growth = Math.random() * 150 - 25; // -25% to +125%
            const risingScore = growth > 0 ? growth * Math.log(volume + 1) : 0;
            
            await prisma.$executeRaw`
              INSERT INTO related_queries (
                market, language, brand, query, timeframe,
                growth_pct, rising_score, volume_monthly, cpc,
                theme, theme_confidence, period_start, period_end
              ) VALUES (
                ${market}, 'en', ${brand}, ${query}, '30d',
                ${growth}, ${risingScore}, ${volume}, ${Math.random() * 5},
                ${theme}, ${0.9}, ${new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()}::timestamp, ${now.toISOString()}::timestamp
              )
              ON CONFLICT (market, brand, query, timeframe, period_end)
              DO UPDATE SET 
                growth_pct = ${growth},
                rising_score = ${risingScore},
                volume_monthly = ${volume}
            `;
            results.queries++;
          }
        }
      }
    }
    
    // 3. Seed top_volume_queries
    const highVolumeQueries = [
      'wegovy', 'ozempic', 'mounjaro',
      'wegovy weight loss', 'ozempic for weight loss', 'mounjaro weight loss',
      'wegovy side effects', 'ozempic side effects', 'mounjaro side effects',
      'wegovy price', 'ozempic price', 'mounjaro price',
      'wegovy availability', 'ozempic pen', 'mounjaro injection'
    ];
    
    for (const market of MARKETS) {
      for (const query of highVolumeQueries) {
        const brand = BRANDS.find(b => query.toLowerCase().includes(b.toLowerCase())) || 'Unknown';
        const volume = Math.floor(Math.random() * 100000) + 10000;
        const growth = Math.random() * 60 - 20; // -20% to +40%
        
        // Determine theme based on query
        let theme = 'brand';
        if (query.includes('weight loss')) theme = 'weight_loss';
        else if (query.includes('side effects')) theme = 'side_effects';
        else if (query.includes('price')) theme = 'price';
        else if (query.includes('availability') || query.includes('pen') || query.includes('injection')) theme = 'availability';
        
        await prisma.$executeRaw`
          INSERT INTO top_volume_queries (
            market, language, query, volume_monthly, cpc,
            theme, brand_hint
          ) VALUES (
            ${market}, 'en', ${query}, ${volume}, ${Math.random() * 10},
            ${theme}, ${brand}
          )
          ON CONFLICT DO NOTHING
        `;
        results.volume++;
      }
    }
    
    console.log('Seeding completed:', results);
    
    return NextResponse.json({
      success: true,
      message: 'Sample trends data seeded successfully',
      results,
    });
  } catch (error) {
    console.error('Seeding error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to seed trends data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}