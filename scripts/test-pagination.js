const axios = require('axios');

// Test the pagination API endpoint
const testPagination = async () => {
  const baseUrl = 'http://localhost:5001'; // Adjust if your server runs on a different port
  
  console.log('🧪 Testing State Inspection Pagination API...\n');
  
  try {
    // Test paginated request
    console.log('📄 Testing paginated request (page 1, 10 records)...');
    const response1 = await axios.get(`${baseUrl}/api/state-inspection-records`, {
      params: {
        page: 1,
        pageSize: 10
      }
    });
    
    if (response1.data && response1.data.data) {
      console.log('✅ Paginated response received');
      console.log(`   - Records returned: ${response1.data.data.length}`);
      console.log(`   - Total records: ${response1.data.total}`);
      console.log(`   - Current page: ${response1.data.page}`);
      console.log(`   - Page size: ${response1.data.pageSize}`);
      console.log(`   - Total pages: ${response1.data.totalPages}\n`);
    } else {
      console.log('❌ Unexpected response format for paginated request\n');
    }
    
    // Test non-paginated request (backward compatibility)
    console.log('📄 Testing non-paginated request (backward compatibility)...');
    const response2 = await axios.get(`${baseUrl}/api/state-inspection-records`);
    
    if (Array.isArray(response2.data)) {
      console.log('✅ Non-paginated response received');
      console.log(`   - Records returned: ${response2.data.length}\n`);
    } else {
      console.log('❌ Unexpected response format for non-paginated request\n');
    }
    
    // Test different page sizes
    console.log('📄 Testing different page sizes...');
    const pageSizes = [25, 50, 100];
    
    for (const pageSize of pageSizes) {
      try {
        const response = await axios.get(`${baseUrl}/api/state-inspection-records`, {
          params: {
            page: 1,
            pageSize
          }
        });
        
        console.log(`   ✅ Page size ${pageSize}: ${response.data.data.length} records returned`);
      } catch (error) {
        console.log(`   ❌ Page size ${pageSize}: Error - ${error.message}`);
      }
    }
    
    console.log('\n🎉 Pagination API testing completed!');
    
  } catch (error) {
    console.error('❌ Error testing pagination API:', error.message);
    console.log('\n💡 Make sure your server is running on the expected port.');
  }
};

// Run the test
testPagination(); 