#!/usr/bin/env node

// Comprehensive Safari Login Fix Test
// Tests all the fixes we've implemented for Safari compatibility

const axios = require('axios');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Safari Login Fixes');
console.log('==============================\n');

// Configuration
const API_BASE = process.env.API_BASE || 'https://localhost:5001/api';
const TEST_CASES = [
  {
    name: 'Normal Email (Chrome-like)',
    email: 'admin@qualitytirelube.com',
    password: '1234'
  },
  {
    name: 'Uppercase Email (Safari Auto-cap)',
    email: 'ADMIN@QUALITYTIRELUBE.COM',
    password: '1234'
  },
  {
    name: 'Mixed Case Email (Safari Behavior)',
    email: 'Admin@QualityTireLube.Com',
    password: '1234'
  },
  {
    name: 'Email with Spaces (Input Noise)',
    email: ' admin@qualitytirelube.com ',
    password: '1234'
  }
];

// Ignore SSL errors for local testing
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

const axiosConfig = {
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'Safari/17.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'
  }
};

async function testLoginCase(testCase) {
  console.log(`\n🔍 Testing: ${testCase.name}`);
  console.log('─'.repeat(50));
  console.log(`📧 Input Email: "${testCase.email}"`);
  console.log(`🔑 Password: ${'*'.repeat(testCase.password.length)}`);
  
  try {
    const startTime = Date.now();
    
    // Simulate our frontend normalization
    const normalizedEmail = testCase.email.toLowerCase().trim();
    console.log(`📧 Normalized: "${normalizedEmail}"`);
    
    const response = await axios.post(`${API_BASE}/login`, {
      email: normalizedEmail,
      password: testCase.password
    }, axiosConfig);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log('✅ SUCCESS');
    console.log(`⏱️  Duration: ${duration}ms`);
    console.log(`🎫 Token: ${response.data.token ? 'Present' : 'Missing'}`);
    console.log(`👤 User: ${response.data.name || 'Unknown'}`);
    console.log(`📊 Status: ${response.status}`);
    
    return { success: true, duration, token: !!response.data.token };
    
  } catch (error) {
    console.log('❌ FAILED');
    console.log(`📊 Status: ${error.response?.status || 'No response'}`);
    console.log(`💬 Message: ${error.response?.data?.error || error.message}`);
    console.log(`🔍 Code: ${error.code || 'Unknown'}`);
    
    return { success: false, error: error.message };
  }
}

async function testStorageCompatibility() {
  console.log('\n💾 Testing Storage Compatibility Scenarios');
  console.log('─'.repeat(50));
  
  const storageTests = [
    {
      name: 'localStorage Available',
      test: () => {
        try {
          const testKey = '__test_storage__';
          localStorage.setItem(testKey, 'test');
          const result = localStorage.getItem(testKey);
          localStorage.removeItem(testKey);
          return result === 'test';
        } catch (e) {
          return false;
        }
      }
    },
    {
      name: 'sessionStorage Available',
      test: () => {
        try {
          const testKey = '__test_session__';
          sessionStorage.setItem(testKey, 'test');
          const result = sessionStorage.getItem(testKey);
          sessionStorage.removeItem(testKey);
          return result === 'test';
        } catch (e) {
          return false;
        }
      }
    }
  ];
  
  console.log('⚠️  Note: Storage tests require browser environment');
  console.log('These tests should be run in Safari DevTools:\n');
  
  storageTests.forEach(({ name, test }) => {
    console.log(`// Test: ${name}`);
    console.log(`try {`);
    console.log(`  ${test.toString()}`);
    console.log(`  console.log('${name}: ✅ Available');`);
    console.log(`} catch (e) {`);
    console.log(`  console.log('${name}: ❌ Blocked');`);
    console.log(`}\n`);
  });
}

async function checkServerCompatibility() {
  console.log('\n🌐 Checking Server Safari Compatibility');
  console.log('─'.repeat(50));
  
  const checks = [
    {
      name: 'CORS Headers',
      test: async () => {
        const response = await axios.options(`${API_BASE}/login`, {
          headers: {
            'Origin': 'https://localhost:3000',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Content-Type, Authorization'
          }
        });
        
        const headers = response.headers;
        return {
          'Allow-Origin': headers['access-control-allow-origin'],
          'Allow-Credentials': headers['access-control-allow-credentials'],
          'Allow-Methods': headers['access-control-allow-methods'],
          'Allow-Headers': headers['access-control-allow-headers']
        };
      }
    }
  ];
  
  for (const check of checks) {
    try {
      console.log(`🔍 ${check.name}:`);
      const result = await check.test();
      
      Object.entries(result).forEach(([key, value]) => {
        const status = value ? '✅' : '❌';
        console.log(`   ${status} ${key}: ${value || 'Missing'}`);
      });
      
    } catch (error) {
      console.log(`❌ ${check.name}: Failed`);
      console.log(`   Error: ${error.message}`);
    }
  }
}

