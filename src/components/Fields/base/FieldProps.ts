/**
 * Base Field Component System
 * 
 * Defines the standard interface for all field components
 * to ensure consistency and reusability across inspection types.
 */

export interface BaseFieldProps<T = any> {
  // Core field properties
  id: string;
  value: T;
  onChange: (value: T) => void;
  
  // Field metadata
  label?: string;
  description?: string;
  placeholder?: string;
  
  // Validation & state
  error?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  
  // Layout & styling
  fullWidth?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'outlined' | 'filled' | 'standard';
  
  // Field-specific context
  context?: {
    form?: any;
    inspection?: any;
    user?: any;
    [key: string]: any;
  };
  
  // Event handlers
  onBlur?: () => void;
  onFocus?: () => void;
  onValidate?: (value: T) => string | null;
  
  // Advanced features
  dependencies?: string[];
  showIf?: (context: any) => boolean;
  readOnlyIf?: (context: any) => boolean;
}

export interface FieldComponentDefinition {
  id: string;
  name: string;
  category: 'basic' | 'media' | 'automotive' | 'layout' | 'complex';
  description: string;
  defaultProps?: Partial<BaseFieldProps>;
  configurable?: {
    options?: boolean;
    validation?: boolean;
    layout?: boolean;
  };
}

export interface FieldValidationRule {
  type: 'required' | 'min' | 'max' | 'pattern' | 'custom';
  value?: any;
  message?: string;
  validator?: (value: any, context?: any) => boolean;
}

export interface FieldOption {
  value: string | number;
  label: string;
  description?: string;
  disabled?: boolean;
  group?: string;
}
