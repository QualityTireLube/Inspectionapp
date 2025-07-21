const logger = require('./logger');

class DatabaseWrapper {
  constructor(db, dbConfig) {
    this.db = db;
    this.dbConfig = dbConfig;
    this.isPostgreSQL = dbConfig.databaseType === 'postgresql';
    
    // Debug logging
    if (this.isPostgreSQL) {
      logger.info('DatabaseWrapper initialized for PostgreSQL');
      logger.info('Database object type:', typeof this.db);
      logger.info('Database query method available:', typeof this.db?.query);
    }
  }

  // SQLite-like run method for both databases
  run(query, params = [], callback = () => {}) {
    // Handle the case where params is actually the callback (SQLite style)
    if (typeof params === 'function' && !callback) {
      callback = params;
      params = [];
    }

    if (this.isPostgreSQL) {
      // Validate database connection
      if (!this.db || typeof this.db.query !== 'function') {
        logger.error('PostgreSQL database connection not available or missing query method');
        logger.error('Database object:', this.db);
        const error = new Error('Database connection not available');
        callback(error);
        return;
      }

      // Convert SQLite syntax to PostgreSQL
      const pgQuery = this.convertSQLiteToPostgreSQL(query);
      logger.info('Executing PostgreSQL query:', pgQuery);
      
      try {
        const queryResult = this.db.query(pgQuery, params);
        
        // Check if query returns a Promise
        if (!queryResult || typeof queryResult.then !== 'function') {
          logger.error('Database query did not return a Promise');
          logger.error('Query result type:', typeof queryResult);
          logger.error('Query result:', queryResult);
          const error = new Error('Database query failed - no Promise returned');
          callback(error);
          return;
        }

        queryResult
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
      } catch (syncError) {
        logger.error('Synchronous error in database query:', syncError);
        callback(syncError);
      }
    } else {
      // Use SQLite's native run method
      this.db.run(query, params, callback);
    }
  }

  // SQLite-like all method for both databases
  all(query, params = [], callback = () => {}) {
    // Handle the case where params is actually the callback (SQLite style)
    if (typeof params === 'function' && !callback) {
      callback = params;
      params = [];
    }

    if (this.isPostgreSQL) {
      if (!this.db || typeof this.db.query !== 'function') {
        logger.error('PostgreSQL database connection not available for all() method');
        callback(new Error('Database connection not available'), []);
        return;
      }

      const pgQuery = this.convertSQLiteToPostgreSQL(query);
      
      try {
        const queryResult = this.db.query(pgQuery, params);
        
        if (!queryResult || typeof queryResult.then !== 'function') {
          logger.error('Database query did not return a Promise in all() method');
          callback(new Error('Database query failed'), []);
          return;
        }

        queryResult
          .then(result => {
            callback(null, result.rows || []);
          })
          .catch(err => {
            logger.error('Database all error:', err);
            callback(err, []);
          });
      } catch (syncError) {
        logger.error('Synchronous error in database all query:', syncError);
        callback(syncError, []);
      }
    } else {
      // Use SQLite's native all method
      this.db.all(query, params, callback);
    }
  }

  // SQLite-like get method for both databases
  get(query, params = [], callback = () => {}) {
    // Handle the case where params is actually the callback (SQLite style)
    if (typeof params === 'function' && !callback) {
      callback = params;
      params = [];
    }

    if (this.isPostgreSQL) {
      if (!this.db || typeof this.db.query !== 'function') {
        logger.error('PostgreSQL database connection not available for get() method');
        callback(new Error('Database connection not available'), null);
        return;
      }

      const pgQuery = this.convertSQLiteToPostgreSQL(query);
      
      try {
        const queryResult = this.db.query(pgQuery, params);
        
        if (!queryResult || typeof queryResult.then !== 'function') {
          logger.error('Database query did not return a Promise in get() method');
          callback(new Error('Database query failed'), null);
          return;
        }

        queryResult
          .then(result => {
            const row = result.rows && result.rows[0] ? result.rows[0] : null;
            callback(null, row);
          })
          .catch(err => {
            logger.error('Database get error:', err);
            callback(err, null);
          });
      } catch (syncError) {
        logger.error('Synchronous error in database get query:', syncError);
        callback(syncError, null);
      }
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
      .replace(/\bDATETIME\b/g, 'TIMESTAMP')
      
      // Handle SQLite datetime functions for PostgreSQL
      .replace(/datetime\('now'\)/g, 'NOW()')
      .replace(/datetime\('now', 'localtime'\)/g, 'NOW()');

    // Convert SQLite parameter placeholders (?) to PostgreSQL ($1, $2, etc.)
    let paramIndex = 1;
    pgQuery = pgQuery.replace(/\?/g, () => `$${paramIndex++}`);

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
      if (this.db && typeof this.db.end === 'function') {
        this.db.end().then(() => callback()).catch(callback);
      } else {
        callback();
      }
    } else {
      this.db.close(callback);
    }
  }
}

module.exports = DatabaseWrapper; 