# QuickCheck Vehicle Inspection App

QuickCheck is a comprehensive vehicle inspection application that allows technicians to perform detailed vehicle inspections and document their findings with photos and measurements. The application follows a **blank slate** approach for user input fields, ensuring technicians make conscious decisions rather than accepting default values.

## Form Initialization Philosophy

### Blank Slate Approach
QuickCheck implements a **blank slate** philosophy where all user-selectable fields start with no pre-selected values. This approach:

- **Forces Conscious Decisions**: Technicians must actively choose each condition/status
- **Improves Data Quality**: Eliminates accidental acceptance of default values
- **Enhances Compliance**: Ensures all inspections are properly documented
- **Reduces Errors**: Prevents confusion about what has been inspected
- **Creates Clear Audit Trails**: Distinguishes between user input and system data

### System vs User Fields

#### **System Fields (Auto-populated)**
These fields are automatically set and should not be changed:
- **`inspection_type`**: `'quick_check'` - Identifies the form type
- **`date`**: Current date - Auto-generated inspection date  
- **`user`**: User name from localStorage - Identifies the inspector

#### **User Input Fields (Blank Initial Values)**
All technician-selectable fields start blank (`''`) to ensure intentional data entry:

**Tires & Brakes Section:**
- Brake pad conditions (`inner`, `outer`, `rotor_condition`) for all positions
- Tire tread measurements and conditions for all depth points
- Status fields (`tire_repair_status`, `tpms_type`, `tire_rotation`, `static_sticker`, `drain_plug_type`)

**Underhood Section:**
- Windshield condition (`windshield_condition`)
- Wiper blade conditions (`wiper_blades`, `wiper_blades_front`, `wiper_blades_rear`)
- Washer system conditions (`washer_squirters`, `washer_fluid`)
- Battery condition (`battery_condition_main`)
- Engine air filter condition (`engine_air_filter`)
- State inspection status (`state_inspection_status`)

**Arrays & Objects:**
- Photo arrays start as empty arrays `[]`
- Status tracking objects start with `null` values
- Comment fields start as empty objects `{}`

## Features

### Vehicle Information
- VIN Scanner with camera support and QR code scanning
- Automatic VIN decoding with NHTSA API integration
- Date and mileage tracking with comma formatting
- User identification and session management

### Exterior Inspection (Pulling Into Bay)
- **Dash Lights Documentation**: Photo upload with multiple image support and fullscreen viewing
- **Mileage Entry**: Numeric input with automatic comma formatting
- **Windshield Condition**: Good/Bad assessment with crack size evaluation (starts blank)
- **Wiper Blades**: Comprehensive condition assessment including:
  - Front/Rear blade conditions (start blank)
  - Minor/Moderate/Major wear levels
- **Washer Squirters**: Multi-point functionality check including:
  - Fluid level assessment (starts blank)
  - Sprayer functionality
  - Leak detection
  - Pump sound verification

### Underhood Inspection
- **TPMS Placard**: Photo documentation with camera integration
- **State Inspection Status**: 
  - Date code input (MM/YY format)
  - Automatic expired status detection
  - Visual indicators (✅ Valid / ❌ EXPIRED)
  - Status field starts blank
- **Washer Fluid**: Condition assessment with photo documentation (starts blank)
- **Engine Air Filter**: Multi-condition assessment including:
  - Good condition
  - Next oil change recommendation
  - Highly recommended replacement
  - Immediate replacement needed
  - Animal-related damage
  - Field starts blank
- **Battery Condition**: Multi-select functionality including:
  - Good condition
  - Warning status
  - Bad condition
  - N/A (with prominent visual styling)
  - Terminal cleaning needed
  - Date code input (MM/YY format)
  - Main condition field starts blank
- **TPMS Tool**: Photo documentation for sensor issues

### Tires and Brakes
- **Comprehensive Tire Assessment**: All positions with detailed measurements:
  - Passenger front
  - Driver front
  - Driver rear
  - Passenger rear
  - Spare tire

- **Tire Tread Measurements**: Five-point depth measurement system:
  - Outer edge depth
  - Outer depth
  - Center depth
  - Inner depth
  - Inner edge depth
  - All condition fields start blank (no default "green" values)
  - Visual SVG representation of tread wear

