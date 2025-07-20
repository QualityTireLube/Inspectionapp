import React, { useState, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Modal,
  Button,
  Stack,
  useTheme,
  useMediaQuery,
  Tooltip,
  TextField,
  IconButton,
  Divider,
  Chip,
  Slider,
} from '@mui/material';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import TireTreadSideView from './TireTreadSideView';
import { SafariImageUpload } from './Image';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import DeleteIcon from '@mui/icons-material/Delete';
import { getFullImageUrl } from '../services/imageUpload';
import TireRepairGuidedModal from './TireRepairGuidedModal';

interface ImageUpload {
  file: File;
  progress: number;
  url?: string;
  error?: string;
  position?: number;
  isDeleted?: boolean;
}

interface TireTreadData {
  inner_edge_depth: string;
  inner_depth: string;
  center_depth: string;
  outer_depth: string;
  outer_edge_depth: string;
  inner_edge_condition: 'green' | 'yellow' | 'red';
  inner_condition: 'green' | 'yellow' | 'red';
  center_condition: 'green' | 'yellow' | 'red';
  outer_condition: 'green' | 'yellow' | 'red';
  outer_edge_condition: 'green' | 'yellow' | 'red';
}

interface TireRepairImages {
  not_repairable: ImageUpload[];
  tire_size_brand: ImageUpload[];
  repairable_spot: ImageUpload[];
}

interface TireRepairLayoutProps {
  tireStatuses: {
    driver_front: 'repairable' | 'non_repairable' | null;
    passenger_front?: 'repairable' | 'non_repairable' | null;
    driver_rear_outer: 'repairable' | 'non_repairable' | null;
    driver_rear_inner: 'repairable' | 'non_repairable' | null;
    passenger_rear_inner: 'repairable' | 'non_repairable' | null;
    passenger_rear_outer: 'repairable' | 'non_repairable' | null;
    spare: 'repairable' | 'non_repairable' | null;
  };
  onTireStatusChange: (position: string, status: 'repairable' | 'non_repairable' | null) => void;
  // Optional enhanced features
  treadData?: {
    [key: string]: TireTreadData;
  };
  tireImages?: {
    [key: string]: TireRepairImages;
  };
  tireDates?: {
    [key: string]: string;
  };
  onTreadChange?: (position: string, field: keyof TireTreadData, value: string) => void;
  onTreadConditionChange?: (position: string, field: keyof TireTreadData, condition: 'green' | 'yellow' | 'red') => void;
  onTireImageUpload?: (position: string, imageType: 'not_repairable' | 'tire_size_brand' | 'repairable_spot', file: File) => void;
  onTireImageDelete?: (position: string, imageType: 'not_repairable' | 'tire_size_brand' | 'repairable_spot', index: number) => void;
  onTireDateChange?: (position: string, date: string) => void;
  // Dually state management
  showDually?: boolean;
  onDuallyToggle?: (show: boolean) => void;
  // Optional callback for tire clicks (for detail views)
  onTireClick?: (position: string) => void;
}

