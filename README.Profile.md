# Profile Page Documentation

## Overview

The Profile Page provides users with a comprehensive interface to view and update their account information. It features a modern, responsive design with a circular avatar displaying user initials, and separate forms for updating profile information and changing passwords.

## Features

### User Interface
- **Circular Avatar**: Large (80x80px) circular avatar displaying user initials
- **User Information Display**: Shows current name and email address
- **Responsive Design**: Mobile-friendly layout using Material-UI Grid system
- **Modern UI**: Clean, professional design with Material-UI components

### Profile Management
- **Name Update**: Change full name with real-time validation
- **Email Update**: Update email address with format validation
- **Duplicate Email Prevention**: Prevents email conflicts with other users
- **Real-time Feedback**: Success and error messages for all operations

### Password Management
- **Current Password Verification**: Requires current password for security
- **New Password Validation**: Minimum 6 characters requirement
- **Password Confirmation**: Ensures new password is entered correctly
- **Secure Password Hashing**: Uses bcrypt for password security

### Security Features
- **Authentication Required**: All operations require valid JWT token
- **Input Validation**: Comprehensive client and server-side validation
- **Error Handling**: Detailed error messages for troubleshooting
- **Session Management**: Automatic logout on authentication failure

## Technical Implementation

### Frontend Components

#### Profile Component (`src/pages/Profile.tsx`)
```typescript
interface UserData {
  name: string;
  email: string;
}

interface ProfileState {
  userData: UserData;
  passwordData: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  };
  loading: boolean;
  passwordLoading: boolean;
  error: string;
  success: string;
  passwordError: string;
  passwordSuccess: string;
}
```

#### Key Functions
- `getInitials(name: string)`: Generates initials from full name
- `handleProfileUpdate()`: Handles profile information updates
- `handlePasswordUpdate()`: Handles password changes
- `useEffect()`: Loads user data from localStorage on component mount

### API Integration

#### Profile Update API (`src/services/api.ts`)
```typescript
export const updateProfile = async (name: string, email: string): Promise<{ message: string }> => {
  const response = await axiosInstance.put<{ message: string }>('/profile', { name, email });
  return response.data;
};

export const updatePassword = async (currentPassword: string, newPassword: string): Promise<{ message: string }> => {
  const response = await axiosInstance.put<{ message: string }>('/profile/password', { 
    currentPassword, 
    newPassword 
  });
  return response.data;
};
```

### Backend API Endpoints

#### Update Profile Information
```http
PUT /api/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john.doe@example.com"
}
```

**Response:**
```json
{
  "message": "Profile updated successfully"
}
```

**Validation Rules:**
- Name and email are required
- Email must be in valid format
- Email cannot be taken by another user

#### Update Password
```http
PUT /api/profile/password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword123"
}
```

**Response:**
```json
{
  "message": "Password updated successfully"
}
```

**Validation Rules:**
- Current password and new password are required
- Current password must be correct
- New password must be at least 6 characters long

### Backend Implementation (`server/index.js`)

#### Profile Update Endpoint
```javascript
app.put('/api/profile', authenticateToken, async (req, res) => {
  const { name, email } = req.body;
  const currentUserEmail = req.user.email;

  // Input validation
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  if (!validateEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Check for email conflicts
  // Update user in CSV file
  // Return success response
});
```

#### Password Update Endpoint
```javascript
app.put('/api/profile/password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const currentUserEmail = req.user.email;

  // Verify current password
  const isValidPassword = await bcrypt.compare(currentPassword, currentUser.password);
  if (!isValidPassword) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  // Hash new password and update
  const hashedNewPassword = bcrypt.hashSync(newPassword, SALT_ROUNDS);
  // Update user in CSV file
  // Return success response
});
```

## User Interface Layout

### Desktop Layout
```
┌─────────────────────────────────────────────────────────────┐
│                    Profile Settings                         │
├─────────────────────────────────┬───────────────────────────┤
│ ┌─────────────────────────────┐ │ ┌─────────────────────────┐ │
│ │        Profile Info         │ │ │     Change Password     │ │
│ │                             │ │ │                         │ │
│ │  [Avatar] John Doe          │ │ │ Current Password:       │ │
│ │      john@example.com       │ │ │ [••••••••••••••••••••]  │ │
│ │                             │ │ │                         │ │
│ │ Full Name:                  │ │ │ New Password:           │ │
│ │ [John Doe                ]  │ │ │ [••••••••••••••••••••]  │ │
│ │                             │ │ │                         │ │
│ │ Email:                      │ │ │ Confirm Password:       │ │
│ │ [john@example.com        ]  │ │ │ [••••••••••••••••••••]  │ │
│ │                             │ │ │                         │ │
│ │ [Update Profile]            │ │ │ [Update Password]       │ │
│ └─────────────────────────────┘ │ └─────────────────────────┘ │
└─────────────────────────────────┴───────────────────────────┘
```

### Mobile Layout
```
┌─────────────────────────────────────┐
│         Profile Settings            │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │        Profile Info             │ │
│ │                                 │ │
│ │  [Avatar] John Doe              │ │
│ │      john@example.com           │ │
│ │                                 │ │
│ │ Full Name:                      │ │
│ │ [John Doe                    ]  │ │
│ │                                 │ │
│ │ Email:                          │ │
│ │ [john@example.com            ]  │ │
│ │                                 │ │
│ │ [Update Profile]                │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │     Change Password             │ │
│ │                                 │ │
│ │ Current Password:               │ │
│ │ [••••••••••••••••••••        ]  │ │
│ │                                 │ │
│ │ New Password:                   │ │
│ │ [••••••••••••••••••••        ]  │ │
│ │                                 │ │
│ │ Confirm Password:               │ │
│ │ [••••••••••••••••••••        ]  │ │
│ │                                 │ │
│ │ [Update Password]               │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

## Navigation Integration

### App Routing (`src/App.tsx`)
```typescript
<Route path="/profile" element={
  <ProtectedRoute>
    <Layout>
      <Profile />
    </Layout>
  </ProtectedRoute>
} />
```

### Navigation Bar (`src/components/Layout.tsx`)
```typescript
<Button
  color="inherit"
  onClick={() => navigate('/profile')}
  sx={{ mr: 2 }}