- **Tire Comments System**: Multi-select chip system including:
  - Separated
  - Dry-rotted
  - Date tracking for each tire

- **Brake Pad Assessment**: Comprehensive evaluation including:
  - Inner pad thickness measurement (starts blank)
  - Outer pad thickness measurement (starts blank)
  - Rotor condition assessment (Good/Grooves/Overheated/Scared) - starts blank
  - Visual brake system representation
  - Photo documentation for front and rear brakes

- **Tire Repair System**: 
  - Repairable/Non-repairable status tracking (starts blank)
  - Visual tire layout with clickable zones
  - Position-specific status tracking

- **TPMS System**:
  - Sensor status tracking for all positions (starts blank)
  - Visual layout with clickable zones
  - Bad sensor documentation with photo support

- **Additional Features**:
  - Tire rotation status (starts blank)
  - Static sticker assessment (starts blank)
  - Drain plug type identification (starts blank)
  - Undercarriage photo documentation

### Photo Documentation
- **Advanced Camera Integration**:
  - Multiple camera device support
  - Flash control for low-light conditions
  - Camera switching capabilities
  - Permission handling with user-friendly instructions
- **Photo Management**:
  - Multiple photo upload per component
  - Fullscreen photo viewing with navigation
  - Photo deletion capabilities
  - Progress tracking for uploads
  - Image validation (file type, size limits)
- **Photo Organization**:
  - Component-specific photo grouping
  - Preview thumbnails
  - Slideshow functionality

### Real-time Saving and Draft Management
- **Automatic Draft Saving**: Every 30 seconds with progress indicators
- **Manual Save**: User-initiated save functionality
- **Draft Recovery**: Automatic loading of previous drafts
- **Backend Integration**: Draft storage with file upload support
- **Offline Capability**: Local storage with sync when connection restored

### Review and History
- **Complete Inspection Review**: Comprehensive form review before submission
- **Inspection History**: Complete audit trail with search capabilities
- **Report Generation**: Detailed inspection reports
- **Detail View**: Full inspection details with photo galleries

### User Interface Features
- **Tabbed Navigation**: Organized sections for better workflow
- **Info Overlays**: Helpful tooltips and information popups
- **Responsive Design**: Mobile and desktop optimization
- **Visual Indicators**: Color-coded status indicators throughout
- **Auto-focus**: Intelligent field navigation for efficient data entry
- **Blank Initial Values**: All user input fields start unselected for intentional data entry

## Technical Details

### Form Initialization
- **Type Safety**: All form field types updated to allow empty strings (`''`) as valid values
- **Blank Slate**: No default selections for any user input field
- **System Fields**: Only essential system fields are pre-populated
- **Validation**: Comprehensive validation while maintaining blank initial state

### Camera Integration
- **Multi-device Support**: Automatic rear camera detection on mobile
- **Flash Control**: Torch functionality for low-light conditions
- **Permission Handling**: Graceful fallback with user instructions
- **QR Code Scanning**: Integrated VIN scanning capabilities
- **Photo Capture**: High-quality image capture with preview

### Data Management
- **TypeScript Integration**: Full type safety and validation
- **Form State Management**: Comprehensive state tracking
- **Real-time Validation**: Immediate feedback on data entry
- **Error Handling**: Graceful error recovery and user notifications
- **Auto-save Integration**: Seamless draft management
- **Blank Initial Values**: All user fields start unselected

### API Integration
- **NHTSA VIN Decoding**: Automatic vehicle information retrieval
- **File Upload**: Multi-file upload with progress tracking
- **Backend Sync**: Real-time data synchronization
- **Error Recovery**: Robust error handling and retry mechanisms

## Usage

### Starting an Inspection
1. **VIN Entry**: Scan or manually enter the vehicle VIN
2. **Vehicle Details**: Review automatically decoded vehicle information
3. **Basic Information**: Enter inspection date and mileage

### Exterior Inspection
1. **Dash Lights**: Take photos of illuminated dashboard lights
2. **Mileage**: Enter current vehicle mileage
3. **Windshield**: Assess windshield condition and document cracks (starts blank)
4. **Wiper Blades**: Evaluate front and rear wiper blade conditions (start blank)
5. **Washer System**: Test and document washer fluid and sprayer functionality (starts blank)

