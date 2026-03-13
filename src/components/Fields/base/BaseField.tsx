/**
 * Base Field Component
 * 
 * Provides common wrapper functionality for all field types:
 * - Label rendering
 * - Error display
 * - Help text
 * - Required indicators
 * - Consistent styling
 */

import React from 'react';
import { Box, Typography, FormHelperText, IconButton } from '@mui/material';
import { Help as HelpIcon } from '@mui/icons-material';
import { BaseFieldProps } from './FieldProps';
// import { useFieldPopups } from '../../Popups';

interface BaseFieldWrapperProps extends Pick<BaseFieldProps, 'label' | 'description' | 'error' | 'required' | 'fullWidth'> {
  children: React.ReactNode;
  htmlFor?: string;
  showHelpButton?: boolean;
}

export const BaseFieldWrapper: React.FC<BaseFieldWrapperProps> = ({
  label,
  description,
  error,
  required,
  fullWidth = true,
  children,
  htmlFor,
  showHelpButton = true
}) => {
  // const { triggerHelp } = htmlFor ? useFieldPopups(htmlFor) : { triggerHelp: () => {} };
  const triggerHelp = () => console.log('Help triggered for:', htmlFor);
  return (
    <Box sx={{ 
      width: fullWidth ? '100%' : 'auto',
      mb: 2
    }}>
      {label && (
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
          <Typography
            component="label"
            htmlFor={htmlFor}
            variant="body2"
            sx={{
              fontWeight: 500,
              color: error ? 'error.main' : 'text.primary',
              flexGrow: 1
            }}
          >
            {label}
            {required && (
              <Typography
                component="span"
                sx={{ color: 'error.main', ml: 0.5 }}
              >
                *
              </Typography>
            )}
          </Typography>
          {showHelpButton && htmlFor && (
            <IconButton
              size="small"
              onClick={triggerHelp}
              sx={{ ml: 1, p: 0.5 }}
              aria-label={`Help for ${label}`}
            >
              <HelpIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      )}
      
      <Box sx={{ position: 'relative' }}>
        {children}
      </Box>
      
      {(error || description) && (
        <FormHelperText 
          error={!!error}
          sx={{ mt: 0.5 }}
        >
          {error || description}
        </FormHelperText>
      )}
    </Box>
  );
};

/**
 * Higher-order component to wrap field components with base functionality
 */
export function withBaseField<P extends BaseFieldProps>(
  FieldComponent: React.ComponentType<P>
): React.ComponentType<P> {
  return (props: P) => {
    const {
      id,
      label,
      description,
      error,
      required,
      fullWidth,
      ...fieldProps
    } = props;

    return (
      <BaseFieldWrapper
        label={label}
        description={description}
        error={error}
        required={required}
        fullWidth={fullWidth}
        htmlFor={id}
      >
        <FieldComponent {...(fieldProps as P)} />
      </BaseFieldWrapper>
    );
  };
}
