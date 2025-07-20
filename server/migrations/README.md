# Migrations Directory

This directory contains database migration scripts for the Vehicle Inspection App's SQLite database. Migrations ensure systematic database schema evolution and provide version control for database structure changes.

## Overview

Database migrations are scripts that modify the database schema in a controlled, versioned manner. They allow the application to:
- Track database schema changes over time
- Apply updates consistently across environments
- Rollback changes if necessary
- Maintain database integrity during updates

## Migration Files

### add_status_column.js
Adds a status column to the inspections table to track inspection completion states.

**Changes Applied:**
- Adds `status` column to `inspections` table
- Sets default value for existing records
- Updates table structure for new inspection workflow

**SQL Operations:**
```sql
ALTER TABLE inspections ADD COLUMN status TEXT DEFAULT 'draft';
UPDATE inspections SET status = 'completed' WHERE data IS NOT NULL;
```

## Migration Structure

### File Naming Convention
Migration files follow the pattern:
```
{action}_{description}.js

Examples:
- add_status_column.js
- create_users_table.js
- update_inspection_schema.js
- remove_deprecated_fields.js
```

### File Format
Each migration file contains:
```javascript
// Migration metadata
const migration = {
  version: '001',
  description: 'Add status column to inspections',
  up: (db) => {
    // Forward migration logic
  },
  down: (db) => {
    // Rollback migration logic (optional)
  }
};

module.exports = migration;
```

## Running Migrations

### Automatic Migration
Migrations are automatically applied when the server starts:
```javascript
// In server/index.js
const runMigrations = require('./migrations/runner');
runMigrations(db);
```

### Manual Migration
Run specific migrations manually:
```bash
cd server
node -e "
const db = require('sqlite3').Database('./database.sqlite');
const migration = require('./migrations/add_status_column.js');
migration.up(db);
"
```

### Migration Status
Check which migrations have been applied:
```sql
SELECT * FROM migration_history ORDER BY applied_at DESC;
```

## Migration Development

### Creating New Migrations

1. **Create migration file:**
   ```bash
   touch migrations/add_new_feature.js
   ```

2. **Define migration logic:**
   ```javascript
   const migration = {
     version: '002',
     description: 'Add new feature to database',
     up: (db) => {
       db.run(`
         ALTER TABLE inspections 
         ADD COLUMN new_field TEXT
       `);
     },
     down: (db) => {
       db.run(`
         ALTER TABLE inspections 
         DROP COLUMN new_field
       `);
     }
   };
   module.exports = migration;
   ```

3. **Test migration:**
   - Test on development database
   - Verify data integrity
   - Test rollback if applicable

### Best Practices

#### Schema Changes
1. **Additive changes**: Prefer adding columns over modifying existing ones
2. **Default values**: Provide defaults for new NOT NULL columns
3. **Backward compatibility**: Ensure old code can work with new schema
4. **Data migration**: Handle existing data when changing structure

#### Migration Safety
1. **Backup first**: Always backup database before migrations
2. **Test thoroughly**: Test migrations on copy of production data
3. **Rollback plan**: Provide rollback migrations where possible
4. **Small changes**: Keep migrations focused and atomic

#### Performance Considerations
1. **Index creation**: Create indexes after bulk data operations
2. **Batch operations**: Process large datasets in batches
3. **Lock duration**: Minimize table lock time
4. **Resource usage**: Monitor memory and CPU during migrations

## Migration History

### Tracking System
The application maintains a migration history table:
```sql
CREATE TABLE migration_history (
  id INTEGER PRIMARY KEY,
  version TEXT UNIQUE,
  filename TEXT,
  description TEXT,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  rollback_at DATETIME NULL
);
```

### Migration Log
Each migration execution is logged:
- Migration version and filename
- Execution timestamp
- Success/failure status
- Error messages if any
- Execution duration

## Rollback Procedures

### Automatic Rollback
Some migrations support automatic rollback:
```javascript
const migration = {
  up: (db) => {
    // Forward migration
  },
  down: (db) => {
    // Rollback migration
  }
};
```

### Manual Rollback
For complex rollbacks:
1. **Restore from backup**: Most reliable method
2. **Manual SQL**: Execute reverse operations manually
3. **Data recovery**: Restore specific data if needed

### Rollback Considerations
- Not all migrations can be safely rolled back
- Data loss may occur during rollback
- Test rollback procedures before applying to production
- Consider point-in-time recovery for critical rollbacks

## Environment Management

### Development
- Migrations run automatically on server start
- Database can be reset and rebuilt easily
- Test migrations with sample data

### Staging
- Mirror production migration process
- Validate migrations before production deployment
- Performance testing with production-like data

### Production
- Scheduled maintenance windows for migrations
- Database backups before migration
- Monitoring during and after migration
- Rollback plan ready if issues occur

## Common Migration Patterns

### Adding Tables
```javascript
up: (db) => {
  db.run(`
    CREATE TABLE new_table (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}
```

### Adding Columns
```javascript
up: (db) => {
  db.run(`
    ALTER TABLE existing_table 
    ADD COLUMN new_column TEXT DEFAULT 'default_value'
  `);
}
```

### Creating Indexes
```javascript
up: (db) => {
  db.run(`
    CREATE INDEX idx_table_column 
    ON table_name(column_name)
  `);
}
```

### Data Migration
```javascript
up: (db) => {
  // First, add new column
  db.run(`ALTER TABLE users ADD COLUMN full_name TEXT`);
  
  // Then, populate with existing data
  db.run(`
    UPDATE users 
    SET full_name = first_name || ' ' || last_name 
    WHERE first_name IS NOT NULL AND last_name IS NOT NULL
  `);
}
```

## Troubleshooting

### Common Issues
1. **Migration failed**: Check logs for SQL errors
2. **Duplicate migration**: Version conflicts in migration history
3. **Schema conflicts**: Existing data incompatible with new schema
4. **Permission errors**: Database file permissions

### Recovery Procedures
1. **Check migration history**: Identify which migrations succeeded
2. **Review error logs**: Understand what went wrong
3. **Restore from backup**: If migration caused data corruption
4. **Manual fixes**: Apply corrective SQL if safe to do so

### Prevention
- Always test migrations on development data
- Review migration scripts before deployment
- Maintain regular database backups
- Monitor application after migrations

## Tools and Utilities

### Migration Runner
Custom migration runner in `runner.js`:
- Tracks applied migrations
- Executes pending migrations
- Logs execution results
- Handles errors gracefully

### Validation Scripts
Scripts to validate migration integrity:
- Schema validation
- Data consistency checks
- Performance impact assessment
- Rollback verification

## Future Enhancements

### Planned Improvements
- **Migration dependencies**: Manage migration order and dependencies
- **Parallel migrations**: Execute safe migrations concurrently  
- **Schema validation**: Automated schema verification
- **Migration testing**: Automated migration testing framework
- **Cloud migration**: Support for cloud database migrations 