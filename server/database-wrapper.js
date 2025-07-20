const logger = require('./logger');

class DatabaseWrapper {
  constructor(db, dbConfig) {
    this.db = db;
    this.dbConfig = dbConfig;
    this.isPostgreSQL = dbConfig.databaseType === 'postgresql';
  }

  // SQLite-like run method for both databases
  run(query, params = [], callback = () => {}) {
    if (this.isPostgreSQL) {
      // Convert SQLite syntax to PostgreSQL
      const pgQuery = this.convertSQLiteToPostgreSQL(query);
      
      this.db.query(pgQuery, params)
        .then(result => {
          // Mimic SQLite's callback signature
          const mockThis = {
            lastID: result.insertId || (result.rows && result.rows[0] && result.rows[0].id) || undefined,
            changes: result.rowCount || 0
          };
          callback.call(mockThis, null);
        })
        .catch(err => {
          logger.error('Database run error:', err);
          callback(err);
        });
    } else {
      // Use SQLite's native run method
      this.db.run(query, params, callback);
    }
  }

  // SQLite-like all method for both databases
  all(query, params = [], callback = () => {}) {
    if (this.isPostgreSQL) {
      const pgQuery = this.convertSQLiteToPostgreSQL(query);
      
      this.db.query(pgQuery, params)
        .then(result => {
          callback(null, result.rows || []);
        })
        .catch(err => {
          logger.error('Database all error:', err);
          callback(err, []);
        });
    } else {
      // Use SQLite's native all method
      this.db.all(query, params, callback);
    }
  }

  // SQLite-like get method for both databases
  get(query, params = [], callback = () => {}) {
    if (this.isPostgreSQL) {
      const pgQuery = this.convertSQLiteToPostgreSQL(query);
      
      this.db.query(pgQuery, params)
        .then(result => {
          const row = result.rows && result.rows[0] ? result.rows[0] : null;
          callback(null, row);
        })
        .catch(err => {
          logger.error('Database get error:', err);
          callback(err, null);
        });
    } else {
      // Use SQLite's native get method
      this.db.get(query, params, callback);
    }
  }

  // Convert SQLite-specific syntax to PostgreSQL
  convertSQLiteToPostgreSQL(query) {
    let pgQuery = query
      // Handle table creation
      .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'SERIAL PRIMARY KEY')
      .replace(/DATETIME DEFAULT CURRENT_TIMESTAMP/g, 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')
      .replace(/TEXT/g, 'TEXT') // Keep TEXT as TEXT in PostgreSQL
      .replace(/REAL/g, 'DECIMAL')
      
      // Handle PRAGMA queries (SQLite-specific, convert to PostgreSQL equivalents)
      .replace(/PRAGMA table_info\('([^']+)'\)/g, 
        "SELECT column_name as name FROM information_schema.columns WHERE table_name = '$1'")
      
      // Handle IF NOT EXISTS for columns (not directly supported in PostgreSQL)
      .replace(/ADD COLUMN IF NOT EXISTS/g, 'ADD COLUMN')
      
      // Handle some SQLite functions that need PostgreSQL equivalents
      .replace(/datetime\(/g, 'to_timestamp(')
      .replace(/\bDATETIME\b/g, 'TIMESTAMP');

    // Special handling for ALTER TABLE ADD COLUMN (PostgreSQL doesn't support IF NOT EXISTS)
    if (pgQuery.includes('ALTER TABLE') && pgQuery.includes('ADD COLUMN')) {
      // For production, we'll assume columns don't exist and let PostgreSQL handle the error
      // In a full migration, you'd want to check if columns exist first
    }

    return pgQuery;
  }

  // Method to close connection (for cleanup)
  close(callback = () => {}) {
    if (this.isPostgreSQL) {
      this.db.end().then(() => callback()).catch(callback);
    } else {
      this.db.close(callback);
    }
  }
}

module.exports = DatabaseWrapper; 