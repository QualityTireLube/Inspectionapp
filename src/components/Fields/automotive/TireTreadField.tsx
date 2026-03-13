/**
 * Tire Tread Field Component
 * 
 * Specialized component for tire tread depth measurement and condition assessment.
 * Includes visual tire representation and measurement input.
 */

import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  ButtonGroup, 
  Button, 
  Grid,
  Card,
  CardContent
} from '@mui/material';
import { BaseFieldProps } from '../base/FieldProps';
import { withBaseField } from '../base/BaseField';

interface TireTreadData {
  // Tread depths (in 32nds of an inch)
  inner_edge_depth: string;
  inner_depth: string;
  center_depth: string;
  outer_depth: string;
  outer_edge_depth: string;
  
  // Condition indicators
  inner_edge_condition: 'green' | 'yellow' | 'red';
  inner_condition: 'green' | 'yellow' | 'red';
  center_condition: 'green' | 'yellow' | 'red';
  outer_condition: 'green' | 'yellow' | 'red';
  outer_edge_condition: 'green' | 'yellow' | 'red';
}

interface TireTreadFieldProps extends BaseFieldProps<TireTreadData> {
  position?: 'driver_front' | 'passenger_front' | 'driver_rear' | 'passenger_rear' | 'spare';
  showVisual?: boolean;
  minDepth?: number;
  warnDepth?: number;
}

const TireTreadFieldCore: React.FC<TireTreadFieldProps> = ({
  id,
  value = {
    inner_edge_depth: '',
    inner_depth: '',
    center_depth: '',
    outer_depth: '',
    outer_edge_depth: '',
    inner_edge_condition: 'green',
    inner_condition: 'green',
    center_condition: 'green',
    outer_condition: 'green',
    outer_edge_condition: 'green'
  },
  onChange,
  disabled,
  readOnly,
  position = 'driver_front',
  showVisual = true,
  minDepth = 2,
  warnDepth = 4
}) => {
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  const zones = [
    { key: 'inner_edge', label: 'Inner Edge' },
    { key: 'inner', label: 'Inner' },
    { key: 'center', label: 'Center' },
    { key: 'outer', label: 'Outer' },
    { key: 'outer_edge', label: 'Outer Edge' }
  ];

  const handleDepthChange = (zone: string, depth: string) => {
    const numericDepth = parseFloat(depth) || 0;
    let condition: 'green' | 'yellow' | 'red' = 'green';
    
    if (numericDepth <= minDepth) {
      condition = 'red';
    } else if (numericDepth <= warnDepth) {
      condition = 'yellow';
    }

    onChange({
      ...value,
      [`${zone}_depth`]: depth,
      [`${zone}_condition`]: condition
    });
  };

  const handleConditionChange = (zone: string, condition: 'green' | 'yellow' | 'red') => {
    onChange({
      ...value,
      [`${zone}_condition`]: condition
    });
  };

  const getConditionColor = (condition: 'green' | 'yellow' | 'red') => {
    switch (condition) {
      case 'green': return '#4caf50';
      case 'yellow': return '#ff9800';
      case 'red': return '#f44336';
      default: return '#e0e0e0';
    }
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Tire Tread - {position.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </Typography>
        
        {showVisual && (
          <Box sx={{ mb: 3, textAlign: 'center' }}>
            {/* Visual tire representation */}
            <Box
              sx={{
                width: 200,
                height: 80,
                border: '2px solid #333',
                borderRadius: '40px',
                position: 'relative',
                mx: 'auto',
                backgroundColor: '#f5f5f5'
              }}
            >
              {zones.map((zone, index) => (
                <Box
                  key={zone.key}
                  sx={{
                    position: 'absolute',
                    left: `${10 + index * 18}%`,
                    top: '20%',
                    width: '12%',
                    height: '60%',
                    backgroundColor: getConditionColor((value as any)[`${zone.key}_condition`]),
                    borderRadius: '4px',
                    cursor: 'pointer',
                    border: selectedZone === zone.key ? '2px solid #1976d2' : 'none',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => setSelectedZone(selectedZone === zone.key ? null : zone.key)}
                />
              ))}
            </Box>
            <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
              Click zones to select • Green: Good • Yellow: Caution • Red: Replace
            </Typography>
          </Box>
        )}

        <Grid container spacing={2}>
          {zones.map((zone) => (
            <Grid item xs={12} sm={6} md={2.4} key={zone.key}>
              <Box>
                <Typography variant="body2" sx={{ mb: 1, fontSize: '0.75rem' }}>
                  {zone.label}
                </Typography>
                
                {/* Depth input */}
                <TextField
                  size="small"
                  value={(value as any)[`${zone.key}_depth`] || ''}
                  onChange={(e) => handleDepthChange(zone.key, e.target.value)}
                  disabled={disabled}
                  readOnly={readOnly}
                  placeholder="32nds"
                  type="number"
                  inputProps={{ min: 0, max: 32, step: 0.5 }}
                  fullWidth
                  sx={{ mb: 1 }}
                />
                
                {/* Condition buttons */}
                <ButtonGroup size="small" fullWidth>
                  {['green', 'yellow', 'red'].map((condition) => (
                    <Button
                      key={condition}
                      variant={(value as any)[`${zone.key}_condition`] === condition ? 'contained' : 'outlined'}
                      onClick={() => handleConditionChange(zone.key, condition as any)}
                      disabled={disabled || readOnly}
                      sx={{
                        minWidth: 0,
                        px: 0.5,
                        backgroundColor: (value as any)[`${zone.key}_condition`] === condition ? 
                          getConditionColor(condition as any) : 'transparent',
                        borderColor: getConditionColor(condition as any),
                        '&:hover': {
                          backgroundColor: getConditionColor(condition as any),
                          opacity: 0.8
                        }
                      }}
                    >
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          backgroundColor: getConditionColor(condition as any)
                        }}
                      />
                    </Button>
                  ))}
                </ButtonGroup>
              </Box>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
};

export const TireTreadField = withBaseField(TireTreadFieldCore);

// Field definition for registry
export const TireTreadFieldDefinition = {
  id: 'tire_tread',
  name: 'Tire Tread Field',
  category: 'automotive' as const,
  description: 'Tire tread depth measurement with visual condition indicators',
  configurable: {
    validation: true,
    layout: false
  }
};
