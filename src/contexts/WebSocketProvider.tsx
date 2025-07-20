import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import websocketService, { 
  ConnectionStatus, 
  WebSocketEventCallback,
  QuickCheckUpdateData 
} from '../services/websocketService';

interface WebSocketContextType {
  connectionStatus: ConnectionStatus;
  isConnected: boolean;
  reconnect: () => void;
  disconnect: () => void;
  subscribe: (eventType: string, callback: WebSocketEventCallback) => () => void;
  quickCheckUpdates: QuickCheckUpdateData | null;
  lastUpdate: Date | null;
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
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    authenticated: false,
    reconnecting: false
  });
  const [quickCheckUpdates, setQuickCheckUpdates] = useState<QuickCheckUpdateData | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [connectionAttempted, setConnectionAttempted] = useState(false);

  // Handle connection status changes
  useEffect(() => {
    const unsubscribeStatus = websocketService.onStatusChange((status) => {
      console.log('🔌 WebSocket status changed:', status);
      setConnectionStatus(status);
    });

    return unsubscribeStatus;
  }, []);

  // Enhanced auto-connect logic with better token handling
  useEffect(() => {
    if (!autoConnect || connectionAttempted) return;

    const attemptConnection = () => {
      const token = localStorage.getItem('token');
      if (token) {
        console.log('🔗 Auto-connecting WebSocket with token');
        setConnectionAttempted(true);
        websocketService.connect(token);
      } else {
        console.warn('⚠️ No token found for WebSocket connection');
        // Try again after a short delay in case token is being set
        setTimeout(() => {
          const retryToken = localStorage.getItem('token');
          if (retryToken && !connectionAttempted) {
            console.log('🔗 Retrying WebSocket connection with token');
            setConnectionAttempted(true);
            websocketService.connect(retryToken);
          }
        }, 1000);
      }
    };

    // Attempt connection immediately
    attemptConnection();

    // Also listen for token changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token' && e.newValue && !connectionAttempted) {
        console.log('🔗 Token detected, connecting WebSocket');
        setConnectionAttempted(true);
        websocketService.connect(e.newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Cleanup on unmount
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      websocketService.disconnect();
    };
  }, [autoConnect, connectionAttempted]);

  // Reset connection attempt flag when token changes
  useEffect(() => {
    const checkTokenAndReset = () => {
      const token = localStorage.getItem('token');
      if (token && !connectionStatus.connected && !connectionStatus.reconnecting) {
        console.log('🔄 Token available but not connected, resetting connection attempt');
        setConnectionAttempted(false);
        // Also try to connect directly
        websocketService.checkAndConnect();
      }
    };

    // Check periodically for token availability and connection status
    const interval = setInterval(checkTokenAndReset, 5000);

    return () => clearInterval(interval);
  }, [connectionStatus.connected, connectionStatus.reconnecting]);

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
      console.log('📢 Quick check update received in provider:', message);
      
      if (message.data) {
        setQuickCheckUpdates(message.data);
        setLastUpdate(new Date());
      }
    });

    // Listen for authentication events
    const unsubscribeAuth = websocketService.on('authenticated', (message) => {
      console.log('✅ WebSocket authenticated in provider:', message);
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

  const contextValue: WebSocketContextType = {
    connectionStatus,
    isConnected,
    reconnect,
    disconnect,
    subscribe,
    quickCheckUpdates,
    lastUpdate
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

export default WebSocketProvider; 