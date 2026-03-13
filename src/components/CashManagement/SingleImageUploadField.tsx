import React, { useRef, useState } from 'react';
import { Box, IconButton, Typography, CircularProgress, Alert } from '@mui/material';
import { PhotoCamera, Delete } from '@mui/icons-material';
import { uploadDepositImages } from '../../services/cashManagementApi';
import { getFullImageUrl } from '../../services/imageUpload';
import { convertHEICToJPEG } from '../../services/imageUploadDebug';

interface SingleImageUploadFieldProps {
  label: string;
  value: string;
  onChange: (filename: string) => void;
  required?: boolean;
  disabled?: boolean;
}

const isHEICFile = (file: File): boolean => {
  return file.type === 'image/heic' || 
         file.type === 'image/heif' || 
         file.name.toLowerCase().endsWith('.heic') || 
         file.name.toLowerCase().endsWith('.heif');
};

const SingleImageUploadField: React.FC<SingleImageUploadFieldProps> = ({
  label,
  value,
  onChange,
  required = false,
  disabled = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingPreview, setUploadingPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const file = files[0];

    // Validate file types (including HEIC before conversion)
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/heic', 'image/heif'];
    if (!validTypes.includes(file.type) && !isHEICFile(file)) {
      setError('Only JPEG, PNG, GIF, and HEIC images are allowed');
      return;
    }

    // Validate file size (max 25MB)
    const maxSize = 25 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('Image must be smaller than 25MB');
      return;
    }

    setError(null);
    setUploading(true);
    
    try {
      // Process HEIC conversion if needed
      const processedFile = isHEICFile(file) ? await convertHEICToJPEG(file) : file;
      
      // Create preview
      const previewUrl = URL.createObjectURL(processedFile);
      setUploadingPreview(previewUrl);

      // Upload to server
      const uploadedFilenames = await uploadDepositImages([processedFile]);
      
      // Extract relative path from returned filename
      const relativePath = uploadedFilenames[0].startsWith('/') 
        ? uploadedFilenames[0] 
        : new URL(uploadedFilenames[0]).pathname;
      
      // Update with relative path
      onChange(relativePath);
      
      // Clean up preview
      URL.revokeObjectURL(previewUrl);
      setUploadingPreview(null);
    } catch (error) {
      console.error('Image upload failed:', error);
      setError('Failed to upload image. Please try again.');
      if (uploadingPreview) {
        URL.revokeObjectURL(uploadingPreview);
        setUploadingPreview(null);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    onChange('');
    if (uploadingPreview) {
      URL.revokeObjectURL(uploadingPreview);
      setUploadingPreview(null);
    }
  };

  const handleCameraClick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  // Get display URL for image - use blob URL for preview or full URL for saved images
  const getDisplayUrl = (): string => {
    if (uploadingPreview) {
      return uploadingPreview;
    }
    return value ? getFullImageUrl(value) : '';
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
        {label} {required && <span style={{ color: 'red' }}>*</span>}
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 1 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {(value || uploadingPreview) && (
          <Box
            sx={{
              position: 'relative',
              width: '100px',
              height: '100px',
              border: '1px solid #ddd',
              borderRadius: 1,
              overflow: 'hidden',
            }}
          >
            <img
              src={getDisplayUrl()}
              alt={label}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
            {!disabled && (
              <IconButton
                size="small"
                onClick={handleRemoveImage}
                sx={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  },
                }}
              >
                <Delete fontSize="small" />
              </IconButton>
            )}
            {uploading && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                }}
              >
                <CircularProgress size={24} />
              </Box>
            )}
          </Box>
        )}
        
        {!value && !uploadingPreview && (
          <Box
            onClick={handleCameraClick}
            sx={{
              width: '100px',
              height: '100px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px dashed #ccc',
              borderRadius: 1,
              cursor: disabled ? 'not-allowed' : 'pointer',
              '&:hover': {
                border: disabled ? '2px dashed #ccc' : '2px dashed #999',
              },
            }}
          >
            <PhotoCamera sx={{ fontSize: 24, mb: 0.5 }} />
            <Typography variant="caption">Add Photo</Typography>
          </Box>
        )}
      </Box>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
        disabled={disabled}
      />
    </Box>
  );
};

export default SingleImageUploadField; 