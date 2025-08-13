import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'your-secure-cron-secret-here';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid cron secret' },
        { status: 401 }
      );
    }
    
    console.log('[CRON] Starting daily trends data fetch at', new Date().toISOString());
    
    // Call the fetch-all-markets endpoint to get fresh data
    try {
      const baseUrl = process.env.NEXTAUTH_URL || 'https://oo.mindsparkdigitallabs.com';
      const fetchUrl = `${baseUrl}/api/admin/fetch-all-markets?secret=fetch-all-markets-2024`;
      
      console.log('[CRON] Calling fetch-all-markets endpoint...');
      
      const response = await fetch(fetchUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Set a long timeout since this fetches all markets
        signal: AbortSignal.timeout(600000) // 10 minutes timeout
      });
      
      if (!response.ok) {
        throw new Error(`Fetch failed with status ${response.status}`);
      }
      
      const data = await response.json();
      
      // Log job completion
      await prisma.$executeRaw`
        INSERT INTO jobs_trends (
          market, language, job_type, status, completed_at
        ) VALUES (
          'ALL', 'multi', 'daily_cron', 'success', CURRENT_TIMESTAMP
        )
      `;
      
      const executionTime = Math.round((Date.now() - startTime) / 1000);
      
      console.log('[CRON] Daily trends fetch completed successfully');
      console.log(`[CRON] Processed markets: ${data.summary?.markets_successful?.join(', ')}`);
      console.log(`[CRON] Total execution time: ${executionTime} seconds`);
      
      return NextResponse.json({
        success: true,
        message: 'Daily trends data fetch completed',
        execution_time: `${executionTime} seconds`,
        data: data.summary,
        timestamp: new Date().toISOString()
      });
      
    } catch (fetchError) {
      console.error('[CRON] Error fetching trends data:', fetchError);
      
      // Log job failure
      await prisma.$executeRaw`
        INSERT INTO jobs_trends (
          market, language, job_type, status, error_message, completed_at
        ) VALUES (
          'ALL', 'multi', 'daily_cron', 'failed', 
          ${fetchError instanceof Error ? fetchError.message : 'Unknown error'},
          CURRENT_TIMESTAMP
        )
      `;
      
      throw fetchError;
    }
    
  } catch (error) {
    console.error('[CRON] Fatal error in trends daily job:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch trends data',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}