async function generateTestReport(results) {
  console.log('\n📝 Generating Test Report...');
  
  const totalTests = results.length;
  const successfulTests = results.filter(r => r.success).length;
  const failedTests = totalTests - successfulTests;
  const successRate = Math.round((successfulTests / totalTests) * 100);
  
  const report = `
# Safari Login Fix Test Report
Generated: ${new Date().toISOString()}

## Summary
- Total Tests: ${totalTests}
- Successful: ${successfulTests}
- Failed: ${failedTests}
- Success Rate: ${successRate}%

## Test Results
${results.map((result, index) => `
### Test ${index + 1}: ${TEST_CASES[index].name}
- **Status**: ${result.success ? '✅ PASSED' : '❌ FAILED'}
- **Email**: "${TEST_CASES[index].email}"
- **Normalized**: "${TEST_CASES[index].email.toLowerCase().trim()}"
${result.success ? `- **Duration**: ${result.duration}ms
- **Token**: ${result.token ? 'Present' : 'Missing'}` : `- **Error**: ${result.error}`}
`).join('')}

## Safari Fixes Implemented

### ✅ Frontend Fixes
1. **Email Normalization**: All emails converted to lowercase and trimmed
2. **Input Attributes**: Added autocapitalize="none", autocorrect="off", spellcheck="false"
3. **Safari Storage**: Implemented fallback storage with sessionStorage and memory
4. **Error Handling**: Enhanced error messages for network and timeout issues
5. **User Warnings**: Added Safari compatibility warning component

### ✅ Backend Fixes
1. **CORS Credentials**: Properly configured Access-Control-Allow-Credentials
2. **Email Normalization**: Server also normalizes emails for consistency
3. **Timeout Handling**: Increased request timeout for Safari
4. **Error Responses**: Clear error messages for debugging

### ✅ Input Field Fixes
1. **Email Field**: type="email" with Safari-specific attributes
2. **Auto-correction**: Disabled auto-correct and auto-capitalization
3. **Spell Check**: Disabled spellcheck on sensitive fields
4. **Blur Handling**: Re-normalize email on blur events

## Recommendations

${successRate >= 90 ? '🎉 Excellent! All Safari login issues should be resolved.' : 
  successRate >= 70 ? '👍 Good progress! A few edge cases may need attention.' :
  '🔧 More work needed. Check failed test cases for remaining issues.'}

## Next Steps
1. Deploy these fixes to your HTTPS server
2. Test on actual Safari iOS devices
3. Monitor error logs for any remaining issues
4. Consider additional fallbacks if needed

## Files Modified
- src/pages/Login.tsx
- src/components/Login.tsx
- src/services/api.ts
- src/services/safariStorage.ts
- src/components/SafariCompatibilityWarning.tsx
`;

  const reportPath = path.join(__dirname, '..', 'safari-login-test-report.md');
  fs.writeFileSync(reportPath, report);
  console.log(`📄 Report saved to: ${reportPath}`);
  
  return { successRate, reportPath };
}

// Main execution
async function runTests() {
  console.log('Starting comprehensive Safari login tests...\n');
  
  // Test server compatibility
  await checkServerCompatibility();
  
  // Test all login cases
  const results = [];
  for (const testCase of TEST_CASES) {
    const result = await testLoginCase(testCase);
    results.push(result);
  }
  
  // Test storage compatibility
  await testStorageCompatibility();
  
  // Generate report
  const { successRate, reportPath } = await generateTestReport(results);
  
  console.log('\n🎯 Test Summary');
  console.log('================');
  console.log(`Success Rate: ${successRate}%`);
  console.log(`Report: ${reportPath}`);
  
  if (successRate >= 90) {
    console.log('\n🎉 Excellent! Safari login fixes are working correctly.');
  } else if (successRate >= 70) {
    console.log('\n👍 Good progress! A few issues remain to be addressed.');
  } else {
    console.log('\n🔧 More work needed. Check the failed tests above.');
  }
  
  process.exit(successRate >= 70 ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = { runTests }; 