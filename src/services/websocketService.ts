import { io, Socket } from 'socket.io-client';
import { debug } from './debugManager';

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
  type: 'quick_check_update' | 'static_sticker_update' | 'generated_label_update' | 'timing_update' | 'status_update' | 'heartbeat' | 'user_connected' | 'authenticated' | 'auth_error';
  action?: 'created' | 'updated' | 'deleted' | 'archived' | 'printed';
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
    // Use the same protocol as the current page to avoid mixed content issues
    const protocol = window.location.protocol === 'https:' ? 'https' : 'http';
    const hostname = window.location.hostname;
    
    // Production: use api.autoflopro.com subdomain
    if (hostname === 'autoflopro.com' || hostname === 'www.autoflopro.com') {
      this.baseUrl = 'https://api.autoflopro.com';
    } else {
      // Development/other: use port 5001
      this.baseUrl = `${protocol}://${hostname}:5001`;
    }
    
    debug.log('websocket', 'WebSocket service initialized with base URL:', this.baseUrl);
    debug.log('websocket', 'Dynamic hostname detection:', hostname);
    debug.log('websocket', 'Current location:', window.location.href);
    debug.log('websocket', 'Hostname:', window.location.hostname);
    debug.log('websocket', 'Protocol:', protocol);
    debug.log('websocket', 'WebSocket will connect to:', this.baseUrl);
    
    // Check for immediate connection if token is available
    const token = localStorage.getItem('token');
    const userName = localStorage.getItem('userName');
    if (token && userName) {
      debug.log('websocket', 'Token found in constructor, attempting immediate connection');
      // Use setTimeout to ensure the service is fully initialized
      setTimeout(() => {
        this.connect(token);
      }, 100);
    } else {
      debug.log('websocket', 'No authentication token available in constructor (expected on initial load)');
    }
  }

  // Initialize connection
  connect(token?: string): void {
    if (token) {
      this.token = token;
    }

    if (!this.token) {
      debug.error('websocket', 'No token provided for authentication');
      this.updateConnectionStatus({ 
        connected: false, 
        authenticated: false, 
        lastError: 'No authentication token provided' 
      });
      return;
    }

    if (this.socket?.connected) {
      debug.log('websocket', 'Already connected');
      return;
    }

    // Clear any existing connection
    if (this.socket) {
      debug.log('websocket', 'Clearing existing socket connection');
      this.socket.disconnect();
      this.socket = null;
    }

    debug.log('websocket', 'Connecting to', this.baseUrl);
    debug.log('websocket', 'WebSocket connection details:', {
      baseUrl: this.baseUrl,
      hostname: window.location.hostname,
      port: window.location.port,
      protocol: window.location.protocol,
      fullUrl: window.location.href
    });
    
    try {
      this.socket = io(this.baseUrl, {
        auth: {
          token: this.token
        },
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true, // Force new connection
        autoConnect: true,
        reconnection: false, // We'll handle reconnection manually
        // Use HTTPS when the page is served over HTTPS
        secure: window.location.protocol === 'https:',
        // Add extra headers if needed
        extraHeaders: {
          'Accept': 'application/json',
          'User-Agent': 'QuickCheck-WebSocket-Client'
        }
      });

      this.setupEventHandlers();
    } catch (error) {
      debug.error('websocket', 'Failed to create socket connection:', error);
      this.updateConnectionStatus({
        connected: false,
        authenticated: false,
        lastError: `Connection failed: ${error}`
      });
    }
  }

  // Disconnect
  disconnect(): void {
    debug.log('websocket', 'Disconnecting');
    
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
      debug.log('websocket', 'Connected');
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
      debug.log('websocket', 'Disconnected -', reason);
      
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
      debug.log('websocket', 'Authenticated', data);
      
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
      debug.error('websocket', 'Authentication failed', error);
      
      this.updateConnectionStatus({
        connected: this.socket?.connected || false,
        authenticated: false,
        lastError: `Authentication failed: ${error.message}`
      });

      this.emitToCallbacks('auth_error', error);
    });

    this.socket.on('connect_error', (error: any) => {
      debug.error('websocket', 'Connection error', error);
      debug.error('websocket', 'Connection details:', {
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
        debug.warn('websocket', 'Not scheduling reconnect for non-network error:', error.type);
      }
    });

    this.socket.on('quick_check_update', (message: WebSocketMessage) => {
      debug.log('websocket', 'Quick check update received', message);
      this.emitToCallbacks('quick_check_update', message);
    });

    this.socket.on('static_sticker_update', (message: WebSocketMessage) => {
      debug.log('websocket', 'Static sticker update received', message);
      this.emitToCallbacks('static_sticker_update', message);
    });

    this.socket.on('generated_label_update', (message: WebSocketMessage) => {
      debug.log('websocket', 'Generated label update received', message);
      this.emitToCallbacks('generated_label_update', message);
    });

    this.socket.on('timing_update', (message: WebSocketMessage) => {
      debug.log('websocket', 'Timing update received', message);
      this.emitToCallbacks('timing_update', message);
    });

    this.socket.on('status_update', (message: WebSocketMessage) => {
      debug.log('websocket', 'Status update received', message);
      this.emitToCallbacks('status_update', message);
    });

    this.socket.on('heartbeat', (data: any) => {
      debug.log('websocket', 'Heartbeat received', data);
      this.updateConnectionStatus({
        ...this.connectionStatus,
        connectedClients: data.serverStats?.connectedClients || 0
      });
      this.emitToCallbacks('heartbeat', data);
    });

    this.socket.on('user_connected', (data: any) => {
      debug.log('websocket', 'User connected', data);
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

    debug.log('websocket', 'Authenticating...');
    this.socket.emit('authenticate', {
      token: this.token,
      userInfo
    });
  }

  // Schedule reconnection with exponential backoff
  private scheduleReconnect(): void {
    if (this.isReconnecting || this.reconnectAttempts >= this.maxReconnectAttempts) {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        debug.error('websocket', 'Max reconnect attempts reached');
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
    
    debug.log('websocket', `Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    this.updateConnectionStatus({
      ...this.connectionStatus,
      reconnecting: true
    });

    this.reconnectTimer = setTimeout(() => {
      debug.log('websocket', `Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
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
    const hostname = window.location.hostname;
    
    // Production: use api.autoflopro.com subdomain
    if (hostname === 'autoflopro.com' || hostname === 'www.autoflopro.com') {
      this.baseUrl = 'https://api.autoflopro.com';
    } else {
      // Development/other: use port 5001
      const protocol = 'https';
      this.baseUrl = `${protocol}://${hostname}:5001`;
    }
    
    debug.log('websocket', 'Updated WebSocket base URL:', this.baseUrl);
    
    setTimeout(() => {
      this.reconnectAttempts = 0;
      this.connect();
    }, 1000);
  }

  // Update base URL dynamically (for network changes)
  updateBaseUrl(): void {
    const hostname = window.location.hostname;
    let newBaseUrl: string;
    
    // Production: use api.autoflopro.com subdomain
    if (hostname === 'autoflopro.com' || hostname === 'www.autoflopro.com') {
      newBaseUrl = 'https://api.autoflopro.com';
    } else {
      // Development/other: use port 5001
      const protocol = 'https';
      newBaseUrl = `${protocol}://${hostname}:5001`;
    }
    
    if (newBaseUrl !== this.baseUrl) {
      debug.log('websocket', 'Hostname changed, updating WebSocket URL:', {
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
      debug.log('websocket', `Emitting ${eventType}`, data);
      this.socket.emit(eventType, data);
    } else {
      debug.warn('websocket', `Cannot emit ${eventType} - not connected or authenticated`);
    }
  }

  // Check if we should be connected and attempt connection if needed
  checkAndConnect(): void {
    const token = localStorage.getItem('token');
    const userName = localStorage.getItem('userName');
    
    if (token && userName && !this.socket?.connected && !this.isReconnecting) {
      debug.log('websocket', 'Checking connection status - attempting to connect');
      this.connect(token);
    } else if (!token || !userName) {
      debug.log('websocket', 'No authentication token available for connection');
    } else if (this.socket?.connected) {
      debug.log('websocket', 'Already connected');
    } else if (this.isReconnecting) {
      debug.log('websocket', 'Already attempting to reconnect');
    }
  }

  // Test connection function
  testConnection(): void {
    debug.log('websocket', 'Testing WebSocket connection...');
    debug.log('websocket', 'Current base URL:', this.baseUrl);
    console.log('Socket connected:', this.socket?.connected);
    console.log('Connection status:', this.connectionStatus);
    console.log('Token available:', !!this.token);
    console.log('User name available:', !!localStorage.getItem('userName'));
    
    if (this.socket?.connected) {
      debug.log('websocket', 'WebSocket is connected');
      this.socket.emit('ping');
    } else {
      debug.log('websocket', 'WebSocket is not connected');
      debug.log('websocket', 'Attempting to connect...');
      const token = localStorage.getItem('token');
      const userName = localStorage.getItem('userName');
      if (token && userName) {
        this.connect(token);
      } else {
        console.log('No authentication token available for connection');
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
      userName: !!localStorage.getItem('userName'),
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