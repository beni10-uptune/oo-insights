#!/usr/bin/env tsx

import { prisma } from '../src/lib/db';
import { summarizeContent } from '../src/lib/services/simple-ai';

async function testSummaries() {
  console.log('Testing English summary generation for French content...\n');
  
  // Get a French page that needs English summary
  const page = await prisma.contentPage.findFirst({
    where: {
      market: 'fr',
      OR: [
        { summaryEn: 'Summary not available' },
        { summaryEn: '' },
        { summaryEn: null }
      ],
      textContent: { not: null }
    },
    select: {
      id: true,
      url: true,
      title: true,
      language: true,
      textContent: true,
      summary: true,
      summaryEn: true
    }
  });
  
  if (!page || !page.textContent) {
    console.log('No French pages needing English summaries');
    return;
  }
  
  console.log(`📄 Page: ${page.title}`);
  console.log(`🌐 URL: ${page.url}`);
  console.log(`🔤 Language: ${page.language || 'fr'}`);
  console.log(`📝 Current summaryEn: "${page.summaryEn}"`);
  console.log('\nGenerating new summary...\n');
  
  try {
    const result = await summarizeContent(
      page.textContent.substring(0, 3000),
      page.language || 'fr'
    );
    
    console.log('✅ Generated summaries:');
    console.log(`   French: ${result.original}`);
    console.log(`   English: ${result.english}`);
    
    // Update the page
    await prisma.contentPage.update({
      where: { id: page.id },
      data: {
        summary: result.original,
        summaryEn: result.english
      }
    });
    
    console.log('\n✅ Database updated!');
    
    // Test the timeline API
    console.log('\nTesting timeline API...');
    const event = await prisma.pageEvent.findFirst({
      where: { pageId: page.id },
      include: {
        page: {
          select: {
            summaryEn: true,
            summary: true
          }
        }
      }
    });
    
    if (event) {
      console.log('Timeline would show:');
      console.log(`   English: ${event.page?.summaryEn}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testSummaries()
  .catch(console.error)
  .finally(() => prisma.$disconnect());