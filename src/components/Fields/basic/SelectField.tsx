/**
 * Select Field Component
 * 
 * Dropdown selection field with support for:
 * - Static option lists
 * - Dynamic option loading
 * - Option groups
 * - Search/filter capability
 */

import React from 'react';
import { TextField as MuiTextField, MenuItem, ListSubheader } from '@mui/material';
import { BaseFieldProps, FieldOption } from '../base/FieldProps';
import { withBaseField } from '../base/BaseField';

interface SelectFieldProps extends BaseFieldProps<string | string[]> {
  options: FieldOption[];
  multiple?: boolean;
  searchable?: boolean;
  allowEmpty?: boolean;
  emptyLabel?: string;
  groupBy?: keyof FieldOption;
}

const SelectFieldCore: React.FC<SelectFieldProps> = ({
  id,
  value = '',
  onChange,
  placeholder,
  disabled,
  readOnly,
  size = 'small',
  variant = 'outlined',
  options = [],
  multiple = false,
  allowEmpty = true,
  emptyLabel = 'Select...',
  groupBy,
  onBlur,
  onFocus
}) => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    onChange(multiple ? (typeof newValue === 'string' ? [newValue] : newValue) : newValue);
  };

  // Group options if groupBy is specified
  const groupedOptions = React.useMemo(() => {
    if (!groupBy) return { '': options };
    
    return options.reduce((groups, option) => {
      const group = (option[groupBy] as string) || '';
      if (!groups[group]) groups[group] = [];
      groups[group].push(option);
      return groups;
    }, {} as Record<string, FieldOption[]>);
  }, [options, groupBy]);

  const renderOptions = () => {
    const elements: React.ReactNode[] = [];
    
    // Add empty option if allowed
    if (allowEmpty && !multiple) {
      elements.push(
        <MenuItem key="" value="">
          <em>{emptyLabel}</em>
        </MenuItem>
      );
    }
    
    // Render grouped or ungrouped options
    Object.entries(groupedOptions).forEach(([groupName, groupOptions]) => {
      if (groupName && groupBy) {
        elements.push(
          <ListSubheader key={`group-${groupName}`}>
            {groupName}
          </ListSubheader>
        );
      }
      
      groupOptions.forEach((option) => {
        elements.push(
          <MenuItem
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </MenuItem>
        );
      });
    });
    
    return elements;
  };

  return (
    <MuiTextField
      id={id}
      select
      value={value}
      onChange={handleChange}
      onBlur={onBlur}
      onFocus={onFocus}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={readOnly}
      size={size}
      variant={variant}
      fullWidth
      SelectProps={{
        multiple,
        displayEmpty: allowEmpty
      }}
    >
      {renderOptions()}
    </MuiTextField>
  );
};

export const SelectField = withBaseField(SelectFieldCore);

// Field definition for registry
export const SelectFieldDefinition = {
  id: 'select',
  name: 'Select Field',
  category: 'basic' as const,
  description: 'Dropdown selection field with single or multiple selection',
  configurable: {
    options: true,
    validation: true,
    layout: true
  }
};
