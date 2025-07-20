const path = require('path');

class DatabaseConfig {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.databaseType = process.env.DATABASE_TYPE || (this.isProduction ? 'postgresql' : 'sqlite');
    this.databaseUrl = process.env.DATABASE_URL || './database.sqlite';
  }

  getConnection() {
    if (this.databaseType === 'sqlite') {
      return this.getSQLiteConnection();
    } else if (this.databaseType === 'postgresql') {
      return this.getPostgreSQLConnection();
    }
    throw new Error(`Unsupported database type: ${this.databaseType}`);
  }

  getSQLiteConnection() {
    try {
      const sqlite3 = require('sqlite3').verbose();
      const dbPath = path.resolve(this.databaseUrl);
      return new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Error opening SQLite database:', err.message);
        } else {
          console.log('Connected to SQLite database');
        }
      });
    } catch (error) {
      console.error('SQLite3 package not available. Using PostgreSQL instead.');
      this.databaseType = 'postgresql';
      return this.getPostgreSQLConnection();
    }
  }

  getPostgreSQLConnection() {
    // For PostgreSQL, you'll need to install 'pg' package
    // npm install pg
    try {
      const { Pool } = require('pg');
      
      const pool = new Pool({
        connectionString: this.databaseUrl,
        ssl: this.isProduction ? { rejectUnauthorized: false } : false
      });

      console.log('Connected to PostgreSQL database');
      return pool;
    } catch (error) {
      console.error('PostgreSQL package not installed. Run: npm install pg');
      throw error;
    }
  }

  // Utility method to execute queries with proper syntax for each database type
  executeQuery(db, query, params = []) {
    return new Promise((resolve, reject) => {
      if (this.databaseType === 'sqlite') {
        if (query.includes('SELECT')) {
          db.all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        } else {
          db.run(query, params, function(err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
          });
        }
      } else if (this.databaseType === 'postgresql') {
        // Convert SQLite syntax to PostgreSQL syntax
        const pgQuery = this.convertSQLiteToPostgreSQL(query);
        db.query(pgQuery, params)
          .then(result => resolve(result.rows || result))
          .catch(reject);
      }
    });
  }

  // Convert SQLite-specific syntax to PostgreSQL
  convertSQLiteToPostgreSQL(query) {
    return query
      .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'SERIAL PRIMARY KEY')
      .replace(/DATETIME DEFAULT CURRENT_TIMESTAMP/g, 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')
      .replace(/TEXT/g, 'VARCHAR')
      .replace(/REAL/g, 'DECIMAL');
  }

  // Migration helper - exports SQLite data for PostgreSQL import
  async exportSQLiteData() {
    if (this.databaseType !== 'sqlite') {
      throw new Error('Export only available for SQLite databases');
    }

    const db = this.getSQLiteConnection();
    const tables = ['users', 'quick_checks', 'cash_management', 'state_inspections', 'labels'];
    const exportData = {};

    for (const table of tables) {
      try {
        const data = await this.executeQuery(db, `SELECT * FROM ${table}`);
        exportData[table] = data;
      } catch (error) {
        console.log(`Table ${table} does not exist, skipping...`);
        exportData[table] = [];
      }
    }

    db.close();
    return exportData;
  }
}

module.exports = DatabaseConfig; 