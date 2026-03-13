# Image Components

This folder contains all image handling and upload components used across the application.

## Components

### `SafariImageUpload.tsx`
**Main image upload component with Safari iOS compatibility**
- ✅ **Primary component** for all image uploads
- ✅ Handles Safari iOS file input compatibility issues
- ✅ HEIC file conversion and 1080p resizing
- ✅ User interaction protection (prevents auto-triggering)
- ✅ Multiple file upload support
- ✅ Comprehensive error handling and retry logic

**Usage:**
```tsx
<SafariImageUpload
  onImageUpload={handleImageUpload}
  uploadType="dashLights"
  disabled={loading}
  multiple={true}
  resize1080p={true}
/>
```

### `ImageFieldDisplay.tsx`
**Displays image fields with upload and view functionality**
- Uses `SafariImageUpload` for uploads
- Grid-based image display
- Delete functionality
- Click-to-view images

**Usage:**
```tsx
<ImageFieldDisplay
  fieldName="battery_photos"
  images={form.battery_photos}
  loading={loading}
  onImageUpload={handleImageUpload}
  onImageClick={handleImageClick}
  onDeleteImage={handleDeleteImage}
/>
```

### `QuickCheckImageManager.tsx`
**Advanced image management for QuickCheck forms**
- Photo validation and processing
- Multiple image handling
- File size and format validation
- Undo/delete functionality

### `ImageUploadField.tsx`
**Simple image upload field component**
- Basic file upload functionality
- Used in specific contexts where `SafariImageUpload` might be overkill

## Import Usage

### Individual imports:
```tsx
import SafariImageUpload from './Image/SafariImageUpload';
import { ImageFieldDisplay } from './Image/ImageFieldDisplay';
```

### Cleaner index imports (recommended):
```tsx
import { SafariImageUpload, ImageFieldDisplay } from './Image';
```

## Architecture Notes

- **`SafariImageUpload`** is the **primary component** for all new image upload functionality
- All components in this folder are Safari iOS compatible
- HEIC files are automatically converted to JPEG
- User interaction protection prevents accidental camera triggering
- All components support both camera capture and gallery selection

## Migration History

This folder was created to consolidate image handling components that were previously scattered across:
- `src/components/SafariImageUpload.tsx`
- `src/components/ImageFieldDisplay.tsx` 
- `src/components/QuickCheckImageManager.tsx`
- `src/components/ImageUploadField.tsx`

**Replaced components:**
- ❌ `PhotoUploadField.tsx` (removed - had Safari iOS issues)
- ❌ `PhotoCameraModal.tsx` (removed - manual file handling) 