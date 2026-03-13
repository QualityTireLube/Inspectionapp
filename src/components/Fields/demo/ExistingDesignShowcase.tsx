/**
 * Existing Design Showcase
 * 
 * Demonstrates the normalized field system using your existing, cleaner component designs
 * instead of creating new ones. This preserves your established visual patterns.
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Card,
  CardHeader,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Divider,
  IconButton,
  TextField
} from '@mui/material';
import {
  PhotoCamera as PhotoCameraIcon,
  PhotoLibrary as PhotoLibraryIcon,
  TextFields as TextFieldsIcon,
  Info as InfoIcon,
  Title as TitleIcon,
  ChatBubbleOutline as ChatBubbleIcon
} from '@mui/icons-material';

// Import your existing components
import { VinDecoder } from '../../QuickCheck/VinDecoder';
import ImageFieldRectangle from '../../Image/ImageFieldRectangle';
import NotesField from '../../QuickCheck/tabs/NotesField';
import { useUser } from '../../../contexts/UserContext';
import TireTreadSection, { TireTreadData } from '../../TireTreadSection';
import TireTreadSideView from '../../TireTreadSideView';
import BrakePadSideView, { RotorCondition } from '../../BrakePadSideView';
import BrakePadFrontAxleView from '../../BrakePadFrontAxleView';
import {
  TextWidget,
  SelectWidget,
  SectionHeaderWidget,
  PhotoWidget,
  CheckboxWidget,
  WidgetProps
} from '../../InspectionEngine/widgetRegistry';

// Import the adapter system
import { AdaptedField, EnhancedFieldRenderer } from '../adapters/ExistingDesignAdapter';

export const ExistingDesignShowcase: React.FC = () => {
  const { user } = useUser(); // Get logged-in user
  
  const [demoValues, setDemoValues] = useState<Record<string, any>>({
    vin: '',
    dashImages: [],
    tpmsImages: [],
    notes: {},
    batteryCondition: false,
    mileage: '',
    tireTread: {
      inner_edge_depth: '8',
      inner_depth: '7',
      center_depth: '6',
      outer_depth: '5',
      outer_edge_depth: '4',
      inner_edge_condition: 'green',
      inner_condition: 'green',
      center_condition: 'yellow',
      outer_condition: 'yellow',
      outer_edge_condition: 'red'
    },
    tireDate: '2024-01-15',
    tireComments: ['Good condition', 'Even wear'],
    innerPad: 6,
    outerPad: 4,
    rotorCondition: 'good',
    tireIssues: ['Uneven Wear'],
    condition: 'good',
    stateInspection: 'safety',
    userName: user?.name || 'Stephen Villavaso', // Default to logged-in user or fallback
    createdDate: new Date().toISOString().slice(0, 16), // Auto-populate with current datetime when form opens
    templateImages: [] // Sample images for template layout
  });

  const [showCode, setShowCode] = useState<string | null>(null);

  const updateValue = (field: string, value: any) => {
    setDemoValues(prev => ({ ...prev, [field]: value }));
  };

  // Mock field definitions using your existing patterns
  const createFieldDef = (id: string, label: string, type: string, options?: any[]) => ({
    id,
    label,
    type,
    description: `${label} field description`,
    options: options || [],
    required: false,
    defaultValue: null
  });

  const conditionOptions = [
    { value: 'good', label: '✅ Good' },
    { value: 'warning', label: '⚠️ Warning' },
    { value: 'bad', label: '❌ Bad' },
    { value: 'replace', label: '🔄 Replace' }
  ];

  const showcaseItems = [
    {
      title: '👤 User Data Type (Your Design)',
      description: 'Editable user field that auto-populates with logged-in user, same styling as Quick Check',
      component: (
        <Box sx={{ p: 3, border: '2px solid #2196f3', borderRadius: 2, bgcolor: '#f3f9ff' }}>
          <Typography variant="h6" color="primary" gutterBottom>
            Data Type 1: User Field
          </Typography>
          
          {/* User Field - Same as Quick Check but Editable */}
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              label="User"
              name="user"
              value={demoValues.userName}
              onChange={(e) => updateValue('userName', e.target.value)}
              placeholder="Enter user name"
              helperText="Automatically populated from logged-in user, but editable"
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderRadius: '4px'
                  }
                }
              }}
            />
          </Box>
          
          {/* Readonly version (like current Quick Check) */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Read-only version (current Quick Check style):
            </Typography>
            <TextField
              fullWidth
              label="User"
              name="user_readonly"
              value={demoValues.userName}
              disabled
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderRadius: '4px'
                  }
                }
              }}
            />
          </Box>
          
          {/* User Info Display */}
          <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              📋 User Information:
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Current User: <strong>{user?.name || 'Not logged in'}</strong>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Email: <strong>{user?.email || 'N/A'}</strong>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Role: <strong>{user?.role || 'N/A'}</strong>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Field Value: <strong>{demoValues.userName}</strong>
              </Typography>
            </Box>
          </Box>
          
          {/* Features List */}
          <Box sx={{ mt: 2, p: 2, bgcolor: '#e8f5e8', borderRadius: 1 }}>
            <Typography variant="subtitle2" color="success.dark" gutterBottom>
              ✅ User Data Type Features:
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2 }}>
              <Typography component="li" variant="caption" color="success.dark">
                Auto-populates with logged-in user name
              </Typography>
              <Typography component="li" variant="caption" color="success.dark">
                Editable by default (unlike current Quick Check)
              </Typography>
              <Typography component="li" variant="caption" color="success.dark">
                Same visual styling as Quick Check inspection
              </Typography>
              <Typography component="li" variant="caption" color="success.dark">
                Fallback to default value if no user logged in
              </Typography>
              <Typography component="li" variant="caption" color="success.dark">
                Preserves user context and authentication state
              </Typography>
            </Box>
          </Box>
        </Box>
      ),
      code: `// User Data Type Component
import { useUser } from '../../contexts/UserContext';

const { user } = useUser(); // Get logged-in user

// Editable User Field (New behavior)
<TextField
  fullWidth
  label="User"
  name="user"
  value={user?.name || 'Default Name'}
  onChange={handleUserChange}
  placeholder="Enter user name"
  helperText="Auto-populated from logged-in user"
/>

// Read-only User Field (Current Quick Check style)
<TextField
  fullWidth
  label="User"
  name="user"
  value={user?.name || ''}
  disabled
/>`
    },
    {
      title: '📅 Datetime Data Type (Your Design)',
      description: 'Auto-populates with current date/time when form opens, editable, same styling as Quick Check',
      component: (
        <Box sx={{ p: 3, border: '2px solid #4caf50', borderRadius: 2, bgcolor: '#f1f8e9' }}>
          <Typography variant="h6" color="primary" gutterBottom>
            Data Type 2: Created Date/Time
          </Typography>
          
          {/* Datetime Field - Auto-populated with current time */}
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              label="Created Date/Time"
              name="createdDate"
              type="datetime-local"
              value={demoValues.createdDate}
              onChange={(e) => updateValue('createdDate', e.target.value)}
              helperText="Auto-populated when form opens, but editable"
              InputLabelProps={{ shrink: true }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderRadius: '4px'
                  }
                }
              }}
            />
          </Box>
          
          {/* Date only version (like current Quick Check) */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Date-only version (current Quick Check style):
            </Typography>
            <TextField
              fullWidth
              label="Date"
              name="date_readonly"
              type="date"
              value={demoValues.createdDate.split('T')[0]} // Extract date part
              disabled
              InputLabelProps={{ shrink: true }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderRadius: '4px'
                  }
                }
              }}
            />
          </Box>
          
          {/* Datetime Info Display */}
          <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              🕒 DateTime Information:
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Current Time: <strong>{new Date().toLocaleString()}</strong>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Field Value: <strong>{new Date(demoValues.createdDate).toLocaleString()}</strong>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Date Only: <strong>{demoValues.createdDate.split('T')[0]}</strong>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Time Only: <strong>{demoValues.createdDate.split('T')[1]}</strong>
              </Typography>
            </Box>
          </Box>
          
          {/* Reset Button */}
          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
            <Button 
              variant="outlined" 
              size="small"
              onClick={() => updateValue('createdDate', new Date().toISOString().slice(0, 16))}
            >
              Reset to Now
            </Button>
            <Button 
              variant="outlined" 
              size="small"
              onClick={() => updateValue('createdDate', new Date().toISOString().slice(0, 10) + 'T09:00')}
            >
              Set to 9:00 AM Today
            </Button>
          </Box>
          
          {/* Features List */}
          <Box sx={{ mt: 2, p: 2, bgcolor: '#e8f5e8', borderRadius: 1 }}>
            <Typography variant="subtitle2" color="success.dark" gutterBottom>
              ✅ Datetime Data Type Features:
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2 }}>
              <Typography component="li" variant="caption" color="success.dark">
                Auto-populates with current date/time when form opens
              </Typography>
              <Typography component="li" variant="caption" color="success.dark">
                Editable by user (can change date/time if needed)
              </Typography>
              <Typography component="li" variant="caption" color="success.dark">
                Uses datetime-local input type for native browser picker
              </Typography>
              <Typography component="li" variant="caption" color="success.dark">
                Same visual styling as Quick Check date field
              </Typography>
              <Typography component="li" variant="caption" color="success.dark">
                Supports both date-only and datetime formats
              </Typography>
              <Typography component="li" variant="caption" color="success.dark">
                Provides easy reset/preset options
              </Typography>
            </Box>
          </Box>
        </Box>
      ),
      code: `// Datetime Data Type Component
const [formData, setFormData] = useState({
  createdDate: new Date().toISOString().slice(0, 16) // Auto-populate on form open
});

// Full DateTime Field (New behavior)
<TextField
  fullWidth
  label="Created Date/Time"
  name="createdDate"
  type="datetime-local"
  value={formData.createdDate}
  onChange={handleDateTimeChange}
  helperText="Auto-populated when form opens"
  InputLabelProps={{ shrink: true }}
/>

// Date Only Field (Current Quick Check style)
<TextField
  fullWidth
  label="Date"
  name="date"
  type="date"
  value={formData.createdDate.split('T')[0]}
  disabled
  InputLabelProps={{ shrink: true }}
/>

// Reset to current time
const resetToNow = () => {
  setFormData(prev => ({
    ...prev,
    createdDate: new Date().toISOString().slice(0, 16)
  }));
};`
    },
    {
      title: 'VIN Decoder (Your Existing Design)',
      description: 'Uses your existing VinDecoder component with camera and QR features',
      component: (
        <VinDecoder
          vin={demoValues.vin}
          onVinChange={(e) => updateValue('vin', e.target.value)}
          required={false}
          disabled={false}
        />
      ),
      code: `<VinDecoder
  vin={vin}
  onVinChange={(e) => setVin(e.target.value)}
  required={false}
  disabled={false}
/>`
    },
    {
      title: 'Dashboard Image Rectangle (Your Design)',
      description: 'Uses your existing ImageFieldRectangle with 3:1 aspect ratio',
      component: (
        <ImageFieldRectangle
          label="Dashboard Warning Lights"
          images={demoValues.dashImages}
          onImageUpload={async (file, type) => {
            const newUrl = URL.createObjectURL(file);
            updateValue('dashImages', [...demoValues.dashImages, newUrl]);
          }}
          onImageRemove={(index) => {
            const newImages = demoValues.dashImages.filter((_: any, i: number) => i !== index);
            updateValue('dashImages', newImages);
          }}
          onImageView={(url) => console.log('View image:', url)}
          uploadType="dashboard"
          multiple={true}
          maxFiles={5}
        />
      ),
      code: `<ImageFieldRectangle
  label="Dashboard Warning Lights"
  images={images}
  onImageUpload={handleUpload}
  onImageRemove={handleRemove}
  onImageView={handleView}
  uploadType="dashboard"
  multiple={true}
  maxFiles={5}
/>`
    },
    {
      title: 'Notes Field (Your Design)',
      description: 'Uses your existing NotesField with bubble icon and dialog',
      component: (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="body1" sx={{ mr: 1 }}>
            Battery Condition Assessment
          </Typography>
          <NotesField
            fieldName="battery_condition"
            fieldLabel="Battery Condition"
            notes={demoValues.notes}
            onNotesChange={(fieldName, noteText) => {
              updateValue('notes', { ...demoValues.notes, [fieldName]: noteText });
            }}
            tooltipText="Add notes about battery condition"
          />
        </Box>
      ),
      code: `<NotesField
  fieldName="battery_condition"
  fieldLabel="Battery Condition"
  notes={notes}
  onNotesChange={handleNotesChange}
  tooltipText="Add notes about battery condition"
/>`
    },
    {
      title: 'Section Header (Your Widget)',
      description: 'Uses your existing SectionHeaderWidget design',
      component: (
        <SectionHeaderWidget
          field={createFieldDef('fluids_header', 'Fluids', 'section_header')}
          value={null}
          onChange={() => {}}
        />
      ),
      code: `<SectionHeaderWidget
  field={{
    id: 'fluids_header',
    label: 'Fluids',
    type: 'section_header'
  }}
/>`
    },
    {
      title: 'Condition Select (Your Widget)',
      description: 'Uses your existing SelectWidget with standard styling',
      component: (
        <SelectWidget
          field={createFieldDef('condition', 'Overall Condition', 'select', conditionOptions)}
          value={demoValues.condition}
          onChange={(value) => updateValue('condition', value)}
          disabled={false}
          required={false}
        />
      ),
      code: `<SelectWidget
  field={{
    id: 'condition',
    label: 'Overall Condition',
    type: 'select',
    options: conditionOptions
  }}
  value={condition}
  onChange={setCondition}
/>`
    },
    {
      title: 'Text Input (Your Widget)',
      description: 'Uses your existing TextWidget with consistent styling',
      component: (
        <TextWidget
          field={createFieldDef('user_name', 'Technician Name', 'text')}
          value={demoValues.userName}
          onChange={(value) => updateValue('userName', value)}
          disabled={false}
          required={true}
        />
      ),
      code: `<TextWidget
  field={{
    id: 'user_name',
    label: 'Technician Name',
    type: 'text'
  }}
  value={userName}
  onChange={setUserName}
  required={true}
/>`
    },
    {
      title: 'Single-Select Chips (Your Design)',
      description: 'Uses your existing chip selection with single-choice options',
      component: (
        <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>Tire Condition Assessment</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
            {conditionOptions.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                onClick={() => updateValue('condition', option.value)}
                color={demoValues.condition === option.value ? 'primary' : 'default'}
                variant={demoValues.condition === option.value ? 'filled' : 'outlined'}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Box>
          <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
            Selected: {demoValues.condition || 'None'}
          </Typography>
        </Box>
      ),
      code: `// Single-select chips
{options.map((option) => (
  <Chip
    key={option.value}
    label={option.label}
    onClick={() => setValue(option.value)}
    color={value === option.value ? 'primary' : 'default'}
    variant={value === option.value ? 'filled' : 'outlined'}
  />
))}`
    },
    {
      title: 'Multi-Select Chips (Your Design)',
      description: 'Uses your existing chip selection with multiple-choice options',
      component: (
        <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>Tire Issues (Select All That Apply)</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
            {['Uneven Wear', 'Low Tread', 'Cracking', 'Bulge', 'Foreign Object', 'Puncture'].map((issue) => (
              <Chip
                key={issue}
                label={issue}
                onClick={() => {
                  const current = demoValues.tireIssues || [];
                  const newIssues = current.includes(issue)
                    ? current.filter((i: string) => i !== issue)
                    : [...current, issue];
                  updateValue('tireIssues', newIssues);
                }}
                color={(demoValues.tireIssues || []).includes(issue) ? 'secondary' : 'default'}
                variant={(demoValues.tireIssues || []).includes(issue) ? 'filled' : 'outlined'}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Box>
          <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
            Selected: {(demoValues.tireIssues || []).join(', ') || 'None'}
          </Typography>
        </Box>
      ),
      code: `// Multi-select chips
{options.map((option) => (
  <Chip
    key={option}
    label={option}
    onClick={() => toggleSelection(option)}
    color={selectedItems.includes(option) ? 'secondary' : 'default'}
    variant={selectedItems.includes(option) ? 'filled' : 'outlined'}
  />
))}`
    },
    {
      title: 'Dropdown Selection (Your Design)',
      description: 'Uses your existing SelectWidget with Material-UI styling',
      component: (
        <SelectWidget
          field={createFieldDef('state_inspection', 'State Inspection Type', 'select', [
            { value: 'safety', label: 'Safety Inspection' },
            { value: 'emissions', label: 'Emissions Test' },
            { value: 'combined', label: 'Safety + Emissions' },
            { value: 'reinspection', label: 'Re-inspection' }
          ])}
          value={demoValues.stateInspection}
          onChange={(value) => updateValue('stateInspection', value)}
        />
      ),
      code: `<SelectWidget
  field={{
    id: 'state_inspection',
    label: 'State Inspection Type',
    type: 'select',
    options: [
      { value: 'safety', label: 'Safety Inspection' },
      { value: 'emissions', label: 'Emissions Test' },
      { value: 'combined', label: 'Safety + Emissions' }
    ]
  }}
  value={value}
  onChange={onChange}
/>`
    },
    {
      title: '🔲 Basic Normalized Template Layout',
      description: 'The exact template layout: Blue camera icon (far left), Field label, Photo/Tt/Info icons (far right)',
      component: (
        <Box sx={{ p: 0, border: 'none', borderRadius: 0, bgcolor: 'transparent' }}>
          {/* Exact Template Layout - Like Your Image */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            py: 2,
            px: 3,
            border: '1px solid #e0e0e0',
            borderRadius: 1,
            bgcolor: 'background.paper',
            mb: 3
          }}>
            {/* Left side: Camera + Label (no Optional chip for regular fields) */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {/* Camera Icon - Far Left */}
              <IconButton 
                size="small" 
                sx={{ 
                  bgcolor: 'primary.main',
                  color: 'white',
                  width: 40,
                  height: 40,
                  '&:hover': {
                    bgcolor: 'primary.dark'
                  }
                }}
              >
                <PhotoCameraIcon />
              </IconButton>
              
              {/* Field Label */}
              <Typography variant="h6" fontWeight="medium" color="text.primary">
                Engine Oil Level
              </Typography>
            </Box>
            
            {/* Far Right: Photo, Tt, Info Icons */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton 
                size="medium" 
                title="Photo Album"
                sx={{ 
                  color: 'text.secondary',
                  bgcolor: '#f5f5f5',
                  '&:hover': { bgcolor: '#e0e0e0' }
                }}
              >
                <PhotoLibraryIcon />
              </IconButton>
              <IconButton 
                size="medium" 
                title="Notes/Text Input"
                sx={{ 
                  color: 'text.secondary',
                  bgcolor: '#f5f5f5',
                  '&:hover': { bgcolor: '#e0e0e0' }
                }}
              >
                <ChatBubbleIcon />
              </IconButton>
              <IconButton 
                size="medium" 
                title="Info"
                sx={{ 
                  color: 'text.secondary',
                  bgcolor: '#f5f5f5',
                  '&:hover': { bgcolor: '#e0e0e0' }
                }}
              >
                <InfoIcon />
              </IconButton>
            </Box>
          </Box>
          
          {/* Dynamic Content Area */}
          <Box sx={{ 
            p: 3, 
            border: '1px dashed #ccc', 
            borderRadius: 1, 
            bgcolor: '#fafafa',
            textAlign: 'center',
            mb: 3
          }}>
            <Typography variant="body2" color="textSecondary">
              Dynamic Content Area
              <br />
              (Field-specific components render here)
            </Typography>
          </Box>
          
          {/* Image Thumbnails Section */}
          <Box sx={{ mb: 3 }}>
            {/* Mock Images for Demo */}
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => updateValue('templateImages', [
                  { url: 'https://via.placeholder.com/100x100/4caf50/white?text=IMG1', id: '1' },
                  { url: 'https://via.placeholder.com/100x100/2196f3/white?text=IMG2', id: '2' },
                  { url: 'https://via.placeholder.com/100x100/ff9800/white?text=IMG3', id: '3' }
                ])}
                sx={{ textTransform: 'none' }}
              >
                Add Sample Images
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => updateValue('templateImages', [])}
                sx={{ textTransform: 'none' }}
              >
                Clear Images
              </Button>
            </Box>
            
            {/* Image Thumbnail Grid */}
            {demoValues.templateImages.length > 0 && (
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', 
                gap: 2,
                maxWidth: '400px',
                p: 2,
                border: '1px solid #e0e0e0',
                borderRadius: 1,
                bgcolor: 'background.paper'
              }}>
                {demoValues.templateImages.map((image: any, index: number) => (
                  <Box
                    key={image.id}
                    sx={{
                      position: 'relative',
                      aspectRatio: '1',
                      borderRadius: 1,
                      overflow: 'hidden',
                      border: '1px solid #ddd',
                      cursor: 'pointer',
                      transition: 'transform 0.2s ease',
                      '&:hover': {
                        transform: 'scale(1.05)',
                        borderColor: 'primary.main'
                      },
                      '&:hover .delete-button': { 
                        opacity: 1 
                      }
                    }}
                    onClick={() => console.log('Open slideshow for image:', index)}
                  >
                    <img 
                      src={image.url} 
                      alt={`Thumbnail ${index + 1}`} 
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover' 
                      }} 
                    />
                    <IconButton
                      className="delete-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const newImages = demoValues.templateImages.filter((_: any, i: number) => i !== index);
                        updateValue('templateImages', newImages);
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
                          bgcolor: 'rgba(0,0,0,0.9)' 
                        },
                        padding: '4px',
                        width: 24,
                        height: 24
                      }}
                      size="small"
                    >
                      <Typography sx={{ fontSize: '12px' }}>×</Typography>
                    </IconButton>
                  </Box>
                ))}
              </Box>
            )}
            
            {demoValues.templateImages.length === 0 && (
              <Box sx={{ 
                p: 2, 
                border: '1px dashed #ccc', 
                borderRadius: 1, 
                bgcolor: '#f9f9f9',
                textAlign: 'center',
                maxWidth: '400px'
              }}>
                <Typography variant="body2" color="textSecondary">
                  No images added yet. Click "Add Sample Images" to see the thumbnail gallery.
                </Typography>
              </Box>
            )}
          </Box>
          
          {/* Template Explanation */}
          <Box sx={{ mt: 3, p: 3, bgcolor: '#f8f9fa', borderRadius: 1, border: '1px solid #e9ecef' }}>
            <Typography variant="subtitle2" color="primary" gutterBottom>
              📏 Extended Template Structure:
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2 }}>
              <Typography component="li" variant="caption" color="primary">
                <strong>Blue Camera Icon:</strong> Far left (40x40px, primary color)
              </Typography>
              <Typography component="li" variant="caption" color="primary">
                <strong>Field Label:</strong> "Engine Oil Level" (medium weight)
              </Typography>
              <Typography component="li" variant="caption" color="primary">
                <strong>Action Icons:</strong> Photo Album, Chat Bubble, Info (gray backgrounds)
              </Typography>
              <Typography component="li" variant="caption" color="primary">
                <strong>Content Area:</strong> Field-specific components render here
              </Typography>
              <Typography component="li" variant="caption" color="primary">
                <strong>Image Gallery:</strong> Thumbnails below content (100px grid, hover effects)
              </Typography>
              <Typography component="li" variant="caption" color="primary">
                <strong>Interactions:</strong> Click thumbnails for slideshow, hover to delete
              </Typography>
            </Box>
          </Box>
        </Box>
      ),
      code: `// Basic Normalized Template Layout
<Box sx={{ 
  display: 'flex', 
  alignItems: 'center', 
  justifyContent: 'space-between',
  py: 2,
  px: 3,
  border: '1px solid #e0e0e0',
  borderRadius: 1,
  bgcolor: 'background.paper'
}}>
  {/* Left side: Blue Camera + Field Label */}
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
    {/* Blue Camera Icon - Far Left */}
    <IconButton 
      size="small" 
      sx={{ 
        bgcolor: 'primary.main',
        color: 'white',
        width: 40,
        height: 40,
        '&:hover': { bgcolor: 'primary.dark' }
      }}
    >
      <PhotoCameraIcon />
    </IconButton>
    
    {/* Field Label */}
    <Typography variant="h6" fontWeight="medium">
      Engine Oil Level
    </Typography>
  </Box>
  
  {/* Far Right: Photo, Tt, Info Icons */}
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
    <IconButton 
      size="medium" 
      sx={{ 
        color: 'text.secondary',
        bgcolor: '#f5f5f5',
        '&:hover': { bgcolor: '#e0e0e0' }
      }}
    >
      <PhotoLibraryIcon />
    </IconButton>
    <IconButton 
      size="medium" 
      sx={{ 
        color: 'text.secondary',
        bgcolor: '#f5f5f5',
        '&:hover': { bgcolor: '#e0e0e0' }
      }}
    >
      <ChatBubbleIcon />
    </IconButton>
    <IconButton 
      size="medium" 
      sx={{ 
        color: 'text.secondary',
        bgcolor: '#f5f5f5',
        '&:hover': { bgcolor: '#e0e0e0' }
      }}
    >
      <InfoIcon />
    </IconButton>
  </Box>
</Box>

{/* Dynamic Content Area */}
<Box sx={{ p: 3, border: '1px dashed #ccc', borderRadius: 1, bgcolor: '#fafafa' }}>
  {children /* Field-specific components */}
</Box>

{/* Image Thumbnail Gallery */}
{images.length > 0 && (
  <Box sx={{ 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', 
    gap: 2,
    maxWidth: '400px',
    p: 2,
    border: '1px solid #e0e0e0',
    borderRadius: 1,
    bgcolor: 'background.paper'
  }}>
    {images.map((image, index) => (
      <Box
        key={index}
        sx={{
          position: 'relative',
          aspectRatio: '1',
          borderRadius: 1,
          overflow: 'hidden',
          border: '1px solid #ddd',
          cursor: 'pointer',
          '&:hover': { transform: 'scale(1.05)', borderColor: 'primary.main' },
          '&:hover .delete-button': { opacity: 1 }
        }}
        onClick={() => openSlideshow(index)}
      >
        <img 
          src={image.url} 
          alt={\`Thumbnail \${index + 1}\`} 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
        />
        <IconButton
          className="delete-button"
          onClick={(e) => { e.stopPropagation(); removeImage(index); }}
          sx={{
            position: 'absolute', top: 4, right: 4,
            bgcolor: 'rgba(0,0,0,0.7)', color: 'white',
            opacity: 0, transition: 'opacity 0.2s',
            width: 24, height: 24, padding: '4px'
          }}
        >
          ×
        </IconButton>
      </Box>
    ))}
  </Box>
)}`
    },
    {
      title: '🛞 Complete Tire Data Type (Your Design)',
      description: 'Full tire inspection component with SVG visualization, tread depth inputs, conditions, and date/comment tracking',
      component: (
        <Box sx={{ p: 3, border: '2px solid #ff9800', borderRadius: 2, bgcolor: '#fff8e1' }}>
          <Typography variant="h6" color="primary" gutterBottom>
            Driver Front Tire - Complete Inspection
          </Typography>
          
          {/* Main Tire Tread Section with Inputs */}
          <TireTreadSection
            label=""
            fieldPrefix="driver_front"
            value={demoValues.tireTread}
            onChange={(field, newValue) => {
              updateValue('tireTread', { ...demoValues.tireTread, [field]: newValue });
            }}
            onConditionChange={(field, condition) => {
              updateValue('tireTread', { ...demoValues.tireTread, [field]: condition });
            }}
            onPhotoClick={() => console.log('Tire photo clicked')}
            onDeletePhoto={(index) => console.log('Delete tire photo:', index)}
            tireDate={demoValues.tireDate}
            onTireDateChange={(date) => updateValue('tireDate', date)}
            tireComments={demoValues.tireComments}
            onTireCommentToggle={(comment) => {
              const comments = demoValues.tireComments.includes(comment)
                ? demoValues.tireComments.filter((c: string) => c !== comment)
                : [...demoValues.tireComments, comment];
              updateValue('tireComments', comments);
            }}
            photos={[]}
          />
          
          {/* SVG Tire Visualization */}
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="subtitle2" gutterBottom color="text.secondary">
                Visual Tire Condition (SVG Representation)
              </Typography>
              <TireTreadSideView
                innerEdgeCondition={demoValues.tireTread.inner_edge_condition}
                innerCondition={demoValues.tireTread.inner_condition}
                centerCondition={demoValues.tireTread.center_condition}
                outerCondition={demoValues.tireTread.outer_condition}
                outerEdgeCondition={demoValues.tireTread.outer_edge_condition}
                innerEdgeDepth={parseInt(demoValues.tireTread.inner_edge_depth) || 0}
                innerDepth={parseInt(demoValues.tireTread.inner_depth) || 0}
                centerDepth={parseInt(demoValues.tireTread.center_depth) || 0}
                outerDepth={parseInt(demoValues.tireTread.outer_depth) || 0}
                outerEdgeDepth={parseInt(demoValues.tireTread.outer_edge_depth) || 0}
                width={350}
                height={180}
              />
            </Box>
          </Box>
          
          {/* Summary Information */}
          <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              📊 Tire Data Summary:
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 1, mb: 2 }}>
              {Object.entries(demoValues.tireTread).filter(([key]) => key.includes('_depth')).map(([key, value]) => (
                <Box key={key} sx={{ textAlign: 'center', p: 1, bgcolor: '#f5f5f5', borderRadius: 0.5 }}>
                  <Typography variant="caption" display="block" color="text.secondary">
                    {key.replace('_depth', '').replace('_', ' ')}
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {value}/32"
                  </Typography>
                </Box>
              ))}
            </Box>
            <Typography variant="caption" color="text.secondary">
              Date: {demoValues.tireDate} | Comments: {demoValues.tireComments.join(', ')}
            </Typography>
          </Box>
        </Box>
      ),
      code: `// Complete Tire Data Type Component
<TireTreadSection
  label="Driver Front Tire"
  value={tireTreadData}
  onChange={handleTreadChange}
  onConditionChange={handleConditionChange}
  onPhotoClick={handlePhotoClick}
  tireDate={tireDate}
  onTireDateChange={setTireDate}
  tireComments={tireComments}
  onTireCommentToggle={handleCommentToggle}
  photos={photos}
/>

{/* SVG Tire Visualization */}
<TireTreadSideView
  innerEdgeCondition={tireTread.inner_edge_condition}
  innerCondition={tireTread.inner_condition}
  centerCondition={tireTread.center_condition}
  outerCondition={tireTread.outer_condition}
  outerEdgeCondition={tireTread.outer_edge_condition}
  innerEdgeDepth={parseInt(tireTread.inner_edge_depth)}
  innerDepth={parseInt(tireTread.inner_depth)}
  centerDepth={parseInt(tireTread.center_depth)}
  outerDepth={parseInt(tireTread.outer_depth)}
  outerEdgeDepth={parseInt(tireTread.outer_edge_depth)}
  width={350}
  height={180}
/>`
    },
    {
      title: 'Adapted Field System',
      description: 'Using the adapter to automatically select your existing designs',
      component: (
        <Box>
          <AdaptedField
            fieldType="vin"
            id="adapted_vin"
            label="VIN (Adapted)"
            value={demoValues.vin}
            onChange={(value) => updateValue('vin', value)}
          />
          
          <AdaptedField
            fieldType="text"
            id="adapted_mileage"
            label="Mileage (Adapted)"
            value={demoValues.mileage}
            onChange={(value) => updateValue('mileage', value)}
            placeholder="000,000"
          />
        </Box>
      ),
      code: `<AdaptedField
  fieldType="vin"
  id="adapted_vin"
  label="VIN (Adapted)"
  value={vin}
  onChange={setVin}
/>

<AdaptedField
  fieldType="text"
  id="adapted_mileage"
  label="Mileage (Adapted)"
  value={mileage}
  onChange={setMileage}
  placeholder="000,000"
/>`
    }
  ];

  return (
    <Box sx={{ p: 4, bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ mb: 5, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: 'text.primary' }}>
          🎨 Dynamic Field Components
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph sx={{ maxWidth: 800, mx: 'auto' }}>
          Showcasing your existing component designs with the normalized field template system.
          Each component maintains your established visual patterns and design consistency.
        </Typography>
        
        <Box sx={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: 1, 
          px: 3, 
          py: 1, 
          bgcolor: 'success.light', 
          borderRadius: 20,
          border: '1px solid',
          borderColor: 'success.main'
        }}>
          <Typography variant="body2" color="success.dark" sx={{ fontWeight: 'medium' }}>
            ✅ Using Your Existing Design Language
          </Typography>
        </Box>
      </Box>

      {/* Design Comparison */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          🔄 Design Integration Strategy
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 2, bgcolor: '#f0f7ff' }}>
              <Typography variant="h6" color="primary" gutterBottom>
                Your Existing Components
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Chip label="VinDecoder" variant="outlined" color="primary" size="small" />
                <Chip label="ImageFieldRectangle" variant="outlined" color="primary" size="small" />
                <Chip label="NotesField" variant="outlined" color="primary" size="small" />
                <Chip label="Widget System" variant="outlined" color="primary" size="small" />
                <Chip label="Safari Image Upload" variant="outlined" color="primary" size="small" />
              </Box>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 2, bgcolor: '#fff8e1' }}>
              <Typography variant="h6" color="warning.main" gutterBottom>
                Adapter System
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Converts BaseFieldProps to your component props
                <br />
                • Maintains your visual design patterns
                <br />
                • Enables dynamic field composition
                <br />
                • Zero design changes needed
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* Component Showcases */}
      <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
        🛠️ Your Components in Action
      </Typography>
      
      <Grid container spacing={4}>
        {showcaseItems.map((item, index) => (
          <Grid size={{ xs: 12, lg: 6 }} key={index}>
            <Paper 
              elevation={1} 
              sx={{ 
                height: '100%', 
                borderRadius: 2,
                border: '1px solid #e0e0e0',
                overflow: 'hidden',
                transition: 'all 0.2s ease',
                '&:hover': {
                  elevation: 2,
                  borderColor: 'primary.main'
                }
              }}
            >
              {/* Header */}
              <Box sx={{ 
                p: 3, 
                bgcolor: 'background.paper',
                borderBottom: '1px solid #f0f0f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                    {item.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.description}
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setShowCode(item.code)}
                  sx={{ 
                    borderRadius: 20,
                    textTransform: 'none',
                    minWidth: 'auto',
                    px: 2
                  }}
                >
                  Code
                </Button>
              </Box>
              
              {/* Content */}
              <Box sx={{ p: 3 }}>
                {item.component}
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Current Values Debug */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          📊 Current Field Values
        </Typography>
        <Paper sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
          <pre style={{ fontSize: '0.8rem', overflow: 'auto' }}>
            {JSON.stringify(demoValues, null, 2)}
          </pre>
        </Paper>
      </Box>

      {/* Code Dialog */}
      <Dialog
        open={!!showCode}
        onClose={() => setShowCode(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Component Code</DialogTitle>
        <DialogContent>
          <Paper sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
            <pre style={{ fontSize: '0.9rem', overflow: 'auto' }}>
              {showCode}
            </pre>
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCode(null)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExistingDesignShowcase;

