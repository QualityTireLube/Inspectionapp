// 🧠 Cursor: I'm deploying this backend to Render using PostgreSQL, not SQLite.
// Removed hardcoded sqlite3 references and using database abstraction instead
// This now supports both SQLite (dev) and PostgreSQL (production) via database-config.js

const logger = require('./logger');
const DatabaseConfig = require('./database-config');

class DynamicApiRoutes {
  constructor() {
    this.dbConfig = new DatabaseConfig();
    this.isProduction = process.env.NODE_ENV === 'production';
    this.isPostgreSQL = this.dbConfig.databaseType === 'postgresql';
    
    // Cache table schemas for better performance
    this.tableSchemas = new Map();
    
    // Initialize database connection and load schemas
    this.initialize();
  }

  async initialize() {
    try {
      await this.initializeDatabase();
      await this.loadTableSchemas();
    } catch (error) {
      logger.error('Failed to initialize Dynamic API:', error);
    }
  }

  async initializeDatabase() {
    try {
      if (this.isPostgreSQL) {
        this.db = await this.dbConfig.getPostgreSQLConnection();
        logger.info('✅ Dynamic API connected to PostgreSQL');
      } else {
        this.db = this.dbConfig.getSQLiteConnection();
        logger.info('✅ Dynamic API connected to SQLite');
      }
    } catch (error) {
      logger.error('❌ Dynamic API DB connection failed:', error);
      throw error;
    }
  }

  /**
   * Execute database query with proper syntax for SQLite/PostgreSQL
   */
  async executeQuery(query, params = []) {
    try {
      if (this.isPostgreSQL) {
        // PostgreSQL - convert SQLite syntax and use async/await
        const pgQuery = this.convertSQLiteToPostgreSQL(query);
        const result = await this.db.query(pgQuery, params);
        return result.rows || result;
      } else {
        // SQLite - use promise wrapper
        return new Promise((resolve, reject) => {
          if (query.trim().toLowerCase().startsWith('select')) {
            this.db.all(query, params, (err, rows) => {
              if (err) reject(err);
              else resolve(rows);
            });
          } else {
            this.db.run(query, params, function(err) {
              if (err) reject(err);
              else resolve({ lastID: this.lastID, changes: this.changes });
            });
          }
        });
      }
    } catch (error) {
      logger.error('Database query error:', error);
      throw error;
    }
  }

