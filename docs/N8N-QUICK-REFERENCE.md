# N8N Quick Reference for Claude Code

## Why This Guide?
N8N MCP tools are designed for Claude Desktop and don't expose tools directly in Claude Code. Use the REST API instead.

## Essential Commands

### Set API Key First
```bash
export N8N_API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2MWJiNjZiZS01ZGIyLTRiMjMtOTZiYi00NzkyMjk5OWJhYTAiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzU1MzI1ODY0fQ.9gPYA1GNWHu5T-ARFxrhZiZSK9Yu0AvNPg3IDEw-q54"
```

### List All Workflows
```bash
curl -X GET "https://mindsparkdigitallabs.app.n8n.cloud/api/v1/workflows" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" | jq '.data[] | {name: .name, id: .id, active: .active}'
```

### Create Minimal Workflow
```bash
cat > workflow.json << 'EOF'
{
  "name": "Test Workflow",
  "nodes": [
    {
      "parameters": {"rule": {"interval": [{"cronExpression": "0 9 * * *"}]}},
      "name": "Schedule",
      "type": "n8n-nodes-base.scheduleTrigger",
      "typeVersion": 1.1,
      "position": [250, 300],
      "id": "node-1"
    }
  ],
  "connections": {},
  "settings": {"executionOrder": "v1"}
}
EOF

curl -X POST "https://mindsparkdigitallabs.app.n8n.cloud/api/v1/workflows" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -d @workflow.json
```

### Activate Workflow
```bash
curl -X PATCH "https://mindsparkdigitallabs.app.n8n.cloud/api/v1/workflows/WORKFLOW_ID" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"active": true}'
```

### Get Workflow Details
```bash
curl -X GET "https://mindsparkdigitallabs.app.n8n.cloud/api/v1/workflows/WORKFLOW_ID" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" | jq
```

### Delete Workflow
```bash
curl -X DELETE "https://mindsparkdigitallabs.app.n8n.cloud/api/v1/workflows/WORKFLOW_ID" \
  -H "X-N8N-API-KEY: $N8N_API_KEY"
```

### Check Recent Executions
```bash
curl -X GET "https://mindsparkdigitallabs.app.n8n.cloud/api/v1/executions?limit=5" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" | jq '.data[] | {workflow: .workflowData.name, status: .status}'
```

## Firecrawl Workflow Template

### Basic Structure
```json
{
  "name": "Firecrawl Daily",
  "nodes": [
    {
      "parameters": {
        "rule": {"interval": [{"cronExpression": "0 9 * * *"}]}
      },
      "name": "Schedule",
      "type": "n8n-nodes-base.scheduleTrigger",
      "typeVersion": 1.1,
      "position": [250, 300],
      "id": "schedule-1"
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://oo.mindsparkdigitallabs.com/api/crawl/full-website",
        "sendBody": true,
        "bodyParameters": {
          "parameters": [
            {"name": "market", "value": "de"},
            {"name": "maxPages", "value": "100"}
          ]
        },
        "options": {"timeout": 300000}
      },
      "name": "Crawl",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [450, 300],
      "id": "http-1"
    }
  ],
  "connections": {
    "Schedule": {
      "main": [[{"node": "Crawl", "type": "main", "index": 0}]]
    }
  },
  "settings": {
    "executionOrder": "v1",
    "timezone": "Europe/Berlin",
    "executionTimeout": 7200
  }
}
```

## Common Patterns

### Sequential Market Processing
```javascript
// Process markets one by one with rate limiting
const markets = ['de', 'fr', 'it', 'es'];
for (const market of markets) {
  // Create HTTP request node for market
  // Add wait node (60 seconds)
  // Connect to next market
}
```

### Error Handling
```json
{
  "parameters": {
    "conditions": {
      "boolean": [
        {"value1": "={{ $json.success }}", "value2": true}
      ]
    }
  },
  "name": "Check Success",
  "type": "n8n-nodes-base.if",
  "typeVersion": 1
}
```

### Rate Limiting
```json
{
  "parameters": {
    "amount": 60,
    "unit": "seconds"
  },
  "name": "Wait 60s",
  "type": "n8n-nodes-base.wait",
  "typeVersion": 1
}
```

## Troubleshooting

### Error: "request/body must have required property 'settings'"
Add: `"settings": {"executionOrder": "v1"}`

### Error: "No credentials found"
Configure credentials in N8N UI first, then activate via API

### Error: "Timeout"
Increase timeout in node options: `"options": {"timeout": 300000}`

### Find Workflow by Name
```bash
curl -X GET "https://mindsparkdigitallabs.app.n8n.cloud/api/v1/workflows" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  | jq '.data[] | select(.name | contains("Firecrawl"))'
```

## Current Active Workflows

### OO Insights Complete Firecrawl
- **ID**: kOJ5lfCKRGBKlUEQ
- **Schedule**: Daily 9 AM CET
- **Markets**: DE (100), FR (80), IT (80), ES (80)

### OO Insights Firecrawl Daily
- **ID**: dEFBOLHhwJoyGIRW
- **Schedule**: Daily 9 AM CET
- **Market**: Germany only

## Important Notes

1. **MCP vs API**: N8N MCP is for Claude Desktop UI, not Claude Code
2. **Use REST API**: Always use the API with the key for programmatic access
3. **Test First**: Always test workflows manually before activating
4. **Rate Limits**: Always include wait nodes between API calls
5. **Credentials**: Must be configured in N8N UI, can't be set via API

## Links
- N8N Instance: https://mindsparkdigitallabs.app.n8n.cloud
- API Docs: https://docs.n8n.io/api/
- Workflow Files: `/n8n-workflows/`