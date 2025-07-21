import { io, Socket } from 'socket.io-client';

export interface QuickCheckUpdateData {
  id: number;
  title?: string;
  data?: any;
  user?: string;
  userEmail?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  archived_at?: string;
  archived_by?: string;
  deleted_at?: string;
  deleted_by?: string;
  technician_duration?: number;
  service_advisor_duration?: number;
}

export interface WebSocketMessage {
  type: 'quick_check_update' | 'timing_update' | 'status_update' | 'heartbeat' | 'user_connected' | 'authenticated' | 'auth_error';
  action?: 'created' | 'updated' | 'deleted' | 'archived';
  data?: any;
  timestamp?: string;
  message?: string;
  statusType?: 'info' | 'warning' | 'error' | 'success';
  quickCheckId?: number;
}

export interface ConnectionStatus {
  connected: boolean;
  authenticated: boolean;
  reconnecting: boolean;
  lastConnected?: Date;
  lastError?: string;
  connectedClients?: number;
}

export type WebSocketEventCallback = (message: WebSocketMessage) => void;
export type ConnectionStatusCallback = (status: ConnectionStatus) => void;

class WebSocketService {
  private socket: Socket | null = null;
  private baseUrl: string;
  private token: string | null = null;
  private eventCallbacks: Map<string, WebSocketEventCallback[]> = new Map();
  private statusCallbacks: ConnectionStatusCallback[] = [];
  private connectionStatus: ConnectionStatus = {
    connected: false,
    authenticated: false,
    reconnecting: false
  };
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000; // Start with 1 second
  private maxReconnectDelay = 30000; // Max 30 seconds
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private isReconnecting = false;

  constructor() {
    // Use the same dynamic URL logic as the API service
    const protocol = 'https'; // Always use HTTPS for WebSocket
    const hostname = window.location.hostname;
    
    // In development, use port 5001 for separate backend
    // In production (Render monolith), use same origin (no separate port)
    if (import.meta.env.DEV) {
      this.baseUrl = `${protocol}://${hostname}:5001`;
    } else {
      // Production: use same origin as the current page (no port specified)
      const port = window.location.port;
      this.baseUrl = `${protocol}://${hostname}${port ? `:${port}` : ''}`;
    }
    
    console.log('🔌 WebSocket service initialized with base URL:', this.baseUrl);
    console.log('🌐 Dynamic hostname detection:', hostname);
    console.log('📍 Current location:', window.location.href);
    console.log('🏠 Hostname:', window.location.hostname);
    console.log('🔒 Protocol:', protocol);
    console.log('🏗️ Environment:', import.meta.env.DEV ? 'Development' : 'Production');
    console.log('✅ WebSocket configured for', import.meta.env.DEV ? 'separate backend server (port 5001)' : 'monolith deployment (same origin)');
    
    // Check for immediate connection if token is available
    const token = localStorage.getItem('token');
    if (token) {
      console.log('🔗 WebSocket: Token found in constructor, attempting immediate connection');
      // Use setTimeout to ensure the service is fully initialized
      setTimeout(() => {
        this.connect(token);
      }, 100);
    }
  }

