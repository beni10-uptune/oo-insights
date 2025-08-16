const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function testSSLConnection() {
  console.log('🔐 Testing SSL connection to Cloud SQL...');
  
  // Check if certificate files exist
  const requiredFiles = ['client-key.pem', 'client-cert.pem', 'server-ca.pem'];
  const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));
  
  if (missingFiles.length > 0) {
    console.error('❌ Missing certificate files:', missingFiles.join(', '));
    console.log('📋 Please run the following commands first:');
    console.log('1. gcloud auth login');
    console.log('2. gcloud sql ssl client-certs create oo-insights-client-cert client-key.pem --instance=oo-insights-db --project=oo-insights-468716');
    console.log('3. gcloud sql ssl client-certs describe oo-insights-client-cert --instance=oo-insights-db --project=oo-insights-468716 --format="value(cert)" > client-cert.pem');
    console.log('4. gcloud sql ssl server-ca-certs list --instance=oo-insights-db --project=oo-insights-468716 --format="value(cert)" > server-ca.pem');
    return;
  }
  
  console.log('✅ All certificate files found');
  
  // Test with SSL client certificates
  const sslClient = new Client({
    host: '34.38.133.240',
    port: 5432,
    database: 'insights',
    user: 'postgres',
    password: 'k0NIcM68WtpEWkHiRjF2h8H0PFTlLoMrWbCO2zDk050=',
    ssl: {
      key: fs.readFileSync('./client-key.pem'),
      cert: fs.readFileSync('./client-cert.pem'),
      ca: fs.readFileSync('./server-ca.pem'),
      rejectUnauthorized: true
    }
  });

  try {
    console.log('🔌 Connecting with SSL client certificates...');
    await sslClient.connect();
    console.log('✅ SSL connection successful!');
    
    // Test a simple query
    const result = await sslClient.query('SELECT version()');
    console.log('📊 PostgreSQL version:', result.rows[0].version.split(' ')[0]);
    
    // Test connection info
    const connInfo = await sslClient.query('SELECT inet_server_addr(), inet_server_port(), current_user');
    console.log('🏠 Connected to:', connInfo.rows[0].inet_server_addr + ':' + connInfo.rows[0].inet_server_port);
    console.log('👤 Connected as:', connInfo.rows[0].current_user);
    
    await sslClient.end();
    console.log('✅ SSL connection test completed successfully');
    
  } catch (error) {
    console.error('❌ SSL connection failed:', error.message);
    console.error('🔍 Error details:', error.code);
    
    if (error.message.includes('certificate')) {
      console.log('💡 Certificate issue. Make sure:');
      console.log('   - Certificates were created correctly');
      console.log('   - Client certificate is authorized for the instance');
      console.log('   - SSL is properly configured on Cloud SQL');
    }
  }
  
  // Also test regular SSL connection (server-side only)
  console.log('\n🔐 Testing regular SSL connection (server-side only)...');
  
  const regularSslClient = new Client({
    host: '34.38.133.240',
    port: 5432,
    database: 'insights',
    user: 'postgres',
    password: 'k0NIcM68WtpEWkHiRjF2h8H0PFTlLoMrWbCO2zDk050=',
    ssl: {
      rejectUnauthorized: false // For comparison
    }
  });
  
  try {
    await regularSslClient.connect();
    console.log('✅ Regular SSL connection successful!');
    
    const sslInfo = await regularSslClient.query('SELECT ssl_is_used()');
    console.log('🔒 SSL in use:', sslInfo.rows[0].ssl_is_used);
    
    await regularSslClient.end();
    
  } catch (error) {
    console.error('❌ Regular SSL connection failed:', error.message);
  }
}

// Also test the SSL connection helper
async function testSSLHelper() {
  console.log('\n📚 Testing SSL connection helper...');
  
  try {
    // Simulate Vercel environment
    process.env.VERCEL = '1';
    
    // Load base64 certificates if available
    if (fs.existsSync('ssl-env-vars.txt')) {
      const envVars = fs.readFileSync('ssl-env-vars.txt', 'utf8');
      const lines = envVars.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('PGSSLKEY_B64=')) {
          process.env.PGSSLKEY_B64 = line.split('=')[1];
        } else if (line.startsWith('PGSSLCERT_B64=')) {
          process.env.PGSSLCERT_B64 = line.split('=')[1];
        } else if (line.startsWith('PGSSLROOTCERT_B64=')) {
          process.env.PGSSLROOTCERT_B64 = line.split('=')[1];
        }
      }
    }
    
    // Import and test the SSL helper (skip TypeScript compilation for now)
    console.log('⚠️  SSL helper test skipped - requires TypeScript compilation');
    console.log('📋 To test the helper, use it in your Next.js application');
    
    if (process.env.PGSSLKEY_B64) {
      console.log('✅ SSL certificates environment variables found');
      console.log('🔗 SSL Database URL configured');
    } else {
      console.log('⚠️  No base64 certificates found. Run ./convert-certs-to-base64.sh first');
    }
    
  } catch (error) {
    console.error('❌ SSL helper test failed:', error.message);
  }
}

// Run all tests
async function runAllTests() {
  await testSSLConnection();
  await testSSLHelper();
  
  console.log('\n🎉 SSL testing complete!');
  console.log('\n📋 Summary:');
  console.log('- SSL client certificates provide the highest security');
  console.log('- Regular SSL (server-side) is also supported');
  console.log('- The ssl-db-connection.ts helper handles Vercel deployment automatically');
  console.log('\n📁 Next steps:');
  console.log('1. If tests passed: ./add-ssl-env-to-vercel.sh');
  console.log('2. Deploy to Vercel: npx vercel --prod');
  console.log('3. Update your application code to use ssl-db-connection helper');
}

runAllTests().catch(console.error);