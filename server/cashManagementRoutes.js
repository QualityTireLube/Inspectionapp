const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');

const router = express.Router();

// Initialize cash management tables
const initializeCashManagementTables = (db) => {
  // Bank deposits table
  db.run(`
    CREATE TABLE IF NOT EXISTS bank_deposits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      total_cash REAL NOT NULL DEFAULT 0,
      total_checks REAL NOT NULL DEFAULT 0,
      images TEXT, -- JSON array of image filenames
      notes TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL
    )
  `, (err) => {
    if (err) {
      logger.error('Error creating bank_deposits table:', err);
    } else {
      logger.info('✅ Bank deposits table ready');
    }
  });

  // Drawer counts table
  db.run(`
    CREATE TABLE IF NOT EXISTS drawer_counts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      drawer_id TEXT NOT NULL,
      drawer_name TEXT NOT NULL,
      count_type TEXT NOT NULL DEFAULT 'opening',
      denominations TEXT NOT NULL, -- JSON object of denomination counts
      cash_out TEXT NOT NULL, -- JSON object of cash out amounts
      total_cash REAL NOT NULL,
      total_for_deposit REAL NOT NULL,
      sms_cash REAL, -- SMS cash collected (only for opening counts)
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL
    )
  `, (err) => {
    if (err) {
      logger.error('Error creating drawer_counts table:', err);
    } else {
      logger.info('✅ Drawer counts table ready');
      
      // Add the count_type column if it doesn't exist (migration)
      db.get("SELECT name FROM pragma_table_info('drawer_counts') WHERE name='count_type'", (err, row) => {
        if (err) {
          logger.error('Error checking for count_type column:', err);
          return;
        }
        
        if (!row) {
          logger.info('Adding count_type column to drawer_counts table...');
          db.run('ALTER TABLE drawer_counts ADD COLUMN count_type TEXT NOT NULL DEFAULT "opening"', (err) => {
            if (err) {
              logger.error('Error adding count_type column:', err);
            } else {
              logger.info('✅ Added count_type column');
            }
          });
        }
      });
      
      // Add the sms_cash column if it doesn't exist (migration)
      db.get("SELECT name FROM pragma_table_info('drawer_counts') WHERE name='sms_cash'", (err, row) => {
        if (err) {
          logger.error('Error checking for sms_cash column:', err);
          return;
        }
        
        if (!row) {
          logger.info('Adding sms_cash column to drawer_counts table...');
          db.run('ALTER TABLE drawer_counts ADD COLUMN sms_cash REAL', (err) => {
            if (err) {
              logger.error('Error adding sms_cash column:', err);
            } else {
              logger.info('✅ Added sms_cash column');
            }
          });
        }
      });
    }
  });

  // Drawer settings table
  db.run(`
    CREATE TABLE IF NOT EXISTS drawer_settings (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      target_denominations TEXT NOT NULL, -- JSON object
      total_amount REAL NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT 1,
      show_detailed_calculations BOOLEAN NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      logger.error('Error creating drawer_settings table:', err);
    } else {
      logger.info('✅ Drawer settings table ready');
      
      // Add the new column if it doesn't exist (migration)
      db.get("SELECT name FROM pragma_table_info('drawer_settings') WHERE name='show_detailed_calculations'", (err, row) => {
        if (err) {
          logger.error('Error checking for show_detailed_calculations column:', err);
          return;
        }
        
        if (!row) {
          logger.info('Adding show_detailed_calculations column to drawer_settings table...');
          db.run('ALTER TABLE drawer_settings ADD COLUMN show_detailed_calculations BOOLEAN NOT NULL DEFAULT 0', (err) => {
            if (err) {
              logger.error('Error adding show_detailed_calculations column:', err);
            } else {
              logger.info('✅ Added show_detailed_calculations column');
            }
          });
        }
      });
    }
  });
};

// File upload configuration for deposit images
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'deposit-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
});

// Helper function to get user info from request
const getUserInfo = (req) => {
  return {
    userId: req.user?.email || 'unknown',
    userName: req.user?.name || 'Unknown User'
  };
};

// Routes setup function
const setupCashManagementRoutes = (app, db, authenticateToken) => {
  // Initialize tables
  initializeCashManagementTables(db);

  // === Bank Deposits ===

  // Submit bank deposit
  router.post('/bank-deposits', authenticateToken, (req, res) => {
    const { totalCash, totalChecks, images, notes } = req.body;
    const { userId, userName } = getUserInfo(req);

    const query = `
      INSERT INTO bank_deposits (total_cash, total_checks, images, notes, user_id, user_name)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.run(query, [
      totalCash || 0,
      totalChecks || 0,
      JSON.stringify(images || []),
      notes || '',
      userId,
      userName
    ], function(err) {
      if (err) {
        logger.error('Error saving bank deposit:', err);
        return res.status(500).json({ error: 'Failed to save bank deposit' });
      }

      // Return the created deposit
      db.get('SELECT * FROM bank_deposits WHERE id = ?', [this.lastID], (err, row) => {
        if (err) {
          logger.error('Error retrieving saved deposit:', err);
          return res.status(500).json({ error: 'Failed to retrieve saved deposit' });
        }

        const deposit = {
          ...row,
          images: JSON.parse(row.images || '[]'),
          totalCash: row.total_cash,
          totalChecks: row.total_checks,
          userId: row.user_id,
          userName: row.user_name
        };

        res.json(deposit);
      });
    });
  });

  // Get bank deposits with filters
  router.get('/bank-deposits', authenticateToken, (req, res) => {
    const { drawerId, startDate, endDate, userId } = req.query;
    
    let query = 'SELECT * FROM bank_deposits WHERE 1=1';
    const params = [];

    if (startDate) {
      query += ' AND date(timestamp) >= date(?)';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND date(timestamp) <= date(?)';
      params.push(endDate);
    }

    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }

    query += ' ORDER BY timestamp DESC';

    db.all(query, params, (err, rows) => {
      if (err) {
        logger.error('Error retrieving bank deposits:', err);
        return res.status(500).json({ error: 'Failed to retrieve bank deposits' });
      }

      const deposits = rows.map(row => ({
        ...row,
        images: JSON.parse(row.images || '[]'),
        totalCash: row.total_cash,
        totalChecks: row.total_checks,
        userId: row.user_id,
        userName: row.user_name
      }));

      res.json(deposits);
    });
  });

  // Get specific bank deposit
  router.get('/bank-deposits/:id', authenticateToken, (req, res) => {
    const { id } = req.params;

    db.get('SELECT * FROM bank_deposits WHERE id = ?', [id], (err, row) => {
      if (err) {
        logger.error('Error retrieving bank deposit:', err);
        return res.status(500).json({ error: 'Failed to retrieve bank deposit' });
      }

      if (!row) {
        return res.status(404).json({ error: 'Bank deposit not found' });
      }

      const deposit = {
        ...row,
        images: JSON.parse(row.images || '[]'),
        totalCash: row.total_cash,
        totalChecks: row.total_checks,
        userId: row.user_id,
        userName: row.user_name
      };

      res.json(deposit);
    });
  });

  // Delete bank deposit
  router.delete('/bank-deposits/:id', authenticateToken, (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM bank_deposits WHERE id = ?', [id], function(err) {
      if (err) {
        logger.error('Error deleting bank deposit:', err);
        return res.status(500).json({ error: 'Failed to delete bank deposit' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Bank deposit not found' });
      }

      res.json({ message: 'Bank deposit deleted successfully' });
    });
  });

  // === Drawer Counts ===

  // Submit drawer count
  router.post('/drawer-counts', authenticateToken, (req, res) => {
    const { drawerId, drawerName, countType, denominations, cashOut, totalCash, totalForDeposit, smsCash } = req.body;
    const { userId, userName } = getUserInfo(req);

    const query = `
      INSERT INTO drawer_counts (drawer_id, drawer_name, count_type, denominations, cash_out, total_cash, total_for_deposit, sms_cash, user_id, user_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(query, [
      drawerId,
      drawerName,
      countType || 'opening',
      JSON.stringify(denominations),
      JSON.stringify(cashOut),
      totalCash,
      totalForDeposit,
      countType === 'closing' ? smsCash : null,
      userId,
      userName
    ], function(err) {
      if (err) {
        logger.error('Error saving drawer count:', err);
        return res.status(500).json({ error: 'Failed to save drawer count' });
      }

      // Return the created count
      db.get('SELECT * FROM drawer_counts WHERE id = ?', [this.lastID], (err, row) => {
        if (err) {
          logger.error('Error retrieving saved drawer count:', err);
          return res.status(500).json({ error: 'Failed to retrieve saved drawer count' });
        }

        const count = {
          ...row,
          denominations: JSON.parse(row.denominations),
          cashOut: JSON.parse(row.cash_out),
          drawerId: row.drawer_id,
          drawerName: row.drawer_name,
          countType: row.count_type,
          totalCash: row.total_cash,
          totalForDeposit: row.total_for_deposit,
          smsCash: row.sms_cash,
          userId: row.user_id,
          userName: row.user_name
        };

        res.json(count);
      });
    });
  });

  // Get drawer counts with filters
  router.get('/drawer-counts', authenticateToken, (req, res) => {
    const { drawerId, startDate, endDate, userId } = req.query;
    
    let query = 'SELECT * FROM drawer_counts WHERE 1=1';
    const params = [];

    if (drawerId) {
      query += ' AND drawer_id = ?';
      params.push(drawerId);
    }

    if (startDate) {
      query += ' AND date(timestamp) >= date(?)';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND date(timestamp) <= date(?)';
      params.push(endDate);
    }

    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }

    query += ' ORDER BY timestamp DESC';

    db.all(query, params, (err, rows) => {
      if (err) {
        logger.error('Error retrieving drawer counts:', err);
        return res.status(500).json({ error: 'Failed to retrieve drawer counts' });
      }

      const counts = rows.map(row => ({
        ...row,
        denominations: JSON.parse(row.denominations),
        cashOut: JSON.parse(row.cash_out),
        drawerId: row.drawer_id,
        drawerName: row.drawer_name,
        countType: row.count_type,
        totalCash: row.total_cash,
        totalForDeposit: row.total_for_deposit,
        smsCash: row.sms_cash,
        userId: row.user_id,
        userName: row.user_name
      }));

      res.json(counts);
    });
  });

  // Get specific drawer count
  router.get('/drawer-counts/:id', authenticateToken, (req, res) => {
    const { id } = req.params;

    db.get('SELECT * FROM drawer_counts WHERE id = ?', [id], (err, row) => {
      if (err) {
        logger.error('Error retrieving drawer count:', err);
        return res.status(500).json({ error: 'Failed to retrieve drawer count' });
      }

      if (!row) {
        return res.status(404).json({ error: 'Drawer count not found' });
      }

      const count = {
        ...row,
        denominations: JSON.parse(row.denominations),
        cashOut: JSON.parse(row.cash_out),
        drawerId: row.drawer_id,
        drawerName: row.drawer_name,
        countType: row.count_type,
        totalCash: row.total_cash,
        totalForDeposit: row.total_for_deposit,
        smsCash: row.sms_cash,
        userId: row.user_id,
        userName: row.user_name
      };

      res.json(count);
    });
  });

  // Delete drawer count
  router.delete('/drawer-counts/:id', authenticateToken, (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM drawer_counts WHERE id = ?', [id], function(err) {
      if (err) {
        logger.error('Error deleting drawer count:', err);
        return res.status(500).json({ error: 'Failed to delete drawer count' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Drawer count not found' });
      }

      res.json({ message: 'Drawer count deleted successfully' });
    });
  });

  // Update drawer count
  router.put('/drawer-counts/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { drawerId, drawerName, countType, denominations, cashOut, totalCash, totalForDeposit, smsCash } = req.body;
    const { userId, userName } = getUserInfo(req);

    const query = `
      UPDATE drawer_counts 
      SET drawer_id = ?, drawer_name = ?, count_type = ?, denominations = ?, cash_out = ?, 
          total_cash = ?, total_for_deposit = ?, sms_cash = ?, user_id = ?, user_name = ?
      WHERE id = ?
    `;

    db.run(query, [
      drawerId,
      drawerName,
      countType || 'opening',
      JSON.stringify(denominations),
      JSON.stringify(cashOut),
      totalCash,
      totalForDeposit,
      countType === 'closing' ? smsCash : null,
      userId,
      userName,
      id
    ], function(err) {
      if (err) {
        logger.error('Error updating drawer count:', err);
        return res.status(500).json({ error: 'Failed to update drawer count' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Drawer count not found' });
      }

      // Return the updated count
      db.get('SELECT * FROM drawer_counts WHERE id = ?', [id], (err, row) => {
        if (err) {
          logger.error('Error retrieving updated drawer count:', err);
          return res.status(500).json({ error: 'Failed to retrieve updated drawer count' });
        }

        const count = {
          ...row,
          denominations: JSON.parse(row.denominations),
          cashOut: JSON.parse(row.cash_out),
          drawerId: row.drawer_id,
          drawerName: row.drawer_name,
          countType: row.count_type,
          totalCash: row.total_cash,
          totalForDeposit: row.total_for_deposit,
          smsCash: row.sms_cash,
          userId: row.user_id,
          userName: row.user_name
        };

        res.json(count);
      });
    });
  });

  // === Drawer Settings ===

  // Get all drawer settings
  router.get('/drawer-settings', authenticateToken, (req, res) => {
    db.all('SELECT * FROM drawer_settings ORDER BY created_at ASC', (err, rows) => {
      if (err) {
        logger.error('Error retrieving drawer settings:', err);
        return res.status(500).json({ error: 'Failed to retrieve drawer settings' });
      }

      const settings = rows.map(row => ({
        ...row,
        targetDenominations: JSON.parse(row.target_denominations),
        totalAmount: row.total_amount,
        isActive: Boolean(row.is_active),
        showDetailedCalculations: Boolean(row.show_detailed_calculations),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      res.json(settings);
    });
  });

  // Create drawer settings
  router.post('/drawer-settings', authenticateToken, (req, res) => {
    const { id, name, targetDenominations, totalAmount, isActive, showDetailedCalculations } = req.body;

    const query = `
      INSERT INTO drawer_settings (id, name, target_denominations, total_amount, is_active, show_detailed_calculations)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.run(query, [
      id,
      name,
      JSON.stringify(targetDenominations),
      totalAmount || 0,
      isActive ? 1 : 0,
      showDetailedCalculations ? 1 : 0
    ], function(err) {
      if (err) {
        if (err.code === '23505') { // PostgreSQL unique constraint violation (was SQLITE_CONSTRAINT_UNIQUE)
          return res.status(400).json({ error: 'Drawer name already exists' });
        }
        logger.error('Error creating drawer settings:', err);
        return res.status(500).json({ error: 'Failed to create drawer settings' });
      }

      // Return the created settings
      db.get('SELECT * FROM drawer_settings WHERE id = ?', [id], (err, row) => {
        if (err) {
          logger.error('Error retrieving saved drawer settings:', err);
          return res.status(500).json({ error: 'Failed to retrieve saved drawer settings' });
        }

        const settings = {
          ...row,
          targetDenominations: JSON.parse(row.target_denominations),
          totalAmount: row.total_amount,
          isActive: Boolean(row.is_active),
          showDetailedCalculations: Boolean(row.show_detailed_calculations),
          createdAt: row.created_at,
          updatedAt: row.updated_at
        };

        res.json(settings);
      });
    });
  });

  // Update drawer settings
  router.put('/drawer-settings/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { name, targetDenominations, totalAmount, isActive, showDetailedCalculations } = req.body;

    const query = `
      UPDATE drawer_settings 
      SET name = ?, target_denominations = ?, total_amount = ?, is_active = ?, show_detailed_calculations = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    db.run(query, [
      name,
      JSON.stringify(targetDenominations),
      totalAmount || 0,
      isActive ? 1 : 0,
      showDetailedCalculations ? 1 : 0,
      id
    ], function(err) {
      if (err) {
        if (err.code === '23505') { // PostgreSQL unique constraint violation (was SQLITE_CONSTRAINT_UNIQUE)
          return res.status(400).json({ error: 'Drawer name already exists' });
        }
        logger.error('Error updating drawer settings:', err);
        return res.status(500).json({ error: 'Failed to update drawer settings' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Drawer settings not found' });
      }

      // Return the updated settings
      db.get('SELECT * FROM drawer_settings WHERE id = ?', [id], (err, row) => {
        if (err) {
          logger.error('Error retrieving updated drawer settings:', err);
          return res.status(500).json({ error: 'Failed to retrieve updated drawer settings' });
        }

        const settings = {
          ...row,
          targetDenominations: JSON.parse(row.target_denominations),
          totalAmount: row.total_amount,
          isActive: Boolean(row.is_active),
          showDetailedCalculations: Boolean(row.show_detailed_calculations),
          createdAt: row.created_at,
          updatedAt: row.updated_at
        };

        res.json(settings);
      });
    });
  });

  // Delete drawer settings
  router.delete('/drawer-settings/:id', authenticateToken, (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM drawer_settings WHERE id = ?', [id], function(err) {
      if (err) {
        logger.error('Error deleting drawer settings:', err);
        return res.status(500).json({ error: 'Failed to delete drawer settings' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Drawer settings not found' });
      }

      res.json({ message: 'Drawer settings deleted successfully' });
    });
  });

  // === Analytics ===

  // Get analytics data
  router.get('/analytics', authenticateToken, (req, res) => {
    const { drawerId, startDate, endDate } = req.query;
    
    // Build date filters
    let dateFilter = '1=1';
    const params = [];

    if (startDate) {
      dateFilter += ' AND date(timestamp) >= date(?)';
      params.push(startDate);
    }

    if (endDate) {
      dateFilter += ' AND date(timestamp) <= date(?)';
      params.push(endDate);
    }

    // Get drawer totals
    let drawerQuery = `
      SELECT drawer_id, drawer_name, total_cash, date(timestamp) as date
      FROM drawer_counts 
      WHERE ${dateFilter}
    `;
    
    if (drawerId) {
      drawerQuery += ' AND drawer_id = ?';
      params.push(drawerId);
    }

    drawerQuery += ' ORDER BY timestamp DESC';

    db.all(drawerQuery, params, (err, drawerTotals) => {
      if (err) {
        logger.error('Error retrieving drawer totals:', err);
        return res.status(500).json({ error: 'Failed to retrieve analytics data' });
      }

      // Get cash flow trends (simplified - you might want to calculate actual in/out)
      const cashInOutQuery = `
        SELECT date(timestamp) as date, 
               SUM(total_cash + total_checks) as cashIn,
               0 as cashOut,
               SUM(total_cash + total_checks) as netFlow
        FROM bank_deposits 
        WHERE ${dateFilter}
        GROUP BY date(timestamp)
        ORDER BY date(timestamp)
      `;

      db.all(cashInOutQuery, params.slice(0, -1), (err, cashInOutTrends) => {
        if (err) {
          logger.error('Error retrieving cash trends:', err);
          return res.status(500).json({ error: 'Failed to retrieve cash trends' });
        }

        // For now, return empty discrepancies array (would need business logic to calculate)
        const analytics = {
          drawerTotals: drawerTotals.map(row => ({
            drawerId: row.drawer_id,
            drawerName: row.drawer_name,
            totalCash: row.total_cash,
            date: row.date
          })),
          cashInOutTrends: cashInOutTrends.map(row => ({
            date: row.date,
            cashIn: row.cashIn || 0,
            cashOut: row.cashOut || 0,
            netFlow: row.netFlow || 0
          })),
          drawerDiscrepancies: [] // Placeholder for future implementation
        };

        res.json(analytics);
      });
    });
  });

  // === Image Upload ===

  // Upload deposit images
  router.post('/upload-images', authenticateToken, upload.array('images', 5), (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const filenames = req.files.map(file => file.filename);
      res.json({ filenames });
    } catch (error) {
      logger.error('Error uploading images:', error);
      res.status(500).json({ error: 'Failed to upload images' });
    }
  });

  // Mount the router
  app.use('/api/cash-management', router);
  
  logger.info('✅ Cash management routes initialized');
};

module.exports = { setupCashManagementRoutes }; 