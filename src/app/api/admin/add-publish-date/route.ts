import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Try to add the publishDate column
    const result = await prisma.$executeRawUnsafe(`
      ALTER TABLE "content_pages" 
      ADD COLUMN IF NOT EXISTS "publishDate" TIMESTAMP(3)
    `);

    // Add indices for performance
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "content_pages_publishDate_idx" 
      ON "content_pages" ("publishDate")
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "content_pages_market_publishDate_idx" 
      ON "content_pages" ("market", "publishDate")
    `);

    return NextResponse.json({
      success: true,
      message: 'publishDate column added successfully',
      result
    });
  } catch (error: any) {
    // Check if column already exists
    if (error.message?.includes('already exists')) {
      return NextResponse.json({
        success: true,
        message: 'publishDate column already exists',
      });
    }

    console.error('Migration error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to add publishDate column',
        details: error.message
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}