import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  TextField,
  FormControl,
  FormControlLabel,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  IconButton,
  Divider,
  AppBar,
  Toolbar,
  Chip,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Card,
  CardContent,
  Slider,
  ToggleButtonGroup,
  ToggleButton,
  Alert,
  Switch
} from '@mui/material';
import {
  Close as CloseIcon,
  Save as SaveIcon,
  Add as AddIcon,
  DragIndicator as DragIcon,
  Delete as DeleteIcon,
  Visibility as PreviewIcon,
  GetApp as DownloadIcon,
  FormatAlignLeft,
  FormatAlignCenter,
  FormatAlignRight,
  RotateLeft as RotateLeftIcon,
  RotateRight as RotateRightIcon,
  Refresh as ResetRotationIcon
} from '@mui/icons-material';
import Draggable from 'react-draggable';
import { v4 as uuidv4 } from 'uuid';
import { LabelTemplate, LabelField, AVAILABLE_FIELDS, PAPER_SIZES } from '../types/labelTemplates';
import { useLabelStore } from '../stores/labelStore';
import { LabelApiService } from '../services/labelApi';
import { LabelPdfGenerator, LabelData } from '../services/labelPdfGenerator';

interface LabelEditorProps {
  template?: LabelTemplate | null;
  onClose: () => void;
  onSave: () => void;
}