  /**
   * Convert SQLite syntax to PostgreSQL
   */
  convertSQLiteToPostgreSQL(query) {
    return query
      // Convert SQLite system tables to PostgreSQL information_schema
      .replace(/sqlite_master/g, 'information_schema.tables')
      .replace(/name FROM information_schema\.tables WHERE type='table'/g, 'table_name FROM information_schema.tables WHERE table_schema = \'public\'')
      .replace(/AND name NOT LIKE 'sqlite_%'/g, 'AND table_name NOT LIKE \'pg_%\' AND table_name NOT LIKE \'information_schema%\'')
      // Convert PRAGMA table_info to PostgreSQL equivalent
      .replace(/PRAGMA table_info\(([^)]+)\)/g, 
        `SELECT column_name as name, data_type as type, 
         CASE WHEN is_nullable = 'NO' THEN 1 ELSE 0 END as notnull,
         CASE WHEN column_default LIKE 'nextval%' THEN 1 ELSE 0 END as pk
         FROM information_schema.columns WHERE table_name = $1`)
      // Convert LIMIT/OFFSET syntax (PostgreSQL supports this but let's be explicit)
      .replace(/LIMIT (\?) OFFSET (\?)/g, 'LIMIT $1 OFFSET $2')
      // Convert parameter placeholders from ? to $1, $2, etc.
      .replace(/\?/g, (match, offset, string) => {
        const questionMarks = string.substring(0, offset).match(/\?/g) || [];
        return `$${questionMarks.length + 1}`;
      });
  }

  /**
   * Load and cache all table schemas from the database
   */
  async loadTableSchemas() {
    try {
      let tables;
      
      if (this.isPostgreSQL) {
        // PostgreSQL: Get tables from information_schema
        const result = await this.executeQuery(`
          SELECT table_name as name FROM information_schema.tables 
          WHERE table_schema = 'public'
          AND table_name NOT LIKE 'pg_%' 
          AND table_name NOT LIKE 'information_schema%'
        `);
        tables = result;
      } else {
        // SQLite: Get tables from sqlite_master
        tables = await this.executeQuery(`
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name NOT LIKE 'sqlite_%'
        `);
      }

      const promises = tables.map(table => this.getTableSchema(table.name || table.table_name));
      await Promise.all(promises);
      
      logger.info(`✅ Loaded schemas for ${this.tableSchemas.size} tables`);
    } catch (error) {
      logger.error('Error loading table schemas:', error);
    }
  }

  /**
   * Get schema information for a specific table
   */
  async getTableSchema(tableName) {
    try {
      let columns;
      
      if (this.isPostgreSQL) {
        // PostgreSQL: Get column information from information_schema
        columns = await this.executeQuery(`
          SELECT 
            column_name as name,
            data_type as type,
            CASE WHEN is_nullable = 'NO' THEN 1 ELSE 0 END as notnull,
            CASE WHEN column_default LIKE 'nextval%' THEN 1 ELSE 0 END as pk
          FROM information_schema.columns 
          WHERE table_name = $1
          ORDER BY ordinal_position
        `, [tableName]);
      } else {
        // SQLite: Use PRAGMA table_info
        columns = await this.executeQuery(`PRAGMA table_info(${tableName})`);
      }

      const schema = {
        columns: columns.map(col => ({
          name: col.name,
          type: col.type,
          notNull: col.notnull === 1,
          primaryKey: col.pk === 1
        })),
        dateColumns: columns
          .filter(col => 
            col.type.toLowerCase().includes('date') || 
            col.type.toLowerCase().includes('time') ||
            col.type.toLowerCase().includes('timestamp') ||
            col.name.toLowerCase().includes('date') ||
            col.name.toLowerCase().includes('time') ||
            col.name.toLowerCase().includes('created') ||
            col.name.toLowerCase().includes('updated')
          )
          .map(col => col.name),
        searchableColumns: columns
          .filter(col => 
            col.type.toLowerCase().includes('text') || 
            col.type.toLowerCase().includes('varchar') ||
            col.type.toLowerCase().includes('character') ||
            col.name.toLowerCase().includes('name') ||
            col.name.toLowerCase().includes('vin') ||
            col.name.toLowerCase().includes('email') ||
            col.name.toLowerCase().includes('title') ||
            col.name.toLowerCase().includes('description')
          )
          .map(col => col.name)
      };

      this.tableSchemas.set(tableName, schema);
      return schema;
    } catch (error) {
      logger.error(`Error getting schema for table ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Get list of all available tables
   */
  async getAllTables() {
    try {
      let tables;
      
      if (this.isPostgreSQL) {
        const result = await this.executeQuery(`
          SELECT table_name as name FROM information_schema.tables 
          WHERE table_schema = 'public'
          AND table_name NOT LIKE 'pg_%' 
          AND table_name NOT LIKE 'information_schema%'
          ORDER BY table_name
        `);
        tables = result.map(t => t.name);
      } else {
        const result = await this.executeQuery(`
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name NOT LIKE 'sqlite_%'
          ORDER BY name
        `);
        tables = result.map(t => t.name);
      }
      
      return tables;
    } catch (error) {
      logger.error('Error getting tables:', error);
      throw error;
    }
  }

  /**
   * Get paginated and filtered data from any table
   */
  async getTableData(tableName, options = {}) {
    const {
      page = 1,
      limit = 50,
      search = '',
      sortBy = null,
      sortOrder = 'DESC'
    } = options;

    // Validate table exists
    const schema = this.tableSchemas.get(tableName);
    if (!schema) {
      throw new Error(`Table ${tableName} not found`);
    }

    // Calculate offset
    const offset = (page - 1) * limit;

    // Determine sort column (prefer date columns, then primary key, then first column)
    let sortColumn = sortBy;
    if (!sortColumn) {
      if (schema.dateColumns.length > 0) {
        // Prefer created_at, then updated_at, then any date column
        sortColumn = schema.dateColumns.find(col => col.includes('created')) ||
                    schema.dateColumns.find(col => col.includes('updated')) ||
                    schema.dateColumns[0];
      } else {
        // Fallback to primary key or first column
        const pkColumn = schema.columns.find(col => col.primaryKey);
        sortColumn = pkColumn ? pkColumn.name : schema.columns[0].name;
      }
    }

    // Build search condition
    let searchCondition = '';
    let searchParams = [];
    if (search && schema.searchableColumns.length > 0) {
      const searchTerms = search.split(' ').filter(term => term.trim());
      if (searchTerms.length > 0) {
        if (this.isPostgreSQL) {
          // PostgreSQL: Use ILIKE and proper parameter numbering
          const conditions = schema.searchableColumns.map((col, colIndex) => 
            searchTerms.map((term, termIndex) => {
              const paramIndex = searchParams.length + 1;
              searchParams.push(`%${term}%`);
              return `${col} ILIKE $${paramIndex}`;
            }).join(' AND ')
          ).join(' OR ');
          searchCondition = `WHERE (${conditions})`;
        } else {
          // SQLite: Use LIKE
          const conditions = schema.searchableColumns.map(col => 
            searchTerms.map(() => `${col} LIKE ?`).join(' AND ')
          ).join(' OR ');
          searchCondition = `WHERE (${conditions})`;
          
          // Add search parameters for each term and each searchable column
          schema.searchableColumns.forEach(() => {
            searchTerms.forEach(term => {
              searchParams.push(`%${term}%`);
            });
          });
        }
      }
    }

    try {
      // Build queries with proper parameter syntax
      let mainQuery, countQuery;
      let mainParams, countParams;
      
      if (this.isPostgreSQL) {
        // PostgreSQL parameter syntax
        const limitParam = searchParams.length + 1;
        const offsetParam = searchParams.length + 2;
        
        mainQuery = `
          SELECT * FROM ${tableName}
          ${searchCondition}
          ORDER BY ${sortColumn} ${sortOrder}
          LIMIT $${limitParam} OFFSET $${offsetParam}
        `;
        
        countQuery = `
          SELECT COUNT(*) as total FROM ${tableName}
          ${searchCondition}
        `;
        
        mainParams = [...searchParams, limit, offset];
        countParams = [...searchParams];
      } else {
        // SQLite parameter syntax
        mainQuery = `
          SELECT * FROM ${tableName}
          ${searchCondition}
          ORDER BY ${sortColumn} ${sortOrder}
          LIMIT ? OFFSET ?
        `;
        
        countQuery = `
          SELECT COUNT(*) as total FROM ${tableName}
          ${searchCondition}
        `;
        
        mainParams = [...searchParams, limit, offset];
        countParams = [...searchParams];
      }

      // Execute both queries
      const [data, countResult] = await Promise.all([
        this.executeQuery(mainQuery, mainParams),
        this.executeQuery(countQuery, countParams)
      ]);

      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);

      return {
        data,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        },
        meta: {
          tableName,
          schema: {
            columns: schema.columns,
            searchableColumns: schema.searchableColumns,
            dateColumns: schema.dateColumns
          },
          sortedBy: sortColumn,
          sortOrder,
          searchTerm: search
        }
      };
    } catch (error) {
      logger.error(`Error querying table ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Create a new record in the specified table
   */
  async createRecord(tableName, data) {
    const schema = this.tableSchemas.get(tableName);
    if (!schema) {
      throw new Error(`Table ${tableName} not found`);
    }

    const columns = Object.keys(data);
    const values = Object.values(data);
    
    let query;
    if (this.isPostgreSQL) {
      const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
      query = `
        INSERT INTO ${tableName} (${columns.join(', ')})
        VALUES (${placeholders})
        RETURNING id
      `;
    } else {
      const placeholders = columns.map(() => '?').join(', ');
      query = `
        INSERT INTO ${tableName} (${columns.join(', ')})
        VALUES (${placeholders})
      `;
    }

    try {
      const result = await this.executeQuery(query, values);
      
      if (this.isPostgreSQL) {
        return { id: result[0].id, changes: 1 };
      } else {
        return { id: result.lastID, changes: result.changes };
      }
    } catch (error) {
      logger.error(`Error creating record in ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Update a record in the specified table
   */
  async updateRecord(tableName, id, data) {
    const schema = this.tableSchemas.get(tableName);
    if (!schema) {
      throw new Error(`Table ${tableName} not found`);
    }

    const columns = Object.keys(data);
    const values = Object.values(data);
    
    let query;
    if (this.isPostgreSQL) {
      const updates = columns.map((key, index) => `${key} = $${index + 1}`).join(', ');
      query = `UPDATE ${tableName} SET ${updates} WHERE id = $${columns.length + 1}`;
    } else {
      const updates = columns.map(key => `${key} = ?`).join(', ');
      query = `UPDATE ${tableName} SET ${updates} WHERE id = ?`;
    }

    try {
      const result = await this.executeQuery(query, [...values, id]);
      
      if (this.isPostgreSQL) {
        return { changes: result.rowCount || 0 };
      } else {
        return { changes: result.changes };
      }
    } catch (error) {
      logger.error(`Error updating record in ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Delete a record from the specified table
   */
  async deleteRecord(tableName, id) {
    const schema = this.tableSchemas.get(tableName);
    if (!schema) {
      throw new Error(`Table ${tableName} not found`);
    }

    const query = this.isPostgreSQL 
      ? `DELETE FROM ${tableName} WHERE id = $1`
      : `DELETE FROM ${tableName} WHERE id = ?`;

    try {
      const result = await this.executeQuery(query, [id]);
      
      if (this.isPostgreSQL) {
        return { changes: result.rowCount || 0 };
      } else {
        return { changes: result.changes };
      }
    } catch (error) {
      logger.error(`Error deleting record from ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Get a single record by ID
   */
  async getRecord(tableName, id) {
    const schema = this.tableSchemas.get(tableName);
    if (!schema) {
      throw new Error(`Table ${tableName} not found`);
    }

    const query = this.isPostgreSQL
      ? `SELECT * FROM ${tableName} WHERE id = $1`
      : `SELECT * FROM ${tableName} WHERE id = ?`;

    try {
      const result = await this.executeQuery(query, [id]);
      return result[0] || null;
    } catch (error) {
      logger.error(`Error getting record from ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Set up Express routes for the dynamic API
   */
  setupRoutes(app, authenticateToken = null) {
    const authMiddleware = authenticateToken || ((req, res, next) => next());

    // Get list of all tables
    app.get('/api/tables', authMiddleware, async (req, res) => {
      try {
        const tables = await this.getAllTables();
        res.json({
          tables,
          count: tables.length,
          database: this.isPostgreSQL ? 'PostgreSQL' : 'SQLite'
        });
      } catch (error) {
        logger.error('Error getting tables:', error);
        res.status(500).json({ error: 'Failed to get tables' });
      }
    });

    // Get table schema
    app.get('/api/tables/:tableName/schema', authMiddleware, async (req, res) => {
      try {
        const { tableName } = req.params;
        const schema = this.tableSchemas.get(tableName);
        
        if (!schema) {
          return res.status(404).json({ error: 'Table not found' });
        }

        res.json({
          ...schema,
          database: this.isPostgreSQL ? 'PostgreSQL' : 'SQLite'
        });
      } catch (error) {
        logger.error('Error getting table schema:', error);
        res.status(500).json({ error: 'Failed to get table schema' });
      }
    });

    // Get paginated data from any table
    app.get('/api/:tableName', authMiddleware, async (req, res) => {
      try {
        const { tableName } = req.params;
        const { page, limit, search, sortBy, sortOrder } = req.query;

        const result = await this.getTableData(tableName, {
          page: parseInt(page) || 1,
          limit: Math.min(parseInt(limit) || 50, 1000), // Cap at 1000 for performance
          search: search || '',
          sortBy,
          sortOrder: sortOrder === 'ASC' ? 'ASC' : 'DESC'
        });

        res.json(result);
      } catch (error) {
        if (error.message.includes('not found')) {
          res.status(404).json({ error: error.message });
        } else {
          logger.error('Error getting table data:', error);
          res.status(500).json({ error: 'Failed to get table data' });
        }
      }
    });

    // Get single record by ID
    app.get('/api/:tableName/:id', authMiddleware, async (req, res) => {
      try {
        const { tableName, id } = req.params;
        const record = await this.getRecord(tableName, id);
        
        if (!record) {
          return res.status(404).json({ error: 'Record not found' });
        }

        res.json(record);
      } catch (error) {
        logger.error('Error getting record:', error);
        res.status(500).json({ error: 'Failed to get record' });
      }
    });

    // Create new record
    app.post('/api/:tableName', authMiddleware, async (req, res) => {
      try {
        const { tableName } = req.params;
        const result = await this.createRecord(tableName, req.body);
        res.status(201).json(result);
      } catch (error) {
        logger.error('Error creating record:', error);
        res.status(500).json({ error: 'Failed to create record' });
      }
    });

    // Update record
    app.put('/api/:tableName/:id', authMiddleware, async (req, res) => {
      try {
        const { tableName, id } = req.params;
        const result = await this.updateRecord(tableName, id, req.body);
        
        if (result.changes === 0) {
          return res.status(404).json({ error: 'Record not found' });
        }

        res.json(result);
      } catch (error) {
        logger.error('Error updating record:', error);
        res.status(500).json({ error: 'Failed to update record' });
      }
    });

    // Delete record
    app.delete('/api/:tableName/:id', authMiddleware, async (req, res) => {
      try {
        const { tableName, id } = req.params;
        const result = await this.deleteRecord(tableName, id);
        
        if (result.changes === 0) {
          return res.status(404).json({ error: 'Record not found' });
        }

        res.json({ message: 'Record deleted successfully' });
      } catch (error) {
        logger.error('Error deleting record:', error);
        res.status(500).json({ error: 'Failed to delete record' });
      }
    });

    logger.info('✅ Dynamic API routes configured');
  }
}

module.exports = DynamicApiRoutes; 