const sqlite3 = require('sqlite3').verbose();
const logger = require('./logger');

class DynamicApiRoutes {
  constructor(dbPath = './database.sqlite') {
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        logger.error('❌ Dynamic API DB error:', err);
      } else {
        logger.info('✅ Dynamic API connected to SQLite');
      }
    });
    
    // Cache table schemas for better performance
    this.tableSchemas = new Map();
    this.loadTableSchemas();
  }

  /**
   * Load and cache all table schemas from the database
   */
  async loadTableSchemas() {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `, (err, tables) => {
        if (err) {
          logger.error('Error loading table schemas:', err);
          return reject(err);
        }

        const promises = tables.map(table => this.getTableSchema(table.name));
        Promise.all(promises)
          .then(() => {
            logger.info(`✅ Loaded schemas for ${this.tableSchemas.size} tables`);
            resolve();
          })
          .catch(reject);
      });
    });
  }

  /**
   * Get schema information for a specific table
   */
  async getTableSchema(tableName) {
    return new Promise((resolve, reject) => {
      this.db.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
        if (err) {
          logger.error(`Error getting schema for table ${tableName}:`, err);
          return reject(err);
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
              col.name.toLowerCase().includes('name') ||
              col.name.toLowerCase().includes('vin') ||
              col.name.toLowerCase().includes('email') ||
              col.name.toLowerCase().includes('title') ||
              col.name.toLowerCase().includes('description')
            )
            .map(col => col.name)
        };

        this.tableSchemas.set(tableName, schema);
        resolve(schema);
      });
    });
  }

  /**
   * Get list of all available tables
   */
  async getAllTables() {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `, (err, tables) => {
        if (err) {
          logger.error('Error getting tables:', err);
          return reject(err);
        }
        resolve(tables.map(t => t.name));
      });
    });
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

    // Build the main query
    const mainQuery = `
      SELECT * FROM ${tableName}
      ${searchCondition}
      ORDER BY ${sortColumn} ${sortOrder}
      LIMIT ? OFFSET ?
    `;

    // Build the count query
    const countQuery = `
      SELECT COUNT(*) as total FROM ${tableName}
      ${searchCondition}
    `;

    try {
      // Execute both queries in parallel
      const [data, countResult] = await Promise.all([
        new Promise((resolve, reject) => {
          this.db.all(mainQuery, [...searchParams, limit, offset], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        }),
        new Promise((resolve, reject) => {
          this.db.get(countQuery, searchParams, (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        })
      ]);

      const total = countResult.total;
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
    const placeholders = columns.map(() => '?').join(', ');

    const query = `
      INSERT INTO ${tableName} (${columns.join(', ')})
      VALUES (${placeholders})
    `;

    return new Promise((resolve, reject) => {
      this.db.run(query, values, function(err) {
        if (err) {
          logger.error(`Error creating record in ${tableName}:`, err);
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  /**
   * Update a record in the specified table
   */
  async updateRecord(tableName, id, data) {
    const schema = this.tableSchemas.get(tableName);
    if (!schema) {
      throw new Error(`Table ${tableName} not found`);
    }

    const updates = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(data), id];

    const query = `UPDATE ${tableName} SET ${updates} WHERE id = ?`;

    return new Promise((resolve, reject) => {
      this.db.run(query, values, function(err) {
        if (err) {
          logger.error(`Error updating record in ${tableName}:`, err);
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }

  /**
   * Delete a record from the specified table
   */
  async deleteRecord(tableName, id) {
    const schema = this.tableSchemas.get(tableName);
    if (!schema) {
      throw new Error(`Table ${tableName} not found`);
    }

    const query = `DELETE FROM ${tableName} WHERE id = ?`;

    return new Promise((resolve, reject) => {
      this.db.run(query, [id], function(err) {
        if (err) {
          logger.error(`Error deleting record from ${tableName}:`, err);
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }

  /**
   * Get a single record by ID
   */
  async getRecord(tableName, id) {
    const schema = this.tableSchemas.get(tableName);
    if (!schema) {
      throw new Error(`Table ${tableName} not found`);
    }

    const query = `SELECT * FROM ${tableName} WHERE id = ?`;

    return new Promise((resolve, reject) => {
      this.db.get(query, [id], (err, row) => {
        if (err) {
          logger.error(`Error getting record from ${tableName}:`, err);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
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
          count: tables.length
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

        res.json(schema);
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