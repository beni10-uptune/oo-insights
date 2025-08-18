import { NextResponse } from 'next/server';
import { testVertexAI } from '@/lib/vertex-ai-fixed';
import { summarizeContent } from '@/lib/services/ai-analysis';

export async function GET() {
  try {
    // Test basic connection
    const connectionTest = await testVertexAI();
    
    // Test summarization
    let summaryTest = { success: false, result: null, error: null };
    
    try {
      const testContent = "L'obesità è una malattia cronica che richiede trattamento medico. Questa condizione aumenta il rischio di diabete e malattie cardiache.";
      const summary = await summarizeContent(testContent, 'it');
      summaryTest = {
        success: true,
        result: summary,
        error: null,
      };
    } catch (error: any) {
      summaryTest = {
        success: false,
        result: null,
        error: error.message,
      };
    }

    return NextResponse.json({
      success: connectionTest,
      tests: {
        connection: connectionTest,
        summarization: summaryTest,
      },
      environment: {
        hasProjectId: !!process.env.GCP_PROJECT_ID,
        hasCredentials: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
        hasCredentialsJson: !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
        location: process.env.VERTEXAI_LOCATION || 'not set',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false,
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}