import { NextRequest, NextResponse } from 'next/server';
import { summarizeContent } from '@/lib/vertex-ai';

export async function POST(request: NextRequest) {
  try {
    const { content, market, language, maxLength } = await request.json();

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    const summary = await summarizeContent(content, {
      market,
      language,
      maxLength,
    });

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Summarization error:', error);
    return NextResponse.json(
      { error: 'Failed to summarize content' },
      { status: 500 }
    );
  }
}