# Uploads Directory

This directory serves as the storage location for all files uploaded through the Vehicle Inspection App. It contains images, documents, and other files associated with vehicle inspections.

## Directory Structure

The uploads directory is organized hierarchically to ensure efficient file management and easy retrieval:

```
uploads/
├── 2024/
│   ├── 01/                 # January 2024
│   ├── 02/                 # February 2024
│   └── ...
├── 2023/
│   └── ...
└── temp/                   # Temporary upload processing
```

### Organization Pattern
- **Year-based folders**: Top-level directories for each year
- **Month-based subfolders**: Numbered folders (01-12) for each month
- **Unique filenames**: Files are renamed to prevent conflicts and maintain security

## File Types

### Supported Formats
- **Images**: JPEG, PNG, GIF
- **Documents**: PDF
- **Maximum file size**: 10MB per file
- **Multiple files**: Supported per inspection component

### File Naming Convention
Files are automatically renamed upon upload using the pattern:
```
{type}_{timestamp}_{random}.{extension}

Examples:
- dash_lights_1640995200000_abc123.jpg
- engine_air_filter_1640995200000_def456.png
- brake_photo_1640995200000_ghi789.pdf
```

## Current Files

### Draft Images
- `draft_washer_fluid_1.jpeg` - Washer fluid inspection image (69KB)
- `draft_washer_fluid_2.jpeg` - Washer fluid inspection image (114KB)  
- `draft_washer_fluid_3.jpeg` - Washer fluid inspection image (211KB)

These files represent draft inspection photos that are being processed or reviewed.

## Security

### Access Control
- Files are served through the backend API with proper authentication
- Direct file access is restricted through server configuration
- File type validation prevents malicious uploads
- Size limits prevent system abuse

### Storage Security
- Files are stored outside the web-accessible directory
- Unique naming prevents filename-based attacks
- Regular cleanup of temporary files
- Backup procedures for important inspection data

## File Management

### Upload Process
1. **Client Upload**: Files are uploaded via the React frontend
2. **Server Processing**: Backend validates file type and size
3. **Storage**: Files are moved to appropriate year/month directories
4. **Database Reference**: File metadata is stored in the database
5. **Cleanup**: Temporary files are removed after processing

### File Retrieval
Files are accessed through API endpoints:
```
GET /api/uploads/{filename}
GET /api/uploads/{year}/{month}/{filename}
```

### File Deletion
- Files can be deleted through the API
- Soft deletion marks files as deleted in database
- Physical file removal happens during cleanup processes
- Inspection deletion cascades to associated files

## Maintenance

### Cleanup Tasks
- **Temporary files**: Removed after 24 hours if not processed
- **Orphaned files**: Files without database references are cleaned up weekly
- **Old drafts**: Draft files older than 30 days are archived
- **Log rotation**: Upload logs are rotated monthly

### Backup Strategy
- **Daily backups**: Critical inspection files are backed up daily
- **Version control**: Previous versions of edited files are retained
- **Cloud storage**: Backups are stored in cloud storage for redundancy
- **Recovery procedures**: Documented process for file recovery

## Monitoring

### Storage Metrics
- **Disk usage**: Monitor available disk space
- **Upload rates**: Track file upload frequency and size
- **Error rates**: Monitor failed uploads and storage errors
- **Performance**: Track file serving response times

### Alerts
- Low disk space warnings at 80% capacity
- High error rate notifications
- Unusual upload patterns detection
- Failed backup notifications

## Integration

### Frontend Integration
The uploads directory integrates with:
- **Photo capture components**: Direct camera uploads
- **File selection dialogs**: User file uploads
- **Image preview**: Display uploaded images
- **Progress tracking**: Upload progress indicators

### Backend Integration
- **Express routes**: File serving endpoints
- **Multer middleware**: Upload processing
- **Database operations**: File metadata storage
- **Authentication**: Access control for file operations

## Troubleshooting

### Common Issues
1. **Upload failures**: Check disk space and permissions
2. **File not found**: Verify file path and database consistency
3. **Permission errors**: Ensure proper directory permissions
4. **Large file uploads**: Monitor upload timeouts and memory usage

### Diagnostics
```bash
# Check disk usage
df -h uploads/

# List recent uploads
ls -la uploads/$(date +%Y)/$(date +%m)/

# Check file permissions
ls -la uploads/

# Monitor upload directory size
du -sh uploads/
```

## Performance Optimization

### File Serving
- **Static file serving**: Efficient file delivery through Express
- **Caching headers**: Appropriate cache control for images
- **Compression**: Gzip compression for text-based files
- **CDN integration**: Optional CDN for improved performance

### Storage Optimization
- **Image compression**: Automatic image optimization on upload
- **Progressive JPEG**: Better loading experience for large images
- **Thumbnail generation**: Smaller previews for gallery views
- **Archive old files**: Move old files to cheaper storage tiers

## Future Enhancements

### Planned Features
- **Cloud storage integration**: Move to S3 or similar
- **Image processing pipeline**: Automatic resizing and optimization
- **Version control**: Track file changes and history
- **Advanced search**: Search files by metadata and content
- **Batch operations**: Bulk file management capabilities

### Scalability Considerations
- **Distributed storage**: Multiple server file storage
- **Database sharding**: Partition file metadata
- **Microservice architecture**: Dedicated file service
- **Content delivery**: Global file distribution 