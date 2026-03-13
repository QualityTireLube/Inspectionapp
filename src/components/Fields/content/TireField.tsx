/**
 * Tire Field Component
 * 
 * Specialized field for tire inspection with SVG visualization
 * Handles tread depth, condition, and visual representation
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import { NormalizedFieldTemplate } from '../base/NormalizedFieldTemplate';
import { BaseFieldProps } from '../base/FieldProps';

export interface TireData {
  position: 'front-left' | 'front-right' | 'rear-left' | 'rear-right' | 'spare';
  condition: 'good' | 'warning' | 'bad' | 'replace';
  treadDepth: {
    outer: number;
    center: number;
    inner: number;
  };
  pressure?: number;
  recommendedPressure?: number;
  brand?: string;
  size?: string;
  dateCode?: string;
  notes?: string;
}

export interface TireFieldProps extends BaseFieldProps {
  position: TireData['position'];
  showPressure?: boolean;
  showBrand?: boolean;
  showDateCode?: boolean;
  minTreadDepth?: number;
  warningTreadDepth?: number;
  enableSvgVisualization?: boolean;
}

export const TireField: React.FC<TireFieldProps> = ({
  value,
  onChange,
  position,
  showPressure = true,
  showBrand = true,
  showDateCode = true,
  minTreadDepth = 2,
  warningTreadDepth = 4,
  enableSvgVisualization = true,
  ...templateProps
}) => {
  const [tireData, setTireData] = useState<TireData>(
    value as TireData || {
      position,
      condition: 'good',
      treadDepth: { outer: 8, center: 8, inner: 8 },
      pressure: 32,
      recommendedPressure: 32
    }
  );
  const [detailsOpen, setDetailsOpen] = useState(false);

  const updateTireData = (updates: Partial<TireData>) => {
    const newData = { ...tireData, ...updates };
    setTireData(newData);
    onChange(newData);
  };

  const getConditionFromTread = (tread: TireData['treadDepth']): TireData['condition'] => {
    const minDepth = Math.min(tread.outer, tread.center, tread.inner);
    if (minDepth <= minTreadDepth) return 'bad';
    if (minDepth <= warningTreadDepth) return 'warning';
    return 'good';
  };

  const getConditionColor = (condition: TireData['condition']) => {
    switch (condition) {
      case 'good': return '#4caf50';
      case 'warning': return '#ff9800';
      case 'bad': return '#f44336';
      case 'replace': return '#e91e63';
      default: return '#9e9e9e';
    }
  };

  const getPositionLabel = (pos: TireData['position']) => {
    switch (pos) {
      case 'front-left': return 'Front Left';
      case 'front-right': return 'Front Right';
      case 'rear-left': return 'Rear Left';
      case 'rear-right': return 'Rear Right';
      case 'spare': return 'Spare Tire';
      default: return 'Unknown';
    }
  };

  const generateTireSvg = (data: TireData) => {
    const color = getConditionColor(data.condition);
    const treadPattern = data.treadDepth;
    
    return (
      <svg width="120" height="120" viewBox="0 0 120 120">
        {/* Tire outline */}
        <circle
          cx="60"
          cy="60"
          r="55"
          fill={color}
          fillOpacity="0.3"
          stroke={color}
          strokeWidth="3"
        />
        
        {/* Rim */}
        <circle
          cx="60"
          cy="60"
          r="25"
          fill="#666"
          stroke="#333"
          strokeWidth="2"
        />
        
        {/* Tread depth indicators */}
        <g stroke={color} strokeWidth="2" fill="none">
          {/* Outer tread */}
          <circle cx="60" cy="60" r="45" strokeDasharray={`${treadPattern.outer * 2},3`} />
          {/* Center tread */}
          <circle cx="60" cy="60" r="40" strokeDasharray={`${treadPattern.center * 2},3`} />
          {/* Inner tread */}
          <circle cx="60" cy="60" r="35" strokeDasharray={`${treadPattern.inner * 2},3`} />
        </g>
        
        {/* Position indicator */}
        <text
          x="60"
          y="65"
          textAnchor="middle"
          fill="#fff"
          fontSize="10"
          fontWeight="bold"
        >
          {position.split('-')[0].toUpperCase()}
        </text>
        
        {/* Pressure indicator */}
        {showPressure && data.pressure && (
          <text
            x="60"
            y="100"
            textAnchor="middle"
            fill={color}
            fontSize="8"
            fontWeight="bold"
          >
            {data.pressure} PSI
          </text>
        )}
      </svg>
    );
  };

  const averageTreadDepth = (
    tireData.treadDepth.outer + 
    tireData.treadDepth.center + 
    tireData.treadDepth.inner
  ) / 3;

  return (
    <NormalizedFieldTemplate
      {...templateProps}
      label={`${getPositionLabel(position)} Tire`}
      showDuallyButton={true}
      duallyLabel="Details"
      duallyColor="primary"
      onDuallyClick={() => setDetailsOpen(true)}
    >
      <Card variant="outlined">
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            {/* SVG Visualization */}
            {enableSvgVisualization && (
              <Grid item xs={12} sm={4} sx={{ textAlign: 'center' }}>
                {generateTireSvg(tireData)}
              </Grid>
            )}
            
            {/* Tire Information */}
            <Grid item xs={12} sm={8}>
              <Box>
                {/* Condition Chip */}
                <Box sx={{ mb: 1 }}>
                  <Chip
                    label={tireData.condition.toUpperCase()}
                    color={
                      tireData.condition === 'good' ? 'success' :
                      tireData.condition === 'warning' ? 'warning' :
                      'error'
                    }
                    size="small"
                  />
                </Box>
                
                {/* Tread Depth Summary */}
                <Typography variant="body2" color="textSecondary">
                  Avg Tread: {averageTreadDepth.toFixed(1)}/32"
                </Typography>
                
                {/* Individual Tread Measurements */}
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" display="block">
                    Outer: {tireData.treadDepth.outer}/32" | 
                    Center: {tireData.treadDepth.center}/32" | 
                    Inner: {tireData.treadDepth.inner}/32"
                  </Typography>
                </Box>
                
                {/* Pressure (if enabled) */}
                {showPressure && (
                  <Typography variant="caption" display="block" color="textSecondary">
                    Pressure: {tireData.pressure || 'Not measured'} PSI
                    {tireData.recommendedPressure && ` (Rec: ${tireData.recommendedPressure})`}
                  </Typography>
                )}
                
                {/* Quick condition buttons */}
                <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {(['good', 'warning', 'bad', 'replace'] as const).map((cond) => (
                    <Chip
                      key={cond}
                      label={cond}
                      size="small"
                      variant={tireData.condition === cond ? 'filled' : 'outlined'}
                      color={
                        cond === 'good' ? 'success' :
                        cond === 'warning' ? 'warning' :
                        'error'
                      }
                      onClick={() => updateTireData({ condition: cond })}
                      sx={{ cursor: 'pointer' }}
                    />
                  ))}
                </Box>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Detailed Edit Dialog */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{getPositionLabel(position)} Tire Details</DialogTitle>
        <DialogContent>
          <Grid container spacing={3}>
            {/* Tread Depth Measurements */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>Tread Depth Measurements</Typography>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Typography gutterBottom>Outer Edge</Typography>
                  <Slider
                    value={tireData.treadDepth.outer}
                    onChange={(_, value) => updateTireData({
                      treadDepth: { ...tireData.treadDepth, outer: value as number }
                    })}
                    min={0}
                    max={16}
                    step={0.5}
                    marks
                    valueLabelDisplay="on"
                    valueLabelFormat={(value) => `${value}/32"`}
                  />
                </Grid>
                <Grid item xs={4}>
                  <Typography gutterBottom>Center</Typography>
                  <Slider
                    value={tireData.treadDepth.center}
                    onChange={(_, value) => updateTireData({
                      treadDepth: { ...tireData.treadDepth, center: value as number }
                    })}
                    min={0}
                    max={16}
                    step={0.5}
                    marks
                    valueLabelDisplay="on"
                    valueLabelFormat={(value) => `${value}/32"`}
                  />
                </Grid>
                <Grid item xs={4}>
                  <Typography gutterBottom>Inner Edge</Typography>
                  <Slider
                    value={tireData.treadDepth.inner}
                    onChange={(_, value) => updateTireData({
                      treadDepth: { ...tireData.treadDepth, inner: value as number }
                    })}
                    min={0}
                    max={16}
                    step={0.5}
                    marks
                    valueLabelDisplay="on"
                    valueLabelFormat={(value) => `${value}/32"`}
                  />
                </Grid>
              </Grid>
            </Grid>

            <Divider />

            {/* Condition Selection */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Overall Condition</InputLabel>
                <Select
                  value={tireData.condition}
                  onChange={(e) => updateTireData({ condition: e.target.value as TireData['condition'] })}
                >
                  <MenuItem value="good">Good</MenuItem>
                  <MenuItem value="warning">Warning</MenuItem>
                  <MenuItem value="bad">Bad</MenuItem>
                  <MenuItem value="replace">Replace</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Pressure */}
            {showPressure && (
              <Grid item xs={12} sm={6}>
                <Typography gutterBottom>Tire Pressure (PSI)</Typography>
                <Slider
                  value={tireData.pressure || 32}
                  onChange={(_, value) => updateTireData({ pressure: value as number })}
                  min={0}
                  max={60}
                  step={1}
                  marks={[
                    { value: 25, label: '25' },
                    { value: 32, label: '32' },
                    { value: 40, label: '40' }
                  ]}
                  valueLabelDisplay="on"
                />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Cancel</Button>
          <Button onClick={() => setDetailsOpen(false)} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </NormalizedFieldTemplate>
  );
};

export default TireField;
