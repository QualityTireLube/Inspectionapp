# Debug Manager Usage Guide

The Debug Manager provides centralized control over all logging throughout the QuickCheck application. Instead of using `console.log` statements directly, use the debug manager to enable/disable logging by category.

## Features

- **Centralized Control**: Turn logging on/off by category through the Settings > Debug Settings tab
- **Persistent Settings**: Debug preferences are saved in localStorage
- **Color-coded Output**: Different categories and levels have distinct styling
- **Timestamped Logs**: All logs include precise timestamps
- **Export Functionality**: Export debug settings and logs for troubleshooting

## Quick Start

### Basic Usage

Replace direct console statements:

```typescript
// OLD - Direct console logging
console.log('User logged in:', userData);
console.error('API call failed:', error);

// NEW - Using debug manager
import { debug } from '../services/debugManager';

debug.log('auth', 'User logged in:', userData);
debug.error('api', 'API call failed:', error);
```

### Available Categories

- **general** - General application logging
- **api** - API calls and responses
- **auth** - Authentication and login flows
- **print** - Print management and operations
- **websocket** - WebSocket connections and messages
- **safari** - Safari-specific debugging
- **imageUpload** - Image upload and processing
- **shopMonkey** - ShopMonkey integration
- **audio** - Audio notifications and sounds
- **storage** - LocalStorage and data persistence
- **printClient** - Native print client operations
- **printQueue** - Print queue management
- **performance** - Performance monitoring
- **errors** - Error messages (recommended to keep enabled)
- **warnings** - Warning messages (recommended to keep enabled)
- **development** - Development-only debugging

### Debug Methods

```typescript
import { debug } from '../services/debugManager';

// Basic logging
debug.log('api', 'Making API request to /users');

// Warning logging
debug.warn('storage', 'localStorage quota approaching limit');

// Error logging
debug.error('auth', 'Login failed', { email, error });

// Grouped logging
debug.group('api', 'User Registration Process');
debug.log('api', 'Validating email format');
debug.log('api', 'Checking if user exists');
debug.log('api', 'Creating new user account');
debug.groupEnd('api');

// Check if category is enabled
if (debug.isEnabled('performance')) {
  const startTime = performance.now();
  // ... expensive operation ...
  debug.log('performance', `Operation took ${performance.now() - startTime}ms`);
}
```

## Migration Examples

### Example 1: Basic Console Statements

```typescript
// Before
console.log('🔧 Checking admin status - user role:', userRole);
console.log('🔧 Navigating to Print Token Manager page');

// After
import { debug } from '../services/debugManager';

debug.log('auth', 'Checking admin status - user role:', userRole);
debug.log('general', 'Navigating to Print Token Manager page');
```

### Example 2: Error Handling

```typescript
// Before
console.error('Error loading tokens:', error);
console.error('Failed to load conversations:', error);

// After
debug.error('api', 'Error loading tokens:', error);
debug.error('general', 'Failed to load conversations:', error);
```

### Example 3: ShopMonkey Integration

```typescript
// Before
console.log('🔄 loadOrders called - fetching ShopMonkey orders');
console.log('🔍 Grouping orders by status. Total orders:', orders.length);

// After
debug.log('shopMonkey', 'loadOrders called - fetching ShopMonkey orders');
debug.log('shopMonkey', 'Grouping orders by status. Total orders:', orders.length);
```

### Example 4: Safari Debugging

```typescript
// Before
console.group('🐛 Safari Login Debug');
console.log('Browser:', debugInfo.browser);
console.log('Storage Available:', storageInfo);
console.groupEnd();

// After
debug.group('safari', 'Safari Login Debug');
debug.log('safari', 'Browser:', debugInfo.browser);
debug.log('safari', 'Storage Available:', storageInfo);
debug.groupEnd('safari');
```

## Integration with Existing Loggers

### PrintManager Integration

The PrintManager already has a sophisticated logging system. It has been updated to use the debug manager for console output while maintaining its internal log history:

```typescript
// PrintManager logs now respect the 'print' debug category
logger.log('info', 'component', 'Print job completed', jobData);
// This will only show in console if 'print' debugging is enabled
```

### Creating Custom Loggers

For components that need detailed logging, you can create a logger that integrates with the debug manager:

```typescript
class ComponentLogger {
  private logs: LogEntry[] = [];

  log(message: string, data?: any) {
    const entry = { timestamp: new Date(), message, data };
    this.logs.push(entry);
    
    // Use debug manager for console output
    debug.log('general', `[${this.componentName}] ${message}`, data);
  }

  error(message: string, error?: any) {
    debug.error('errors', `[${this.componentName}] ${message}`, error);
  }

  // Export logs for debugging
  exportLogs() {
    return this.logs;
  }
}
```

## Settings UI

Access debug settings through:
1. Go to **Settings** (gear icon in navigation)
2. Click **Debug Settings** (Admin only)
3. Toggle categories on/off as needed
4. Use **Quick Actions** to enable/disable all categories
5. **Export Debug Info** to download current settings

### Recommended Settings for Different Scenarios

**General Development:**
- Enable: `general`, `errors`, `warnings`
- Disable: All others unless specifically needed

**Authentication Issues:**
- Enable: `auth`, `api`, `storage`, `errors`, `warnings`
- Optional: `safari` (for Safari-specific issues)

**Print Problems:**
- Enable: `print`, `printQueue`, `printClient`, `errors`, `warnings`
- Optional: `api` (for server communication issues)

**Performance Issues:**
- Enable: `performance`, `api`, `errors`, `warnings`
- Use sparingly as performance debugging can impact performance

**ShopMonkey Integration:**
- Enable: `shopMonkey`, `api`, `errors`, `warnings`

## Best Practices

1. **Use Appropriate Categories**: Choose the most specific category for your log
2. **Include Context**: Provide relevant data objects when logging
3. **Performance Considerations**: Wrap expensive debug operations in `debug.isEnabled()` checks
4. **Avoid Over-logging**: Don't log every minor operation in production code
5. **Use Groups**: Group related operations for better readability
6. **Keep Errors Enabled**: Always keep `errors` and `warnings` enabled for important issues

## Implementation Notes

- Debug settings are stored in localStorage under `quickcheck_debug_settings`
- Settings persist across browser sessions
- Debug output is disabled by default except for errors and warnings
- The debug manager is a singleton - use the exported `debug` functions
- All timestamps are in ISO format with millisecond precision
- Category emojis help visually distinguish log types in the console

## Future Enhancements

Potential improvements for the debug system:
- Remote logging to server for production debugging
- Log filtering and search in the UI
- Performance metrics dashboard
- Automatic error reporting
- Integration with external monitoring tools
