// 🧠 Cursor: I'm deploying to Render and added graceful fallback for socket.io module.
// If socket.io isn't available, creates a mock WebSocket service to prevent crashes.

const jwt = require('jsonwebtoken');
const logger = require('./logger');

let Server;
let isSocketIOAvailable = false;

try {
  const socketIO = require('socket.io');
  Server = socketIO.Server;
  isSocketIOAvailable = true;
  console.log('✅ Socket.IO loaded successfully');
} catch (error) {
  console.warn('⚠️  Socket.IO not available, WebSocket features will be disabled:', error.message);
  isSocketIOAvailable = false;
}

class WebSocketService {
  constructor(server) {
    if (!isSocketIOAvailable) {
      console.warn('⚠️  Socket.IO is not available. WebSocket service will be mocked.');
      this.io = {
        on: (event, callback) => {
          if (event === 'connection') {
            callback({ id: 'mock-socket-id' });
          }
        },
        emit: (event, data) => {
          console.log(`Mock WebSocket emit: ${event}`, data);
        },
        to: (socketId) => ({ emit: (event, data) => console.log(`Mock WebSocket to ${socketId} emit: ${event}`, data) }),
        broadcast: { emit: (event, data) => console.log(`Mock WebSocket broadcast emit: ${event}`, data) },
        engine: { clientsCount: 0 }
      };
      this.connectedClients = new Map();
      this.setupEventHandlers();
      logger.info('🔌 WebSocket service initialized (mocked)');
      return;
    }

    this.io = new Server(server, {
      cors: {
        origin: function(origin, callback) {
          // Allow requests with no origin (like mobile apps)
          if (!origin) return callback(null, true);
          
          // Allow localhost and any IP address on both ports 3000 and 5001
          const allowedOrigins = [
            // Development patterns
            /^https:\/\/localhost:3000$/,
            /^https:\/\/127\.0\.0\.1:3000$/,
            /^https:\/\/localhost:5001$/,
            /^https:\/\/127\.0\.0\.1:5001$/,
            /^https:\/\/(\d{1,3}\.){3}\d{1,3}:3000$/,
            /^https:\/\/(\d{1,3}\.){3}\d{1,3}:5001$/,
            /^http:\/\/localhost:3000$/,
            /^http:\/\/127\.0\.0\.1:3000$/,
            /^http:\/\/localhost:5001$/,
            /^http:\/\/127\.0\.0\.1:5001$/,
            /^http:\/\/(\d{1,3}\.){3}\d{1,3}:3000$/,
            /^http:\/\/(\d{1,3}\.){3}\d{1,3}:5001$/,
            // Production patterns
            /^https:\/\/.*\.onrender\.com$/,
            /^https:\/\/inspectionapp-backend\.onrender\.com$/,
            /^https:\/\/.*\.vercel\.app$/,
          ];
          
          const isAllowed = allowedOrigins.some(pattern => pattern.test(origin));
          if (isAllowed) {
            logger.info(`✅ WebSocket CORS allowed origin: ${origin}`);
          } else {
            logger.warn(`❌ WebSocket CORS blocked origin: ${origin}`);
          }
          callback(null, isAllowed);
        },
        methods: ['GET', 'POST'],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.connectedClients = new Map();
    this.setupEventHandlers();
    logger.info('🔌 WebSocket service initialized');
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      logger.info(`🔗 Client connected: ${socket.id}`);

      // Handle authentication
      socket.on('authenticate', (data) => {
        this.authenticateClient(socket, data);
      });

      // Handle client disconnection
      socket.on('disconnect', (reason) => {
        logger.info(`🔚 Client disconnected: ${socket.id}, reason: ${reason}`);
        this.connectedClients.delete(socket.id);
      });

      // Handle ping/pong for connection health
      socket.on('ping', () => {
        socket.emit('pong');
      });

      // Handle client info updates
      socket.on('client_info', (info) => {
        const clientData = this.connectedClients.get(socket.id);
        if (clientData) {
          clientData.info = { ...clientData.info, ...info };
          this.connectedClients.set(socket.id, clientData);
        }
      });

      // Handle VIN decoded events
      socket.on('vin_decoded', (data) => {
        logger.info(`🔍 VIN decoded event received:`, {
          id: data.data?.id,
          vin: data.data?.vin,
          user: data.data?.user
        });
        
        // Broadcast the VIN decoded event to all clients
        this.io.emit('quick_check_update', {
          type: 'quick_check_update',
          action: 'vin_decoded',
          data: data.data,
          timestamp: new Date().toISOString()
        });
      });
    });
  }

  authenticateClient(socket, authData) {
    try {
      const { token, userInfo } = authData;
      
      if (!token) {
        socket.emit('auth_error', { message: 'No token provided' });
        socket.disconnect();
        return;
      }

      // Verify JWT token
      const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
      const decoded = jwt.verify(token, JWT_SECRET);

      // Store authenticated client info
      this.connectedClients.set(socket.id, {
        socketId: socket.id,
        userId: decoded.email,
        userName: decoded.name || userInfo?.name,
        userRole: decoded.role,
        authenticatedAt: new Date(),
        info: userInfo || {}
      });

      socket.emit('authenticated', {
        message: 'Successfully authenticated',
        userId: decoded.email,
        connectedClients: this.getConnectedClientsInfo()
      });

      // Broadcast to all other clients that a new user connected
      socket.broadcast.emit('user_connected', {
        userId: decoded.email,
        userName: decoded.name || userInfo?.name,
        connectedAt: new Date()
      });

      logger.info(`✅ Client authenticated: ${decoded.email} (${socket.id})`);
    } catch (error) {
      logger.error('❌ Authentication failed:', error.message);
      socket.emit('auth_error', { message: 'Invalid token' });
      socket.disconnect();
    }
  }

  getConnectedClientsInfo() {
    const clients = [];
    this.connectedClients.forEach((client) => {
      clients.push({
        userId: client.userId,
        userName: client.userName,
        connectedAt: client.authenticatedAt,
        info: client.info
      });
    });
    return clients;
  }

  // Emit quick check updates to all authenticated clients
  emitQuickCheckUpdate(type, data) {
    if (!isSocketIOAvailable) {
      logger.info(`Mock WebSocket: Would emit quick check update - Type: ${type}`, {
        id: data.id,
        vin: data.vin || data.data?.vin
      });
      return;
    }

    const message = {
      type: 'quick_check_update',
      action: type, // 'created', 'updated', 'deleted', 'archived'
      data: data,
      timestamp: new Date().toISOString()
    };

    // Get authenticated clients count
    const authenticatedCount = this.connectedClients.size;
    logger.info(`🔍 WebSocket emit attempt - Type: ${type}, Authenticated clients: ${authenticatedCount}`, {
      id: data.id,
      vin: data.vin || data.data?.vin,
      connectedClients: Array.from(this.connectedClients.keys())
    });
    
    if (authenticatedCount > 0) {
      this.io.emit('quick_check_update', message);
      logger.info(`📢 Quick check ${type} broadcasted to ${authenticatedCount} clients:`, {
        id: data.id,
        vin: data.vin || data.data?.vin
      });
    } else {
      logger.warn(`⚠️ No authenticated clients connected to receive ${type} update for:`, {
        id: data.id,
        vin: data.vin || data.data?.vin
      });
    }
  }

  // Emit timing updates for specific quick check
  emitTimingUpdate(quickCheckId, timingData) {
    if (!isSocketIOAvailable) {
      logger.info(`Mock WebSocket: Would emit timing update for Quick Check ${quickCheckId}`);
      return;
    }

    const message = {
      type: 'timing_update',
      quickCheckId: quickCheckId,
      data: timingData,
      timestamp: new Date().toISOString()
    };

    this.io.emit('timing_update', message);
    logger.info(`⏱️ Timing update broadcasted for Quick Check ${quickCheckId}`);
  }

  // Emit status updates (like connection status, server notifications)
  emitStatusUpdate(type, message, targetUserId = null) {
    if (!isSocketIOAvailable) {
      logger.info(`Mock WebSocket: Would emit status update (${type}): ${message}`);
      return;
    }

    const statusMessage = {
      type: 'status_update',
      statusType: type, // 'info', 'warning', 'error', 'success'
      message: message,
      timestamp: new Date().toISOString()
    };

    if (targetUserId) {
      // Send to specific user
      this.connectedClients.forEach((client, socketId) => {
        if (client.userId === targetUserId) {
          this.io.to(socketId).emit('status_update', statusMessage);
        }
      });
    } else {
      // Broadcast to all
      this.io.emit('status_update', statusMessage);
    }

    logger.info(`📣 Status update (${type}): ${message}`);
  }

  // Get connection statistics
  getStats() {
    if (!isSocketIOAvailable) {
      return {
        connectedClients: 0,
        totalConnections: 0,
        clients: [],
        mocked: true
      };
    }

    return {
      connectedClients: this.connectedClients.size,
      totalConnections: this.io.engine.clientsCount,
      clients: this.getConnectedClientsInfo()
    };
  }

  // Send heartbeat to all clients
  sendHeartbeat() {
    if (!isSocketIOAvailable) {
      logger.info('Mock WebSocket: Would send heartbeat');
      return;
    }

    const heartbeat = {
      type: 'heartbeat',
      timestamp: new Date().toISOString(),
      serverStats: this.getStats()
    };

    this.io.emit('heartbeat', heartbeat);
  }

  // Clean up disconnected clients (called periodically)
  cleanup() {
    if (!isSocketIOAvailable) {
      return;
    }

    const now = Date.now();
    const staleTimeout = 5 * 60 * 1000; // 5 minutes

    this.connectedClients.forEach((client, socketId) => {
      const socket = this.io.sockets.sockets.get(socketId);
      if (!socket || !socket.connected) {
        this.connectedClients.delete(socketId);
        logger.info(`🧹 Cleaned up stale client: ${socketId}`);
      }
    });
  }
}

module.exports = WebSocketService; 