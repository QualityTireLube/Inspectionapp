# Cash Management System

A comprehensive cash management and drawer tracking system for automotive service shops.

## Overview

The Cash Management System provides tools for tracking cash flow, managing drawer counts, and generating analytics for automotive service shop operations. The system includes bank deposit forms, drawer count down functionality, drawer settings management, and comprehensive analytics.

## Features

### 📊 Bank Deposit Form
- **Purpose**: Record and track bank deposits with cash and check amounts
- **Features**:
  - Total Cash amount input
  - Total Checks amount input
  - Image upload for deposit receipts (up to 5 images)
  - Notes field for additional information
  - Automatic total calculation
  - Form validation and error handling

### 💰 Drawer Count Down Forms
- **Purpose**: Track cash in drawers and calculate cash out amounts
- **Features**:
  - Separate forms for different drawers (State Inspector, Service Writer, etc.)
  - Denomination inputs for all currency types
  - Automatic total calculation
  - Cash out calculation based on target denominations
  - Real-time deposit amount calculation
  - Save/submit functionality

### ⚙️ Drawer Settings
- **Purpose**: Configure drawer targets and manage drawer settings
- **Features**:
  - Add/Edit/Remove drawer configurations
  - Set target denominations per drawer
  - Active/Inactive drawer status
  - Calculate "cash out" needed to reach targets
  - Validation and duplicate name checking

### 📈 Analytics Dashboard
- **Purpose**: Provide insights into cash flow and drawer performance
- **Features**:
  - Summary cards for key metrics
  - Drawer totals over time
  - Cash in/out trend analysis
  - Drawer discrepancy tracking
  - Filterable by drawer, date range, and user
  - Visual charts and graphs (using Recharts)

## Technical Implementation

### Frontend Architecture

#### Components Structure
```
src/
├── components/
│   └── CashManagement/
│       ├── DenominationInput.tsx      # Reusable denomination input component
│       └── ImageUploadField.tsx       # Image upload with preview
├── pages/
│   ├── BankDepositForm.tsx           # Bank deposit form page
│   ├── DrawerCountForm.tsx           # Drawer counting page
│   ├── DrawerSettings.tsx            # Drawer management page
│   └── CashAnalytics.tsx             # Analytics dashboard
├── services/
│   └── cashManagementApi.ts          # API service layer
├── stores/
│   └── cashManagementStore.ts        # Zustand state management
└── types/
    └── cashManagement.ts             # TypeScript type definitions
```

#### State Management
- **Zustand Store**: Central state management for drawer settings and current counts
- **Persistent Storage**: Drawer settings and current counts persist across sessions
- **API Integration**: Seamless integration with backend services

#### Key Components

##### DenominationInput Component
- Reusable component for inputting currency denominations
- Auto-calculation of totals
- Configurable labels and disabled states
- Responsive grid layout

##### ImageUploadField Component
- Drag-and-drop image upload
- Image preview with fullscreen view
- File validation (type, size)
- Multiple image support

### Data Models

#### Core Types
```typescript
interface DenominationCount {
  pennies: number;
  nickels: number;
  dimes: number;
  quarters: number;
  ones: number;
  fives: number;
  tens: number;
  twenties: number;
  hundreds: number;
}

interface DrawerCount {
  id?: number;
  drawerId: string;
  drawerName: string;
  denominations: DenominationCount;
  cashOut: DenominationCount;
  totalCash: number;
  totalForDeposit: number;
  timestamp: string;
  userId: string;
  userName: string;
}

interface BankDeposit {
  id?: number;
  totalCash: number;
  totalChecks: number;
  images: string[];
  notes: string;
  timestamp: string;
  userId: string;
  userName: string;
}
```

### API Endpoints

#### Bank Deposits
- `POST /api/cash-management/bank-deposits` - Submit new deposit
- `GET /api/cash-management/bank-deposits` - Get deposits with filters
- `GET /api/cash-management/bank-deposits/:id` - Get specific deposit
- `DELETE /api/cash-management/bank-deposits/:id` - Delete deposit

#### Drawer Counts
- `POST /api/cash-management/drawer-counts` - Submit drawer count
- `GET /api/cash-management/drawer-counts` - Get counts with filters
- `GET /api/cash-management/drawer-counts/:id` - Get specific count
- `DELETE /api/cash-management/drawer-counts/:id` - Delete count

#### Drawer Settings
- `GET /api/cash-management/drawer-settings` - Get all drawer settings
- `POST /api/cash-management/drawer-settings` - Create drawer settings
- `PUT /api/cash-management/drawer-settings/:id` - Update drawer settings
- `DELETE /api/cash-management/drawer-settings/:id` - Delete drawer settings

#### Analytics
- `GET /api/cash-management/analytics` - Get analytics data with filters

#### File Upload
- `POST /api/cash-management/upload-images` - Upload deposit images

## Navigation Integration

The cash management system is integrated into the main application navigation:

- **Bank Deposit** - `/bank-deposit`
- **Drawer Count** - `/drawer-count` 
- **Drawer Settings** - `/drawer-settings`
- **Cash Analytics** - `/cash-analytics`

## Usage Workflow

### Daily Operations

1. **Start of Day**:
   - Access Drawer Count page
   - Select appropriate drawer
   - Count current denominations
   - System calculates cash out amounts

2. **Throughout Day**:
   - Record bank deposits as needed
   - Upload receipt images
   - Add notes for tracking

3. **End of Day**:
   - Complete final drawer counts
   - Review analytics for discrepancies
   - Generate reports as needed

### Management Tasks

1. **Drawer Setup**:
   - Use Drawer Settings to configure new drawers
   - Set target denomination amounts
   - Activate/deactivate drawers as needed

2. **Analytics Review**:
   - Monitor cash flow trends
   - Identify discrepancies
   - Filter by date ranges or specific drawers
   - Export data for accounting

## Security & Validation

### Frontend Validation
- Required field validation
- Numeric input validation
- File type and size validation
- Duplicate name checking

### Data Integrity
- Automatic total calculations
- Consistent timestamp formatting
- User attribution for all entries
- Image file validation

## Browser Compatibility

- Modern web browsers (Chrome, Firefox, Safari, Edge)
- Mobile responsive design
- Touch-friendly interface for tablet use

## Dependencies

### Core Dependencies
- **React 18** - Frontend framework
- **Material-UI** - Component library
- **Zustand** - State management
- **Axios** - HTTP client
- **Recharts** - Chart library

### Development Dependencies
- **TypeScript** - Type safety
- **Vite** - Build tool
- **ESLint** - Code linting

## Future Enhancements

### Planned Features
- **Export Functionality**: PDF/CSV export of analytics data
- **Advanced Filtering**: More granular filtering options
- **User Permissions**: Role-based access control
- **Audit Trail**: Detailed logging of all changes
- **Integration**: Connect with existing POS systems
- **Mobile App**: Dedicated mobile application
- **Notifications**: Alert system for discrepancies

### Potential Integrations
- **Accounting Software**: QuickBooks, Xero integration
- **POS Systems**: Integration with existing point-of-sale
- **Banking APIs**: Automated deposit verification
- **Reporting Tools**: Advanced business intelligence

## Support & Maintenance

### Error Handling
- Comprehensive error messages
- Graceful fallbacks for API failures
- User-friendly validation messages

### Performance
- Lazy loading for large datasets
- Optimized image handling
- Efficient state management

### Monitoring
- Console logging for debugging
- Error boundary implementation
- Performance monitoring hooks

---

For technical support or feature requests, please refer to the main application documentation or contact the development team. 