const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Connect to database
const db = new sqlite3.Database('./database.sqlite');

async function fixImageUrls() {
  try {
    console.log('Fixing image URLs for QuickCheck ID 558...');
    
    // Get the current record
    const record = await new Promise((resolve, reject) => {
      db.get('SELECT data FROM quick_checks WHERE id = ?', [558], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!record) {
      console.error('Record not found');
      return;
    }
    
    console.log('Current record found, parsing data...');
    const data = JSON.parse(record.data);
    
    // Get all uploaded files for this QuickCheck
    const uploadsDir = './uploads';
    const files = fs.readdirSync(uploadsDir).filter(f => f.startsWith('558_'));
    
    console.log('Found uploaded files:', files);
    
    // Create URL mapping based on actual files
    const urlMapping = {};
    
    // Map file types to their corresponding data fields
    const fieldMapping = {
      'dashLights': 'dash_lights_photos',
      'tpms_placard': 'tpms_placard', 
      'washer_fluid': 'washer_fluid_photo',
      'engine_air_filter': 'engine_air_filter_photo',
      'battery': 'battery_photos',
      'tpms_tool': 'tpms_tool_photo',
      'front_brakes': 'front_brakes',
      'rear_brakes': 'rear_brakes',
      'undercarriage_photos': 'undercarriage_photos'
    };
    
    // Process simple photo fields
    Object.entries(fieldMapping).forEach(([filePrefix, dataField]) => {
      const fieldFiles = files.filter(f => f.includes(`_${filePrefix}_`));
      if (fieldFiles.length > 0 && data[dataField]) {
        data[dataField] = fieldFiles.map(filename => ({
          url: `/uploads/${filename}`
        }));
        console.log(`Updated ${dataField} with ${fieldFiles.length} files`);
      }
    });
    
    // Process tire photos (tire_photos array)
    const tireTypes = ['passenger_front', 'driver_front', 'driver_rear', 'passenger_rear', 'spare'];
    if (data.tire_photos && Array.isArray(data.tire_photos)) {
      data.tire_photos = data.tire_photos.map(tirePhoto => {
        const tireFiles = files.filter(f => f.includes(`_tire_${tirePhoto.type}_`));
        if (tireFiles.length > 0) {
          return {
            ...tirePhoto,
            photos: tireFiles.map(filename => ({
              url: `/uploads/${filename}`
            }))
          };
        }
        return tirePhoto;
      });
      console.log('Updated tire_photos array');
    }
    
    // Process tire repair images
    if (data.tire_repair_images) {
      Object.keys(data.tire_repair_images).forEach(position => {
        const positionData = data.tire_repair_images[position];
        
        // Update not_repairable images
        const notRepairableFiles = files.filter(f => f.includes(`_tire_repair_${position}_not_repairable_`));
        if (notRepairableFiles.length > 0) {
          positionData.not_repairable = notRepairableFiles.map(filename => ({
            url: `/uploads/${filename}`
          }));
        }
        
        // Update tire_size_brand images  
        const tireSizeBrandFiles = files.filter(f => f.includes(`_tire_repair_${position}_tire_size_brand_`));
        if (tireSizeBrandFiles.length > 0) {
          positionData.tire_size_brand = tireSizeBrandFiles.map(filename => ({
            url: `/uploads/${filename}`
          }));
        }
        
        // Update repairable_spot images
        const repairableSpotFiles = files.filter(f => f.includes(`_tire_repair_${position}_repairable_spot_`));
        if (repairableSpotFiles.length > 0) {
          positionData.repairable_spot = repairableSpotFiles.map(filename => ({
            url: `/uploads/${filename}`
          }));
        }
      });
      console.log('Updated tire_repair_images');
    }
    
    // Update the database record
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE quick_checks SET data = ? WHERE id = ?',
        [JSON.stringify(data), 558],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
    
    console.log('✅ Successfully updated QuickCheck record 558 with correct image URLs!');
    console.log('🎉 Images should now load properly in the QuickCheck Details page');
    
  } catch (error) {
    console.error('❌ Error fixing image URLs:', error);
  } finally {
    db.close();
  }
}

// Run the fix
fixImageUrls(); 