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
  IconButton,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Chip,
  TextField,
  Divider,
} from '@mui/material';
import {
  Close as CloseIcon,
  ArrowForward as ArrowForwardIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  Delete as DeleteIcon,
  PhotoCamera as PhotoCameraIcon,
} from '@mui/icons-material';
import TireTreadSideView from './TireTreadSideView';
import { SafariImageUpload, SafariImageUploadRef } from './Image';
import { getFullImageUrl } from '../services/imageUpload';

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

interface TireRepairGuidedModalProps {
  open: boolean;
  onClose: () => void;
  selectedTire: string | null;
  tireStatuses: {
    driver_front: 'repairable' | 'non_repairable' | null;
    passenger_front?: 'repairable' | 'non_repairable' | null;
    driver_rear_outer: 'repairable' | 'non_repairable' | null;
    driver_rear_inner: 'repairable' | 'non_repairable' | null;
    passenger_rear_inner: 'repairable' | 'non_repairable' | null;
    passenger_rear_outer: 'repairable' | 'non_repairable' | null;
    spare: 'repairable' | 'non_repairable' | null;
  };
  treadData?: {
    [key: string]: TireTreadData;
  };
  tireImages?: {
    [key: string]: TireRepairImages;
  };
  tireDates?: {
    [key: string]: string;
  };
  onTireStatusChange: (position: string, status: 'repairable' | 'non_repairable' | null) => void;
  onTreadChange?: (position: string, field: keyof TireTreadData, value: string) => void;
  onTreadConditionChange?: (position: string, field: keyof TireTreadData, condition: 'green' | 'yellow' | 'red') => void;
  onTireImageUpload?: (position: string, imageType: 'not_repairable' | 'tire_size_brand' | 'repairable_spot', file: File) => void;
  onTireImageDelete?: (position: string, imageType: 'not_repairable' | 'tire_size_brand' | 'repairable_spot', index: number) => void;
  onTireDateChange?: (position: string, date: string) => void;
}

