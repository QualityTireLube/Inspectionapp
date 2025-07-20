#!/usr/bin/env node

const WebSocket = require('ws');
const https = require('https');

// Test WebSocket connections to different endpoints
const testEndpoints = [
  'wss://localhost:5001',
  'wss://127.0.0.1:5001',
  'wss://184.186.78.18:5001' // Your external IP
];

async function testWebSocketConnection(url) {
  return new Promise((resolve) => {
    console.log(`\n🔍 Testing WebSocket connection to: ${url}`);
    
    const ws = new WebSocket(url, {
      rejectUnauthorized: false // Allow self-signed certificates
    });
    
    const timeout = setTimeout(() => {
      console.log(`⏰ Timeout for ${url}`);
      ws.terminate();
      resolve({ url, status: 'timeout', error: 'Connection timeout' });
    }, 5000);
    
    ws.on('open', () => {
      console.log(`✅ Connected to ${url}`);
      clearTimeout(timeout);
      ws.close();
      resolve({ url, status: 'success' });
    });
    
    ws.on('error', (error) => {
      console.log(`❌ Error connecting to ${url}:`, error.message);
      clearTimeout(timeout);
      resolve({ url, status: 'error', error: error.message });
    });
    
    ws.on('close', (code, reason) => {
      console.log(`🔚 Connection closed to ${url}: ${code} - ${reason}`);
    });
  });
}

async function runTests() {
  console.log('🚀 Starting WebSocket connectivity tests...\n');
  
  const results = [];
  
  for (const endpoint of testEndpoints) {
    const result = await testWebSocketConnection(endpoint);
    results.push(result);
  }
  
  console.log('\n📊 Test Results:');
  console.log('================');
  
  results.forEach(result => {
    const status = result.status === 'success' ? '✅' : '❌';
    console.log(`${status} ${result.url}: ${result.status}${result.error ? ` (${result.error})` : ''}`);
  });
  
  console.log('\n💡 Recommendations:');
  if (results.some(r => r.status === 'success')) {
    console.log('✅ WebSocket server is running and accessible');
  } else {
    console.log('❌ WebSocket server is not accessible from any endpoint');
    console.log('   - Check if the server is running on port 5001');
    console.log('   - Verify firewall settings');
    console.log('   - Check SSL certificate configuration');
  }
  
  const localSuccess = results.filter(r => r.url.includes('localhost') || r.url.includes('127.0.0.1')).some(r => r.status === 'success');
  const externalSuccess = results.filter(r => r.url.includes('184.186.78.18')).some(r => r.status === 'success');
  
  if (localSuccess && !externalSuccess) {
    console.log('⚠️  Server accessible locally but not externally');
    console.log('   - Check port forwarding on your router');
    console.log('   - Verify external firewall settings');
  }
  
  if (!localSuccess && externalSuccess) {
    console.log('⚠️  Server accessible externally but not locally');
    console.log('   - Check local firewall settings');
    console.log('   - Verify localhost binding');
  }
}

// Run the tests
runTests().catch(console.error); 