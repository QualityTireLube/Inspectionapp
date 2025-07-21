// 🧠 Cursor: I'm now using PostgreSQL only (no SQLite) and deploying this backend to Render.
// Updated createExampleTables.js to use PostgreSQL exclusively via database config

const logger = require('./logger');
const DatabaseConfig = require('./database-config');

// Create example tables for demonstration using PostgreSQL
const createExampleTables = async () => {
  const dbConfig = new DatabaseConfig();
  
  try {
    const db = await dbConfig.getConnection();
    logger.info('✅ Connected to PostgreSQL for creating example tables');
    
    // Oil Change Records Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS oil_change_records (
        id SERIAL PRIMARY KEY,
        customer_name VARCHAR(255) NOT NULL,
        vehicle_vin VARCHAR(17) NOT NULL,
        vehicle_make VARCHAR(50),
        vehicle_model VARCHAR(50),
        vehicle_year INTEGER,
        mileage INTEGER,
        oil_type VARCHAR(100),
        filter_brand VARCHAR(50),
        service_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        technician_name VARCHAR(100),
        next_service_mileage INTEGER,
        notes TEXT,
        total_cost DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    logger.info('✅ oil_change_records table created');
    
    // Insert sample data
    const sampleOilChanges = [
      ['John Smith', '1HGCM82633A123456', 'Honda', 'Accord', 2020, 25000, '5W-30 Synthetic', 'Honda OEM', '2024-01-15', 'Mike Johnson', 30000, 'Customer requested premium oil', 45.99],
      ['Sarah Davis', '1G1ZT51826F123456', 'Chevrolet', 'Malibu', 2019, 32000, '0W-20 Full Synthetic', 'AC Delco', '2024-01-16', 'Lisa Chen', 37000, 'Regular maintenance', 52.50],
      ['Bob Wilson', '3VWDP7AJ5DM123456', 'Volkswagen', 'Jetta', 2018, 45000, '5W-40 Synthetic', 'Mann Filter', '2024-01-17', 'Tom Rodriguez', 50000, 'High mileage vehicle', 48.75],
      ['Alice Johnson', '1FTFW1ET5DFC12345', 'Ford', 'F-150', 2021, 18000, '5W-30 Conventional', 'Motorcraft', '2024-01-18', 'Mike Johnson', 23000, 'Fleet vehicle', 38.99],
      ['David Brown', '5NPE24AF2FH123456', 'Hyundai', 'Elantra', 2017, 67000, '5W-30 High Mileage', 'Fram', '2024-01-19', 'Lisa Chen', 72000, 'High mileage blend recommended', 41.25]
    ];
    
    // Check if data already exists
    const existingOilRecords = await db.query('SELECT COUNT(*) as count FROM oil_change_records');
    if (existingOilRecords.rows[0].count == 0) {
      for (const record of sampleOilChanges) {
        await db.query(`
          INSERT INTO oil_change_records (customer_name, vehicle_vin, vehicle_make, vehicle_model, vehicle_year, mileage, oil_type, filter_brand, service_date, technician_name, next_service_mileage, notes, total_cost)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `, record);
      }
      logger.info('✅ Sample oil change records inserted');
    } else {
      logger.info('ℹ️  Oil change records already exist, skipping insert');
    }

    // Emissions Test Records Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS emissions_test_records (
        id SERIAL PRIMARY KEY,
        customer_name VARCHAR(255) NOT NULL,
        vehicle_vin VARCHAR(17) NOT NULL,
        vehicle_make VARCHAR(50),
        vehicle_model VARCHAR(50),
        vehicle_year INTEGER,
        license_plate VARCHAR(20),
        test_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        test_type VARCHAR(20) CHECK (test_type IN ('OBD', 'Tailpipe', 'Visual', 'Comprehensive')),
        test_result VARCHAR(20) CHECK (test_result IN ('Pass', 'Fail', 'Conditional Pass')),
        inspector_name VARCHAR(100),
        station_id VARCHAR(50),
        certificate_number VARCHAR(50),
        expiration_date DATE,
        notes TEXT,
        retest_required BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    logger.info('✅ emissions_test_records table created');
    
    // Insert sample data
    const sampleEmissions = [
      ['John Smith', '1HGCM82633A123456', 'Honda', 'Accord', 2020, 'ABC-123', '2024-01-10', 'OBD', 'Pass', 'Inspector Jane', 'ST001', 'EM2024001', '2025-01-10', 'All systems normal', false],
      ['Sarah Davis', '1G1ZT51826F123456', 'Chevrolet', 'Malibu', 2019, 'XYZ-789', '2024-01-11', 'Comprehensive', 'Pass', 'Inspector Bob', 'ST001', 'EM2024002', '2025-01-11', 'Clean emissions', false],
      ['Bob Wilson', '3VWDP7AJ5DM123456', 'Volkswagen', 'Jetta', 2018, 'DEF-456', '2024-01-12', 'OBD', 'Fail', 'Inspector Jane', 'ST001', null, null, 'Check engine light on', true],
      ['Alice Johnson', '1FTFW1ET5DFC12345', 'Ford', 'F-150', 2021, 'GHI-321', '2024-01-13', 'Visual', 'Pass', 'Inspector Bob', 'ST001', 'EM2024003', '2025-01-13', 'Visual inspection passed', false],
      ['David Brown', '5NPE24AF2FH123456', 'Hyundai', 'Elantra', 2017, 'JKL-654', '2024-01-14', 'Tailpipe', 'Conditional Pass', 'Inspector Jane', 'ST001', 'EM2024004', '2024-07-14', 'Borderline readings', false]
    ];
    
    // Check if data already exists
    const existingEmissions = await db.query('SELECT COUNT(*) as count FROM emissions_test_records');
    if (existingEmissions.rows[0].count == 0) {
      for (const record of sampleEmissions) {
        await db.query(`
          INSERT INTO emissions_test_records (customer_name, vehicle_vin, vehicle_make, vehicle_model, vehicle_year, license_plate, test_date, test_type, test_result, inspector_name, station_id, certificate_number, expiration_date, notes, retest_required)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        `, record);
      }
      logger.info('✅ Sample emissions test records inserted');
    } else {
      logger.info('ℹ️  Emissions test records already exist, skipping insert');
    }

    // Tire Installation Records Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS tire_installation_records (
        id SERIAL PRIMARY KEY,
        customer_name VARCHAR(255) NOT NULL,
        vehicle_vin VARCHAR(17) NOT NULL,
        vehicle_make VARCHAR(50),
        vehicle_model VARCHAR(50),
        vehicle_year INTEGER,
        installation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        tire_brand VARCHAR(50),
        tire_model VARCHAR(100),
        tire_size VARCHAR(50),
        quantity INTEGER,
        tire_type VARCHAR(20) CHECK (tire_type IN ('All Season', 'Summer', 'Winter', 'Performance')),
        front_tires VARCHAR(50),
        rear_tires VARCHAR(50),
        installation_type VARCHAR(20) CHECK (installation_type IN ('New', 'Rotation', 'Replacement', 'Repair')),
        technician_name VARCHAR(100),
        pressure_front INTEGER,
        pressure_rear INTEGER,
        alignment_performed BOOLEAN DEFAULT FALSE,
        balance_performed BOOLEAN DEFAULT TRUE,
        total_cost DECIMAL(10,2),
        warranty_months INTEGER,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    logger.info('✅ tire_installation_records table created');
    
    // Insert sample data
    const sampleTires = [
      ['John Smith', '1HGCM82633A123456', 'Honda', 'Accord', 2020, '2024-01-08', 'Michelin', 'Defender T+H', '225/60R16', 4, 'All Season', '225/60R16', '225/60R16', 'New', 'Mike Johnson', 32, 32, false, true, 650.00, 60, 'Customer wanted premium tires'],
      ['Sarah Davis', '1G1ZT51826F123456', 'Chevrolet', 'Malibu', 2019, '2024-01-09', 'Goodyear', 'Assurance WeatherReady', '215/60R16', 2, 'All Season', '215/60R16', null, 'Replacement', 'Lisa Chen', 35, 35, false, true, 320.00, 65, 'Front tires only'],
      ['Bob Wilson', '3VWDP7AJ5DM123456', 'Volkswagen', 'Jetta', 2018, '2024-01-10', 'Continental', 'PureContact LS', '205/55R16', 4, 'All Season', '205/55R16', '205/55R16', 'New', 'Tom Rodriguez', 36, 36, true, true, 720.00, 50, 'Alignment included'],
      ['Alice Johnson', '1FTFW1ET5DFC12345', 'Ford', 'F-150', 2021, '2024-01-11', 'BFGoodrich', 'All-Terrain T/A KO2', 'LT265/70R17', 4, 'All Season', 'LT265/70R17', 'LT265/70R17', 'New', 'Mike Johnson', 35, 35, false, true, 1200.00, 55, 'Heavy duty truck tires'],
      ['David Brown', '5NPE24AF2FH123456', 'Hyundai', 'Elantra', 2017, '2024-01-12', 'Hankook', 'Kinergy PT', '205/55R16', 4, 'All Season', '205/55R16', '205/55R16', 'Rotation', 'Lisa Chen', 32, 32, false, false, 25.00, 0, 'Tire rotation service only']
    ];
    
    // Check if data already exists
    const existingTires = await db.query('SELECT COUNT(*) as count FROM tire_installation_records');
    if (existingTires.rows[0].count == 0) {
      for (const record of sampleTires) {
        await db.query(`
          INSERT INTO tire_installation_records (customer_name, vehicle_vin, vehicle_make, vehicle_model, vehicle_year, installation_date, tire_brand, tire_model, tire_size, quantity, tire_type, front_tires, rear_tires, installation_type, technician_name, pressure_front, pressure_rear, alignment_performed, balance_performed, total_cost, warranty_months, notes)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
        `, record);
      }
      logger.info('✅ Sample tire installation records inserted');
    } else {
      logger.info('ℹ️  Tire installation records already exist, skipping insert');
    }

    // Customer Vehicle Profiles Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS customer_vehicle_profiles (
        id SERIAL PRIMARY KEY,
        customer_name VARCHAR(255) NOT NULL,
        customer_email VARCHAR(255),
        customer_phone VARCHAR(20),
        vehicle_vin VARCHAR(17) NOT NULL UNIQUE,
        vehicle_make VARCHAR(50),
        vehicle_model VARCHAR(50),
        vehicle_year INTEGER,
        license_plate VARCHAR(20),
        color VARCHAR(30),
        mileage INTEGER,
        last_service_date TIMESTAMP,
        next_service_due_date DATE,
        preferred_technician VARCHAR(100),
        service_notes TEXT,
        customer_preferences TEXT,
        insurance_company VARCHAR(100),
        insurance_policy VARCHAR(50),
        registration_expiration DATE,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    logger.info('✅ customer_vehicle_profiles table created');
    
    // Insert sample data
    const sampleProfiles = [
      ['John Smith', 'john.smith@email.com', '555-0101', '1HGCM82633A123456', 'Honda', 'Accord', 2020, 'ABC-123', 'Silver', 25000, '2024-01-15', '2024-04-15', 'Mike Johnson', 'Regular customer, always on time', 'Prefers synthetic oil', 'State Farm', 'SF123456789', '2024-12-31', true],
      ['Sarah Davis', 'sarah.davis@email.com', '555-0102', '1G1ZT51826F123456', 'Chevrolet', 'Malibu', 2019, 'XYZ-789', 'White', 32000, '2024-01-16', '2024-04-16', 'Lisa Chen', 'Fleet vehicle', 'Standard service', 'Geico', 'GE987654321', '2024-11-30', true],
      ['Bob Wilson', 'bob.wilson@email.com', '555-0103', '3VWDP7AJ5DM123456', 'Volkswagen', 'Jetta', 2018, 'DEF-456', 'Blue', 45000, '2024-01-17', '2024-04-17', 'Tom Rodriguez', 'European vehicle specialist needed', 'Uses premium parts only', 'Progressive', 'PR456789123', '2024-10-15', true],
      ['Alice Johnson', 'alice.johnson@email.com', '555-0104', '1FTFW1ET5DFC12345', 'Ford', 'F-150', 2021, 'GHI-321', 'Red', 18000, '2024-01-18', '2024-07-18', 'Mike Johnson', 'Work truck, heavy usage', 'Needs heavy duty service', 'Farmers', 'FA789123456', '2025-01-20', true],
      ['David Brown', 'david.brown@email.com', '555-0105', '5NPE24AF2FH123456', 'Hyundai', 'Elantra', 2017, 'JKL-654', 'Black', 67000, '2024-01-19', '2024-04-19', 'Lisa Chen', 'High mileage vehicle', 'Budget conscious customer', 'Allstate', 'AL123789456', '2024-09-30', true]
    ];
    
    // Check if data already exists
    const existingProfiles = await db.query('SELECT COUNT(*) as count FROM customer_vehicle_profiles');
    if (existingProfiles.rows[0].count == 0) {
      for (const record of sampleProfiles) {
        await db.query(`
          INSERT INTO customer_vehicle_profiles (customer_name, customer_email, customer_phone, vehicle_vin, vehicle_make, vehicle_model, vehicle_year, license_plate, color, mileage, last_service_date, next_service_due_date, preferred_technician, service_notes, customer_preferences, insurance_company, insurance_policy, registration_expiration, active)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        `, record);
      }
      logger.info('✅ Sample customer vehicle profiles inserted');
    } else {
      logger.info('ℹ️  Customer vehicle profiles already exist, skipping insert');
    }

    await db.end();
    logger.info('✅ Example tables created successfully. Database connection closed.');
    logger.info('📋 Created tables:');
    logger.info('   - oil_change_records');
    logger.info('   - emissions_test_records');  
    logger.info('   - tire_installation_records');
    logger.info('   - customer_vehicle_profiles');
    logger.info('🚀 You can now test the dynamic API with these tables!');
    
  } catch (error) {
    logger.error('❌ Error creating example tables:', error);
    throw error;
  }
};

// Run the table creation if this script is executed directly
if (require.main === module) {
  createExampleTables().catch(console.error);
}

module.exports = { createExampleTables }; 