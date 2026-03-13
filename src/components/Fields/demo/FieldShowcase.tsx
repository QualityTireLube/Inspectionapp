/**
 * Field Showcase Demo
 * 
 * Comprehensive demonstration of all normalized field components
 * Shows different configurations and use cases
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Divider,
  Card,
  CardHeader,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  NormalizedFieldTemplate,
  ImageVideoField,
  VinField,
  ChipField,
  MileageField,
  TireField,
  BrakeField
} from '../';

export const FieldShowcase: React.FC = () => {
  const [demoValues, setDemoValues] = useState<Record<string, any>>({
    images: [],
    vin: '',
    condition: '',
    conditions: [],
    mileage: '',
    frontLeftTire: null,
    frontLeftBrake: null
  });

  const [showCode, setShowCode] = useState<string | null>(null);

  const updateValue = (field: string, value: any) => {
    setDemoValues(prev => ({ ...prev, [field]: value }));
  };

  const conditionOptions = [
    { value: 'good', label: '✅ Good' },
    { value: 'warning', label: '⚠️ Warning' },
    { value: 'bad', label: '❌ Bad' },
    { value: 'replace', label: '🔄 Replace' },
    { value: 'not_applicable', label: '➖ N/A' }
  ];

  const showcaseItems = [
    {
      title: 'Basic Normalized Template',
      description: 'Standard template with all icons and Dually button',
      component: (
        <NormalizedFieldTemplate
          label="Basic Field Template"
          description="This shows the standard field template with all features"
          showDuallyButton={true}
          duallyLabel="Config"
          onCameraClick={() => alert('Camera clicked!')}
          onPhotoAlbumClick={() => alert('Photo album clicked!')}
          onTextboxClick={() => alert('Textbox clicked!')}
          onInfoClick={() => alert('Info clicked!')}
          onDuallyClick={() => alert('Dually clicked!')}
        >
          <Typography variant="body2" sx={{ p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
            This is the content area where field-specific components go.
            The template provides consistent header layout with configurable icons and actions.
          </Typography>
        </NormalizedFieldTemplate>
      ),
      code: `<NormalizedFieldTemplate
  label="Basic Field Template"
  description="Standard template with all features"
  showDuallyButton={true}
  duallyLabel="Config"
  onCameraClick={() => alert('Camera!')}
  onPhotoAlbumClick={() => alert('Photo album!')}
  onTextboxClick={() => alert('Textbox!')}
  onInfoClick={() => alert('Info!')}
  onDuallyClick={() => alert('Dually!')}
>
  <YourContentHere />
</NormalizedFieldTemplate>`
    },
    {
      title: 'Image/Video Field',
      description: 'Rectangular upload field for images and videos',
      component: (
        <ImageVideoField
          label="Dashboard Images"
          description="Upload photos of dashboard warning lights"
          value={demoValues.images}
          onChange={(value) => updateValue('images', value)}
          allowVideo={true}
          allowMultiple={true}
          maxFiles={5}
          aspectRatio={16/9}
          uploadHeight={180}
        />
      ),
      code: `<ImageVideoField
  label="Dashboard Images"
  description="Upload photos of dashboard warning lights"
  value={images}
  onChange={setImages}
  allowVideo={true}
  allowMultiple={true}
  maxFiles={5}
  aspectRatio={16/9}
  uploadHeight={180}
/>`
    },
    {
      title: 'VIN Field',
      description: 'Advanced VIN input with OCR, QR scanner, and API decoding',
      component: (
        <VinField
          label="Vehicle VIN"
          description="17-character vehicle identification number"
          value={demoValues.vin}
          onChange={(value) => updateValue('vin', value)}
          enableOcr={true}
          enableQrScanner={true}
          enableApiLookup={true}
          onVinDecoded={(data) => console.log('VIN decoded:', data)}
        />
      ),
      code: `<VinField
  label="Vehicle VIN"
  description="17-character vehicle identification number"
  value={vin}
  onChange={setVin}
  enableOcr={true}
  enableQrScanner={true}
  enableApiLookup={true}
  onVinDecoded={(data) => console.log('Decoded:', data)}
/>`
    },
    {
      title: 'Single Select Chip Field',
      description: 'Single selection chip interface',
      component: (
        <ChipField
          label="Condition Assessment"
          description="Select the overall condition"
          value={demoValues.condition}
          onChange={(value) => updateValue('condition', value)}
          options={conditionOptions}
          multiple={false}
          chipColor="primary"
          enableAddCustom={true}
        />
      ),
      code: `<ChipField
  label="Condition Assessment"
  description="Select the overall condition"
  value={condition}
  onChange={setCondition}
  options={conditionOptions}
  multiple={false}
  chipColor="primary"
  enableAddCustom={true}
/>`
    },
    {
      title: 'Multi-Select Chip Field',
      description: 'Multiple selection with custom options',
      component: (
        <ChipField
          label="Multiple Issues"
          description="Select all that apply (max 3)"
          value={demoValues.conditions}
          onChange={(value) => updateValue('conditions', value)}
          options={conditionOptions}
          multiple={true}
          maxSelection={3}
          showCount={true}
          enableAddCustom={true}
          chipVariant="outlined"
        />
      ),
      code: `<ChipField
  label="Multiple Issues"
  description="Select all that apply (max 3)"
  value={conditions}
  onChange={setConditions}
  options={conditionOptions}
  multiple={true}
  maxSelection={3}
  showCount={true}
  enableAddCustom={true}
  chipVariant="outlined"
/>`
    },
    {
      title: 'Mileage Field',
      description: 'Comma-formatted number input with numpad',
      component: (
        <MileageField
          label="Vehicle Mileage"
          description="Current odometer reading"
          value={demoValues.mileage}
          onChange={(value) => updateValue('mileage', value)}
          maxValue={500000}
          showNumpad={true}
          autoFormat={true}
          placeholder="000,000"
        />
      ),
      code: `<MileageField
  label="Vehicle Mileage"
  description="Current odometer reading"
  value={mileage}
  onChange={setMileage}
  maxValue={500000}
  showNumpad={true}
  autoFormat={true}
  placeholder="000,000"
/>`
    },
    {
      title: 'Tire Field',
      description: 'Specialized tire inspection with SVG visualization',
      component: (
        <TireField
          label="Front Left Tire"
          description="Complete tire assessment"
          value={demoValues.frontLeftTire}
          onChange={(value) => updateValue('frontLeftTire', value)}
          position="front-left"
          showPressure={true}
          showBrand={true}
          showDateCode={true}
          enableSvgVisualization={true}
        />
      ),
      code: `<TireField
  label="Front Left Tire"
  description="Complete tire assessment"
  value={tireData}
  onChange={setTireData}
  position="front-left"
  showPressure={true}
  showBrand={true}
  showDateCode={true}
  enableSvgVisualization={true}
/>`
    },
    {
      title: 'Brake Field',
      description: 'Specialized brake inspection with SVG visualization',
      component: (
        <BrakeField
          label="Front Left Brake"
          description="Complete brake system assessment"
          value={demoValues.frontLeftBrake}
          onChange={(value) => updateValue('frontLeftBrake', value)}
          position="front-left"
          defaultType="disc"
          showRotorMeasurement={true}
          showFluidLevel={true}
        />
      ),
      code: `<BrakeField
  label="Front Left Brake"
  description="Complete brake system assessment"
  value={brakeData}
  onChange={setBrakeData}
  position="front-left"
  defaultType="disc"
  showRotorMeasurement={true}
  showFluidLevel={true}
/>`
    }
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" gutterBottom>
          🎯 Normalized Field Components Showcase
        </Typography>
        <Typography variant="h6" color="textSecondary" paragraph>
          Complete demonstration of the standardized field template system with consistent layouts,
          configurable icons, Dually buttons, and specialized content types.
        </Typography>
        
        <Paper sx={{ p: 2, backgroundColor: '#f8f9fa' }}>
          <Typography variant="body2" color="textSecondary">
            <strong>Features:</strong> Consistent header layout • Camera integration • Photo album access • 
            Text input dialog • Info popup • Customizable Dually button • Specialized content types
          </Typography>
        </Paper>
      </Box>

      {/* Field Showcases */}
      <Grid container spacing={4}>
        {showcaseItems.map((item, index) => (
          <Grid size={{ xs: 12, lg: 6 }} key={index}>
            <Card sx={{ height: '100%' }}>
              <CardHeader
                title={item.title}
                subheader={item.description}
                action={
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setShowCode(item.code)}
                  >
                    View Code
                  </Button>
                }
              />
              <Divider />
              <CardContent>
                {item.component}
              </CardContent>
            </Card>
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

export default FieldShowcase;
