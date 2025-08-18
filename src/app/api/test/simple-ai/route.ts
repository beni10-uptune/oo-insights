import { NextResponse } from 'next/server';
import { summarizeContent, classifyContent, testAIConfiguration } from '@/lib/services/simple-ai';

export async function GET() {
  try {
    // Check configuration
    const config = await testAIConfiguration();
    
    // Test summarization if configured
    let testSummary = null;
    if (config.configured) {
      try {
        const testContent = "L'obesità è una malattia cronica che richiede un approccio multidisciplinare. Il trattamento include modifiche dello stile di vita e, in alcuni casi, farmaci come Wegovy o Mounjaro.";
        testSummary = await summarizeContent(testContent, 'it');
      } catch (error: any) {
        testSummary = { error: error.message };
      }
    }

    // Test classification
    let testClassification = null;
    try {
      const testContent = "This page provides information about finding a doctor who specializes in obesity treatment. Use our HCP locator to find physicians near you.";
      testClassification = await classifyContent(testContent);
    } catch (error: any) {
      testClassification = { error: error.message };
    }

    return NextResponse.json({
      configured: config.configured,
      provider: config.provider,
      setupInstructions: !config.configured ? {
        message: "No AI API key configured",
        options: [
          "Add GEMINI_API_KEY to .env.local (free tier available!)",
          "Add OPENROUTER_API_KEY to .env.local",
          "Add ANTHROPIC_API_KEY to .env.local"
        ],
        quickStart: "Get a free Gemini key at: https://makersuite.google.com/app/apikey"
      } : null,
      testSummary: testSummary,
      testClassification: testClassification,
      environment: {
        hasGemini: !!process.env.GEMINI_API_KEY,
        hasOpenRouter: !!process.env.OPENROUTER_API_KEY,
        hasAnthropic: !!process.env.ANTHROPIC_API_KEY,
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { 
        error: error.message,
        setupHelp: "See /SIMPLE-AI-SETUP.md for instructions"
      },
      { status: 500 }
    );
  }
}