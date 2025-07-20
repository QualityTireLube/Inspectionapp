const axios = require('axios');

const API_URL = 'http://localhost:5001/api';

const testUser = {
  email: 'admin@qualitytirelube.com',
  password: '1234',
};

async function testLogin() {
  try {
    const response = await axios.post(`${API_URL}/login`, {
      email: testUser.email,
      password: testUser.password,
    });
    console.log('✅ Login successful! Token:', response.data.token);
    process.exit(0);
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data?.error || error.message);
    process.exit(1);
  }
}

testLogin(); 