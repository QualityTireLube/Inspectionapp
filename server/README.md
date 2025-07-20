# Server Directory

This directory contains the comprehensive Node.js backend application that powers the Curser Inspection App. The server provides REST API endpoints across all business modules, handles multi-file uploads, manages the SQLite database with advanced features, and supports the complete frontend application ecosystem.

## Architecture Overview

The server implements a modular architecture supporting multiple business domains:
- **Vehicle Inspections**: QuickCheck and State Inspection workflows
- **Cash Management**: Financial operations and analytics
- **Label Management**: Label creation, printing, and template management
- **User Management**: Authentication, authorization, and user administration
- **File Management**: Multi-format file handling with organization
- **Dynamic APIs**: Runtime API configuration and management

## Core Files

### index.js (3,200+ lines)
The main server application file containing comprehensive business logic:
- **Express Server Configuration**: Advanced HTTPS setup with SSL certificate management
- **Multi-Module API Endpoints**: Complete REST API implementation
- **Database Operations**: Complex SQLite operations with transaction management
- **File Upload Handling**: Advanced multi-file upload with validation
- **Authentication System**: JWT-based authentication with role management
- **Business Logic**: Comprehensive business rule implementation
- **CORS Configuration**: Cross-origin setup for multi-device access
- **Error Handling**: Centralized error management across all modules

### Route Modules

#### cashManagementRoutes.js (700+ lines)
Dedicated cash management API endpoints:
- **Bank Deposits**: Multi-denomination deposit processing
- **Drawer Counts**: Opening and closing cash reconciliation
- **Financial Analytics**: Revenue tracking and reporting
- **Image Documentation**: Receipt and deposit slip management
- **Audit Trails**: Complete financial operation logging
- **Validation**: Financial data validation and verification

#### labelRoutes.js (270+ lines)
Label management and printing API endpoints:
- **Template Management**: CRUD operations for label templates
- **Print Operations**: Print job queue and management
- **Design Tools**: Label design and customization APIs
- **Batch Processing**: Bulk label generation and printing
- **Version Control**: Template versioning and history

#### dynamicApiRoutes.js (450+ lines)
Dynamic API configuration and runtime management:
- **Runtime API Creation**: Dynamic endpoint generation
- **Configuration Management**: API configuration persistence
- **Schema Validation**: Dynamic schema validation
- **Performance Monitoring**: API performance tracking
- **Usage Analytics**: API usage statistics and reporting

### Database Management

#### database.sqlite (2.2MB)
Comprehensive SQLite database containing:
- **User Management**: Account data with role-based permissions
- **Vehicle Inspections**: Complete inspection records and history
- **Cash Operations**: Financial transactions and reconciliation
- **Label Templates**: Design templates and print history
- **State Inspections**: Compliance records and analytics
- **File References**: Organized file storage metadata
- **System Configuration**: Application settings and preferences

#### migrations/ Directory
Database schema evolution management:
- **add_status_column.js**: Inspection status tracking
- **add_status_column_state_inspection.js**: State inspection status management
- **add_pin_column.js**: User PIN authentication
- **add_performance_indexes.js**: Database performance optimization
- **README.md**: Migration documentation and procedures

### Utility Files

#### logger.js
Advanced Winston-based logging system:
- **Multi-Level Logging**: Error, warn, info, debug levels
- **Module-Specific Logging**: Separate logs for different business modules
- **File Rotation**: Automatic log file rotation and archiving
- **Performance Monitoring**: Request/response time logging
- **Error Tracking**: Comprehensive error logging and analysis

#### createExampleTables.js
Database initialization and example data:
- **Schema Creation**: Database table creation and relationships
- **Example Data**: Sample data for development and testing
- **Data Validation**: Schema validation and integrity checks

### Configuration Files

#### labels.json (2,000+ lines)
Label template and configuration data:
- **Pre-built Templates**: Industry-standard label templates
- **Custom Designs**: User-created label templates
- **Print Settings**: Printer-specific configuration
- **Metadata**: Template versioning and usage statistics

#### users.csv
User management and import data:
- **User Accounts**: Bulk user import capabilities
- **Role Assignment**: Default role configurations
- **Account Activation**: User account lifecycle management

## API Endpoints by Module

### Authentication & User Management
- `POST /api/login` - Multi-factor user authentication
- `POST /api/logout` - Secure user logout with session cleanup
- `POST /api/register` - User registration with role assignment
- `GET /api/profile` - User profile with business module access
- `PUT /api/profile` - Profile updates with validation
- `GET /api/users` - User management for administrators
- `PUT /api/users/:id` - User account management

### QuickCheck Inspections
- `GET /api/quickcheck` - List inspections with advanced filtering
- `POST /api/quickcheck` - Create inspection with validation
- `GET /api/quickcheck/:id` - Detailed inspection retrieval
- `PUT /api/quickcheck/:id` - Inspection updates with conflict resolution
- `DELETE /api/quickcheck/:id` - Secure inspection deletion
- `GET /api/quickcheck/drafts` - Draft management and recovery
- `POST /api/quickcheck/drafts` - Auto-save draft functionality

### State Inspections
- `GET /api/state-inspections` - State inspection record management
- `POST /api/state-inspections` - Create compliance records
- `PUT /api/state-inspections/:id` - Update inspection status
- `GET /api/state-inspections/analytics` - Compliance analytics
- `POST /api/state-inspections/validate` - Compliance validation

### Cash Management
- `GET /api/cash/deposits` - Bank deposit record retrieval
- `POST /api/cash/deposits` - Process bank deposits with photos
- `PUT /api/cash/deposits/:id` - Update deposit records
- `GET /api/cash/drawer-counts` - Drawer count management
- `POST /api/cash/drawer-counts` - Process drawer counts
- `GET /api/cash/analytics` - Financial analytics and reporting
- `POST /api/cash/reconcile` - Cash reconciliation operations

### Label Management
- `GET /api/labels/templates` - Label template management
- `POST /api/labels/templates` - Create custom templates
- `PUT /api/labels/templates/:id` - Update template designs
- `DELETE /api/labels/templates/:id` - Template deletion
- `POST /api/labels/print` - Print job processing
- `GET /api/labels/print-queue` - Print queue management
- `POST /api/labels/generate` - Batch label generation

### File Management
- `POST /api/upload` - Multi-file upload with validation
- `GET /api/uploads/:filename` - Secure file serving
- `DELETE /api/uploads/:filename` - File deletion with audit
- `POST /api/upload/batch` - Batch file processing
- `GET /api/files/organize` - File organization utilities

### Dynamic API Management
- `GET /api/dynamic/endpoints` - List dynamic endpoints
- `POST /api/dynamic/create` - Create runtime APIs
- `PUT /api/dynamic/update/:id` - Update dynamic configurations
- `GET /api/dynamic/metrics` - API performance metrics

## Database Schema

### Core Tables

#### users
- `id`: Primary key
- `username`: Unique username with validation
- `password`: Bcrypt hashed password
- `email`: Email with validation
- `role`: Role-based access control (admin, technician, user)
- `pin`: Optional PIN for quick access
- `permissions`: JSON-based permission system
- `created_at`: Account creation timestamp
- `last_login`: Last login tracking

#### quickcheck_inspections
- `id`: Primary key
- `vin`: Vehicle identification number with validation
- `user_id`: Foreign key to users table
- `customer_info`: JSON customer data
- `inspection_data`: Comprehensive inspection data JSON
- `photos`: File references and metadata
- `status`: Workflow status (draft, in_progress, completed, archived)
- `created_at`: Creation timestamp
- `updated_at`: Last modification timestamp
- `completed_at`: Completion timestamp

#### state_inspections
- `id`: Primary key
- `inspection_id`: Reference to quickcheck inspection
- `compliance_data`: State compliance information
- `status`: Compliance status tracking
- `inspector_id`: Inspector assignment
- `compliance_date`: Compliance verification date
- `expiration_date`: Inspection expiration
- `created_at`: Record creation

#### cash_deposits
- `id`: Primary key
- `user_id`: User processing deposit
- `deposit_date`: Deposit processing date
- `denominations`: JSON denomination breakdown
- `total_amount`: Calculated total amount
- `photos`: Deposit slip and receipt photos
- `bank_info`: Bank deposit information
- `status`: Processing status
- `created_at`: Record creation

#### cash_drawer_counts
- `id`: Primary key
- `user_id`: User performing count
- `count_type`: Opening or closing count
- `denominations`: Cash breakdown
- `expected_amount`: Expected cash amount
- `actual_amount`: Counted amount
- `variance`: Calculated variance
- `photos`: Documentation photos
- `created_at`: Count timestamp

#### label_templates
- `id`: Primary key
- `name`: Template name
- `design_data`: Label design JSON
- `print_settings`: Printer configuration
- `category`: Template category
- `created_by`: User who created template
- `version`: Template version number
- `is_active`: Template status
- `created_at`: Creation timestamp

#### files
- `id`: Primary key
- `original_name`: Original filename
- `stored_name`: System filename
- `path`: File storage path
- `size`: File size in bytes
- `mime_type`: File MIME type
- `module`: Business module association
- `record_id`: Associated record ID
- `uploaded_by`: User who uploaded
- `uploaded_at`: Upload timestamp

## Advanced Features

### Multi-File Upload System
- **Simultaneous Uploads**: Multiple file processing
- **File Validation**: Type, size, and security validation
- **Image Processing**: Automatic image optimization
- **Organization**: Modular file organization by business function
- **Metadata**: Comprehensive file metadata tracking

### Security Implementation
- **JWT Authentication**: Token-based authentication with refresh
- **Role-Based Access**: Fine-grained permission system
- **Input Validation**: Comprehensive input sanitization
- **File Security**: Advanced file type and content validation
- **API Rate Limiting**: Request throttling and abuse prevention
- **Audit Logging**: Complete action audit trails

### Performance Optimization
- **Database Indexing**: Strategic index placement for performance
- **Connection Pooling**: Efficient database connection management
- **Caching**: In-memory caching for frequently accessed data
- **Compression**: Response compression for large datasets
- **Query Optimization**: Optimized SQL queries for complex operations

### Business Logic Integration
- **Workflow Management**: Multi-step business process support
- **Data Validation**: Business rule validation across modules
- **Cross-Module Integration**: Seamless data sharing between modules
- **Analytics**: Real-time business intelligence and reporting
- **Compliance**: Regulatory compliance validation and reporting

## Configuration

### Environment Variables
```env
# Server Configuration
PORT=5001
NODE_ENV=production
HTTPS_ENABLED=true
SSL_KEY_PATH=./key.pem
SSL_CERT_PATH=./cert.pem

# Database Configuration
DB_PATH=./database.sqlite
DB_BACKUP_ENABLED=true
DB_BACKUP_INTERVAL=24h

# File Upload Configuration
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10MB
ALLOWED_FILE_TYPES=jpg,jpeg,png,pdf,webp

# Security Configuration
JWT_SECRET=your-jwt-secret
JWT_EXPIRATION=24h
BCRYPT_ROUNDS=12
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=15m

# Logging Configuration
LOG_LEVEL=info
LOG_FILE_PATH=./server.log
LOG_ROTATION=daily
LOG_MAX_SIZE=10MB

# Business Module Configuration
CASH_MANAGEMENT_ENABLED=true
LABEL_MANAGEMENT_ENABLED=true
STATE_INSPECTION_ENABLED=true
DYNAMIC_API_ENABLED=true
```

### Development Setup
```bash
cd server
npm install
npm run dev
```

### Production Setup
```bash
cd server
npm install --production
NODE_ENV=production npm start
```

## Testing & Validation

### Test Files
- `test.js` (100+ lines): Comprehensive API testing
- `loginTest.js`: Authentication system testing
- `hashTest.js`: Password security validation

### Testing Commands
```bash
# Run all tests
npm test

# Test specific modules
node test.js
node loginTest.js

# Load testing
npm run test:load
```

## Monitoring & Analytics

### Performance Monitoring
- **Request Tracking**: Response time and throughput monitoring
- **Error Rates**: Error frequency and pattern analysis
- **Resource Usage**: Memory and CPU utilization tracking
- **Database Performance**: Query performance and optimization

### Business Analytics
- **Module Usage**: Business module utilization statistics
- **User Activity**: User engagement and workflow analytics
- **Financial Metrics**: Cash management operation analytics
- **Inspection Metrics**: Inspection completion and compliance rates

### Health Checks
- **Database Connectivity**: Continuous database health monitoring
- **File System**: Storage availability and performance
- **API Endpoints**: Endpoint availability and response validation
- **External Services**: Third-party service integration health

## Deployment & Operations

### Production Deployment
```bash
# Build and deploy
npm run build:prod
npm run start:prod

# With process manager
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Backup & Recovery
- **Database Backups**: Automated daily backups
- **File Backups**: Incremental file system backups
- **Configuration Backups**: System configuration preservation
- **Recovery Procedures**: Documented recovery processes

### Scaling Considerations
- **Horizontal Scaling**: Multi-instance deployment support
- **Load Balancing**: Request distribution strategies
- **Database Scaling**: Read replica and partitioning strategies
- **Caching**: Distributed caching for improved performance

## Troubleshooting

### Common Issues
1. **Database Lock Errors**: Connection pool management
2. **File Upload Failures**: Storage and permission validation
3. **Memory Issues**: Resource cleanup and optimization
4. **Performance Degradation**: Query optimization and indexing

### Debug Tools
```bash
# Enable debug logging
DEBUG=* npm run dev

# Monitor server performance
npm run monitor

# Analyze logs
npm run logs:analyze
```

The server directory represents a comprehensive, enterprise-grade backend system supporting the complete Curser Inspection App ecosystem with robust business logic, security, and scalability features. 