import { NextRequest, NextResponse } from 'next/server';
import { classifyTopics } from '@/lib/vertex-ai';

const DEFAULT_TOPICS = [
  'Wegovy',
  'Mounjaro',
  'Ozempic',
  'Clinical Trials',
  'Regulatory',
  'Patient Stories',
  'Healthcare Policy',
  'Insurance Coverage',
  'Side Effects',
  'Efficacy',
  'Competition',
  'Market Analysis',
  'Pricing',
  'Access',
  'Education',
];

export async function POST(request: NextRequest) {
  try {
    const { content, topics } = await request.json();

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    const classifiedTopics = await classifyTopics(
      content,
      topics || DEFAULT_TOPICS
    );

    return NextResponse.json({ topics: classifiedTopics });
  } catch (error) {
    console.error('Classification error:', error);
    return NextResponse.json(
      { error: 'Failed to classify content' },
      { status: 500 }
    );
  }
}