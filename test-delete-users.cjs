const axios = require('axios');

const API_URL = 'http://localhost:5001/api';

// Test user data for login (using a user with plain text password)
const testUser = {
  email: 'test@example.com',
  password: 'password123'
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

// Test delete all users functionality
async function testDeleteAllUsers() {
  try {
    console.log('\n🧪 Testing Delete All Users Functionality...\n');

    // Step 1: Login to get authentication token
    console.log('1. Logging in...');
    const loginResponse = await axios.post(`${API_URL}/login`, testUser);
    const token = loginResponse.data.token;
    logTest('Login', true, `Token received: ${token.substring(0, 20)}...`);

    // Step 2: Delete all users
    console.log('\n2. Deleting all users...');
    const headers = { Authorization: `Bearer ${token}` };
    
    const deleteResponse = await axios.delete(`${API_URL}/users`, { headers });
    logTest('Delete All Users', true, deleteResponse.data.message);

    // Step 3: Verify users are deleted by trying to login with a known user
    console.log('\n3. Verifying users are deleted...');
    try {
      await axios.post(`${API_URL}/login`, testUser);
      logTest('Verification', false, 'Users still exist - deletion failed');
    } catch (err) {
      if (err.response?.status === 401) {
        logTest('Verification', true, 'Users successfully deleted - login failed as expected');
      } else {
        logTest('Verification', false, `Unexpected error: ${err.message}`);
      }
    }

    console.log('\n🎉 Delete All Users test completed!');
    return true;

  } catch (err) {
    console.error('\n❌ Test failed:', err.message);
    if (err.response) {
      console.error('Response data:', err.response.data);
      console.error('Response status:', err.response.status);
    }
    return false;
  }
}

// Run the test
testDeleteAllUsers(); 