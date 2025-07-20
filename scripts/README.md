# Scripts Directory

This directory contains utility scripts for the Vehicle Inspection App that help with development, maintenance, and operational tasks. These scripts provide automation for common administrative and development workflows.

## Files

### killPort.ts
A TypeScript utility script that forcefully terminates processes running on specified ports.

**Purpose:**
- Kill processes that may be blocking development ports
- Clean up stuck server processes
- Resolve port conflicts during development

**Usage:**
```bash
cd scripts
npm run build
node dist/killPort.js --port 3001
```

**Features:**
- Cross-platform compatibility (Windows, macOS, Linux)
- Process identification by port number
- Graceful process termination with fallback to force kill
- Error handling for permission issues
- Logging of terminated processes

### createDefaultUser.ts
TypeScript script for creating default user accounts in the system.

**Purpose:**
- Initialize the system with admin users
- Create test users for development
- Set up user accounts for new installations
- Reset user passwords for recovery

**Usage:**
```bash
cd scripts
npm run build
node dist/createDefaultUser.js --username admin --password secret123
```

**Features:**
- Password hashing and security
- Role assignment (admin, technician, viewer)
- Input validation and sanitization
- Database connectivity and error handling
- User existence checking to prevent duplicates

## Configuration

### Package Configuration
The scripts directory has its own `package.json` with:
- TypeScript compilation setup
- Development dependencies
- Build scripts for TypeScript compilation
- Node.js runtime configuration

### TypeScript Configuration
`tsconfig.json` provides:
- ES2020 target for modern Node.js features
- Strict type checking
- Module resolution for Node.js
- Output directory configuration

## Development Setup

### Prerequisites
- Node.js (v14 or higher)
- npm package manager
- TypeScript compiler

### Installation
```bash
cd scripts
npm install
```

### Building Scripts
```bash
cd scripts
npm run build
```

### Running Scripts
```bash
# After building
node dist/scriptName.js [arguments]

# Or with npm scripts
npm run kill-port -- --port 3001
npm run create-user -- --username admin
```

## Script Categories

### Development Scripts
Scripts that assist during development:
- **Port management**: Kill processes blocking development ports
- **Database setup**: Initialize development databases
- **Test data**: Generate sample data for testing
- **Environment setup**: Configure development environment

### Maintenance Scripts
Scripts for ongoing system maintenance:
- **User management**: Create, update, delete user accounts
- **Database cleanup**: Remove old records and optimize database
- **File cleanup**: Clean up temporary and orphaned files
- **Backup operations**: Create and restore backups

### Deployment Scripts
Scripts for deployment and production setup:
- **Environment validation**: Check production requirements
- **Database migration**: Apply schema updates
- **Configuration setup**: Initialize production configuration
- **Health checks**: Verify system functionality

## Usage Patterns

### Interactive Scripts
Some scripts support interactive mode:
```bash
node dist/createDefaultUser.js --interactive
# Prompts for username, password, role, etc.
```

### Batch Operations
Scripts can process multiple items:
```bash
node dist/createDefaultUser.js --batch users.csv
# Creates users from CSV file
```

### Configuration Files
Scripts can read from configuration files:
```bash
node dist/setupEnvironment.js --config production.json
# Applies settings from configuration file
```

## Error Handling

### Common Error Patterns
Scripts implement consistent error handling:
- **Database connection errors**: Retry logic with exponential backoff
- **File system errors**: Permission and existence checking
- **Network errors**: Timeout and retry mechanisms
- **Validation errors**: Clear error messages and exit codes

### Logging
All scripts use structured logging:
- **Info level**: Normal operation progress
- **Warn level**: Non-fatal issues and warnings
- **Error level**: Fatal errors and exceptions
- **Debug level**: Detailed debugging information

### Exit Codes
Scripts use standard exit codes:
- `0`: Success
- `1`: General error
- `2`: Invalid arguments
- `3`: Database error
- `4`: Permission error

## Security Considerations

### Credential Handling
- Passwords are never logged or displayed
- Sensitive data is cleared from memory
- Configuration files with secrets are in `.gitignore`
- Environment variables used for production secrets

### Access Control
- Scripts verify user permissions before operations
- Database operations use least-privilege principles
- File operations check and set appropriate permissions
- Network operations validate endpoints and certificates

## Testing

### Unit Testing
Scripts include unit tests for core functionality:
```bash
cd scripts
npm test
```

### Integration Testing
End-to-end testing with actual database:
```bash
cd scripts
npm run test:integration
```

### Manual Testing
Test scripts in development environment before production use:
1. Test with invalid inputs
2. Test error conditions
3. Verify cleanup operations
4. Check resource usage

## Performance Monitoring

### Resource Usage
Scripts monitor their resource consumption:
- Memory usage tracking
- CPU utilization monitoring
- Database connection pooling
- File handle management

### Execution Time
Performance metrics for optimization:
- Script execution duration
- Database query performance
- File operation timing
- Network request latency

## Future Scripts

### Planned Additions
- **Data migration**: Transfer data between systems
- **Report generation**: Automated report creation
- **System monitoring**: Health check and alerting scripts
- **Backup automation**: Scheduled backup operations
- **Performance testing**: Load testing and benchmarking

### Script Templates
Standard templates for new scripts:
- **Basic script template**: Common structure and imports
- **Database script template**: Database connection and error handling
- **File operation template**: File system operations with safety checks
- **Network script template**: HTTP requests with retry logic

## Best Practices

### Development Guidelines
1. **Type safety**: Use TypeScript for all scripts
2. **Error handling**: Implement comprehensive error handling
3. **Logging**: Use structured logging throughout
4. **Documentation**: Document all command-line options
5. **Testing**: Include unit and integration tests

### Operational Guidelines
1. **Dry run mode**: Support dry run for destructive operations
2. **Confirmation prompts**: Require confirmation for dangerous operations
3. **Progress indicators**: Show progress for long-running operations
4. **Cleanup**: Clean up resources on exit
5. **Monitoring**: Log important operations for audit trails

### Security Guidelines
1. **Input validation**: Validate all user inputs
2. **Sanitization**: Sanitize inputs to prevent injection
3. **Permissions**: Check permissions before operations
4. **Secrets**: Never hardcode secrets in scripts
5. **Audit**: Log security-relevant operations

## Troubleshooting

### Common Issues
1. **Permission denied**: Check file and directory permissions
2. **Port already in use**: Use killPort script to free ports
3. **Database locked**: Ensure no other processes are using database
4. **Module not found**: Run `npm install` in scripts directory

### Debug Mode
Enable debug mode for verbose output:
```bash
DEBUG=* node dist/scriptName.js
# or
node dist/scriptName.js --debug
```

### Logging Analysis
Check logs for script execution history:
```bash
# View recent script logs
tail -f ../server.log | grep "SCRIPT"

# Search for specific script errors
grep "ERROR.*scriptName" ../server.log
``` 