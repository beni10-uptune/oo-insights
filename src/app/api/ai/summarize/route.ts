import { NextRequest, NextResponse } from 'next/server';
import { summarizeContent } from '@/lib/services/simple-ai';

export async function POST(request: NextRequest) {
  try {
    const { content, language = 'en' } = await request.json();

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    const result = await summarizeContent(content, language);

    return NextResponse.json({ 
      success: true,
      summary: result.english, // Return English summary
      original: result.original, // Original language summary
    });
  } catch (error) {
    console.error('Summarization error:', error);
    return NextResponse.json(
      { error: 'Failed to summarize content' },
      { status: 500 }
    );
  }
}