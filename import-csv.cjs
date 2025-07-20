const fs = require('fs');
const csv = require('csv-parser');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');

// Connect to database
const db = new sqlite3.Database('./server/database.sqlite', (err) => {
  if (err) {
    console.error('❌ DB connection error:', err);
    process.exit(1);
  } else {
    console.log('✅ Connected to SQLite database');
  }
});

// CSV file path
const csvFilePath = './Example files/Quick check and VSI - State Inspection Log.csv';

// Check if file exists
if (!fs.existsSync(csvFilePath)) {
  console.error(`❌ CSV file not found: ${csvFilePath}`);
  console.log('Please make sure the file "Quick check and VSI - State Inspection Log.csv" is in the Example files folder.');
  process.exit(1);
}

console.log(`📁 Reading CSV file: ${csvFilePath}`);

const results = [];
const errors = [];
let processed = 0;
let successful = 0;

// Read and parse CSV
fs.createReadStream(csvFilePath)
  .pipe(csv())
  .on('data', (data) => {
    results.push(data);
  })
  .on('end', () => {
    console.log(`📊 Found ${results.length} rows in CSV`);
    
    // Process each row
    const promises = results.map((row, index) => {
      return new Promise((resolve) => {
        processed++;
        
        // Map CSV columns to database fields
        const record = {
          createdBy: row['Created By'] || '',
          createdDate: row['Date Created'] || '',
          stickerNumber: row['Sticker Number'] || '',
          lastName: row['Last name'] || '',
          paymentType: row['Payment'] || 'Cash',
          paymentAmount: parseInt(row['Payment amount'] || '0'),
          status: row['Status'] || 'Pass',
          fleetAccount: row['Fleet Name'] || null,
          notes: row['Notes'] || null
        };

        // Validate required fields
        if (!record.createdBy || !record.createdDate || !record.stickerNumber || !record.lastName) {
          errors.push(`Row ${index + 1}: Missing required fields - CreatedBy: "${record.createdBy}", CreatedDate: "${record.createdDate}", StickerNumber: "${record.stickerNumber}", LastName: "${record.lastName}"`);
          resolve();
          return;
        }

        // Validate payment type
        if (!['Cash', 'Check', 'Fleet'].includes(record.paymentType)) {
          errors.push(`Row ${index + 1}: Invalid payment type '${record.paymentType}'. Must be Cash, Check, or Fleet`);
          resolve();
          return;
        }

        // Validate payment amount
        if (![0, 10, 18, 20].includes(record.paymentAmount)) {
          errors.push(`Row ${index + 1}: Invalid payment amount '${record.paymentAmount}'. Must be 0, 10, 18, or 20`);
          resolve();
          return;
        }

        // Validate status
        if (!['Pass', 'Retest', 'Fail'].includes(record.status)) {
          errors.push(`Row ${index + 1}: Invalid status '${record.status}'. Must be Pass, Retest, or Fail`);
          resolve();
          return;
        }

        // Generate unique ID
        const id = uuidv4();

        const insertQuery = `
          INSERT INTO state_inspection_records (
            id, created_by, created_date, sticker_number, last_name, 
            payment_type, payment_amount, status, fleet_account, tint_affidavit, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const params = [
          id, 
          record.createdBy, 
          record.createdDate, 
          record.stickerNumber, 
          record.lastName, 
          record.paymentType, 
          record.paymentAmount, 
          record.status,
          record.fleetAccount, 
          null, // tint_affidavit
          record.notes
        ];

        db.run(insertQuery, params, function(err) {
          if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
              errors.push(`Row ${index + 1}: Sticker number '${record.stickerNumber}' already exists`);
            } else {
              errors.push(`Row ${index + 1}: Database error - ${err.message}`);
            }
          } else {
            successful++;
            console.log(`✅ Row ${index + 1}: Added record for ${record.lastName} (Sticker: ${record.stickerNumber})`);
          }
          resolve();
        });
      });
    });

    // Wait for all promises to complete
    Promise.all(promises).then(() => {
      console.log('\n📋 IMPORT SUMMARY:');
      console.log(`   Total processed: ${processed}`);
      console.log(`   ✅ Successful: ${successful}`);
      console.log(`   ❌ Failed: ${processed - successful}`);
      
      if (errors.length > 0) {
        console.log('\n🚨 ERRORS:');
        errors.forEach(error => console.log(`   ${error}`));
      }
      
      console.log('\n🎉 Import completed!');
      db.close();
    });
  })
  .on('error', (parseError) => {
    console.error('❌ Error parsing CSV file:', parseError);
    db.close();
    process.exit(1);
  }); 