import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import websocketService, { 
  ConnectionStatus, 
  WebSocketMessage, 
  WebSocketEventCallback,
  QuickCheckUpdateData 
} from '../services/websocketService';
import { getItem } from '../services/safariStorage';
import { debug } from '../services/debugManager';

export interface ServiceConnectionStatus {
  connected: boolean;
  lastUpdate: Date | null;
  lastError?: string;
}

interface WebSocketContextType {
  connectionStatus: ConnectionStatus;
  isConnected: boolean;
  reconnect: () => void;
  disconnect: () => void;
  subscribe: (eventType: string, callback: WebSocketEventCallback) => () => void;
  quickCheckUpdates: QuickCheckUpdateData | null;
  lastUpdate: Date | null;
  // Individual service connection statuses
  quickCheckServiceStatus: ServiceConnectionStatus;
  staticStickerServiceStatus: ServiceConnectionStatus;
  generatedLabelServiceStatus: ServiceConnectionStatus;
  // Overall status - all services must be connected
  allServicesConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

interface WebSocketProviderProps {
  children: ReactNode;
  autoConnect?: boolean;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ 
  children, 
  autoConnect = true 
}) => {
  // Add unique identifier for debugging
  const providerId = React.useMemo(() => Math.random().toString(36).substr(2, 9), []);
  
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    authenticated: false,
    reconnecting: false
  });
  const [quickCheckUpdates, setQuickCheckUpdates] = useState<QuickCheckUpdateData | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [connectionAttempted, setConnectionAttempted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Individual service connection statuses
  const [quickCheckServiceStatus, setQuickCheckServiceStatus] = useState<ServiceConnectionStatus>({
    connected: false,
    lastUpdate: null
  });
  const [staticStickerServiceStatus, setStaticStickerServiceStatus] = useState<ServiceConnectionStatus>({
    connected: false,
    lastUpdate: null
  });
  const [generatedLabelServiceStatus, setGeneratedLabelServiceStatus] = useState<ServiceConnectionStatus>({
    connected: false,
    lastUpdate: null
  });

  // Handle connection status changes
  useEffect(() => {
    debug.log('websocket', `WebSocket Provider ${providerId}: Initializing`);
    
    const unsubscribeStatus = websocketService.onStatusChange((status) => {
      debug.log('websocket', `WebSocket Provider ${providerId}: Status changed:`, status);
      setConnectionStatus(status);
      
      // Update service statuses based on WebSocket connection
      if (status.connected && status.authenticated) {
        // All services are available when WebSocket is connected and authenticated
        setQuickCheckServiceStatus(prev => ({ ...prev, connected: true, lastUpdate: new Date() }));
        setStaticStickerServiceStatus(prev => ({ ...prev, connected: true, lastUpdate: new Date() }));
        setGeneratedLabelServiceStatus(prev => ({ ...prev, connected: true, lastUpdate: new Date() }));
      } else {
        // Reset service statuses when WebSocket disconnects
        setQuickCheckServiceStatus(prev => ({ ...prev, connected: false }));
        setStaticStickerServiceStatus(prev => ({ ...prev, connected: false }));
        setGeneratedLabelServiceStatus(prev => ({ ...prev, connected: false }));
      }
    });

    return () => {
      debug.log('websocket', `WebSocket Provider ${providerId}: Status listener cleanup`);
      unsubscribeStatus();
    };
  }, [providerId]);

  // Check authentication status
  useEffect(() => {
    const checkAuthStatus = () => {
      const token = getItem('token');
      const userName = getItem('userName');
      const isAuth = !!(token && userName);
      setIsAuthenticated(isAuth);
      
      if (isAuth && !connectionStatus.connected && !connectionStatus.reconnecting && !connectionAttempted) {
        debug.log('websocket', `WebSocket Provider ${providerId}: User authenticated, attempting WebSocket connection`);
        setConnectionAttempted(true);
        websocketService.connect(token);
      }
    };

    // Check immediately
    checkAuthStatus();

    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token' || e.key === 'userName') {
        checkAuthStatus();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also check periodically for token changes (for same-tab updates)
    const interval = setInterval(checkAuthStatus, 5000); // Reduced frequency to prevent excessive checks

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []); // Remove dependencies to prevent unnecessary re-renders

  // Enhanced auto-connect logic with better token handling
  useEffect(() => {
    if (!autoConnect || connectionAttempted) return;

    const attemptConnection = () => {
      const token = getItem('token');
      const userName = getItem('userName');
      
      if (token && userName) {
        debug.log('websocket', 'Auto-connecting WebSocket with token');
        setConnectionAttempted(true);
        websocketService.connect(token);
      } else {
        // Only log this as debug info, not a warning, since it's expected on initial load
        console.log(`ℹ️ WebSocket Provider ${providerId}: No authentication token available for WebSocket connection (expected on initial load)`);
      }
    };

    // Attempt connection immediately
    attemptConnection();
  }, [autoConnect, connectionAttempted]);

  // Reset connection attempt flag when token changes
  useEffect(() => {
    const checkTokenAndReset = () => {
      const token = getItem('token');
      const userName = getItem('userName');
      
      if (token && userName && !connectionStatus.connected && !connectionStatus.reconnecting) {
        console.log('🔄 Token available but not connected, resetting connection attempt');
        setConnectionAttempted(false);
      }
    };

    const interval = setInterval(checkTokenAndReset, 5000);
    return () => clearInterval(interval);
  }, [connectionStatus.connected, connectionStatus.reconnecting]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log(`🔚 WebSocket Provider ${providerId}: Unmounting, disconnecting`);
      websocketService.disconnect();
    };
  }, [providerId]);

  // Check for hostname changes and update WebSocket URL if needed
  useEffect(() => {
    const checkHostnameChange = () => {
      websocketService.updateBaseUrl();
    };

    // Check every 30 seconds for hostname changes
    const interval = setInterval(checkHostnameChange, 30000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // Listen for quick check updates
  useEffect(() => {
    const unsubscribeQuickCheck = websocketService.on('quick_check_update', (message) => {
      debug.log('websocket', 'Quick check update received in provider:', message);
      
      // Update last update timestamp when messages are received
      setQuickCheckServiceStatus(prev => ({
        ...prev,
        lastUpdate: new Date()
      }));
      
      // DISABLED: Only update timestamps, not data processing to prevent duplicate handling
      // Data processing should only happen in Home.tsx to avoid race conditions
      // if (message.data) {
      //   setQuickCheckUpdates(message.data);
      //   setLastUpdate(new Date());
      // }
      setLastUpdate(new Date());
    });

    // Listen for static sticker updates
    const unsubscribeStaticSticker = websocketService.on('static_sticker_update', (message) => {
      console.log('🏷️ Static sticker update received in provider:', message);
      
      // Update last update timestamp when messages are received
      setStaticStickerServiceStatus(prev => ({
        ...prev,
        lastUpdate: new Date()
      }));
      
      // You can add global static sticker notifications here
      if (message.action === 'created') {
        console.log('🆕 New static sticker created:', message.data);
      }
    });

    // Listen for generated label updates
    const unsubscribeGeneratedLabel = websocketService.on('generated_label_update', (message) => {
      console.log('🏷️ Generated label update received in provider:', message);
      
      // Update last update timestamp when messages are received
      setGeneratedLabelServiceStatus(prev => ({
        ...prev,
        lastUpdate: new Date()
      }));
      
      // You can add global generated label notifications here
      if (message.action === 'created') {
        console.log('🆕 New generated label created:', message.data);
      }
    });

    // Listen for print client summary to update print client status immediately
    const unsubscribePrintClientSummary = websocketService.on('print_client_summary', (message: any) => {
      const anyOnline = message.anyOnline === true;
      const now = new Date();
      setStaticStickerServiceStatus(prev => ({ ...prev, lastUpdate: now }));
      setGeneratedLabelServiceStatus(prev => ({ ...prev, lastUpdate: now }));
      setQuickCheckServiceStatus(prev => ({ ...prev, lastUpdate: now }));
      // When print client reported offline, treat services as not all connected
      if (!anyOnline) {
        // Flip services off to force header to reflect offline state
        setStaticStickerServiceStatus(prev => ({ ...prev, connected: false }));
        setGeneratedLabelServiceStatus(prev => ({ ...prev, connected: false }));
        setQuickCheckServiceStatus(prev => ({ ...prev, connected: false }));
      }
    });

    // Listen for authentication events
    const unsubscribeAuth = websocketService.on('authenticated', (message) => {
      debug.log('websocket', 'WebSocket authenticated in provider:', message);
    });

    const unsubscribeAuthError = websocketService.on('auth_error', (message) => {
      console.error('❌ WebSocket authentication error in provider:', message);
      // Reset connection attempt on auth error to allow retry
      setConnectionAttempted(false);
    });

    // Listen for status updates
    const unsubscribeStatus = websocketService.on('status_update', (message) => {
      console.log('📣 Status update received in provider:', message);
      
      // You can add global status notifications here
      if (message.statusType === 'error') {
        console.error('Server error:', message.message);
      }
    });

    return () => {
      unsubscribeQuickCheck();
      unsubscribeStaticSticker();
      unsubscribeGeneratedLabel();
      unsubscribePrintClientSummary();
      unsubscribeAuth();
      unsubscribeAuthError();
      unsubscribeStatus();
    };
  }, []);

  // Reconnect function
  const reconnect = useCallback(() => {
    console.log('🔄 Manual reconnect requested');
    setConnectionAttempted(false);
    websocketService.reconnect();
  }, []);

  // Disconnect function
  const disconnect = useCallback(() => {
    console.log('🔚 Manual disconnect requested');
    websocketService.disconnect();
  }, []);

  // Subscribe function to allow components to listen to specific events
  const subscribe = useCallback((eventType: string, callback: WebSocketEventCallback) => {
    return websocketService.on(eventType, callback);
  }, []);

  // Derived state
  const isConnected = connectionStatus.connected && connectionStatus.authenticated;
  
  // Calculate overall service connection status
  const allServicesConnected = quickCheckServiceStatus.connected && 
                              staticStickerServiceStatus.connected && 
                              generatedLabelServiceStatus.connected;

  const contextValue: WebSocketContextType = {
    connectionStatus,
    isConnected,
    reconnect,
    disconnect,
    subscribe,
    quickCheckUpdates,
    lastUpdate,
    quickCheckServiceStatus,
    staticStickerServiceStatus,
    generatedLabelServiceStatus,
    allServicesConnected
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

// Custom hook to use WebSocket context
export const useWebSocket = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

// Custom hook for Quick Check updates specifically
export const useQuickCheckUpdates = () => {
  const { quickCheckUpdates, lastUpdate, subscribe } = useWebSocket();
  
  const [updates, setUpdates] = useState<QuickCheckUpdateData[]>([]);

  useEffect(() => {
    if (quickCheckUpdates) {
      setUpdates(prev => {
        // Keep only the last 10 updates to prevent memory leaks
        const newUpdates = [quickCheckUpdates, ...prev].slice(0, 10);
        return newUpdates;
      });
    }
  }, [quickCheckUpdates]);

  const subscribeToUpdates = useCallback((callback: (update: QuickCheckUpdateData) => void) => {
    return subscribe('quick_check_update', (message) => {
      if (message.data) {
        callback(message.data);
      }
    });
  }, [subscribe]);

  return {
    latestUpdate: quickCheckUpdates,
    updates,
    lastUpdate,
    subscribeToUpdates
  };
};

// Custom hook for Static Sticker updates specifically
export const useStaticStickerUpdates = () => {
  const { subscribe } = useWebSocket();
  
  const [updates, setUpdates] = useState<any[]>([]);
  const [latestUpdate, setLatestUpdate] = useState<any>(null);

  const subscribeToUpdates = useCallback((callback: (update: any) => void) => {
    return subscribe('static_sticker_update', (message) => {
      if (message.data) {
        setLatestUpdate(message.data);
        setUpdates(prev => {
          // Keep only the last 10 updates to prevent memory leaks
          const newUpdates = [message.data, ...prev].slice(0, 10);
          return newUpdates;
        });
        callback(message.data);
      }
    });
  }, [subscribe]);

  return {
    latestUpdate,
    updates,
    subscribeToUpdates
  };
};

// Custom hook for Generated Label updates specifically
export const useGeneratedLabelUpdates = () => {
  const { subscribe } = useWebSocket();
  
  const [updates, setUpdates] = useState<any[]>([]);
  const [latestUpdate, setLatestUpdate] = useState<any>(null);

  const subscribeToUpdates = useCallback((callback: (update: any) => void) => {
    return subscribe('generated_label_update', (message) => {
      if (message.data) {
        setLatestUpdate(message.data);
        setUpdates(prev => {
          // Keep only the last 10 updates to prevent memory leaks
          const newUpdates = [message.data, ...prev].slice(0, 10);
          return newUpdates;
        });
        callback(message.data);
      }
    });
  }, [subscribe]);

  return {
    latestUpdate,
    updates,
    subscribeToUpdates
  };
};

export default WebSocketProvider; 