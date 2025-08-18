# N8N Workflow Import Instructions

## Manual Import Process

Since the API requires specific formatting, please follow these steps to import the workflows manually:

### Step 1: Access N8N
1. Go to: https://mindsparkdigitallabs.app.n8n.cloud
2. Log in with your credentials

### Step 2: Import Workflows

#### Option A: Via UI Import
1. Click on **Workflows** in the left sidebar
2. Click the **⋮** (three dots) menu in the top right
3. Select **Import from File**
4. Upload these files one by one:
   - `web-activity-firecrawl.json`
   - `advanced-firecrawl-workflow.json`

#### Option B: Via Settings
1. Go to **Settings** → **Community Nodes**
2. Click **Import Workflow**
3. Copy and paste the JSON content from each file

### Step 3: Configure Credentials

After importing, you'll need to set up the following credentials:

#### 1. Firecrawl API
- Go to **Credentials** → **New**
- Search for "HTTP Header Auth"
- Name: "Firecrawl API"
- Header Name: `Authorization`
- Header Value: `Bearer YOUR_FIRECRAWL_API_KEY`

#### 2. Your API Endpoint
- Type: HTTP Header Auth
- Name: "OO Insights API"
- Header Name: `X-Cron-Secret`
- Header Value: Your CRON_SECRET from .env.local

#### 3. Slack (Optional)
- Type: Slack
- Add your webhook URL

### Step 4: Update Workflow Settings

In each workflow, update:

1. **API URLs**:
   - Replace `https://oo.mindsparkdigitallabs.com` with your actual domain
   - Verify endpoints:
     - `/api/crawl/full-website`
     - `/api/web-activity/store`

2. **Schedule**:
   - Basic workflow: Daily at 9 AM CET (already configured)
   - Advanced workflow: Daily at 9 AM CET (already configured)

3. **Rate Limiting**:
   - Batch size: 5 pages
   - Delay: 1-2 seconds between requests
   - Timeout: 60 seconds per request

### Step 5: Test Workflows

1. **Test Basic Workflow**:
   - Open "OO Insights - Web Activity Firecrawl"
   - Click **Execute Workflow** button
   - Monitor the execution

2. **Test Advanced Workflow**:
   - Open "OO Insights - Advanced Firecrawl with Sitemap"
   - Click **Execute Workflow** button
   - Check if sitemap parsing works

### Step 6: Activate Workflows

Once tested successfully:
1. Toggle the **Active** switch on each workflow
2. Workflows will now run on schedule

## Webhook Endpoints

After activation, you'll have webhook endpoints for manual triggers:

- Basic: `https://mindsparkdigitallabs.app.n8n.cloud/webhook/[workflow-id]/trigger-crawl`
- Advanced: `https://mindsparkdigitallabs.app.n8n.cloud/webhook/[workflow-id]/trigger-crawl`

## Monitoring

### Check Execution History
1. Go to **Executions** in the sidebar
2. Filter by workflow name
3. Click on any execution to see details

### Set Up Error Notifications
1. Go to **Settings** → **Error Workflow**
2. Create an error handler workflow
3. Configure it to send alerts via Slack/Email

## Troubleshooting

### Common Issues

1. **"No credentials found"**
   - Double-check credential names match exactly
   - Ensure credentials are saved and active

2. **"Request timeout"**
   - Increase timeout in HTTP Request nodes
   - Reduce batch size

3. **"Rate limit exceeded"**
   - Increase delay between requests
   - Reduce parallel executions

4. **"Invalid JSON"**
   - Check workflow JSON syntax
   - Remove any unsupported fields

## Support

- N8N Documentation: https://docs.n8n.io
- Community Forum: https://community.n8n.io
- Your Instance: https://mindsparkdigitallabs.app.n8n.cloud