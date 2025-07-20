import axios from 'axios';

async function testAPI() {
  try {
    console.log('Testing API endpoints...');
    
    // Test if server is running
    const response = await axios.get('http://localhost:5001/api/quick-checks/active', {
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });
    
    console.log('Response:', response.data);
  } catch (error) {
    console.log('Error:', error.response?.status, error.response?.data);
  }
}

testAPI(); 