const TireRepairGuidedModal: React.FC<TireRepairGuidedModalProps> = ({
  open,
  onClose,
  selectedTire,
  tireStatuses,
  treadData = {},
  tireImages = {},
  tireDates = {},
  onTireStatusChange,
  onTreadChange,
  onTreadConditionChange,
  onTireImageUpload,
  onTireImageDelete,
  onTireDateChange,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [activeStep, setActiveStep] = useState(0);
  const [tempTreadData, setTempTreadData] = useState<TireTreadData>({
    inner_edge_depth: '',
    inner_depth: '',
    center_depth: '',
    outer_depth: '',
    outer_edge_depth: '',
    inner_edge_condition: 'green',
    inner_condition: 'green',
    center_condition: 'green',
    outer_condition: 'green',
    outer_edge_condition: 'green',
  });
  const [tempTireDate, setTempTireDate] = useState('');
  const [tempStatus, setTempStatus] = useState<'repairable' | 'non_repairable' | null>(null);

  // Refs for tread input fields
  const treadInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  
  // Ref for tire date input
  const tireDateInputRef = useRef<HTMLInputElement>(null);
  
  // Refs for image upload components
  const leakPhotoUploadRef = useRef<SafariImageUploadRef>(null);
  const tireModelUploadRef = useRef<SafariImageUploadRef>(null);
  
  // Ref to track if modal has been initialized
  const initializedRef = useRef(false);

  // Confirmation popup states
  const [showLeakPhotoConfirmation, setShowLeakPhotoConfirmation] = React.useState(false);
  const [showAdditionalLeakPhotoConfirmation, setShowAdditionalLeakPhotoConfirmation] = React.useState(false);
  const [showRepairAssessmentConfirmation, setShowRepairAssessmentConfirmation] = React.useState(false);
  const [showTireModelPhotoConfirmation, setShowTireModelPhotoConfirmation] = React.useState(false);
  
  // Auto-trigger camera when reaching step 3 (Tire Model and Size Photo)
  const [hasTriggeredStep3Camera, setHasTriggeredStep3Camera] = React.useState(false);
  const [cameraTriggerFailedStep3, setCameraTriggerFailedStep3] = React.useState(false);
  
  // Track when ref is set
  React.useEffect(() => {
    if (leakPhotoUploadRef.current) {
      console.log('📷 leakPhotoUploadRef is now available');
    }
  }, [leakPhotoUploadRef.current]);

  // Track when tireModelUploadRef is set
  React.useEffect(() => {
    if (tireModelUploadRef.current) {
      console.log('📷 tireModelUploadRef is now available');
    }
  }, [tireModelUploadRef.current]);
  

  
  // Debug: Log tire images when they change
  React.useEffect(() => {
    if (selectedTire && tireImages[selectedTire]) {
      console.log('🔍 Tire images updated for', selectedTire, ':', tireImages[selectedTire]);
    }
  }, [selectedTire, tireImages]);
  
  // Debug: Log when step 3 is active and tire images change
  React.useEffect(() => {
    if (activeStep === 3 && selectedTire && tireImages[selectedTire]) {
      console.log('🔍 Step 3 - Tire images for', selectedTire, ':', tireImages[selectedTire]);
      console.log('🔍 Step 3 - not_repairable images:', tireImages[selectedTire].not_repairable);
    }
  }, [activeStep, selectedTire, tireImages]);
  
  // Debug: Log when step 1 is active and tire images change
  React.useEffect(() => {
    if (activeStep === 1 && selectedTire && tireImages[selectedTire]) {
      console.log('🔍 Step 1 - Tire images for', selectedTire, ':', tireImages[selectedTire]);
      console.log('🔍 Step 1 - not_repairable images:', tireImages[selectedTire].not_repairable);
    }
  }, [activeStep, selectedTire, tireImages]);

  const steps = [
    {
      label: 'Tire Tread',
      description: 'Measure the tread depth at 5 points across the tire',
      icon: '📏',
    },
    {
      label: 'Take Photo of Leak',
      description: 'Take a photo of the tire leak',
      icon: '📸',
    },
    {
      label: 'Repair',
      description: 'Determine if the tire is repairable or not',
      icon: '🔧',
    },
    {
      label: 'Tire Model and Size Photo',
      description: 'Take a photo of the tire model and size information',
      icon: '📸',
    },
  ];

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

  const getConditionFromDepth = (depth: string): 'green' | 'yellow' | 'red' => {
    const numDepth = parseInt(depth) || 0;
    if (numDepth >= 6) return 'green';
    if (numDepth >= 4) return 'yellow';
    return 'red';
  };

  const handleTreadInputChange = (field: keyof TireTreadData, value: string) => {
    if (!selectedTire) return;

    // Only allow single digit for auto-advance
    const singleDigit = value.slice(-1);
    if (singleDigit && /^\d$/.test(singleDigit)) {
      setTempTreadData(prev => ({
        ...prev,
        [field]: singleDigit
      }));

      // Auto-update condition based on depth
      if (field.includes('depth')) {
        const conditionField = field.replace('_depth', '_condition') as keyof TireTreadData;
        const newCondition = getConditionFromDepth(singleDigit);
        setTempTreadData(prev => ({
          ...prev,
          [conditionField]: newCondition
        }));
        
        // Immediately save to main form
        if (onTreadChange) {
          onTreadChange(selectedTire, field, singleDigit);
        }
        if (onTreadConditionChange) {
          onTreadConditionChange(selectedTire, conditionField, newCondition);
        }
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
      } else if (field === 'inner_edge_depth') {
        // If this is the inner edge input (last input), focus the tire date input
        setTimeout(() => {
          if (tireDateInputRef.current) {
            tireDateInputRef.current.focus();
            tireDateInputRef.current.select();
          }
        }, 50);
      }
    } else if (value === '') {
      // Allow clearing the field
      setTempTreadData(prev => ({
        ...prev,
        [field]: ''
      }));
      if (field.includes('depth')) {
        const conditionField = field.replace('_depth', '_condition') as keyof TireTreadData;
        setTempTreadData(prev => ({
          ...prev,
          [conditionField]: 'green'
        }));
        
        // Immediately save to main form
        if (onTreadChange) {
          onTreadChange(selectedTire, field, '');
        }
        if (onTreadConditionChange) {
          onTreadConditionChange(selectedTire, conditionField, 'green');
        }
      }
    }
  };

  const handleNext = () => {
    console.log('handleNext called, activeStep:', activeStep, 'steps.length:', steps.length);
    
    if (activeStep === steps.length - 1) {
      // Final step - save all data
      if (selectedTire) {
        // Save tread data
        if (onTreadChange) {
          Object.keys(tempTreadData).forEach(key => {
            if (key.includes('depth')) {
              onTreadChange(selectedTire, key as keyof TireTreadData, tempTreadData[key as keyof TireTreadData]);
            }
          });
        }
        if (onTreadConditionChange) {
          Object.keys(tempTreadData).forEach(key => {
            if (key.includes('condition')) {
              onTreadConditionChange(selectedTire, key as keyof TireTreadData, tempTreadData[key as keyof TireTreadData] as 'green' | 'yellow' | 'red');
            }
          });
        }
        // Save tire date
        if (onTireDateChange && tempTireDate) {
          onTireDateChange(selectedTire, tempTireDate);
        }
        // Save status
        if (tempStatus !== null) {
          onTireStatusChange(selectedTire, tempStatus);
        }
      }
      onClose();
    } else if (activeStep === 3 && tempStatus === 'non_repairable') {
      // Step 3 is the final step for non-repairable tires
      console.log('Completing assessment for non-repairable tire');
      if (selectedTire) {
        // Save tread data
        if (onTreadChange) {
          Object.keys(tempTreadData).forEach(key => {
            if (key.includes('depth')) {
              onTreadChange(selectedTire, key as keyof TireTreadData, tempTreadData[key as keyof TireTreadData]);
            }
          });
        }
        if (onTreadConditionChange) {
          Object.keys(tempTreadData).forEach(key => {
            if (key.includes('condition')) {
              onTreadConditionChange(selectedTire, key as keyof TireTreadData, tempTreadData[key as keyof TireTreadData] as 'green' | 'yellow' | 'red');
            }
          });
        }
        // Save tire date
        if (onTireDateChange && tempTireDate) {
          onTireDateChange(selectedTire, tempTireDate);
        }
        // Save status
        onTireStatusChange(selectedTire, 'non_repairable');
      }
      onClose();
    } else {
      const nextStep = activeStep + 1;
      console.log('Advancing to step:', nextStep);
      setActiveStep(nextStep);
      
      // Show confirmation popup when moving from Tire Tread (step 0) to Take Photo (step 1)
      if (activeStep === 0 && nextStep === 1) {
        console.log('📸 Showing leak photo confirmation popup');
        setShowLeakPhotoConfirmation(true);
      }
    }
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
    setTempTreadData({
      inner_edge_depth: '',
      inner_depth: '',
      center_depth: '',
      outer_depth: '',
      outer_edge_depth: '',
      inner_edge_condition: 'green',
      inner_condition: 'green',
      center_condition: 'green',
      outer_condition: 'green',
      outer_edge_condition: 'green',
    });
    setTempTireDate('');
    setTempStatus(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // Initialize temp data when modal opens
  React.useEffect(() => {
    console.log('🔄 Modal initialization useEffect triggered', {
      open,
      selectedTire,
      treadDataKeys: Object.keys(treadData),
      tireDatesKeys: Object.keys(tireDates),
      tireStatusesKeys: Object.keys(tireStatuses)
    });
    
    if (open && selectedTire) {
      console.log('🔄 Initializing modal data for tire:', selectedTire);
      
      // Get the current tread data from the main form
      const currentTread = treadData[selectedTire];
      
      // If we have existing tread data, use it; otherwise use defaults
      const treadToUse = currentTread ? {
        inner_edge_depth: currentTread.inner_edge_depth || '',
        inner_depth: currentTread.inner_depth || '',
        center_depth: currentTread.center_depth || '',
        outer_depth: currentTread.outer_depth || '',
        outer_edge_depth: currentTread.outer_edge_depth || '',
        inner_edge_condition: (currentTread.inner_edge_condition as 'green' | 'yellow' | 'red') || 'green',
        inner_condition: (currentTread.inner_condition as 'green' | 'yellow' | 'red') || 'green',
        center_condition: (currentTread.center_condition as 'green' | 'yellow' | 'red') || 'green',
        outer_condition: (currentTread.outer_condition as 'green' | 'yellow' | 'red') || 'green',
        outer_edge_condition: (currentTread.outer_edge_condition as 'green' | 'yellow' | 'red') || 'green',
      } : {
        inner_edge_depth: '',
        inner_depth: '',
        center_depth: '',
        outer_depth: '',
        outer_edge_depth: '',
        inner_edge_condition: 'green' as const,
        inner_condition: 'green' as const,
        center_condition: 'green' as const,
        outer_condition: 'green' as const,
        outer_edge_condition: 'green' as const,
      };
      
      setTempTreadData(treadToUse);
      setTempTireDate(tireDates[selectedTire] || '');
      setTempStatus(tireStatuses[selectedTire as keyof typeof tireStatuses] || null);
      
      // Only reset step to 0 if this is the first time opening the modal
      // Use a ref to track if we've already initialized
      if (!initializedRef.current) {
        console.log('🔄 First time opening modal, resetting step to 0');
        setActiveStep(0);
        initializedRef.current = true;
      } else {
        console.log('🔄 Modal already initialized, keeping current step');
      }
    } else if (!open) {
      // Reset initialization flag when modal closes
      initializedRef.current = false;
    }
  }, [open, selectedTire, treadData, tireDates, tireStatuses]); // Removed tireImages to prevent reset on upload

  const parts = ['outer_edge', 'outer', 'center', 'inner', 'inner_edge'] as const;
  const formatLabel = (part: string) => {
    return part.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const renderStepContent = (stepIndex: number) => {
    console.log('renderStepContent called with stepIndex:', stepIndex);
    switch (stepIndex) {
      case 0: // Tread Measurement
        return (
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center', mb: 3 }}>
              {parts.map((part, index) => (
                <TextField
                  key={part}
                  inputRef={(el) => {
                    treadInputRefs.current[`${part}_depth`] = el;
                  }}
                  label={formatLabel(part)}
                  placeholder="8"
                  value={tempTreadData[`${part}_depth`] || ''}
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
                    if (e.key === 'Backspace' && !tempTreadData[`${part}_depth`]) {
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

            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
              <TireTreadSideView
                innerEdgeCondition={tempTreadData.inner_edge_condition}
                innerCondition={tempTreadData.inner_condition}
                centerCondition={tempTreadData.center_condition}
                outerCondition={tempTreadData.outer_condition}
                outerEdgeCondition={tempTreadData.outer_edge_condition}
                innerEdgeDepth={parseInt(tempTreadData.inner_edge_depth) || 0}
                innerDepth={parseInt(tempTreadData.inner_depth) || 0}
                centerDepth={parseInt(tempTreadData.center_depth) || 0}
                outerDepth={parseInt(tempTreadData.outer_depth) || 0}
                outerEdgeDepth={parseInt(tempTreadData.outer_edge_depth) || 0}
                width={250}
                height={100}
              />
            </Box>

            {/* Tire Date Field */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <TextField
                inputRef={tireDateInputRef}
                label="Tire Date"
                placeholder="WW/YY"
                value={tempTireDate}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                  if (value.length === 4) {
                    const week = value.slice(0, 2);
                    const year = value.slice(2, 4);
                    // Validate week is between 01-52
                    const weekNum = parseInt(week);
                    if (weekNum >= 1 && weekNum <= 52) {
                      const formatted = `${week.padStart(2, '0')}/${year}`;
                      setTempTireDate(formatted);
                      // Immediately save to main form
                      if (selectedTire && onTireDateChange) {
                        onTireDateChange(selectedTire, formatted);
                      }
                    } else {
                      // If invalid week, just store the raw input
                      setTempTireDate(value);
                      if (selectedTire && onTireDateChange) {
                        onTireDateChange(selectedTire, value);
                      }
                    }
                  } else {
                    setTempTireDate(value);
                    if (selectedTire && onTireDateChange) {
                      onTireDateChange(selectedTire, value);
                    }
                  }
                }}
                type="tel"
                inputProps={{
                  maxLength: 4,
                  pattern: '[0-9]*',
                  inputMode: 'numeric',
                  style: { textAlign: 'center' }
                }}
                InputLabelProps={{
                  style: { textAlign: 'center', width: '100%' }
                }}
                sx={{
                  width: '120px',
                  '& .MuiInputBase-input::placeholder': {
                    opacity: 1,
                    color: 'text.secondary'
                  }
                }}
              />
            </Box>
          </Box>
        );

      case 1: // Take Photo of Leak
        console.log('📸 Rendering step 2 - Take Photo of Leak');
        return (
          <Box sx={{ p: 2 }} data-step="1">
            <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', mb: 2 }}>
              📸 Take Photo of Leak
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
              Take a clear photo of the tire leak or damage.
            </Typography>
            
            {/* Display uploaded images */}
            {selectedTire && tireImages[selectedTire] && tireImages[selectedTire].not_repairable && tireImages[selectedTire].not_repairable.length > 0 && (
              <Box sx={{ mb: 3 }} key={`leak-photos-${tireImages[selectedTire].not_repairable.length}`}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                  Uploaded Photos ({tireImages[selectedTire].not_repairable.length})
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {tireImages[selectedTire].not_repairable.map((image, index) => (
                    <Box
                      key={`leak-${index}-${image.url}`}
                      sx={{
                        position: 'relative',
                        width: '100%',
                        borderRadius: 2,
                        overflow: 'hidden',
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <img
                        src={image.url ? getFullImageUrl(image.url) : ''}
                        alt={`Leak photo ${index + 1}`}
                        style={{
                          width: '100%',
                          height: 'auto',
                          maxHeight: '300px',
                          objectFit: 'contain',
                          display: 'block',
                          margin: '0 auto',
                        }}
                      />
                      {onTireImageDelete && (
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
                          onClick={() => onTireImageDelete(selectedTire, 'not_repairable', index)}
                        >
                          <DeleteIcon sx={{ fontSize: 20 }} />
                        </IconButton>
                      )}
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
            
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              {selectedTire && onTireImageUpload && (
                <SafariImageUpload
                  ref={leakPhotoUploadRef}
                  onImageUpload={async (file: File) => {
                    console.log('📸 Leak photo upload triggered:', file.name);
                    console.log('📸 File details:', {
                      name: file.name,
                      size: file.size,
                      type: file.type,
                      lastModified: file.lastModified
                    });
                    console.log('📸 Selected tire:', selectedTire);
                    console.log('📸 Image type: not_repairable');
                    if (onTireImageUpload) {
                      console.log('📸 Calling onTireImageUpload with:', selectedTire, 'not_repairable', file.name);
                      await onTireImageUpload(selectedTire, 'not_repairable', file);
                      console.log('📸 Leak photo upload completed');
                      
                      // Show additional photo confirmation after upload
                      setTimeout(() => {
                        setShowAdditionalLeakPhotoConfirmation(true);
                      }, 500);
                    } else {
                      console.log('📸 onTireImageUpload is not available');
                    }
                  }}
                  uploadType="tire_repair_leak_photo"
                  disabled={false}
                  multiple={false}
                  size="large"
                  allowProgrammaticTrigger={true}
                  cameraFacing="environment"
                />
              )}
            </Box>
          </Box>
        );

      case 2: // Repair Assessment
        return (
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', mb: 2 }}>
              🔧 Repair Assessment
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
              Based on the tread measurements and visual inspection, determine if this tire is repairable.
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
              <Button
                variant={tempStatus === 'repairable' ? 'contained' : 'outlined'}
                color="success"
                size="large"
                onClick={() => {
                  setTempStatus('repairable');
                  // Complete assessment for repairable tires
                  if (selectedTire) {
                    if (onTreadChange) {
                      Object.keys(tempTreadData).forEach(key => {
                        if (key.includes('depth')) {
                          onTreadChange(selectedTire, key as keyof TireTreadData, tempTreadData[key as keyof TireTreadData]);
                        }
                      });
                    }
                    if (onTreadConditionChange) {
                      Object.keys(tempTreadData).forEach(key => {
                        if (key.includes('condition')) {
                          onTreadConditionChange(selectedTire, key as keyof TireTreadData, tempTreadData[key as keyof TireTreadData] as 'green' | 'yellow' | 'red');
                        }
                      });
                    }
                    onTireStatusChange(selectedTire, 'repairable');
                  }
                  onClose();
                }}
                startIcon={tempStatus === 'repairable' ? <CheckCircleIcon /> : <RadioButtonUncheckedIcon />}
                sx={{ 
                  minWidth: 200,
                  py: 2,
                  fontSize: '1.1rem',
                  fontWeight: 'bold'
                }}
              >
                ✅ REPAIRABLE
              </Button>
              
              <Button
                variant={tempStatus === 'non_repairable' ? 'contained' : 'outlined'}
                color="error"
                size="large"
                onClick={() => {
                  setTempStatus('non_repairable');
                  // Show tire model photo confirmation for non-repairable tires
                  setShowTireModelPhotoConfirmation(true);
                }}
                startIcon={tempStatus === 'non_repairable' ? <CheckCircleIcon /> : <RadioButtonUncheckedIcon />}
                sx={{ 
                  minWidth: 200,
                  py: 2,
                  fontSize: '1.1rem',
                  fontWeight: 'bold'
                }}
              >
                ❌ NON-REPAIRABLE
              </Button>
            </Box>
          </Box>
        );

      case 3: // Tire Model and Size Photo (only for non-repairable)
        console.log('📸 Rendering step 4 - Tire Model and Size Photo');
        return (
          <Box sx={{ p: 2 }} data-step="3">
            <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', mb: 2 }}>
              📸 Tire Model and Size Photo
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
              Take a photo of the tire model and size information for documentation.
            </Typography>
            
            {/* Display uploaded images */}
            {selectedTire && tireImages[selectedTire] && tireImages[selectedTire].tire_size_brand && tireImages[selectedTire].tire_size_brand.length > 0 && (
              <Box sx={{ mb: 3 }} key={`model-photos-${tireImages[selectedTire].tire_size_brand.length}`}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                  Uploaded Photos ({tireImages[selectedTire].tire_size_brand.length})
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {tireImages[selectedTire].tire_size_brand.map((image, index) => (
                    <Box
                      key={`model-${index}-${image.url}`}
                      sx={{
                        position: 'relative',
                        width: '100%',
                        borderRadius: 2,
                        overflow: 'hidden',
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <img
                        src={image.url ? getFullImageUrl(image.url) : ''}
                        alt={`Tire model photo ${index + 1}`}
                        style={{
                          width: '100%',
                          height: 'auto',
                          maxHeight: '300px',
                          objectFit: 'contain',
                          display: 'block',
                          margin: '0 auto',
                        }}
                      />
                      {onTireImageDelete && (
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
                          onClick={() => onTireImageDelete(selectedTire, 'tire_size_brand', index)}
                        >
                          <DeleteIcon sx={{ fontSize: 20 }} />
                        </IconButton>
                      )}
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
            
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              {selectedTire && onTireImageUpload && (
                <SafariImageUpload
                  ref={tireModelUploadRef}
                  onImageUpload={async (file: File) => {
                    console.log('📸 Tire model image upload triggered:', file.name);
                    console.log('📸 File details:', {
                      name: file.name,
                      size: file.size,
                      type: file.type,
                      lastModified: file.lastModified
                    });
                    console.log('📸 Selected tire:', selectedTire);
                    console.log('📸 Image type: tire_size_brand');
                    if (onTireImageUpload) {
                      console.log('📸 Calling onTireImageUpload with:', selectedTire, 'tire_size_brand', file.name);
                      await onTireImageUpload(selectedTire, 'tire_size_brand', file);
                      console.log('📸 Tire model image upload completed');
                      
                      // Complete assessment for non-repairable tires after photo
                      if (selectedTire) {
                        if (onTreadChange) {
                          Object.keys(tempTreadData).forEach(key => {
                            if (key.includes('depth')) {
                              onTreadChange(selectedTire, key as keyof TireTreadData, tempTreadData[key as keyof TireTreadData]);
                            }
                          });
                        }
                        if (onTreadConditionChange) {
                          Object.keys(tempTreadData).forEach(key => {
                            if (key.includes('condition')) {
                              onTreadConditionChange(selectedTire, key as keyof TireTreadData, tempTreadData[key as keyof TireTreadData] as 'green' | 'yellow' | 'red');
                            }
                          });
                        }
                        onTireStatusChange(selectedTire, 'non_repairable');
                      }
                      onClose();
                    } else {
                      console.log('📸 onTireImageUpload is not available');
                    }
                  }}
                  uploadType="tire_repair_model_size"
                  disabled={false}
                  multiple={false}
                  size="large"
                  allowProgrammaticTrigger={true}
                  cameraFacing="environment"
                />
              )}
            </Box>
          </Box>
        );



      default:
        return null;
    }
  };

  return (
    <>
      {/* Leak Photo Confirmation Popup */}
      <Modal
        open={showLeakPhotoConfirmation}
        onClose={() => setShowLeakPhotoConfirmation(false)}
        aria-labelledby="leak-photo-confirmation-modal"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
        }}
      >
        <Paper
          sx={{
            width: '100%',
            maxWidth: 400,
            p: 3,
            textAlign: 'center',
          }}
        >
          <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', mb: 2 }}>
            📸 Tire Leak Image
          </Typography>
          <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
            Take a photo of the tire leak or damage for documentation.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="outlined"
              onClick={() => setShowLeakPhotoConfirmation(false)}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                setShowLeakPhotoConfirmation(false);
                // Trigger camera after popup closes
                setTimeout(() => {
                  if (leakPhotoUploadRef.current) {
                    console.log('📸 Triggering camera via leakPhotoUploadRef from confirmation popup');
                    leakPhotoUploadRef.current.handleCameraClick();
                  } else {
                    console.log('📸 leakPhotoUploadRef not available yet');
                  }
                }, 100);
              }}
              startIcon={<PhotoCameraIcon />}
            >
              Take Photo
            </Button>
          </Box>
        </Paper>
      </Modal>

      {/* Additional Leak Photo Confirmation Popup */}
      <Modal
        open={showAdditionalLeakPhotoConfirmation}
        onClose={() => setShowAdditionalLeakPhotoConfirmation(false)}
        aria-labelledby="additional-leak-photo-confirmation-modal"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
        }}
      >
        <Paper
          sx={{
            width: '100%',
            maxWidth: 400,
            p: 3,
            textAlign: 'center',
          }}
        >
          <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', mb: 2 }}>
            📸 Additional Leak/Damage Images
          </Typography>
          <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
            Would you like to take additional photos of the leak or damage?
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="outlined"
              onClick={() => setShowAdditionalLeakPhotoConfirmation(false)}
            >
              Cancel
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                setShowAdditionalLeakPhotoConfirmation(false);
                // Show repair assessment confirmation
                setTimeout(() => {
                  setShowRepairAssessmentConfirmation(true);
                }, 100);
              }}
            >
              Next
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                setShowAdditionalLeakPhotoConfirmation(false);
                // Trigger camera after popup closes
                setTimeout(() => {
                  if (leakPhotoUploadRef.current) {
                    console.log('📸 Triggering camera via leakPhotoUploadRef from additional confirmation popup');
                    leakPhotoUploadRef.current.handleCameraClick();
                  } else {
                    console.log('📸 leakPhotoUploadRef not available yet');
                  }
                }, 100);
              }}
              startIcon={<PhotoCameraIcon />}
            >
              Take Photo
            </Button>
          </Box>
        </Paper>
      </Modal>

      {/* Repair Assessment Confirmation Popup */}
      <Modal
        open={showRepairAssessmentConfirmation}
        onClose={() => setShowRepairAssessmentConfirmation(false)}
        aria-labelledby="repair-assessment-confirmation-modal"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
        }}
      >
        <Paper
          sx={{
            width: '100%',
            maxWidth: 400,
            p: 3,
            textAlign: 'center',
          }}
        >
          <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', mb: 2 }}>
            🔧 Repair Assessment
          </Typography>
          <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
            Based on the tread measurements and visual inspection, determine if this tire is repairable.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="outlined"
              onClick={() => setShowRepairAssessmentConfirmation(false)}
            >
              Cancel
            </Button>
            <Button
              variant="outlined"
              color="success"
              onClick={() => {
                setShowRepairAssessmentConfirmation(false);
                setTempStatus('repairable');
                // Complete assessment for repairable tires
                if (selectedTire) {
                  if (onTreadChange) {
                    Object.keys(tempTreadData).forEach(key => {
                      if (key.includes('depth')) {
                        onTreadChange(selectedTire, key as keyof TireTreadData, tempTreadData[key as keyof TireTreadData]);
                      }
                    });
                  }
                  if (onTreadConditionChange) {
                    Object.keys(tempTreadData).forEach(key => {
                      if (key.includes('condition')) {
                        onTreadConditionChange(selectedTire, key as keyof TireTreadData, tempTreadData[key as keyof TireTreadData] as 'green' | 'yellow' | 'red');
                      }
                    });
                  }
                  onTireStatusChange(selectedTire, 'repairable');
                }
                onClose();
              }}
              startIcon={<CheckCircleIcon />}
            >
              ✅ REPAIRABLE
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={() => {
                setShowRepairAssessmentConfirmation(false);
                setTempStatus('non_repairable');
                // Show tire model photo confirmation for non-repairable tires
                setTimeout(() => {
                  setShowTireModelPhotoConfirmation(true);
                }, 100);
              }}
              startIcon={<RadioButtonUncheckedIcon />}
            >
              ❌ NON-REPAIRABLE
            </Button>
          </Box>
        </Paper>
      </Modal>

      {/* Tire Model Photo Confirmation Popup */}
      <Modal
        open={showTireModelPhotoConfirmation}
        onClose={() => setShowTireModelPhotoConfirmation(false)}
        aria-labelledby="tire-model-photo-confirmation-modal"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
        }}
      >
        <Paper
          sx={{
            width: '100%',
            maxWidth: 400,
            p: 3,
            textAlign: 'center',
          }}
        >
          <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', mb: 2 }}>
            📸 Tire Model and Size Photo
          </Typography>
          <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
            Take a photo of the tire model and size information for documentation.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="outlined"
              onClick={() => setShowTireModelPhotoConfirmation(false)}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                setShowTireModelPhotoConfirmation(false);
                // Advance to step 3 and trigger camera
                setActiveStep(3);
                setTimeout(() => {
                  if (tireModelUploadRef.current) {
                    console.log('📸 Triggering camera via tireModelUploadRef from confirmation popup');
                    tireModelUploadRef.current.handleCameraClick();
                  } else {
                    console.log('📸 tireModelUploadRef not available yet');
                  }
                }, 100);
              }}
              startIcon={<PhotoCameraIcon />}
            >
              Take Photo
            </Button>
          </Box>
        </Paper>
      </Modal>

      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="tire-repair-guided-modal"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
        }}
        disableScrollLock={false}
      >
      <Paper
        sx={{
          width: '90vw',
          maxWidth: '90vw',
          height: '90vh',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Fixed Header */}
        <Box sx={{ 
          p: 3, 
          borderBottom: 1, 
          borderColor: 'divider', 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 2,
          backgroundColor: 'background.paper'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold' }}>
              {selectedTire ? `Tire Repair Assessment - ${getTirePositionName(selectedTire)}` : 'Tire Repair Assessment'}
            </Typography>
            <IconButton onClick={handleClose}>
              <CloseIcon />
            </IconButton>
          </Box>
          
          {/* Stepper */}
          <Stepper activeStep={activeStep} orientation={isMobile ? 'vertical' : 'horizontal'}>
            {steps.map((step, index) => (
              <Step key={step.label}>
                <StepLabel
                  icon={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <span>{step.icon}</span>
                      {!isMobile && <span>{step.label}</span>}
                    </Box>
                  }
                >
                  {isMobile && step.label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        {/* Fixed Navigation at Bottom */}
        <Box sx={{ 
          p: 3, 
          borderTop: 1, 
          borderColor: 'divider',
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 2,
          backgroundColor: 'background.paper',
          display: 'flex',
          justifyContent: 'space-between'
        }}>
          <Button
            disabled={activeStep === 0}
            onClick={handleBack}
            startIcon={<ArrowBackIcon />}
            sx={{ minWidth: 80 }}
          >
            Back
          </Button>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              onClick={handleReset}
              sx={{ minWidth: 80 }}
            >
              Reset
            </Button>
            <Button
              variant="contained"
              onClick={handleNext}
              endIcon={activeStep === steps.length - 1 ? undefined : <ArrowForwardIcon />}
              sx={{ minWidth: 80 }}
            >
              {activeStep === steps.length - 1 ? 'Complete Assessment' : 
               activeStep === 2 && tempStatus === 'non_repairable' ? 'Take Photo' : 
               activeStep === 3 && tempStatus === 'non_repairable' ? 'Complete Assessment' : 'Next'}
            </Button>
          </Box>
        </Box>

        {/* Scrollable Content Area */}
        <Box 
          onScroll={(e) => {
            e.stopPropagation();
            console.log('📜 Popup content scrolling');
          }}
          sx={{ 
            position: 'absolute',
            top: '200px', // Fixed distance from top for header
            left: 0,
            right: 0,
            bottom: '80px', // Fixed distance from bottom for navigation
            overflow: 'auto',
            px: 3,
            borderBottom: '1px solid',
            borderColor: 'divider',
            backgroundColor: 'background.paper',
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: '#f1f1f1',
            },
            '&::-webkit-scrollbar-thumb': {
              background: '#888',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: '#555',
            }
          }}
        >
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            Current Step: {activeStep + 1} of {steps.length}
          </Typography>
          {renderStepContent(activeStep)}
        </Box>
      </Paper>
      </Modal>
    </>
  );
};

export default TireRepairGuidedModal; 