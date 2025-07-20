# QuickCheck Database Documentation

## Overview

The QuickCheck application uses a relational database to store inspection data, user information, and photo metadata. This document outlines the database schema, relationships, and data types.

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'technician', 'viewer') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Inspections Table
```sql
CREATE TABLE inspections (
    id VARCHAR(36) PRIMARY KEY,
    vin VARCHAR(17) NOT NULL,
    date DATE NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    mileage VARCHAR(20) NOT NULL,
    windshield_condition ENUM('good', 'bad') NOT NULL,
    wiper_blades ENUM('good', 'front_minor', 'front_moderate', 'front_major', 'rear_minor', 'rear_moderate', 'rear_major') NOT NULL,
    washer_squirters ENUM('good', 'leaking', 'not_working', 'no_pump_sound') NOT NULL,
    state_inspection_status ENUM('expired', 'this_year', 'next_year', 'year_after') NOT NULL,
    state_inspection_month INT,
    washer_fluid ENUM('full', 'leaking', 'not_working', 'no_pump_sound') NOT NULL,
    engine_air_filter ENUM('good', 'next_oil_change', 'highly_recommended', 'today', 'animal_related') NOT NULL,
    battery_condition ENUM('good', 'warning', 'bad', 'na', 'terminal_cleaning', 'less_than_5yr') NOT NULL,
    passenger_front_tire ENUM('good', 'warning', 'bad', 'over_7yr', 'over_6yr', 'inner_wear', 'outer_wear', 'wear_indicator', 'separated', 'dry_rotted', 'na', 'no_spare') NOT NULL,
    driver_front_tire ENUM('good', 'warning', 'bad', 'over_7yr', 'over_6yr', 'inner_wear', 'outer_wear', 'wear_indicator', 'separated', 'dry_rotted', 'na', 'no_spare') NOT NULL,
    driver_rear_tire ENUM('good', 'warning', 'bad', 'over_7yr', 'over_6yr', 'inner_wear', 'outer_wear', 'wear_indicator', 'separated', 'dry_rotted', 'na', 'no_spare') NOT NULL,
    passenger_rear_tire ENUM('good', 'warning', 'bad', 'over_7yr', 'over_6yr', 'inner_wear', 'outer_wear', 'wear_indicator', 'separated', 'dry_rotted', 'na', 'no_spare') NOT NULL,
    spare_tire ENUM('good', 'warning', 'bad', 'over_7yr', 'over_6yr', 'inner_wear', 'outer_wear', 'wear_indicator', 'separated', 'dry_rotted', 'na', 'no_spare') NOT NULL,
    tire_repair_status ENUM('repairable', 'not_tire_repair', 'non_repairable') NOT NULL,
    tpms_type ENUM('not_check', 'bad_sensor') NOT NULL,
    tire_rotation ENUM('good', 'bad') NOT NULL,
    static_sticker ENUM('good', 'not_oil_change', 'need_sticker') NOT NULL,
    drain_plug_type ENUM('metal', 'plastic') NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Photos Table
```sql
CREATE TABLE photos (
    id VARCHAR(36) PRIMARY KEY,
    inspection_id VARCHAR(36) NOT NULL,
    type ENUM('passenger_front', 'driver_front', 'driver_rear', 'passenger_rear', 'spare', 'front_brakes', 'rear_brakes', 'tpms_placard', 'washer_fluid', 'engine_air_filter', 'battery', 'tpms_tool', 'dashLights', 'undercarriage_photos') NOT NULL,
    url VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INT NOT NULL,
    mime_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE
);
```

### TireTread Table
```sql
CREATE TABLE tire_tread (
    id VARCHAR(36) PRIMARY KEY,
    inspection_id VARCHAR(36) NOT NULL,
    position ENUM('driver_front', 'passenger_front', 'driver_rear', 'passenger_rear', 'spare') NOT NULL,
    inner_edge_depth DECIMAL(4,2) NOT NULL,
    inner_depth DECIMAL(4,2) NOT NULL,
    center_depth DECIMAL(4,2) NOT NULL,
    outer_depth DECIMAL(4,2) NOT NULL,
    outer_edge_depth DECIMAL(4,2) NOT NULL,
    inner_edge_condition ENUM('green', 'yellow', 'red') NOT NULL,
    inner_condition ENUM('green', 'yellow', 'red') NOT NULL,
    center_condition ENUM('green', 'yellow', 'red') NOT NULL,
    outer_condition ENUM('green', 'yellow', 'red') NOT NULL,
    outer_edge_condition ENUM('green', 'yellow', 'red') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE
);
```

### TireComments Table
```sql
CREATE TABLE tire_comments (
    id VARCHAR(36) PRIMARY KEY,
    inspection_id VARCHAR(36) NOT NULL,
    position ENUM('driver_front', 'passenger_front', 'driver_rear', 'passenger_rear', 'spare') NOT NULL,
    comment VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE
);
```

### TireDates Table
```sql
CREATE TABLE tire_dates (
    id VARCHAR(36) PRIMARY KEY,
    inspection_id VARCHAR(36) NOT NULL,
    position ENUM('driver_front', 'passenger_front', 'driver_rear', 'passenger_rear', 'spare') NOT NULL,
    tire_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE
);
```

### TireRepairZones Table
```sql
CREATE TABLE tire_repair_zones (
    id VARCHAR(36) PRIMARY KEY,
    inspection_id VARCHAR(36) NOT NULL,
    position VARCHAR(50) NOT NULL,
    status ENUM('good', 'bad') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE
);
```

### TPMSZones Table
```sql
CREATE TABLE tpms_zones (
    id VARCHAR(36) PRIMARY KEY,
    inspection_id VARCHAR(36) NOT NULL,
    position VARCHAR(50) NOT NULL,
    status ENUM('good', 'bad') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE
);
```

### InspectionDrafts Table
```sql
CREATE TABLE inspection_drafts (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    draft_data JSON NOT NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## Indexes

```sql
-- Users Table Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- Inspections Table Indexes
CREATE INDEX idx_inspections_vin ON inspections(vin);
CREATE INDEX idx_inspections_date ON inspections(date);
CREATE INDEX idx_inspections_user_id ON inspections(user_id);

-- Photos Table Indexes
CREATE INDEX idx_photos_inspection_id ON photos(inspection_id);
CREATE INDEX idx_photos_type ON photos(type);

-- TireTread Table Indexes
CREATE INDEX idx_tire_tread_inspection_id ON tire_tread(inspection_id);
CREATE INDEX idx_tire_tread_position ON tire_tread(position);

-- TireComments Table Indexes
CREATE INDEX idx_tire_comments_inspection_id ON tire_comments(inspection_id);
CREATE INDEX idx_tire_comments_position ON tire_comments(position);

-- TireDates Table Indexes
CREATE INDEX idx_tire_dates_inspection_id ON tire_dates(inspection_id);
CREATE INDEX idx_tire_dates_position ON tire_dates(position);

-- TireRepairZones Table Indexes
CREATE INDEX idx_tire_repair_zones_inspection_id ON tire_repair_zones(inspection_id);

-- TPMSZones Table Indexes
CREATE INDEX idx_tpms_zones_inspection_id ON tpms_zones(inspection_id);

-- InspectionDrafts Table Indexes
CREATE INDEX idx_inspection_drafts_user_id ON inspection_drafts(user_id);
CREATE INDEX idx_inspection_drafts_last_updated ON inspection_drafts(last_updated);
```

## Relationships

1. Users to Inspections (One-to-Many)
   - One user can have many inspections
   - Each inspection belongs to one user

2. Inspections to Photos (One-to-Many)
   - One inspection can have many photos
   - Each photo belongs to one inspection

3. Inspections to TireTread (One-to-Many)
   - One inspection can have many tire tread measurements
   - Each tire tread measurement belongs to one inspection

4. Inspections to TireComments (One-to-Many)
   - One inspection can have many tire comments
   - Each tire comment belongs to one inspection

5. Inspections to TireDates (One-to-Many)
   - One inspection can have many tire dates
   - Each tire date belongs to one inspection

6. Inspections to TireRepairZones (One-to-Many)
   - One inspection can have many tire repair zones
   - Each tire repair zone belongs to one inspection

7. Inspections to TPMSZones (One-to-Many)
   - One inspection can have many TPMS zones
   - Each TPMS zone belongs to one inspection

8. Users to InspectionDrafts (One-to-Many)
   - One user can have many inspection drafts
   - Each draft belongs to one user

## Data Types

### Enums
- WindshieldCondition: 'good', 'bad'
- WiperBladeCondition: 'good', 'front_minor', 'front_moderate', 'front_major', 'rear_minor', 'rear_moderate', 'rear_major'
- WasherSquirterCondition: 'good', 'leaking', 'not_working', 'no_pump_sound'
- StateInspectionStatus: 'expired', 'this_year', 'next_year', 'year_after'
- WasherFluidCondition: 'full', 'leaking', 'not_working', 'no_pump_sound'
- EngineAirFilterCondition: 'good', 'next_oil_change', 'highly_recommended', 'today', 'animal_related'
- BatteryCondition: 'good', 'warning', 'bad', 'na', 'terminal_cleaning', 'less_than_5yr'
- TireCondition: 'good', 'warning', 'bad', 'over_7yr', 'over_6yr', 'inner_wear', 'outer_wear', 'wear_indicator', 'separated', 'dry_rotted', 'na', 'no_spare'
- TreadCondition: 'green', 'yellow', 'red'

## Backup and Recovery

### Backup Strategy
- Daily full database backups
- Hourly incremental backups
- Transaction logs backed up every 15 minutes

### Recovery Procedures
1. Full database restore from latest backup
2. Apply incremental backups in sequence
3. Apply transaction logs to reach point-in-time recovery

## Performance Considerations

1. Indexing Strategy
   - Indexes on frequently queried columns
   - Composite indexes for common query patterns
   - Regular index maintenance

2. Query Optimization
   - Use of prepared statements
   - Query caching where appropriate
   - Regular query performance monitoring

3. Data Archiving
   - Old inspections archived after 2 years
   - Photos moved to cold storage after 1 year
   - Regular cleanup of temporary data

## Security

1. Data Encryption
   - All sensitive data encrypted at rest
   - SSL/TLS for data in transit
   - Encrypted backups

2. Access Control
   - Role-based access control
   - Audit logging of all database access
   - Regular security reviews

## Maintenance

1. Regular Tasks
   - Daily index maintenance
   - Weekly statistics updates
   - Monthly data archiving
   - Quarterly performance tuning

2. Monitoring
   - Database size monitoring
   - Performance metrics tracking
   - Error log monitoring
   - Connection pool monitoring 