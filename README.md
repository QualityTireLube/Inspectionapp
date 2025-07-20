# Curser Inspection App

A comprehensive Progressive Web Application (PWA) for automotive service businesses, providing complete inspection workflows, cash management, label printing, and business analytics. Built with React/TypeScript frontend and Node.js/Express backend with SQLite database.

## 🏢 Business Overview

This application serves as an all-in-one solution for automotive service centers, providing:

- **Vehicle Inspections**: Complete QuickCheck and State Inspection workflows
- **Cash Management**: Bank deposits, drawer counts, and financial analytics  
- **Label Management**: Custom label creation, printing, and template management
- **Sticker Management**: Active/archived sticker tracking and settings
- **User Management**: Multi-user authentication and role-based access
- **Business Analytics**: Comprehensive reporting and data visualization

## 🚀 Core Business Modules

### QuickCheck System
- **VIN Scanning & Decoding**: Camera-based VIN capture with NHTSA API integration
- **Comprehensive Inspections**: Exterior, underhood, tires, brakes, and TPMS
- **Photo Documentation**: Multi-photo capture with real-time camera integration
- **Draft Management**: Auto-save functionality with manual draft controls
- **Report Generation**: PDF reports with detailed inspection findings

### State Inspection Records
- **Inspection Tracking**: Complete state inspection workflow management
- **Record Management**: CRUD operations for inspection records
- **Analytics Dashboard**: Performance metrics and compliance tracking
- **Status Workflows**: Draft, completed, and archived inspection states

### Cash Management
- **Bank Deposits**: Multi-denomination cash counting with photo documentation
- **Drawer Counts**: Opening and closing cash drawer reconciliation
- **Financial Analytics**: Revenue tracking, deposit analysis, and reporting
- **Image Documentation**: Receipt and deposit slip photo capture

### Label & Sticker Management
- **Label Creation**: Dynamic label design with drag-and-drop editor
- **Template Management**: Pre-built and custom label templates
- **Print Integration**: Direct label printer integration
- **Sticker Tracking**: Active and archived sticker inventory management
- **Settings Management**: Comprehensive sticker configuration options

## 🛠 Technical Architecture

### Frontend (React 18 + TypeScript)
- **UI Framework**: Material-UI (MUI) v7 with custom theming
- **State Management**: Zustand stores for modular state handling
- **Routing**: React Router v6 with protected routes
- **Forms**: React Hook Form with Zod validation
- **PWA Features**: Service Worker, offline capabilities, app installation
- **Camera Integration**: Multi-library camera support (@zxing/browser, html5-qrcode)

### Backend (Node.js + Express)
- **Database**: SQLite with migration system
- **Authentication**: JWT-based auth with bcrypt password hashing
- **File Handling**: Multer for multi-file uploads with organized storage
- **Logging**: Winston logging with rotation and levels
- **API Design**: RESTful APIs with rate limiting and CORS
- **Dynamic Routing**: Modular API route system

### Infrastructure & Deployment
- **Development**: Vite dev server with HMR and TypeScript support
- **Production**: Optimized builds with code splitting and asset optimization
- **SSL/HTTPS**: Full HTTPS support with certificate generation scripts
- **Network Access**: Cross-device access with dynamic hostname detection
- **PWA Installation**: Native app-like installation on mobile devices

## 📁 Project Architecture

