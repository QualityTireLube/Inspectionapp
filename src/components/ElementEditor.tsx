import React from 'react';
import {
  Box,
  Typography,
  TextField,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Slider,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import Grid from './CustomGrid';
import { StickerElement, StickerSettings } from '../types/stickers';
import StickerPreview from './StickerPreview';

interface ElementEditorProps {
  element: StickerElement;
  onChange: (element: StickerElement) => void;
  allElements?: StickerElement[];
  settings?: StickerSettings;
}

const ElementEditor: React.FC<ElementEditorProps> = ({ element, onChange, settings }) => {
  const handleChange = (field: keyof StickerElement, value: any) => {
    onChange({ ...element, [field]: value });
  };

  const handlePositionChange = (axis: 'x' | 'y', value: number) => {
    onChange({
      ...element,
      position: { ...element.position, [axis]: value }
    });
  };

  const isCustomElement = element.id.startsWith('custom_');

  // Function to replace placeholders for preview
  const getPreviewContent = (content: string): string => {
    return content.includes('{') ? 
      content.replace('{serviceDate}', '9/19/2025')
        .replace('{serviceMileage}', '137,234')
        .replace('{oilType}', 'Rotella')
        .replace('{companyName}', 'Quality Lube Express')
        .replace('{address}', '3617 Hwy 19 Zachary')
        .replace('{decodedDetails}', '2018 Ford F-150 3.5L 6cyl')
      : content;
  };

  return (
    <Accordion 
      sx={{ 
        border: isCustomElement ? '1px solid #fff9c4' : '1px solid #e0e0e0',
        backgroundColor: isCustomElement ? '#fffde7' : 'white',
        '&:before': { display: 'none' },
        mb: 1
      }}
    >
      <AccordionSummary 
        expandIcon={<ExpandMoreIcon />}
        sx={{ 
          backgroundColor: element.visible ? 'transparent' : 'rgba(0,0,0,0.04)',
          '&:hover': { backgroundColor: 'rgba(0,0,0,0.02)' }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleChange('visible', !element.visible);
            }}
            sx={{ mr: 1 }}
          >
            {element.visible ? <VisibilityIcon color="primary" /> : <VisibilityOffIcon color="disabled" />}
          </IconButton>
          <Typography sx={{ flexGrow: 1, opacity: element.visible ? 1 : 0.5, fontWeight: element.visible ? 'medium' : 'normal' }}>
            {element.label}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {isCustomElement && (
              <Chip label="Custom" size="small" color="warning" variant="outlined" />
            )}
            <Typography variant="caption" color="textSecondary">
              ({element.position.x}%, {element.position.y}%)
            </Typography>
          </Box>
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 2 }}>
        <Grid container spacing={3}>
          {/* Left side - Controls */}
          <Grid item xs={12} md={8}>
            <Grid container spacing={2}>
              {/* Content Preview */}
              <Grid item xs={12}>
                <Box sx={{ 
                  mb: 2, 
                  p: 2, 
                  border: '1px dashed #ccc', 
                  borderRadius: 1, 
                  backgroundColor: '#fafafa',
                  textAlign: element.textAlign,
                  fontSize: `${14 * element.fontSize}px`,
                  fontWeight: element.fontWeight,
                  fontFamily: 'inherit'
                }}>
                  <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1 }}>
                    Text Preview:
                  </Typography>
                  <Box component="span" sx={{ 
                    fontSize: 'inherit', 
                    fontWeight: 'inherit',
                    color: element.visible ? '#000' : '#999'
                  }}>
                    {getPreviewContent(element.content)}
                  </Box>
                </Box>
              </Grid>

              {/* Content */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Content"
                  value={element.content}
                  onChange={(e) => handleChange('content', e.target.value)}
                  helperText="Use {serviceDate}, {serviceMileage}, {oilType}, {companyName}, {address}, {decodedDetails} for dynamic content"
                  multiline
                  maxRows={3}
                  variant="outlined"
                />
              </Grid>

              {/* Visibility */}
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={element.visible}
                      onChange={(e) => handleChange('visible', e.target.checked)}
                      color="primary"
                    />
                  }
                  label={`Element is ${element.visible ? 'visible' : 'hidden'} on sticker`}
                />
              </Grid>

              {/* Position */}
              <Grid item xs={6}>
                <Typography gutterBottom sx={{ fontWeight: 'medium' }}>
                  X Position ({element.position.x}%)
                </Typography>
                <Slider
                  value={element.position.x}
                  onChange={(_, value) => handlePositionChange('x', value as number)}
                  min={0}
                  max={100}
                  step={1}
                  valueLabelDisplay="auto"
                  disabled={!element.visible}
                  color="primary"
                  marks={[
                    { value: 0, label: 'Left' },
                    { value: 50, label: 'Center' },
                    { value: 100, label: 'Right' }
                  ]}
                />
                <TextField
                  size="small"
                  type="number"
                  value={element.position.x}
                  onChange={(e) => handlePositionChange('x', parseInt(e.target.value) || 0)}
                  inputProps={{ min: 0, max: 100 }}
                  disabled={!element.visible}
                  sx={{ mt: 1, width: '80px' }}
                  label="%"
                />
              </Grid>

              <Grid item xs={6}>
                <Typography gutterBottom sx={{ fontWeight: 'medium' }}>
                  Y Position ({element.position.y}%)
                </Typography>
                <Slider
                  value={element.position.y}
                  onChange={(_, value) => handlePositionChange('y', value as number)}
                  min={0}
                  max={100}
                  step={1}
                  valueLabelDisplay="auto"
                  disabled={!element.visible}
                  color="primary"
                  marks={[
                    { value: 0, label: 'Top' },
                    { value: 50, label: 'Middle' },
                    { value: 100, label: 'Bottom' }
                  ]}
                />
                <TextField
                  size="small"
                  type="number"
                  value={element.position.y}
                  onChange={(e) => handlePositionChange('y', parseInt(e.target.value) || 0)}
                  inputProps={{ min: 0, max: 100 }}
                  disabled={!element.visible}
                  sx={{ mt: 1, width: '80px' }}
                  label="%"
                />
              </Grid>

              {/* Font Size */}
              <Grid item xs={6}>
                <Typography gutterBottom sx={{ fontWeight: 'medium' }}>
                  Font Size ({element.fontSize}×)
                </Typography>
                <Slider
                  value={element.fontSize}
                  onChange={(_, value) => handleChange('fontSize', value as number)}
                  min={0.1}
                  max={3.0}
                  step={0.05}
                  valueLabelDisplay="auto"
                  disabled={!element.visible}
                  color="secondary"
                  marks={[
                    { value: 0.1, label: '0.1×' },
                    { value: 0.5, label: '0.5×' },
                    { value: 1.0, label: '1×' },
                    { value: 2.0, label: '2×' },
                    { value: 3.0, label: '3×' }
                  ]}
                />
                <TextField
                  size="small"
                  type="number"
                  value={element.fontSize}
                  onChange={(e) => handleChange('fontSize', parseFloat(e.target.value) || 1)}
                  inputProps={{ min: 0.1, max: 3.0, step: 0.05 }}
                  disabled={!element.visible}
                  sx={{ mt: 1, width: '80px' }}
                  label="×"
                />
              </Grid>

              {/* Font Weight */}
              <Grid item xs={6}>
                <FormControl fullWidth disabled={!element.visible}>
                  <InputLabel>Font Weight</InputLabel>
                  <Select
                    value={element.fontWeight}
                    onChange={(e) => handleChange('fontWeight', e.target.value)}
                    label="Font Weight"
                  >
                    <MenuItem value="normal">Normal</MenuItem>
                    <MenuItem value="bold">Bold</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Text Align */}
              <Grid item xs={12}>
                <FormControl fullWidth disabled={!element.visible}>
                  <InputLabel>Text Alignment</InputLabel>
                  <Select
                    value={element.textAlign}
                    onChange={(e) => handleChange('textAlign', e.target.value)}
                    label="Text Alignment"
                  >
                    <MenuItem value="left">Left</MenuItem>
                    <MenuItem value="center">Center</MenuItem>
                    <MenuItem value="right">Right</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Grid>

          {/* Right side - Live Element Preview with Context */}
          <Grid item xs={12} md={4}>
            <Box sx={{ position: 'sticky', top: 20 }}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                Element in Context
              </Typography>
              
              <Box sx={{ position: 'relative' }}>
                {settings ? (
                  (() => {
                    // Create modified settings with compressed Y positions for better spacing match
                    const previewSettings = {
                      ...settings,
                      paperSize: {
                        ...settings.paperSize,
                        height: settings.paperSize.height * 1
                      },
                      layout: {
                        ...settings.layout,
                        elements: settings.layout.elements.map(element => ({
                          ...element,
                          position: {
                            ...element.position,
                            y: element.position.y * .92 + 2 // Compress Y positions and shift up
                          }
                        }))
                      }
                    };
                    
                    return (
                      <StickerPreview 
                        settings={previewSettings}
                        scale={300 / Math.max(previewSettings.paperSize.width, previewSettings.paperSize.height)}
                        showTitle={false}
                        textScale={0.3}
                        data={{
                          serviceDate: '9/19/2025',
                          serviceMileage: '137,234',
                          oilType: 'Rotella',
                          companyName: 'Quality Lube Express',
                          address: '3617 Hwy 19 Zachary',
                          vin: '1HGBH41JXMN109186',
                          decodedDetails: '2018 Ford F-150 3.5L 6cyl'
                        }}
                      />
                    );
                  })()
                ) : (
                  <Box sx={{ 
                    width: '200px', 
                    height: '270px', 
                    border: '2px solid #e0e0e0', 
                    borderRadius: 2, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    backgroundColor: '#f5f5f5'
                  }}>
                    <Typography variant="caption" color="textSecondary">
                      No settings available
                    </Typography>
                  </Box>
                )}
                
                {/* Overlay to highlight current element */}
                {element.visible && settings && (
                  <>
                    {/* Position indicator crosshairs for current element */}
                    <Box
                      sx={{
                        position: 'absolute',
                        left: `${element.position.x}%`,
                        top: `${((settings.layout.margins.top / settings.paperSize.height) * 100) + (element.position.y / 100) * ((settings.paperSize.height - settings.layout.margins.top - settings.layout.margins.bottom) / settings.paperSize.height) * 100}%`,
                        width: '1px',
                        height: '1px',
                        zIndex: 20
                      }}
                    >
                      {/* Vertical line */}
                      <Box
                        sx={{
                          position: 'absolute',
                          left: '-0.5px',
                          top: '-50px',
                          width: '1px',
                          height: '100px',
                          backgroundColor: '#ff5722',
                          opacity: 0.7,
                          zIndex: 20
                        }}
                      />
                      {/* Horizontal line */}
                      <Box
                        sx={{
                          position: 'absolute',
                          left: '-50px',
                          top: '-0.5px',
                          width: '100px',
                          height: '1px',
                          backgroundColor: '#ff5722',
                          opacity: 0.7,
                          zIndex: 20
                        }}
                      />
                    </Box>
                  </>
                )}
              </Box>

              <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
                <Box component="span" sx={{ color: '#ff5722', fontWeight: 'bold' }}>●</Box> Current Element<br />
                Position: {element.position.x}%, {element.position.y}%<br />
                Size: {element.fontSize}× • {element.fontWeight}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </AccordionDetails>
    </Accordion>
  );
};

export default ElementEditor; 