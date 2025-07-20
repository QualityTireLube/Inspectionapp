# QuickCheck Login Page Documentation

## Overview

The QuickCheck Login Page provides secure authentication for users to access the vehicle inspection application. It serves as the entry point for technicians, administrators, and other authorized personnel to access the QuickCheck system.

## Features

### Authentication
- **Email/Password Login**: Secure authentication using email and password credentials
- **Token-based Authentication**: JWT token management for session persistence
- **Automatic Token Storage**: Secure storage of authentication tokens in localStorage
- **Session Management**: Automatic token validation and session handling

### User Experience
- **Responsive Design**: Mobile-friendly interface that works on all device sizes
- **Form Validation**: Real-time validation for email format and required fields
- **Error Handling**: Clear error messages for authentication failures
- **Loading States**: Visual feedback during authentication process
- **Accessibility**: Screen reader friendly with proper ARIA labels

### Security Features
- **HTTPS Support**: Secure communication with the backend API
- **Token Interception**: Automatic token injection for authenticated requests
- **Session Expiration**: Automatic logout on token expiration
- **XSS Protection**: Input sanitization and secure token storage

## Technical Implementation

### Component Structure

#### Login Component (`src/pages/Login.tsx`)
```typescript
interface LoginProps {
  // No props required - standalone component
}

interface LoginState {
  email: string;
  password: string;
  error: string;
}
```

#### API Integration (`src/services/api.ts`)
```typescript
interface LoginResponse {
  token: string;
  user: {
    id: number;
    email: string;
    name: string;
  };
}

export const login = async (email: string, password: string): Promise<LoginResponse>
```

### Authentication Flow

1. **User Input**: User enters email and password
2. **Form Validation**: Client-side validation of input fields
3. **API Request**: POST request to `/api/auth/login` with credentials
4. **Token Storage**: JWT token stored in localStorage
5. **User Data Storage**: User name stored for display purposes
6. **Navigation**: Redirect to dashboard on successful authentication
7. **Error Handling**: Display error message on authentication failure

### State Management

#### Local State
- `email`: User's email address
- `password`: User's password (not stored after submission)
- `error`: Error message for failed authentication attempts

#### Persistent Storage
- `localStorage.token`: JWT authentication token
- `localStorage.userName`: User's display name

### API Integration

#### Request Format
```json
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "userpassword"
}
```

#### Response Format
```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 123,
      "email": "user@example.com",
      "name": "John Doe"
    }
  }
}
```

## User Interface

### Layout Structure
```
┌─────────────────────────────────────┐
│                                     │
│         QuickCheck Login            │
│                                     │
│  ┌─────────────────────────────┐    │
│  │     Email Address          │    │
│  │  ┌───────────────────────┐  │    │
│  │  │ user@example.com      │  │    │
│  │  └───────────────────────┘  │    │
│  │                             │    │
│  │     Password               │    │
│  │  ┌───────────────────────┐  │    │
│  │  │ ••••••••••••••••••••• │  │    │
│  │  └───────────────────────┘  │    │
│  │                             │    │
│  │  ┌───────────────────────┐  │    │
│  │  │      Sign In          │  │    │
│  │  └───────────────────────┘  │    │
│  └─────────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘
```

### Styling
- **Framework**: Tailwind CSS for responsive design
- **Color Scheme**: Indigo primary color with gray accents
- **Typography**: Clean, modern font stack
- **Spacing**: Consistent padding and margins
- **Focus States**: Clear visual feedback for form interactions

## Error Handling

### Validation Errors
- **Email Format**: Invalid email address format
- **Required Fields**: Missing email or password
- **Network Errors**: Connection issues with the server

### Authentication Errors
- **Invalid Credentials**: Wrong email or password
- **Account Locked**: Account temporarily disabled
- **Server Errors**: Backend authentication service issues

### Error Display
```typescript
{error && (
  <div className="text-red-500 text-sm text-center">
    {error}
  </div>
)}
```

## Security Considerations

### Token Management
- **Secure Storage**: Tokens stored in localStorage (consider httpOnly cookies for production)
- **Automatic Cleanup**: Tokens removed on logout or expiration
- **Token Validation**: Automatic validation on each API request

### Input Validation
- **Client-side**: Real-time validation for user experience
- **Server-side**: Backend validation for security
- **XSS Prevention**: Input sanitization and secure rendering

### Session Security
- **HTTPS Only**: Secure communication in production
- **Token Expiration**: Automatic session termination
- **CSRF Protection**: Token-based CSRF protection

## Integration Points

### Navigation
- **Success**: Redirect to `/dashboard` on successful login
- **Failure**: Stay on login page with error message
- **Logout**: Redirect to `/login` on session expiration

