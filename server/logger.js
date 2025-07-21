// 🧠 Cursor: I'm deploying this Node.js backend on Render. Added graceful fallback for winston module.
// If winston isn't available, falls back to console logging to prevent deployment crashes.

const path = require('path');

let logger;

try {
  // Try to use winston if available
  const { createLogger, format, transports } = require('winston');
  
  logger = createLogger({
    level: 'info',
    format: format.combine(
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}]: ${message}`)
    ),
    transports: [
      new transports.Console(),
      new transports.File({ filename: path.join(__dirname, 'server.log') })
    ]
  });
  
  console.log('✅ Winston logger initialized successfully');
  
} catch (error) {
  // Fallback to console logging if winston is not available
  console.warn('⚠️  Winston not available, falling back to console logging:', error.message);
  
  // Create a simple console-based logger with winston-like interface
  logger = {
    info: (message) => console.log(`[INFO]: ${message}`),
    warn: (message) => console.warn(`[WARN]: ${message}`),
    error: (message) => console.error(`[ERROR]: ${message}`),
    debug: (message) => console.debug(`[DEBUG]: ${message}`),
    verbose: (message) => console.log(`[VERBOSE]: ${message}`),
    silly: (message) => console.log(`[SILLY]: ${message}`)
  };
}

module.exports = logger; 