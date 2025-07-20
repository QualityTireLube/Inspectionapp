const bcrypt = require('bcryptjs');
const SALT_ROUNDS = 10;

const password = '1234';
const storedHash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

bcrypt.hash(password, SALT_ROUNDS, (err, hash) => {
  if (err) {
    console.error('Error hashing password:', err);
    return;
  }
  console.log('Generated hash:', hash);
  console.log('Stored hash:', storedHash);
  console.log('Hashes match:', hash === storedHash);
}); 