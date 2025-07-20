const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Path to your database file
const dbPath = path.join(__dirname, 'server', 'database.sqlite');

// Connect to the database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to the database.');
});

// Delete all drafts (status = 'in_progress')
db.run(
  'DELETE FROM quick_checks WHERE status = ?',
  ['in_progress'],
  function(err) {
    if (err) {
      console.error('Error deleting drafts:', err.message);
    } else {
      console.log(`Successfully deleted ${this.changes} drafts.`);
    }
    
    // Close the database connection
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('Database connection closed.');
      }
      process.exit(0);
    });
  }
); 