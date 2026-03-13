const express = require('express');
const cors = require('cors');
const axios = require('axios');
const logger = require('./logger');

const app = express();
const port = process.env.PORT || 5001;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow localhost and any IP address on port 3000 or 5001
    const isAllowed = /^https?:\/\/(localhost|127\.0\.0\.1|\d+\.\d+\.\d+\.\d+):(3000|5001)$/.test(origin);
    
    if (isAllowed) {
      logger.info(`✅ CORS allowed origin: ${origin}`);
      callback(null, true);
    } else {
      logger.warn(`❌ CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Enable preflight for all routes
app.options('*', cors());

// === NHTSA API Helper Functions ===

async function tryNHTSAApi(vin) {
  try {
    const url = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${vin}?format=json`;
    logger.info(`Trying NHTSA API for VIN: ${vin}`);
    
    const response = await axios.get(url, { timeout: 10000 });
    
    if (response.data && response.data.Results) {
      return response.data;
    }
    
    return null;
  } catch (error) {
    logger.error(`NHTSA API error: ${error.message}`);
    throw error;
  }
}

// === VIN Decoding Endpoint ===
app.get('/api/vin/decode/:vin', async (req, res) => {
  try {
    const { vin } = req.params;
    
    // Validate VIN
    if (!vin || vin.length !== 17) {
      return res.status(400).json({ error: 'VIN must be 17 characters' });
    }
    
    // Clean the VIN (remove spaces and convert to uppercase)
    const cleanVin = vin.replace(/\s/g, '').toUpperCase();
    
    // Validate VIN format (17 alphanumeric characters, no I, O, Q)
    const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/;
    if (!vinRegex.test(cleanVin)) {
      return res.status(400).json({ 
        error: 'Invalid VIN format. VIN contains invalid characters.' 
      });
    }
    
    logger.info(`VIN decode request for: ${cleanVin}`);
    
    // Try NHTSA API
    try {
      const nhtsaData = await tryNHTSAApi(cleanVin);
      if (nhtsaData) {
        logger.info(`VIN decode successful via NHTSA for: ${cleanVin}`);
        return res.json(nhtsaData);
      }
    } catch (nhtsaError) {
      logger.warn(`NHTSA API failed for ${cleanVin}:`, nhtsaError.message);
    }
    
    // All APIs failed
    throw new Error('VIN decoding service is unavailable');
    
  } catch (error) {
    logger.error('VIN decode error:', error.message);
    res.status(503).json({ 
      error: 'VIN decoding service is currently unavailable. Please try again later.',
      userMessage: 'VIN decoding services are temporarily unavailable. You can continue with the inspection and decode the VIN later.'
    });
  }
});

// === Health Check Endpoint ===
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    service: 'Minimal VIN Decoder',
    timestamp: new Date().toISOString()
  });
});

// === 404 Handler ===
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// === Error Handler ===
app.use((err, req, res, next) => {
  logger.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// === Start Server ===
app.listen(port, () => {
  logger.info(`✅ Minimal VIN Decoder server running on port ${port}`);
  logger.info(`📍 Health check: http://localhost:${port}/health`);
  logger.info(`🔍 VIN decode endpoint: http://localhost:${port}/api/vin/decode/:vin`);
});

module.exports = app;
