# Cloud SQL Security Configuration

## Security Updates Applied (August 13, 2025)

### ✅ Completed Security Improvements

1. **Removed Broad Internet Access**
   - Removed: `0.0.0.0/0` (all internet IPs)
   - Added: `77.166.139.71/32` (your specific IP only)
   - Status: ✅ SECURED

2. **Enabled SSL Requirement**
   - All connections now require SSL encryption
   - Status: ✅ ENABLED

3. **Current Configuration**
   ```json
   {
     "authorizedNetworks": [
       {
         "value": "77.166.139.71/32"  // Your development IP only
       }
     ],
     "ipv4Enabled": true,
     "requireSsl": true,
     "sslMode": "ALLOW_UNENCRYPTED_AND_ENCRYPTED"
   }
   ```

## Connection Methods

### Local Development
Use Cloud SQL Proxy (most secure, no public IP needed):
```bash
./cloud-sql-proxy --port 5433 oo-insights-468716:europe-west1:oo-insights-db
```

Connection string in `.env.local`:
```
DATABASE_URL=postgresql://postgres:PASSWORD@localhost:5433/insights?schema=public
```

### Production (Vercel)
Vercel connects via Cloud SQL Auth Proxy automatically. No public IP access needed.

Connection string in Vercel environment variables:
```
DATABASE_URL=postgresql://postgres:PASSWORD@/insights?host=/cloudsql/oo-insights-468716:europe-west1:oo-insights-db&schema=public
```

### Cloud Run / App Engine
Uses Unix socket connection (no public IP needed):
```
DATABASE_URL=postgresql://postgres:PASSWORD@localhost/insights?host=/cloudsql/oo-insights-468716:europe-west1:oo-insights-db
```

## Adding New Developer IPs

If you need to add another developer's IP address:

```bash
# Get current authorized networks
gcloud sql instances describe oo-insights-db \
  --project=oo-insights-468716 \
  --format="value(settings.ipConfiguration.authorizedNetworks[].value)"

# Add new IP (preserve existing ones!)
gcloud sql instances patch oo-insights-db \
  --project=oo-insights-468716 \
  --authorized-networks=77.166.139.71/32,NEW_IP/32 \
  --quiet
```

## Best Practices

1. **Always use Cloud SQL Proxy for local development**
   - More secure than direct IP connections
   - Automatic SSL encryption
   - No need to manage IP allowlists

2. **Production connections should use:**
   - Cloud SQL Auth Proxy (Vercel)
   - Unix sockets (Cloud Run/App Engine)
   - Private IP (if VPC configured)

3. **Never use:**
   - `0.0.0.0/0` in authorized networks
   - Unencrypted connections
   - Database passwords in code

4. **Regular security checks:**
   ```bash
   # Check current security settings
   gcloud sql instances describe oo-insights-db \
     --project=oo-insights-468716 \
     --format="table(settings.ipConfiguration.authorizedNetworks[].value,settings.ipConfiguration.requireSsl)"
   ```

## Monitoring Access

View recent connections:
```bash
# Check operations log
gcloud sql operations list \
  --instance=oo-insights-db \
  --project=oo-insights-468716 \
  --limit=10
```

## Future Enhancements

Consider implementing:
1. **Private IP** - Requires VPC setup but eliminates public IP entirely
2. **IAM Database Authentication** - Use Google accounts instead of passwords
3. **Automated IP rotation** - Script to update authorized IPs automatically
4. **Cloud SQL Insights** - Enable query insights for performance monitoring

## Important Notes

⚠️ **IP Address Changes**: If your IP address changes (new location, ISP change), you'll need to update the authorized networks:

```bash
# Get your new IP
curl -s https://api.ipify.org

# Update Cloud SQL
gcloud sql instances patch oo-insights-db \
  --project=oo-insights-468716 \
  --authorized-networks=NEW_IP/32 \
  --quiet
```

⚠️ **Cloud SQL Proxy is Preferred**: Even with IP allowlisting, always prefer Cloud SQL Proxy for development as it provides:
- Automatic SSL encryption
- IAM-based authentication
- No IP management needed
- Better security overall