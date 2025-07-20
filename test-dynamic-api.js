const axios = require('axios');

// Configuration
const BASE_URL = 'https://localhost:5001';
const TEST_USER = {
  email: 'admin@example.com',
  password: 'admin123'
};

// Ignore SSL certificate errors for local testing
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

let authToken = '';

// Test helper functions
const log = (message, data = '') => {
  console.log(`\n🔍 ${message}`);
  if (data) console.log(JSON.stringify(data, null, 2));
};

const error = (message, err) => {
  console.error(`\n❌ ${message}`);
  if (err.response) {
    console.error('Status:', err.response.status);
    console.error('Data:', err.response.data);
  } else {
    console.error('Error:', err.message);
  }
};

// Login to get authentication token
const login = async () => {
  try {
    log('Logging in...');
    const response = await axios.post(`${BASE_URL}/api/login`, TEST_USER);
    authToken = response.data.token;
    log('✅ Login successful', { user: response.data.user.name });
    return authToken;
  } catch (err) {
    error('Login failed', err);
    process.exit(1);
  }
};

// Get authorization headers
const getHeaders = () => ({
  'Authorization': `Bearer ${authToken}`,
  'Content-Type': 'application/json'
});

// Test 1: List all available tables
const testListTables = async () => {
  try {
    log('Test 1: Listing all available tables');
    const response = await axios.get(`${BASE_URL}/api/tables`, { headers: getHeaders() });
    log('✅ Available tables:', response.data);
    return response.data.tables;
  } catch (err) {
    error('Failed to list tables', err);
    return [];
  }
};

// Test 2: Get table schema
const testTableSchema = async (tableName) => {
  try {
    log(`Test 2: Getting schema for table '${tableName}'`);
    const response = await axios.get(`${BASE_URL}/api/tables/${tableName}/schema`, { headers: getHeaders() });
    log('✅ Table schema:', response.data);
    return response.data;
  } catch (err) {
    error(`Failed to get schema for table ${tableName}`, err);
    return null;
  }
};

// Test 3: Basic pagination test
const testBasicPagination = async (tableName) => {
  try {
    log(`Test 3: Basic pagination for '${tableName}'`);
    const response = await axios.get(`${BASE_URL}/api/${tableName}?page=1&limit=3`, { headers: getHeaders() });
    log('✅ Paginated results:', {
      dataCount: response.data.data.length,
      pagination: response.data.pagination,
      meta: response.data.meta
    });
    return response.data;
  } catch (err) {
    error(`Failed to get paginated data for ${tableName}`, err);
    return null;
  }
};

// Test 4: Search functionality
const testSearch = async (tableName, searchTerm) => {
  try {
    log(`Test 4: Search in '${tableName}' for term '${searchTerm}'`);
    const response = await axios.get(`${BASE_URL}/api/${tableName}?search=${encodeURIComponent(searchTerm)}&limit=5`, { headers: getHeaders() });
    log('✅ Search results:', {
      searchTerm: response.data.meta.searchTerm,
      resultsCount: response.data.data.length,
      total: response.data.pagination.total,
      sampleResults: response.data.data.slice(0, 2)
    });
    return response.data;
  } catch (err) {
    error(`Failed to search in ${tableName}`, err);
    return null;
  }
};

// Test 5: Sorting test
const testSorting = async (tableName) => {
  try {
    log(`Test 5: Custom sorting for '${tableName}'`);
    const response = await axios.get(`${BASE_URL}/api/${tableName}?sortBy=id&sortOrder=ASC&limit=3`, { headers: getHeaders() });
    log('✅ Sorted results:', {
      sortedBy: response.data.meta.sortedBy,
      sortOrder: response.data.meta.sortOrder,
      firstRecord: response.data.data[0],
      lastRecord: response.data.data[response.data.data.length - 1]
    });
    return response.data;
  } catch (err) {
    error(`Failed to sort ${tableName}`, err);
    return null;
  }
};

// Test 6: Get single record
const testSingleRecord = async (tableName, recordId) => {
  try {
    log(`Test 6: Getting single record ${recordId} from '${tableName}'`);
    const response = await axios.get(`${BASE_URL}/api/${tableName}/${recordId}`, { headers: getHeaders() });
    log('✅ Single record:', response.data);
    return response.data;
  } catch (err) {
    error(`Failed to get record ${recordId} from ${tableName}`, err);
    return null;
  }
};

// Test 7: Create new record
const testCreateRecord = async (tableName, recordData) => {
  try {
    log(`Test 7: Creating new record in '${tableName}'`);
    const response = await axios.post(`${BASE_URL}/api/${tableName}`, recordData, { headers: getHeaders() });
    log('✅ Record created:', response.data);
    return response.data;
  } catch (err) {
    error(`Failed to create record in ${tableName}`, err);
    return null;
  }
};

// Test 8: Update record
const testUpdateRecord = async (tableName, recordId, updateData) => {
  try {
    log(`Test 8: Updating record ${recordId} in '${tableName}'`);
    const response = await axios.put(`${BASE_URL}/api/${tableName}/${recordId}`, updateData, { headers: getHeaders() });
    log('✅ Record updated:', response.data);
    return response.data;
  } catch (err) {
    error(`Failed to update record ${recordId} in ${tableName}`, err);
    return null;
  }
};

// Test 9: Delete record
const testDeleteRecord = async (tableName, recordId) => {
  try {
    log(`Test 9: Deleting record ${recordId} from '${tableName}'`);
    const response = await axios.delete(`${BASE_URL}/api/${tableName}/${recordId}`, { headers: getHeaders() });
    log('✅ Record deleted:', response.data);
    return response.data;
  } catch (err) {
    error(`Failed to delete record ${recordId} from ${tableName}`, err);
    return null;
  }
};

