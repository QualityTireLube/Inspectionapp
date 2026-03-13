# Types Directory

This directory contains comprehensive TypeScript type definitions and interfaces used throughout the Curser Inspection App. These types ensure type safety across all business modules and provide clear contracts for data structures spanning vehicle inspections, financial operations, label management, and compliance tracking.

## Business Module Type Files

### quickCheck.ts (160+ lines)
Comprehensive type definitions for vehicle inspection workflows:
- **InspectionData**: Complete inspection record structure
- **VehicleInfo**: Vehicle identification and customer data
- **InspectionSections**: Modular inspection section types
- **PhotoManagement**: Image upload and documentation types
- **TireTread**: Complex tire measurement and condition types
- **BrakePad**: Brake assessment and measurement interfaces
- **TPMS**: Tire pressure monitoring system types
- **DraftManagement**: Auto-save and recovery data structures
- **ValidationRules**: Inspection validation and business rule types

### cashManagement.ts (100+ lines)
Financial operations and cash handling type definitions:
- **BankDeposit**: Multi-denomination deposit processing types
- **DrawerCount**: Cash drawer reconciliation interfaces
- **Denominations**: Currency denomination breakdown types
- **FinancialAnalytics**: Revenue tracking and reporting structures
- **CashValidation**: Financial data validation interfaces
- **AuditTrail**: Financial operation logging types
- **DepositSlip**: Receipt and documentation photo types
- **Reconciliation**: Cash variance and balancing interfaces

### labelTemplates.ts (80+ lines)
Label design and template management type definitions:
- **LabelTemplate**: Label design and configuration interfaces
- **DesignElements**: Visual element positioning and styling types
- **PrintSettings**: Printer configuration and optimization types
- **TemplateMetadata**: Version control and template management
- **PrintJob**: Print queue and job processing interfaces
- **LabelFormat**: Size, layout, and formatting specifications
- **ElementProperty**: Design element customization types

### stateInspection.ts (90+ lines)
State inspection compliance and workflow type definitions:
- **StateInspectionRecord**: Compliance record structure
- **ComplianceData**: State regulation compliance types
- **InspectionStatus**: Workflow status and lifecycle management
- **ComplianceValidation**: Regulatory compliance checking types
- **AnalyticsData**: Performance metrics and reporting interfaces
- **InspectorAssignment**: Inspector workflow management types
- **ComplianceReporting**: Regulatory reporting and audit types

### stickers.ts (90+ lines)
Sticker management and inventory tracking type definitions:
- **StickerTemplate**: Sticker design and configuration types
- **StickerInventory**: Inventory tracking and management interfaces
- **StickerStatus**: Lifecycle status and condition enums
- **ExpirationManagement**: Expiration tracking and alert types
- **StickerSettings**: Configuration and customization interfaces
- **BatchOperations**: Bulk sticker processing types
- **StickerAssignment**: Vehicle assignment and tracking types

### vin-decode.d.ts
External VIN decoding library type definitions:
- **VinDecodeResponse**: NHTSA API response interfaces
- **VehicleSpecifications**: Detailed vehicle information types
- **RecallInformation**: Safety recall and notice types
- **VinValidation**: VIN format validation and verification types

## Core Application Types

### Authentication & User Management
```typescript
interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
  businessModules: BusinessModule[];
  created_at: Date;
  last_login?: Date;
}

enum UserRole {
  ADMIN = 'admin',
  TECHNICIAN = 'technician',
  CASHIER = 'cashier',
  INSPECTOR = 'inspector',
  USER = 'user'
}

interface Permission {
  module: BusinessModule;
  actions: PermissionAction[];
}
```

### File Management
```typescript
interface FileUpload {
  id: string;
  original_name: string;
  stored_name: string;
  path: string;
  size: number;
  mime_type: string;
  module: BusinessModule;
  record_id: string;
  uploaded_by: string;
  uploaded_at: Date;
}

interface ImageUpload extends FileUpload {
  width: number;
  height: number;
  is_optimized: boolean;
  thumbnail_path?: string;
}
```

### API Response Types
```typescript
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
  pagination?: PaginationInfo;
}

interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  stack?: string;
}
```

## Type Organization by Business Module

### QuickCheck Module Types
- **Inspection Forms**: Multi-section inspection data structures
- **Photo Management**: Image capture and organization types
- **Draft System**: Auto-save and recovery functionality
- **Validation**: Business rule validation interfaces
- **Reporting**: PDF generation and export types

### Cash Management Module Types
- **Financial Operations**: Deposit and drawer count interfaces
- **Analytics**: Revenue tracking and financial reporting
- **Validation**: Financial data verification types
- **Audit**: Complete financial operation audit trails
- **Integration**: Cross-module financial data sharing

### Label Management Module Types
- **Design System**: Label design and template interfaces
- **Print Operations**: Print job and queue management
- **Template Management**: Version control and template sharing
- **Customization**: Element positioning and styling types
- **Batch Processing**: Bulk label generation interfaces

### State Inspection Module Types
- **Compliance**: Regulatory compliance data structures
- **Workflow**: Inspection lifecycle management types
- **Analytics**: Performance metrics and reporting
- **Integration**: Cross-module compliance data sharing
- **Validation**: State regulation compliance checking

## Advanced Type Patterns