const TireRepairLayout: React.FC<TireRepairLayoutProps> = ({
  tireStatuses,
  onTireStatusChange,
  treadData = {},
  tireImages = {},
  tireDates = {},
  onTreadChange,
  onTreadConditionChange,
  onTireImageUpload,
  onTireImageDelete,
  onTireDateChange,
  showDually = false,
  onDuallyToggle,
  onTireClick,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [modalOpen, setModalOpen] = useState(false);
  const [guidedModalOpen, setGuidedModalOpen] = useState(false);
  const [selectedTire, setSelectedTire] = useState<string | null>(null);
  const [selectedImageType, setSelectedImageType] = useState<'not_repairable' | 'tire_size_brand' | 'repairable_spot' | null>(null);
  const [rotationAngles, setRotationAngles] = useState<{ [key: string]: number }>({});

  // Create refs at the top level of the component
  const uploadRef1 = useRef<any>(null);
  const uploadRef2 = useRef<any>(null);
  const uploadRef3 = useRef<any>(null);
  const addMoreRef1 = useRef<any>(null);
  const addMoreRef2 = useRef<any>(null);
  const addMoreRef3 = useRef<any>(null);

  // Create refs for tread depth input fields to enable auto-advance
  const treadInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Helper functions to trigger uploads
  const triggerCameraUpload = (ref: React.RefObject<any>) => {
    if (ref.current) {
      const cameraButton = ref.current.querySelector('[title="Take Photo"]');
      if (cameraButton) {
        cameraButton.click();
      }
    }
  };

  const triggerGalleryUpload = (ref: React.RefObject<any>) => {
    if (ref.current) {
      const galleryButton = ref.current.querySelector('[title="Choose from Gallery"]');
      if (galleryButton) {
        galleryButton.click();
      }
    }
  };

  const handleTireClick = (event: React.MouseEvent<HTMLElement>, tire: string) => {
    if (onTireClick) {
      // If onTireClick is provided, use it for detail view (read-only mode)
      onTireClick(tire);
    } else {
      // Otherwise, open the guided modal for editing
      setSelectedTire(tire);
      setGuidedModalOpen(true);
    }
  };

  const handleClose = () => {
    setModalOpen(false);
    setGuidedModalOpen(false);
    setSelectedTire(null);
  };

  const handleStatusSelect = (status: 'repairable' | 'non_repairable' | null) => {
    if (selectedTire) {
      onTireStatusChange(selectedTire, status);
    }
    // Only close the popup when "Clear" is selected (status is null)
    // Allow users to continue working with the tire after selecting repairable/non-repairable
    if (status === null) {
      handleClose();
    }
  };

  const getTireColor = (status: 'repairable' | 'non_repairable' | null) => {
    switch (status) {
      case 'repairable':
        return theme.palette.success.main;
      case 'non_repairable':
        return theme.palette.error.main;
      default:
        return theme.palette.grey[400];
    }
  };

  const getTirePositionName = (position: string): string => {
    const positionNames: { [key: string]: string } = {
      'driver_front': 'Driver Front',
      'passenger_front': 'Passenger Front',
      'driver_rear_outer': 'Driver Rear Outer',
      'driver_rear_inner': 'Driver Rear Inner',
      'passenger_rear_inner': 'Passenger Rear Inner',
      'passenger_rear_outer': 'Passenger Rear Outer',
      'spare': 'Spare'
    };
    return positionNames[position] || position.replace('_', ' ').toUpperCase();
  };

  // Function to determine condition based on tread depth
  const getConditionFromDepth = (depth: string): 'green' | 'yellow' | 'red' => {
    const numDepth = parseInt(depth) || 0;
    if (numDepth >= 6) return 'green';
    if (numDepth >= 4) return 'yellow';
    return 'red';
  };

  const handleTreadInputChange = (field: keyof TireTreadData, value: string) => {
    if (selectedTire && onTreadChange) {
      // Only allow single digit for auto-advance
      const singleDigit = value.slice(-1);
      if (singleDigit && /^\d$/.test(singleDigit)) {
        onTreadChange(selectedTire, field, singleDigit);
        
        // Auto-update condition based on depth
        if (field.includes('depth') && onTreadConditionChange) {
          const conditionField = field.replace('_depth', '_condition') as keyof TireTreadData;
          const newCondition = getConditionFromDepth(singleDigit);
          onTreadConditionChange(selectedTire, conditionField, newCondition);
        }

        // Auto-advance to next field
        const parts = ['outer_edge', 'outer', 'center', 'inner', 'inner_edge'];
        const currentPartIndex = parts.findIndex(part => field === `${part}_depth`);
        const nextPartIndex = currentPartIndex + 1;
        
        if (nextPartIndex < parts.length) {
          const nextField = `${parts[nextPartIndex]}_depth`;
          const nextInputRef = treadInputRefs.current[nextField];
          if (nextInputRef) {
            setTimeout(() => {
              nextInputRef.focus();
              nextInputRef.select();
            }, 50);
          }
        }
      } else if (value === '') {
        // Allow clearing the field
        onTreadChange(selectedTire, field, '');
        if (field.includes('depth') && onTreadConditionChange) {
          const conditionField = field.replace('_depth', '_condition') as keyof TireTreadData;
          onTreadConditionChange(selectedTire, conditionField, 'green');
        }
      }
    }
  };

  const handleImageUpload = async (file: File, imageType: 'not_repairable' | 'tire_size_brand' | 'repairable_spot') => {
    if (file && selectedTire && onTireImageUpload) {
      onTireImageUpload(selectedTire, imageType, file);
    }
  };

  const handleImageDelete = (imageType: 'not_repairable' | 'tire_size_brand' | 'repairable_spot', index: number) => {
    if (selectedTire && onTireImageDelete) {
      onTireImageDelete(selectedTire, imageType, index);
    }
  };

  const handleTireDateInputChange = (date: string) => {
    if (selectedTire && onTireDateChange) {
      const value = date.replace(/[^0-9]/g, '').slice(0, 4);
      if (value.length === 4) {
        const week = value.slice(0, 2);
        const year = value.slice(2, 4);
        const weekNum = parseInt(week);
        if (weekNum >= 1 && weekNum <= 52) {
          const formatted = `${week.padStart(2, '0')}/${year}`;
          onTireDateChange(selectedTire, formatted);
        } else {
          onTireDateChange(selectedTire, value);
        }
      } else {
        onTireDateChange(selectedTire, value);
      }
    }
  };

  const handleDuallyToggle = () => {
    if (onDuallyToggle) {
      onDuallyToggle(!showDually);
    }
  };

  const TireButton = ({ position, label }: { position: string; label: string }) => (
    <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Tooltip title={`${label} - Click to set repair status`}>
        <Button
          onClick={(e) => handleTireClick(e, position)}
          sx={{
            minWidth: isMobile ? 48 : 64,
            height: isMobile ? 48 : 64,
            borderRadius: '50%',
            p: 0,
            bgcolor: getTireColor(tireStatuses[position as keyof typeof tireStatuses] || null),
            '&:hover': {
              bgcolor: getTireColor(tireStatuses[position as keyof typeof tireStatuses] || null),
              opacity: 0.8,
            },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: isMobile ? '1.5rem' : '2rem',
            color: 'white',
            transition: 'all 0.2s ease-in-out',
            '&:active': {
              transform: 'scale(0.95)',
            },
          }}
        >
          🛞
        </Button>
      </Tooltip>
      <Typography
        variant="caption"
        sx={{
          mt: 0.5,
          color: 'text.secondary',
          fontSize: isMobile ? '0.7rem' : '0.75rem',
          fontWeight: 500,
        }}
      >
        {label}
      </Typography>
    </Box>
  );

  const renderImageSection = (
    title: string,
    imageType: 'not_repairable' | 'tire_size_brand' | 'repairable_spot',
    images: ImageUpload[] = [],
    uploadRef: React.RefObject<any>,
    addMoreRef: React.RefObject<any>
  ) => {
    const triggerCameraUploadForSection = () => {
      triggerCameraUpload(uploadRef);
    };

    const triggerGalleryUploadForSection = () => {
      triggerGalleryUpload(uploadRef);
    };

    const triggerAddMoreUpload = () => {
      triggerGalleryUpload(addMoreRef);
    };

    const isEditable = typeof onTireImageUpload === 'function' && typeof onTireImageDelete === 'function';

    return (
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>
            {title}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {images.length} photo{images.length !== 1 ? 's' : ''}
            </Typography>
            {isEditable && (
              <Box ref={uploadRef}>
                <SafariImageUpload
                  onImageUpload={(file: File) => handleImageUpload(file, imageType)}
                  uploadType={`tire_repair_${imageType}`}
                  disabled={false}
                  multiple={false}
                  size="small"
                />
              </Box>
            )}
          </Box>
        </Box>

        {images.length === 0 ? (
          <Box
            sx={{
              border: '2px dashed',
              borderColor: 'grey.300',
              borderRadius: 2,
              p: 3,
              textAlign: 'center',
              cursor: 'pointer',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'action.hover',
              },
            }}
            onClick={isEditable ? triggerCameraUploadForSection : undefined}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
              <PhotoCameraIcon sx={{ fontSize: 48, color: 'grey.400' }} />
              <Typography variant="body2" color="text.secondary">
                Click to take photo or drag image here
              </Typography>
            </Box>
          </Box>
        ) : (
          <Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2, flexDirection: 'column' }}>
              {images.map((image, index) => {
                // Unique key for rotation state: tire-position + imageType + index
                const rotationKey = `${selectedTire || ''}_${imageType}_${index}`;
                const angle = rotationAngles[rotationKey] || 0;
                return (
                  <Box
                    key={index}
                    sx={{
                      position: 'relative',
                      width: '100%',
                      mb: 2,
                      borderRadius: 2,
                      overflow: 'hidden',
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <img
                      src={image.url ? getFullImageUrl(image.url) : ''}
                      alt={`${title} ${index + 1}`}
                      style={{
                        width: '100%',
                        height: 'auto',
                        maxHeight: '400px',
                        objectFit: 'contain',
                        display: 'block',
                        margin: '0 auto',
                        transition: 'transform 0.2s',
                        transform: imageType === 'tire_size_brand' ? `rotate(${angle}deg)` : undefined,
                      }}
                    />
                    {isEditable && (
                      <IconButton
                        size="small"
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          bgcolor: 'rgba(0,0,0,0.5)',
                          color: 'white',
                          '&:hover': {
                            bgcolor: 'rgba(0,0,0,0.7)',
                          },
                        }}
                        onClick={() => handleImageDelete(imageType, index)}
                      >
                        <DeleteIcon sx={{ fontSize: 20 }} />
                      </IconButton>
                    )}
                    {/* Only show slider for tire_size_brand images */}
                    {imageType === 'tire_size_brand' && (
                      <Box sx={{ px: 2, py: 1, bgcolor: 'background.paper' }}>
                        <Slider
                          value={angle}
                          min={0}
                          max={360}
                          step={1}
                          onChange={(_, value) => {
                            setRotationAngles(prev => ({ ...prev, [rotationKey]: value as number }));
                          }}
                          aria-labelledby={`rotate-slider-${rotationKey}`}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', display: 'block' }}>
                          Rotate: {angle}&deg;
                        </Typography>
                      </Box>
                    )}
                  </Box>
                );
              })}
            </Box>
            {isEditable && (
              <>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={triggerAddMoreUpload}
                  sx={{ mt: 1 }}
                >
                  Add more photos
                </Button>
                <Box ref={addMoreRef} style={{ display: 'none' }}>
                  <SafariImageUpload
                    onImageUpload={(file: File) => handleImageUpload(file, imageType)}
                    uploadType={`tire_repair_${imageType}_add`}
                    disabled={false}
                    multiple={false}
                    size="small"
                  />
                </Box>
              </>
            )}
          </Box>
        )}
      </Box>
    );
  };

  const currentTreadData = selectedTire ? treadData[selectedTire] : undefined;
  const currentImages = selectedTire ? tireImages[selectedTire] : undefined;
  const currentDate = selectedTire ? tireDates[selectedTire] : undefined;

  const parts = ['outer_edge', 'outer', 'center', 'inner', 'inner_edge'] as const;
  const formatLabel = (part: string) => {
    return part.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        bgcolor: 'background.default',
        borderRadius: 2,
      }}
    >
      {/* Dually Toggle Chip */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
        <Chip
          label="Dually"
          color={showDually ? 'primary' : 'default'}
          variant={showDually ? 'filled' : 'outlined'}
          clickable
          onClick={handleDuallyToggle}
          sx={{
            fontWeight: showDually ? 'bold' : 'normal',
            '&:hover': {
              transform: 'scale(1.05)',
            },
            transition: 'all 0.2s ease-in-out',
          }}
        />
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3,
        }}
      >
        {/* Front Tires */}
        <Box 
          sx={{ 
            display: 'flex', 
            gap: 4,
            justifyContent: 'center',
            width: '100%',
          }}
        >
          <TireButton position="driver_front" label="DF" />
          <TireButton position="passenger_front" label="PF" />
        </Box>

        {/* Rear Tires */}
        <Box 
          sx={{ 
            display: 'flex', 
            gap: 2,
            justifyContent: 'center',
            width: '100%',
            position: 'relative',
          }}
        >
          <TireButton position="driver_rear_outer" label="DR" />
          {showDually && <TireButton position="driver_rear_inner" label="DRI" />}
          {showDually && <TireButton position="passenger_rear_inner" label="PRI" />}
          <TireButton position="passenger_rear_outer" label="PR" />
        </Box>

        {/* Spare */}
        <Box 
          sx={{ 
            mt: 1,
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '2px',
              height: '20px',
              bgcolor: 'divider',
            },
          }}
        >
          <TireButton position="spare" label="Spare" />
        </Box>
      </Box>

      <Modal
        open={modalOpen}
        onClose={handleClose}
        aria-labelledby="tire-repair-modal"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Paper
          sx={{
            p: 3,
            maxWidth: 700,
            width: '95%',
            maxHeight: '90vh',
            overflow: 'auto',
            mx: 2,
            borderRadius: 3,
            boxShadow: 6,
          }}
        >
          <Typography variant="h6" gutterBottom align="center" sx={{ mb: 3, fontWeight: 600 }}>
            {getTirePositionName(selectedTire || '')} - Tire Repair Assessment
          </Typography>
          
          {/* Current Status Indicator */}
          {selectedTire && (
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
              {tireStatuses[selectedTire as keyof typeof tireStatuses] === 'repairable' && (
                <Box sx={{ 
                  bgcolor: 'success.light', 
                  color: 'success.contrastText', 
                  px: 3, 
                  py: 1, 
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  boxShadow: 2,
                  border: '2px solid',
                  borderColor: 'success.main',
                }}>
                  <span style={{ fontSize: '18px' }}>✅</span>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    REPAIRABLE
                  </Typography>
                </Box>
              )}
              {tireStatuses[selectedTire as keyof typeof tireStatuses] === 'non_repairable' && (
                <Box sx={{ 
                  bgcolor: 'error.light', 
                  color: 'error.contrastText', 
                  px: 3, 
                  py: 1, 
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  boxShadow: 2,
                  border: '2px solid',
                  borderColor: 'error.main',
                }}>
                  <span style={{ fontSize: '18px' }}>❌</span>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    NON-REPAIRABLE
                  </Typography>
                </Box>
              )}
              {!tireStatuses[selectedTire as keyof typeof tireStatuses] && (
                <Box sx={{ 
                  bgcolor: 'grey.200', 
                  color: 'text.secondary', 
                  px: 3, 
                  py: 1, 
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  border: '2px dashed',
                  borderColor: 'grey.400',
                }}>
                  <span style={{ fontSize: '18px' }}>⏳</span>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    NO ASSESSMENT YET
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* Close Button */}
          <IconButton
            onClick={handleClose}
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              bgcolor: 'grey.100',
              '&:hover': {
                bgcolor: 'grey.200',
                transform: 'scale(1.1)',
              },
              transition: 'all 0.2s ease-in-out',
            }}
          >
            <CloseIcon />
          </IconButton>

          {/* Tread Depth Section */}
          {currentTreadData && onTreadChange && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
                📏 Tread Depth (32nds)
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                {parts.map((part, index) => (
                  <TextField
                    key={part}
                    inputRef={(el) => {
                      treadInputRefs.current[`${part}_depth`] = el;
                    }}
                    label={formatLabel(part)}
                    placeholder="8"
                    value={currentTreadData[`${part}_depth`] || ''}
                    type="tel"
                    size="small"
                    inputProps={{ 
                      inputMode: 'numeric', 
                      pattern: '[0-9]*',
                      style: { textAlign: 'center' },
                      maxLength: 1
                    }}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      handleTreadInputChange(`${part}_depth` as keyof TireTreadData, value);
                    }}
                    onKeyDown={(e) => {
                      // Handle backspace to go to previous field
                      if (e.key === 'Backspace' && !currentTreadData[`${part}_depth`]) {
                        const currentPartIndex = parts.findIndex(p => p === part);
                        const prevPartIndex = currentPartIndex - 1;
                        
                        if (prevPartIndex >= 0) {
                          const prevField = `${parts[prevPartIndex]}_depth`;
                          const prevInputRef = treadInputRefs.current[prevField];
                          if (prevInputRef) {
                            setTimeout(() => {
                              prevInputRef.focus();
                              prevInputRef.select();
                            }, 50);
                          }
                        }
                      }
                    }}
                    sx={{ width: 80, minWidth: 80 }}
                  />
                ))}
              </Box>

              {/* SVG Visualization */}
              {currentTreadData && (
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                  <TireTreadSideView
                    innerEdgeCondition={currentTreadData.inner_edge_condition}
                    innerCondition={currentTreadData.inner_condition}
                    centerCondition={currentTreadData.center_condition}
                    outerCondition={currentTreadData.outer_condition}
                    outerEdgeCondition={currentTreadData.outer_edge_condition}
                    innerEdgeDepth={parseInt(currentTreadData.inner_edge_depth) || 0}
                    innerDepth={parseInt(currentTreadData.inner_depth) || 0}
                    centerDepth={parseInt(currentTreadData.center_depth) || 0}
                    outerDepth={parseInt(currentTreadData.outer_depth) || 0}
                    outerEdgeDepth={parseInt(currentTreadData.outer_edge_depth) || 0}
                    width={250}
                    height={100}
                  />
                </Box>
              )}
            </Box>
          )}

          {/* Tire Date */}
          {onTireDateChange && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
                📅 Tire Date
              </Typography>
              <TextField
                label="Tire Date"
                placeholder="WW/YY"
                value={currentDate || ''}
                onChange={(e) => handleTireDateInputChange(e.target.value)}
                type="tel"
                size="small"
                inputProps={{
                  maxLength: 4,
                  pattern: '[0-9]*',
                  inputMode: 'numeric',
                  style: { textAlign: 'center' }
                }}
                sx={{ width: 120 }}
              />
            </Box>
          )}

          {/* Image Upload Sections */}
          {currentImages && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, color: 'primary.main', mb: 3 }}>
                📸 Tire Documentation Photos
              </Typography>
              {renderImageSection(
                "🚫 Not Repairable (Damage Photo)",
                'not_repairable',
                currentImages.not_repairable,
                uploadRef1,
                addMoreRef1
              )}
              {renderImageSection(
                "🏷️ Tire Size/Brand",
                'tire_size_brand',
                currentImages.tire_size_brand,
                uploadRef2,
                addMoreRef2
              )}
              {renderImageSection(
                "✅ Repairable Spot",
                'repairable_spot',
                currentImages.repairable_spot,
                uploadRef3,
                addMoreRef3
              )}
            </Box>
          )}

          <Divider sx={{ my: 3 }} />

          {/* Action Buttons */}
          <Typography variant="subtitle1" gutterBottom align="center" sx={{ fontWeight: 600, color: 'primary.main' }}>
            🔧 Repair Assessment
          </Typography>
          <Stack direction="row" spacing={2} sx={{ mt: 2, justifyContent: 'center', flexWrap: 'wrap', gap: 1 }}>
            <Button
              variant={selectedTire && tireStatuses[selectedTire as keyof typeof tireStatuses] === 'repairable' ? 'contained' : 'outlined'}
              color="success"
              onClick={() => handleStatusSelect('repairable')}
              startIcon={<span>✅</span>}
              size="large"
              sx={{ 
                minWidth: 120,
                borderRadius: 2,
                fontWeight: 600,
                position: 'relative',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 4,
                },
                transition: 'all 0.2s ease-in-out',
                ...(selectedTire && tireStatuses[selectedTire as keyof typeof tireStatuses] === 'repairable' && {
                  boxShadow: 4,
                  transform: 'scale(1.05)',
                  '&::after': {
                    content: '"✓"',
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    bgcolor: 'success.dark',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 'bold',
                  }
                })
              }}
            >
              Repairable
            </Button>
            <Button
              variant={selectedTire && tireStatuses[selectedTire as keyof typeof tireStatuses] === 'non_repairable' ? 'contained' : 'outlined'}
              color="error"
              onClick={() => handleStatusSelect('non_repairable')}
              startIcon={<span>❌</span>}
              size="large"
              sx={{ 
                minWidth: 120,
                borderRadius: 2,
                fontWeight: 600,
                position: 'relative',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 4,
                },
                transition: 'all 0.2s ease-in-out',
                ...(selectedTire && tireStatuses[selectedTire as keyof typeof tireStatuses] === 'non_repairable' && {
                  boxShadow: 4,
                  transform: 'scale(1.05)',
                  '&::after': {
                    content: '"✓"',
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    bgcolor: 'error.dark',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 'bold',
                  }
                })
              }}
            >
              Non-Repairable
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => handleStatusSelect(null)}
              startIcon={<span>🔄</span>}
              size="large"
              sx={{ 
                minWidth: 120,
                borderRadius: 2,
                fontWeight: 600,
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 2,
                },
                transition: 'all 0.2s ease-in-out',
              }}
            >
              Clear & Close
            </Button>
          </Stack>
        </Paper>
      </Modal>

      {/* Guided Modal */}
      <TireRepairGuidedModal
        open={guidedModalOpen}
        onClose={() => setGuidedModalOpen(false)}
        selectedTire={selectedTire}
        tireStatuses={tireStatuses}
        treadData={treadData}
        tireImages={tireImages}
        tireDates={tireDates}
        onTireStatusChange={onTireStatusChange}
        onTreadChange={onTreadChange}
        onTreadConditionChange={onTreadConditionChange}
        onTireImageUpload={onTireImageUpload}
        onTireImageDelete={onTireImageDelete}
        onTireDateChange={onTireDateChange}
      />
    </Paper>
  );
};

export default TireRepairLayout; 