#!/bin/bash

# N8N Workflow Deployment Script
# Deploys Firecrawl workflows to N8N instance

N8N_URL="https://mindsparkdigitallabs.app.n8n.cloud"
API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2MWJiNjZiZS01ZGIyLTRiMjMtOTZiYi00NzkyMjk5OWJhYTAiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU1MzI1ODY0fQ.9gPYA1GNWHu5T-ARFxrhZiZSK9Yu0AvNPg3IDEw-q54"

echo "🚀 Deploying N8N Workflows for OO Insights Web Activity Firecrawl"
echo "=================================================="

# Function to import workflow
import_workflow() {
    local workflow_file=$1
    local workflow_name=$2
    
    echo "📦 Importing $workflow_name..."
    
    # Read workflow JSON
    workflow_json=$(cat "$workflow_file")
    
    # Create workflow via API
    response=$(curl -s -X POST \
        "$N8N_URL/api/v1/workflows" \
        -H "X-N8N-API-KEY: $API_KEY" \
        -H "Content-Type: application/json" \
        -d "$workflow_json")
    
    # Check response
    if echo "$response" | grep -q '"id"'; then
        workflow_id=$(echo "$response" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
        echo "✅ Successfully imported $workflow_name (ID: $workflow_id)"
        
        # Activate workflow
        echo "🔄 Activating workflow..."
        curl -s -X PATCH \
            "$N8N_URL/api/v1/workflows/$workflow_id" \
            -H "X-N8N-API-KEY: $API_KEY" \
            -H "Content-Type: application/json" \
            -d '{"active": true}' > /dev/null
        
        echo "✅ Workflow activated!"
    else
        echo "❌ Failed to import $workflow_name"
        echo "Response: $response"
    fi
    
    echo ""
}

# Check if workflow files exist
if [ ! -f "web-activity-firecrawl.json" ]; then
    echo "❌ Workflow files not found. Please run this script from the n8n-workflows directory."
    exit 1
fi

# Import workflows
import_workflow "web-activity-firecrawl.json" "OO Insights - Web Activity Firecrawl"
import_workflow "advanced-firecrawl-workflow.json" "OO Insights - Advanced Firecrawl with Sitemap"

echo "=================================================="
echo "🎉 Deployment Complete!"
echo ""
echo "Next Steps:"
echo "1. Visit $N8N_URL to configure credentials"
echo "2. Set up Firecrawl API key"
echo "3. Configure Slack webhooks (optional)"
echo "4. Test manual execution"
echo "5. Verify scheduled triggers"
echo ""
echo "Manual Trigger Webhook:"
echo "$N8N_URL/webhook/trigger-crawl"
echo ""
echo "Documentation: n8n-workflows/README.md"