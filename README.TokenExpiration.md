# Token Expiration and Auto-Logout Functionality

This document describes the token expiration and auto-logout functionality implemented in the QuickCheck application.

## Overview

The application now includes comprehensive token expiration management that automatically logs out users when their JWT tokens expire. This ensures security by preventing users from continuing to use the application with expired credentials.

## Features

### 1. Automatic Token Expiration Checking
- **Frequency**: Checks token expiration every minute
- **Real-time**: Monitors token validity continuously
- **Silent**: Runs in the background without user interruption

### 2. Expiration Warning System
- **5-minute warning**: Shows a notification when token expires in 5 minutes
- **Visual alerts**: Orange notification banner appears in top-right corner
- **One-time display**: Warning only shows once per session to avoid spam

### 3. Auto-Logout on Expiration
- **Immediate logout**: Automatically logs out user when token expires
- **Clear storage**: Removes all authentication data from storage
- **Redirect to login**: Sends user to login page with expired session message
- **Visual notification**: Red notification banner informs user of session expiration

### 4. Enhanced Login Experience
- **Expired session message**: Shows warning when redirected due to token expiration
- **URL parameter**: Uses `?expired=true` to indicate expired session
- **Clear messaging**: Informs user why they need to log in again

## Technical Implementation

### Token Manager (`src/services/tokenManager.ts`)
The core token management system that handles:
- JWT token decoding and validation
- Expiration time calculation
- Automatic cleanup on logout
- Periodic expiration checking

### Key Methods
- `isTokenExpired(token)`: Checks if token is currently expired
- `getTimeUntilExpiration(token)`: Returns seconds until expiration
- `isTokenExpiringSoon(token)`: Checks if token expires within 5 minutes
- `getTokenInfo(token)`: Returns detailed token information for debugging

### Integration Points

#### API Service (`src/services/api.ts`)
- **Response interceptor**: Handles 401 errors and triggers auto-logout
- **Login function**: Initializes token manager with new token
- **Logout function**: Cleans up token manager state

#### Protected Route (`src/components/ProtectedRoute.tsx`)
- **Token validation**: Checks token expiration before allowing access
- **Automatic redirect**: Redirects to login if token is expired

#### Login Page (`src/pages/Login.tsx`)
- **Expired session detection**: Shows message when redirected due to expiration
- **URL parameter handling**: Detects `?expired=true` parameter

## User Experience

### Normal Flow
1. User logs in successfully
2. Token manager starts monitoring token expiration
3. User works normally in the application
4. If token expires, user is automatically logged out and redirected to login

### Warning Flow
1. Token is about to expire (within 5 minutes)
2. Orange warning notification appears
3. User can continue working but should save their work
4. When token expires, auto-logout occurs

### Expired Session Flow
1. User is redirected to login page with expired session message
2. Clear indication that session expired
3. User logs in again to continue

## Testing

### Token Expiration Test Page
Visit `/token-expiration-test` to see:
- Current token status (valid/expired)
- Time until expiration
- Real-time countdown
- Token information for debugging

### Manual Testing
1. Log in to the application
2. Navigate to `/token-expiration-test`
3. Observe the countdown timer
4. When token expires, you'll be automatically logged out

## Configuration

### Token Expiration Time
The token expiration time is set on the server side in `server/index.js`:
```javascript
const token = jwt.sign(
  { email: user.email, name: user.name, role: user.role },
  JWT_SECRET,
  { expiresIn: '24h' } // 24 hours
);
```

### Warning Threshold
The warning threshold is configurable in `tokenManager.ts`:
```javascript
public isTokenExpiringSoon(token: string): boolean {
  const timeUntilExpiration = this.getTimeUntilExpiration(token);
  return timeUntilExpiration > 0 && timeUntilExpiration < 300; // 5 minutes
}
```

### Check Frequency
The check frequency is configurable in `tokenManager.ts`:
```javascript
private readonly CHECK_INTERVAL = 60000; // Check every minute
```

## Security Benefits

1. **Automatic cleanup**: Prevents use of expired tokens
2. **Clear user feedback**: Users know when their session expires
3. **Graceful handling**: No abrupt interruptions, with warnings
4. **Comprehensive coverage**: All authentication points are protected

## Browser Compatibility

The token expiration system works with:
- **localStorage**: Primary storage method
- **sessionStorage**: Fallback for Safari compatibility
- **Safari**: Special handling for Safari's storage restrictions

## Debugging

### Console Logs
The system provides detailed console logging:
- `🔐 Token expired:` - When token expires
- `⚠️ Token expiring soon:` - When warning is triggered
- `⏰ Token expiration check started` - When monitoring begins

### Token Information
Use the token manager's `getTokenInfo()` method to get detailed token information:
```javascript
const tokenInfo = tokenManager.getTokenInfo(token);
console.log(tokenInfo);
// Returns: { isValid, expiresAt, timeUntilExpiration }
```

## Future Enhancements

1. **Refresh token support**: Implement refresh tokens for seamless re-authentication
2. **User activity monitoring**: Extend session based on user activity
3. **Configurable warnings**: Allow users to customize warning thresholds
4. **Session recovery**: Allow users to recover unsaved work after expiration 