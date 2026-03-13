/**
 * Text Field Component
 * 
 * Standard text input field with full validation and styling support.
 * Reusable across all inspection types.
 */

import React from 'react';
import { TextField as MuiTextField } from '@mui/material';
import { BaseFieldProps } from '../base/FieldProps';
import { withBaseField } from '../base/BaseField';

interface TextFieldProps extends BaseFieldProps<string> {
  type?: 'text' | 'email' | 'password' | 'url';
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  autoComplete?: string;
  autoFocus?: boolean;
}

const TextFieldCore: React.FC<TextFieldProps> = ({
  id,
  value = '',
  onChange,
  placeholder,
  disabled,
  readOnly,
  size = 'small',
  variant = 'outlined',
  type = 'text',
  maxLength,
  minLength,
  pattern,
  autoComplete,
  autoFocus,
  onBlur,
  onFocus
}) => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  return (
    <MuiTextField
      id={id}
      type={type}
      value={value}
      onChange={handleChange}
      onBlur={onBlur}
      onFocus={onFocus}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={readOnly}
      size={size}
      variant={variant}
      autoComplete={autoComplete}
      autoFocus={autoFocus}
      fullWidth
      inputProps={{
        maxLength,
        minLength,
        pattern
      }}
    />
  );
};

export const TextField = withBaseField(TextFieldCore);

// Field definition for registry
export const TextFieldDefinition = {
  id: 'text',
  name: 'Text Field',
  category: 'basic' as const,
  description: 'Single-line text input field',
  configurable: {
    validation: true,
    layout: true
  }
};