```
├── src/                           # Frontend React application
│   ├── pages/                     # Main application pages (25+ pages)
│   │   ├── QuickCheck.tsx         # Primary inspection interface
│   │   ├── Home.tsx               # Dashboard and navigation hub
│   │   ├── BankDepositForm.tsx    # Cash management interfaces
│   │   ├── LabelManager.tsx       # Label creation and management
│   │   └── StateInspectionRecords.tsx # State inspection tracking
│   ├── components/                # Reusable UI components (40+ components)
│   │   ├── QuickCheck/            # Inspection-specific components
│   │   ├── CashManagement/        # Financial management components
│   │   ├── StateInspection/       # State inspection components
│   │   └── Layout.tsx             # Main application layout
│   ├── services/                  # API and external integrations (13 services)
│   │   ├── api.ts                 # Main API service layer
│   │   ├── quickCheckApi.ts       # QuickCheck API integration
│   │   ├── cashManagementApi.ts   # Cash management API
│   │   ├── labelApi.ts            # Label management API
│   │   └── safariDebug.ts         # Safari compatibility services
│   ├── stores/                    # Zustand state management
│   │   ├── cashManagementStore.ts # Cash management state
│   │   ├── labelStore.ts          # Label management state
│   │   └── stateInspectionStore.ts # State inspection state
│   ├── types/                     # TypeScript type definitions
│   └── hooks/                     # Custom React hooks
├── server/                        # Backend Node.js application
│   ├── index.js                   # Main server with all API routes
│   ├── cashManagementRoutes.js    # Cash management API endpoints
│   ├── labelRoutes.js             # Label management API endpoints
│   ├── dynamicApiRoutes.js        # Dynamic API routing system
│   ├── migrations/                # Database migration scripts
│   ├── uploads/                   # File upload storage
│   └── logger.js                  # Winston logging configuration
├── public/                        # PWA assets and configuration
│   ├── manifest.json              # PWA manifest
│   ├── service-worker.js          # Service worker for offline capabilities
│   └── icon-*.svg                 # Progressive Web App icons
├── scripts/                       # Utility and deployment scripts
└── README.*.md                    # Feature-specific documentation
```

## 🔧 Key Features & Capabilities

### Progressive Web App (PWA)
- **App Installation**: Install on mobile devices like native apps
- **Offline Capabilities**: Service worker for offline functionality
- **Responsive Design**: Optimized for mobile, tablet, and desktop
- **Cross-Platform**: Works on iOS, Android, and desktop browsers

### Advanced Camera Integration
- **Multi-Library Support**: Fallback camera systems for maximum compatibility
- **VIN Scanning**: Automatic VIN recognition and decoding
- **Photo Management**: Multi-photo capture with preview and editing
- **Safari Compatibility**: Specialized Safari debugging and support

### Network & Deployment
- **Cross-Device Access**: Access from any device on local network
- **HTTPS Support**: Full SSL certificate management
- **Dynamic Configuration**: Automatic network IP detection
- **Production Ready**: Comprehensive deployment and monitoring

### Business Intelligence
- **Analytics Dashboard**: Revenue tracking and performance metrics
- **Report Generation**: PDF reports with business branding
- **Data Export**: CSV export capabilities for business records
- **Audit Trails**: Complete action logging and user tracking

## 🚦 Getting Started

### Prerequisites
- Node.js 18+
- Modern web browser with camera support
- Local network access for multi-device usage

### Quick Start

1. **Clone and Install:**
   ```bash
   git clone <repository-url>
   cd "Curser Inspection App"
   npm install
   cd server && npm install && cd ..
   ```

