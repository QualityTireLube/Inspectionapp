/**
 * Brake Field Component
 * 
 * Specialized field for brake inspection with SVG visualization
 * Handles pad thickness, rotor condition, and visual representation
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
  Divider,
  Switch,
  FormControlLabel
} from '@mui/material';
import { NormalizedFieldTemplate } from '../base/NormalizedFieldTemplate';
import { BaseFieldProps } from '../base/FieldProps';

export interface BrakeData {
  position: 'front-left' | 'front-right' | 'rear-left' | 'rear-right';
  type: 'disc' | 'drum';
  padThickness: {
    outer: number;
    inner: number;
  };
  rotorCondition: 'good' | 'resurface' | 'replace';
  rotorThickness?: number;
  minRotorThickness?: number;
  hasWearIndicator: boolean;
  wearIndicatorStatus: 'good' | 'near' | 'touching';
  fluidLevel: 'good' | 'low' | 'empty';
  notes?: string;
}

export interface BrakeFieldProps extends BaseFieldProps {
  position: BrakeData['position'];
  defaultType?: BrakeData['type'];
  showRotorMeasurement?: boolean;
  showFluidLevel?: boolean;
  minPadThickness?: number;
  warningPadThickness?: number;
}

export const BrakeField: React.FC<BrakeFieldProps> = ({
  value,
  onChange,
  position,
  defaultType = 'disc',
  showRotorMeasurement = true,
  showFluidLevel = true,
  minPadThickness = 2,
  warningPadThickness = 4,
  ...templateProps
}) => {
  const [brakeData, setBrakeData] = useState<BrakeData>(
    value as BrakeData || {
      position,
      type: defaultType,
      padThickness: { outer: 8, inner: 8 },
      rotorCondition: 'good',
      rotorThickness: 12,
      minRotorThickness: 10,
      hasWearIndicator: true,
      wearIndicatorStatus: 'good',
      fluidLevel: 'good'
    }
  );
  const [detailsOpen, setDetailsOpen] = useState(false);

  const updateBrakeData = (updates: Partial<BrakeData>) => {
    const newData = { ...brakeData, ...updates };
    setBrakeData(newData);
    onChange(newData);
  };

  const getConditionFromPads = (pads: BrakeData['padThickness']): 'good' | 'warning' | 'bad' => {
    const minThickness = Math.min(pads.outer, pads.inner);
    if (minThickness <= minPadThickness) return 'bad';
    if (minThickness <= warningPadThickness) return 'warning';
    return 'good';
  };

  const getConditionColor = (condition: 'good' | 'warning' | 'bad') => {
    switch (condition) {
      case 'good': return '#4caf50';
      case 'warning': return '#ff9800';
      case 'bad': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  const getPositionLabel = (pos: BrakeData['position']) => {
    switch (pos) {
      case 'front-left': return 'Front Left';
      case 'front-right': return 'Front Right';
      case 'rear-left': return 'Rear Left';
      case 'rear-right': return 'Rear Right';
      default: return 'Unknown';
    }
  };

  const generateBrakeSvg = (data: BrakeData) => {
    const condition = getConditionFromPads(data.padThickness);
    const color = getConditionColor(condition);
    
    if (data.type === 'disc') {
      return (
        <svg width="120" height="120" viewBox="0 0 120 120">
          {/* Rotor disc */}
          <circle
            cx="60"
            cy="60"
            r="50"
            fill="#666"
            stroke="#333"
            strokeWidth="2"
          />
          
          {/* Cooling vanes (inner circle) */}
          <circle
            cx="60"
            cy="60"
            r="25"
            fill="none"
            stroke="#333"
            strokeWidth="1"
            strokeDasharray="5,5"
          />
          
          {/* Brake pads (top and bottom) */}
          <rect
            x="30"
            y="10"
            width="60"
            height={data.padThickness.outer}
            fill={color}
            stroke={color}
            strokeWidth="1"
            rx="3"
          />
          <rect
            x="30"
            y={110 - data.padThickness.inner}
            width="60"
            height={data.padThickness.inner}
            fill={color}
            stroke={color}
            strokeWidth="1"
            rx="3"
          />
          
          {/* Caliper outline */}
          <rect
            x="25"
            y="5"
            width="70"
            height="15"
            fill="none"
            stroke="#999"
            strokeWidth="2"
            rx="5"
          />
          <rect
            x="25"
            y="100"
            width="70"
            height="15"
            fill="none"
            stroke="#999"
            strokeWidth="2"
            rx="5"
          />
          
          {/* Wear indicator (if present) */}
          {data.hasWearIndicator && (
            <circle
              cx="35"
              cy="60"
              r="3"
              fill={
                data.wearIndicatorStatus === 'good' ? '#4caf50' :
                data.wearIndicatorStatus === 'near' ? '#ff9800' :
                '#f44336'
              }
            />
          )}
          
          {/* Position label */}
          <text
            x="60"
            y="65"
            textAnchor="middle"
            fill="#fff"
            fontSize="8"
            fontWeight="bold"
          >
            {position.split('-')[0].toUpperCase()}
          </text>
        </svg>
      );
    } else {
      // Drum brake
      return (
        <svg width="120" height="120" viewBox="0 0 120 120">
          {/* Drum outline */}
          <circle
            cx="60"
            cy="60"
            r="50"
            fill="#666"
            stroke="#333"
            strokeWidth="3"
          />
          
          {/* Brake shoes */}
          <path
            d="M 30 60 A 30 30 0 0 1 90 60"
            fill="none"
            stroke={color}
            strokeWidth={data.padThickness.outer}
            strokeLinecap="round"
          />
          <path
            d="M 90 60 A 30 30 0 0 1 30 60"
            fill="none"
            stroke={color}
            strokeWidth={data.padThickness.inner}
            strokeLinecap="round"
          />
          
          {/* Wheel cylinder */}
          <rect
            x="55"
            y="20"
            width="10"
            height="15"
            fill="#999"
            rx="2"
          />
          
          {/* Position label */}
          <text
            x="60"
            y="65"
            textAnchor="middle"
            fill="#fff"
            fontSize="8"
            fontWeight="bold"
          >
            {position.split('-')[0].toUpperCase()}
          </text>
        </svg>
      );
    }
  };

  const overallCondition = getConditionFromPads(brakeData.padThickness);
  const averagePadThickness = (brakeData.padThickness.outer + brakeData.padThickness.inner) / 2;

  return (
    <NormalizedFieldTemplate
      {...templateProps}
      label={`${getPositionLabel(position)} Brake`}
      showDuallyButton={true}
      duallyLabel="Details"
      duallyColor="primary"
      onDuallyClick={() => setDetailsOpen(true)}
    >
      <Card variant="outlined">
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            {/* SVG Visualization */}
            <Grid size={{ xs: 12, sm: 4 }} sx={{ textAlign: 'center' }}>
              {generateBrakeSvg(brakeData)}
            </Grid>
            
            {/* Brake Information */}
            <Grid size={{ xs: 12, sm: 8 }}>
              <Box>
                {/* Type and Condition */}
                <Box sx={{ mb: 1, display: 'flex', gap: 1 }}>
                  <Chip
                    label={brakeData.type.toUpperCase()}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    label={overallCondition.toUpperCase()}
                    color={
                      overallCondition === 'good' ? 'success' :
                      overallCondition === 'warning' ? 'warning' :
                      'error'
                    }
                    size="small"
                  />
                </Box>
                
                {/* Pad Thickness Summary */}
                <Typography variant="body2" color="textSecondary">
                  Avg Pad: {averagePadThickness.toFixed(1)}mm
                </Typography>
                
                {/* Individual Pad Measurements */}
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" display="block">
                    Outer: {brakeData.padThickness.outer}mm | 
                    Inner: {brakeData.padThickness.inner}mm
                  </Typography>
                </Box>
                
                {/* Rotor Condition */}
                <Typography variant="caption" display="block" color="textSecondary">
                  Rotor: {brakeData.rotorCondition}
                  {brakeData.rotorThickness && ` (${brakeData.rotorThickness}mm)`}
                </Typography>
                
                {/* Wear Indicator Status */}
                {brakeData.hasWearIndicator && (
                  <Typography variant="caption" display="block" color="textSecondary">
                    Indicator: {brakeData.wearIndicatorStatus}
                  </Typography>
                )}
                
                {/* Quick condition buttons */}
                <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {(['good', 'warning', 'bad'] as const).map((cond) => (
                    <Chip
                      key={cond}
                      label={cond}
                      size="small"
                      variant={overallCondition === cond ? 'filled' : 'outlined'}
                      color={
                        cond === 'good' ? 'success' :
                        cond === 'warning' ? 'warning' :
                        'error'
                      }
                      onClick={() => {
                        const thickness = cond === 'good' ? 8 : cond === 'warning' ? 4 : 2;
                        updateBrakeData({
                          padThickness: { outer: thickness, inner: thickness }
                        });
                      }}
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
        <DialogTitle>{getPositionLabel(position)} Brake Details</DialogTitle>
        <DialogContent>
          <Grid container spacing={3}>
            {/* Brake Type */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Brake Type</InputLabel>
                <Select
                  value={brakeData.type}
                  onChange={(e) => updateBrakeData({ type: e.target.value as BrakeData['type'] })}
                >
                  <MenuItem value="disc">Disc Brake</MenuItem>
                  <MenuItem value="drum">Drum Brake</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Fluid Level */}
            {showFluidLevel && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Brake Fluid Level</InputLabel>
                  <Select
                    value={brakeData.fluidLevel}
                    onChange={(e) => updateBrakeData({ fluidLevel: e.target.value as BrakeData['fluidLevel'] })}
                  >
                    <MenuItem value="good">Good</MenuItem>
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="empty">Empty</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}

            {/* Pad Thickness Measurements */}
            <Grid size={12}>
              <Typography variant="h6" gutterBottom>
                {brakeData.type === 'disc' ? 'Pad' : 'Shoe'} Thickness (mm)
              </Typography>
              <Grid container spacing={2}>
                <Grid size={6}>
                  <Typography gutterBottom>Outer {brakeData.type === 'disc' ? 'Pad' : 'Shoe'}</Typography>
                  <Slider
                    value={brakeData.padThickness.outer}
                    onChange={(_, value) => updateBrakeData({
                      padThickness: { ...brakeData.padThickness, outer: value as number }
                    })}
                    min={0}
                    max={15}
                    step={0.5}
                    marks
                    valueLabelDisplay="on"
                    valueLabelFormat={(value) => `${value}mm`}
                  />
                </Grid>
                <Grid size={6}>
                  <Typography gutterBottom>Inner {brakeData.type === 'disc' ? 'Pad' : 'Shoe'}</Typography>
                  <Slider
                    value={brakeData.padThickness.inner}
                    onChange={(_, value) => updateBrakeData({
                      padThickness: { ...brakeData.padThickness, inner: value as number }
                    })}
                    min={0}
                    max={15}
                    step={0.5}
                    marks
                    valueLabelDisplay="on"
                    valueLabelFormat={(value) => `${value}mm`}
                  />
                </Grid>
              </Grid>
            </Grid>

            <Divider />

            {/* Rotor/Drum Condition */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>{brakeData.type === 'disc' ? 'Rotor' : 'Drum'} Condition</InputLabel>
                <Select
                  value={brakeData.rotorCondition}
                  onChange={(e) => updateBrakeData({ rotorCondition: e.target.value as BrakeData['rotorCondition'] })}
                >
                  <MenuItem value="good">Good</MenuItem>
                  <MenuItem value="resurface">Needs Resurfacing</MenuItem>
                  <MenuItem value="replace">Replace</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Rotor Thickness */}
            {showRotorMeasurement && brakeData.type === 'disc' && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography gutterBottom>Rotor Thickness (mm)</Typography>
                <Slider
                  value={brakeData.rotorThickness || 12}
                  onChange={(_, value) => updateBrakeData({ rotorThickness: value as number })}
                  min={8}
                  max={20}
                  step={0.1}
                  marks={[
                    { value: brakeData.minRotorThickness || 10, label: 'Min' },
                    { value: 12, label: 'Nom' }
                  ]}
                  valueLabelDisplay="on"
                  valueLabelFormat={(value) => `${value}mm`}
                />
              </Grid>
            )}

            {/* Wear Indicator */}
            <Grid size={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={brakeData.hasWearIndicator}
                    onChange={(e) => updateBrakeData({ hasWearIndicator: e.target.checked })}
                  />
                }
                label="Has Wear Indicator"
              />
              
              {brakeData.hasWearIndicator && (
                <Box sx={{ mt: 1 }}>
                  <FormControl size="small">
                    <InputLabel>Indicator Status</InputLabel>
                    <Select
                      value={brakeData.wearIndicatorStatus}
                      onChange={(e) => updateBrakeData({ 
                        wearIndicatorStatus: e.target.value as BrakeData['wearIndicatorStatus'] 
                      })}
                    >
                      <MenuItem value="good">Good (Silent)</MenuItem>
                      <MenuItem value="near">Near (Slight Noise)</MenuItem>
                      <MenuItem value="touching">Touching (Squealing)</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              )}
            </Grid>
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

export default BrakeField;