const LabelEditor: React.FC<LabelEditorProps> = ({ template, onClose, onSave }) => {
  const [labelName, setLabelName] = useState('');
  const [paperSize, setPaperSize] = useState<'Brother-QL800' | 'Dymo-TwinTurbo' | '29mmx90mm' | 'Godex-200i' | 'DK1201' | 'DK221' | 'Custom'>('Brother-QL800');
  const [copies, setCopies] = useState(1);
  const [fields, setFields] = useState<LabelField[]>([]);
  const [selectedField, setSelectedField] = useState<LabelField | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canvasRotation, setCanvasRotation] = useState(0);
  const [isLandscape, setIsLandscape] = useState(false); // Track orientation instead of rotation
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Custom paper size state
  const [customWidth, setCustomWidth] = useState(62);
  const [customHeight, setCustomHeight] = useState(29);
  const [customUnit, setCustomUnit] = useState<'mm' | 'inch'>('mm');
  
  // New state for custom field creation
  const [customFieldName, setCustomFieldName] = useState('');
  const [showCustomFieldInput, setShowCustomFieldInput] = useState(false);
  
  // Preview zoom level (1.0 = 100%, actual PDF size at 72 DPI)
  const [previewZoom, setPreviewZoom] = useState(1.0); // Default to 100%
  
  // Preview rotation - rotates the entire canvas view for easier editing
  // This is purely visual and doesn't affect the saved field positions
  const [previewRotation, setPreviewRotation] = useState(0); // 0, 90, 180, 270

  // Create refs for draggable fields to fix findDOMNode warning
  const fieldRefs = useRef<{ [key: string]: React.RefObject<HTMLDivElement | null> }>({});

  const { setError: setStoreError } = useLabelStore();

  // Helper function to get or create ref for a field
  const getFieldRef = (fieldId: string) => {
    if (!fieldRefs.current[fieldId]) {
      fieldRefs.current[fieldId] = React.createRef<HTMLDivElement>();
    }
    return fieldRefs.current[fieldId];
  };

  // Clean up refs when fields are removed
  useEffect(() => {
    const currentFieldIds = new Set(fields.map(f => f.id));
    Object.keys(fieldRefs.current).forEach(fieldId => {
      if (!currentFieldIds.has(fieldId)) {
        delete fieldRefs.current[fieldId];
      }
    });
  }, [fields]);

  // Available font families
  const FONT_FAMILIES = [
    'Arial',
    'Helvetica',
    'Times New Roman',
    'Courier New',
    'Verdana',
    'Georgia',
    'Tahoma',
    'Trebuchet MS',
    'Impact',
    'Comic Sans MS'
  ];

  // Initialize form with template data
  useEffect(() => {
    if (template) {
      setLabelName(template.labelName);
      setPaperSize(template.paperSize);
      setCopies(template.copies);
      

      setFields([...template.fields]);
      
      // Always use portrait mode for simplicity
      setCanvasRotation(0);
      setIsLandscape(false);
      
      // Initialize custom paper size if applicable
      if (template.paperSize === 'Custom' && template.customWidth && template.customHeight && template.customUnit) {
        setCustomWidth(template.customWidth);
        setCustomHeight(template.customHeight);
        setCustomUnit(template.customUnit);
      }
    } else {
      // Initialize with defaults
      setLabelName('');
      setPaperSize('Brother-QL800');
      setCopies(1);
      setFields([]);
      setCanvasRotation(0);
      setIsLandscape(false);
      setCustomWidth(62);
      setCustomHeight(29);
      setCustomUnit('mm');
    }
  }, [template]);

  // Keep DK1201 in portrait mode for simplicity
  useEffect(() => {
    if (paperSize === 'DK1201') {
      setCanvasRotation(0); // Keep in portrait mode
      setIsLandscape(false); // Always portrait
    }
  }, [paperSize]);

  // Calculate paper dimensions (handle custom sizes)
  const getPaperDimensions = () => {
    if (paperSize === 'Custom') {
      return {
        name: `Custom (${customWidth} x ${customHeight} ${customUnit})`,
        width: customWidth,
        height: customHeight,
        unit: customUnit,
        custom: true
      };
    }
    return PAPER_SIZES[paperSize];
  };

  const paperConfig = getPaperDimensions();
  
  // The PDF generator uses a 400px canvas width and calculates height proportionally
  // We need to match this EXACTLY for accurate positioning
  const PDF_CANVAS_WIDTH = 400;
  const PDF_CANVAS_HEIGHT = Math.round((paperConfig.height / paperConfig.width) * PDF_CANVAS_WIDTH);
  
  // These are the internal coordinate system dimensions (what field positions are stored in)
  const canvasWidth = PDF_CANVAS_WIDTH;
  const canvasHeight = PDF_CANVAS_HEIGHT;

  // For the visual preview, we display the canvas at a readable size
  // The preview is a direct 1:1 representation of the canvas coordinate system
  const previewDimensions = useMemo(() => {
    // Target: fit the preview comfortably on screen without browser zoom
    // For tall labels (like DK1201 at 400x1241), limit height to ~400px at 100% zoom
    const maxDimension = 400;
    const longestSide = Math.max(canvasWidth, canvasHeight);
    const baseScale = maxDimension / longestSide;
    
    // Apply zoom on top of base scale
    const totalScale = baseScale * previewZoom;
    
    // Calculate display dimensions (directly from canvas, not PDF)
    const displayWidth = canvasWidth * totalScale;
    const displayHeight = canvasHeight * totalScale;
    
    // Font scale calculation to match PDF output:
    // In the PDF, fonts are specified in points and drawn on the actual PDF page size
    // PDF page width in points = paperWidth(mm) * 2.834645669
    // Canvas width = 400 units
    // So 1 canvas unit = pdfPageWidth / 400 points
    // For a fontSize of X points, it takes up X / pdfPageWidth of the page width
    // In our preview, that same proportion should be X * (previewWidth / pdfPageWidth) pixels
    // 
    // Simplified: fontScale = previewWidth / pdfPageWidth = displayWidth / (paperWidth * 2.834645669)
    // But since displayWidth = canvasWidth * totalScale = 400 * totalScale
    // And pdfPageWidth = paperWidth * 2.834645669
    // fontScale = (400 * totalScale) / (paperWidth * 2.834645669)
    //
    // For DK1201 (29mm wide): pdfPageWidth = 29 * 2.834645669 = 82.2 points
    // fontScale = (400 * 0.32) / 82.2 = 128 / 82.2 = 1.56
    const mmToPoints = 2.834645669;
    const pdfPageWidth = paperConfig.width * (paperConfig.unit === 'inch' ? 72 : mmToPoints);
    const fontScale = displayWidth / pdfPageWidth;
    
    return {
      width: displayWidth,
      height: displayHeight,
      // Scale factor to convert from canvas coordinates to preview pixels
      scale: totalScale,
      // Font scale: matches how fonts appear in the PDF relative to page size
      fontScale: fontScale
    };
  }, [canvasWidth, canvasHeight, previewZoom, paperConfig.width, paperConfig.unit]);

  // Simple helper to arrange fields vertically
  const arrangeFieldsVertically = () => {
    const margin = 15;
    const lineHeight = 25; // Approximate line height in canvas units
    
    const arrangedFields = fields.map((field, index) => ({
      ...field,
      position: {
        x: margin,
        y: margin + (index * lineHeight)
      }
    }));
    setFields(arrangedFields);
  };

  const handleAddField = (fieldName: string) => {
    const newField: LabelField = {
      id: uuidv4(),
      name: fieldName,
      position: { x: 10, y: 30 }, // Start at actual coordinate position
      fontSize: 12,
      fontFamily: 'Arial',
      textAlign: 'left',
      color: '#000000',
      value: fieldName,
      showInForm: true, // Default to true for new fields
      rotation: 0 // Default rotation
    };

    setFields([...fields, newField]);
  };

  const handleAddCustomField = () => {
    if (customFieldName.trim()) {
      handleAddField(customFieldName.trim());
      setCustomFieldName('');
      setShowCustomFieldInput(false);
    }
  };

  const handleUpdateField = (fieldId: string, updates: Partial<LabelField>) => {
    // Debug rotation updates
    if (updates.rotation !== undefined) {
      console.log(`🔄 Updating field ${fieldId} rotation to ${updates.rotation}°`);
    }
    
    const updatedFields = fields.map(field => 
      field.id === fieldId ? { ...field, ...updates } : field
    );
    setFields(updatedFields);
    if (selectedField && selectedField.id === fieldId) {
      setSelectedField({ ...selectedField, ...updates });
    }
  };

  const handleDeleteField = (fieldId: string) => {
    setFields(fields.filter(field => field.id !== fieldId));
    if (selectedField && selectedField.id === fieldId) {
      setSelectedField(null);
    }
  };

  // Removed rotation handlers since we're keeping it simple with portrait mode

  const handleFieldDrag = (fieldId: string, data: { x: number; y: number }) => {
    // data.x and data.y are the element's position in the parent's coordinate system
    // For a non-rotated preview, this is straightforward
    // For a rotated preview, we need to transform the coordinates
    
    // Get the field to know its fontSize for the Y offset
    const field = fields.find(f => f.id === fieldId);
    const fontSize = field?.fontSize || 10;
    
    let canvasX: number;
    let canvasY: number;
    
    // For now, only handle 0° rotation correctly
    // The preview adds fontSize to Y for display, so we subtract it when saving
    if (previewRotation === 0) {
      canvasX = data.x / previewDimensions.scale;
      canvasY = data.y / previewDimensions.scale - fontSize;
    } else {
      // For rotated views, the coordinate transformation is complex
      // For simplicity, disable dragging when rotated (use manual input instead)
      // TODO: Implement proper coordinate transformation for rotated views
      console.log('Drag in rotated view - coordinates may not be accurate');
      canvasX = data.x / previewDimensions.scale;
      canvasY = data.y / previewDimensions.scale - fontSize;
    }
    
    // No boundaries - allow any position
    const clampedPosition = {
      x: Math.round(canvasX),
      y: Math.round(canvasY)
    };
    
    console.log('Drag:', { 
      dragPos: data, 
      scale: previewDimensions.scale, 
      fontSize,
      calculated: { canvasX, canvasY },
      clamped: clampedPosition,
      canvasBounds: { canvasWidth, canvasHeight }
    });
    
    handleUpdateField(fieldId, { position: clampedPosition });
  };

  // Handler for manual position updates (values are in canvas coordinates)
  const handlePositionChange = (fieldId: string, axis: 'x' | 'y', value: number) => {
    // No limits - allow any value
    const clampedValue = value;
    handleUpdateField(fieldId, { 
      position: { 
        ...selectedField?.position || { x: 0, y: 0 }, 
        [axis]: clampedValue 
      } 
    });
  };

  const handleSave = async () => {
    if (!labelName.trim()) {
      setError('Label name is required');
      return;
    }

    if (fields.length === 0) {
      setError('At least one field is required');
      return;
    }

    try {
      setError(null);
      const userEmail = localStorage.getItem('userEmail') || 'Unknown User';



      const templateData = {
        labelName: labelName.trim(),
        fields,
        paperSize,
        width: canvasWidth,  // Use same dimensions as PDF generator
        height: canvasHeight,
        copies,
        canvasRotation: 0, // Always portrait mode
        ...(paperSize === 'Custom' && {
          customWidth,
          customHeight,
          customUnit
        })
      };

      if (template) {
        // Update existing template
        await LabelApiService.updateTemplate(template.id, templateData);
      } else {
        // Create new template
        await LabelApiService.createTemplate({
          ...templateData,
          createdBy: userEmail
        });
      }

      onSave();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save template';
      setError(message);
      setStoreError(message);
    }
  };

  const handlePreview = async () => {
    if (fields.length === 0) {
      setError('Add some fields before previewing');
      return;
    }

    try {
      setIsGeneratingPdf(true);
      setError(null);

      // Create a temporary template for preview using actual coordinates
      const tempTemplate: LabelTemplate = {
        id: 'preview',
        labelName,
        fields,
        paperSize,
        width: canvasWidth,  // Use same dimensions as PDF generator
        height: canvasHeight,
        copies,
        archived: false,
        createdBy: 'Preview',
        createdDate: new Date().toISOString(),
        canvasRotation: 0, // Always portrait mode
        ...(paperSize === 'Custom' && {
          customWidth,
          customHeight,
          customUnit
        })
      };

      // Generate sample data
      const sampleData: LabelData = {};
      fields.forEach(field => {
        sampleData[field.name] = field.value || field.name;
      });

      const pdfBytes = await LabelPdfGenerator.generateLabelPdf(tempTemplate, sampleData, 1);
      LabelPdfGenerator.openPdfInNewTab(pdfBytes);
    } catch (err) {
      setError('Failed to generate preview');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const availableFields = AVAILABLE_FIELDS.filter(
    fieldName => !fields.some(field => field.name === fieldName)
  );

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {template ? 'Edit Label Template' : 'Create New Label Template'}
          </Typography>
          <Button
            color="primary"
            startIcon={<PreviewIcon />}
            onClick={handlePreview}
            disabled={isGeneratingPdf || fields.length === 0}
            sx={{ mr: 1 }}
          >
            Preview
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            sx={{ mr: 1 }}
          >
            Save
          </Button>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ m: 2 }}>
          {error}
        </Alert>
      )}

            {/* Main Content */}
      <Box sx={{ display: 'flex', flexGrow: 1, minHeight: 0 }}>
        {/* Left Panel - Settings and Available Fields Only */}
        <Paper sx={{ width: 300, display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 64px)', position: 'sticky', top: 0 }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h6" gutterBottom>Template Settings</Typography>
            
            <TextField
              fullWidth
              label="Label Name"
              value={labelName}
              onChange={(e) => setLabelName(e.target.value)}
              margin="normal"
              size="small"
              required
            />

            <FormControl fullWidth margin="normal" size="small">
              <InputLabel>Paper Size</InputLabel>
              <Select
                value={paperSize}
                onChange={(e) => setPaperSize(e.target.value as 'Brother-QL800' | 'Dymo-TwinTurbo' | '29mmx90mm' | 'Godex-200i' | 'DK1201' | 'DK221' | 'Custom')}
                label="Paper Size"
              >
                {Object.entries(PAPER_SIZES).map(([key, config]) => (
                  <MenuItem key={key} value={key}>
                    {config.custom ? config.name : `${config.name} (${config.width} x ${config.height} ${config.unit})`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Custom Paper Size Inputs */}
            {paperSize === 'Custom' && (
              <Box sx={{ mt: 2, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom color="primary">
                  Custom Paper Size
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Unit</InputLabel>
                    <Select
                      value={customUnit}
                      onChange={(e) => setCustomUnit(e.target.value as 'mm' | 'inch')}
                      label="Unit"
                    >
                      <MenuItem value="mm">Millimeters (mm)</MenuItem>
                      <MenuItem value="inch">Inches (in)</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label={`Width (${customUnit})`}
                    type="number"
                    value={customWidth}
                    onChange={(e) => setCustomWidth(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                    size="small"
                    inputProps={{ 
                      min: customUnit === 'mm' ? 10 : 0.4, 
                      max: customUnit === 'mm' ? 500 : 20,
                      step: customUnit === 'mm' ? 1 : 0.1
                    }}
                  />
                  <TextField
                    label={`Height (${customUnit})`}
                    type="number"
                    value={customHeight}
                    onChange={(e) => setCustomHeight(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                    size="small"
                    inputProps={{ 
                      min: customUnit === 'mm' ? 10 : 0.4, 
                      max: customUnit === 'mm' ? 500 : 20,
                      step: customUnit === 'mm' ? 1 : 0.1
                    }}
                  />
                </Box>
                
                <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
                  {customUnit === 'mm' 
                    ? 'Standard sizes: 29×90mm, 62×29mm, 62×100mm' 
                    : 'Standard sizes: 1.125"×3.5", 2.44"×1.125", 2.44"×3.94"'
                  }
                </Typography>
              </Box>
            )}

            <TextField
              fullWidth
              label="Copies to Print"
              type="number"
              value={copies}
              onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
              margin="normal"
              size="small"
              inputProps={{ min: 1, max: 100 }}
            />
          </Box>

          {/* Available Fields */}
          <Box sx={{ p: 2, flexGrow: 1, overflow: 'auto' }}>
            <Typography variant="h6" gutterBottom>Available Fields</Typography>
            
            {/* Predefined Fields */}
            {availableFields.length > 0 && (
              <List dense>
                {availableFields.map((fieldName) => (
                  <ListItem
                    key={fieldName}
                    sx={{ 
                      border: 1, 
                      borderColor: 'divider', 
                      borderRadius: 1, 
                      mb: 1,
                      p: 0
                    }}
                  >
                    <ListItemButton
                      onClick={() => handleAddField(fieldName)}
                      sx={{ '&:hover': { bgcolor: 'primary.50' } }}
                    >
                      <ListItemIcon>
                        <AddIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText primary={fieldName} />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            )}

            {/* Custom Field Creation */}
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Create Custom Field</Typography>
              {showCustomFieldInput ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <TextField
                    size="small"
                    placeholder="Enter field name"
                    value={customFieldName}
                    onChange={(e) => setCustomFieldName(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleAddCustomField();
                      }
                    }}
                    autoFocus
                  />
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={handleAddCustomField}
                      disabled={!customFieldName.trim()}
                    >
                      Add
                    </Button>
                    <Button
                      size="small"
                      onClick={() => {
                        setShowCustomFieldInput(false);
                        setCustomFieldName('');
                      }}
                    >
                      Cancel
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => setShowCustomFieldInput(true)}
                  fullWidth
                >
                  Add Custom Field
                </Button>
              )}
            </Box>
          </Box>
        </Paper>

        {/* Center Panel - Canvas and Controls */}
        <Box sx={{ flexGrow: 1, p: 3, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Label Preview */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <Typography variant="h6">
                Label Preview ({paperConfig.name})
              </Typography>
              
              {/* Add simple top-to-bottom layout button */}
              <Button 
                variant="outlined" 
                size="small"
                onClick={arrangeFieldsVertically}
                disabled={fields.length === 0}
              >
                Arrange Top to Bottom
              </Button>
              
              {/* Zoom Controls */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
                <Typography variant="body2" color="text.secondary">Zoom:</Typography>
                <Button 
                  size="small" 
                  variant={previewZoom === 1.0 ? 'contained' : 'outlined'}
                  onClick={() => setPreviewZoom(1.0)}
                >
                  100%
                </Button>
                <Button 
                  size="small" 
                  variant={previewZoom === 1.5 ? 'contained' : 'outlined'}
                  onClick={() => setPreviewZoom(1.5)}
                >
                  150%
                </Button>
                <Button 
                  size="small" 
                  variant={previewZoom === 2.0 ? 'contained' : 'outlined'}
                  onClick={() => setPreviewZoom(2.0)}
                >
                  200%
                </Button>
                <Button 
                  size="small" 
                  variant={previewZoom === 3.0 ? 'contained' : 'outlined'}
                  onClick={() => setPreviewZoom(3.0)}
                >
                  300%
                </Button>
              </Box>
              
              {/* Canvas Rotation Controls */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">Rotate:</Typography>
                <Button 
                  size="small" 
                  variant={previewRotation === 0 ? 'contained' : 'outlined'}
                  onClick={() => setPreviewRotation(0)}
                  sx={{ minWidth: '40px' }}
                >
                  0°
                </Button>
                <Button 
                  size="small" 
                  variant={previewRotation === 90 ? 'contained' : 'outlined'}
                  onClick={() => setPreviewRotation(90)}
                  sx={{ minWidth: '40px' }}
                >
                  90°
                </Button>
                <Button 
                  size="small" 
                  variant={previewRotation === 180 ? 'contained' : 'outlined'}
                  onClick={() => setPreviewRotation(180)}
                  sx={{ minWidth: '40px' }}
                >
                  180°
                </Button>
                <Button 
                  size="small" 
                  variant={previewRotation === 270 ? 'contained' : 'outlined'}
                  onClick={() => setPreviewRotation(270)}
                  sx={{ minWidth: '40px' }}
                >
                  270°
                </Button>
              </Box>
            </Box>
            
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '20px',
                // Add scroll capability for larger canvases
                overflow: 'auto',
                maxWidth: '100%',
                maxHeight: '70vh',
                bgcolor: '#f5f5f5',
                borderRadius: 1,
                // Container dimensions swap when canvas is rotated 90° or 270°
                width: previewRotation === 90 || previewRotation === 270 
                  ? previewDimensions.height + 60 
                  : previewDimensions.width + 60,
                height: previewRotation === 90 || previewRotation === 270 
                  ? previewDimensions.width + 60 
                  : previewDimensions.height + 60,
                minWidth: previewRotation === 90 || previewRotation === 270 
                  ? previewDimensions.height + 60 
                  : previewDimensions.width + 60,
                minHeight: previewRotation === 90 || previewRotation === 270 
                  ? previewDimensions.width + 60 
                  : previewDimensions.height + 60,
                transition: 'all 0.3s ease',
                mx: 'auto' // Center the box
              }}
            >
              <Paper
                ref={canvasRef}
                sx={{
                  // Use the actual preview dimensions (PDF size * zoom)
                  width: previewDimensions.width,
                  height: previewDimensions.height,
                  minWidth: previewDimensions.width,
                  minHeight: previewDimensions.height,
                  position: 'relative',
                  border: 2,
                  borderColor: 'primary.main',
                  borderStyle: 'solid',
                  bgcolor: 'white',
                  overflow: 'visible', // No boundaries
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  // Add subtle grid pattern to show it's a design surface
                  backgroundImage: 'linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)',
                  backgroundSize: `${10 * previewDimensions.scale}px ${10 * previewDimensions.scale}px`,
                  // Apply preview rotation
                  transform: `rotate(${previewRotation}deg)`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.3s ease'
                }}
              >
              {fields.map((field) => {
                // Calculate preview position from canvas coordinates
                // In generatePreviewImage, the position is: x, y + fontSize
                // We need to match this for accurate positioning
                const previewX = field.position.x * previewDimensions.scale;
                // Add fontSize offset to Y, matching generatePreviewImage behavior
                const yWithFontOffset = field.position.y + (field.fontSize || 10);
                const previewY = yWithFontOffset * previewDimensions.scale;
                
                // Don't use bounds - they interfere with the coordinate system
                // We handle clamping in handleFieldDrag instead
                const bounds = undefined;
                
                // Calculate the font size for preview (scaled from canvas font size)
                const previewFontSize = field.fontSize * previewDimensions.fontScale;
                
                // Simple rotation only - no alignment transform
                // The position (x, y) is the anchor point
                // Rotation is applied around the anchor point
                const rotation = field.rotation || 0;
                // Negate rotation to match PDF (PDF uses counter-clockwise positive)
                const cssRotation = -rotation;
                
                const getTransform = () => {
                  return `rotate(${cssRotation}deg)`;
                };
                
                const getTransformOrigin = () => {
                  return 'left top';
                };
                
                return (
                <Draggable
                  key={field.id}
                  position={{
                    x: previewX,
                    y: previewY
                  }}
                  onStop={(_, data) => handleFieldDrag(field.id, data)}
                  bounds={bounds as any}
                  nodeRef={getFieldRef(field.id)}
                >
                  <Box
                    ref={getFieldRef(field.id)}
                    onClick={() => setSelectedField(field)}
                    sx={{
                      position: 'absolute',
                      cursor: 'move',
                    }}
                    data-rotation={field.rotation || 0}
                  >
                    {/* Transform container - applies rotation only */}
                    <Box
                      sx={{
                        display: 'inline-block',
                        transform: getTransform(),
                        transformOrigin: getTransformOrigin(),
                      }}
                    >
                      {/* Visual container for selection highlight */}
                      <Box
                        sx={{
                          padding: '1px 2px',
                          border: selectedField?.id === field.id ? 2 : 1,
                          borderColor: selectedField?.id === field.id ? 'primary.main' : 'transparent',
                          borderStyle: 'solid',
                          borderRadius: 0.5,
                          bgcolor: selectedField?.id === field.id ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
                          display: 'inline-block',
                          '&:hover': {
                            bgcolor: 'rgba(0,0,0,0.04)',
                            borderColor: 'grey.400'
                          }
                        }}
                      >
                        {/* Text content - font size matches PDF output */}
                        <Typography
                          component="span"
                          sx={{
                            fontSize: `${previewFontSize}px`,
                            fontFamily: field.fontFamily,
                            color: field.color,
                            whiteSpace: 'nowrap',
                            userSelect: 'none',
                            pointerEvents: 'none',
                            display: 'block',
                            lineHeight: 1.2
                          }}
                        >
                          {field.value || field.name}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Rotation Handle - only show when field is selected */}
                    {selectedField?.id === field.id && (
                      <Box
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          const fieldElement = getFieldRef(field.id).current;
                          if (!fieldElement) return;

                          const fieldRect = fieldElement.getBoundingClientRect();
                          const centerX = fieldRect.left + fieldRect.width / 2;
                          const centerY = fieldRect.top + fieldRect.height / 2;

                          const rotationHandle = e.currentTarget as HTMLElement;
                          rotationHandle.style.transform = 'scale(1.3)';
                          rotationHandle.style.backgroundColor = '#1976d2';

                          const handleMouseMove = (moveEvent: MouseEvent) => {
                            const deltaX = moveEvent.clientX - centerX;
                            const deltaY = moveEvent.clientY - centerY;
                            let angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
                            
                            if (angle < 0) angle += 360;
                            
                            const snapAngles = [0, 45, 90, 135, 180, 225, 270, 315];
                            const snapTolerance = 8;
                            
                            for (const snapAngle of snapAngles) {
                              if (Math.abs(angle - snapAngle) <= snapTolerance) {
                                angle = snapAngle;
                                break;
                              }
                            }
                            
                            handleUpdateField(field.id, { rotation: Math.round(angle) });
                          };

                          const handleMouseUp = () => {
                            rotationHandle.style.transform = '';
                            rotationHandle.style.backgroundColor = '';
                            
                            document.removeEventListener('mousemove', handleMouseMove);
                            document.removeEventListener('mouseup', handleMouseUp);
                          };

                          document.addEventListener('mousemove', handleMouseMove);
                          document.addEventListener('mouseup', handleMouseUp);
                        }}
                        sx={{
                          position: 'absolute',
                          top: -10,
                          right: -10,
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          bgcolor: 'primary.main',
                          border: 2,
                          borderColor: 'white',
                          cursor: 'grab',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          color: 'white',
                          fontWeight: 'bold',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                          zIndex: 10,
                          '&:hover': {
                            bgcolor: 'primary.dark',
                            transform: 'scale(1.2)'
                          }
                        }}
                      >
                        ↻
                      </Box>
                    )}

                    {/* Rotation indicator */}
                    {field.rotation !== undefined && field.rotation !== 0 && (
                      <Typography variant="caption" sx={{ 
                        position: 'absolute', 
                        bottom: -14, 
                        left: 0,
                        fontSize: '9px',
                        bgcolor: 'rgba(0,0,0,0.7)',
                        color: 'white',
                        padding: '1px 4px',
                        borderRadius: '2px',
                        whiteSpace: 'nowrap'
                      }}>
                        {Math.round(field.rotation)}°
                      </Typography>
                    )}
                  </Box>
                </Draggable>
                );
              })}
              
              {fields.length === 0 && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    color: 'text.secondary'
                  }}
                >
                  <Typography variant="body2">
                    Add fields from the left panel
                  </Typography>
                </Box>
              )}
            </Paper>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Drag fields to reposition • Click field to edit properties
              {previewRotation !== 0 && ` • Canvas rotated ${previewRotation}° for easier editing`}
            </Typography>
            
            {/* Scale Info */}
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              Preview at {Math.round(previewZoom * 100)}% • Label size: {paperConfig.width}{paperConfig.unit === 'mm' ? 'mm' : '"'} × {paperConfig.height}{paperConfig.unit === 'mm' ? 'mm' : '"'}
            </Typography>
            
            {/* Debug info */}
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              Canvas: {canvasWidth}×{canvasHeight} | Preview: {Math.round(previewDimensions.width)}×{Math.round(previewDimensions.height)}px | Scale: {previewDimensions.scale.toFixed(2)}
            </Typography>
            {selectedField && (
              <Typography variant="caption" color="primary" sx={{ display: 'block' }}>
                Selected: "{selectedField.name}" at canvas ({Math.round(selectedField.position.x)}, {Math.round(selectedField.position.y)}) → preview ({Math.round(selectedField.position.x * previewDimensions.scale)}px, {Math.round(selectedField.position.y * previewDimensions.scale)}px)
              </Typography>
            )}
            {fields.length > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '10px' }}>
                Fields Y range: {Math.round(Math.min(...fields.map(f => f.position.y)))} to {Math.round(Math.max(...fields.map(f => f.position.y)))}
              </Typography>
            )}
          </Box>

          {/* Fields List and Properties Side by Side */}
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            {/* Fields List */}
            <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column', maxHeight: '400px' }}>
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
                <Typography variant="h6">Fields on Label ({fields.length})</Typography>
              </Box>
              
              <List sx={{ flexGrow: 1, overflow: 'auto', minHeight: 0 }}>
                {fields.map((field) => (
                  <ListItem
                    key={field.id}
                    sx={{ 
                      borderBottom: 1, 
                      borderColor: 'divider',
                      p: 0
                    }}
                  >
                    <ListItemButton
                      selected={selectedField?.id === field.id}
                      onClick={() => setSelectedField(field)}
                      sx={{ 
                        '&.Mui-selected': {
                          bgcolor: 'primary.50'
                        }
                      }}
                    >
                      <ListItemIcon>
                        <DragIcon />
                      </ListItemIcon>
                      <ListItemText 
                        primary={field.name}
                        secondary={`${field.fontSize}pt • ${Math.round(field.position.x)}, ${Math.round(field.position.y)} • ${field.textAlign} • ${field.rotation || 0}°`}
                      />
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteField(field.id);
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Paper>

            {/* Field Properties */}
            {selectedField && (
              <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column', maxHeight: '400px' }}>
                <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
                  <Typography variant="h6">Field Properties</Typography>
                  <Typography variant="subtitle2" color="text.secondary">
                    {selectedField.name}
                  </Typography>
                </Box>
                
                <Box sx={{ p: 2, flexGrow: 1, overflow: 'auto', minHeight: 0 }}>
                  <TextField
                    fullWidth
                    label="Preview Value"
                    value={selectedField.value || ''}
                    onChange={(e) => handleUpdateField(selectedField.id, { value: e.target.value })}
                    size="small"
                    sx={{ mb: 2 }}
                  />

                  {/* Show in Form Toggle */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, p: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Box>
                      <Typography variant="subtitle2">Show in Form</Typography>
                      <Typography variant="caption" color="text.secondary">
                        When enabled, users will be prompted to fill this field when creating labels
                      </Typography>
                    </Box>
                    <Switch
                      checked={selectedField.showInForm !== false} // Default to true if undefined
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdateField(selectedField.id, { showInForm: e.target.checked })}
                      color="primary"
                    />
                  </Box>

                  {/* Position Controls */}
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Position (canvas units)</Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <TextField
                      label="X"
                      type="number"
                      size="small"
                      value={Math.round(selectedField.position.x)}
                      onChange={(e) => handlePositionChange(selectedField.id, 'x', parseInt(e.target.value) || 0)}
                      inputProps={{ min: 0, max: canvasWidth - 10, step: 5 }}
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      label="Y"
                      type="number"
                      size="small"
                      value={Math.round(selectedField.position.y)}
                      onChange={(e) => handlePositionChange(selectedField.id, 'y', parseInt(e.target.value) || 0)}
                      inputProps={{ min: 0, max: canvasHeight - 10, step: 5 }}
                      sx={{ flex: 1 }}
                    />
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                    Canvas: {canvasWidth} × {canvasHeight} units
                  </Typography>

                  {/* Font Family */}
                  <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                    <InputLabel>Font Family</InputLabel>
                    <Select
                      value={selectedField.fontFamily}
                      onChange={(e) => handleUpdateField(selectedField.id, { fontFamily: e.target.value })}
                      label="Font Family"
                    >
                      {FONT_FAMILIES.map((font) => (
                        <MenuItem key={font} value={font} sx={{ fontFamily: font }}>
                          {font}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {/* Font Size */}
                  <Typography gutterBottom>Font Size: {selectedField.fontSize}pt (PDF size)</Typography>
                  <Slider
                    value={selectedField.fontSize}
                    onChange={(_, value) => handleUpdateField(selectedField.id, { fontSize: value as number })}
                    min={6}
                    max={32}
                    marks={[
                      { value: 6, label: '6pt' },
                      { value: 12, label: '12pt' },
                      { value: 18, label: '18pt' },
                      { value: 24, label: '24pt' },
                      { value: 32, label: '32pt' }
                    ]}
                    step={1}
                    sx={{ mb: 2 }}
                  />

                  {/* Text Alignment */}
                  <Typography gutterBottom>Text Alignment</Typography>
                  <ToggleButtonGroup
                    value={selectedField.textAlign}
                    exclusive
                    onChange={(_, value) => {
                      if (value) handleUpdateField(selectedField.id, { textAlign: value });
                    }}
                    size="small"
                    fullWidth
                    sx={{ mb: 2 }}
                  >
                    <ToggleButton value="left">
                      <FormatAlignLeft />
                    </ToggleButton>
                    <ToggleButton value="center">
                      <FormatAlignCenter />
                    </ToggleButton>
                    <ToggleButton value="right">
                      <FormatAlignRight />
                    </ToggleButton>
                  </ToggleButtonGroup>

                  {/* Text Rotation - Keep simple for portrait mode */}
                  <Typography gutterBottom>Text Rotation</Typography>
                  <ToggleButtonGroup
                    value={selectedField.rotation || 0}
                    exclusive
                    onChange={(_, value) => {
                      if (value !== null) {
                        handleUpdateField(selectedField.id, { rotation: value });
                      }
                    }}
                    size="small"
                    fullWidth
                    sx={{ mb: 2 }}
                  >
                    <ToggleButton value={0}>
                      Normal
                    </ToggleButton>
                    <ToggleButton value={90}>
                      90° CW
                    </ToggleButton>
                  </ToggleButtonGroup>

                  {/* Color */}
                  <TextField
                    fullWidth
                    label="Text Color"
                    type="color"
                    value={selectedField.color}
                    onChange={(e) => handleUpdateField(selectedField.id, { color: e.target.value })}
                    size="small"
                    sx={{ mb: 2 }}
                  />

                  {/* Quick Position Buttons */}
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Quick Position</Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0.5, mb: 2 }}>
                    {(() => {
                      // Calculate positions in canvas coordinate space
                      const margin = 10;
                      const usableWidth = canvasWidth - (2 * margin);
                      const usableHeight = canvasHeight - (2 * margin);
                      
                      // 3 columns: Left, Center, Right
                      const leftX = margin;
                      const centerX = canvasWidth / 2;
                      const rightX = canvasWidth - margin;
                      
                      // 3 rows: Top, Middle, Bottom
                      const topY = margin;
                      const middleY = canvasHeight / 2;
                      const bottomY = canvasHeight - margin - 15; // Account for text height
                      
                      return (
                        <>
                          {/* Top Row */}
                          <Button size="small" variant="outlined" onClick={() => handleUpdateField(selectedField.id, { position: { x: leftX, y: topY }, textAlign: 'left' })}>
                            ↖ Top Left
                          </Button>
                          <Button size="small" variant="outlined" onClick={() => handleUpdateField(selectedField.id, { position: { x: centerX, y: topY }, textAlign: 'center' })}>
                            ↑ Top Center
                          </Button>
                          <Button size="small" variant="outlined" onClick={() => handleUpdateField(selectedField.id, { position: { x: rightX, y: topY }, textAlign: 'right' })}>
                            ↗ Top Right
                          </Button>
                          
                          {/* Middle Row */}
                          <Button size="small" variant="outlined" onClick={() => handleUpdateField(selectedField.id, { position: { x: leftX, y: middleY }, textAlign: 'left' })}>
                            ← Mid Left
                          </Button>
                          <Button size="small" variant="outlined" onClick={() => handleUpdateField(selectedField.id, { position: { x: centerX, y: middleY }, textAlign: 'center' })}>
                            ● Center
                          </Button>
                          <Button size="small" variant="outlined" onClick={() => handleUpdateField(selectedField.id, { position: { x: rightX, y: middleY }, textAlign: 'right' })}>
                            → Mid Right
                          </Button>
                          
                          {/* Bottom Row */}
                          <Button size="small" variant="outlined" onClick={() => handleUpdateField(selectedField.id, { position: { x: leftX, y: bottomY }, textAlign: 'left' })}>
                            ↙ Bottom Left
                          </Button>
                          <Button size="small" variant="outlined" onClick={() => handleUpdateField(selectedField.id, { position: { x: centerX, y: bottomY }, textAlign: 'center' })}>
                            ↓ Bottom Center
                          </Button>
                          <Button size="small" variant="outlined" onClick={() => handleUpdateField(selectedField.id, { position: { x: rightX, y: bottomY }, textAlign: 'right' })}>
                            ↘ Bottom Right
                          </Button>
                        </>
                      );
                    })()}
                  </Box>

                  <Button
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => handleDeleteField(selectedField.id)}
                    fullWidth
                    sx={{ mt: 1 }}
                  >
                    Delete Field
                  </Button>
                </Box>
              </Paper>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default LabelEditor; 