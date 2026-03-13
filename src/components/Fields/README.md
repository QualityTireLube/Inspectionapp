# Component-Driven Field System

## 🎯 **Overview**

This system allows you to create **reusable, composable field components** that can be dynamically assembled into any inspection type without writing custom code.

## 🏗️ **Architecture**

```
src/components/Fields/
├── base/                    # Core interfaces & wrappers
├── basic/                   # Text, Select, Number, etc.
├── automotive/              # Tire, Battery, VIN, etc.
├── media/                   # Photo, Video, Audio
├── layout/                  # Headers, Spacers, Dividers
├── complex/                 # Multi-field components
├── FieldRegistry.tsx        # Component factory
└── index.ts                # Main exports
```

## 🚀 **Quick Start**

### **1. Using Existing Fields**
```typescript
import { DynamicField } from '../components/Fields';

// Simple text field
<DynamicField
  fieldType="text"
  id="vin"
  label="VIN Number"
  value={form.vin}
  onChange={(value) => setForm({...form, vin: value})}
  required={true}
  maxLength={17}
/>

// Tire tread measurement
<DynamicField
  fieldType="tire_tread"
  id="driver_front_tread"
  label="Driver Front Tire"
  value={form.driver_front_tread}
  onChange={(value) => setForm({...form, driver_front_tread: value})}
  position="driver_front"
/>

// Photo upload
<DynamicField
  fieldType="photo"
  id="battery_photos"
  label="Battery Photos"
  value={form.battery_photos}
  onChange={(value) => setForm({...form, battery_photos: value})}
  maxFiles={5}
/>
```

### **2. Creating Dynamic Inspection Types**
```json
{
  "tire_inspection": {
    "title": "Tire Inspection",
    "tabOrder": ["info", "assessment", "photos"],
    "fieldsByTab": {
      "info": [
        {
          "type": "text",
          "id": "technician",
          "label": "Technician Name",
          "required": true
        },
        {
          "type": "text", 
          "id": "vin",
          "label": "VIN",
          "maxLength": 17
        }
      ],
      "assessment": [
        {
          "type": "section_header",
          "label": "Tire Condition Assessment"
        },
        {
          "type": "tire_tread",
          "id": "front_left_tread",
          "label": "Front Left Tire",
          "position": "driver_front"
        },
        {
          "type": "tire_tread", 
          "id": "front_right_tread",
          "label": "Front Right Tire",
          "position": "passenger_front"
        }
      ],
      "photos": [
        {
          "type": "photo",
          "id": "tire_photos",
          "label": "Tire Photos",
          "maxFiles": 10
        }
      ]
    }
  }
}
```

## 🔧 **Creating New Field Components**

### **Step 1: Define the Component**
```typescript
// src/components/Fields/automotive/BatteryField.tsx
import React from 'react';
import { BaseFieldProps, withBaseField } from '../base';

interface BatteryData {
  voltage: number;
  condition: 'good' | 'weak' | 'bad';
  dateCode: string;
  terminals: 'clean' | 'corroded';
}

interface BatteryFieldProps extends BaseFieldProps<BatteryData> {
  showVoltageTest?: boolean;
  allowManualEntry?: boolean;
}

const BatteryFieldCore: React.FC<BatteryFieldProps> = ({
  id,
  value = { voltage: 0, condition: 'good', dateCode: '', terminals: 'clean' },
  onChange,
  disabled,
  showVoltageTest = true
}) => {
  // Your component implementation
  return (
    <div>
      {/* Battery testing UI */}
    </div>
  );
};

export const BatteryField = withBaseField(BatteryFieldCore);

export const BatteryFieldDefinition = {
  id: 'battery',
  name: 'Battery Field',
  category: 'automotive' as const,
  description: 'Battery condition and voltage testing'
};
```

### **Step 2: Register the Component**
```typescript
// Add to src/components/Fields/FieldRegistry.tsx
import { BatteryField, BatteryFieldDefinition } from './automotive/BatteryField';

export const FIELD_COMPONENT_REGISTRY = {
  // ... existing fields
  battery: {
    component: BatteryField,
    definition: BatteryFieldDefinition
  }
};
```

