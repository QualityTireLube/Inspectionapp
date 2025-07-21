const logger = require('./logger');
const DatabaseConfig = require('./database-config');

// Create essential tables for production PostgreSQL
const createProductionTables = async () => {
  const dbConfig = new DatabaseConfig();
  
  try {
    const db = await dbConfig.getConnection();
    logger.info('✅ Connected to PostgreSQL for creating production tables');
    
    // Quick Checks Table (main inspection records)
    await db.query(`
      CREATE TABLE IF NOT EXISTS quick_checks (
        id SERIAL PRIMARY KEY,
        user_email VARCHAR(255) NOT NULL,
        user_name VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        data TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        duration_seconds INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'pending',
        saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        archived_at TIMESTAMP,
        archived_by VARCHAR(255),
        archived_by_name VARCHAR(255)
      )
    `);
    logger.info('✅ quick_checks table created');

    // Chat Conversations Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS chat_conversations (
        id SERIAL PRIMARY KEY,
        user1_email VARCHAR(255) NOT NULL,
        user1_name VARCHAR(255) NOT NULL,
        user2_email VARCHAR(255) NOT NULL,
        user2_name VARCHAR(255) NOT NULL,
        last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user1_email, user2_email)
      )
    `);
    logger.info('✅ chat_conversations table created');

    // Chat Messages Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER NOT NULL,
        sender_email VARCHAR(255) NOT NULL,
        sender_name VARCHAR(255) NOT NULL,
        receiver_email VARCHAR(255) NOT NULL,
        receiver_name VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'system')),
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE
      )
    `);
    logger.info('✅ chat_messages table created');

    // State Inspection Records Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS state_inspection_records (
        id VARCHAR(255) PRIMARY KEY,
        created_by VARCHAR(255) NOT NULL,
        created_date VARCHAR(255) NOT NULL,
        sticker_number VARCHAR(255) NOT NULL UNIQUE,
        last_name VARCHAR(255) NOT NULL,
        payment_type VARCHAR(50) NOT NULL CHECK (payment_type IN ('Cash', 'Check', 'Fleet')),
        payment_amount INTEGER NOT NULL CHECK (payment_amount IN (0, 10, 18, 20)),
        fleet_account VARCHAR(255),
        tint_affidavit VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        archived BOOLEAN DEFAULT FALSE
      )
    `);
    logger.info('✅ state_inspection_records table created');

    // Fleet Accounts Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS fleet_accounts (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        contact_name VARCHAR(255),
        contact_email VARCHAR(255),
        contact_phone VARCHAR(255),
        address TEXT,
        notes TEXT,
        active BOOLEAN DEFAULT TRUE,
        created_date VARCHAR(255) NOT NULL,
        updated_date VARCHAR(255) NOT NULL
      )
    `);
    logger.info('✅ fleet_accounts table created');

    // Bank Deposits Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS bank_deposits (
        id SERIAL PRIMARY KEY,
        total_cash DECIMAL(10,2) NOT NULL DEFAULT 0,
        total_checks DECIMAL(10,2) NOT NULL DEFAULT 0,
        images TEXT, -- JSON array of image filenames
        notes TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        user_id VARCHAR(255) NOT NULL,
        user_name VARCHAR(255) NOT NULL
      )
    `);
    logger.info('✅ bank_deposits table created');

    // Drawer Counts Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS drawer_counts (
        id SERIAL PRIMARY KEY,
        drawer_id VARCHAR(255) NOT NULL,
        drawer_name VARCHAR(255) NOT NULL,
        count_type VARCHAR(20) CHECK (count_type IN ('opening', 'closing')) DEFAULT 'opening',
        denominations TEXT NOT NULL, -- JSON object of denomination counts
        cash_out TEXT NOT NULL, -- JSON object of cash out amounts
        total_cash DECIMAL(10,2) NOT NULL DEFAULT 0,
        total_for_deposit DECIMAL(10,2) NOT NULL,
        sms_cash DECIMAL(10,2) DEFAULT 0, -- SMS cash collected (only for opening counts)
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        user_id VARCHAR(255) NOT NULL,
        user_name VARCHAR(255) NOT NULL
      )
    `);
    logger.info('✅ drawer_counts table created');

    // Drawer Settings Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS drawer_settings (
        id SERIAL PRIMARY KEY,
        drawer_name VARCHAR(255) NOT NULL UNIQUE,
        total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        show_detailed_calculations BOOLEAN NOT NULL DEFAULT false,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        user_id VARCHAR(255) NOT NULL,
        user_name VARCHAR(255) NOT NULL
      )
    `);
    logger.info('✅ drawer_settings table created');

    await db.end();
    logger.info('🎉 Production tables created successfully. Database connection closed.');
    logger.info('📋 Created tables:');
    logger.info('   - quick_checks (main inspection records)');
    logger.info('   - chat_conversations');
    logger.info('   - chat_messages');
    logger.info('   - state_inspection_records');
    logger.info('   - fleet_accounts');
    logger.info('   - bank_deposits');
    logger.info('   - drawer_counts');
    logger.info('   - drawer_settings');
    
  } catch (error) {
    logger.error('❌ Error creating production tables:', error);
    throw error;
  }
};

// Run the table creation if this script is executed directly
if (require.main === module) {
  createProductionTables().catch(console.error);
}

module.exports = { createProductionTables }; 