/**
 * Normalized Field Template System
 * 
 * Standardized template for all field components with consistent layout:
 * - Camera icon (left of label)
 * - Label text (center)
 * - Action icons: Photo Album, Textbox, Info (right side)
 * - Optional Dually button (dependent fields)
 * - Content area below
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider
} from '@mui/material';
import {
  CameraAlt as CameraIcon,
  PhotoLibrary as PhotoAlbumIcon,
  TextFields as TextboxIcon,
  Info as InfoIcon,
  Settings as DuallyIcon
} from '@mui/icons-material';
import { BaseFieldProps } from './FieldProps';

export interface NormalizedFieldTemplateProps extends BaseFieldProps {
  children: React.ReactNode;
  
  // Header configuration
  showCameraIcon?: boolean;
  showPhotoAlbumIcon?: boolean;
  showTextboxIcon?: boolean;
  showInfoIcon?: boolean;
  
  // Dually button configuration
  showDuallyButton?: boolean;
  duallyLabel?: string;
  duallyColor?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  onDuallyClick?: () => void;
  
  // Action handlers
  onCameraClick?: () => void;
  onPhotoAlbumClick?: () => void;
  onTextboxClick?: () => void;
  onInfoClick?: () => void;
  
  // Layout options
  contentSpacing?: number;
  headerHeight?: number;
  showDivider?: boolean;
  
  // Custom styling
  headerBackgroundColor?: string;
  contentBackgroundColor?: string;
  borderRadius?: number;
}

export const NormalizedFieldTemplate: React.FC<NormalizedFieldTemplateProps> = ({
  label,
  description,
  error,
  required,
  children,
  
  // Header icons
  showCameraIcon = true,
  showPhotoAlbumIcon = true,
  showTextboxIcon = true,
  showInfoIcon = true,
  
  // Dually configuration
  showDuallyButton = false,
  duallyLabel = "Dually",
  duallyColor = "primary",
  onDuallyClick,
  
  // Action handlers
  onCameraClick,
  onPhotoAlbumClick,
  onTextboxClick,
  onInfoClick,
  
  // Layout
  contentSpacing = 2,
  headerHeight = 48,
  showDivider = true,
  
  // Styling
  headerBackgroundColor = '#f5f5f5',
  contentBackgroundColor = '#ffffff',
  borderRadius = 8,
  
  ...rest
}) => {
  const [textboxOpen, setTextboxOpen] = useState(false);
  const [textboxValue, setTextboxValue] = useState('');
  const [infoOpen, setInfoOpen] = useState(false);

  const handleCameraClick = () => {
    onCameraClick?.();
  };

  const handlePhotoAlbumClick = () => {
    onPhotoAlbumClick?.();
  };

  const handleTextboxClick = () => {
    setTextboxOpen(true);
    onTextboxClick?.();
  };

  const handleInfoClick = () => {
    setInfoOpen(true);
    onInfoClick?.();
  };

  const handleDuallyClick = () => {
    onDuallyClick?.();
  };

  return (
    <Box
      sx={{
        border: '1px solid #e0e0e0',
        borderRadius: `${borderRadius}px`,
        overflow: 'hidden',
        mb: 2,
        backgroundColor: contentBackgroundColor,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}
    >
      {/* Header Section */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          height: `${headerHeight}px`,
          px: 2,
          backgroundColor: headerBackgroundColor,
          borderBottom: showDivider ? '1px solid #e0e0e0' : 'none'
        }}
      >
        {/* Left Side - Camera Icon */}
        {showCameraIcon && (
          <Tooltip title="Take Photo">
            <IconButton
              size="small"
              onClick={handleCameraClick}
              sx={{ mr: 1, color: '#666' }}
            >
              <CameraIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}

        {/* Center - Label */}
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 600,
              color: '#333',
              fontSize: '0.9rem'
            }}
          >
            {label}
            {required && (
              <Typography
                component="span"
                sx={{ color: 'error.main', ml: 0.5 }}
              >
                *
              </Typography>
            )}
          </Typography>
          
          {/* Dually Button (inline with label) */}
          {showDuallyButton && (
            <Button
              size="small"
              startIcon={<DuallyIcon />}
              onClick={handleDuallyClick}
              color={duallyColor}
              sx={{
                ml: 2,
                minWidth: 'auto',
                fontSize: '0.75rem',
                px: 1,
                py: 0.5
              }}
            >
              {duallyLabel}
            </Button>
          )}
        </Box>

        {/* Right Side - Action Icons */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {showPhotoAlbumIcon && (
            <Tooltip title="Photo Album">
              <IconButton
                size="small"
                onClick={handlePhotoAlbumClick}
                sx={{ color: '#666' }}
              >
                <PhotoAlbumIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          
          {showTextboxIcon && (
            <Tooltip title="Text Input">
              <IconButton
                size="small"
                onClick={handleTextboxClick}
                sx={{ color: '#666' }}
              >
                <TextboxIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          
          {showInfoIcon && (
            <Tooltip title="Field Information">
              <IconButton
                size="small"
                onClick={handleInfoClick}
                sx={{ color: '#666' }}
              >
                <InfoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Content Section */}
      <Box sx={{ p: contentSpacing }}>
        {children}
        
        {/* Error Message */}
        {error && (
          <Typography
            variant="caption"
            sx={{
              color: 'error.main',
              mt: 1,
              display: 'block',
              fontSize: '0.75rem'
            }}
          >
            {error}
          </Typography>
        )}
        
        {/* Description */}
        {description && (
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              mt: 0.5,
              display: 'block',
              fontSize: '0.75rem'
            }}
          >
            {description}
          </Typography>
        )}
      </Box>

      {/* Textbox Dialog */}
      <Dialog
        open={textboxOpen}
        onClose={() => setTextboxOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Text Input for {label}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            multiline
            rows={4}
            fullWidth
            value={textboxValue}
            onChange={(e) => setTextboxValue(e.target.value)}
            placeholder="Enter text content..."
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTextboxOpen(false)}>Cancel</Button>
          <Button onClick={() => setTextboxOpen(false)} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Info Dialog */}
      <Dialog
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{label} - Field Information</DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            {description || 'No additional information available for this field.'}
          </Typography>
          
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="h6" gutterBottom>
            Field Actions:
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {showCameraIcon && (
              <Typography variant="body2">
                📷 <strong>Camera:</strong> Take photos directly from device camera
              </Typography>
            )}
            {showPhotoAlbumIcon && (
              <Typography variant="body2">
                🖼️ <strong>Photo Album:</strong> Select photos from device gallery
              </Typography>
            )}
            {showTextboxIcon && (
              <Typography variant="body2">
                📝 <strong>Text Input:</strong> Add text notes or descriptions
              </Typography>
            )}
            {showDuallyButton && (
              <Typography variant="body2">
                ⚙️ <strong>Dually:</strong> Access dependent field configurations
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInfoOpen(false)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NormalizedFieldTemplate;
