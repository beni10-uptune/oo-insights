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
    
    // Ensure dates are properly serialized
    const serializedEvents = events.map(event => ({
      ...event,
      crawledAt: event.eventAt?.toISOString() || null,
      createdAt: event.createdAt?.toISOString() || null,
      eventAt: event.eventAt?.toISOString() || null,
      page: event.page ? {
        ...event.page,
        createdAt: event.page.createdAt?.toISOString() || null,
        updatedAt: event.page.updatedAt?.toISOString() || null,
        lastCrawledAt: event.page.lastCrawledAt?.toISOString() || null,
        lastModifiedAt: event.page.lastModifiedAt?.toISOString() || null,
      } : null
    }));
    
    return NextResponse.json({
      success: true,
      count: serializedEvents.length,
      events: serializedEvents,
    });
  } catch (error) {
    console.error('Get events error:', error);
    return NextResponse.json(
      { error: 'Failed to get events', details: String(error) },
      { status: 500 }
    );
  }
}