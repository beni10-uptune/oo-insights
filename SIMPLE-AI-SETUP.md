# Simple AI Setup - Just Add an API Key!

## Quick Setup (Choose ONE option)

### Option 1: Gemini API (Recommended - Has Free Tier!)
1. Go to: https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key
4. Add to `.env.local`:
```bash
GEMINI_API_KEY=your-key-here
```

**Cost**: Free tier includes 60 requests per minute!

### Option 2: OpenRouter (Pay-as-you-go, Many Models)
1. Go to: https://openrouter.ai/keys
2. Sign up and create an API key
3. Add some credits ($5 goes a long way)
4. Add to `.env.local`:
```bash
OPENROUTER_API_KEY=your-key-here
```

**Cost**: ~$0.00015 per summary (Gemini Flash) or ~$0.00025 (Claude Haiku)

### Option 3: Anthropic Claude
1. Go to: https://console.anthropic.com/
2. Create an API key
3. Add to `.env.local`:
```bash
ANTHROPIC_API_KEY=your-key-here
```

**Cost**: ~$0.00025 per summary (Claude Haiku)

## That's It!

Once you add any of these keys, the system will automatically:
- ✅ Generate English summaries for all content
- ✅ Translate non-English pages
- ✅ Categorize content (articles, treatments, etc.)
- ✅ Make the timeline readable in English

## Test Your Setup

```bash
# Restart the dev server
npm run dev

# Test the AI
curl http://localhost:3002/api/test/simple-ai
```

Should return:
```json
{
  "configured": true,
  "provider": "Gemini", // or "OpenRouter" or "Anthropic"
  "testSummary": {
    "success": true,
    "english": "This content discusses obesity..."
  }
}
```

## For Production (Vercel)

Add the same API key to Vercel:
1. Go to your Vercel project settings
2. Environment Variables
3. Add the same key (GEMINI_API_KEY or whichever you chose)
4. Redeploy

## Which Should I Choose?

- **Gemini**: Best for starting (free tier!)
- **OpenRouter**: Best flexibility (access to many models)
- **Anthropic**: Best quality (Claude is very good)

For this project, Gemini is perfect and free!