// Test 10: Advanced search with multiple terms
const testAdvancedSearch = async (tableName) => {
  try {
    log(`Test 10: Advanced search in '${tableName}' with multiple terms`);
    const response = await axios.get(`${BASE_URL}/api/${tableName}?search=Honda Mike&limit=5`, { headers: getHeaders() });
    log('✅ Advanced search results:', {
      searchTerm: response.data.meta.searchTerm,
      resultsCount: response.data.data.length,
      sampleResults: response.data.data.slice(0, 1)
    });
    return response.data;
  } catch (err) {
    error(`Failed advanced search in ${tableName}`, err);
    return null;
  }
};

// Test 11: Large pagination test
const testLargePagination = async (tableName) => {
  try {
    log(`Test 11: Large pagination test for '${tableName}'`);
    const response = await axios.get(`${BASE_URL}/api/${tableName}?page=1&limit=100`, { headers: getHeaders() });
    log('✅ Large pagination results:', {
      requestedLimit: 100,
      actualLimit: response.data.pagination.limit,
      totalRecords: response.data.pagination.total,
      totalPages: response.data.pagination.totalPages,
      hasNext: response.data.pagination.hasNext
    });
    return response.data;
  } catch (err) {
    error(`Failed large pagination test for ${tableName}`, err);
    return null;
  }
};

// Performance test
const testPerformance = async (tableName) => {
  try {
    log(`Test 12: Performance test for '${tableName}'`);
    const startTime = Date.now();
    
    // Run multiple concurrent requests
    const promises = [
      axios.get(`${BASE_URL}/api/${tableName}?page=1&limit=10`, { headers: getHeaders() }),
      axios.get(`${BASE_URL}/api/${tableName}?search=test&limit=5`, { headers: getHeaders() }),
      axios.get(`${BASE_URL}/api/tables/${tableName}/schema`, { headers: getHeaders() })
    ];
    
    const results = await Promise.all(promises);
    const endTime = Date.now();
    
    log('✅ Performance test completed:', {
      totalTime: `${endTime - startTime}ms`,
      concurrentRequests: promises.length,
      allSuccessful: results.every(r => r.status === 200)
    });
    
    return results;
  } catch (err) {
    error(`Performance test failed for ${tableName}`, err);
    return null;
  }
};

// Main test runner
const runTests = async () => {
  console.log('🚀 Starting Dynamic API Tests...\n');
  console.log('==========================================');
  
  try {
    // Login first
    await login();
    
    // Get available tables
    const tables = await testListTables();
    
    if (tables.length === 0) {
      console.log('\n⚠️  No tables found. Consider running the example table creation script first.');
      console.log('   Run: node server/createExampleTables.js');
      return;
    }
    
    // Use the first available table for detailed testing
    const testTableName = tables.find(t => t.includes('oil_change') || t.includes('emissions') || t.includes('tire')) || tables[0];
    
    console.log(`\n🎯 Using table '${testTableName}' for detailed testing...\n`);
    console.log('==========================================');
    
    // Run all tests
    await testTableSchema(testTableName);
    const paginationResult = await testBasicPagination(testTableName);
    await testSearch(testTableName, 'Honda');
    await testSorting(testTableName);
    
    // Test single record (use first record from pagination if available)
    if (paginationResult && paginationResult.data.length > 0) {
      const firstRecordId = paginationResult.data[0].id;
      await testSingleRecord(testTableName, firstRecordId);
    }
    
    // Test CRUD operations (only for safe tables)
    if (testTableName.includes('oil_change') || testTableName.includes('tire') || testTableName.includes('emissions')) {
      // Create test record
      const testRecord = {
        customer_name: 'Test Customer',
        vehicle_vin: 'TEST123456789',
        vehicle_make: 'Test',
        vehicle_model: 'Model',
        vehicle_year: 2023,
        notes: 'Created by test script'
      };
      
      if (testTableName.includes('oil_change')) {
        testRecord.oil_type = '5W-30 Test';
        testRecord.technician_name = 'Test Technician';
        testRecord.mileage = 50000;
      }
      
      const created = await testCreateRecord(testTableName, testRecord);
      
      if (created && created.id) {
        // Update the record
        await testUpdateRecord(testTableName, created.id, { notes: 'Updated by test script' });
        
        // Delete the record
        await testDeleteRecord(testTableName, created.id);
      }
    }
    
    await testAdvancedSearch(testTableName);
    await testLargePagination(testTableName);
    await testPerformance(testTableName);
    
    // Test other tables briefly
    console.log('\n📋 Brief test of other available tables...\n');
    console.log('==========================================');
    
    for (const table of tables.slice(0, 5)) {
      if (table !== testTableName) {
        await testBasicPagination(table);
      }
    }
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📊 API Endpoints Summary:');
    console.log('==========================================');
    console.log('• GET /api/tables                    - List all tables');
    console.log('• GET /api/tables/:table/schema      - Get table schema');
    console.log('• GET /api/:table                    - Get paginated data');
    console.log('• GET /api/:table/:id                - Get single record');
    console.log('• POST /api/:table                   - Create new record');
    console.log('• PUT /api/:table/:id                - Update record');
    console.log('• DELETE /api/:table/:id             - Delete record');
    console.log('\n🔗 Query Parameters:');
    console.log('==========================================');
    console.log('• page=1                             - Page number (default: 1)');
    console.log('• limit=50                           - Records per page (default: 50, max: 1000)');
    console.log('• search=term                        - Search in text fields');
    console.log('• sortBy=column                      - Sort by specific column');
    console.log('• sortOrder=ASC|DESC                 - Sort direction (default: DESC)');
    
  } catch (err) {
    error('Test runner failed', err);
  }
};

// Run tests if this script is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests }; 