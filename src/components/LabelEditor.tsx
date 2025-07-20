import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  TextField,
  FormControl,
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
  FormatAlignRight
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
  const [paperSize, setPaperSize] = useState<'Brother-QL800' | 'Dymo-TwinTurbo' | '29mmx90mm'>('Brother-QL800');
  const [copies, setCopies] = useState(1);
  const [fields, setFields] = useState<LabelField[]>([]);
  const [selectedField, setSelectedField] = useState<LabelField | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // New state for custom field creation
  const [customFieldName, setCustomFieldName] = useState('');
  const [showCustomFieldInput, setShowCustomFieldInput] = useState(false);

  const { setError: setStoreError } = useLabelStore();

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
    } else {
      // Initialize with defaults
      setLabelName('');
      setPaperSize('Brother-QL800');
      setCopies(1);
      setFields([]);
    }
  }, [template]);

  const paperConfig = PAPER_SIZES[paperSize];
  const canvasWidth = 400;
  const canvasHeight = Math.round((paperConfig.height / paperConfig.width) * canvasWidth);

  const handleAddField = (fieldName: string) => {
    const newField: LabelField = {
      id: uuidv4(),
      name: fieldName,
      position: { x: 10, y: 30 },
      fontSize: 12,
      fontFamily: 'Arial',
      textAlign: 'left',
      color: '#000000',
      value: fieldName,
      showInForm: true // Default to true for new fields
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
    setFields(fields.map(field => 
      field.id === fieldId ? { ...field, ...updates } : field
    ));
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

  const handleFieldDrag = (fieldId: string, data: { x: number; y: number }) => {
    const newPosition = { x: data.x, y: data.y };
    handleUpdateField(fieldId, { position: newPosition });
  };

  // New handler for manual position updates
  const handlePositionChange = (fieldId: string, axis: 'x' | 'y', value: number) => {
    const clampedValue = Math.max(0, Math.min(value, axis === 'x' ? canvasWidth - 50 : canvasHeight - 20));
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

      if (template) {
        // Update existing template
        await LabelApiService.updateTemplate(template.id, {
          labelName: labelName.trim(),
          fields,
          paperSize,
          width: canvasWidth,
          height: canvasHeight,
          copies
        });
      } else {
        // Create new template
        await LabelApiService.createTemplate({
          labelName: labelName.trim(),
          fields,
          paperSize,
          width: canvasWidth,
          height: canvasHeight,
          copies,
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

      // Create a temporary template for preview
      const tempTemplate: LabelTemplate = {
        id: 'preview',
        labelName,
        fields,
        paperSize,
        width: canvasWidth,
        height: canvasHeight,
        copies,
        archived: false,
        createdBy: 'Preview',
        createdDate: new Date().toISOString()
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
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
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
      <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        {/* Left Panel - Settings and Available Fields Only */}
        <Paper sx={{ width: 300, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
                onChange={(e) => setPaperSize(e.target.value as 'Brother-QL800' | 'Dymo-TwinTurbo' | '29mmx90mm')}
                label="Paper Size"
              >
                {Object.entries(PAPER_SIZES).map(([key, config]) => (
                  <MenuItem key={key} value={key}>
                    {config.name} ({config.width} x {config.height} {config.unit})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

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
        <Box sx={{ flexGrow: 1, p: 3, display: 'flex', flexDirection: 'column' }}>
          {/* Label Preview */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Label Preview ({paperConfig.name})
            </Typography>
            
            <Paper
              ref={canvasRef}
              sx={{
                width: canvasWidth,
                height: canvasHeight,
                position: 'relative',
                border: 2,
                borderColor: 'primary.main',
                borderStyle: 'dashed',
                bgcolor: 'white',
                overflow: 'hidden'
              }}
            >
              {fields.map((field) => (
                <Draggable
                  key={field.id}
                  position={field.position}
                  onStop={(_, data) => handleFieldDrag(field.id, data)}
                  bounds="parent"
                >
                  <Box
                    onClick={() => setSelectedField(field)}
                    sx={{
                      position: 'absolute',
                      cursor: 'move',
                      padding: '2px 4px',
                      border: selectedField?.id === field.id ? 2 : 1,
                      borderColor: selectedField?.id === field.id ? 'primary.main' : 'transparent',
                      borderStyle: 'solid',
                      borderRadius: 1,
                      bgcolor: selectedField?.id === field.id ? 'primary.50' : 'transparent',
                      fontSize: `${field.fontSize}px`,
                      fontFamily: field.fontFamily,
                      color: field.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: field.textAlign === 'center' ? 'center' : field.textAlign === 'right' ? 'flex-end' : 'flex-start',
                      minWidth: '50px',
                      '&:hover': {
                        bgcolor: 'grey.100',
                        borderColor: 'grey.400'
                      }
                    }}
                  >
                    {field.value || field.name}
                  </Box>
                </Draggable>
              ))}
              
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

            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Drag fields to reposition • Click field to edit properties
            </Typography>
          </Box>

          {/* Fields List and Properties Side by Side */}
          <Box sx={{ display: 'flex', gap: 2, flexGrow: 1, minHeight: 0 }}>
            {/* Fields List */}
            <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
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
                        secondary={`${field.fontSize}px • ${field.position.x}, ${field.position.y} • ${field.textAlign}`}
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
              <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
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
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Position</Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <TextField
                      label="X Position"
                      type="number"
                      size="small"
                      value={selectedField.position.x}
                      onChange={(e) => handlePositionChange(selectedField.id, 'x', parseInt(e.target.value) || 0)}
                      inputProps={{ min: 0, max: canvasWidth - 50 }}
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      label="Y Position"
                      type="number"
                      size="small"
                      value={selectedField.position.y}
                      onChange={(e) => handlePositionChange(selectedField.id, 'y', parseInt(e.target.value) || 0)}
                      inputProps={{ min: 0, max: canvasHeight - 20 }}
                      sx={{ flex: 1 }}
                    />
                  </Box>

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
                  <Typography gutterBottom>Font Size: {selectedField.fontSize}px</Typography>
                  <Slider
                    value={selectedField.fontSize}
                    onChange={(_, value) => handleUpdateField(selectedField.id, { fontSize: value as number })}
                    min={6}
                    max={32}
                    marks={[
                      { value: 6, label: '6px' },
                      { value: 12, label: '12px' },
                      { value: 18, label: '18px' },
                      { value: 24, label: '24px' },
                      { value: 32, label: '32px' }
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
                      // Calculate equally spaced positions
                      const margin = 10;
                      const usableWidth = canvasWidth - (2 * margin);
                      const usableHeight = canvasHeight - (2 * margin);
                      
                      // 3 columns: Left, Middle, Right
                      const leftX = margin;
                      const middleX = margin + (usableWidth / 2);
                      const rightX = margin + usableWidth - 50; // Account for text width
                      
                      // 5 rows: Top, Upper, Mid, Lower, Bottom
                      const topY = margin;
                      const upperY = margin + (usableHeight * 1/4);
                      const midY = margin + (usableHeight * 2/4);
                      const lowerY = margin + (usableHeight * 3/4);
                      const bottomY = margin + usableHeight - 20; // Account for text height
                      
                      return (
                        <>
                          {/* Top Row */}
                          <Button size="small" onClick={() => handleUpdateField(selectedField.id, { position: { x: Math.round(leftX), y: Math.round(topY) }, textAlign: 'left' })}>
                            Top Left
                          </Button>
                          <Button size="small" onClick={() => handleUpdateField(selectedField.id, { position: { x: Math.round(middleX), y: Math.round(topY) }, textAlign: 'center' })}>
                            Top Middle
                          </Button>
                          <Button size="small" onClick={() => handleUpdateField(selectedField.id, { position: { x: Math.round(rightX), y: Math.round(topY) }, textAlign: 'right' })}>
                            Top Right
                          </Button>
                          
                          {/* Upper Row */}
                          <Button size="small" onClick={() => handleUpdateField(selectedField.id, { position: { x: Math.round(leftX), y: Math.round(upperY) }, textAlign: 'left' })}>
                            Upper Left
                          </Button>
                          <Button size="small" onClick={() => handleUpdateField(selectedField.id, { position: { x: Math.round(middleX), y: Math.round(upperY) }, textAlign: 'center' })}>
                            Upper Middle
                          </Button>
                          <Button size="small" onClick={() => handleUpdateField(selectedField.id, { position: { x: Math.round(rightX), y: Math.round(upperY) }, textAlign: 'right' })}>
                            Upper Right
                          </Button>
                          
                          {/* Mid Row */}
                          <Button size="small" onClick={() => handleUpdateField(selectedField.id, { position: { x: Math.round(leftX), y: Math.round(midY) }, textAlign: 'left' })}>
                            Mid Left
                          </Button>
                          <Button size="small" onClick={() => handleUpdateField(selectedField.id, { position: { x: Math.round(middleX), y: Math.round(midY) }, textAlign: 'center' })}>
                            Mid Middle
                          </Button>
                          <Button size="small" onClick={() => handleUpdateField(selectedField.id, { position: { x: Math.round(rightX), y: Math.round(midY) }, textAlign: 'right' })}>
                            Mid Right
                          </Button>
                          
                          {/* Lower Row */}
                          <Button size="small" onClick={() => handleUpdateField(selectedField.id, { position: { x: Math.round(leftX), y: Math.round(lowerY) }, textAlign: 'left' })}>
                            Lower Left
                          </Button>
                          <Button size="small" onClick={() => handleUpdateField(selectedField.id, { position: { x: Math.round(middleX), y: Math.round(lowerY) }, textAlign: 'center' })}>
                            Lower Middle
                          </Button>
                          <Button size="small" onClick={() => handleUpdateField(selectedField.id, { position: { x: Math.round(rightX), y: Math.round(lowerY) }, textAlign: 'right' })}>
                            Lower Right
                          </Button>
                          
                          {/* Bottom Row */}
                          <Button size="small" onClick={() => handleUpdateField(selectedField.id, { position: { x: Math.round(leftX), y: Math.round(bottomY) }, textAlign: 'left' })}>
                            Bottom Left
                          </Button>
                          <Button size="small" onClick={() => handleUpdateField(selectedField.id, { position: { x: Math.round(middleX), y: Math.round(bottomY) }, textAlign: 'center' })}>
                            Bottom Middle
                          </Button>
                          <Button size="small" onClick={() => handleUpdateField(selectedField.id, { position: { x: Math.round(rightX), y: Math.round(bottomY) }, textAlign: 'right' })}>
                            Bottom Right
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