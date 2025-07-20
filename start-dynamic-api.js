#!/usr/bin/env node

const { createExampleTables } = require('./server/createExampleTables');
const { runTests } = require('./test-dynamic-api');

console.log('🚀 Dynamic SQLite API System Setup\n');
console.log('======================================');

async function setupAndTest() {
  try {
    console.log('📋 Step 1: Creating example tables...');
    
    // Create example tables
    await new Promise((resolve, reject) => {
      try {
        createExampleTables();
        // Give it time to complete
        setTimeout(resolve, 3000);
      } catch (error) {
        reject(error);
      }
    });
    
    console.log('\n⏳ Step 2: Waiting for server to be ready...');
    console.log('   Make sure the server is running: node server/index.js');
    console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
    
    // Wait a bit for user to see the message
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('🧪 Step 3: Running API tests...\n');
    
    // Run tests
    await runTests();
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Make sure the server is running: node server/index.js');
    console.error('   2. Check if you have the required dependencies installed');
    console.error('   3. Verify the database file is accessible');
    console.error('   4. Check server logs for any errors');
  }
}

// Display usage information
console.log('🎯 This script will:');
console.log('   1. Create example tables with sample data');
console.log('   2. Test the dynamic API endpoints');
console.log('   3. Show you how to use the API\n');

console.log('📚 Prerequisites:');
console.log('   • Server must be running: node server/index.js');
console.log('   • Dependencies installed: npm install\n');

console.log('🔗 After setup, you can test manually:');
console.log('   • List tables: curl "https://localhost:5001/api/tables"');
console.log('   • Get data: curl "https://localhost:5001/api/oil_change_records?page=1&limit=5"');
console.log('   • Search: curl "https://localhost:5001/api/oil_change_records?search=Honda"\n');

if (require.main === module) {
  setupAndTest();
}

module.exports = { setupAndTest }; 