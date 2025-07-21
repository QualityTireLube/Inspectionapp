// 🧠 Cursor: I'm now using PostgreSQL only (no SQLite) and deploying this backend to Render.
// Simplified dynamic API to use PostgreSQL exclusively - removed all SQLite logic

const logger = require('./logger');
const DatabaseConfig = require('./database-config');

class DynamicApiRoutes {
  constructor() {
    this.dbConfig = new DatabaseConfig();
    
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
      this.db = await this.dbConfig.getPostgreSQLConnection();
      logger.info('✅ Dynamic API connected to PostgreSQL');
    } catch (error) {
      logger.error('❌ Dynamic API DB connection failed:', error);
      throw error;
    }
  }

  /**
   * Execute PostgreSQL database query
   */
  async executeQuery(query, params = []) {
    try {
      const result = await this.db.query(query, params);
      return result.rows || result;
    } catch (error) {
      logger.error('Database query error:', error);
      throw error;
    }
  }

  /**
   * Load and cache all table schemas from PostgreSQL
   */
  async loadTableSchemas() {
    try {
      // PostgreSQL: Get tables from information_schema
      const tables = await this.executeQuery(`
        SELECT table_name as name FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name NOT LIKE 'pg_%' 
        AND table_name NOT LIKE 'information_schema%'
      `);

      const promises = tables.map(table => this.getTableSchema(table.name));
      await Promise.all(promises);
      
      logger.info(`✅ Loaded schemas for ${this.tableSchemas.size} tables`);
    } catch (error) {
      logger.error('Error loading table schemas:', error);
    }
  }

  /**
   * Get schema information for a PostgreSQL table
   */
  async getTableSchema(tableName) {
    try {
      // PostgreSQL: Get column information from information_schema
      const columns = await this.executeQuery(`
        SELECT 
          column_name as name,
          data_type as type,
          CASE WHEN is_nullable = 'NO' THEN 1 ELSE 0 END as notnull,
          CASE WHEN column_default LIKE 'nextval%' THEN 1 ELSE 0 END as pk
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);

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
   * Get list of all available PostgreSQL tables
   */
  async getAllTables() {
    try {
      const result = await this.executeQuery(`
        SELECT table_name as name FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name NOT LIKE 'pg_%' 
        AND table_name NOT LIKE 'information_schema%'
        ORDER BY table_name
      `);
      return result.map(t => t.name);
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
        // PostgreSQL: Use ILIKE and proper parameter numbering
        const conditions = schema.searchableColumns.map((col, colIndex) => 
          searchTerms.map((term, termIndex) => {
            const paramIndex = searchParams.length + 1;
            searchParams.push(`%${term}%`);
            return `${col} ILIKE $${paramIndex}`;
          }).join(' AND ')
        ).join(' OR ');
        searchCondition = `WHERE (${conditions})`;
      }
    }

    try {
      // Build PostgreSQL queries with proper parameter syntax
      const limitParam = searchParams.length + 1;
      const offsetParam = searchParams.length + 2;
      
      const mainQuery = `
        SELECT * FROM ${tableName}
        ${searchCondition}
        ORDER BY ${sortColumn} ${sortOrder}
        LIMIT $${limitParam} OFFSET $${offsetParam}
      `;
      
      const countQuery = `
        SELECT COUNT(*) as total FROM ${tableName}
        ${searchCondition}
      `;
      
      const mainParams = [...searchParams, limit, offset];
      const countParams = [...searchParams];

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
    
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
    const query = `
      INSERT INTO ${tableName} (${columns.join(', ')})
      VALUES (${placeholders})
      RETURNING id
    `;

    try {
      const result = await this.executeQuery(query, values);
      return { id: result[0].id, changes: 1 };
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
    
    const updates = columns.map((key, index) => `${key} = $${index + 1}`).join(', ');
    const query = `UPDATE ${tableName} SET ${updates} WHERE id = $${columns.length + 1}`;

    try {
      const result = await this.executeQuery(query, [...values, id]);
      return { changes: result.rowCount || 0 };
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

    const query = `DELETE FROM ${tableName} WHERE id = $1`;

    try {
      const result = await this.executeQuery(query, [id]);
      return { changes: result.rowCount || 0 };
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

    const query = `SELECT * FROM ${tableName} WHERE id = $1`;

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
          database: 'PostgreSQL'
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
          database: 'PostgreSQL'
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