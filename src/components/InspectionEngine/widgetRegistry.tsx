/**
 * Widget Registry - Maps field types to React components
 * 
 * This registry provides the connection between field definitions
 * and their corresponding UI components for rendering.
 */

import React from 'react';
import { FieldDef } from '../../config/fieldRegistry';

// Import existing components that we'll reuse
import { TextField } from '@mui/material';

// Import existing complex components (only the ones we know exist)
import SafariImageUpload from '../Image/SafariImageUpload';

export interface WidgetProps {
  field: FieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  context?: Record<string, unknown>;
}

/**
 * Basic Text Input Widget
 */
export const TextWidget: React.FC<WidgetProps> = ({
  field,
  value,
  onChange,
  onBlur,
  error,
  disabled,
  required
}) => {
  // Prevent infinite re-renders by stabilizing the value
  const stableValue = React.useMemo(() => {
    return value as string || '';
  }, [value]);

  const handleChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  return (
    <TextField
      label={field.label}
      value={stableValue}
      onChange={handleChange}
      onBlur={onBlur}
      error={!!error}
      helperText={error || field.description}
      disabled={disabled}
      required={required}
      placeholder={field.placeholder}
      inputProps={{
        maxLength: field.maxLength
      }}
      fullWidth
      variant="outlined"
      size="small"
    />
  );
};

/**
 * Number Input Widget
 */
export const NumberWidget: React.FC<WidgetProps> = ({
  field,
  value,
  onChange,
  onBlur,
  error,
  disabled,
  required
}) => {
  const stableValue = React.useMemo(() => {
    return value as number || '';
  }, [value]);

  const handleChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value ? parseFloat(e.target.value) : '');
  }, [onChange]);

  return (
    <TextField
      label={field.label}
      type="number"
      value={stableValue}
      onChange={handleChange}
      onBlur={onBlur}
      error={!!error}
      helperText={error || field.description}
      disabled={disabled}
      required={required}
      placeholder={field.placeholder}
      inputProps={{
        min: field.min,
        max: field.max
      }}
      fullWidth
      variant="outlined"
      size="small"
    />
  );
};

/**
 * Select/Dropdown Widget
 */
export const SelectWidget: React.FC<WidgetProps> = ({
  field,
  value,
  onChange,
  error,
  disabled,
  required
}) => {
  const options = field.options || [];
  const stableValue = React.useMemo(() => {
    return value as string || '';
  }, [value]);

  const handleChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  return (
    <TextField
      select
      label={field.label}
      value={stableValue}
      onChange={handleChange}
      error={!!error}
      helperText={error || field.description}
      disabled={disabled}
      required={required}
      SelectProps={{
        native: true
      }}
      fullWidth
      variant="outlined"
      size="small"
    >
      <option value="">Select {field.label}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </TextField>
  );
};

/**
 * Textarea Widget
 */
export const TextareaWidget: React.FC<WidgetProps> = ({
  field,
  value,
  onChange,
  onBlur,
  error,
  disabled,
  required
}) => {
  return (
    <TextField
      label={field.label}
      value={value as string || ''}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      error={!!error}
      helperText={error || field.description}
      disabled={disabled}
      required={required}
      placeholder={field.placeholder}
      multiline
      rows={4}
      fullWidth
      variant="outlined"
      size="small"
    />
  );
};

/**
 * Date Widget (simplified)
 */
export const DateWidget: React.FC<WidgetProps> = ({
  field,
  value,
  onChange,
  onBlur,
  error,
  disabled,
  required
}) => {
  return (
    <TextField
      label={field.label}
      type="date"
      value={value as string || ''}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      error={!!error}
      helperText={error || field.description}
      disabled={disabled}
      required={required}
      fullWidth
      variant="outlined"
      size="small"
      InputLabelProps={{
        shrink: true,
      }}
    />
  );
};

/**
 * Section Header Widget - Renders a visual section divider
 */
export const SectionHeaderWidget: React.FC<WidgetProps> = ({ field }) => {
  return (
    <div style={{ 
      width: '100%',
      marginTop: '24px',
      marginBottom: '16px'
    }}>
      <h3 style={{ 
        margin: 0,
        fontSize: '1.25rem',
        fontWeight: 'bold',
        color: '#333',
        borderBottom: '2px solid #e0e0e0',
        paddingBottom: '8px'
      }}>
        {field.label}
      </h3>
    </div>
  );
};

/**
 * Photo Upload Widget - Wraps SafariImageUpload
 */
