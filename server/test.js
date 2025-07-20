const axios = require('axios');

const API_URL = 'http://localhost:5001/api';

// Test user data
const testUser = {
  email: 'test@example.com',
  password: 'test123',
  name: 'Test User'
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

// Helper function to log test results
function logTest(name, passed, message = '') {
  const status = passed ? '✅' : '❌';
  const color = passed ? colors.green : colors.red;
  console.log(`${color}${status} ${name}${colors.reset} ${message}`);
}

// Test API endpoints
async function testAPI() {
  try {
    // Test registration
    console.log('\nTesting registration...');
    try {
      await axios.post(`${API_URL}/register`, testUser);
      logTest('Registration', true);
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.error === 'Email already registered') {
        logTest('Registration', true, 'User already exists');
      } else {
        throw err;
      }
    }

    // Test login
    console.log('\nTesting login...');
    const loginResponse = await axios.post(`${API_URL}/login`, {
      email: testUser.email,
      password: testUser.password
    });
    logTest('Login', true);
    const token = loginResponse.data.token;

    // Test quick checks endpoints
    console.log('\nTesting quick checks endpoints...');
    const headers = { Authorization: `Bearer ${token}` };

    // Create a test quick check
    const testQuickCheck = {
      title: 'Test Quick Check',
      data: {
        vin: 'TEST123',
        date: new Date().toISOString(),
        user: testUser.name,
        mileage: '1000'
      }
    };

    const createResponse = await axios.post(
      `${API_URL}/quick-checks`,
      testQuickCheck,
      { headers }
    );
    logTest('Create Quick Check', true);

    // Get all quick checks
    const getResponse = await axios.get(`${API_URL}/quick-checks`, { headers });
    logTest('Get Quick Checks', true);

    return true;
  } catch (err) {
    console.error('API test error:', err.message);
    if (err.response) {
      console.error('Response data:', err.response.data);
      console.error('Response status:', err.response.status);
    }
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('\n🔍 Starting backend tests...\n');

  // Test API endpoints
  const apiSuccess = await testAPI();
  if (!apiSuccess) {
    console.log('\n❌ API tests failed.\n');
    return;
  }

  console.log('\n✨ All tests completed successfully!\n');
}

// Run the tests
runTests(); 