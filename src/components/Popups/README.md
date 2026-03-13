# Dynamic Popup System 🚀

## 🎯 **Overview**

A comprehensive, reusable popup system that provides **dynamic image prompts, help content, tutorials, and guided workflows** that can be triggered by any field interaction, tab navigation, or custom conditions.

## ✨ **Features**

- ✅ **Multiple Content Types**: Images, videos, tutorials, HTML, components
- ✅ **Smart Triggers**: Field focus, value changes, tab navigation, conditions
- ✅ **Auto-Management**: Priority-based display, auto-close, once-only
- ✅ **Contextual**: Role-based, inspection-type specific
- ✅ **Responsive**: Mobile-friendly, multiple sizes
- ✅ **Extensible**: Easy to add new popup types and triggers

## 🏗️ **Architecture**

```
src/components/Popups/
├── types/PopupTypes.ts           # TypeScript interfaces
├── core/PopupManager.tsx         # Central management system  
├── components/
│   ├── PopupRenderer.tsx         # Renders popup content
│   └── PopupOverlay.tsx         # Manages popup display
├── hooks/usePopupTriggers.ts    # Convenient trigger hooks
├── presets/InspectionPopups.ts  # Pre-built popup configs
└── README.md                    # This documentation
```

## 🚀 **Quick Start**

### **1. Setup Popup Manager**
```tsx
import { PopupManager, PopupOverlay } from '../components/Popups';

function App() {
  return (
    <PopupManager 
      inspectionType="quick_check"
      userRole="technician"
      formContext={formData}
    >
      <YourApp />
      <PopupOverlay />
    </PopupManager>
  );
}
```

### **2. Register Popups**
```tsx
import { usePopupManager, registerInspectionPopups } from '../components/Popups';

function InspectionSetup() {
  const { registerPopup } = usePopupManager();
  
  useEffect(() => {
    // Register pre-built inspection popups
    registerInspectionPopups(registerPopup);
    
    // Register custom popup
    registerPopup({
      id: 'custom_help',
      title: 'Custom Help',
      content: {
        type: 'image',
        imageUrl: '/images/help/custom-field.jpg',
        caption: 'How to use this custom field'
      },
      size: 'medium',
      triggers: [
        {
          id: 'custom_trigger',
          type: 'field_focus',
          targetField: 'custom_field'
        }
      ]
    });
  }, [registerPopup]);
}
```

### **3. Use with Fields**
```tsx
import { useFieldPopups } from '../components/Popups';

function MyCustomField({ id, value, onChange }) {
  const { triggerHelp, triggerValidation } = useFieldPopups(id);
  
  return (
    <Box>
      <TextField
        value={value}
        onChange={onChange}
        onFocus={() => triggerHelp()} // Auto-trigger help on focus
      />
      <IconButton onClick={() => triggerHelp()}>
        <HelpIcon />
      </IconButton>
    </Box>
  );
}
```

## 📋 **Popup Content Types**

### **Image Popup**
```tsx
{
  type: 'image',
  imageUrl: '/images/vin-location.jpg',
  imageAlt: 'VIN location guide',
  caption: 'VIN can be found on dashboard or door frame'
}
```

### **Image Gallery**
```tsx
{
  type: 'image_gallery',
  images: [
    { url: '/images/step1.jpg', caption: 'Step 1: Locate VIN' },
    { url: '/images/step2.jpg', caption: 'Step 2: Read characters' },
    { url: '/images/step3.jpg', caption: 'Step 3: Enter VIN' }
  ]
}
```

### **Video Tutorial**
```tsx
{
  type: 'video',
  videoUrl: '/videos/tire-measurement.mp4',
  videoType: 'mp4',
  caption: 'Learn proper tire tread measurement technique'
}
```

### **Step-by-Step Tutorial**
```tsx
{
  type: 'tutorial',
  steps: [
    {
      title: 'Step 1: Preparation',
      content: 'Ensure engine is cool and wear safety glasses',
      image: '/images/safety-prep.jpg'
    },
    {
      title: 'Step 2: Locate Battery',
      content: 'Find battery in engine bay or trunk',
      image: '/images/battery-location.jpg'
    }
  ]
}
```

### **Warning/Alert**
```tsx
{
  type: 'warning',
  title: 'Safety Warning',
  message: 'High voltage components present. Use insulated tools only.'
}
```

### **Custom Component**
```tsx
{
  type: 'component',
  component: MyCustomPopupComponent,
  componentProps: { data: formData }
}
```

## 🎛️ **Trigger Types**

