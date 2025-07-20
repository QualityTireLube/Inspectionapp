import React, { useState } from 'react';
import {
  Typography,
  TextField,
  Button,
  Box,
  FormControl,
  FormLabel,
  Stack,
  Chip,
  IconButton,
  InputAdornment,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  QrCodeScanner as QrCodeScannerIcon,
  Close as CloseIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import Grid from '../../CustomGrid';
import {
  QuickCheckForm,
  ImageUpload,
  StateInspectionStatus,
  WasherFluidCondition,
  EngineAirFilterCondition,
  BatteryCondition,
  BatteryTerminalCondition,
  PhotoType
} from '../../../types/quickCheck';
import NotesField from './NotesField';
import { ImageFieldDisplay, SafariImageUpload, ImageFieldRectangle } from '../../Image';
import { VinDecoder } from '../VinDecoder';
import { getFullImageUrl } from '../../../services/imageUpload';

interface UnderhoodTabProps {
  form: QuickCheckForm;
  loading: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRadioChange: (name: string, value: string) => void;
  onImageUpload: (file: File, type: PhotoType) => Promise<void>;
  onImageClick: (photos: ImageUpload[], photoType?: string) => void;
  onInfoClick: (event: React.MouseEvent<HTMLElement>, content: string) => void;
  onScannerOpen: () => void;
  onFormUpdate: (updates: Partial<QuickCheckForm>) => void;
  onBatteryConditionToggle: (condition: BatteryCondition) => void;
  onBatteryConditionChange: (type: 'main' | 'terminals', value: string) => void;
  onBatteryTerminalsToggle: (condition: BatteryTerminalCondition) => void;
  onVehicleDetailsOpen: () => void;
  onFieldNotesChange: (fieldName: string, noteText: string) => void;
  onDeleteImage: (photoType: string, index: number) => void;
  vinDecodeLoading: boolean;
  vinDecodeError: string | null;
  vehicleDetails: any;
}

export const UnderhoodTab: React.FC<UnderhoodTabProps> = ({
  form,
  loading,
  onChange,
  onRadioChange,
  onImageUpload,
  onImageClick,
  onInfoClick,
  onScannerOpen,
  onFormUpdate,
  onBatteryConditionToggle,
  onBatteryConditionChange,
  onBatteryTerminalsToggle,
  onVehicleDetailsOpen,
  onFieldNotesChange,
  onDeleteImage,
  vinDecodeLoading,
  vinDecodeError,
  vehicleDetails
}) => {
  const [terminalDamageDialogOpen, setTerminalDamageDialogOpen] = useState(false);
  
  // Helper function to get display URL for images
  const getDisplayUrl = (photo: ImageUpload): string => {
    if (photo.url?.startsWith('blob:')) {
      return photo.url;
    }
    return photo.url ? getFullImageUrl(photo.url) : URL.createObjectURL(photo.file);
  };

  const handleTerminalDamageClick = () => {
    onBatteryTerminalsToggle('terminal_damaged');
    setTerminalDamageDialogOpen(true);
  };

  const handleTerminalDamageLocationToggle = (location: 'positive' | 'negative') => {
    try {
      // Ensure we always work with an array
      const currentLocations = Array.isArray(form.battery_terminal_damage_location) 
        ? form.battery_terminal_damage_location 
        : [];
      
      // Toggle the location in the array
      const isSelected = currentLocations.includes(location);
      const newLocations = isSelected 
        ? currentLocations.filter(l => l !== location)
        : [...currentLocations, location];
      
      onFormUpdate({ battery_terminal_damage_location: newLocations });
    } catch (error) {
      console.error('Error toggling terminal damage location:', error);
      // Fallback: just set the single location
      onFormUpdate({ battery_terminal_damage_location: [location] });
    }
  };

  const handleTerminalDamageDialogClose = () => {
    setTerminalDamageDialogOpen(false);
  };
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <VinDecoder
          vin={form.vin}
          onVinChange={onChange}
          required={true}
          disabled={loading}
        />
      </Box>

      {/* TPMS Placard */}
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="body1" sx={{ flexGrow: 1 }}>
            TPMS Placard
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, marginLeft: 'auto' }}>
            <SafariImageUpload
              onImageUpload={onImageUpload}
              uploadType="tpms_placard"
              disabled={loading}
              multiple={true}
              size="small"
            />
            <NotesField
              fieldName="tpms_placard"
              fieldLabel="TPMS Placard"
              notes={form.field_notes}
              onNotesChange={onFieldNotesChange}
            />
            <IconButton
              size="small"
              onClick={(e) => onInfoClick(e, "Take a photo of the TPMS placard showing recommended tire pressures - usually located on the driver's side door jamb or glove compartment.")}
            >
              <InfoIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
        
        <ImageFieldRectangle
          label=""
          images={form.tpms_placard
            .filter(photo => photo && !photo.isDeleted)
            .map(photo => getDisplayUrl(photo))
            .filter(url => url && url.length > 0)}
          onImageUpload={onImageUpload}
          onImageRemove={(index) => onFormUpdate({
            tpms_placard: form.tpms_placard.filter((_, i) => i !== index)
          })}
          onImageView={(imageUrl) => onImageClick(form.tpms_placard, 'tpms_placard')}
          uploadType="tpms_placard"
          disabled={loading}
          multiple={true}
          maxFiles={5}
        />
      </Box>

      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
            State Inspection Status
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, marginLeft: 'auto' }}>
            <SafariImageUpload
              onImageUpload={onImageUpload}
              uploadType="state_inspection_status"
              disabled={loading}
              multiple={true}
              size="small"
            />
            <NotesField
              fieldName="state_inspection_status"
              fieldLabel="State Inspection Status"
              notes={form.field_notes}
              onNotesChange={onFieldNotesChange}
            />
            <IconButton
              size="small"
              onClick={(e) => onInfoClick(e, "Check state inspection status and enter date if applicable. Format: MM/YY (e.g., 12/25 for December 2025)")}
            >
              <InfoIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              size="small"
              label="State Inspection Date"
              placeholder="MM/YY"
              value={form.state_inspection_date_code || ''}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                if (value.length === 4) {
                  const month = value.slice(0, 2);
                  const year = value.slice(2, 4);
                  const formatted = `${month}/${year}`;
                  onFormUpdate({ state_inspection_date_code: formatted });
                } else {
                  onFormUpdate({ state_inspection_date_code: value });
                }
              }}
              inputProps={{
                maxLength: 4,
                pattern: '[0-9]*',
                inputMode: 'numeric',
                style: { textAlign: 'center' }
              }}
              sx={{
                width: '120px',
                '& .MuiInputBase-input::placeholder': {
                  opacity: 1,
                  color: 'text.secondary'
                },
                '& .MuiOutlinedInput-root': {
                  backgroundColor: (() => {
                    if (form.state_inspection_status === 'no_sticker') return '#f5f5f5';
                    if (form.state_inspection_date_code && form.state_inspection_date_code.length === 5) {
                      const [month, year] = form.state_inspection_date_code.split('/');
                      const inspectionDate = new Date(2000 + parseInt(year), parseInt(month) - 1, 1);
                      const currentDate = new Date();
                      const isExpired = inspectionDate < currentDate;
                      return isExpired ? '#ffebee' : '#e8f5e8';
                    }
                    return 'transparent';
                  })(),
                  '&:hover': {
                    backgroundColor: (() => {
                      if (form.state_inspection_status === 'no_sticker') return '#f0f0f0';
                      if (form.state_inspection_date_code && form.state_inspection_date_code.length === 5) {
                        const [month, year] = form.state_inspection_date_code.split('/');
                        const inspectionDate = new Date(2000 + parseInt(year), parseInt(month) - 1, 1);
                        const currentDate = new Date();
                        const isExpired = inspectionDate < currentDate;
                        return isExpired ? '#ffcdd2' : '#c8e6c9';
                      }
                      return 'rgba(0, 0, 0, 0.04)';
                    })()
                  }
                }
              }}
              disabled={form.state_inspection_status === 'no_sticker'}
            />
          </Box>
          
          <Chip
            label="❌ No Sticker"
            color="error"
            variant={form.state_inspection_status === 'no_sticker' ? 'filled' : 'outlined'}
            clickable
            onClick={() => {
              // Toggle the "No Sticker" selection - if already selected, deselect it
              if (form.state_inspection_status === 'no_sticker') {
                onRadioChange('state_inspection_status', '');
              } else {
                onRadioChange('state_inspection_status', 'no_sticker');
              }
            }}
            sx={{ fontWeight: form.state_inspection_status === 'no_sticker' ? 'bold' : 'normal' }}
          />
        </Box>
        
        {/* State Inspection Status Photos Display */}
        {form.state_inspection_status_photos.length > 0 && (
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', 
            gap: 2,
            mt: 2 
          }}>
            {form.state_inspection_status_photos.map((photo, index) => (
              <Box
                key={index}
                sx={{
                  position: 'relative',
                  aspectRatio: '1',
                  borderRadius: 1,
                  overflow: 'hidden',
                  border: '1px solid #ddd',
                  cursor: 'pointer',
                  '&:hover .delete-button': {
                    opacity: 1
                  }
                }}
              >
                <img
                  src={getDisplayUrl(photo)}
                  alt={`State Inspection Status ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                  onClick={() => onImageClick(form.state_inspection_status_photos, 'state_inspection_status_photos')}
                />
                <IconButton
                  className="delete-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteImage('state_inspection_status_photos', index);
                  }}
                  sx={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    bgcolor: 'rgba(0,0,0,0.7)',
                    color: 'white',
                    opacity: 0,
                    transition: 'opacity 0.2s',
                    '&:hover': {
                      bgcolor: 'rgba(0,0,0,0.9)',
                    },
                    padding: '4px',
                  }}
                  size="small"
                >
                  <CloseIcon sx={{ fontSize: '16px' }} />
                </IconButton>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
            Washer Fluid
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, marginLeft: 'auto' }}>
            <SafariImageUpload
              onImageUpload={onImageUpload}
              uploadType="washer_fluid"
              disabled={loading}
              multiple={true}
              size="small"
            />
            <NotesField
              fieldName="washer_fluid"
              fieldLabel="Washer Fluid"
              notes={form.field_notes}
              onNotesChange={onFieldNotesChange}
            />
            <IconButton
              size="small"
              onClick={(e) => onInfoClick(e, "Check washer fluid level and test washer functionality. Note any leaks or pump issues.")}
            >
              <InfoIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
        <Stack 
          direction="row" 
          spacing={1} 
          sx={{ 
            mt: 1,
            flexWrap: 'wrap',
            gap: 1,
            '& .MuiChip-root': {
              mb: 1
            }
          }}
        >
          <Chip
            label="✅ Full"
            color="success"
            variant={form.washer_fluid === 'full' ? 'filled' : 'outlined'}
            clickable
            onClick={() => onRadioChange('washer_fluid', 'full')}
            sx={{ fontWeight: form.washer_fluid === 'full' ? 'bold' : 'normal' }}
          />
          <Chip
            label="❌ Leaking"
            color="error"
            variant={form.washer_fluid === 'leaking' ? 'filled' : 'outlined'}
            clickable
            onClick={() => onRadioChange('washer_fluid', 'leaking')}
            sx={{ fontWeight: form.washer_fluid === 'leaking' ? 'bold' : 'normal' }}
          />
          <Chip
            label="❌ Not Working"
            color="error"
            variant={form.washer_fluid === 'not_working' ? 'filled' : 'outlined'}
            clickable
            onClick={() => onRadioChange('washer_fluid', 'not_working')}
            sx={{ fontWeight: form.washer_fluid === 'not_working' ? 'bold' : 'normal' }}
          />
          <Chip
            label="❌ No Pump Sound"
            color="error"
            variant={form.washer_fluid === 'no_pump_sound' ? 'filled' : 'outlined'}
            clickable
            onClick={() => onRadioChange('washer_fluid', 'no_pump_sound')}
            sx={{ fontWeight: form.washer_fluid === 'no_pump_sound' ? 'bold' : 'normal' }}
          />
        </Stack>
        
        {form.washer_fluid_photo.length > 0 && (
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', 
            gap: 1,
            maxWidth: '300px'
          }}>
            {form.washer_fluid_photo.map((photo, index) => (
              <Box
                key={index}
                sx={{
                  position: 'relative',
                  aspectRatio: '1',
                  borderRadius: 1,
                  overflow: 'hidden',
                  border: '1px solid #ddd',
                  cursor: 'pointer',
                  '&:hover .delete-button': {
                    opacity: 1
                  }
                }}
              >
                <img
                  src={getDisplayUrl(photo)}
                  alt={`Washer Fluid ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                  onClick={() => onImageClick(form.washer_fluid_photo, 'washer_fluid_photo')}
                />
                <IconButton
                  className="delete-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFormUpdate({
                      washer_fluid_photo: form.washer_fluid_photo.filter((_, i) => i !== index)
                    });
                  }}
                  sx={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    bgcolor: 'rgba(0,0,0,0.7)',
                    color: 'white',
                    opacity: 0,
                    transition: 'opacity 0.2s',
                    '&:hover': {
                      bgcolor: 'rgba(0,0,0,0.9)',
                    },
                    padding: '2px',
                  }}
                  size="small"
                >
                  <CloseIcon sx={{ fontSize: '12px' }} />
                </IconButton>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
            Engine Air Filter
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, marginLeft: 'auto' }}>
            <SafariImageUpload
              onImageUpload={onImageUpload}
              uploadType="engine_air_filter"
              disabled={loading}
              size="small"
            />
            <NotesField
              fieldName="engine_air_filter"
              fieldLabel="Engine Air Filter"
              notes={form.field_notes}
              onNotesChange={onFieldNotesChange}
            />
            <IconButton
              size="small"
              onClick={(e) => onInfoClick(e, "Inspect the engine air filter for dirt, debris, or damage. Consider replacement recommendations based on condition.")}
            >
              <InfoIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
        <Stack 
          direction="row" 
          spacing={1} 
          sx={{ 
            mt: 1,
            flexWrap: 'wrap',
            gap: 1,
            '& .MuiChip-root': {
              mb: 1
            }
          }}
        >
          <Chip
            label="✅ Good"
            color="success"
            variant={form.engine_air_filter === 'good' ? 'filled' : 'outlined'}
            clickable
            onClick={() => onRadioChange('engine_air_filter', 'good')}
            sx={{ fontWeight: form.engine_air_filter === 'good' ? 'bold' : 'normal' }}
          />
          <Chip
            label="⚠️ Next Oil Change"
            color="warning"
            variant={form.engine_air_filter === 'next_oil_change' ? 'filled' : 'outlined'}
            clickable
            onClick={() => onRadioChange('engine_air_filter', 'next_oil_change')}
            sx={{ fontWeight: form.engine_air_filter === 'next_oil_change' ? 'bold' : 'normal' }}
          />
          <Chip
            label="❌ Highly Recommended"
            color="warning"
            variant={form.engine_air_filter === 'highly_recommended' ? 'filled' : 'outlined'}
            clickable
            onClick={() => onRadioChange('engine_air_filter', 'highly_recommended')}
            sx={{ fontWeight: form.engine_air_filter === 'highly_recommended' ? 'bold' : 'normal' }}
          />
          <Chip
            label="🚨 Today"
            color="error"
            variant={form.engine_air_filter === 'today' ? 'filled' : 'outlined'}
            clickable
            onClick={() => onRadioChange('engine_air_filter', 'today')}
            sx={{ fontWeight: form.engine_air_filter === 'today' ? 'bold' : 'normal' }}
          />
          <Chip
            label="🐀 Animal Related"
            color="error"
            variant={form.engine_air_filter === 'animal_related' ? 'filled' : 'outlined'}
            clickable
            onClick={() => onRadioChange('engine_air_filter', 'animal_related')}
            sx={{ fontWeight: form.engine_air_filter === 'animal_related' ? 'bold' : 'normal' }}
          />
        </Stack>
        
        {form.engine_air_filter_photo.length > 0 && (
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', 
            gap: 1,
            maxWidth: '300px'
          }}>
            {form.engine_air_filter_photo.map((photo, index) => (
              <Box
                key={index}
                sx={{
                  position: 'relative',
                  aspectRatio: '1',
                  borderRadius: 1,
                  overflow: 'hidden',
                  border: '1px solid #ddd',
                  cursor: 'pointer',
                  '&:hover .delete-button': {
                    opacity: 1
                  }
                }}
              >
                <img
                  src={getDisplayUrl(photo)}
                  alt={`Engine Air Filter ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                  onClick={() => onImageClick(form.engine_air_filter_photo, 'engine_air_filter_photo')}
                />
                <IconButton
                  className="delete-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFormUpdate({
                      engine_air_filter_photo: form.engine_air_filter_photo.filter((_, i) => i !== index)
                    });
                  }}
                  sx={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    bgcolor: 'rgba(0,0,0,0.7)',
                    color: 'white',
                    opacity: 0,
                    transition: 'opacity 0.2s',
                    '&:hover': {
                      bgcolor: 'rgba(0,0,0,0.9)',
                    },
                    padding: '2px',
                  }}
                  size="small"
                >
                  <CloseIcon sx={{ fontSize: '12px' }} />
                </IconButton>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
            Battery Condition
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, marginLeft: 'auto' }}>
            <SafariImageUpload
              onImageUpload={onImageUpload}
              uploadType="battery"
              disabled={loading}
              size="small"
            />
            <NotesField
              fieldName="battery_condition"
              fieldLabel="Battery Condition"
              notes={form.field_notes}
              onNotesChange={onFieldNotesChange}
            />
            <IconButton
              size="small"
              onClick={(e) => onInfoClick(e, "Inspect battery condition, terminals, and check date code. Look for corrosion, cracks, or other signs of wear.")}
            >
              <InfoIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
        {/* Battery Condition */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Battery
          </Typography>
          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
            <Chip
              label="✅ Good"
              color="success"
              variant={form.battery_condition_main === 'good' ? 'filled' : 'outlined'}
              clickable
              onClick={() => onBatteryConditionChange('main', 'good')}
              sx={{ fontWeight: form.battery_condition_main === 'good' ? 'bold' : 'normal', mb: 1 }}
            />
            <Chip
              label="⚠️ Warning"
              color="warning"
              variant={form.battery_condition_main === 'warning' ? 'filled' : 'outlined'}
              clickable
              onClick={() => onBatteryConditionChange('main', 'warning')}
              sx={{ fontWeight: form.battery_condition_main === 'warning' ? 'bold' : 'normal', mb: 1 }}
            />
            <Chip
              label="❌ Bad"
              color="error"
              variant={form.battery_condition_main === 'bad' ? 'filled' : 'outlined'}
              clickable
              onClick={() => onBatteryConditionChange('main', 'bad')}
              sx={{ fontWeight: form.battery_condition_main === 'bad' ? 'bold' : 'normal', mb: 1 }}
            />
            <Chip
              label="N/A"
              color="default"
              variant={form.battery_condition_main === 'na' ? 'filled' : 'outlined'}
              clickable
              onClick={() => onBatteryConditionChange('main', 'na')}
              sx={{ 
                fontWeight: form.battery_condition_main === 'na' ? 'bold' : 'normal',
                fontSize: form.battery_condition_main === 'na' ? '1.1em' : '1em',
                transform: form.battery_condition_main === 'na' ? 'scale(1.05)' : 'scale(1)',
                transition: 'all 0.2s ease-in-out',
                boxShadow: form.battery_condition_main === 'na' ? '0 2px 8px rgba(0,0,0,0.3)' : 'none',
                bgcolor: form.battery_condition_main === 'na' ? '#d0d0d0' : 'transparent',
                color: form.battery_condition_main === 'na' ? '#333333' : 'inherit',
                mb: 1
              }}
            />
          </Stack>
          
          {/* Battery Date Code - moved here under Battery sub-field */}
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField
                size="small"
                label="Battery Date Code"
                placeholder="MM/YY"
                value={form.battery_date_code || ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                  if (value.length === 4) {
                    const month = value.slice(0, 2);
                    const year = value.slice(2, 4);
                    const formatted = `${month}/${year}`;
                    onFormUpdate({ battery_date_code: formatted });
                  } else {
                    onFormUpdate({ battery_date_code: value });
                  }
                }}
                inputProps={{
                  maxLength: 4,
                  pattern: '[0-9]*',
                  inputMode: 'numeric',
                  style: { textAlign: 'center' }
                }}
                sx={{
                  width: '100px',
                  '& .MuiInputBase-input::placeholder': {
                    opacity: 1,
                    color: 'text.secondary'
                  }
                }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary">
              Format: MM/YY (e.g., 12/25 for December 2025)
            </Typography>
          </Box>
        </Box>

        {/* Battery Terminals */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Terminals
          </Typography>
          <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
            <Chip
              label="✅ Good"
              color="success"
              variant={form.battery_terminals?.includes('good') ? 'filled' : 'outlined'}
              clickable
              onClick={() => onBatteryTerminalsToggle('good')}
              sx={{ fontWeight: form.battery_terminals?.includes('good') ? 'bold' : 'normal', mb: 1 }}
            />
            <Chip
              label="🔧 Terminal Cleaning"
              color="info"
              variant={form.battery_terminals?.includes('terminal_cleaning') ? 'filled' : 'outlined'}
              clickable
              onClick={() => onBatteryTerminalsToggle('terminal_cleaning')}
              sx={{ fontWeight: form.battery_terminals?.includes('terminal_cleaning') ? 'bold' : 'normal', mb: 1 }}
            />
            <Chip
              label={(() => {
                try {
                  const locations = Array.isArray(form.battery_terminal_damage_location) 
                    ? form.battery_terminal_damage_location 
                    : [];
                  
                  if (form.battery_terminals?.includes('terminal_damaged') && locations.length > 0) {
                    return `❌ Terminal Damaged (${locations.join(', ')})`;
                  }
                  return "❌ Terminal Damaged";
                } catch (error) {
                  console.error('Error rendering terminal damage label:', error);
                  return "❌ Terminal Damaged";
                }
              })()}
              color="error"
              variant={form.battery_terminals?.includes('terminal_damaged') ? 'filled' : 'outlined'}
              clickable
              onClick={handleTerminalDamageClick}
              sx={{ fontWeight: form.battery_terminals?.includes('terminal_damaged') ? 'bold' : 'normal', mb: 1 }}
            />
          </Stack>
        </Box>

        
        {form.battery_photos.length > 0 && (
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', 
            gap: 1,
            maxWidth: '300px'
          }}>
            {form.battery_photos.map((photo, index) => (
              <Box
                key={index}
                sx={{
                  position: 'relative',
                  aspectRatio: '1',
                  borderRadius: 1,
                  overflow: 'hidden',
                  border: '1px solid #ddd',
                  cursor: 'pointer',
                  '&:hover .delete-button': {
                    opacity: 1
                  }
                }}
              >
                <img
                  src={getDisplayUrl(photo)}
                  alt={`Battery ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                  onClick={() => onImageClick(form.battery_photos, 'battery_photos')}
                />
                <IconButton
                  className="delete-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFormUpdate({
                      battery_photos: form.battery_photos.filter((_, i) => i !== index)
                    });
                  }}
                  sx={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    bgcolor: 'rgba(0,0,0,0.7)',
                    color: 'white',
                    opacity: 0,
                    transition: 'opacity 0.2s',
                    '&:hover': {
                      bgcolor: 'rgba(0,0,0,0.9)',
                    },
                    padding: '2px',
                  }}
                  size="small"
                >
                  <CloseIcon sx={{ fontSize: '12px' }} />
                </IconButton>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* Terminal Damage Location Dialog */}
      <Dialog
        open={terminalDamageDialogOpen}
        onClose={handleTerminalDamageDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Which terminal is damaged?
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2, alignItems: 'center' }}>
            <Chip
              label="➕ Positive Terminal"
              clickable
              onClick={() => handleTerminalDamageLocationToggle('positive')}
              variant={(() => {
                try {
                  const locations = Array.isArray(form.battery_terminal_damage_location) 
                    ? form.battery_terminal_damage_location 
                    : [];
                  return locations.includes('positive') ? 'filled' : 'outlined';
                } catch {
                  return 'outlined';
                }
              })()}
              sx={{ 
                fontSize: '1.1rem',
                padding: '8px 16px',
                height: 'auto',
                backgroundColor: (() => {
                  try {
                    const locations = Array.isArray(form.battery_terminal_damage_location) 
                      ? form.battery_terminal_damage_location 
                      : [];
                    return locations.includes('positive') ? '#f44336' : 'transparent';
                  } catch {
                    return 'transparent';
                  }
                })(),
                color: (() => {
                  try {
                    const locations = Array.isArray(form.battery_terminal_damage_location) 
                      ? form.battery_terminal_damage_location 
                      : [];
                    return locations.includes('positive') ? 'white' : '#f44336';
                  } catch {
                    return '#f44336';
                  }
                })(),
                borderColor: '#f44336',
                '&:hover': {
                  backgroundColor: '#f44336',
                  color: 'white',
                }
              }}
            />
            <Chip
              label="➖ Negative Terminal"
              clickable
              onClick={() => handleTerminalDamageLocationToggle('negative')}
              variant={(() => {
                try {
                  const locations = Array.isArray(form.battery_terminal_damage_location) 
                    ? form.battery_terminal_damage_location 
                    : [];
                  return locations.includes('negative') ? 'filled' : 'outlined';
                } catch {
                  return 'outlined';
                }
              })()}
              sx={{ 
                fontSize: '1.1rem',
                padding: '8px 16px',
                height: 'auto',
                backgroundColor: (() => {
                  try {
                    const locations = Array.isArray(form.battery_terminal_damage_location) 
                      ? form.battery_terminal_damage_location 
                      : [];
                    return locations.includes('negative') ? '#000000' : 'transparent';
                  } catch {
                    return 'transparent';
                  }
                })(),
                color: (() => {
                  try {
                    const locations = Array.isArray(form.battery_terminal_damage_location) 
                      ? form.battery_terminal_damage_location 
                      : [];
                    return locations.includes('negative') ? 'white' : '#000000';
                  } catch {
                    return '#000000';
                  }
                })(),
                borderColor: '#000000',
                '&:hover': {
                  backgroundColor: '#000000',
                  color: 'white',
                }
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleTerminalDamageDialogClose} color="primary">
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}; 