import { NextRequest, NextResponse } from 'next/server';
import { getRecentEvents } from '@/lib/services/web-activity';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const market = searchParams.get('market') || undefined;
    const language = searchParams.get('language') || undefined;
    const eventType = searchParams.get('eventType') as 'created' | 'updated' | undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100;
    const days = searchParams.get('days') ? parseInt(searchParams.get('days')!) : undefined;
    
    let startDate: Date | undefined;
    if (days) {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
    }
    
    const events = await getRecentEvents({
      market,
      language,
      eventType,
      startDate,
      limit,
    });
    
    return NextResponse.json({
      success: true,
      count: events.length,
      events,
    });
  } catch (error) {
    console.error('Get events error:', error);
    return NextResponse.json(
      { error: 'Failed to get events', details: String(error) },
      { status: 500 }
    );
  }
}