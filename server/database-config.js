// 🧠 Cursor: I'm now using PostgreSQL only (no SQLite) and deploying this backend to Render.
// Simplified database config to PostgreSQL only - removed all SQLite logic

const path = require('path');

class DatabaseConfig {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    // PostgreSQL only - no more SQLite support
    this.databaseType = 'postgresql';
    this.databaseUrl = process.env.DATABASE_URL || 'postgresql://localhost:5432/inspectionapp';
    
    // Log the database configuration
    console.log(`Database Config: Environment=${process.env.NODE_ENV}, Type=${this.databaseType}, Production=${this.isProduction}`);
    console.log(`Database URL: ${this.databaseUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`); // Hide credentials in logs
  }

  async getConnection() {
    return this.getPostgreSQLConnection();
  }

  async getPostgreSQLConnection() {
    try {
      const { Pool } = require('pg');
      
      const pool = new Pool({
        connectionString: this.databaseUrl,
        ssl: this.isProduction ? { rejectUnauthorized: false } : false
      });

      // Test the connection to ensure it's working
      pool.on('error', (err) => {
        console.error('PostgreSQL pool error:', err);
      });

      // Test the connection with a simple query to verify it works
      try {
        const testResult = await pool.query('SELECT NOW() as current_time');
        console.log('✅ PostgreSQL connection test successful:', testResult.rows[0]);
      } catch (testError) {
        console.error('❌ PostgreSQL connection test failed:', testError);
        throw testError;
      }

      console.log('✅ Connected to PostgreSQL database');
      return pool;
    } catch (error) {
      console.error('❌ PostgreSQL connection failed:', error);
      throw error;
    }
  }

  // Utility method to execute queries with PostgreSQL syntax
  async executeQuery(db, query, params = []) {
    try {
      const result = await db.query(query, params);
      return result.rows || result;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }
}

module.exports = DatabaseConfig; 