>
  Profile
</Button>
```

## Data Flow

### Profile Information Update
1. User enters new name and/or email
2. Client validates input fields
3. API request sent to `/api/profile`
4. Server validates input and checks for email conflicts
5. User data updated in CSV file
6. Success response returned
7. localStorage updated with new values
8. Success message displayed to user

### Password Update
1. User enters current password, new password, and confirmation
2. Client validates password requirements and confirmation match
3. API request sent to `/api/profile/password`
4. Server verifies current password
5. New password hashed with bcrypt
6. Password updated in CSV file
7. Success response returned
8. Form fields cleared and success message displayed

## Error Handling

### Client-Side Validation
- **Required Fields**: All form fields are required
- **Email Format**: Real-time email format validation
- **Password Length**: Minimum 6 characters for new passwords
- **Password Confirmation**: New passwords must match confirmation

### Server-Side Validation
- **Authentication**: JWT token required for all operations
- **Input Validation**: Comprehensive validation of all inputs
- **Email Uniqueness**: Prevents duplicate email addresses
- **Password Verification**: Current password must be correct

### Error Messages
- **400 Bad Request**: Invalid input data
- **401 Unauthorized**: Invalid current password
- **403 Forbidden**: Invalid or expired token
- **404 Not Found**: User not found
- **500 Internal Server Error**: Server-side errors

## Security Considerations

### Authentication
- All profile operations require valid JWT token
- Automatic logout on token expiration
- Token-based session management

### Password Security
- Current password verification required
- New passwords hashed with bcrypt (10 salt rounds)
- Minimum password length enforcement
- Secure password storage in CSV file

### Data Validation
- Input sanitization on both client and server
- Email format validation
- Duplicate email prevention
- XSS protection through proper encoding

## File Structure

```
src/
├── pages/
│   └── Profile.tsx              # Main profile component
├── services/
│   └── api.ts                   # API functions for profile updates
├── components/
│   └── Layout.tsx               # Navigation with profile button
└── App.tsx                      # Profile route configuration

server/
└── index.js                     # Profile API endpoints
```

## Dependencies

### Frontend Dependencies
- `@mui/material`: UI components and styling
- `@mui/icons-material`: Material Design icons
- `axios`: HTTP client for API requests
- `react-router-dom`: Navigation and routing

### Backend Dependencies
- `express`: Web framework
- `bcryptjs`: Password hashing
- `jsonwebtoken`: JWT authentication
- `csv-parser`: CSV file handling
- `fs`: File system operations

## Usage Examples

### Basic Profile Update
```typescript
const handleProfileUpdate = async () => {
  try {
    await updateProfile('John Doe', 'john.doe@example.com');
    localStorage.setItem('userName', 'John Doe');
    localStorage.setItem('userEmail', 'john.doe@example.com');
    setSuccess('Profile updated successfully!');
  } catch (err) {
    setError('Failed to update profile');
  }
};
```

### Password Change
```typescript
const handlePasswordUpdate = async () => {
  try {
    await updatePassword('oldpassword', 'newpassword123');
    setPasswordSuccess('Password updated successfully!');
    // Clear form fields
  } catch (err) {
    setPasswordError('Failed to update password');
  }
};
```

## Testing

### Manual Testing Checklist
- [ ] Profile page loads with user data
- [ ] Avatar displays correct initials
- [ ] Profile update form works correctly
- [ ] Email validation prevents invalid emails
- [ ] Duplicate email prevention works
- [ ] Password change form works correctly
- [ ] Current password verification works
- [ ] Password confirmation validation works
- [ ] Error messages display correctly
- [ ] Success messages display correctly
- [ ] Form fields clear after successful updates
- [ ] Responsive design works on mobile devices

### API Testing
```bash
# Test profile update
curl -X PUT http://localhost:5001/api/profile \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com"}'

# Test password update
curl -X PUT http://localhost:5001/api/profile/password \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"oldpass","newPassword":"newpass123"}'
```

## Future Enhancements

### Planned Features
- **Profile Picture Upload**: Allow users to upload profile photos
- **Two-Factor Authentication**: Enhanced security with 2FA
- **Account Deletion**: Self-service account deletion
- **Activity History**: Track profile changes and login history
- **Email Verification**: Email verification for new addresses

### Security Improvements
- **Password Strength Meter**: Visual password strength indicator
- **Account Lockout**: Brute force protection
- **Session Management**: Multiple device session control
- **Audit Logging**: Detailed activity logging

## Support

### Documentation
- **API Documentation**: Backend endpoint specifications
- **Component Documentation**: React component usage
- **Security Documentation**: Authentication and security guidelines

### Contact
- **Technical Support**: development@quickcheck.com
- **Security Issues**: security@quickcheck.com
- **User Support**: support@quickcheck.com

## Related Documentation

- **[README.Login.md](README.Login.md)** - Authentication system documentation
- **[README.API.md](README.API.md)** - API documentation and endpoints
- **[README.Database.md](README.Database.md)** - Database schema and user management
- **[README.QuickCheck.md](README.QuickCheck.md)** - Main application documentation 