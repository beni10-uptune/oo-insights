// Test DataForSEO API integration
import { getGoogleTrends, getKeywordData, getRelatedKeywords, BRAND_KEYWORDS } from '../src/lib/services/dataforseo';
import { prisma } from '../src/lib/db';

async function testDataForSEO() {
  console.log('🔍 Testing DataForSEO API Integration...\n');
  
  try {
    // Test 1: Google Trends Data
    console.log('1. Testing Google Trends API...');
    const trendsData = await getGoogleTrends(['wegovy', 'ozempic', 'mounjaro'], 'UK', '30d');
    
    if (trendsData) {
      console.log('✅ Google Trends API working!');
      console.log(`   - Retrieved ${trendsData.interestOverTime?.length || 0} data points`);
      console.log(`   - Related queries: ${trendsData.relatedQueries?.length || 0}`);
      
      // Save to database
      if (trendsData.interestOverTime && trendsData.interestOverTime.length > 0) {
        const dataToInsert = [];
        for (const keyword of ['wegovy', 'ozempic', 'mounjaro']) {
          for (const point of trendsData.interestOverTime) {
            dataToInsert.push({
              marketCode: 'UK',
              keyword,
              date: new Date(point.date),
              value: point.values[keyword] || 0,
              dataSource: 'dataforseo',
            });
          }
        }
        
        const result = await prisma.trendsSeries.createMany({
          data: dataToInsert,
          skipDuplicates: true,
        });
        console.log(`   - Saved ${result.count} records to database`);
      }
    } else {
      console.log('❌ Google Trends API failed');
    }
    
    // Test 2: Keyword Volume Data
    console.log('\n2. Testing Keyword Volume API...');
    const volumeData = await getKeywordData(['wegovy', 'ozempic', 'mounjaro'], 'UK');
    
    if (volumeData) {
      console.log('✅ Keyword Volume API working!');
      volumeData.forEach((kw: any) => {
        console.log(`   - ${kw.keyword}: ${kw.searchVolume} searches/month, CPC: $${kw.cpc}`);
      });
      
      // Save to database
      const volumeRecords = volumeData.map((kw: any) => ({
        marketCode: 'UK',
        keyword: kw.keyword,
        searchVolume: kw.searchVolume,
        cpc: kw.cpc,
        competition: kw.competitionIndex ? kw.competitionIndex / 100 : null, // Convert to float 0-1
      }));
      
      for (const record of volumeRecords) {
        await prisma.topVolumeQueries.upsert({
          where: {
            marketCode_keyword: {
              marketCode: record.marketCode,
              keyword: record.keyword,
            },
          },
          update: record,
          create: record,
        });
      }
      console.log(`   - Saved ${volumeRecords.length} volume records to database`);
    } else {
      console.log('❌ Keyword Volume API failed');
    }
    
    // Test 3: Related Keywords
    console.log('\n3. Testing Related Keywords API...');
    const relatedData = await getRelatedKeywords(['wegovy', 'ozempic'], 'UK');
    
    if (relatedData) {
      console.log('✅ Related Keywords API working!');
      console.log(`   - Total keywords: ${relatedData.all?.length || 0}`);
      console.log(`   - Questions: ${relatedData.questions?.length || 0}`);
      console.log(`   - High volume: ${relatedData.highVolume?.length || 0}`);
      console.log(`   - Rising: ${relatedData.rising?.length || 0}`);
      
      // Save rising queries
      if (relatedData.rising && relatedData.rising.length > 0) {
        const risingRecords = relatedData.rising.slice(0, 10).map((kw: any) => ({
          marketCode: 'UK',
          keyword: kw.keyword,
          growthRate: kw.trend || 0,
          searchVolume: kw.search_volume || 0,
        }));
        
        const result = await prisma.relatedQueries.createMany({
          data: risingRecords,
          skipDuplicates: true,
        });
        console.log(`   - Saved ${result.count} rising queries to database`);
      }
    } else {
      console.log('❌ Related Keywords API failed');
    }
    
    // Test 4: Check database tables
    console.log('\n4. Checking database tables...');
    const trendsCount = await prisma.trendsSeries.count();
    const volumeCount = await prisma.topVolumeQueries.count();
    const relatedCount = await prisma.relatedQueries.count();
    
    console.log(`   - TrendsSeries: ${trendsCount} records`);
    console.log(`   - TopVolumeQueries: ${volumeCount} records`);
    console.log(`   - RelatedQueries: ${relatedCount} records`);
    
    console.log('\n✨ DataForSEO integration test complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testDataForSEO().catch(console.error);