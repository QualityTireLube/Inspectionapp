/**
 * Fields Module - Complete Export
 * 
 * Normalized field component system with consistent templates
 * and specialized content types for inspection applications
 */

// Base components
export { default as NormalizedFieldTemplate } from './base/NormalizedFieldTemplate';
export { BaseFieldWrapper, withBaseField } from './base/BaseField';
export type { NormalizedFieldTemplateProps } from './base/NormalizedFieldTemplate';
export type { BaseFieldProps, FieldOption } from './base/FieldProps';

// Content field components
export {
  ImageVideoField,
  VinField,
  ChipField,
  MileageField,
  TireField,
  BrakeField
} from './content';

export type {
  ImageVideoFieldProps,
  VinFieldProps,
  VinDecodedData,
  ChipFieldProps,
  MileageFieldProps,
  TireFieldProps,
  TireData,
  BrakeFieldProps,
  BrakeData
} from './content';

// Field registry and factory (commented out to avoid circular imports for now)
// export { getFieldComponent, FIELD_COMPONENT_REGISTRY } from './FieldRegistry';

// Demo component
export { default as FieldShowcase } from './demo/FieldShowcase';