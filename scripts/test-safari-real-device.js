#!/usr/bin/env node

// Test script to debug Safari iPhone login issues
// This script will test the actual API endpoints to identify potential issues

const axios = require('axios');
const fs = require('fs');

// Configuration
const BASE_URL = 'http://localhost:5001/api';
const TEST_EMAIL = 'admin@test.com';
const TEST_PASSWORD = 'password123';

// Create axios instance similar to frontend
const testAxios = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 15000
});

console.log('🔍 Safari iPhone Login Debug Test Starting...\n');

async function testApiEndpoint() {
  console.log('1. Testing API endpoint connectivity...');
  
  try {
    const response = await testAxios.get('/health');
    console.log('✅ API endpoint is reachable');
    console.log('   Status:', response.status);
    console.log('   Headers:', response.headers);
  } catch (error) {
    console.log('❌ API endpoint not reachable');
    console.log('   Error:', error.message);
    console.log('   Code:', error.code);
    return false;
  }
  
  return true;
}

async function testLoginWithDifferentFormats() {
  console.log('\n2. Testing login with different email formats...');
  
  const emailVariations = [
    TEST_EMAIL,                          // Normal
    TEST_EMAIL.toUpperCase(),           // All caps (Safari auto-capitalize)
    ` ${TEST_EMAIL} `,                  // With spaces
    `${TEST_EMAIL.charAt(0).toUpperCase()}${TEST_EMAIL.slice(1)}`, // First letter caps
    TEST_EMAIL.replace('@', ' @ '),      // Malformed spacing
  ];
  
  for (const email of emailVariations) {
    try {
      console.log(`   Testing email: "${email}"`);
      
      const normalizedEmail = email.toLowerCase().trim();
      console.log(`   Normalized to: "${normalizedEmail}"`);
      
      const response = await testAxios.post('/login', {
        email: normalizedEmail,
        password: TEST_PASSWORD
      });
      
      console.log(`   ✅ Login successful with: "${email}"`);
      console.log(`   Token present: ${!!response.data.token}`);
      
    } catch (error) {
      console.log(`   ❌ Login failed with: "${email}"`);
      console.log(`   Error: ${error.response?.data?.error || error.message}`);
      console.log(`   Status: ${error.response?.status}`);
    }
  }
}

async function testSafariSpecificHeaders() {
  console.log('\n3. Testing with Safari-specific headers...');
  
  const safariHeaders = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate',
    'X-Debug-Browser': 'Safari',
    'X-Debug-Platform': 'iPhone',
  };
  
  try {
    const response = await testAxios.post('/login', {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    }, {
      headers: safariHeaders
    });
    
    console.log('   ✅ Login successful with Safari headers');
    console.log('   Response:', response.data);
    
  } catch (error) {
    console.log('   ❌ Login failed with Safari headers');
    console.log('   Error:', error.response?.data?.error || error.message);
    console.log('   Status:', error.response?.status);
    console.log('   Headers sent:', safariHeaders);
  }
}

async function testCORSConfiguration() {
  console.log('\n4. Testing CORS configuration...');
  
  try {
    const response = await testAxios.options('/login');
    console.log('   ✅ OPTIONS request successful');
    console.log('   CORS Headers:');
    console.log('     Access-Control-Allow-Origin:', response.headers['access-control-allow-origin']);
    console.log('     Access-Control-Allow-Methods:', response.headers['access-control-allow-methods']);
    console.log('     Access-Control-Allow-Headers:', response.headers['access-control-allow-headers']);
    console.log('     Access-Control-Allow-Credentials:', response.headers['access-control-allow-credentials']);
    
  } catch (error) {
    console.log('   ❌ OPTIONS request failed');
    console.log('   Error:', error.message);
    console.log('   This could indicate CORS issues');
  }
}

async function testWithoutCredentials() {
  console.log('\n5. Testing without credentials flag...');
  
  try {
    const response = await axios.post(`${BASE_URL}/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: false // Safari might handle this differently
    });
    
    console.log('   ✅ Login successful without credentials flag');
    console.log('   Token:', response.data.token ? 'Present' : 'Missing');
    
  } catch (error) {
    console.log('   ❌ Login failed without credentials flag');
    console.log('   Error:', error.response?.data?.error || error.message);
  }
}

async function testTimeout() {
  console.log('\n6. Testing timeout behavior...');
  
  try {
    const response = await axios.post(`${BASE_URL}/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    }, {
      timeout: 1000 // Very short timeout to test Safari behavior
    });
    
    console.log('   ✅ Quick response (< 1s)');
    
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.log('   ⚠️ Request timed out - Safari may need longer timeout');
    } else {
      console.log('   ❌ Other error:', error.message);
    }
  }
}

async function testContentTypeVariations() {
  console.log('\n7. Testing different content types...');
  
  const contentTypes = [
    'application/json',
    'application/json; charset=utf-8',
    'application/x-www-form-urlencoded'
  ];
  
  for (const contentType of contentTypes) {
    try {
      console.log(`   Testing content-type: ${contentType}`);
      
      let data;
      if (contentType.includes('form-urlencoded')) {
        data = `email=${encodeURIComponent(TEST_EMAIL)}&password=${encodeURIComponent(TEST_PASSWORD)}`;
      } else {
        data = { email: TEST_EMAIL, password: TEST_PASSWORD };
      }
      
      const response = await testAxios.post('/login', data, {
        headers: {
          'Content-Type': contentType
        }
      });
      
      console.log(`   ✅ Success with ${contentType}`);
      
    } catch (error) {
      console.log(`   ❌ Failed with ${contentType}`);
      console.log(`   Error: ${error.response?.data?.error || error.message}`);
    }
  }
}

async function generateDebugReport() {
  console.log('\n📋 Generating debug report...');
  
  const report = {
    timestamp: new Date().toISOString(),
    testResults: {
      apiReachable: false,
      corsWorking: false,
      loginVariations: [],
      safariHeadersWork: false,
      timeoutBehavior: 'unknown',
      contentTypeSupport: []
    },
    recommendations: []
  };
  
  // Save the report
  fs.writeFileSync('safari-debug-report.json', JSON.stringify(report, null, 2));
  console.log('   ✅ Debug report saved to safari-debug-report.json');
  
  return report;
}

async function runAllTests() {
  try {
    const apiReachable = await testApiEndpoint();
    if (!apiReachable) {
      console.log('\n❌ Cannot continue tests - API not reachable');
      console.log('Make sure the server is running on http://localhost:5001');
      return;
    }
    
    await testLoginWithDifferentFormats();
    await testSafariSpecificHeaders();
    await testCORSConfiguration();
    await testWithoutCredentials();
    await testTimeout();
    await testContentTypeVariations();
    
    console.log('\n🎯 Test Summary:');
    console.log('1. Check the console output above for specific failures');
    console.log('2. Pay attention to email format issues (caps, spaces)');
    console.log('3. Look for CORS-related errors');
    console.log('4. Note any timeout or network issues');
    console.log('5. Consider header compatibility problems');
    
    console.log('\n💡 Next Steps:');
    console.log('1. On your iPhone Safari, open Developer Tools in Settings > Safari > Advanced');
    console.log('2. Connect to desktop Safari and check Web Inspector');
    console.log('3. Look for JavaScript errors or network failures');
    console.log('4. Compare network requests between Chrome and Safari');
    
    await generateDebugReport();
    
  } catch (error) {
    console.error('Test suite failed:', error.message);
  }
}

// Run the tests
runAllTests().catch(console.error); 