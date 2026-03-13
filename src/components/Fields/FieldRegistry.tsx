/**
 * Field Component Registry
 * 
 * Central registry and factory for all normalized field components
 * Maps field types and IDs to their corresponding React components
 */

import React from 'react';
import { NormalizedFieldTemplate } from './base/NormalizedFieldTemplate';
import {
  ImageVideoField,
  VinField,
  ChipField,
  MileageField,
  TireField,
  BrakeField
} from './content';
import { BaseFieldProps } from './base/FieldProps';

// Field component type definition
export type FieldComponentType = React.ComponentType<BaseFieldProps>;

/**
 * Registry mapping field types to their components
 */
export const FIELD_COMPONENT_REGISTRY: Record<string, FieldComponentType> = {
  // Basic template
  'template': NormalizedFieldTemplate as any,
  
  // Content field types
  'image': ImageVideoField as any,
  'video': ImageVideoField as any,
  'image_video': ImageVideoField as any,
  'vin': VinField as any,
  'chip': ChipField as any,
  'chips': ChipField as any,
  'select_chip': ChipField as any,
  'mileage': MileageField as any,
  'tire': TireField as any,
  'brake': BrakeField as any,
  
  // Aliases for common use cases
  'photo': ImageVideoField as any,
  'photos': ImageVideoField as any,
  'condition': ChipField as any,
  'assessment': ChipField as any,
  'vehicle_id': VinField as any,
  'odometer': MileageField as any,
  'wheel': TireField as any,
  'brake_pad': BrakeField as any,
  'brake_disc': BrakeField as any,
  'brake_drum': BrakeField as any
};

/**
 * Factory function to get a field component by type or ID
 */
export const getFieldComponent = (
  fieldType: string,
  fallback?: FieldComponentType
): FieldComponentType | null => {
  const component = FIELD_COMPONENT_REGISTRY[fieldType.toLowerCase()];
  
  if (component) {
    return component;
  }
  
  // Try partial matches for complex field types
  const typeKeys = Object.keys(FIELD_COMPONENT_REGISTRY);
  const partialMatch = typeKeys.find(key => 
    fieldType.toLowerCase().includes(key) || key.includes(fieldType.toLowerCase())
  );
  
  if (partialMatch) {
    return FIELD_COMPONENT_REGISTRY[partialMatch];
  }
  
  // Return fallback or null
  return fallback || null;
};

/**
 * Helper function to check if a field type is supported
 */
export const isFieldTypeSupported = (fieldType: string): boolean => {
  return getFieldComponent(fieldType) !== null;
};

/**
 * Get all available field types
 */
export const getAvailableFieldTypes = (): string[] => {
  return Object.keys(FIELD_COMPONENT_REGISTRY);
};

/**
 * Register a new field component type
 */
export const registerFieldComponent = (
  fieldType: string,
  component: FieldComponentType
): void => {
  FIELD_COMPONENT_REGISTRY[fieldType.toLowerCase()] = component;
};

/**
 * Dynamic field component renderer
 */
export interface DynamicFieldProps extends BaseFieldProps {
  fieldType: string;
  fallbackComponent?: FieldComponentType;
}

export const DynamicField: React.FC<DynamicFieldProps> = ({
  fieldType,
  fallbackComponent,
  ...props
}) => {
  const FieldComponent = getFieldComponent(fieldType, fallbackComponent);
  
  if (!FieldComponent) {
    console.warn(`No field component found for type: ${fieldType}`);
    return (
      <NormalizedFieldTemplate
        {...props}
        label={props.label || `Unknown Field (${fieldType})`}
        error={`Unsupported field type: ${fieldType}`}
      >
        <div style={{ padding: '16px', textAlign: 'center', color: '#999' }}>
          Field type "{fieldType}" is not supported.
          <br />
          Available types: {getAvailableFieldTypes().join(', ')}
        </div>
      </NormalizedFieldTemplate>
    );
  }
  
  return <FieldComponent {...props} />;
};