  // Initialize connection
  connect(token?: string): void {
    if (token) {
      this.token = token;
    }

    if (!this.token) {
      console.error('❌ WebSocket: No token provided for authentication');
      this.updateConnectionStatus({ 
        connected: false, 
        authenticated: false, 
        lastError: 'No authentication token provided' 
      });
      return;
    }

    if (this.socket?.connected) {
      console.log('🔗 WebSocket: Already connected');
      return;
    }

    // Clear any existing connection
    if (this.socket) {
      console.log('🔗 WebSocket: Clearing existing socket connection');
      this.socket.disconnect();
      this.socket = null;
    }

    console.log('🔗 WebSocket: Connecting to', this.baseUrl);
    console.log('🔍 WebSocket connection details:', {
      baseUrl: this.baseUrl,
      hostname: window.location.hostname,
      port: window.location.port,
      protocol: window.location.protocol,
      fullUrl: window.location.href
    });
    
    try {
      this.socket = io(this.baseUrl, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true, // Force new connection
        autoConnect: true,
        reconnection: false, // We'll handle reconnection manually
        // Additional options for SSL certificate handling
        secure: true, // Force HTTPS
        // Add extra headers if needed
        extraHeaders: {
          'Accept': 'application/json',
          'User-Agent': 'QuickCheck-WebSocket-Client'
        }
      });

      this.setupEventHandlers();
    } catch (error) {
      console.error('❌ WebSocket: Failed to create socket connection:', error);
      this.updateConnectionStatus({
        connected: false,
        authenticated: false,
        lastError: `Connection failed: ${error}`
      });
    }
  }

  // Disconnect
  disconnect(): void {
    console.log('🔚 WebSocket: Disconnecting');
    
    this.clearTimers();
    this.isReconnecting = false;
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.updateConnectionStatus({
      connected: false,
      authenticated: false,
      reconnecting: false
    });
  }

  // Setup event handlers
  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ WebSocket: Connected');
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
      this.isReconnecting = false;
      
      this.updateConnectionStatus({
        connected: true,
        authenticated: false,
        reconnecting: false,
        lastConnected: new Date()
      });

      // Authenticate immediately after connection
      this.authenticate();
      
      // Start heartbeat
      this.startHeartbeat();
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('🔚 WebSocket: Disconnected -', reason);
      
      this.clearTimers();
      
      this.updateConnectionStatus({
        connected: false,
        authenticated: false,
        reconnecting: false,
        lastError: `Disconnected: ${reason}`
      });

      // Attempt to reconnect unless it was a manual disconnect
      if (reason !== 'io client disconnect' && reason !== 'transport close') {
        this.scheduleReconnect();
      }
    });

    this.socket.on('authenticated', (data: any) => {
      console.log('✅ WebSocket: Authenticated', data);
      
      this.updateConnectionStatus({
        connected: true,
        authenticated: true,
        reconnecting: false,
        connectedClients: data.connectedClients?.length || 0
      });

      // Emit authenticated event to callbacks
      this.emitToCallbacks('authenticated', data);
    });

    this.socket.on('auth_error', (error: any) => {
      console.error('❌ WebSocket: Authentication failed', error);
      
      this.updateConnectionStatus({
        connected: this.socket?.connected || false,
        authenticated: false,
        lastError: `Authentication failed: ${error.message}`
      });

      this.emitToCallbacks('auth_error', error);
    });

    this.socket.on('connect_error', (error: any) => {
      console.error('❌ WebSocket: Connection error', error);
      console.error('🔍 Connection details:', {
        attemptedUrl: this.baseUrl,
        errorType: error.type,
        errorMessage: error.message,
        errorDescription: error.description
      });
      
      this.updateConnectionStatus({
        connected: false,
        authenticated: false,
        lastError: `Connection error: ${error.message} (${error.type || 'unknown'})`
      });

      // Only schedule reconnect for network-related errors
      if (error.type === 'TransportError' || error.type === 'TransportOpenError') {
        this.scheduleReconnect();
      } else {
        console.warn('⚠️ Not scheduling reconnect for non-network error:', error.type);
      }
    });

    this.socket.on('quick_check_update', (message: WebSocketMessage) => {
      console.log('📢 WebSocket: Quick check update received', message);
      this.emitToCallbacks('quick_check_update', message);
    });

    this.socket.on('timing_update', (message: WebSocketMessage) => {
      console.log('⏱️ WebSocket: Timing update received', message);
      this.emitToCallbacks('timing_update', message);
    });

    this.socket.on('status_update', (message: WebSocketMessage) => {
      console.log('📣 WebSocket: Status update received', message);
      this.emitToCallbacks('status_update', message);
    });

    this.socket.on('heartbeat', (data: any) => {
      console.log('💓 WebSocket: Heartbeat received', data);
      this.updateConnectionStatus({
        ...this.connectionStatus,
        connectedClients: data.serverStats?.connectedClients || 0
      });
      this.emitToCallbacks('heartbeat', data);
    });

    this.socket.on('user_connected', (data: any) => {
      console.log('👤 WebSocket: User connected', data);
      this.emitToCallbacks('user_connected', data);
    });

    this.socket.on('pong', () => {
      // Response to our ping - connection is healthy
    });
  }

  // Authenticate with the server
  private authenticate(): void {
    if (!this.socket || !this.token) return;

    const userInfo = {
      name: localStorage.getItem('userName') || 'Unknown User',
      page: window.location.pathname,
      userAgent: navigator.userAgent
    };

    console.log('🔐 WebSocket: Authenticating...');
    this.socket.emit('authenticate', {
      token: this.token,
      userInfo
    });
  }

  // Schedule reconnection with exponential backoff
  private scheduleReconnect(): void {
    if (this.isReconnecting || this.reconnectAttempts >= this.maxReconnectAttempts) {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('❌ WebSocket: Max reconnect attempts reached');
        this.updateConnectionStatus({
          ...this.connectionStatus,
          lastError: 'Max reconnect attempts reached'
        });
      }
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;
    
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), this.maxReconnectDelay);
    
    console.log(`🔄 WebSocket: Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    this.updateConnectionStatus({
      ...this.connectionStatus,
      reconnecting: true
    });

    this.reconnectTimer = setTimeout(() => {
      console.log(`🔄 WebSocket: Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      this.connect();
    }, delay);
  }

  // Start heartbeat/ping to keep connection alive
  private startHeartbeat(): void {
    this.pingTimer = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping');
      }
    }, 30000); // Every 30 seconds
  }

  // Clear all timers
  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  // Update connection status and notify callbacks
  private updateConnectionStatus(newStatus: Partial<ConnectionStatus>): void {
    this.connectionStatus = { ...this.connectionStatus, ...newStatus };
    this.statusCallbacks.forEach(callback => {
      try {
        callback(this.connectionStatus);
      } catch (error) {
        console.error('Error in status callback:', error);
      }
    });
  }

  // Emit events to registered callbacks
  private emitToCallbacks(eventType: string, data: any): void {
    const callbacks = this.eventCallbacks.get(eventType) || [];
    callbacks.forEach(callback => {
      try {
        callback({ type: eventType as any, ...data });
      } catch (error) {
        console.error(`Error in ${eventType} callback:`, error);
      }
    });
  }

  // Subscribe to WebSocket events
  on(eventType: string, callback: WebSocketEventCallback): () => void {
    if (!this.eventCallbacks.has(eventType)) {
      this.eventCallbacks.set(eventType, []);
    }
    this.eventCallbacks.get(eventType)!.push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.eventCallbacks.get(eventType);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  // Subscribe to connection status changes
  onStatusChange(callback: ConnectionStatusCallback): () => void {
    this.statusCallbacks.push(callback);
    
    // Call immediately with current status
    callback(this.connectionStatus);

    // Return unsubscribe function
    return () => {
      const index = this.statusCallbacks.indexOf(callback);
      if (index > -1) {
        this.statusCallbacks.splice(index, 1);
      }
    };
  }

  // Send client info update
  updateClientInfo(info: any): void {
    if (this.socket?.connected && this.connectionStatus.authenticated) {
      this.socket.emit('client_info', info);
    }
  }

  // Get current connection status
  getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  // Check if connected and authenticated
  isConnected(): boolean {
    return this.connectionStatus.connected && this.connectionStatus.authenticated;
  }

  // Force reconnection
  reconnect(): void {
    console.log('🔄 Manual reconnect requested');
    this.disconnect();
    
    // Update base URL in case hostname has changed
    const protocol = 'https';
    const hostname = window.location.hostname;
    const port = import.meta.env.DEV ? '5001' : '5001';
    this.baseUrl = `${protocol}://${hostname}:${port}`;
    
    console.log('🔄 Updated WebSocket base URL:', this.baseUrl);
    
    setTimeout(() => {
      this.reconnectAttempts = 0;
      this.connect();
    }, 1000);
  }

  // Update base URL dynamically (for network changes)
  updateBaseUrl(): void {
    const protocol = 'https';
    const hostname = window.location.hostname;
    const port = import.meta.env.DEV ? '5001' : '5001';
    const newBaseUrl = `${protocol}://${hostname}:${port}`;
    
    if (newBaseUrl !== this.baseUrl) {
      console.log('🌐 Hostname changed, updating WebSocket URL:', {
        old: this.baseUrl,
        new: newBaseUrl
      });
      this.baseUrl = newBaseUrl;
      
      // Reconnect with new URL if currently connected
      if (this.socket?.connected) {
        this.reconnect();
      }
    }
  }

  // Emit custom events to server
  emit(eventType: string, data: any): void {
    if (this.socket?.connected && this.connectionStatus.authenticated) {
      console.log(`📤 WebSocket: Emitting ${eventType}`, data);
      this.socket.emit(eventType, data);
    } else {
      console.warn(`⚠️ WebSocket: Cannot emit ${eventType} - not connected or authenticated`);
    }
  }

  // Check if we should be connected and attempt connection if needed
  checkAndConnect(): void {
    const token = localStorage.getItem('token');
    if (token && !this.socket?.connected && !this.isReconnecting) {
      console.log('🔍 WebSocket: Checking connection status - attempting to connect');
      this.connect(token);
    } else if (!token) {
      console.log('🔍 WebSocket: No token available for connection');
    } else if (this.socket?.connected) {
      console.log('🔍 WebSocket: Already connected');
    } else if (this.isReconnecting) {
      console.log('🔍 WebSocket: Already attempting to reconnect');
    }
  }

  // Test connection function
  testConnection(): void {
    console.log('🧪 Testing WebSocket connection...');
    console.log('Current base URL:', this.baseUrl);
    console.log('Socket connected:', this.socket?.connected);
    console.log('Connection status:', this.connectionStatus);
    console.log('Token available:', !!this.token);
    
    if (this.socket?.connected) {
      console.log('✅ WebSocket is connected');
      this.socket.emit('ping');
    } else {
      console.log('❌ WebSocket is not connected');
      console.log('Attempting to connect...');
      if (this.token) {
        this.connect(this.token);
      } else {
        console.log('No token available for connection');
      }
    }
  }

  // Get connection info for debugging
  getConnectionInfo(): any {
    return {
      baseUrl: this.baseUrl,
      connected: this.socket?.connected || false,
      authenticated: this.connectionStatus.authenticated,
      token: !!this.token,
      status: this.connectionStatus,
      hostname: window.location.hostname,
      port: window.location.port
    };
  }
}

// Create singleton instance
const websocketService = new WebSocketService();

// Export for debugging
export { websocketService };

export default websocketService; 