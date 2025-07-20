const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const logger = require('../logger');

const migration = {
  version: '002',
  description: 'Add PIN column to users',
  up: async () => {
    const filePath = path.join(__dirname, '..', 'users.csv');
    
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        // Create new file with PIN column
        const headers = 'email,password,name,enabled,role,pin\n';
        fs.writeFileSync(filePath, headers);
        logger.info('Created new users.csv file with PIN column');
        return;
      }

      // Read existing users
      const users = [];
      return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv({
            mapHeaders: ({ header }) => header.trim(),
            mapValues: ({ value }) => value.trim()
          }))
          .on('data', (data) => {
            users.push(data);
          })
          .on('end', () => {
            try {
              // Check if PIN column already exists
              if (users.length > 0 && users[0].hasOwnProperty('pin')) {
                logger.info('PIN column already exists in users.csv');
                resolve();
                return;
              }

              // Add PIN column to each user (empty by default)
              const updatedUsers = users.map(user => ({
                ...user,
                pin: '' // Empty PIN by default - users will need to set it
              }));

              // Write back with new column
              const csvHeader = 'email,password,name,enabled,role,pin\n';
              const csvContent = updatedUsers.map(user => 
                `${user.email},${user.password},${user.name},${user.enabled || true},${user.role || 'Technician'},${user.pin || ''}`
              ).join('\n');
              
              fs.writeFileSync(filePath, csvHeader + csvContent);
              logger.info('Successfully added PIN column to users.csv');
              resolve();
            } catch (error) {
              logger.error('Error updating users.csv with PIN column:', error);
              reject(error);
            }
          })
          .on('error', (err) => {
            logger.error('Error reading users.csv:', err);
            reject(err);
          });
      });
    } catch (error) {
      logger.error('Migration error:', error);
      throw error;
    }
  },
  down: () => {
    // Rollback: remove PIN column
    const filePath = path.join(__dirname, '..', 'users.csv');
    
    try {
      if (!fs.existsSync(filePath)) {
        logger.info('users.csv does not exist, nothing to rollback');
        return;
      }

      const users = [];
      return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv({
            mapHeaders: ({ header }) => header.trim(),
            mapValues: ({ value }) => value.trim()
          }))
          .on('data', (data) => {
            users.push(data);
          })
          .on('end', () => {
            try {
              // Remove PIN column
              const updatedUsers = users.map(user => {
                const { pin, ...userWithoutPin } = user;
                return userWithoutPin;
              });

              // Write back without PIN column
              const csvHeader = 'email,password,name,enabled,role\n';
              const csvContent = updatedUsers.map(user => 
                `${user.email},${user.password},${user.name},${user.enabled || true},${user.role || 'Technician'}`
              ).join('\n');
              
              fs.writeFileSync(filePath, csvHeader + csvContent);
              logger.info('Successfully removed PIN column from users.csv');
              resolve();
            } catch (error) {
              logger.error('Error removing PIN column from users.csv:', error);
              reject(error);
            }
          })
          .on('error', (err) => {
            logger.error('Error reading users.csv for rollback:', err);
            reject(err);
          });
      });
    } catch (error) {
      logger.error('Rollback error:', error);
      throw error;
    }
  }
};

module.exports = migration; 