2. **Start Development:**
   ```bash
   npm run dev
   ```
   This starts both frontend (https://localhost:3000) and backend (https://localhost:5001)

3. **Access Application:**
   - Local: https://localhost:3000
   - Network: https://[your-ip]:3000 (displayed in console)

### Production Deployment

```bash
npm run build:prod
npm run start:prod
```

See [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md) for detailed deployment instructions.

## 📝 Form Initialization & User Experience

### Initial Values Philosophy
The application follows a **blank slate** approach for user input fields, ensuring users make conscious decisions rather than accepting default values. This improves data quality and reduces errors.

### System Fields (Pre-filled)
These fields are automatically populated and should not be changed by users:
- **`inspection_type`**: `'quick_check'` - Identifies the form type
- **`date`**: Current date - Auto-generated inspection date
- **`user`**: User name from localStorage - Identifies the inspector

### User Input Fields (Blank Initial Values)
All user-selectable fields start blank (`''`) to ensure intentional data entry:

#### **Tires & Brakes Section**
- **Brake Pad Conditions**: `inner`, `outer`, `rotor_condition` for all positions
- **Tire Tread Measurements**: All depth and condition fields for each tire
- **Status Fields**: `tire_repair_status`, `tpms_type`, `tire_rotation`, `static_sticker`, `drain_plug_type`

#### **Underhood Section**
- **Windshield**: `windshield_condition`
- **Wiper Blades**: `wiper_blades`, `wiper_blades_front`, `wiper_blades_rear`
- **Washer Systems**: `washer_squirters`, `washer_fluid`
- **Battery**: `battery_condition_main`
- **Engine**: `engine_air_filter`
- **State Inspection**: `state_inspection_status`

#### **Arrays & Objects**
- **Photo Arrays**: All photo fields start as empty arrays `[]`
- **Status Objects**: All status tracking objects start with `null` values
- **Comments**: All comment fields start as empty objects `{}`

### Benefits of Blank Initial Values
1. **Data Quality**: Forces users to make conscious decisions
2. **Error Prevention**: Eliminates accidental acceptance of defaults
3. **Audit Trail**: Clear distinction between user input and system data
4. **Compliance**: Ensures all inspections are properly documented
5. **User Experience**: Prevents confusion about what has been inspected

### Type Safety
All form field types have been updated to allow empty strings (`''`) as valid values:
```typescript
export type BrakePadCondition = '' | 'good' | 'warning' | 'bad' | 'critical' | 'metal_to_metal' | 'off' | 'drums_not_checked';
export type TireRotationStatus = '' | 'good' | 'bad';
export type StaticStickerStatus = '' | 'good' | 'not_oil_change' | 'need_sticker';
// ... and all other relevant types
```

This ensures type safety while maintaining the blank initial value approach.

## 📚 Module Documentation

### Core Business Modules
- [QuickCheck System](./README.QuickCheck.md) - Complete inspection workflow
- [Cash Management](./README.CashManagement.md) - Financial operations
- [Label Management](./README.Labels.md) - Label creation and printing
- [State Inspections](./README.Details.md) - State inspection compliance

### Technical Documentation
- [API Documentation](./README.API.md) - Backend API reference
- [Database Schema](./README.Database.md) - Data structure and migrations
- [Authentication](./README.Login.md) - User management and security
- [Performance](./README.Performance.md) - Optimization and monitoring

### Component Documentation
- [Pages](./src/pages/README.md) - Application page components
- [Components](./src/components/README.md) - UI component library
- [Services](./src/services/README.md) - API and external integrations
- [Types](./src/types/README.md) - TypeScript type definitions

## 🔐 Security & Authentication

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for secure password storage
- **Rate Limiting**: API rate limiting to prevent abuse
- **File Validation**: Comprehensive upload validation and sanitization
- **CORS Configuration**: Secure cross-origin request handling

## 📱 Mobile & Cross-Platform

### PWA Features
- **Installation**: Add to home screen on mobile devices
- **Offline Support**: Continue working without internet connection
- **Push Notifications**: Business alerts and reminders
- **Native Feel**: App-like experience across all platforms

### Safari Compatibility
- **Specialized Debugging**: Safari-specific debugging tools
- **Storage Compatibility**: Optimized local storage for Safari
- **Camera Integration**: Safari-specific camera handling

## 🧪 Testing & Development

### Available Scripts
- `npm run dev` - Start development with hot reload
- `npm run build` - Build for production
- `npm run test` - Run test suite
- `npm run lint` - Code linting and formatting

### Development Tools
- **Hot Module Replacement**: Instant updates during development
- **TypeScript**: Full type safety and IntelliSense
- **ESLint**: Code quality and consistency
- **Source Maps**: Debugging support in production

## 🔧 Configuration

### Environment Variables
```env
# Development
VITE_API_BASE_URL=https://localhost:5001
VITE_UPLOAD_URL=https://localhost:5001/uploads

# Production
VITE_API_BASE_URL=https://your-domain.com
VITE_UPLOAD_URL=https://your-domain.com/uploads
```

### SSL Certificate Management
```bash
# Generate development certificates
./scripts/generate-ssl.sh

# Production certificates should be obtained from a CA
```

## 📊 Performance & Monitoring

- **Code Splitting**: Optimized bundle loading
- **Image Optimization**: Automatic image compression and resizing
- **Caching Strategy**: Aggressive caching for static assets
- **Performance Monitoring**: Built-in performance tracking
- **Error Logging**: Comprehensive error tracking and reporting

## 🔗 Integration Capabilities

- **NHTSA API**: Vehicle identification number decoding
- **Label Printers**: Direct integration with label printing hardware
- **Camera Systems**: Multi-vendor camera compatibility
- **Database Export**: CSV and PDF export for external systems
- **Audit Systems**: Complete action logging for compliance

## 📞 Support & Maintenance

For technical support:
1. Check module-specific README files for detailed information
2. Review API documentation for backend integration issues
3. Check server logs for runtime errors
4. Verify camera permissions for photo capture features

## 📄 License

This project is proprietary software. All rights reserved.

---

*This application represents a comprehensive business solution for automotive service centers, providing complete workflow management from vehicle inspections to financial operations.* 