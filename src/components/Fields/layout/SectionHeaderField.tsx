/**
 * Section Header Field Component
 * 
 * Creates visual section dividers and headers within forms.
 * No input value - purely for layout and organization.
 */

import React from 'react';
import { Box, Typography, Divider } from '@mui/material';
import { BaseFieldProps } from '../base';

interface SectionHeaderFieldProps extends Omit<BaseFieldProps<null>, 'value' | 'onChange'> {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  showDivider?: boolean;
  dividerPosition?: 'top' | 'bottom' | 'both';
  color?: 'primary' | 'secondary' | 'default';
  align?: 'left' | 'center' | 'right';
  spacing?: 'compact' | 'normal' | 'spacious';
}

export const SectionHeaderField: React.FC<SectionHeaderFieldProps> = ({
  label,
  description,
  variant = 'h6',
  showDivider = true,
  dividerPosition = 'bottom',
  color = 'default',
  align = 'left',
  spacing = 'normal'
}) => {
  const getSpacingValues = () => {
    switch (spacing) {
      case 'compact': return { mt: 2, mb: 1 };
      case 'spacious': return { mt: 4, mb: 3 };
      default: return { mt: 3, mb: 2 };
    }
  };

  const spacingProps = getSpacingValues();

  const getTextColor = () => {
    switch (color) {
      case 'primary': return 'primary.main';
      case 'secondary': return 'secondary.main';
      default: return 'text.primary';
    }
  };

  return (
    <Box sx={spacingProps}>
      {showDivider && (dividerPosition === 'top' || dividerPosition === 'both') && (
        <Divider sx={{ mb: 2 }} />
      )}
      
      {label && (
        <Typography
          variant={variant}
          component="h3"
          sx={{
            fontWeight: 'bold',
            color: getTextColor(),
            textAlign: align,
            mb: description ? 1 : 0
          }}
        >
          {label}
        </Typography>
      )}
      
      {description && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            textAlign: align,
            fontStyle: 'italic'
          }}
        >
          {description}
        </Typography>
      )}
      
      {showDivider && (dividerPosition === 'bottom' || dividerPosition === 'both') && (
        <Divider sx={{ mt: 1 }} />
      )}
    </Box>
  );
};

// Field definition for registry
export const SectionHeaderFieldDefinition = {
  id: 'section_header',
  name: 'Section Header',
  category: 'layout' as const,
  description: 'Visual section divider with customizable styling',
  configurable: {
    layout: true
  }
};
