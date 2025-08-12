import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const apiKey = process.env.FIRECRAWL_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'No API key',
        hasKey: false,
      });
    }
    
    // Make a direct API call to Firecrawl
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://www.example.com',
        formats: ['markdown', 'html'],
      }),
    });
    
    const responseText = await response.text();
    console.log('Raw response:', responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      return NextResponse.json({
        error: 'Invalid JSON response',
        responseText: responseText.substring(0, 500),
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
      });
    }
    
    return NextResponse.json({
      success: response.ok,
      status: response.status,
      hasData: !!data,
      dataKeys: data ? Object.keys(data) : [],
      hasSuccess: 'success' in (data || {}),
      successValue: data?.success,
      hasMarkdown: !!data?.data?.markdown || !!data?.markdown,
      markdownLength: data?.data?.markdown?.length || data?.markdown?.length || 0,
      sampleData: JSON.stringify(data).substring(0, 500),
      fullResponse: data,
    });
  } catch (error: any) {
    return NextResponse.json({
      error: 'Request failed',
      message: error.message,
      stack: error.stack,
    });
  }
}