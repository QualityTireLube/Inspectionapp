const io = require('socket.io-client');

// Test WebSocket connection
async function testWebSocket() {
  console.log('🧪 Testing WebSocket connection...');
  
  const socket = io('https://localhost:5001', {
    transports: ['websocket', 'polling'],
    timeout: 20000,
    forceNew: true
  });

  // Test connection
  socket.on('connect', () => {
    console.log('✅ Connected to WebSocket server');
    
    // Test authentication
    const testToken = 'test-token'; // This will fail, but we can see the auth flow
    socket.emit('authenticate', {
      token: testToken,
      userInfo: {
        name: 'Test User',
        page: '/test',
        userAgent: 'Test Script'
      }
    });
  });

  socket.on('authenticated', (data) => {
    console.log('✅ Authentication successful:', data);
  });

  socket.on('auth_error', (error) => {
    console.log('❌ Authentication failed (expected):', error);
  });

  socket.on('disconnect', (reason) => {
    console.log('🔚 Disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.log('❌ Connection error:', error.message);
  });

  // Test quick check update events
  socket.on('quick_check_update', (message) => {
    console.log('📢 Quick check update received:', message);
  });

  socket.on('status_update', (message) => {
    console.log('📣 Status update received:', message);
  });

  socket.on('heartbeat', (data) => {
    console.log('💓 Heartbeat received:', data);
  });

  // Wait a bit then disconnect
  setTimeout(() => {
    console.log('🔚 Disconnecting test client...');
    socket.disconnect();
    process.exit(0);
  }, 5000);
}

testWebSocket().catch(console.error); 