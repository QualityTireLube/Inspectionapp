const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the database
const dbPath = path.join(__dirname, '..', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Starting migration: Adding status column to quick_checks table...');

// Add the status column
db.run(`
  ALTER TABLE quick_checks 
  ADD COLUMN status TEXT DEFAULT 'submitted'
`, (err) => {
  if (err) {
    console.error('Error adding status column:', err.message);
  } else {
    console.log('✅ Status column added successfully');
    
    // Update existing records based on archived_at
    db.run(`
      UPDATE quick_checks 
      SET status = CASE 
        WHEN archived_at IS NOT NULL THEN 'archived'
        ELSE 'submitted'
      END
    `, (err) => {
      if (err) {
        console.error('Error updating existing records:', err.message);
      } else {
        console.log('✅ Existing records updated with appropriate status');
        
        // Verify the migration
        db.all('SELECT status, COUNT(*) as count FROM quick_checks GROUP BY status', (err, rows) => {
          if (err) {
            console.error('Error verifying migration:', err.message);
          } else {
            console.log('📊 Migration verification:');
            rows.forEach(row => {
              console.log(`  - ${row.status}: ${row.count} records`);
            });
          }
          
          console.log('✅ Migration completed successfully!');
          db.close();
        });
      }
    });
  }
}); 