export const PhotoWidget: React.FC<WidgetProps> = ({ field, value, onChange, disabled }) => {
  const photos = (value as any[]) || [];
  
  return (
    <div>
      <SafariImageUpload
        onImageUpload={async (file: File, type: any) => {
          // Add the file to the current photos array
          onChange([...photos, file]);
        }}
        uploadType={field.id}
        disabled={disabled}
        multiple={field.multiple}
        size="small"
        resize1080p={true}
        showCameraButton={true}
        showGalleryButton={true}
      />
      {photos.length > 0 && (
        <div style={{ marginTop: '8px', fontSize: '0.875rem', color: '#666' }}>
          {photos.length} photo(s) uploaded
        </div>
      )}
    </div>
  );
};

/**
 * Checkbox Widget
 */
export const CheckboxWidget: React.FC<WidgetProps> = ({ field, value, onChange, disabled }) => {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <input
        type="checkbox"
        checked={!!value}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <span>{field.label}</span>
    </label>
  );
};

/**
 * Placeholder Widget for complex components
 */
export const PlaceholderWidget: React.FC<WidgetProps> = ({
  field,
  value,
  error,
  required
}) => {
  return (
    <div style={{ 
      border: '2px dashed #ccc', 
      padding: '20px', 
      textAlign: 'center',
      borderRadius: '4px',
      backgroundColor: '#f9f9f9'
    }}>
      <strong>Field: {field.label}</strong>
      <br />
      <small>Type: {field.widget || field.type}</small>
      <br />
      <small>TODO: Implement {field.widget || field.type} component</small>
      {value && (
        <>
          <br />
          <small>Current value: {JSON.stringify(value)}</small>
        </>
      )}
      {error && <div style={{ color: 'red', fontSize: '0.8rem', marginTop: '8px' }}>{error}</div>}
      {field.description && <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>{field.description}</div>}
    </div>
  );
};

/**
 * Widget Registry mapping field types to components
 */
export const WIDGET_REGISTRY: Record<string, React.ComponentType<WidgetProps>> = {
  // Basic widgets
  text: TextWidget,
  number: NumberWidget,
  select: SelectWidget,
  textarea: TextareaWidget,
  date: DateWidget,
  checkbox: CheckboxWidget,
  photo: PhotoWidget,
  section_header: SectionHeaderWidget,

  // Complex widgets - use placeholders for now but can be enhanced
  tread: PlaceholderWidget,
  brakePad: PlaceholderWidget,
  complex: PlaceholderWidget,
  tire: PlaceholderWidget,
  battery: PlaceholderWidget,
  tpms: PlaceholderWidget,
  tireRepair: PlaceholderWidget,

  // Specific widget names (these would need more complex wrappers)
  TireTreadField: PlaceholderWidget,
  BrakePadField: PlaceholderWidget,
  PhotoField: PhotoWidget,
  BatteryConditionField: PlaceholderWidget,
  BatteryTerminalField: PlaceholderWidget,
  TireCommentsField: PlaceholderWidget,
  TireDatesField: PlaceholderWidget,
  TirePhotoField: PhotoWidget,
  TireRepairField: PlaceholderWidget,
  TPMSField: PlaceholderWidget,
  FieldNotesField: PlaceholderWidget,
  TabTimingsField: PlaceholderWidget
};

/**
 * Get widget component for a field
 */
export function getWidget(field: FieldDef): React.ComponentType<WidgetProps> {
  // First try specific widget name
  if (field.widget && WIDGET_REGISTRY[field.widget]) {
    return WIDGET_REGISTRY[field.widget];
  }

  // Fall back to field type
  if (WIDGET_REGISTRY[field.type]) {
    return WIDGET_REGISTRY[field.type];
  }

  // Default to text widget
  return TextWidget;
}

/**
 * Register a new widget
 */
export function registerWidget(name: string, component: React.ComponentType<WidgetProps>): void {
  WIDGET_REGISTRY[name] = component;
}

/**
 * Render a field using its registered widget
 */
export const FieldRenderer: React.FC<WidgetProps> = (props) => {
  const Widget = getWidget(props.field);
  return <Widget {...props} />;
};

/**
 * Safe field renderer with basic error handling
 */
export const SafeFieldRenderer: React.FC<WidgetProps & { fieldId: string }> = ({ fieldId, ...props }) => {
  try {
    return <FieldRenderer {...props} />;
  } catch (error) {
    console.error(`Widget error for field ${fieldId}:`, error);
    return (
      <div style={{ 
        border: '2px solid red', 
        padding: '10px', 
        borderRadius: '4px',
        backgroundColor: '#ffebee'
      }}>
        <strong>Widget Error</strong>
        <br />
        Field: {fieldId}
        <br />
        Error: {(error as Error)?.message || 'Unknown error'}
        <br />
        <small>Check console for details</small>
      </div>
    );
  }
};