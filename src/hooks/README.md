# Hooks Directory

This directory contains custom React hooks that encapsulate reusable logic for the Vehicle Inspection App. These hooks provide clean abstractions for common functionality and state management patterns.

## Files

### useAuth.ts
Authentication hook that manages user authentication state and provides authentication utilities:
- User login/logout functionality
- Authentication status tracking
- Token management
- Protected route logic

## Hook Overview

### useAuth
Provides authentication state management and methods:

```typescript
const { user, isAuthenticated, login, logout, loading } = useAuth();
```

**Returns:**
- `user`: Current user object or null
- `isAuthenticated`: Boolean indicating authentication status
- `login`: Function to authenticate user
- `logout`: Function to sign out user
- `loading`: Loading state for authentication operations

**Usage Example:**
```typescript
import { useAuth } from '../hooks/useAuth';

function LoginPage() {
  const { login, loading, isAuthenticated } = useAuth();
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" />;
  }
  
  const handleLogin = async (credentials) => {
    await login(credentials);
  };
  
  return (
    <LoginForm onSubmit={handleLogin} loading={loading} />
  );
}
```

## Common Hook Patterns

### State Management Hooks
Custom hooks that manage complex state logic:
- Form state and validation
- API data fetching and caching
- UI state (modals, loading, errors)
- Local storage persistence

### Effect Hooks
Hooks that handle side effects:
- API calls with error handling
- Event listeners setup/cleanup
- Timer and interval management
- Browser API interactions

### Utility Hooks
Hooks that provide utility functions:
- Debounced values
- Previous value tracking
- Media query matching
- Intersection observer

## Best Practices

### Hook Development
1. **Single Responsibility**: Each hook should have one clear purpose
2. **Consistent Naming**: Use `use` prefix followed by descriptive name
3. **Return Objects**: Return objects with named properties for clarity
4. **Dependencies**: Properly manage effect dependencies
5. **Cleanup**: Always clean up subscriptions and listeners

### Performance Considerations
1. **Memoization**: Use `useMemo` and `useCallback` appropriately
2. **Dependency Arrays**: Keep effect dependencies minimal and stable
3. **State Updates**: Batch state updates when possible
4. **Conditional Effects**: Use guards to prevent unnecessary executions

### Testing
1. **Isolated Testing**: Test hooks in isolation using testing utilities
2. **Mock Dependencies**: Mock external dependencies and APIs
3. **Edge Cases**: Test loading, error, and success states
4. **Cleanup**: Verify proper cleanup in tests

## Integration

### Component Integration
Hooks are designed to be easily integrated into components:

```typescript
function InspectionForm() {
  const { user } = useAuth();
  const { data, loading, error, refetch } = useInspectionData();
  const { save, saving } = useAutoSave(data);
  
  // Component logic using hook values
}
```

### Hook Composition
Hooks can be composed together for complex functionality:

```typescript
function useInspectionForm() {
  const { user } = useAuth();
  const formState = useFormState();
  const validation = useFormValidation(formState);
  const autosave = useAutoSave(formState);
  
  return {
    ...formState,
    ...validation,
    ...autosave,
    user
  };
}
```

## Future Hooks

Potential hooks to add:
- `useCamera`: Camera access and photo capture
- `useVinScanner`: QR code and VIN scanning
- `useInspectionForm`: Complex form state management
- `usePhotoUpload`: File upload with progress tracking
- `useLocalStorage`: Persistent local storage
- `useDebounce`: Debounced values and callbacks

## Dependencies

Hooks may depend on:
- React built-in hooks (`useState`, `useEffect`, etc.)
- External libraries (axios for API calls)
- Application context providers
- TypeScript types from `../types`
- Utility functions from services

## Error Handling

All hooks should implement proper error handling:
- Try-catch blocks for async operations
- Error state management
- User-friendly error messages
- Fallback values for failed operations 