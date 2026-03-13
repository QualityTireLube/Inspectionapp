/**
 * Image/Video Field Component
 * 
 * Rectangular box field for image and video uploads
 * Used for: dash images, TPMS Placard, etc.
 */

import React, { useState, useRef } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Button,
  Dialog,
  DialogContent,
  Grid,
  Card,
  CardMedia,
  CardActions,
  Tooltip
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  VideoCall as VideoIcon,
  Image as ImageIcon
} from '@mui/icons-material';
import { NormalizedFieldTemplate } from '../base/NormalizedFieldTemplate';
import { BaseFieldProps } from '../base/FieldProps';

export interface ImageVideoFieldProps extends BaseFieldProps {
  acceptTypes?: string[];
  maxFiles?: number;
  maxFileSize?: number; // in MB
  aspectRatio?: number; // width/height ratio
  showPreview?: boolean;
  allowVideo?: boolean;
  allowMultiple?: boolean;
  uploadHeight?: number;
}

export const ImageVideoField: React.FC<ImageVideoFieldProps> = ({
  value = [],
  onChange,
  acceptTypes = ['image/*', 'video/*'],
  maxFiles = 10,
  maxFileSize = 50,
  aspectRatio = 16/9,
  showPreview = true,
  allowVideo = true,
  allowMultiple = true,
  uploadHeight = 200,
  ...templateProps
}) => {
  const [files, setFiles] = useState<File[]>(Array.isArray(value) ? value : []);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    
    // Validate file size
    const validFiles = selectedFiles.filter(file => 
      file.size <= maxFileSize * 1024 * 1024
    );
    
    if (validFiles.length !== selectedFiles.length) {
      // Show error for oversized files
      console.warn(`Some files exceed ${maxFileSize}MB limit`);
    }
    
    const newFiles = allowMultiple 
      ? [...files, ...validFiles].slice(0, maxFiles)
      : validFiles.slice(0, 1);
    
    setFiles(newFiles);
    onChange(newFiles);
  };

  const handleFileDelete = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    onChange(newFiles);
  };

  const handleFilePreview = (file: File) => {
    setPreviewFile(file);
    setPreviewOpen(true);
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const isVideo = (file: File) => file.type.startsWith('video/');
  const isImage = (file: File) => file.type.startsWith('image/');

  const renderUploadArea = () => (
    <Box
      sx={{
        border: '2px dashed #ccc',
        borderRadius: 2,
        height: uploadHeight,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        backgroundColor: '#fafafa',
        '&:hover': {
          borderColor: '#1976d2',
          backgroundColor: '#f0f7ff'
        }
      }}
      onClick={triggerFileSelect}
    >
      <UploadIcon sx={{ fontSize: 48, color: '#999', mb: 1 }} />
      <Typography variant="h6" color="textSecondary" gutterBottom>
        {allowMultiple ? 'Upload Files' : 'Upload File'}
      </Typography>
      <Typography variant="body2" color="textSecondary" align="center">
        Drop files here or click to browse
        <br />
        {allowVideo && 'Images & Videos'} 
        {!allowVideo && 'Images only'}
        {' '}(max {maxFileSize}MB each)
      </Typography>
      
      <Button
        variant="outlined"
        startIcon={<UploadIcon />}
        sx={{ mt: 2 }}
        onClick={(e) => {
          e.stopPropagation();
          triggerFileSelect();
        }}
      >
        Choose Files
      </Button>
    </Box>
  );

  const renderFileGrid = () => (
    <Grid container spacing={2}>
      {files.map((file, index) => {
        const fileUrl = URL.createObjectURL(file);
        
        return (
          <Grid size={{ xs: 6, sm: 4, md: 3 }} key={index}>
            <Card sx={{ position: 'relative' }}>
              {isVideo(file) ? (
                <Box
                  sx={{
                    height: 120,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f5f5f5'
                  }}
                >
                  <VideoIcon sx={{ fontSize: 48, color: '#999' }} />
                </Box>
              ) : (
                <CardMedia
                  component="img"
                  height="120"
                  image={fileUrl}
                  alt={file.name}
                  sx={{ objectFit: 'cover' }}
                />
              )}
              
              <CardActions sx={{ p: 1, justifyContent: 'space-between' }}>
                <Tooltip title={file.name}>
                  <Typography
                    variant="caption"
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '60px'
                    }}
                  >
                    {file.name}
                  </Typography>
                </Tooltip>
                
                <Box>
                  <IconButton
                    size="small"
                    onClick={() => handleFilePreview(file)}
                  >
                    <ViewIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleFileDelete(index)}
                    color="error"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </CardActions>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );

  return (
    <NormalizedFieldTemplate
      {...templateProps}
      onCameraClick={triggerFileSelect}
      onPhotoAlbumClick={triggerFileSelect}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple={allowMultiple}
        accept={acceptTypes.join(',')}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      
      {files.length === 0 ? renderUploadArea() : (
        <Box>
          {renderFileGrid()}
          
          {allowMultiple && files.length < maxFiles && (
            <Button
              variant="outlined"
              startIcon={<UploadIcon />}
              onClick={triggerFileSelect}
              sx={{ mt: 2, width: '100%' }}
            >
              Add More Files ({files.length}/{maxFiles})
            </Button>
          )}
        </Box>
      )}

      {/* File Preview Dialog */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogContent sx={{ p: 0 }}>
          {previewFile && (
            <>
              {isVideo(previewFile) ? (
                <video
                  controls
                  style={{ width: '100%', height: 'auto' }}
                  src={URL.createObjectURL(previewFile)}
                />
              ) : (
                <img
                  src={URL.createObjectURL(previewFile)}
                  alt="Preview"
                  style={{ width: '100%', height: 'auto' }}
                />
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </NormalizedFieldTemplate>
  );
};

export default ImageVideoField;
