# Setting Up Vertex AI Authentication

## Issue
The AI summarization feature is not working because Google Cloud credentials are not configured.

## Solution

You need to set up Google Cloud service account credentials. Here's how:

### Step 1: Create Service Account (if not already created)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select project: `oo-insights-468716`
3. Go to **IAM & Admin** → **Service Accounts**
4. Click **Create Service Account**
5. Name: `vertex-ai-service`
6. Grant roles:
   - `Vertex AI User`
   - `Service Usage Consumer`
7. Click **Done**

### Step 2: Generate Service Account Key

1. Click on the service account you created
2. Go to **Keys** tab
3. Click **Add Key** → **Create new key**
4. Choose **JSON** format
5. Download the key file

### Step 3: Add to Environment Variables

#### For Local Development (.env.local)

Add the path to your downloaded JSON file:
```bash
GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/service-account-key.json
```

OR add the JSON content directly:
```bash
GOOGLE_APPLICATION_CREDENTIALS_JSON='{"type":"service_account","project_id":"oo-insights-468716",...}'
```

#### For Production (Vercel)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select the `oo-insights` project
3. Go to **Settings** → **Environment Variables**
4. Add variable:
   - Name: `GOOGLE_APPLICATION_CREDENTIALS_JSON`
   - Value: (paste entire JSON content from the key file)
   - Environment: Production

### Step 4: Verify Setup

Test the connection:
```bash
curl http://localhost:3002/api/test/vertex-ai
```

Should return:
```json
{
  "success": true,
  "tests": {
    "connection": true,
    "summarization": {
      "success": true,
      "result": {
        "original": "...",
        "english": "..."
      }
    }
  }
}
```

## Alternative: Use gcloud CLI

If you have gcloud installed and authenticated:

```bash
# Login to Google Cloud
gcloud auth login

# Set project
gcloud config set project oo-insights-468716

# Create service account
gcloud iam service-accounts create vertex-ai-service \
  --display-name="Vertex AI Service Account"

# Grant permissions
gcloud projects add-iam-policy-binding oo-insights-468716 \
  --member="serviceAccount:vertex-ai-service@oo-insights-468716.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

# Create key
gcloud iam service-accounts keys create vertex-ai-key.json \
  --iam-account="vertex-ai-service@oo-insights-468716.iam.gserviceaccount.com"

# Add to .env.local
echo "GOOGLE_APPLICATION_CREDENTIALS=$(pwd)/vertex-ai-key.json" >> .env.local
```

## Important Notes

- **Never commit the service account key file to Git**
- Add `*.json` to `.gitignore` if not already there
- For production, always use environment variables in Vercel, not files
- The key gives access to Vertex AI, so keep it secure

## Once Configured

The system will automatically:
1. Generate English summaries for all non-English content
2. Categorize pages (article, treatment, patient resources, etc.)
3. Extract key topics and medications mentioned
4. Improve timeline readability for international content