### API Dependencies
- **Authentication Service**: `/api/auth/login` endpoint
- **Token Interceptor**: Automatic token injection for requests
- **Error Interceptor**: Automatic logout on 401 responses

### Local Storage
- **Token Storage**: `localStorage.setItem('token', token)`
- **User Data**: `localStorage.setItem('userName', name)`
- **Cleanup**: `localStorage.removeItem('token')` on logout

## Usage Examples

### Basic Login
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');

  try {
    const { token, name } = await login(email, password);
    localStorage.setItem('token', token);
    localStorage.setItem('userName', name);
    navigate('/dashboard');
  } catch (err) {
    setError('Invalid email or password');
  }
};
```

### Form Validation
```typescript
const validateForm = () => {
  if (!email || !password) {
    setError('Please fill in all fields');
    return false;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    setError('Please enter a valid email address');
    return false;
  }
  
  return true;
};
```

## Configuration

### Environment Variables
```bash
# API Configuration
REACT_APP_API_BASE_URL=/api
REACT_APP_AUTH_ENDPOINT=/auth/login

# Security Configuration
REACT_APP_TOKEN_STORAGE_KEY=token
REACT_APP_USER_STORAGE_KEY=userName
```

### Styling Configuration
```css
/* Tailwind CSS Classes */
.login-container {
  @apply min-h-screen flex items-center justify-center bg-gray-50;
}

.login-form {
  @apply max-w-md w-full space-y-8;
}

.login-input {
  @apply appearance-none rounded-md relative block w-full px-3 py-2 border;
}
```

## Testing

### Unit Tests
```typescript
describe('Login Component', () => {
  test('renders login form', () => {
    render(<Login />);
    expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
  });

  test('handles form submission', async () => {
    const mockLogin = jest.fn();
    render(<Login />);
    
    fireEvent.change(screen.getByPlaceholderText('Email address'), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'password123' }
    });
    fireEvent.click(screen.getByText('Sign in'));
    
    expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
  });
});
```

### Integration Tests
```typescript
describe('Login Integration', () => {
  test('successful authentication flow', async () => {
    const mockResponse = {
      token: 'mock-jwt-token',
      user: { id: 1, email: 'test@example.com', name: 'Test User' }
    };
    
    server.use(
      rest.post('/api/auth/login', (req, res, ctx) => {
        return res(ctx.json({ data: mockResponse }));
      })
    );
    
    render(<Login />);
    // Test complete authentication flow
  });
});
```

## Troubleshooting

### Common Issues

#### Authentication Failures
- **Invalid Credentials**: Check email and password
- **Network Issues**: Verify internet connection
- **Server Errors**: Check backend service status

#### Token Issues
- **Expired Token**: Automatic logout and redirect to login
- **Invalid Token**: Clear localStorage and re-authenticate
- **Missing Token**: Check token storage implementation

#### UI Issues
- **Styling Problems**: Verify Tailwind CSS is loaded
- **Responsive Issues**: Check viewport meta tag
- **Accessibility Issues**: Verify ARIA labels and keyboard navigation

### Debug Information
```typescript
// Enable debug logging
const DEBUG = process.env.NODE_ENV === 'development';

if (DEBUG) {
  console.log('Login attempt:', { email, hasPassword: !!password });
  console.log('Token stored:', !!localStorage.getItem('token'));
}
```

## Performance Considerations

### Optimization
- **Lazy Loading**: Login component loaded only when needed
- **Minimal Dependencies**: Lightweight component with minimal imports
- **Efficient Re-renders**: Optimized state updates and re-renders

### Caching
- **Token Caching**: Efficient token storage and retrieval
- **User Data Caching**: Cached user information for quick access
- **Session Persistence**: Maintained across browser sessions

## Future Enhancements

### Planned Features
- **Remember Me**: Persistent login option
- **Two-Factor Authentication**: Enhanced security with 2FA
- **Password Reset**: Self-service password recovery
- **Social Login**: OAuth integration with Google, Microsoft, etc.

### Security Improvements
- **Biometric Authentication**: Fingerprint/Face ID support
- **Device Recognition**: Trusted device management
- **Login History**: User login activity tracking
- **Account Lockout**: Brute force protection

## Support

### Documentation
- **API Documentation**: Backend authentication endpoints
- **Component Documentation**: React component usage
- **Security Documentation**: Authentication security guidelines

### Contact
- **Technical Support**: development@quickcheck.com
- **Security Issues**: security@quickcheck.com
- **User Support**: support@quickcheck.com

## Related Documentation

- **[README.QuickCheck.md](README.QuickCheck.md)** - Main application documentation
- **[README.API.md](README.API.md)** - API documentation and endpoints
- **[README.Database.md](README.Database.md)** - Database schema and user management
- **[README.Details.md](README.Details.md)** - Application features and workflows 