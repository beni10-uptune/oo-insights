const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// Use production database directly since local proxy is having issues
process.env.DATABASE_URL = 'postgresql://postgres:k0NIcM68WtpEWkHiRjF2h8H0PFTlLoMrWbCO2zDk050=@34.38.133.240:5432/insights?schema=public&sslmode=require';

const prisma = new PrismaClient();

async function setupAdmin() {
  try {
    const adminEmail = 'ben@mindsparkdigitallabs.com';
    
    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email: adminEmail }
    });
    
    if (user) {
      console.log('User found:', {
        email: user.email,
        name: user.name,
        role: user.role,
        hasPassword: !!user.password,
        createdAt: user.createdAt
      });
      
      // Update to admin if not already
      if (user.role !== 'ADMIN') {
        user = await prisma.user.update({
          where: { email: adminEmail },
          data: { role: 'ADMIN' }
        });
        console.log('Updated user role to ADMIN');
      }
      
      // Set a password if you want email/password login
      if (!user.password) {
        const password = 'OOInsights2024!'; // Change this to your desired password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        await prisma.user.update({
          where: { email: adminEmail },
          data: { password: hashedPassword }
        });
        console.log('Password set successfully!');
        console.log('You can now login with:');
        console.log('Email:', adminEmail);
        console.log('Password:', password);
      } else {
        console.log('User already has a password set');
      }
    } else {
      // Create new admin user
      const password = 'OOInsights2024!'; // Change this to your desired password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      user = await prisma.user.create({
        data: {
          email: adminEmail,
          name: 'Ben Smith',
          role: 'ADMIN',
          password: hashedPassword,
          emailVerified: new Date()
        }
      });
      
      console.log('Admin user created successfully!');
      console.log('You can now login with:');
      console.log('Email:', adminEmail);
      console.log('Password:', password);
    }
    
    console.log('\nYou can sign in using either:');
    console.log('1. Google OAuth - Just click "Sign in with Google"');
    console.log('2. Email/Password - Use the credentials above');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupAdmin();