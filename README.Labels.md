# Label Creation System

The Vehicle Inspection App includes a comprehensive label creation and management system that allows users to create custom label templates for various business processes like tire management, parts tracking, warranties, and returns.

## 🏷️ Overview

The Label System provides:
- **Visual Label Designer** with drag-and-drop field positioning
- **Template Management** with CRUD operations
- **PDF Generation** for physical label printing  
- **Brother QL-800 Printer Integration** with custom paper sizes
- **Pre-built Templates** for common use cases
- **Field Validation** and data binding
- **Archive/Restore** functionality
- **Template Duplication** for rapid template creation

## 🛠 Architecture

### Components Group
- **`LabelManager`** - Main management interface with tabbed layout
- **`LabelEditor`** - Visual drag-and-drop template editor
- **`LabelCreator`** - Template selection and form filling interface
- **`LabelTemplateCard`** - Template preview and action cards
- **`LabelSettingsContent`** - Global label settings configuration

### Label Management Page
- **`src/pages/LabelManager.tsx`** - Main label management page
- **`src/stores/labelStore.ts`** - State management for label operations
- **`src/services/labelApi.ts`** - API service for label CRUD operations
- **`server/labelRoutes.js`** - Backend routes for label management
- **`server/labels.json`** - JSON database storing label templates

### Label Creation & Generation Page
- **`src/components/LabelCreator.tsx`** - Template selection and form interface
- **`src/services/labelPdfGenerator.ts`** - PDF generation service for printing
- **`src/data/labelTemplates.ts`** - Predefined template definitions
- **`src/types/labelTemplates.ts`** - TypeScript type definitions

### Settings & Configuration Page
- **`src/components/LabelSettingsContent.tsx`** - Label settings interface
- **`src/pages/Settings.tsx`** - Main settings page integration

## 📝 Core Features

### 1. Template Creation
Users can create custom label templates with:
- **Dynamic Field Positioning** - Drag and drop text fields anywhere on the label
- **Typography Control** - Font family, size, color, alignment
- **Paper Size Configuration** - Brother QL-800 and custom dimensions
- **Field Properties** - Show/hide in forms, default values
- **Copy Control** - Set number of copies to print

### 2. Visual Editor
The label editor provides:
- **Real-time Preview** - Live preview of label appearance
- **Grid Snapping** - Precise field alignment
- **Property Panel** - Field customization options
- **Zoom Controls** - Detailed editing capabilities
- **Undo/Redo** - Change history management

### 3. Template Management
- **Active Templates** - Currently available templates
- **Archived Templates** - Hidden but recoverable templates
- **Template Duplication** - Copy existing templates
- **Bulk Import** - Import predefined template sets
- **Search and Filter** - Find templates quickly

### 4. Label Generation
- **Form-based Input** - Dynamic forms based on template fields
- **Auto-populated Fields** - Created By, Created Date automatically filled
- **Validation** - Required field validation
- **PDF Output** - Print-ready PDF generation
- **Batch Printing** - Multiple copies support

## 🚀 Getting Started

### Accessing Label Manager
1. Navigate to **Settings** > **Label Settings**
2. Click **"Open Label Manager"** button
3. Or directly visit `/label-manager`

### Creating Your First Template
1. Click **"Create New Template"** in Label Manager
2. Enter template name and select paper size
3. Add fields by clicking **"Add Field"**
4. Position fields by dragging them on the canvas
5. Customize field properties (font, size, color)
6. Save the template

### Using a Template
1. Access templates via **"Create Label"** buttons throughout the app
2. Select desired template from the list
3. Fill in the form fields
4. Preview the label
5. Generate PDF and print

## 📋 Pre-built Templates

The system includes ready-to-use templates for:

### Tire Management
- **Tire Check-In** - Track incoming tire inventory
- **Tire Restock** - Label tires for storage/bin location
- **Tire Warranty** - Warranty tracking labels
- **Tire Return** - Return processing labels
- **Tire Completed** - Service completion labels

### Parts Management  
- **Parts Check-In** - Incoming parts inventory
- **Parts Restock** - Storage location labels
- **Parts Warranty** - Parts warranty tracking
- **Parts Return** - Return processing labels

### Custom Templates
Users can create unlimited custom templates for any business need.

## 🖨️ Printing Integration

### Brother QL-800 Support
- **Native Paper Size** - Optimized for Brother QL-800 dimensions (234mm x 110mm)
- **Custom Sizes** - Support for other label sizes
- **Print Settings** - Copy count, quality settings
- **PDF Output** - Universal printing compatibility

