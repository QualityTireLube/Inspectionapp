# Pages Documentation

This README provides a comprehensive overview of all pages in the Vehicle Inspection App, documenting their components, functionality, and how they work together.

## Table of Contents

1. [Authentication Pages](#authentication-pages)
2. [Dashboard & Home](#dashboard--home)
3. [QuickCheck System](#quickcheck-system)
4. [Inspection System](#inspection-system)
5. [Sticker Management](#sticker-management)
6. [Label Management](#label-management)
7. [User Management](#user-management)
8. [Settings & Configuration](#settings--configuration)
9. [Communication](#communication)
10. [Component Relationships](#component-relationships)

---

## Authentication Pages

### Login.tsx
**Purpose**: User authentication and session management

**Components Used**:
- Material-UI: `Container`, `Paper`, `TextField`, `Button`, `Typography`, `Box`, `Alert`, `CircularProgress`
- React Router: `useNavigate`, `Link`, `useLocation`

**Key Features**:
- Email/password authentication
- Return URL preservation after login
- Error handling with user feedback
- Loading states during authentication
- Links to registration page

**API Integration**: `login()` from `services/api`

### Register.tsx
**Purpose**: New user account creation

**Components Used**:
- Material-UI: `Container`, `Paper`, `TextField`, `Button`, `Typography`, `Box`, `Alert`, `CircularProgress`
- React Router: `useNavigate`, `Link`

**Key Features**:
- Full name, email, and password registration
- Input validation (email format, password length)
- Error handling with detailed feedback
- Automatic redirect to login after successful registration

**API Integration**: `register()` from `services/api`

---

## Dashboard & Home

### Home.tsx
**Purpose**: Main dashboard showing inspection overview and quick actions

**Components Used**:
- Material-UI: Extensive component library including `Container`, `Typography`, `Card`, `Button`, `Dialog`, `Fab`, etc.
- Custom Components: `CustomGrid`, `StickerPreview`, `LabelCreator`
- External Libraries: Icons from Material-UI icons

**Key Features**:
- **In-Progress Inspections**: Display and manage ongoing QuickChecks
- **Submitted Inspections**: View completed inspections with archive/delete options
- **Sticker Management**: Create, view, and manage oil change stickers
- **Timing Analysis**: Track inspection duration and performance metrics
- **Auto-refresh**: Real-time updates of inspection status

**API Integration**: 
- `getSubmittedQuickChecks()`, `getInProgressQuickChecks()`
- `archiveQuickCheck()`, `deleteQuickCheck()`
- `getTimingSummary()`, `decodeVinNHTSA()`

**State Management**:
- Multiple state hooks for different data sets
- Real-time data synchronization
- Error handling and loading states

---

## QuickCheck System

### QuickCheck.tsx
**Purpose**: Main inspection form for comprehensive vehicle checks

**Components Used**:
- Material-UI: Complete form components, dialogs, tabs, progress indicators
- Custom Components: `TireRepairLayout`, `TPMSLayout`, `TireTreadSection`, `BrakePadSection`, `VirtualTabTimer`
- External Libraries: `Html5QrcodeScanner`, `Swiper` for image carousels

**Key Features**:
- **Multi-tab Interface**: Info, Pulling Into Bay, Underhood, Tires & Brakes
- **VIN Scanning**: QR code and barcode scanning with NHTSA VIN decoding
- **Photo Management**: Camera integration, file uploads, image organization
- **Auto-save**: Draft saving every 30 seconds
- **Timing Tracking**: Tab-level timing for performance analysis
- **Form Validation**: Comprehensive input validation and error handling

**Major Sections**:
1. **Vehicle Information**: VIN, date, user, mileage
2. **Exterior Inspection**: Dash lights, windshield, wipers
3. **Underhood**: TPMS placard, state inspection, air filter, battery
4. **Tires & Brakes**: Tire condition, tread measurement, brake assessment

**API Integration**:
- `submitQuickCheck()`, `createDraftQuickCheck()`, `updateDraftQuickCheck()`
- `decodeVinNHTSA()`, `deleteQuickCheckPhoto()`
- `trackTabEntry()`, `trackTabExit()`

### QuickCheckDetail.tsx
**Purpose**: Detailed view of completed inspections

**Components Used**:
- Material-UI: Layout and display components
- Custom visualization components for inspection data

**Key Features**:
- Complete inspection data display
- Photo galleries with navigation
- PDF generation and download
- Edit and archive capabilities

### QuickCheckDatabase.tsx
**Purpose**: Administrative view of all QuickCheck records

**Components Used**:
- Material-UI: `Table`, `Dialog`, `IconButton`, `Chip`, `Card`
- Custom Components: `CustomGrid`

**Key Features**:
- **Data Management**: View, search, filter inspection records
- **Bulk Operations**: Archive, delete multiple records
- **Timing Analysis**: Performance metrics and timing data
- **Export Functionality**: CSV export of inspection data
- **Image Galleries**: View uploaded photos from inspections

### QuickCheckDrafts.tsx
**Purpose**: Management of saved draft inspections

**Components Used**:
- Material-UI: `Table`, `Button`, `Dialog`, `CircularProgress`
- React Router: `useNavigate`

**Key Features**:
- Draft listing with user information
- Continue editing drafts
- Individual and bulk draft deletion
- Navigation to continue incomplete inspections

### QuickCheckRecords.tsx
**Purpose**: View and manage completed inspection records

**Components Used**:
- Material-UI: `Table`, `TablePagination`, `Chip`, `IconButton`
- React Router: `useNavigate`

**Key Features**:
- Paginated record display
- Overall condition assessment
- Record viewing and deletion
- Navigation to detailed views

### QuickCheckRefactored.tsx
**Purpose**: Simplified version of QuickCheck form

**Components Used**:
- Material-UI: Basic form components
- Simplified inspection workflow

---

## Inspection System

### InspectionForm.tsx
**Purpose**: Alternative inspection form interface

**Components Used**:
- Material-UI: `Container`, `TextField`, `Checkbox`, `Paper`
- Custom Components: `CustomGrid`
- External Libraries: `Html5QrcodeScanner`

**Key Features**:
- Vehicle identification with VIN scanning
- Checkbox-based inspection categories
- Exterior, interior, and mechanical checks
- Notes and comments section

### InspectionRecords.tsx
**Purpose**: Historical view of inspection records

**Components Used**:
- Material-UI: `Table`, `TablePagination`, `Chip`
- React Router: `useNavigate`

**Key Features**:
- Record listing with pagination
- Condition-based color coding
- Navigation to detailed views

### StateInspectionRecords.tsx
**Purpose**: State inspection tracking and management

**Components Used**:
- Material-UI: `Container`, `Button`, `Dialog`, `Alert`
- Custom Components: `AddRecordForm`, `RecordDeckView`, `AnalyticsView`

**Key Features**:
- State inspection record management
- Fleet account tracking
- Analytics and reporting
- Add new inspection records

---

## Sticker Management

### ActiveStickers.tsx
**Purpose**: Management of active oil change stickers

**Components Used**:
- Material-UI: `Card`, `TextField`, `Select`, `Dialog`, `Fab`
- Custom Components: `CustomGrid`, `StickerPreview`
- External Libraries: QR code generation

**Key Features**:
- **Sticker Creation**: VIN input with auto-decoding
- **Oil Type Selection**: Different oil change intervals
- **QR Code Generation**: Automatic QR code creation
- **PDF Generation**: Printable sticker generation
- **Sticker Management**: Archive, delete, print operations

**Services Used**:
- `StickerStorageService`: Local storage management
- `VinDecoderService`: VIN validation and formatting
- `PDFGeneratorService`: PDF generation

### ArchivedStickers.tsx
**Purpose**: Management of archived oil change stickers

**Components Used**:
- Material-UI: `Card`, `Dialog`, `IconButton`
- Custom Components: `CustomGrid`
- External Libraries: QR code display

**Key Features**:
- Archived sticker display
- Restore to active functionality
- Permanent deletion
- Sticker detail viewing

### StickerSettings.tsx
**Purpose**: Configuration of sticker templates and settings

**Components Used**:
- Material-UI: `TextField`, `Select`, `Table`, `Slider`, `Switch`
- Custom Components: `StickerPreview`, `ElementEditor`

**Key Features**:
- **Paper Size Configuration**: Various label sizes
- **Layout Settings**: Margins, positioning, fonts
- **Element Management**: Add, edit, delete sticker elements
- **Oil Type Management**: Configure oil change intervals
- **Preview Functionality**: Real-time sticker preview

---

## Label Management

### LabelManager.tsx
**Purpose**: Template-based label creation and management

**Components Used**:
- Material-UI: `Tabs`, `Button`, `Menu`, `Alert`
- Custom Components: `LabelTemplateCard`, `LabelEditor`

**Key Features**:
- **Template Management**: Create, edit, archive label templates
- **Categorization**: Active and archived template sections
- **Import System**: Pre-defined template import
- **Duplication**: Template copying functionality

**Store Integration**: `useLabelStore()` for state management

---

## User Management

### Users.tsx
**Purpose**: Administrative user management

**Components Used**:
- Material-UI: `Table`, `Chip`, `Select`, `Dialog`, `IconButton`

**Key Features**:
- **User Listing**: Display all system users
- **Role Management**: Change user roles (Technician, Service Advisor, Admin)
- **Status Control**: Enable/disable user accounts
- **User Deletion**: Remove users from system

**API Integration**: `getUsers()`, `deleteUser()`, `enableUser()`, `disableUser()`, `updateUserRole()`

### Profile.tsx
**Purpose**: User profile management and settings

**Components Used**:
- Material-UI: `TextField`, `Avatar`, `Paper`, `Grid`, `Alert`

**Key Features**:
- **Profile Information**: Name and email updates
- **Password Change**: Secure password updates
- **Avatar Display**: User initials avatar
- **Form Validation**: Input validation and error handling

---

## Settings & Configuration

### Settings.tsx
**Purpose**: Centralized settings management interface

**Components Used**:
- Material-UI: `Drawer`, `List`, `Tabs`, `IconButton`
- Custom Components: `GeneralSettings`, `UsersContent`, `StickerSettingsContent`, `LabelSettingsContent`

**Key Features**:
- **Navigation System**: Desktop drawer and mobile tabs
- **Section Management**: General, Users, Stickers, Labels
- **Responsive Design**: Adaptive layout for different screen sizes

---

## Communication

### Chat.tsx
**Purpose**: Internal communication system

**Components Used**:
- Material-UI: `List`, `TextField`, `Avatar`, `Badge`, `Dialog`
- Real-time messaging interface

**Key Features**:
- **Conversation Management**: Create, view, delete conversations
- **Message Handling**: Send, delete messages
- **User Selection**: Start conversations with available users
- **Real-time Updates**: Auto-scrolling and refresh
- **Message Status**: Read/unread indicators

**API Integration**: 
- `getChatConversations()`, `getChatMessages()`, `sendChatMessage()`
- `createOrGetConversation()`, `deleteChatMessage()`, `deleteChatConversation()`

---

## Component Relationships

### Data Flow Architecture

```
App.tsx
├── Authentication Pages (Login, Register)
├── Main Dashboard (Home.tsx)
│   ├── QuickCheck System
│   │   ├── QuickCheck.tsx (Main form)
│   │   ├── QuickCheckDetail.tsx (View)
│   │   ├── QuickCheckDatabase.tsx (Admin)
│   │   └── QuickCheckDrafts.tsx (Drafts)
│   ├── Sticker Management
│   │   ├── ActiveStickers.tsx
│   │   ├── ArchivedStickers.tsx
│   │   └── StickerSettings.tsx
│   └── Label Management
│       └── LabelManager.tsx
├── User Management
│   ├── Users.tsx (Admin)
│   └── Profile.tsx (User)
├── Settings.tsx (Configuration hub)
└── Communication
    └── Chat.tsx
```

### Shared Components

Many pages utilize shared components from `src/components/`:

- **Layout Components**: `Layout.tsx`, `ProtectedRoute.tsx`, `CustomGrid.tsx`
- **Form Components**: `ImageUploadField.tsx`, `ConditionalImageField.tsx`
- **Specialized Components**: `TireRepairLayout.tsx`, `TPMSLayout.tsx`, `BrakePadSection.tsx`
- **UI Components**: `StickerPreview.tsx`, `LabelEditor.tsx`, `ElementEditor.tsx`

### State Management

- **Local State**: Individual page state using React hooks
- **Context/Stores**: `useLabelStore()`, `useStateInspectionStore()`
- **Local Storage**: `StickerStorageService` for sticker data persistence
- **API State**: Real-time data from backend services

### Service Integration

All pages integrate with various services:

- **API Services**: `api.ts`, `quickCheckApi.ts`, `stateInspectionApi.ts`
- **Storage Services**: `stickerStorage.ts`, `labelApi.ts`
- **Utility Services**: `vinDecoder.ts`, `pdfGenerator.ts`
- **Firebase**: `firebase.ts` for additional integrations

---

## Development Guidelines

### Adding New Pages

1. **File Structure**: Place in `src/pages/` directory
2. **Naming Convention**: Use PascalCase (e.g., `NewFeaturePage.tsx`)
3. **Component Structure**: Follow existing patterns with TypeScript interfaces
4. **Material-UI**: Use consistent theming and component patterns
5. **Error Handling**: Implement loading states and error boundaries
6. **API Integration**: Use established service patterns
7. **Documentation**: Update this README with new page information

### Best Practices

- **Responsive Design**: Ensure mobile compatibility
- **Accessibility**: Follow ARIA guidelines and keyboard navigation
- **Performance**: Implement loading states and optimization
- **Type Safety**: Use TypeScript interfaces and proper typing
- **Error Handling**: Provide user-friendly error messages
- **Testing**: Include unit tests for critical functionality

### Page Navigation Flow

```
Login → Home → [Feature Pages] → Logout
  ↓       ↓
Register  Settings → Feature Configuration
          ↓
          Users → User Management (Admin only)
```

Each page maintains its own state while sharing common authentication and navigation patterns through the app's routing system. 