const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

const addStatusColumn = () => {
  return new Promise((resolve, reject) => {
    // Check if status column already exists
    db.get("PRAGMA table_info(state_inspection_records)", [], (err, result) => {
      if (err) {
        console.error('Error checking table info:', err);
        return reject(err);
      }

      // Check if status column already exists
      db.all("PRAGMA table_info(state_inspection_records)", [], (err, columns) => {
        if (err) {
          console.error('Error getting table columns:', err);
          return reject(err);
        }

        const hasStatusColumn = columns.some(col => col.name === 'status');
        
        if (hasStatusColumn) {
          console.log('✅ Status column already exists in state_inspection_records table');
          return resolve();
        }

        // Add status column with default value 'Pass'
        db.run(`
          ALTER TABLE state_inspection_records 
          ADD COLUMN status TEXT DEFAULT 'Pass' CHECK (status IN ('Pass', 'Retest', 'Fail'))
        `, (err) => {
          if (err) {
            console.error('❌ Error adding status column:', err);
            return reject(err);
          }
          
          console.log('✅ Successfully added status column to state_inspection_records table');
          
          // Update existing records to have 'Pass' status if they don't have one
          db.run(`
            UPDATE state_inspection_records 
            SET status = 'Pass' 
            WHERE status IS NULL OR status = ''
          `, (updateErr) => {
            if (updateErr) {
              console.error('❌ Error updating existing records with default status:', updateErr);
              return reject(updateErr);
            }
            
            console.log('✅ Updated existing records with default status');
            resolve();
          });
        });
      });
    });
  });
};

const rollback = () => {
  return new Promise((resolve, reject) => {
    // SQLite doesn't support DROP COLUMN directly, so we would need to recreate the table
    // For now, just log that rollback would require manual intervention
    console.log('⚠️  Rollback would require manual intervention - SQLite does not support DROP COLUMN');
    resolve();
  });
};

// Run migration if called directly
if (require.main === module) {
  console.log('🔄 Running migration: Add status column to state_inspection_records...');
  
  addStatusColumn()
    .then(() => {
      console.log('✅ Migration completed successfully');
      db.close();
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Migration failed:', err);
      db.close();
      process.exit(1);
    });
}

module.exports = { addStatusColumn, rollback }; 