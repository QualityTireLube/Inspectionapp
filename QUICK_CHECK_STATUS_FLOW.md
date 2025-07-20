# Quick Check Status Flow Implementation

## Overview
This document outlines the complete implementation of the quick check status flow with proper timestamp and duration handling.

## Status Flow
1. **Started/Open**: `pending` status
2. **Tab Change**: `pending` status (with updated title)
3. **Saved/Submitted**: `submitted` status (with duration calculation)

## Backend SQL Statements

### 1. New Draft Creation (INSERT)
**When**: Form is first opened
**Status**: `pending`
**Title**: "Quick Check - [VIN] - [Date]"

```sql
INSERT INTO quick_checks (
  user_email, 
  user_name, 
  title, 
  data, 
  created_at, 
  updated_at, 
  status, 
  duration_seconds, 
  saved_at
)
VALUES (
  ?, 
  ?, 
  ?, 
  ?, 
  datetime('now'), 
  datetime('now'), 
  'pending', 
  0, 
  datetime('now')
)
```

### 2. Tab Change Save (UPDATE)
**When**: User switches tabs
**Status**: `pending` (unchanged)
**Title**: "Quick Check - [VIN] - [Date] - [TabName]"

```sql
UPDATE quick_checks 
SET data = ?, 
    title = ?, 
    updated_at = datetime('now'), 
    saved_at = datetime('now')
WHERE id = ? AND status = 'pending'
```

### 3. Submit Final Save (UPDATE)
**When**: User clicks Save or Submit
**Status**: `submitted`
**Title**: "Quick Check - [VIN] - [Date]" (no tab name)

```sql
UPDATE quick_checks 
SET title = ?, 
    data = ?, 
    status = 'submitted', 
    updated_at = CASE 
      WHEN CAST((julianday(datetime("now")) - julianday(created_at)) * 24 * 3600 AS INTEGER) = 0 
      THEN datetime(created_at, '+1 second')
      ELSE datetime("now")
    END,
    duration_seconds = CASE 
      WHEN CAST((julianday(datetime("now")) - julianday(created_at)) * 24 * 3600 AS INTEGER) = 0 
      THEN 1 
      ELSE CAST((julianday(datetime("now")) - julianday(created_at)) * 24 * 3600 AS INTEGER) 
    END
WHERE id = ? AND status = 'pending'
```

## Frontend API Calls

### 1. Create Draft Quick Check
**When**: Form is first opened

```typescript
// Create draft when form opens
const createDraftQuickCheck = async (title: string, data?: any): Promise<{ id: number }> => {
  const response = await axiosInstance.post<{ id: number }>('/quick-checks/draft', {
    title,
    data: data ? JSON.stringify(data) : undefined
  });
  return response.data;
};

// Example usage:
const draftId = await createDraftQuickCheck(
  `Quick Check - ${form.vin} - ${form.date}`,
  form
);
```

### 2. Update Draft Quick Check (Tab Change)
**When**: User switches tabs

```typescript
// Update draft on tab change
const updateDraftQuickCheck = async (id: number, title: string, data: any): Promise<{ message: string }> => {
  const response = await axiosInstance.put<{ message: string }>(`/quick-checks/${id}/draft`, {
    title,
    data: JSON.stringify(data)
  });
  return response.data;
};

// Example usage:
const tabNames = ['Info', 'Pulling Into Bay', 'Underhood', 'Tires and Brakes'];
await updateDraftQuickCheck(
  draftId,
  `Quick Check - ${form.vin} - ${form.date} - ${tabNames[tabValue]}`,
  form
);
```

### 3. Submit Quick Check
**When**: User clicks Save or Submit

```typescript
// Submit final quick check
const submitQuickCheck = async (
  title: string, 
  data: any, 
  draftId?: number, 
  files?: { [fieldName: string]: File[] }
): Promise<{ id: number }> => {
  const formData = new FormData();
  formData.append('title', title);
  formData.append('data', JSON.stringify(data));
  
  if (draftId) {
    formData.append('draftId', draftId.toString());
  }
  
  // Add files to form data if provided
  if (files) {
    Object.entries(files).forEach(([fieldName, fileArray]) => {
      fileArray.forEach(file => {
        formData.append(fieldName, file);
      });
    });
  }

  const response = await axiosInstance.post<{ id: number }>('/quick-checks', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// Example usage:
const finalId = await submitQuickCheck(
  `Quick Check - ${form.vin} - ${form.date}`,
  form,
  draftId,
  fileMappings
);
```

## Key Features

### ✅ Server-Controlled Timing
- **created_at**: Set by server using `datetime('now')`
- **updated_at**: Set by server using `datetime('now')` or `datetime(created_at, '+1 second')`
- **duration_seconds**: Calculated by server using `julianday()` functions
- **Client never sends timing data**: All timing is calculated server-side

### ✅ Duration Calculation Logic
```sql
-- If duration is 0 seconds, force to 1 second and set updated_at to created_at + 1 second
WHEN CAST((julianday(datetime("now")) - julianday(created_at)) * 24 * 3600 AS INTEGER) = 0 
THEN datetime(created_at, '+1 second')

-- Otherwise, use current time
ELSE datetime("now")
```

### ✅ Status Transitions
- **pending** → **submitted**: Only valid transition for drafts
- **submitted** → **archived**: For completed quick checks
- No direct **pending** → **archived** transition

### ✅ Title Management
- **Draft creation**: "Quick Check - [VIN] - [Date]"
- **Tab change**: "Quick Check - [VIN] - [Date] - [TabName]"
- **Submit**: "Quick Check - [VIN] - [Date]" (removes tab name)

## Database Schema

```sql
CREATE TABLE quick_checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  title TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  duration_seconds INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  saved_at DATETIME,
  archived_at DATETIME,
  archived_by TEXT,
  archived_by_name TEXT
);
```

## Error Handling

### Backend Validation
- **Missing fields**: Returns 400 for missing title or data
- **Invalid status**: Returns 400 for invalid status transitions
- **Draft not found**: Returns 404 if draft doesn't exist or wrong status
- **File upload errors**: Returns 400 for file validation failures

### Frontend Error Handling
```typescript
try {
  const result = await submitQuickCheck(title, data, draftId, files);
  // Handle success
} catch (error) {
  if (error.response?.status === 404) {
    // Draft not found
  } else if (error.response?.status === 400) {
    // Validation error
  } else {
    // General error
  }
}
```

## Security Considerations

### ✅ Client Data Validation
- Server never trusts client timing data
- All timestamps calculated server-side
- Duration calculation done in SQLite
- File upload validation and sanitization

### ✅ Authentication
- All endpoints require valid JWT token
- User can only access their own quick checks
- Admin functions properly protected

### ✅ Input Sanitization
- SQL injection prevention through parameterized queries
- File type validation for uploads
- JSON data validation before database storage 