### Generic Types for Reusability
```typescript
interface BaseRecord {
  id: string;
  created_at: Date;
  updated_at: Date;
  created_by: string;
}

interface BusinessRecord<T = any> extends BaseRecord {
  data: T;
  status: RecordStatus;
  module: BusinessModule;
}

type CreateRecord<T> = Omit<T, 'id' | 'created_at' | 'updated_at'>;
type UpdateRecord<T> = Partial<Omit<T, 'id' | 'created_at'>>;
```

### Union Types for Flexible APIs
```typescript
type InspectionType = 'quickcheck' | 'state_inspection' | 'annual' | 'safety';
type PaymentMethod = 'cash' | 'card' | 'check' | 'digital';
type FileType = 'image' | 'document' | 'video' | 'audio';
type ModuleAction = 'create' | 'read' | 'update' | 'delete' | 'export';
```

### Utility Types for Data Transformation
```typescript
type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
type RequiredBy<T, K extends keyof T> = T & Required<Pick<T, K>>;
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
```

## Form and Validation Types

### Form State Management
```typescript
interface FormState<T> {
  data: T;
  errors: Record<keyof T, string[]>;
  touched: Record<keyof T, boolean>;
  dirty: Record<keyof T, boolean>;
  isValid: boolean;
  isSubmitting: boolean;
}

interface ValidationRule<T> {
  field: keyof T;
  validator: (value: any) => string | null;
  required?: boolean;
  dependencies?: (keyof T)[];
}
```

### Cross-Module Integration Types
```typescript
interface CrossModuleData {
  inspection_id?: string;
  cash_operation_id?: string;
  label_id?: string;
  state_inspection_id?: string;
  relationship_type: 'primary' | 'reference' | 'dependency';
}

interface IntegratedWorkflow {
  steps: WorkflowStep[];
  current_step: number;
  completion_status: Record<string, boolean>;
  cross_module_data: CrossModuleData[];
}
```

## Performance and Optimization Types

### Pagination and Filtering
```typescript
interface PaginationParams {
  page: number;
  limit: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

interface FilterParams {
  module?: BusinessModule;
  status?: string[];
  date_range?: DateRange;
  user_id?: string;
  search_term?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
}
```

## Type Safety Best Practices

### Strict Type Checking
```typescript
// Prefer specific types over generic ones
interface SpecificInspectionData {
  vin: string; // Instead of any
  mileage: number; // Instead of string | number
  date: Date; // Instead of any
}

// Use discriminated unions for type safety
type NotificationMessage = 
  | { type: 'success'; message: string; duration?: number }
  | { type: 'error'; message: string; details?: string }
  | { type: 'warning'; message: string; action?: string };
```

### Type Guards for Runtime Safety
```typescript
function isValidInspection(data: any): data is InspectionData {
  return data && 
         typeof data.vin === 'string' && 
         data.vin.length === 17 &&
         data.date instanceof Date;
}

function isBusinessModule(value: string): value is BusinessModule {
  return ['quickcheck', 'cash_management', 'labels', 'state_inspection'].includes(value);
}
```

## Integration Patterns

### Service Integration Types
```typescript
interface ServiceResponse<T> {
  data: T;
  meta: {
    timestamp: Date;
    version: string;
    source: string;
  };
}

interface ServiceError extends Error {
  code: string;
  module: BusinessModule;
  recoverable: boolean;
  retry_after?: number;
}
```

### State Management Types
```typescript
interface StoreState {
  user: UserState;
  quickcheck: QuickCheckState;
  cashManagement: CashManagementState;
  labels: LabelState;
  stateInspection: StateInspectionState;
  ui: UIState;
}

interface StoreAction<T = any> {
  type: string;
  payload?: T;
  meta?: {
    module: BusinessModule;
    timestamp: Date;
  };
}
```

## Development and Maintenance

### Adding New Types
1. **Module-Specific Types**: Add to appropriate module type files
2. **Cross-Module Types**: Consider placement in shared type definitions
3. **Generic Types**: Create reusable patterns for common data structures
4. **Validation**: Ensure runtime type validation where necessary
5. **Documentation**: Add comprehensive JSDoc comments for complex types

### Type Evolution
- **Backward Compatibility**: Use optional properties for new fields
- **Migration**: Provide type migration utilities when breaking changes occur
- **Versioning**: Consider type versioning for major structural changes
- **Testing**: Include type testing in the overall testing strategy

### Code Generation
- **API Types**: Generate types from OpenAPI specifications
- **Database Types**: Generate types from database schema
- **Form Types**: Generate form types from validation schemas
- **Component Types**: Generate prop types from component definitions

## Usage Examples

### Component Type Integration
```typescript
import { InspectionData, CashDeposit, LabelTemplate } from '../types';

interface BusinessComponentProps {
  inspection?: InspectionData;
  deposit?: CashDeposit;
  template?: LabelTemplate;
  onSave: (data: BusinessRecord<any>) => void;
  onError: (error: ApiError) => void;
}
```

### Service Type Integration
```typescript
import { ApiResponse, BusinessModule } from '../types';

class BusinessService {
  async getData<T>(module: BusinessModule, id: string): Promise<ApiResponse<T>> {
    // Implementation with full type safety
  }
}
```

The types directory provides a comprehensive, type-safe foundation for the entire Curser Inspection App, ensuring data consistency and developer productivity across all business modules while maintaining flexibility for future enhancements. 