### **Step 3: Use in Inspection Schemas**
```json
{
  "fieldsByTab": {
    "underhood": [
      {
        "type": "battery",
        "id": "battery_test",
        "label": "Battery Test",
        "showVoltageTest": true
      }
    ]
  }
}
```

## 📋 **Available Field Types**

### **Basic Fields**
- `text` - Single-line text input
- `select` - Dropdown selection
- `number` - Numeric input
- `date` - Date picker
- `textarea` - Multi-line text
- `checkbox` - Boolean checkbox

### **Automotive Fields**
- `tire_tread` - Tire tread depth measurement
- `battery` - Battery condition testing
- `vin` - VIN decoder field
- `brake_pad` - Brake pad condition

### **Media Fields**
- `photo` - Photo upload with preview
- `video` - Video recording/upload
- `audio` - Audio recording

### **Layout Fields**
- `section_header` - Visual section divider
- `spacer` - Vertical spacing
- `divider` - Horizontal line

## 🎨 **Field Customization**

### **Props & Configuration**
```typescript
<DynamicField
  fieldType="text"
  id="custom_field"
  
  // Standard props
  label="Custom Field"
  description="Additional help text"
  placeholder="Enter value..."
  required={true}
  disabled={false}
  
  // Validation
  maxLength={50}
  pattern="[A-Z0-9]+"
  onValidate={(value) => value.length > 5 ? null : "Too short"}
  
  // Layout
  fullWidth={true}
  size="small"
  variant="outlined"
  
  // Conditional logic
  showIf={(context) => context.form.vehicleType === 'car'}
  readOnlyIf={(context) => context.user.role !== 'admin'}
/>
```

### **Styling & Themes**
```typescript
// Custom styling
<DynamicField
  fieldType="photo"
  sx={{
    '& .photo-grid': {
      gridTemplateColumns: 'repeat(3, 1fr)'
    }
  }}
/>
```

## 🔄 **Dynamic Field Management**

### **Field Factory Usage**
```typescript
import { FieldFactory, useFieldFactory } from '../components/Fields';

// Get available fields
const availableFields = FieldFactory.getAvailableFields();

// Filter by category
const automotiveFields = FieldFactory.getFieldsByCategory('automotive');

// Create field dynamically
const field = FieldFactory.createField('tire_tread', {
  id: 'dynamic_tread',
  value: treadData,
  onChange: handleChange
});

// Register custom field
FieldFactory.registerField('custom_type', CustomComponent, {
  id: 'custom_type',
  name: 'Custom Type',
  category: 'custom'
});
```

### **Runtime Field Registration**
```typescript
// Register fields from plugins or external sources
const registerExternalField = (fieldConfig) => {
  FieldFactory.registerField(
    fieldConfig.type,
    fieldConfig.component,
    fieldConfig.definition
  );
};
```

## ✅ **Benefits**

- ✅ **Reusable**: Create once, use anywhere
- ✅ **Dynamic**: No code changes for new inspection types
- ✅ **Consistent**: All fields follow same patterns
- ✅ **Extensible**: Easy to add new field types
- ✅ **Type-Safe**: Full TypeScript support
- ✅ **Testable**: Each field can be tested independently
- ✅ **Maintainable**: Clear separation of concerns

## 🧪 **Testing Fields**

```typescript
// Individual field testing
import { render, fireEvent } from '@testing-library/react';
import { TextField } from '../components/Fields';

test('TextField handles value changes', () => {
  const onChange = jest.fn();
  const { getByDisplayValue } = render(
    <TextField
      id="test"
      value="initial"
      onChange={onChange}
    />
  );
  
  fireEvent.change(getByDisplayValue('initial'), {
    target: { value: 'new value' }
  });
  
  expect(onChange).toHaveBeenCalledWith('new value');
});
```

This system gives you complete flexibility to create any inspection type by composing reusable field components! 🚀
