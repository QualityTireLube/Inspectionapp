import React from 'react';
import { Box, Button, Typography, Paper, Stack } from '@mui/material';
import { debug } from '../services/debugManager';

/**
 * Debug Test Component
 * 
 * This component demonstrates that the debug toggles actually work.
 * Use this to test the debug system by enabling/disabling categories
 * in Settings > Debug Settings and then clicking these buttons.
 */
const DebugTestComponent: React.FC = () => {
  
  const testAllCategories = () => {
    // Core categories
    debug.log('general', 'Testing general debug logging');
    debug.log('api', 'Testing API debug logging', { endpoint: '/test', method: 'GET' });
    debug.log('auth', 'Testing auth debug logging', { user: 'test@example.com' });
    debug.log('websocket', 'Testing WebSocket debug logging', { status: 'connected' });
    debug.log('webhooks', 'Testing webhook debug logging', { type: 'order.updated' });
    debug.log('storage', 'Testing storage debug logging', { key: 'test-key' });

    // Business modules
    debug.log('quickCheck', 'Testing QuickCheck debug logging', { inspectionId: 'QC-123' });
    debug.log('stateInspection', 'Testing State Inspection debug logging', { recordId: 'SI-456' });
    debug.log('dvi', 'Testing DVI debug logging', { vehicleType: 'commercial' });
    debug.log('tpms', 'Testing TPMS debug logging', { pressure: '32 PSI' });
    debug.log('tireRepair', 'Testing tire repair debug logging', { step: 'quality-check' });
    debug.log('cashManagement', 'Testing cash management debug logging', { amount: '$125.50' });

    // Integration
    debug.log('shopMonkey', 'Testing ShopMonkey debug logging', { orderId: 'SM-789' });
    debug.log('chat', 'Testing chat debug logging', { messageId: 'MSG-101' });
    debug.log('notifications', 'Testing notifications debug logging', { type: 'push' });

    // Components
    debug.log('print', 'Testing print debug logging', { jobId: 'PJ-202' });
    debug.log('labels', 'Testing labels debug logging', { templateId: 'LBL-303' });
    debug.log('stickers', 'Testing stickers debug logging', { stickerType: 'oil-change' });
    debug.log('imageUpload', 'Testing image upload debug logging', { fileName: 'brake-photo.jpg' });
    debug.log('fileSystem', 'Testing file system debug logging', { operation: 'read' });

    // Logging levels
    debug.log('info', 'Testing info level logging');
    debug.warn('warnings', 'Testing warning level logging');
    debug.error('errors', 'Testing error level logging');
    debug.log('debug', 'Testing debug level logging');
  };

  const testWebSocketCategory = () => {
    debug.group('websocket', 'WebSocket Test Group');
    debug.log('websocket', 'Simulating WebSocket connection');
    debug.log('websocket', 'Simulating authentication');
    debug.log('websocket', 'Simulating message received');
    debug.groupEnd('websocket');
  };

  const testAPICategory = () => {
    debug.group('api', 'API Test Group');
    debug.log('api', 'Simulating API request', { url: '/api/users', method: 'GET' });
    debug.log('api', 'Simulating API response', { status: 200, data: { users: [] } });
    debug.groupEnd('api');
  };

  const testBusinessModules = () => {
    debug.group('quickCheck', 'QuickCheck Test Group');
    debug.log('quickCheck', 'Starting QuickCheck inspection');
    debug.log('quickCheck', 'Validating vehicle information');
    debug.log('quickCheck', 'Uploading brake inspection photo');
    debug.log('quickCheck', 'Completing inspection');
    debug.groupEnd('quickCheck');

    debug.group('shopMonkey', 'ShopMonkey Test Group');
    debug.log('shopMonkey', 'Fetching orders from ShopMonkey API');
    debug.log('shopMonkey', 'Processing webhook notification');
    debug.log('shopMonkey', 'Syncing order status');
    debug.groupEnd('shopMonkey');
  };

  const testErrorsAndWarnings = () => {
    debug.warn('general', 'This is a test warning message');
    debug.error('general', 'This is a test error message');
    debug.warn('api', 'API rate limit approaching');
    debug.error('websocket', 'WebSocket connection failed');
  };

  const testSuppression = () => {
    // Test that logs are actually suppressed when categories are disabled
    debug.log('websocket', 'This websocket log should NOT appear if websocket category is disabled');
    debug.log('api', 'This API log should NOT appear if api category is disabled');
    debug.log('storage', 'This storage log should NOT appear if storage category is disabled');
    debug.log('auth', 'This auth log should NOT appear if auth category is disabled');
    
    // These should always appear (unless specifically disabled)
    debug.error('errors', 'This error should appear (errors category enabled by default)');
    debug.warn('warnings', 'This warning should appear (warnings category enabled by default)');
  };

  return (
    <Paper sx={{ p: 3, maxWidth: 800, mx: 'auto', mt: 3 }}>
      <Typography variant="h5" gutterBottom>
        🧪 Debug System Test Component
      </Typography>
      
      <Typography variant="body2" color="text.secondary" paragraph>
        Use this component to test that the debug toggles actually work. 
        Go to <strong>Settings → Debug Settings</strong> to enable/disable categories, 
        then click these buttons and check the browser console (F12).
      </Typography>

      <Typography variant="body2" color="primary" paragraph>
        <strong>How to test:</strong>
        <br />1. Open browser console (F12 → Console tab)
        <br />2. Go to Settings → Debug Settings  
        <br />3. Enable/disable specific categories
        <br />4. Click buttons below and observe console output
        <br />5. Toggle categories off and see logs disappear
      </Typography>

      <Stack spacing={2}>
        <Button 
          variant="contained" 
          onClick={testAllCategories}
          fullWidth
        >
          🚀 Test All Categories (will be noisy!)
        </Button>

        <Stack direction="row" spacing={2}>
          <Button 
            variant="outlined" 
            onClick={testWebSocketCategory}
            sx={{ flex: 1 }}
          >
            🔌 Test WebSocket
          </Button>
          
          <Button 
            variant="outlined" 
            onClick={testAPICategory}
            sx={{ flex: 1 }}
          >
            🌐 Test API
          </Button>
        </Stack>

        <Button 
          variant="outlined" 
          onClick={testBusinessModules}
          fullWidth
        >
          🔍 Test Business Modules (QuickCheck + ShopMonkey)
        </Button>

        <Button 
          variant="outlined" 
          color="warning"
          onClick={testErrorsAndWarnings}
          fullWidth
        >
          ⚠️ Test Errors & Warnings
        </Button>

        <Button 
          variant="outlined" 
          color="secondary"
          onClick={testSuppression}
          fullWidth
        >
          🚫 Test Log Suppression (Verify Toggles Work)
        </Button>
      </Stack>

      <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
        <Typography variant="caption" color="text.secondary">
          <strong>Expected behavior:</strong> When a debug category is enabled in Settings, 
          you should see colored, timestamped logs in the console. When disabled, 
          those logs should not appear. Errors and warnings are enabled by default.
        </Typography>
      </Box>
    </Paper>
  );
};

export default DebugTestComponent;