### **Field-Based Triggers**
```tsx
// Trigger on field focus
{
  type: 'field_focus',
  targetField: 'vin',
  delay: 1000  // Wait 1 second after focus
}

// Trigger on value change
{
  type: 'field_change',
  targetField: 'tire_tread_depth',
  conditions: [
    { field: 'tire_tread_depth', operator: '<=', value: 2 }
  ]
}
```

### **Tab Navigation Triggers**
```tsx
// Welcome popup when entering tab
{
  type: 'tab_enter',
  targetTab: 'tires',
  once: true  // Show only once per session
}

// Summary when leaving tab
{
  type: 'tab_exit', 
  targetTab: 'underhood'
}
```

### **Conditional Triggers**
```tsx
// Complex conditions
{
  type: 'condition_met',
  conditions: [
    {
      expression: 'context.vehicle_year < 2010 && context.mileage > 100000'
    }
  ]
}

// Time-based triggers
{
  type: 'timer',
  delay: 300000,  // 5 minutes
  conditions: [
    { field: 'current_tab', operator: '=', value: 'tires' }
  ]
}
```

## 🎨 **Customization Options**

### **Size & Position**
```tsx
{
  size: 'large',           // small, medium, large, xlarge, auto, custom
  position: 'center',      // center, top, bottom, left, right, fullscreen
  width: 800,              // Custom width (when size: 'custom')
  height: 600,             // Custom height (when size: 'custom')
  modal: true,             // Block background interaction
  backdrop: true           // Show backdrop overlay
}
```

### **Behavior Options**
```tsx
{
  autoClose: 5000,         // Auto-close after 5 seconds
  closable: true,          // User can close popup
  once: true,              // Show only once per session
  priority: 10             // Higher priority shows on top
}
```

### **Context Restrictions**
```tsx
{
  inspectionTypes: ['quick_check', 'vsi'],  // Only for specific types
  userRoles: ['technician', 'admin']        // Only for specific roles
}
```

## 🔧 **Integration Examples**

### **Field Component Integration**
```tsx
// Enhanced field with popup support
function TireTreadField({ id, value, onChange }) {
  const { triggerHelp } = useFieldPopups(id);
  
  // Auto-trigger validation popup on low values
  useFieldValidationPopups(id, value);
  
  return (
    <Box>
      <TireTreadInput 
        value={value}
        onChange={onChange}
        onFocus={() => triggerHelp()}
      />
      {value <= 2 && (
        <Alert severity="error">
          Low tread depth detected!
        </Alert>
      )}
    </Box>
  );
}
```

### **Tab Component Integration**
```tsx
function InspectionTabs({ currentTab, onTabChange }) {
  const { triggerTabEnter, triggerTabExit } = useTabPopups(currentTab);
  
  useEffect(() => {
    triggerTabEnter();
    return () => triggerTabExit();
  }, [currentTab]);
  
  return (
    <Tabs value={currentTab} onChange={onTabChange}>
      {/* Tab content */}
    </Tabs>
  );
}
```

### **Progress-Based Popups**
```tsx
function InspectionForm({ formData }) {
  const completionPercentage = calculateCompletion(formData);
  
  // Auto-trigger progress popups
  useProgressPopups(completionPercentage, formData);
  
  return <Form data={formData} />;
}
```

## 🎁 **Pre-Built Popup Presets**

The system comes with ready-to-use popups for common inspection scenarios:

- **`vin_decoder_help`** - VIN location and format guide
- **`tire_tread_measurement`** - Step-by-step tread measurement tutorial
- **`photo_upload_guide`** - Photo quality and composition guide
- **`underhood_safety_warning`** - Safety precautions for engine inspection
- **`low_tread_warning`** - Alert for dangerous tread depths
- **`battery_test_reminder`** - Conditional battery testing reminder
- **`inspection_progress`** - Progress milestone celebrations

## 🧪 **Testing Popups**

```tsx
// Test popup programmatically
const { showPopup } = usePopupManager();

function TestButton() {
  return (
    <Button onClick={() => showPopup('vin_decoder_help', { test: true })}>
      Test VIN Help Popup
    </Button>
  );
}
```

## 🎯 **Best Practices**

1. **📱 Keep Mobile-Friendly**: Use appropriate sizes and responsive content
2. **⚡ Avoid Popup Spam**: Use `once: true` and reasonable delays
3. **🎨 Consistent Styling**: Follow your app's design system
4. **♿ Accessibility**: Ensure keyboard navigation and screen reader support
5. **📊 Track Usage**: Monitor which popups are most helpful
6. **🔧 Test Thoroughly**: Verify triggers work in all scenarios

This popup system provides the ultimate flexibility for creating guided, interactive inspection experiences! 🚀