### Print Workflow
1. Generate label from template
2. Download PDF file
3. Open in PDF viewer
4. Print to Brother QL-800 or any printer
5. Apply physical labels as needed

## 📊 Template Structure

Each label template contains:

```typescript
interface LabelTemplate {
  id: string;                    // Unique template identifier
  labelName: string;             // Template display name
  fields: LabelField[];          // Array of field definitions
  paperSize: string;             // Paper size identifier
  width: number;                 // Template width in mm
  height: number;                // Template height in mm
  copies: number;                // Default copy count
  archived: boolean;             // Archive status
  createdBy: string;             // Creator email
  createdDate: string;           // Creation timestamp
  updatedDate?: string;          // Last update timestamp
}

interface LabelField {
  id: string;                    // Unique field identifier
  name: string;                  // Field display name
  position: { x: number; y: number }; // Field position
  fontSize: number;              // Font size
  fontFamily: string;            // Font family
  textAlign: string;             // Text alignment
  color: string;                 // Text color
  value: string;                 // Default/display value
  showInForm?: boolean;          // Show in input form
}
```

## 🔧 API Endpoints

### Template Management
- `GET /api/labels` - Get all templates
- `POST /api/labels` - Create new template
- `PUT /api/labels/:id` - Update template
- `DELETE /api/labels/:id` - Delete template
- `POST /api/labels/:id/archive` - Archive template
- `POST /api/labels/:id/restore` - Restore template
- `POST /api/labels/:id/duplicate` - Duplicate template

### Label Generation
- `POST /api/labels/:id/generate` - Generate label PDF
- `POST /api/labels/batch-generate` - Generate multiple labels

## 💾 Data Storage

### JSON Database
Templates are stored in `server/labels.json` with the structure:
```json
{
  "templates": [
    {
      "id": "uuid-here",
      "labelName": "Template Name",
      "fields": [...],
      "paperSize": "Brother-QL800",
      "width": 234,
      "height": 110,
      "copies": 1,
      "archived": false,
      "createdBy": "user@email.com",
      "createdDate": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### Backup and Recovery
- **Automatic Backups** - Templates backed up with each change
- **Export/Import** - JSON export for template sharing
- **Version Control** - Change tracking and rollback

## 🔒 Security & Permissions

### Authentication
- All label operations require valid JWT authentication
- User context tracked for audit trail
- Created/Modified by tracking

### Data Validation
- Server-side validation for all template operations
- Field validation for required properties
- SQL injection prevention (using JSON storage)

## 🧪 Testing & Development

### Manual Testing
1. Create test templates with various field configurations
2. Test PDF generation with different browsers
3. Verify printer compatibility with Brother QL-800
4. Test template import/export functionality

### API Testing
```bash
# Test template creation
node test-api.js

# Test label generation
curl -X POST http://localhost:5001/api/labels/[template-id]/generate \
  -H "Authorization: Bearer [token]" \
  -H "Content-Type: application/json" \
  -d '{"fieldData": {"field1": "value1"}}'
```

## 🚨 Troubleshooting

### Common Issues
1. **Templates not loading** - Check authentication token
2. **PDF generation fails** - Verify template field configuration
3. **Print quality issues** - Check Brother QL-800 settings
4. **Field positioning** - Use grid snapping for alignment

### Error Messages
- `"Missing required fields"` - Template validation failed
- `"Template not found"` - Invalid template ID
- `"Failed to generate PDF"` - PDF service error
- `"Authentication required"` - Login required

## 📈 Best Practices

### Template Design
- Use consistent font sizes (10-16pt recommended)
- Allow adequate spacing between fields
- Test print output before finalizing templates
- Use descriptive field names
- Group related fields visually

### Workflow Integration
- Create templates that match business processes
- Use auto-populated fields (Created By, Date) consistently
- Archive unused templates rather than deleting
- Duplicate similar templates to save time

## 🔄 Future Enhancements

Planned improvements:
- **Barcode/QR Code Support** - Add barcode fields to templates
- **Image Fields** - Support for logos and graphics
- **Advanced Formatting** - Rich text and styling options
- **Template Sharing** - Share templates between users
- **Print Queue** - Batch printing management
- **Integration APIs** - Connect with external systems

## 📚 Related Documentation

- [API Documentation](./README.API.md)
- [Database Schema](./README.Database.md)
- [Production Deployment](./PRODUCTION_DEPLOYMENT.md)
- [Components Documentation](./src/components/README.md)
- [Services Documentation](./src/services/README.md)

---

For additional support or questions about the Label Creation System, refer to the component source code or contact the development team. 