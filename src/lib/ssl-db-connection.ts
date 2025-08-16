import fs from 'fs';
import path from 'path';

/**
 * Setup SSL certificates for PostgreSQL connection in serverless environments
 * This function writes the base64-encoded certificates from environment variables
 * to the /tmp directory where they can be used by the database connection
 */
export function setupSSLCertificates(): void {
  // Only run in serverless environments (Vercel) or production
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    const tmpDir = '/tmp';
    
    try {
      // Write client private key
      if (process.env.PGSSLKEY_B64) {
        const clientKey = Buffer.from(process.env.PGSSLKEY_B64, 'base64').toString();
        const keyPath = path.join(tmpDir, 'client-key.pem');
        fs.writeFileSync(keyPath, clientKey, { mode: 0o600 }); // Secure permissions
        console.log('✅ SSL client key written to:', keyPath);
      }
      
      // Write client certificate
      if (process.env.PGSSLCERT_B64) {
        const clientCert = Buffer.from(process.env.PGSSLCERT_B64, 'base64').toString();
        const certPath = path.join(tmpDir, 'client-cert.pem');
        fs.writeFileSync(certPath, clientCert, { mode: 0o644 });
        console.log('✅ SSL client certificate written to:', certPath);
      }
      
      // Write server CA certificate
      if (process.env.PGSSLROOTCERT_B64) {
        const serverCa = Buffer.from(process.env.PGSSLROOTCERT_B64, 'base64').toString();
        const caPath = path.join(tmpDir, 'server-ca.pem');
        fs.writeFileSync(caPath, serverCa, { mode: 0o644 });
        console.log('✅ SSL server CA certificate written to:', caPath);
      }
    } catch (error) {
      console.error('❌ Error setting up SSL certificates:', error);
      throw error;
    }
  }
}

/**
 * Get the appropriate database URL for the current environment
 * In production/Vercel, it ensures SSL certificates are set up and returns the SSL-enabled URL
 * In development, it returns the standard URL
 */
export function getSSLDatabaseURL(): string {
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    // Ensure certificates are written to /tmp
    setupSSLCertificates();
    
    // Return URL with SSL certificate paths for production
    const baseUrl = process.env.DATABASE_URL;
    if (baseUrl && !baseUrl.includes('sslcert=')) {
      // Add SSL parameters if not already present
      const url = new URL(baseUrl);
      url.searchParams.set('sslmode', 'require');
      url.searchParams.set('sslcert', '/tmp/client-cert.pem');
      url.searchParams.set('sslkey', '/tmp/client-key.pem');
      url.searchParams.set('sslrootcert', '/tmp/server-ca.pem');
      return url.toString();
    }
    
    return baseUrl || '';
  }
  
  // For local development, use the original URL (can use Cloud SQL Proxy)
  return process.env.DATABASE_URL || '';
}

/**
 * Get SSL configuration object for direct PostgreSQL client connections
 * This is useful when you need to pass SSL config directly to pg.Client
 */
export function getSSLConfig(): false | {
  key: string;
  cert: string;
  ca: string;
  rejectUnauthorized: boolean;
} {
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    setupSSLCertificates();
    
    const tmpDir = '/tmp';
    const keyPath = path.join(tmpDir, 'client-key.pem');
    const certPath = path.join(tmpDir, 'client-cert.pem');
    const caPath = path.join(tmpDir, 'server-ca.pem');
    
    // Check if all certificate files exist
    if (fs.existsSync(keyPath) && fs.existsSync(certPath) && fs.existsSync(caPath)) {
      return {
        key: fs.readFileSync(keyPath, 'utf8'),
        cert: fs.readFileSync(certPath, 'utf8'),
        ca: fs.readFileSync(caPath, 'utf8'),
        rejectUnauthorized: true
      };
    }
  }
  
  // Return false for local development (no SSL required with Cloud SQL Proxy)
  return false;
}

/**
 * Validate that all required SSL environment variables are present
 */
export function validateSSLEnvironment(): { 
  valid: boolean; 
  missing: string[]; 
  hasSSLCerts: boolean;
} {
  const requiredVars = ['PGSSLKEY_B64', 'PGSSLCERT_B64', 'PGSSLROOTCERT_B64'];
  const missing: string[] = [];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }
  
  return {
    valid: missing.length === 0,
    missing,
    hasSSLCerts: missing.length === 0
  };
}

/**
 * Get connection info for debugging
 */
export function getConnectionInfo(): {
  environment: string;
  hasSSLVars: boolean;
  databaseUrl: string;
  sslMode: string;
} {
  const validation = validateSSLEnvironment();
  const dbUrl = getSSLDatabaseURL();
  
  let sslMode = 'none';
  if (dbUrl.includes('sslmode=require')) sslMode = 'require';
  if (dbUrl.includes('sslcert=')) sslMode = 'client-certificates';
  
  return {
    environment: process.env.VERCEL ? 'vercel' : process.env.NODE_ENV || 'development',
    hasSSLVars: validation.hasSSLCerts,
    databaseUrl: dbUrl.replace(/password=[^&@]+/g, 'password=***'),
    sslMode
  };
}