### Underhood Inspection
1. **TPMS Placard**: Document the tire pressure placard
2. **State Inspection**: Enter inspection date and verify status (status starts blank)
3. **Washer Fluid**: Check fluid level and system functionality (starts blank)
4. **Air Filter**: Assess engine air filter condition (starts blank)
5. **Battery**: Evaluate battery condition and document date code (main condition starts blank)
6. **TPMS Tool**: Document any sensor issues

### Tires and Brakes
1. **Tire Tread**: Measure tread depth at five points per tire (all conditions start blank)
2. **Tire Comments**: Select applicable tire conditions
3. **Tire Dates**: Enter tire manufacturing dates
4. **Brake Pads**: Measure inner and outer pad thickness (start blank)
5. **Rotor Condition**: Assess rotor surface condition (starts blank)
6. **Photos**: Document all tire and brake components
7. **Additional Systems**: Evaluate TPMS, rotation status, and other components (all start blank)

### Final Steps
1. **Review**: Complete review of all inspection data
2. **Notes**: Add any additional observations
3. **Submit**: Final submission with all documentation

## Requirements

- **Browser**: Modern web browser with camera support
- **Permissions**: Camera and microphone access
- **Connection**: Internet connection for API calls and uploads
- **Device**: Mobile device or desktop with camera access
- **Storage**: Adequate storage for photo uploads

## Recent Updates

### Version 2.1 - Blank Initial Values Implementation
- **Blank Slate Philosophy**: All user input fields now start with no pre-selected values
- **Enhanced Data Quality**: Forces technicians to make conscious decisions
- **Improved Compliance**: Ensures all inspections are properly documented
- **Type Safety Updates**: All form field types updated to support empty strings
- **User Experience**: Clear distinction between system and user fields

### Version 2.0 Features
- **Mirrored Tire Layout**: Updated tire measurement order (Outer Edge → Inner Edge)
- **Battery Multi-select**: Enhanced battery condition assessment with multiple selections
- **State Inspection Redesign**: Simplified date-based inspection tracking
- **Enhanced Photo Management**: Improved photo organization and viewing
- **Auto-focus Navigation**: Intelligent field navigation for efficient data entry
- **Info Overlay System**: Comprehensive help system with contextual information
- **TypeScript Integration**: Full type safety and improved development experience

### UI/UX Improvements
- **Visual Indicators**: Enhanced status indicators and color coding
- **Responsive Design**: Improved mobile and desktop experience
- **Navigation**: Streamlined tab-based workflow
- **Error Handling**: Better error messages and recovery options
- **Blank Initial Values**: All user input fields start unselected

## Notes

- **Photo Validation**: All photos are validated for type and size before upload
- **Camera Permissions**: Required for full functionality with helpful instructions
- **Cross-platform**: Optimized for both mobile and desktop devices
- **Flash Support**: Available for low-light photography
- **Auto-save**: Drafts automatically saved every 30 seconds
- **Offline Mode**: Available with sync when connection is restored
- **Data Integrity**: Comprehensive validation and error handling
- **Blank Initial Values**: All user-selectable fields start unselected for intentional data entry
- **Form Philosophy**: Blank slate approach ensures data quality and compliance

## Documentation

This project includes comprehensive documentation:

- **[README.Details.md](README.Details.md)** - Detailed application features and workflows
- **[README.API.md](README.API.md)** - API documentation and endpoints
- **[README.Database.md](README.Database.md)** - Database schema and management
- **[README.History.md](README.History.md)** - Version history and changelog
- **[README.Login.md](README.Login.md)** - Authentication and user management
- **[README.Profile.md](README.Profile.md)** - User profile and settings

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Framework**: Material-UI (@mui/material)
- **Routing**: React Router DOM
- **Camera**: HTML5 Camera API with @zxing/browser
- **State Management**: React Hooks with custom state management
- **File Handling**: HTML5 File API with drag-and-drop support
- **Styling**: Material-UI theming with custom components

## Prerequisites

- Node.js (v16 or higher)
- npm (v8 or higher)
- Modern web browser with camera support
- Internet connection for API calls 