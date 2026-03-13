/**
 * Existing Design Adapter
 * 
 * Adapts the normalized field system to use your existing, cleaner component designs
 * instead of creating new ones. This preserves your established visual patterns.
 */

import React from 'react';
import { BaseFieldProps } from '../base/FieldProps';

// Import your existing, proven components
import { VinDecoder } from '../../QuickCheck/VinDecoder';
import ImageFieldRectangle from '../../Image/ImageFieldRectangle';
import NotesField from '../../QuickCheck/tabs/NotesField';
// import SafariImageUpload from '../../Image/SafariImageUpload'; // Not needed for this adapter

// Import your existing widget system
import {
  TextWidget,
  NumberWidget,
  SelectWidget,
  TextareaWidget,
  DateWidget,
  CheckboxWidget,
  PhotoWidget,
  SectionHeaderWidget,
  WidgetProps
} from '../../InspectionEngine/widgetRegistry';

/**
 * Adapter interface for converting between BaseFieldProps and existing component props
 */
export interface FieldAdapter<TProps = any> {
  component: React.ComponentType<TProps>;
  propsAdapter: (props: BaseFieldProps) => TProps;
}

/**
 * VIN Field Adapter - Uses your existing VinDecoder component
 */
export const VinFieldAdapter: FieldAdapter = {
  component: VinDecoder,
  propsAdapter: (props: BaseFieldProps) => ({
    vin: props.value as string || '',
    onVinChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      props.onChange(e.target.value);
    },
    required: props.required,
    disabled: props.disabled
  })
};

/**
 * Image Rectangle Field Adapter - Uses your existing ImageFieldRectangle
 */
export const ImageRectangleAdapter: FieldAdapter = {
  component: ImageFieldRectangle,
  propsAdapter: (props: BaseFieldProps) => ({
    label: props.label,
    images: (props.value as string[]) || [],
    onImageUpload: async (file: File, type: any) => {
      const currentImages = (props.value as string[]) || [];
      // You would implement actual upload logic here
      const newImageUrl = URL.createObjectURL(file);
      props.onChange([...currentImages, newImageUrl]);
    },
    onImageRemove: (index: number) => {
      const currentImages = (props.value as string[]) || [];
      const newImages = currentImages.filter((_, i) => i !== index);
      props.onChange(newImages);
    },
    onImageView: (imageUrl: string) => {
      // Handle image viewing - you could integrate with your existing image viewer
      console.log('View image:', imageUrl);
    },
    uploadType: props.id,
    disabled: props.disabled,
    multiple: true,
    maxFiles: 5
  })
};

/**
 * Notes Field Adapter - Uses your existing NotesField component
 */
export const NotesFieldAdapter: FieldAdapter = {
  component: NotesField,
  propsAdapter: (props: BaseFieldProps) => ({
    fieldName: props.id,
    fieldLabel: props.label,
    notes: { [props.id]: props.value as string || '' },
    onNotesChange: (fieldName: string, noteText: string) => {
      props.onChange(noteText);
    },
    tooltipText: props.description
  })
};

/**
 * Widget Adapter - Converts BaseFieldProps to WidgetProps for existing widgets
 */
export const createWidgetAdapter = (
  WidgetComponent: React.ComponentType<WidgetProps>
): FieldAdapter => ({
  component: WidgetComponent,
  propsAdapter: (props: BaseFieldProps) => ({
    field: {
      id: props.id,
      label: props.label,
      type: 'text', // Default type, would be determined by actual field config
      description: props.description,
      placeholder: props.placeholder,
      maxLength: props.maxLength,
      min: props.min,
      max: props.max,
      options: props.options,
      required: props.required,
      multiple: props.multiple,
      widget: props.widget,
      defaultValue: props.defaultValue
    },
    value: props.value,
    onChange: props.onChange,
    error: props.error,
    disabled: props.disabled,
    required: props.required,
    context: props.context
  })
});

/**
 * Registry of adapted components using your existing designs
 */
export const EXISTING_DESIGN_REGISTRY: Record<string, FieldAdapter> = {
  // Use your existing VinDecoder
  'vin': VinFieldAdapter,
  'vehicle_id': VinFieldAdapter,
  
  // Use your existing ImageFieldRectangle for rectangular image fields
  'image_rectangle': ImageRectangleAdapter,
  'dash_image': ImageRectangleAdapter,
  'tpms_placard': ImageRectangleAdapter,
  'dashboard_image': ImageRectangleAdapter,
  
  // Use your existing NotesField
  'notes': NotesFieldAdapter,
  'field_notes': NotesFieldAdapter,
  
  // Use your existing widget system for basic fields
  'text': createWidgetAdapter(TextWidget),
  'number': createWidgetAdapter(NumberWidget),
  'select': createWidgetAdapter(SelectWidget),
  'textarea': createWidgetAdapter(TextareaWidget),
  'date': createWidgetAdapter(DateWidget),
  'checkbox': createWidgetAdapter(CheckboxWidget),
  'photo': createWidgetAdapter(PhotoWidget),
  'section_header': createWidgetAdapter(SectionHeaderWidget),
};

/**
 * Enhanced Field Renderer that uses your existing component designs
 */
export interface EnhancedFieldProps extends BaseFieldProps {
  fieldType: string;
  useExistingDesign?: boolean;
}

export const EnhancedFieldRenderer: React.FC<EnhancedFieldProps> = ({
  fieldType,
  useExistingDesign = true,
  ...props
}) => {
  // Use existing design if available and requested
  if (useExistingDesign && EXISTING_DESIGN_REGISTRY[fieldType]) {
    const adapter = EXISTING_DESIGN_REGISTRY[fieldType];
    const Component = adapter.component;
    const adaptedProps = adapter.propsAdapter(props);
    
    return <Component {...adaptedProps} />;
  }
  
  // Fallback to basic widget rendering
  const basicAdapter = createWidgetAdapter(TextWidget);
  const Component = basicAdapter.component;
  const adaptedProps = basicAdapter.propsAdapter(props);
  
  return <Component {...adaptedProps} />;
};

/**
 * Simplified Field Component that automatically uses your existing designs
 */
export const AdaptedField: React.FC<EnhancedFieldProps> = (props) => {
  return (
    <div style={{ marginBottom: '16px' }}>
      <EnhancedFieldRenderer {...props} />
    </div>
  );
};

/**
 * Register a new field adapter for your existing components
 */
export const registerExistingDesign = (
  fieldType: string,
  adapter: FieldAdapter
): void => {
  EXISTING_DESIGN_REGISTRY[fieldType] = adapter;
};

/**
 * Helper to create adapters for your complex existing components
 */
export const createComplexAdapter = <TProps extends any>(
  component: React.ComponentType<TProps>,
  propsMapper: (props: BaseFieldProps) => TProps
): FieldAdapter<TProps> => ({
  component,
  propsAdapter: propsMapper
});
