import { NextRequest, NextResponse } from 'next/server';

export async function POST(_request: NextRequest) {
  try {
    // This endpoint allows manual triggering of the trends fetch job
    // In production, you might want to add additional authentication
    
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return NextResponse.json(
        { error: 'CRON_SECRET not configured' },
        { status: 500 }
      );
    }
    
    // Call the cron endpoint with the secret
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/cron/trends-daily`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to trigger trends job', details: data },
        { status: response.status }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Trends fetch job triggered successfully',
      data,
    });
  } catch (error) {
    console.error('Failed to trigger trends job:', error);
    return NextResponse.json(
      { 
        error: 'Failed to trigger trends job',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}