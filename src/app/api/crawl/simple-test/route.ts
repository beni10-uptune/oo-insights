import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  
  return NextResponse.json({
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey?.length || 0,
    apiKeyPrefix: apiKey?.substring(0, 5) || 'none',
    nodeEnv: process.env.NODE_ENV,
    envKeys: Object.keys(process.env).filter(k => k.includes('FIRE') || k.includes('CRAWL')),
  });
}