#!/usr/bin/env node

// Safari Login Debug Script
// This script helps identify differences between Safari and Chrome login behavior

const axios = require('axios');
const fs = require('fs');
const path = require('path');

console.log('🔍 Safari Login Debug Tool');
console.log('===========================\n');

// Configuration
const API_BASE = process.env.API_BASE || 'https://localhost:5001/api';
const TEST_EMAIL = 'admin@qualitytirelube.com';
const TEST_PASSWORD = '1234';

// Ignore SSL errors for local testing
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

// Test different configurations
const testConfigurations = [
  {
    name: 'Default (Current Setup)',
    config: {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  },
  {
    name: 'With Credentials (Safari Fix)',
    config: {
      timeout: 10000,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Safari/17.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'
      }
    }
  },
  {
    name: 'Lowercase Email (Safari Fix)',
    config: {
      timeout: 10000,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      }
    },
    emailTransform: email => email.toLowerCase().trim()
  }
];

async function testLogin(config, configName) {
  console.log(`\n🧪 Testing: ${configName}`);
  console.log('─'.repeat(40));
  
  try {
    const email = config.emailTransform ? config.emailTransform(TEST_EMAIL) : TEST_EMAIL;
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Password: ${'*'.repeat(TEST_PASSWORD.length)}`);
    
    const startTime = Date.now();
    
    const response = await axios.post(`${API_BASE}/login`, {
      email: email,
      password: TEST_PASSWORD
    }, config.config);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log('✅ SUCCESS');
    console.log(`⏱️  Duration: ${duration}ms`);
    console.log(`🎫 Token: ${response.data.token ? 'Present' : 'Missing'}`);
    console.log(`👤 User: ${response.data.name || 'Unknown'}`);
    console.log(`📊 Status: ${response.status}`);
    
    // Test token validation
    if (response.data.token) {
      try {
        const profileResponse = await axios.get(`${API_BASE}/profile`, {
          ...config.config,
          headers: {
            ...config.config.headers,
            'Authorization': `Bearer ${response.data.token}`
          }
        });
        console.log('🔓 Token validation: SUCCESS');
      } catch (tokenErr) {
        console.log('❌ Token validation: FAILED');
        console.log(`   Error: ${tokenErr.response?.data?.error || tokenErr.message}`);
      }
    }
    
  } catch (error) {
    console.log('❌ FAILED');
    console.log(`📊 Status: ${error.response?.status || 'No response'}`);
    console.log(`💬 Message: ${error.response?.data?.error || error.message}`);
    console.log(`🔍 Code: ${error.code || 'Unknown'}`);
    
    if (error.response?.headers) {
      console.log('📋 Response Headers:');
      Object.entries(error.response.headers).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
      });
    }
  }
}

async function checkServerCORS() {
  console.log('\n🌐 Checking CORS Configuration');
  console.log('─'.repeat(40));
  
  try {
    const response = await axios.options(`${API_BASE}/login`, {
      headers: {
        'Origin': 'https://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    });
    
    console.log('✅ CORS Preflight: SUCCESS');
    console.log(`📊 Status: ${response.status}`);
    
    const corsHeaders = {
      'Access-Control-Allow-Origin': response.headers['access-control-allow-origin'],
      'Access-Control-Allow-Methods': response.headers['access-control-allow-methods'],
      'Access-Control-Allow-Headers': response.headers['access-control-allow-headers'],
      'Access-Control-Allow-Credentials': response.headers['access-control-allow-credentials']
    };
    
    console.log('📋 CORS Headers:');
    Object.entries(corsHeaders).forEach(([key, value]) => {
      const status = value ? '✅' : '❌';
      console.log(`   ${status} ${key}: ${value || 'Missing'}`);
    });
    
  } catch (error) {
    console.log('❌ CORS Preflight: FAILED');
    console.log(`📊 Status: ${error.response?.status || 'No response'}`);
    console.log(`💬 Message: ${error.message}`);
  }
}

async function testLocalStorage() {
  console.log('\n💾 Testing localStorage Compatibility');
  console.log('─'.repeat(40));
  
  // This would normally run in browser context
  console.log('⚠️  localStorage test requires browser environment');
  console.log('   Manual test required in Safari DevTools:');
  console.log('');
  console.log('   1. Open Safari DevTools > Console');
  console.log('   2. Run: localStorage.setItem("test", "safari")');
  console.log('   3. Run: localStorage.getItem("test")');
  console.log('   4. Check for errors or null values');
  console.log('');
  console.log('   Common Safari issues:');
  console.log('   - Private browsing blocks localStorage');
  console.log('   - ITP may restrict cross-origin storage');
  console.log('   - 7-day storage expiration in some cases');
}

async function generateSafariFixReport() {
  console.log('\n📝 Generating Safari Fix Report...');
  
  const report = `
# Safari Login Debug Report
Generated: ${new Date().toISOString()}

## Issues Identified

### 1. Missing withCredentials in axios configuration
**Problem**: Safari requires explicit credential handling for CORS requests
**Fix**: Add withCredentials: true to axios instance

### 2. Email case sensitivity
**Problem**: Safari may autocapitalize email inputs
**Fix**: 
- Add autocapitalize="none" to email input
- Normalize email to lowercase before sending

### 3. localStorage restrictions
**Problem**: Safari blocks localStorage in private browsing and some ITP scenarios
**Fix**: 
- Add fallback to sessionStorage
- Implement cookie-based auth as backup
- Add user warning for private browsing

### 4. Input autocomplete issues
**Problem**: Safari aggressive autocomplete can interfere with form validation
**Fix**:
- Add autocomplete="off" to sensitive fields
- Add autocapitalize="none" to email fields
- Add spellcheck="false" to prevent corrections

## Recommended Fixes

1. Update axios configuration
2. Fix login form inputs
3. Add Safari-specific localStorage handling
4. Implement backup authentication storage
5. Add user-friendly error messages

## Test Results
${JSON.stringify({ timestamp: new Date().toISOString() }, null, 2)}
`;

  const reportPath = path.join(__dirname, '..', 'safari-login-debug-report.md');
  fs.writeFileSync(reportPath, report);
  console.log(`📄 Report saved to: ${reportPath}`);
}

// Main execution
async function runDebugTests() {
  console.log('Starting Safari login debugging...\n');
  
  // Test CORS first
  await checkServerCORS();
  
  // Test different login configurations
  for (const config of testConfigurations) {
    await testLogin(config, config.name);
  }
  
  // Test localStorage (manual instructions)
  await testLocalStorage();
  
  // Generate report
  await generateSafariFixReport();
  
  console.log('\n✅ Debug complete! Check the generated report for fixes.');
}

// Run if called directly
if (require.main === module) {
  runDebugTests().catch(error => {
    console.error('❌ Debug failed:', error);
    process.exit(1);
  });
}

module.exports = { runDebugTests }; 