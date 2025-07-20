const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const addPerformanceIndexes = () => {
  const dbPath = path.join(__dirname, '../database.sqlite');
  
  if (!fs.existsSync(dbPath)) {
    console.log('Database file not found. Skipping index creation.');
    return;
  }

  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database for indexing:', err);
      return;
    }
    
    console.log('Adding performance indexes to state_inspection_records table...');
    
    // Add indexes for commonly queried columns
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_state_inspection_created_at ON state_inspection_records(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_state_inspection_created_date ON state_inspection_records(created_date)',
      'CREATE INDEX IF NOT EXISTS idx_state_inspection_created_by ON state_inspection_records(created_by)',
      'CREATE INDEX IF NOT EXISTS idx_state_inspection_payment_type ON state_inspection_records(payment_type)',
      'CREATE INDEX IF NOT EXISTS idx_state_inspection_status ON state_inspection_records(status)',
      'CREATE INDEX IF NOT EXISTS idx_state_inspection_sticker_number ON state_inspection_records(sticker_number)',
      'CREATE INDEX IF NOT EXISTS idx_state_inspection_last_name ON state_inspection_records(last_name)',
      'CREATE INDEX IF NOT EXISTS idx_state_inspection_fleet_account ON state_inspection_records(fleet_account)',
      'CREATE INDEX IF NOT EXISTS idx_state_inspection_archived ON state_inspection_records(archived)',
      // Composite index for common query patterns
      'CREATE INDEX IF NOT EXISTS idx_state_inspection_archived_created_at ON state_inspection_records(archived, created_at DESC)'
    ];
    
    let completed = 0;
    const total = indexes.length;
    
    indexes.forEach((indexSql, i) => {
      db.run(indexSql, (err) => {
        if (err) {
          console.error(`Error creating index ${i + 1}:`, err);
        } else {
          console.log(`✓ Index ${i + 1}/${total} created successfully`);
        }
        
        completed++;
        if (completed === total) {
          console.log('All performance indexes created successfully!');
          db.close((closeErr) => {
            if (closeErr) {
              console.error('Error closing database:', closeErr);
            } else {
              console.log('Database connection closed.');
            }
          });
        }
      });
    });
  });
};

// Run if called directly
if (require.main === module) {
  addPerformanceIndexes();
}

module.exports = addPerformanceIndexes; 