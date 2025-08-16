const { PrismaClient } = require('@prisma/client');

// Use production database
process.env.DATABASE_URL = 'postgresql://postgres:k0NIcM68WtpEWkHiRjF2h8H0PFTlLoMrWbCO2zDk050=@34.38.133.240:5432/insights?schema=public&sslmode=require';

const prisma = new PrismaClient();

async function testAuth() {
  try {
    console.log('Testing database connection and user setup...\n');
    
    // Check if any users exist
    const users = await prisma.user.findMany({
      select: {
        email: true,
        name: true,
        role: true,
        password: true,
        createdAt: true
      }
    });
    
    console.log(`Found ${users.length} users in database:\n`);
    
    users.forEach(user => {
      console.log(`Email: ${user.email}`);
      console.log(`Name: ${user.name || '(not set)'}`);
      console.log(`Role: ${user.role}`);
      console.log(`Has Password: ${user.password ? 'Yes' : 'No'}`);
      console.log(`Created: ${user.createdAt}`);
      console.log('---');
    });
    
    // Check for ben@mindsparkdigitallabs.com
    const adminEmail = 'ben@mindsparkdigitallabs.com';
    const adminUser = users.find(u => u.email === adminEmail);
    
    if (adminUser) {
      console.log(`\n✅ Admin user '${adminEmail}' exists with role: ${adminUser.role}`);
      if (adminUser.password) {
        console.log('   Can sign in with: Google OAuth or Email/Password');
      } else {
        console.log('   Can sign in with: Google OAuth only');
      }
    } else {
      console.log(`\n⚠️  Admin user '${adminEmail}' does not exist yet.`);
      console.log('   Will be created automatically on first Google sign-in.');
    }
    
    console.log('\n📝 Authentication Configuration:');
    console.log('   Google OAuth Client ID:', process.env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing');
    console.log('   Google OAuth Secret:', process.env.GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ Missing');
    console.log('   NextAuth Secret:', process.env.NEXTAUTH_SECRET ? '✅ Set' : '❌ Missing');
    console.log('   NextAuth URL:', process.env.NEXTAUTH_URL || 'Not set');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('P1001')) {
      console.error('\nCannot connect to database. Check your connection settings.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

testAuth();