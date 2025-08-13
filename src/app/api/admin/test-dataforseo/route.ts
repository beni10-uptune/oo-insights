import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Check for admin secret
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    
    if (secret !== 'test-dataforseo-2024') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Step 1: Check environment variables
    const hasLogin = !!process.env.DATAFORSEO_LOGIN;
    const hasPassword = !!process.env.DATAFORSEO_PASSWORD;
    const hasDatabase = !!process.env.DATABASE_URL;
    
    const envCheck = {
      DATAFORSEO_LOGIN: hasLogin ? '✅ Set' : '❌ Missing',
      DATAFORSEO_PASSWORD: hasPassword ? '✅ Set' : '❌ Missing',
      DATABASE_URL: hasDatabase ? '✅ Set' : '❌ Missing',
    };
    
    // Step 2: Try to initialize DataForSEO client
    let clientStatus = 'Not tested';
    let apiTestResult = null;
    
    if (hasLogin && hasPassword) {
      try {
        await import('@/lib/dataforseo/client');
        clientStatus = '✅ Client module loaded';
        
        // Step 3: Make a simple API call to test credentials
        try {
          // Test with a simple endpoint that doesn't consume credits
          const testResponse = await fetch('https://api.dataforseo.com/v3/merchant/google/sellers/task_get', {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${Buffer.from(`${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`).toString('base64')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify([{
              id: "test_connection"
            }])
          });
          
          const data = await testResponse.json();
          
          if (testResponse.ok) {
            apiTestResult = {
              status: '✅ API connection successful',
              statusCode: testResponse.status,
              apiVersion: data.version || 'Unknown'
            };
          } else {
            apiTestResult = {
              status: '❌ API connection failed',
              statusCode: testResponse.status,
              error: data.status_message || 'Unknown error'
            };
          }
        } catch (apiError) {
          apiTestResult = {
            status: '❌ API request failed',
            error: apiError instanceof Error ? apiError.message : 'Unknown error'
          };
        }
      } catch (clientError) {
        clientStatus = `❌ Client initialization failed: ${clientError instanceof Error ? clientError.message : 'Unknown error'}`;
      }
    } else {
      clientStatus = '⚠️ Cannot test - credentials missing';
    }
    
    // Step 4: Test database connection
    let dbStatus = 'Not tested';
    if (hasDatabase) {
      try {
        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();
        
        // Try a simple query
        await prisma.$queryRaw`SELECT 1`;
        dbStatus = '✅ Database connected';
        
        // Check if trends tables exist
        const tablesResult = await prisma.$queryRaw`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name IN ('trends_series', 'related_queries', 'top_volume_queries')
        ` as Array<{ table_name: string }>;
        
        if (tablesResult.length > 0) {
          dbStatus += ` (${tablesResult.length} trends tables found)`;
        } else {
          dbStatus += ' (⚠️ No trends tables found - need to run setup)';
        }
        
        await prisma.$disconnect();
      } catch (dbError) {
        dbStatus = `❌ Database connection failed: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`;
      }
    } else {
      dbStatus = '⚠️ Cannot test - DATABASE_URL missing';
    }
    
    return NextResponse.json({
      success: true,
      message: 'DataForSEO connection test',
      environment: process.env.NODE_ENV,
      checks: {
        environment_variables: envCheck,
        dataforseo_client: clientStatus,
        dataforseo_api: apiTestResult,
        database: dbStatus
      },
      next_steps: [
        hasLogin && hasPassword ? '✅ DataForSEO credentials configured' : '❌ Add DataForSEO credentials to Vercel',
        hasDatabase ? '✅ Database URL configured' : '❌ Add DATABASE_URL to Vercel',
        'Run /api/admin/fetch-real-trends?secret=fetch-real-trends-2024&test=true to fetch data'
      ]
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    return NextResponse.json(
      { 
        error: 'Test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}