# N8N API Guide for OO Insights

## Overview
This guide documents how to manage N8N workflows programmatically using the REST API, since N8N MCP tools are not directly available in Claude Code.

## Authentication
All API requests require the API key in the header:
```bash
X-N8N-API-KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## API Endpoints

### Base URL
```
https://mindsparkdigitallabs.app.n8n.cloud/api/v1
```

### Workflows

#### List All Workflows
```bash
GET /workflows
```

Example:
```bash
curl -X GET "https://mindsparkdigitallabs.app.n8n.cloud/api/v1/workflows" \
  -H "X-N8N-API-KEY: YOUR_API_KEY"
```

Response:
```json
{
  "data": [
    {
      "id": "workflow_id",
      "name": "Workflow Name",
      "active": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### Get Specific Workflow
```bash
GET /workflows/{id}
```

#### Create Workflow
```bash
POST /workflows
```

Required structure:
```json
{
  "name": "OO Insights Workflow",
  "nodes": [
    {
      "parameters": {},
      "name": "Node Name",
      "type": "n8n-nodes-base.scheduleTrigger",
      "typeVersion": 1.1,
      "position": [250, 300],
      "id": "unique-id"
    }
  ],
  "connections": {
    "Node Name": {
      "main": [[{"node": "Next Node", "type": "main", "index": 0}]]
    }
  },
  "settings": {
    "executionOrder": "v1"  // REQUIRED
  }
}
```

#### Update Workflow
```bash
PATCH /workflows/{id}
```

Example to activate:
```bash
curl -X PATCH "https://mindsparkdigitallabs.app.n8n.cloud/api/v1/workflows/WORKFLOW_ID" \
  -H "X-N8N-API-KEY: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"active": true}'
```

#### Delete Workflow
```bash
DELETE /workflows/{id}
```

### Executions

#### List Executions
```bash
GET /executions
```

Query parameters:
- `workflowId`: Filter by workflow
- `status`: Filter by status (success, error, running)
- `limit`: Number of results (default: 10)

#### Get Execution Details
```bash
GET /executions/{id}
```

#### Delete Execution
```bash
DELETE /executions/{id}
```

## Common Node Types

### Schedule Trigger
```json
{
  "parameters": {
    "rule": {
      "interval": [
        {"cronExpression": "0 9 * * *"}  // Daily at 9 AM
      ]
    }
  },
  "name": "Daily Schedule",
  "type": "n8n-nodes-base.scheduleTrigger",
  "typeVersion": 1.1
}
```

### HTTP Request
```json
{
  "parameters": {
    "method": "POST",
    "url": "https://api.example.com/endpoint",
    "sendBody": true,
    "bodyParameters": {
      "parameters": [
        {"name": "key", "value": "value"}
      ]
    },
    "options": {
      "timeout": 300000  // 5 minutes
    }
  },
  "name": "API Call",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2
}
```

### Wait Node (Rate Limiting)
```json
{
  "parameters": {
    "amount": 60,
    "unit": "seconds"
  },
  "name": "Rate Limit",
  "type": "n8n-nodes-base.wait",
  "typeVersion": 1
}
```

### Split in Batches
```json
{
  "parameters": {
    "batchSize": 1
  },
  "name": "Process One at a Time",
  "type": "n8n-nodes-base.splitInBatches",
  "typeVersion": 3
}
```

## Firecrawl Workflow Example

Complete working example for web crawling:

```javascript
const workflow = {
  "name": "Firecrawl Web Activity",
  "nodes": [
    {
      "parameters": {
        "rule": {
          "interval": [{"cronExpression": "0 9 * * *"}]
        }
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
        "options": {
          "timeout": 300000
        }
      },
      "name": "Crawl Germany",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [450, 300],
      "id": "http-1"
    }
  ],
  "connections": {
    "Schedule": {
      "main": [[{"node": "Crawl Germany", "type": "main", "index": 0}]]
    }
  },
  "settings": {
    "executionOrder": "v1",
    "timezone": "Europe/Berlin",
    "executionTimeout": 7200
  }
};

// Create via API
fetch('https://mindsparkdigitallabs.app.n8n.cloud/api/v1/workflows', {
  method: 'POST',
  headers: {
    'X-N8N-API-KEY': 'YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(workflow)
});
```

## Error Handling

### Common API Errors

1. **Missing Settings**
```json
{"message": "request/body must have required property 'settings'"}
```
Solution: Add `"settings": {"executionOrder": "v1"}`

2. **Invalid Node Type**
```json
{"message": "Node type 'xyz' is not known"}
```
Solution: Check node type and version in N8N documentation

3. **Authentication Failed**
```json
{"message": "Unauthorized"}
```
Solution: Verify API key is correct

## Best Practices

### 1. Rate Limiting
Always add wait nodes between API calls:
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

### 2. Error Handling
Use IF nodes to check for errors:
```json
{
  "parameters": {
    "conditions": {
      "boolean": [
        {
          "value1": "={{ $json.success }}",
          "value2": true
        }
      ]
    }
  },
  "name": "Check Success",
  "type": "n8n-nodes-base.if",
  "typeVersion": 1
}
```

### 3. Timeout Configuration
Set appropriate timeouts for long-running operations:
- Individual requests: 300000ms (5 minutes)
- Workflow total: 7200 seconds (2 hours)

### 4. Sequential Processing
Process markets one at a time to avoid rate limits:
```json
{
  "parameters": {
    "batchSize": 1,
    "options": {
      "batchInterval": 60000  // 1 minute between batches
    }
  },
  "name": "Sequential Processing",
  "type": "n8n-nodes-base.splitInBatches",
  "typeVersion": 3
}
```

## Monitoring

### Check Workflow Status
```bash
# Get all active workflows
curl -X GET "https://mindsparkdigitallabs.app.n8n.cloud/api/v1/workflows" \
  -H "X-N8N-API-KEY: YOUR_API_KEY" \
  | jq '.data[] | select(.active == true) | {name: .name, id: .id}'
```

### Check Recent Executions
```bash
# Get last 5 executions
curl -X GET "https://mindsparkdigitallabs.app.n8n.cloud/api/v1/executions?limit=5" \
  -H "X-N8N-API-KEY: YOUR_API_KEY" \
  | jq '.data[] | {id: .id, workflow: .workflowData.name, status: .status, startedAt: .startedAt}'
```

## Troubleshooting

### Debug Workflow Creation
1. Start with minimal workflow (just trigger node)
2. Test in N8N UI first
3. Export JSON and use as template
4. Add nodes incrementally

### Common Issues

**Issue**: Workflow creates but won't activate
**Solution**: Configure credentials in N8N UI first

**Issue**: Timeouts on long-running tasks
**Solution**: Increase timeout in node options and workflow settings

**Issue**: Rate limit errors (502)
**Solution**: Add wait nodes, reduce batch size

**Issue**: Can't find workflow ID
**Solution**: List all workflows and grep by name:
```bash
curl -X GET "https://mindsparkdigitallabs.app.n8n.cloud/api/v1/workflows" \
  -H "X-N8N-API-KEY: YOUR_API_KEY" \
  | jq '.data[] | select(.name | contains("OO Insights"))'
```

## Links
- N8N Instance: https://mindsparkdigitallabs.app.n8n.cloud
- N8N API Docs: https://docs.n8n.io/api/
- N8N Community: https://community.n8n.io/