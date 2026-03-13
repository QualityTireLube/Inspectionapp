import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useWebSocket } from '../contexts/WebSocketProvider';
import { websocketService } from '../services/websocketService';
import { debug } from '../services/debugManager';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Paper,
  FormControlLabel,
  Switch,
  Badge,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  Build as BuildIcon,
  DirectionsCar as CarIcon,
  Person as PersonIcon,
  AttachMoney as MoneyIcon,
  Schedule as ScheduleIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  Assignment as AssignmentIcon,
  Info as InfoIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
  Note as StickerIcon,
  Wifi as WifiIcon,
  WifiOff as WifiOffIcon,
  Sync as SyncIcon,
  SyncDisabled as SyncDisabledIcon,
  Notifications as NotificationsIcon,
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  Work as WorkIcon,
} from '@mui/icons-material';
import { axiosInstance } from '../services/api';
import { StickerStorageService } from '../services/stickerStorage';
import { PDFGeneratorService } from '../services/pdfGenerator';
import { VinDecoderService } from '../services/vinDecoder';

interface WorkflowOrder {
  id: string;
  number?: number;
  name?: string;
  generatedName?: string;
  coalescedName?: string;
  status: string;
  workflowStatusId?: string;
  workflowStatusPosition?: number;
  totalCostCents?: number;
  createdDate?: string;
  updatedDate?: string;
  orderCreatedDate?: string;
  archived?: boolean;
  authorized?: boolean;
  invoiced?: boolean;
  paid?: boolean;
  inspectionStatus?: string;
  assignedTechnicianIds?: string[];
  complaint?: string;
  recommendation?: string;
  purchaseOrderNumber?: string;
  customer?: {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
    companyName?: string | null;
    address1?: string | null;
    city?: string | null;
    state?: string | null;
    emails?: Array<{
      email: string;
      primary: boolean;
    }>;
    phoneNumbers?: Array<{
      number: string;
      primary: boolean;
      type?: string | null;
    }>;
  };
  vehicle?: {
    id?: string;
    year?: number | null;
    make?: string | null;
    model?: string | null;
    submodel?: string | null;
    vin?: string | null;
    licensePlate?: string | null;
    licensePlateState?: string | null;
    mileage?: number | null;
    mileageUnit?: string;
    color?: string | null;
  };
  workflowStatus?: {
    id: string;
    name: string;
    position: number;
  };
  labelConnections?: Array<{
    label: {
      id: string;
      name: string;
      color: string;
    };
  }>;
  labels?: Array<{
    id: string;
    name: string;
    color: string;
    saved?: boolean;
  }>;
  // Legacy fields for backward compatibility
  customerName?: string;
  vehicleInfo?: string;
  createdAt: string;
  updatedAt: string;
}

interface WorkflowStatus {
  id: string;
  name: string;
  position: number;
  companyId: string;
  locationId: string;
  createdDate: string;
  updatedDate: string;
  daysToArchive?: number;
  archiveWhenInactive?: boolean;
  archiveWhenPaid?: boolean;
  invoiceWorkflow?: boolean;
  repairOrderWorkflow?: boolean;
  color?: string;
  meta?: {
    userId?: string;
    sessionId?: string;
    version?: number;
  };
  metadata?: any;
}

interface OilStickerMapping {
  id: string;
  cannedServiceName: string;
  oilType: string;
}

interface GroupedOrders {
  [statusName: string]: WorkflowOrder[];
}

interface LoginCredentials {
  email: string;
  password: string;
  audience: string;
}

interface LoginResponse {
  token: string;
  expiresAt: string;
}

interface ShopMonkeyOrdersSectionProps {
  stickerPrintMethod?: 'pdf' | 'queue' | 'queue-fallback';
  stickerPrinterId?: string;
  stickerPrintOrientation?: 'portrait' | 'landscape';
  stickerPrintAutoPrint?: boolean;
}

const ShopMonkeyOrdersSection: React.FC<ShopMonkeyOrdersSectionProps> = ({
  stickerPrintMethod = 'pdf',
  stickerPrinterId = '',
  stickerPrintOrientation = 'portrait',
  stickerPrintAutoPrint = false
}) => {
  // Add CSS animation for loading shimmer effect
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes loading-shimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
    `;
    document.head.appendChild(style);
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);
  const navigate = useNavigate();
  const [orders, setOrders] = useState<WorkflowOrder[]>([]);
  const [statuses, setStatuses] = useState<WorkflowStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [oilStickerMappings, setOilStickerMappings] = useState<OilStickerMapping[]>([]);
  const [printingSticker, setPrintingSticker] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<WorkflowOrder | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [servicesDialogOpen, setServicesDialogOpen] = useState(false);
  const [selectedOrderServices, setSelectedOrderServices] = useState<any[]>([]);
  
  // Detailed services cache for oil type detection
  const [detailedServicesCache, setDetailedServicesCache] = useState<Record<string, any[]>>({});
  
  // Manual oil type selection dialog
  const [showOilTypeDialog, setShowOilTypeDialog] = useState(false);
  const [selectedOilTypeId, setSelectedOilTypeId] = useState<string>('');
  const [pendingOrderForOilType, setPendingOrderForOilType] = useState<WorkflowOrder | null>(null);
  const [detectedOilTypeName, setDetectedOilTypeName] = useState<string>('');

  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authToken, setAuthToken] = useState<string>('');
  const [loginCredentials, setLoginCredentials] = useState<LoginCredentials>({
    email: 'jzrx8swap@aol.com',
    password: '',
    audience: 'api'
  });
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string>('');
  const [showLoginDialog, setShowLoginDialog] = useState(false);

  // Rate limiting to prevent 429 errors
  const lastApiCallTime = useRef<number>(0);
  const apiCallCache = useRef<{ [key: string]: { data: any; timestamp: number } }>({});
  const MIN_API_INTERVAL = 2000; // Minimum 2 seconds between API calls
  const CACHE_DURATION = 15000; // Cache responses for 15 seconds

  // WebSocket and real-time update state
  const { connectionStatus } = useWebSocket();
  const [realTimeUpdatesEnabled, setRealTimeUpdatesEnabled] = useState(true);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds - reduced frequency to prevent rate limiting
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [refreshTimer, setRefreshTimer] = useState<NodeJS.Timeout | null>(null);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [updatingOrders, setUpdatingOrders] = useState<Set<string>>(new Set());
  const [showDebugControls, setShowDebugControls] = useState(false);
  const [updateNotifications, setUpdateNotifications] = useState<Array<{
    id: string;
    type: 'order_update' | 'status_change' | 'service_completion' | 'new_order';
    message: string;
    timestamp: Date;
    orderId?: string;
    orderNumber?: string;
  }>>([]);
  const [showUpdateHistory, setShowUpdateHistory] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState<Set<string>>(new Set());

  // Debug: Log showLoginDialog state changes
  useEffect(() => {
    console.log('showLoginDialog state changed to:', showLoginDialog);
  }, [showLoginDialog]);

  // Load oil sticker mappings from localStorage
  const loadOilStickerMappings = () => {
    try {
      const saved = localStorage.getItem('shopmonkey-oil-sticker-mappings');
      if (saved) {
        setOilStickerMappings(JSON.parse(saved));
      } else {
        // Load default mappings if none saved
        const defaultMappings: OilStickerMapping[] = [
          // HIGHEST PRIORITY: Mobil 1 (Premium synthetic)
          { id: '1', cannedServiceName: 'Oil Change Mobil 1 0W16', oilType: 'Mobil 1' },
          { id: '2', cannedServiceName: 'Oil Change Mobil 1 0W20', oilType: 'Mobil 1' },
          { id: '3', cannedServiceName: 'Oil Change Mobil 1 0W30', oilType: 'Mobil 1' },
          { id: '4', cannedServiceName: 'OIL Change Mobil 1 0W8', oilType: 'Mobil 1' },
          { id: '5', cannedServiceName: 'Oil Change Mobil 1', oilType: 'Mobil 1' },
          { id: '6', cannedServiceName: 'OIL Change Mobil 1', oilType: 'Mobil 1' },
          { id: '7', cannedServiceName: 'Mobil 1', oilType: 'Mobil 1' },
          { id: '8', cannedServiceName: 'mobil 1', oilType: 'Mobil 1' },
          { id: '9', cannedServiceName: 'mobil', oilType: 'Mobil 1' },
          
          // SECOND PRIORITY: Delvac 1 (Heavy duty synthetic)
          { id: '10', cannedServiceName: 'Oil Change Mobil 1 Delvac 5W40', oilType: 'Delvac 1' },
          { id: '11', cannedServiceName: 'Oil Change Mobil Delvac 1 5W40', oilType: 'Delvac 1' },
          { id: '12', cannedServiceName: 'Oil Change Mobil 1 Delvac', oilType: 'Delvac 1' },
          { id: '13', cannedServiceName: 'Oil Change Mobil Delvac 1', oilType: 'Delvac 1' },
          { id: '14', cannedServiceName: 'Mobil Delvac 1', oilType: 'Delvac 1' },
          { id: '15', cannedServiceName: 'Delvac', oilType: 'Delvac 1' },
          { id: '16', cannedServiceName: 'delvac', oilType: 'Delvac 1' },
          
          // THIRD PRIORITY: Super Synthetic (Mobil Super)
          { id: '17', cannedServiceName: 'Oil Change Mobil Super Synthetic 5W30', oilType: 'Super Synthetic' },
          { id: '18', cannedServiceName: 'Oil Change Mobil Super Synthetic', oilType: 'Super Synthetic' },
          { id: '19', cannedServiceName: 'Mobil Super Synthetic', oilType: 'Super Synthetic' },
          { id: '20', cannedServiceName: 'Mobil Full Synthetic', oilType: 'Super Synthetic' },
          { id: '21', cannedServiceName: 'Full Synthetic', oilType: 'Super Synthetic' },
          { id: '22', cannedServiceName: 'Synthetic', oilType: 'Super Synthetic' },
          { id: '23', cannedServiceName: 'synthetic', oilType: 'Super Synthetic' },
          
          // FOURTH PRIORITY: Rotella (Diesel/truck oil)
          { id: '24', cannedServiceName: 'Oil Change Rotella T4 15W40', oilType: 'Rotella' },
          { id: '25', cannedServiceName: 'Oil Change Rotella T4', oilType: 'Rotella' },
          { id: '26', cannedServiceName: 'Rotella T4', oilType: 'Rotella' },
          { id: '27', cannedServiceName: 'Rotella T6', oilType: 'Rotella' },
          { id: '28', cannedServiceName: 'Rotella', oilType: 'Rotella' },
          { id: '29', cannedServiceName: 'rotella', oilType: 'Rotella' },
          { id: '30', cannedServiceName: 'Diesel', oilType: 'Rotella' },
          
          // LOWEST PRIORITY: Conventional Oil (Fallback/generic)
          { id: '31', cannedServiceName: 'Oil Change Full Service 5W20', oilType: 'Conventional Oil' },
          { id: '32', cannedServiceName: 'Oil Change Full Service', oilType: 'Conventional Oil' },
          { id: '33', cannedServiceName: 'Full Service', oilType: 'Conventional Oil' },
          { id: '34', cannedServiceName: 'Conventional Service', oilType: 'Conventional Oil' },
          { id: '35', cannedServiceName: 'High Mileage', oilType: 'Conventional Oil' },
          { id: '36', cannedServiceName: 'Conventional', oilType: 'Conventional Oil' },
          { id: '37', cannedServiceName: 'Oil Change', oilType: 'Conventional Oil' },
          { id: '38', cannedServiceName: 'Lube', oilType: 'Conventional Oil' },
          { id: '39', cannedServiceName: 'Oil Service', oilType: 'Conventional Oil' },
          { id: '40', cannedServiceName: 'oil', oilType: 'Conventional Oil' },
          { id: '41', cannedServiceName: 'lube', oilType: 'Conventional Oil' },
          { id: '42', cannedServiceName: 'change', oilType: 'Conventional Oil' }
        ];
        setOilStickerMappings(defaultMappings);
        localStorage.setItem('shopmonkey-oil-sticker-mappings', JSON.stringify(defaultMappings));
      }
    } catch (error) {
      console.error('Failed to load oil sticker mappings:', error);
      setOilStickerMappings([]);
    }
    
    console.log('🔍 Oil sticker mappings loaded:', oilStickerMappings.length, 'mappings');
    if (oilStickerMappings.length > 0) {
      console.log('🔍 First few mappings:', oilStickerMappings.slice(0, 5).map(m => `${m.cannedServiceName} → ${m.oilType}`));
    }
  };

  // Fetch detailed services for an order (copied from ShopMonkey.tsx)
  const fetchDetailedServicesForOrder = async (orderId: string): Promise<any[]> => {
    try {
      const token = loadTokenFromStorage();
      if (!token) {
        debug.error('shopMonkey', 'No ShopMonkey token available');
        return [];
      }

      // Use the dedicated services endpoint instead of the order details endpoint
      const response = await axiosInstance.get(`/shopmonkey/order/${orderId}/service`, {
        headers: {
          'x-shopmonkey-token': token
        }
      });

      // console.log(`🔍 Detailed services API response for order ${orderId}:`, JSON.stringify(response.data, null, 2));
      console.log(`🔍 Response data type:`, typeof response.data);
      console.log(`🔍 Response data keys:`, Object.keys(response.data || {}));
      if (response.data && response.data.data) {
        console.log(`🔍 Nested data keys:`, Object.keys(response.data.data));
        console.log(`🔍 Nested data type:`, typeof response.data.data);
        if (Array.isArray(response.data.data)) {
          console.log(`🔍 Nested data is array with ${response.data.data.length} items`);
        }
      }
      
      // Handle different response structures
      let services: any[] = [];
      
      if (response.data && Array.isArray(response.data)) {
        services = response.data;
        console.log(`✅ Found services array directly in response: ${services.length} services`);
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        services = response.data.data;
        console.log(`✅ Found services in nested data structure: ${services.length} services`);
      } else if (response.data && response.data.services && Array.isArray(response.data.services)) {
        services = response.data.services;
        console.log(`✅ Found services in services property: ${services.length} services`);
      } else if (response.data && response.data.data && response.data.data.services && Array.isArray(response.data.data.services)) {
        services = response.data.data.services;
        console.log(`✅ Found services in data.services: ${services.length} services`);
      }
      
      if (services.length > 0) {
        console.log(`✅ Fetched ${services.length} detailed services for order ${orderId}`);
        return services;
      }
      
      // If no services found, return empty array
      
      return [];
    } catch (error) {
      console.error(`❌ Failed to fetch detailed services for order ${orderId}:`, error);
      return [];
    }
  };

  // Trigger detailed services fetch and cache them (now with error handling)
  const triggerDetailedServicesFetch = async (orderId: string) => {
    console.log(`🔄 Triggering detailed services fetch for order ${orderId}`);
    
    // Check if already cached
    if (detailedServicesCache[orderId]) {
      console.log(`✅ Detailed services already cached for order ${orderId}:`, detailedServicesCache[orderId].length);
      // Skip background refresh to reduce resource usage
      // fetchDetailedServicesForOrder(orderId).then(refreshed => {
      //   if (refreshed && refreshed.length > 0) {
      //     setDetailedServicesCache(prev => ({ ...prev, [orderId]: refreshed }));
      //   }
      // }).catch(() => {});
      return;
    }

    try {
      // Fetch and cache with error handling
      const services = await fetchDetailedServicesForOrder(orderId);
      if (services.length > 0) {
        setDetailedServicesCache(prev => ({
          ...prev,
          [orderId]: services
        }));
        console.log(`💾 Cached ${services.length} detailed services for order ${orderId}`);
      }
    } catch (error: any) {
      // Handle resource exhaustion gracefully
      if (error.code === 'ERR_NETWORK' || error.message?.includes('ERR_INSUFFICIENT_RESOURCES')) {
        console.warn(`⚠️ Resource exhaustion detected for order ${orderId}. Skipping service fetch to prevent system overload.`);
      } else {
        console.error(`❌ Failed to fetch services for order ${orderId}:`, error.message);
      }
    }
  };

  // Oil type detection functions (copied from ShopMonkey.tsx)
  const findOilTypeFromDetailedServices = (services: any[], enableLogging: boolean = false): string | null => {
    if (enableLogging) {
      console.log('🔧 Detailed services to check:', services.map((s, index) => `${index + 1}. "${s.name}"`));
    }

    // First, prioritize services that are clearly oil-related (contain "oil", "mobil", "synthetic", etc.)
    const priorityOilKeywords = ['oil', 'mobil', 'synthetic', 'rotella', 'delvac', 'lube'];
    
    // Separate services into oil-related and generic services
    const oilServices = services.filter(service => {
      const serviceName = service.name?.toLowerCase() || '';
      return priorityOilKeywords.some(keyword => serviceName.includes(keyword));
    });
    
    const genericServices = services.filter(service => {
      const serviceName = service.name?.toLowerCase() || '';
      return !priorityOilKeywords.some(keyword => serviceName.includes(keyword));
    });
    
    if (enableLogging) {
      console.log('🛢️ Oil-related services:', oilServices.map(s => s.name));
      console.log('📋 Generic services:', genericServices.map(s => s.name));
    }
    
    // Process oil-related services first (higher priority)
    const servicesToCheck = [...oilServices, ...genericServices];

    // Match services against oil sticker mappings
    for (let i = 0; i < servicesToCheck.length; i++) {
      const service = servicesToCheck[i];
      const serviceName = service.name?.toLowerCase() || '';
      
      if (!serviceName.trim()) {
        if (enableLogging) console.log(`⏭️ Skipping service #${i + 1}: Empty service name`);
        continue;
      }
      
      if (enableLogging) console.log(`🔍 Checking service #${i + 1}: "${service.name}" (lowercase: "${serviceName}")`);
      
      let bestMatch: { mapping: OilStickerMapping, score: number } | null = null;
      let bestMatchScore = 0;
      
      for (let mappingIndex = 0; mappingIndex < oilStickerMappings.length; mappingIndex++) {
        const mapping = oilStickerMappings[mappingIndex];
        const mappingName = mapping.cannedServiceName.toLowerCase();
        
        if (!mappingName.trim()) {
          continue;
        }
        
        let baseScore = 0;
        let matchType = 'none';
        
        // Add bonus for oil-related services to prioritize them
        const isOilService = priorityOilKeywords.some(keyword => serviceName.includes(keyword));
        const oilServiceBonus = isOilService ? 1000 : 0;
        
        if (serviceName === mappingName) {
          baseScore = 10000 + oilServiceBonus;
          matchType = 'EXACT';
        } else if (serviceName.includes(mappingName)) {
          baseScore = 5000 + mappingName.length + oilServiceBonus;
          matchType = 'service contains mapping';
        } else if (mappingName.includes(serviceName)) {
          baseScore = 3000 + serviceName.length + oilServiceBonus;
          matchType = 'mapping contains service';
        } else {
          const oilRelatedWords = ['oil', 'lube', 'mobil', 'synthetic', 'conventional', 'rotella', 'delvac', 'change', 'full'];
          const serviceWords = serviceName.split(/\s+/).filter((word: string) => 
            word.length > 2 && oilRelatedWords.includes(word.toLowerCase())
          );
          const mappingWords = mappingName.split(/\s+/).filter((word: string) => 
            word.length > 2 && oilRelatedWords.includes(word.toLowerCase())
          );
          
          const commonWords = serviceWords.filter((word: string) => 
            mappingWords.some((mappingWord: string) => 
              word.includes(mappingWord) || mappingWord.includes(word)
            )
          );
          
          if (commonWords.length > 0) {
            baseScore = 1000 + (commonWords.length * 10) + oilServiceBonus;
            matchType = `word match (${commonWords.join(', ')})`;
          }
        }
        
        const priorityBonus = (oilStickerMappings.length - mappingIndex) * 10;
        const finalScore = baseScore + priorityBonus;
        
        if (enableLogging && baseScore > 0) {
          console.log(`    📋 "${mapping.cannedServiceName}" → "${mapping.oilType}": ${matchType} (score: ${baseScore} + priority: ${priorityBonus} = ${finalScore})`);
        }
        
        if (finalScore > bestMatchScore && baseScore > 0) {
          bestMatch = { mapping, score: finalScore };
          bestMatchScore = finalScore;
        }
      }
      
      if (bestMatch) {
        if (enableLogging) {
          console.log(`✅ BEST MATCH for service "${service.name}": "${bestMatch.mapping.cannedServiceName}" → "${bestMatch.mapping.oilType}" (score: ${bestMatch.score})`);
        }
        return bestMatch.mapping.oilType;
      }
    }
    
    if (enableLogging) {
      console.log('❌ No oil type detected from detailed services');
    }
    return null;
  };

  const findOilTypeFromServices = (order: WorkflowOrder): string | null => {
    console.log('🔍 Finding oil type for order:', order.id);
    console.log(`📊 Order Type: WorkflowOrder`);
    
    // Check if we have cached detailed services
    let services: any[] = [];
    const cachedServices = detailedServicesCache[order.id];
    if (cachedServices && cachedServices.length > 0) {
      services = cachedServices;
      console.log('✅ Found cached detailed services:', services.length);
    }
    
    // If no services found, check coalescedName as fallback
    if (services.length === 0 && order.coalescedName) {
      const coalescedName = order.coalescedName;
      console.log('⚠️ No detailed services found, using coalescedName as fallback service:', coalescedName);
      
      // Check if coalescedName contains oil-related keywords
      const oilKeywords = ['oil', 'mobil', 'rotella', 'delvac', 'synthetic', 'conventional', 'lube', 'change'];
      const hasOilKeywords = oilKeywords.some(keyword => 
        coalescedName.toLowerCase().includes(keyword.toLowerCase())
      );
      
      if (hasOilKeywords) {
        console.log('🔍 CoalescedName contains oil-related keywords, attempting to match...');
        services = [{ name: coalescedName }];
      } else {
        console.log('💡 CoalescedName does not contain oil-related keywords, skipping oil type detection');
        console.log('📋 For better matching, click the "🔧 Services" chip to load detailed services');
        return null;
      }
    }
    
    if (services.length === 0) {
      console.log('❌ No services available for oil type detection');
      return null;
    }

    console.log('📋 Available mappings:', oilStickerMappings.map(m => `"${m.cannedServiceName}" → "${m.oilType}"`));

    // Use the shared helper function with logging enabled
    const result = findOilTypeFromDetailedServices(services, true);
    console.log(`🎯 Order ${order.number}: Oil type detection result:`, result);
    return result;
  };

  const getOilTypeChipColor = (oilType: string | null): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    if (!oilType) return 'default';
    
    switch (oilType.toLowerCase()) {
      case 'mobil 1':
        return 'error'; // Red
      case 'super synthetic':
      case 'full synthetic':
        return 'primary'; // Blue
      case 'delvac 1':
        return 'info'; // Light blue
      case 'rotella':
        return 'warning'; // Orange
      case 'conventional oil':
        return 'secondary'; // Gray
      case 'multiple services':
      case 'service package':
        return 'info'; // Light blue for generic service indicators
      case 'oil service':
      case 'oil service (?)':
        return 'success'; // Green for generic oil services
      default:
        return 'success'; // Green
    }
  };

  // Get color mapping for Material-UI colors (same as main ShopMonkey page)
  const getColorForLabel = (color: string) => {
    const colorMap: { [key: string]: any } = {
      red: 'error',
      green: 'success',
      blue: 'primary',
      orange: 'warning',
      purple: 'secondary',
      gray: 'default',
      yellow: 'warning',
      aqua: 'info',
      brown: 'default',
      black: 'default'
    };
    return colorMap[color] || 'default';
  };

  // Oil sticker creation function (adapted from ShopMonkey.tsx)
  const printOilSticker = async (order: WorkflowOrder) => {
    setPrintingSticker(order.id);
    setSuccessMessage('');
    
    try {
      console.log('🖨️ Starting oil sticker creation for order:', order.id);
      
      // Extract required data
      const vin = order.vehicle?.vin || '';
      const mileage = order.vehicle?.mileage || 0;
      const customerName = order.customer?.companyName || 
                          (order.customer ? `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim() : '') || '';
      const vehicleInfo = order.vehicle ? 
                         `${order.vehicle.year || ''} ${order.vehicle.make || ''} ${order.vehicle.model || ''}`.trim() : '';
      
      console.log('📋 ORDER DETAILS:', {
        orderId: order.id,
        orderNumber: order.number,
        customerName,
        vehicleInfo,
        vin,
        mileage,
        coalescedName: order.coalescedName
      });
      
      // Find oil type from services
      const oilTypeName = findOilTypeFromServices(order);
      console.log('🎯 Oil type detected:', oilTypeName);
      
      if (!oilTypeName) {
        setSuccessMessage('⚠️ No oil change service found in this order. Please check your oil sticker mappings in settings.');
        setPrintingSticker('');
        return;
      }
      
      // Check if the detected oil type is a fallback (coalescedName) and show manual selection
      const cachedServices = detailedServicesCache[order.id];
      const isUsingFallback = !cachedServices || cachedServices.length === 0;
      
      if (isUsingFallback) {
        // Show manual oil type selection dialog
        setDetectedOilTypeName(oilTypeName);
        setPendingOrderForOilType(order);
        setSelectedOilTypeId(''); // Reset selection
        setShowOilTypeDialog(true);
        setPrintingSticker('');
        return;
      }
      
      if (!vin) {
        setSuccessMessage('⚠️ No VIN found in this order. VIN is required for oil sticker creation.');
        setPrintingSticker('');
        return;
      }
      
      // Get sticker settings and oil types
      const settings = StickerStorageService.getSettings();
      const oilTypes = settings.oilTypes;
      
      // Find matching oil type ID
      const findOilTypeId = (oilTypeName: string): string => {
        console.log('🔍 Finding oil type ID for:', oilTypeName);
        
        // Try exact match first
        let oilType = oilTypes.find(type => 
          type.name.toLowerCase() === oilTypeName.toLowerCase()
        );
        
        if (oilType) {
          console.log('✅ Exact match found:', oilType.name, '(id:', oilType.id + ')');
          return oilType.id;
        }
        
        // Try partial matches
        oilType = oilTypes.find(type => {
          const typeNameLower = type.name.toLowerCase();
          const oilTypeNameLower = oilTypeName.toLowerCase();
          return oilTypeNameLower.includes(typeNameLower) || typeNameLower.includes(oilTypeNameLower);
        });
        
        if (oilType) {
          console.log('✅ Partial match found:', oilType.name, '(id:', oilType.id + ')');
          return oilType.id;
        }
        
        console.log('❌ No matches found, defaulting to first oil type:', oilTypes[0]?.name || 'none');
        return oilTypes[0]?.id || '1'; // Default to first oil type
      };
      
      const oilTypeId = findOilTypeId(oilTypeName);
      const oilType = oilTypes.find(type => type.id === oilTypeId);
      
      if (!oilType) {
        setSuccessMessage('⚠️ Could not find matching oil type. Please check your oil type configuration.');
        setPrintingSticker('');
        return;
      }
      
      // Calculate next service date
      const calculateNextServiceDate = (oilTypeId: string): string => {
        const oilType = oilTypes.find(type => type.id === oilTypeId);
        if (!oilType) return '';
        
        const today = new Date();
        const nextDate = new Date(today.getTime() + (oilType.durationInDays * 24 * 60 * 60 * 1000));
        return nextDate.toISOString().split('T')[0];
      };
      
      const nextServiceDate = calculateNextServiceDate(oilTypeId);
      
      // Generate QR code
      const generateQRCode = (sticker: any): string => {
        return sticker.vin;
      };
      
      // Get company info from settings
      const companyElement = settings.layout.elements.find(el => el.id === 'companyName');
      const addressElement = settings.layout.elements.find(el => el.id === 'address');
      const messageElement = settings.layout.elements.find(el => el.id === 'message');
      
      // Decode VIN details for richer sticker info
      const decoded = await VinDecoderService.decodeVin(vin);

      // Create new sticker
      const newSticker: any = {
        id: Date.now().toString(),
        dateCreated: new Date().toISOString(),
        vin: VinDecoderService.formatVin(vin),
        decodedDetails: {
          ...(decoded && typeof decoded === 'object' ? decoded : {}),
          vehicleInfo: vehicleInfo,
          customerName: customerName,
          orderNumber: order.number || order.id
        },
        date: nextServiceDate,
        oilType,
        mileage: mileage || 0,
        companyName: companyElement?.content.replace('{companyName}', '') || '',
        address: addressElement?.content.replace('{address}', '') || '',
        message: messageElement?.content || '',
        qrCode: '',
        printed: false,
        lastUpdated: new Date().toISOString(),
        archived: false,
      };
      
      newSticker.qrCode = generateQRCode(newSticker);
      
      // Save the sticker to storage
      await StickerStorageService.saveSticker(newSticker);
      console.log('💾 Sticker saved to storage');
      
      // Use print settings from props (passed from Home page)
      console.log('🖨️ Print settings from props:', {
        method: stickerPrintMethod,
        printerId: stickerPrinterId,
        orientation: stickerPrintOrientation,
        autoPrint: stickerPrintAutoPrint
      });
      
      // Auto-print if enabled and using print queue, otherwise generate PDF and open in new tab
      if (stickerPrintAutoPrint && (stickerPrintMethod === 'queue' || stickerPrintMethod === 'queue-fallback') && stickerPrinterId) {
        try {
          // Import the required services
          const { PDFGeneratorService } = await import('../services/pdfGenerator');
          const { PrintApiService } = await import('../services/printApi');
          
          // Generate PDF first, then send to print queue
          console.log('🖨️ Generating PDF for print queue...');
          console.log('🔄 Using orientation:', stickerPrintOrientation);
          
          // Generate the PDF blob
          const pdfBlob = await PDFGeneratorService.generateStickerPDFBlob(newSticker, settings);
          
          // Convert PDF blob to base64 for transmission
          const reader = new FileReader();
          const pdfBase64 = await new Promise<string>((resolve, reject) => {
            reader.onloadend = () => {
              const result = reader.result as string;
              // Remove data URL prefix to get just the base64 data
              const base64Data = result.split(',')[1];
              resolve(base64Data);
            };
            reader.onerror = reject;
            reader.readAsDataURL(pdfBlob);
          });

          // Prepare job data with PDF content
          const stickerPrintData = {
            type: 'pdf-print',
            pdfData: pdfBase64,
            filename: `sticker-${newSticker.vin}-${Date.now()}.pdf`,
            printerId: stickerPrinterId,
            stickerInfo: {
              vin: newSticker.vin,
              vehicleDetails: newSticker.decodedDetails,
              oilType: newSticker.oilType?.name,
              mileage: newSticker.mileage,
              nextServiceDate: newSticker.date,
              companyName: newSticker.companyName
            },
            metadata: {
              documentType: 'oil-change-sticker',
              generated: new Date().toISOString(),
              source: 'shopmonkey-orders-section'
            }
          };

          console.log('🚀 Submitting PDF print job to queue...');
          const job = await PrintApiService.submitPrintJob({
            formName: 'stickers',
            jobData: stickerPrintData,
            options: {
              priority: 'normal',
              copies: 1
            }
          });

          console.log('✅ Print job queued successfully:', job.id);
          await StickerStorageService.saveSticker({ ...newSticker, printed: true });
          setSuccessMessage(`✅ Oil sticker created and queued for printing! Order #${order.number || 'N/A'} - ${oilType.name} (Job ID: ${job.id.slice(0, 8)}...)`);
        } catch (error) {
          console.error('Auto-print failed:', error);
          
          if (stickerPrintMethod === 'queue-fallback') {
            // Fallback to PDF in new tab for queue-fallback mode
            const { PDFGeneratorService } = await import('../services/pdfGenerator');
            await PDFGeneratorService.generateStickerPDF(newSticker, settings, true);
            await StickerStorageService.saveSticker({ ...newSticker, printed: true });
            setSuccessMessage(`✅ Oil sticker created and opened in new tab! Order #${order.number || 'N/A'} - ${oilType.name} (Auto-print failed)`);
          } else {
            // For regular queue mode, just show error
            setSuccessMessage(`✅ Oil sticker created! Order #${order.number || 'N/A'} - ${oilType.name} (Auto-print failed - please print manually)`);
          }
        }
      } else {
        // Default behavior - open PDF in new tab
        console.log('🖨️ Opening PDF in new tab...');
        const { PDFGeneratorService } = await import('../services/pdfGenerator');
        await PDFGeneratorService.generateStickerPDF(newSticker, settings, true);
        await StickerStorageService.saveSticker({ ...newSticker, printed: true });
        setSuccessMessage(`✅ Oil sticker created and PDF opened! Order #${order.number || 'N/A'} - ${oilType.name}`);
      }
      
      console.log('🎉 Oil sticker process completed successfully!');
      
    } catch (error: any) {
      console.error('❌ Oil sticker creation failed:', error);
      setSuccessMessage('❌ Failed to create oil sticker: ' + (error.message || 'Unknown error'));
    } finally {
      setPrintingSticker('');
    }
  };

  // Handle manual oil type selection and create sticker
  const handleManualOilTypeSelection = async () => {
    if (!pendingOrderForOilType || !selectedOilTypeId) {
      setSuccessMessage('⚠️ Please select an oil type');
      return;
    }

    setPrintingSticker(pendingOrderForOilType.id);
    setShowOilTypeDialog(false);
    
    try {
      console.log('🖨️ Creating sticker with manually selected oil type:', selectedOilTypeId);
      
      // Extract required data
      const order = pendingOrderForOilType;
      const vin = order.vehicle?.vin || '';
      const mileage = order.vehicle?.mileage || 0;
      const customerName = order.customer?.companyName || 
                          (order.customer ? `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim() : '') || '';
      const vehicleInfo = order.vehicle ? 
                         `${order.vehicle.year || ''} ${order.vehicle.make || ''} ${order.vehicle.model || ''}`.trim() : '';
      
      if (!vin) {
        setSuccessMessage('⚠️ No VIN found in this order. VIN is required for oil sticker creation.');
        setPrintingSticker('');
        return;
      }
      
      // Get sticker settings and oil types
      const settings = StickerStorageService.getSettings();
      const oilTypes = settings.oilTypes;
      const oilType = oilTypes.find(type => type.id === selectedOilTypeId);
      
      if (!oilType) {
        setSuccessMessage('⚠️ Selected oil type not found. Please try again.');
        setPrintingSticker('');
        return;
      }
      
      // Calculate next service date
      const today = new Date();
      const nextDate = new Date(today.getTime() + (oilType.durationInDays * 24 * 60 * 60 * 1000));
      const nextServiceDate = nextDate.toISOString().split('T')[0];
      
      // Generate QR code
      const generateQRCode = (sticker: any): string => {
        return sticker.vin;
      };
      
      // Get company info from settings
      const companyElement = settings.layout.elements.find(el => el.id === 'companyName');
      const addressElement = settings.layout.elements.find(el => el.id === 'address');
      const messageElement = settings.layout.elements.find(el => el.id === 'message');
      
      // Decode VIN details for richer sticker info
      const decoded = await VinDecoderService.decodeVin(vin);

      // Create new sticker
      const newSticker: any = {
        id: Date.now().toString(),
        dateCreated: new Date().toISOString(),
        vin: VinDecoderService.formatVin(vin),
        decodedDetails: {
          ...(decoded && typeof decoded === 'object' ? decoded : {}),
          vehicleInfo: vehicleInfo,
          customerName: customerName,
          orderNumber: order.number || order.id
        },
        date: nextServiceDate,
        oilType,
        mileage: mileage || 0,
        companyName: companyElement?.content.replace('{companyName}', '') || '',
        address: addressElement?.content.replace('{address}', '') || '',
        message: messageElement?.content || '',
        qrCode: '',
        printed: false,
        lastUpdated: new Date().toISOString(),
        archived: false,
      };
      
      newSticker.qrCode = generateQRCode(newSticker);
      
      // Save the sticker to storage
      await StickerStorageService.saveSticker(newSticker);
      console.log('💾 Sticker saved to storage');
      
      // Use print settings from props (passed from Home page)
      console.log('🖨️ Print settings from props:', {
        method: stickerPrintMethod,
        printerId: stickerPrinterId,
        orientation: stickerPrintOrientation,
        autoPrint: stickerPrintAutoPrint
      });
      
      // Auto-print if enabled and using print queue, otherwise generate PDF and open in new tab
      if (stickerPrintAutoPrint && (stickerPrintMethod === 'queue' || stickerPrintMethod === 'queue-fallback') && stickerPrinterId) {
        try {
          // Import the required services
          const { PDFGeneratorService } = await import('../services/pdfGenerator');
          const { PrintApiService } = await import('../services/printApi');
          
          // Generate PDF first, then send to print queue
          console.log('🖨️ Generating PDF for print queue...');
          console.log('🔄 Using orientation:', stickerPrintOrientation);
          
          // Generate the PDF blob
          const pdfBlob = await PDFGeneratorService.generateStickerPDFBlob(newSticker, settings);
          
          // Convert PDF blob to base64 for transmission
          const reader = new FileReader();
          const pdfBase64 = await new Promise<string>((resolve, reject) => {
            reader.onloadend = () => {
              const result = reader.result as string;
              // Remove data URL prefix to get just the base64 data
              const base64Data = result.split(',')[1];
              resolve(base64Data);
            };
            reader.onerror = reject;
            reader.readAsDataURL(pdfBlob);
          });

          // Prepare job data with PDF content
          const stickerPrintData = {
            type: 'pdf-print',
            pdfData: pdfBase64,
            filename: `sticker-${newSticker.vin}-${Date.now()}.pdf`,
            printerId: stickerPrinterId,
            stickerInfo: {
              vin: newSticker.vin,
              vehicleDetails: newSticker.decodedDetails,
              oilType: newSticker.oilType?.name,
              mileage: newSticker.mileage,
              nextServiceDate: newSticker.date,
              companyName: newSticker.companyName
            },
            metadata: {
              documentType: 'oil-change-sticker',
              generated: new Date().toISOString(),
              source: 'shopmonkey-orders-section-manual'
            }
          };

          console.log('🚀 Submitting PDF print job to queue...');
          const job = await PrintApiService.submitPrintJob({
            formName: 'stickers',
            jobData: stickerPrintData,
            options: {
              priority: 'normal',
              copies: 1
            }
          });

          console.log('✅ Print job queued successfully:', job.id);
          await StickerStorageService.saveSticker({ ...newSticker, printed: true });
          setSuccessMessage(`✅ Oil sticker created and queued for printing! Order #${order.number || 'N/A'} - ${oilType.name} (Job ID: ${job.id.slice(0, 8)}...)`);
        } catch (error) {
          console.error('Auto-print failed:', error);
          
          if (stickerPrintMethod === 'queue-fallback') {
            // Fallback to PDF in new tab for queue-fallback mode
            const { PDFGeneratorService } = await import('../services/pdfGenerator');
            await PDFGeneratorService.generateStickerPDF(newSticker, settings, true);
            await StickerStorageService.saveSticker({ ...newSticker, printed: true });
            setSuccessMessage(`✅ Oil sticker created and opened in new tab! Order #${order.number || 'N/A'} - ${oilType.name} (Auto-print failed)`);
          } else {
            // For regular queue mode, just show error
            setSuccessMessage(`✅ Oil sticker created! Order #${order.number || 'N/A'} - ${oilType.name} (Auto-print failed - please print manually)`);
          }
        }
      } else {
        // Default behavior - open PDF in new tab
        console.log('🖨️ Opening PDF in new tab...');
        const { PDFGeneratorService } = await import('../services/pdfGenerator');
        await PDFGeneratorService.generateStickerPDF(newSticker, settings, true);
        await StickerStorageService.saveSticker({ ...newSticker, printed: true });
        setSuccessMessage(`✅ Oil sticker created and PDF opened! Order #${order.number || 'N/A'} - ${oilType.name}`);
      }
      
      console.log('🎉 Oil sticker process completed successfully!');
      
    } catch (error: any) {
      console.error('❌ Oil sticker creation failed:', error);
      setSuccessMessage('❌ Failed to create oil sticker: ' + (error.message || 'Unknown error'));
    } finally {
      setPrintingSticker('');
      setPendingOrderForOilType(null);
      setSelectedOilTypeId('');
      setDetectedOilTypeName('');
    }
  };

  // Load token from storage (same pattern as ShopMonkey page)
  const loadTokenFromStorage = (): string | null => {
    try {
      const token = localStorage.getItem('shopmonkey_token');
      const timestamp = localStorage.getItem('shopmonkey_token_timestamp');
      if (token && timestamp) {
        return token;
      }
    } catch (error) {
      debug.warn('shopMonkey', 'Failed to load ShopMonkey token from localStorage:', error);
    }
    return null;
  };

  // Save token to storage
  const saveTokenToStorage = (token: string) => {
    try {
      localStorage.setItem('shopmonkey_token', token);
      localStorage.setItem('shopmonkey_token_timestamp', new Date().toISOString());
      console.log('🔐 Token saved to localStorage');
    } catch (error) {
      console.warn('Failed to save token to localStorage:', error);
    }
  };

  // Remove token from storage
  const removeTokenFromStorage = () => {
    try {
      localStorage.removeItem('shopmonkey_token');
      localStorage.removeItem('shopmonkey_token_timestamp');
      console.log('🔐 Token removed from localStorage');
    } catch (error) {
      console.warn('Failed to remove token from localStorage:', error);
    }
  };

  // Handle login
  const handleLogin = async () => {
    if (!loginCredentials.email || !loginCredentials.password) {
      setLoginError('Please enter both email and password');
      return;
    }

    setLoggingIn(true);
    setLoginError('');

    try {
      console.log('🚀 Attempting ShopMonkey login for:', loginCredentials.email);
      
      // Use the same base URL as the main ShopMonkey page
      const hostname = window.location.hostname;
      const port = '5001';
      const protocol = 'https:';
      const baseUrl = `${protocol}//${hostname}:${port}/api`;
      
      console.log('🔗 Using base URL:', baseUrl);
      
      // Use axios directly like the main ShopMonkey page
      const response = await axios.post(`${baseUrl}/shopmonkey/login`, loginCredentials);
      
      // Extract token from ShopMonkey response structure: response.data.data.token
      const actualToken = response.data.data?.token;
      
      console.log('✅ Login successful, token received:', actualToken?.substring(0, 8) + '...');
      
      if (actualToken) {
        setAuthToken(actualToken);
        setIsAuthenticated(true);
        saveTokenToStorage(actualToken);
        setShowLoginDialog(false);
        setLoginCredentials({ email: loginCredentials.email, password: '', audience: 'api' });
        setSuccessMessage('Successfully logged in to ShopMonkey');
        
        // Load orders after successful login
        loadOrders();
      } else {
        console.error('❌ No token found in response');
        setLoginError('No authentication token received from ShopMonkey');
      }
    } catch (error: any) {
      console.error('❌ ShopMonkey login error:', error);
      console.error('📄 Login error response:', error.response?.data);
      setLoginError(error.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoggingIn(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    setAuthToken('');
    setIsAuthenticated(false);
    removeTokenFromStorage();
    setOrders([]);
    setStatuses([]);
    setError('');
    setSuccessMessage('Logged out successfully');
  };

  // Initialize authentication on component mount
  useEffect(() => {
    const storedToken = loadTokenFromStorage();
    if (storedToken && !authToken) {
      console.log('🔄 Restoring token from localStorage');
      setAuthToken(storedToken);
      setIsAuthenticated(true);
    }
  }, []);

  // Load orders when authenticated
  useEffect(() => {
    if (isAuthenticated && authToken) {
      loadOrders();
    }
  }, [isAuthenticated, authToken]);

  // Load debug setting from localStorage and listen for changes
  useEffect(() => {
    const loadDebugSetting = () => {
      const savedSettings = localStorage.getItem('quickCheckSettings');
      if (savedSettings) {
        try {
          const parsedSettings = JSON.parse(savedSettings);
          setShowDebugControls(parsedSettings.showShopMonkeyDebug || false);
        } catch (error) {
          console.error('Error loading ShopMonkey debug setting:', error);
          setShowDebugControls(false);
        }
      } else {
        setShowDebugControls(false);
      }
    };

    loadDebugSetting();

    const handleSettingsChange = (event: CustomEvent) => {
      setShowDebugControls(event.detail.showShopMonkeyDebug || false);
    };

    window.addEventListener('quickCheckSettingsChanged', handleSettingsChange as EventListener);
    
    return () => {
      window.removeEventListener('quickCheckSettingsChanged', handleSettingsChange as EventListener);
    };
  }, []);

  // Ensure auto-refresh and real-time updates are always enabled when debug controls are hidden
  useEffect(() => {
    if (!showDebugControls) {
      setRealTimeUpdatesEnabled(true);
      setAutoRefreshEnabled(true);
    }
  }, [showDebugControls]);

  // Rate-limited API call wrapper
  const rateLimitedApiCall = useCallback(async (endpoint: string, cacheKey: string, params?: any): Promise<any> => {
    const now = Date.now();
    
    // Check cache first
    const cached = apiCallCache.current[cacheKey];
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      console.log(`📋 Using cached response for ${endpoint}`);
      return cached.data;
    }
    
    // Check rate limiting
    const timeSinceLastCall = now - lastApiCallTime.current;
    if (timeSinceLastCall < MIN_API_INTERVAL) {
      const waitTime = MIN_API_INTERVAL - timeSinceLastCall;
      console.log(`⏳ Rate limiting: waiting ${waitTime}ms before calling ${endpoint}`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    try {
      lastApiCallTime.current = Date.now();
      const config: any = {
        headers: { 'x-shopmonkey-token': authToken }
      };
      
      // Add params if provided
      if (params) {
        config.params = params;
      }
      
      const response = await axiosInstance.get(endpoint, config);
      
      // Cache the response
      apiCallCache.current[cacheKey] = {
        data: response,
        timestamp: Date.now()
      };
      
      return response;
    } catch (error: any) {
      if (error.response?.status === 429) {
        console.warn(`⚠️ Rate limit hit for ${endpoint}. Implementing exponential backoff...`);
        // Exponential backoff for 429 errors
        const backoffTime = Math.min(10000, 1000 * Math.pow(2, Math.floor(Math.random() * 4))); // 1-8 seconds
        await new Promise(resolve => setTimeout(resolve, backoffTime));
        throw new Error(`Rate limit exceeded. Retrying in ${backoffTime/1000}s...`);
      }
      throw error;
    }
  }, [authToken]);

  // Load orders with specific filters
  const loadOrders = useCallback(async () => {
    debug.log('shopMonkey', 'loadOrders called - fetching ShopMonkey orders');
    const isAutoRefresh = !loading; // If not currently loading, this is likely an auto-refresh
    if (!isAutoRefresh) {
      setLoading(true);
    }
    setError('');
    
    if (!authToken) {
      setError('ShopMonkey authentication required. Please login first.');
      setLoading(false);
      return;
    }
    
    try {
      // First get all workflow statuses to find the IDs we need - using rate-limited API
      const statusesResponse = await rateLimitedApiCall('/shopmonkey/workflow_status', 'workflow_status');
      
      const responseData = statusesResponse.data;
      console.log('🔍 ShopMonkey statuses response:', responseData);
      
      // The server wraps the response with debug headers, so the actual data might be nested
      const allStatuses = responseData.data || responseData;
      console.log('🔍 Extracted statuses:', allStatuses);
      
      // Ensure allStatuses is an array
      if (!Array.isArray(allStatuses)) {
        console.error('❌ Expected array of statuses, got:', typeof allStatuses, allStatuses);
        setError('Invalid response format from ShopMonkey API');
        return;
      }
      
      setStatuses(allStatuses);
      
      console.log('🔍 All available workflow statuses:', allStatuses.map(s => `${s.name} (${s.id})`));
      
      // Find the status IDs for "Drop Off" and "Next To Work On"
      const dropOffStatus = allStatuses.find((s: WorkflowStatus) => s.name === 'Drop Off');
      const nextToWorkOnStatus = allStatuses.find((s: WorkflowStatus) => s.name === 'Next To Work On');
      const bay2Status = allStatuses.find((s: WorkflowStatus) => s.name === 'Bay 2');
      const bay3Status = allStatuses.find((s: WorkflowStatus) => s.name === 'Bay 3');
      const bay4Status = allStatuses.find((s: WorkflowStatus) => s.name === 'Bay 4');
      
      console.log('🔍 Found statuses:', {
        dropOff: dropOffStatus ? `${dropOffStatus.name} (${dropOffStatus.id})` : 'NOT FOUND',
        nextToWorkOn: nextToWorkOnStatus ? `${nextToWorkOnStatus.name} (${nextToWorkOnStatus.id})` : 'NOT FOUND',
        bay2: bay2Status ? `${bay2Status.name} (${bay2Status.id})` : 'NOT FOUND',
        bay3: bay3Status ? `${bay3Status.name} (${bay3Status.id})` : 'NOT FOUND',
        bay4: bay4Status ? `${bay4Status.name} (${bay4Status.id})` : 'NOT FOUND'
      });
      
      if (!dropOffStatus || !nextToWorkOnStatus) {
        setError('Required workflow statuses "Drop Off" or "Next To Work On" not found');
        return;
      }

      // Build the where clause for our specific filters
      const statusIds = [dropOffStatus.id, nextToWorkOnStatus.id];
      
      // Add bay status IDs if they exist
      if (bay2Status) statusIds.push(bay2Status.id);
      if (bay3Status) statusIds.push(bay3Status.id);
      if (bay4Status) statusIds.push(bay4Status.id);
      
      const whereClause = {
        invoiced: false,        // estimates only
        archived: false,        // active only
        workflowStatusId: {
          $in: statusIds  // Drop off, Next to work on, and bay statuses
        }
      };

      console.log('🔍 Where clause for filtering:', whereClause);

      const params = {
        limit: 50, // Get more orders since we're filtering
        include: {
          customer: true,
          vehicle: true,
          workflowStatus: true,
          labelConnections: true
        },
        where: JSON.stringify(whereClause)
      };

      console.log('🔍 Requesting orders with params:', params);

      // Use rate-limited API call with params
      const response = await rateLimitedApiCall('/shopmonkey/workflow/orders', `orders_${JSON.stringify(params)}`, params);

      const ordersResponseData = response.data;
      console.log('🔍 ShopMonkey orders response:', ordersResponseData);
      
      // The server wraps the response with debug headers, so the actual data might be nested
      const orders = ordersResponseData.data || ordersResponseData;
      console.log('🔍 Extracted orders:', orders);
      console.log('🔍 Orders type:', typeof orders);
      console.log('🔍 Orders is array:', Array.isArray(orders));
      console.log('🔍 Orders length:', orders?.length || 0);
      
      // Debug: Check if orders have workflowStatus data
      if (Array.isArray(orders)) {
        console.log('🔍 Checking workflowStatus data in orders:');
        orders.forEach((order, index) => {
          console.log(`Order ${index + 1} (${order.number}):`, {
            workflowStatus: order.workflowStatus,
            workflowStatusId: order.workflowStatusId,
            hasWorkflowStatus: !!order.workflowStatus,
            hasWorkflowStatusId: !!order.workflowStatusId,
            status: order.status,
            invoiced: order.invoiced,
            archived: order.archived
          });
        });
      }

      // Client-side filter to ensure we only show "Drop Off", "Next To Work On", and bay orders
      const bayStatuses = ['Bay 2', 'Bay 3', 'Bay 4'];
      const filteredOrders = Array.isArray(orders) ? orders.filter(order => {
        const orderStatusName = order.workflowStatus?.name || 
          allStatuses.find(s => s.id === order.workflowStatusId)?.name;
        
        const isDesiredStatus = orderStatusName === 'Drop Off' || 
                               orderStatusName === 'Next To Work On' || 
                               bayStatuses.includes(orderStatusName || '');
        
        console.log(`🔍 Order ${order.number}: status="${orderStatusName}", isDesiredStatus=${isDesiredStatus}`);
        
        if (!isDesiredStatus) {
          console.log(`🚫 Filtering out order ${order.number}: status "${orderStatusName}" is not "Drop Off", "Next To Work On", or bay status`);
        }
        
        return isDesiredStatus;
      }) : [];

      console.log(`🔍 Filtered orders: ${filteredOrders.length} out of ${orders?.length || 0} total orders`);

      // DISABLED: Push snapshot of filtered orders to server for persistence/visibility
      // This functionality is disabled to prevent 404 errors until endpoint is properly configured
      // try {
      //   const snapshotPayload = (filteredOrders || []).map((o: any) => ({
      //     id: o.id,
      //     number: o.number,
      //     workflowStatusId: o.workflowStatusId,
      //     workflowStatus: o.workflowStatus,
      //     customer: o.customer,
      //     vehicle: o.vehicle,
      //   }));
      //   await axiosInstance.post('/shopmonkey/orders/snapshot', { orders: snapshotPayload });
      //   console.log('💾 Sent order snapshots to server:', snapshotPayload.length);
      // } catch (e) {
      //   console.warn('⚠️ Failed to send order snapshots to server:', e);
      // }
      
      // For each filtered order, push current services snapshot to server
      try {
        const token = loadTokenFromStorage();
        if (token) {
          // Fetch services for all filtered orders concurrently
          const servicePromises = filteredOrders.map(async (o: any) => {
            const services = await fetchDetailedServicesForOrder(o.id);
            return { orderId: o.id, services };
          });
          const results = await Promise.allSettled(servicePromises);

          // Push snapshots and update cache
          for (const r of results) {
            if (r.status === 'fulfilled') {
              const { orderId, services } = r.value as any;
              if (Array.isArray(services) && services.length > 0) {
                // DISABLED: Post services snapshot to prevent 404 errors until endpoint is properly configured
                // try {
                //   await axiosInstance.post('/shopmonkey/orders/services_snapshot', {
                //     orderId,
                //     services: services.map((s: any) => ({
                //       id: s.id,
                //       name: s.name,
                //       completed: !!s.completed,
                //       totalCents: s.totalCents
                //     }))
                //   });
                // } catch (postErr) {
                //   console.warn(`⚠️ Failed posting services snapshot for order ${orderId}:`, postErr);
                // }
                setDetailedServicesCache(prev => ({ ...prev, [orderId]: services }));
              }
            } else {
              console.warn('⚠️ Failed services fetch for an order:', r.reason);
            }
          }
        }
      } catch (e) {
        console.warn('⚠️ Failed to send services snapshots to server:', e);
      }

      // Debug: Show all orders and their statuses
      if (Array.isArray(orders) && orders.length > 0) {
        console.log('🔍 All orders and their statuses:');
        orders.forEach((order, index) => {
          const orderStatusName = order.workflowStatus?.name || 
            allStatuses.find(s => s.id === order.workflowStatusId)?.name;
          console.log(`  Order ${order.number}: status="${orderStatusName}", workflowStatusId="${order.workflowStatusId}"`);
        });
      }
      
      // Smooth update: merge new orders with existing ones to prevent card flickering
      setOrders(prevOrders => {
        if (prevOrders.length === 0) {
          // First load - just set the orders
          return filteredOrders || [];
        }
        
        // Merge orders smoothly - update existing ones, add new ones, remove ones that are no longer in the list
        const orderMap = new Map();
        
        // Add all new orders to the map
        (filteredOrders || []).forEach(order => {
          orderMap.set(order.id, order);
        });
        
        // Create merged list: keep existing orders that are still valid, add new ones
        const mergedOrders = prevOrders
          .filter(order => orderMap.has(order.id)) // Keep existing orders that are still in the new data
          .map(order => orderMap.get(order.id)) // Update with new data
          .concat(
            // Add new orders that weren't in the previous list
            (filteredOrders || []).filter(order => !prevOrders.find(prev => prev.id === order.id))
          );
        
        console.log(`🔄 Smooth update: ${prevOrders.length} → ${mergedOrders.length} orders`);
        
        // Track which orders are being updated for subtle loading indicators
        if (isAutoRefresh && prevOrders.length > 0) {
          const updatedOrderIds = new Set<string>();
          const statusChanges: Array<{orderNumber: string, oldStatus: string, newStatus: string}> = [];
          
          mergedOrders.forEach(order => {
            const prevOrder = prevOrders.find(prev => prev.id === order.id);
            if (prevOrder && prevOrder.workflowStatusId !== order.workflowStatusId) {
              updatedOrderIds.add(order.id);
              
              // Track status changes for notifications
              const oldStatus = prevOrder.workflowStatus?.name || 'Unknown';
              const newStatus = order.workflowStatus?.name || 'Unknown';
              statusChanges.push({
                orderNumber: order.number?.toString() || 'N/A',
                oldStatus,
                newStatus
              });
            }
          });
          
          setUpdatingOrders(updatedOrderIds);
          
          // Show notifications for status changes
          statusChanges.forEach(change => {
            addUpdateNotification(
              'status_change',
              `Order #${change.orderNumber} moved from "${change.oldStatus}" to "${change.newStatus}"`,
              undefined,
              change.orderNumber
            );
          });
          
          // Clear the updating state after a short delay
          setTimeout(() => {
            setUpdatingOrders(new Set());
          }, 2000);
        }
        
        return mergedOrders;
      });
    } catch (err: any) {
      console.error('Error loading ShopMonkey orders:', err);
      
      // Handle 429 rate limit errors specifically
      if (err.response?.status === 429) {
        setError('Rate limit exceeded. Please wait a moment before refreshing. Auto-refresh interval has been increased to prevent this.');
        // Temporarily increase refresh interval for this session
        setRefreshInterval(Math.max(60000, refreshInterval * 2)); // At least 1 minute
      } else {
        setError(err.response?.data?.error || 'Failed to load orders');
      }
    } finally {
      if (!isAutoRefresh) {
        setLoading(false);
      }
    }
  }, [authToken]);

  // Group orders by status with "Next To Work On" first
  const groupOrdersByStatus = (orders: WorkflowOrder[]): GroupedOrders => {
    console.log('🔍 Grouping orders by status. Total orders:', orders.length);
    console.log('🔍 Available statuses:', statuses.map(s => `${s.name} (${s.id})`));
    
    // Debug: Show each order being processed
    console.log('🔍 Processing orders for grouping:');
    orders.forEach((order, index) => {
      let statusName = 'Unknown Status';
      
      // Try to get status name from order's workflowStatus
      if (order.workflowStatus?.name) {
        statusName = order.workflowStatus.name;
      } else if (order.workflowStatusId) {
        // Fallback: find status by ID from our loaded statuses
        const foundStatus = statuses.find(s => s.id === order.workflowStatusId);
        if (foundStatus) {
          statusName = foundStatus.name;
        }
      }
      
      console.log(`  Order ${order.number}: status="${statusName}", workflowStatusId="${order.workflowStatusId}"`);
    });
    
    const grouped = orders.reduce((acc: GroupedOrders, order) => {
      let statusName = 'Unknown Status';
      
      // Try to get status name from order's workflowStatus
      if (order.workflowStatus?.name) {
        statusName = order.workflowStatus.name;
        console.log(`✅ Order ${order.number}: Using workflowStatus.name = "${statusName}"`);
      } else if (order.workflowStatusId) {
        // Fallback: find status by ID from our loaded statuses
        const foundStatus = statuses.find(s => s.id === order.workflowStatusId);
        if (foundStatus) {
          statusName = foundStatus.name;
          console.log(`✅ Order ${order.number}: Found status by ID "${order.workflowStatusId}" = "${statusName}"`);
        } else {
          console.warn(`⚠️ Order ${order.number}: workflowStatusId "${order.workflowStatusId}" not found in available statuses`);
        }
      } else {
        console.warn(`⚠️ Order ${order.number}: No workflowStatus or workflowStatusId available`);
      }
      
      // Only include orders with "Drop Off", "Next To Work On", or bay statuses
      const bayStatuses = ['Bay 2', 'Bay 3', 'Bay 4'];
      if (statusName !== 'Drop Off' && statusName !== 'Next To Work On' && !bayStatuses.includes(statusName)) {
        console.log(`🚫 Skipping order ${order.number}: status "${statusName}" is not desired`);
        return acc;
      }
      
      if (!acc[statusName]) {
        acc[statusName] = [];
      }
      acc[statusName].push(order);
      return acc;
    }, {});

    // Sort each group by order number (descending - newest first)
    Object.keys(grouped).forEach(statusName => {
      grouped[statusName].sort((a, b) => (b.number || 0) - (a.number || 0));
    });

    console.log('🔍 Final grouped orders:', Object.keys(grouped).map(name => `${name}: ${grouped[name].length} orders`));
    return grouped;
  };

  // Handle accordion expansion

  // Real-time update functions
  const addUpdateNotification = useCallback((type: 'order_update' | 'status_change' | 'service_completion' | 'new_order', message: string, orderId?: string, orderNumber?: string) => {
    const notification = {
      id: Date.now().toString(),
      type,
      message,
      timestamp: new Date(),
      orderId,
      orderNumber
    };
    
    setUpdateNotifications(prev => [notification, ...prev.slice(0, 9)]); // Keep last 10 notifications
    
    // Auto-remove notification after 10 seconds
    setTimeout(() => {
      setUpdateNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 10000);
  }, []);

  const startAutoRefresh = useCallback(() => {
    if (!autoRefreshEnabled || !isAuthenticated) {
      console.log('⏹️ Auto-refresh not started: disabled or not authenticated');
      return;
    }
    
    // Clear any existing timer first
    if (refreshTimer) {
      console.log('🔄 Clearing existing auto-refresh timer');
      clearInterval(refreshTimer);
    }
    
    console.log(`🔄 Starting auto-refresh with ${refreshInterval}ms interval`);
    
    const timer = setInterval(() => {
      console.log('🔄 Auto-refresh triggered - fetching orders from ShopMonkey');
      setLastRefreshTime(new Date());
      loadOrders();
    }, refreshInterval);
    
    setRefreshTimer(timer);
    setIsTimerActive(true);
    console.log('✅ Auto-refresh timer set successfully');
  }, [autoRefreshEnabled, refreshInterval, isAuthenticated, refreshTimer]);

  const stopAutoRefresh = useCallback(() => {
    if (refreshTimer) {
      console.log('⏹️ Stopping auto-refresh');
      clearInterval(refreshTimer);
      setRefreshTimer(null);
      setIsTimerActive(false);
    } else {
      console.log('ℹ️ No auto-refresh timer to stop');
      setIsTimerActive(false);
    }
  }, [refreshTimer]);

  const manualRefresh = useCallback(async () => {
    console.log('🔄 Manual refresh triggered');
    setLastRefreshTime(new Date());
    
    // Store current orders to detect changes
    const previousOrders = orders;
    
    await loadOrders();
    
    // Check for status changes after refresh
    if (previousOrders.length > 0 && orders.length > 0) {
      const statusChanges = [];
      
      for (const newOrder of orders) {
        const oldOrder = previousOrders.find(o => o.id === newOrder.id);
        if (oldOrder && oldOrder.workflowStatusId !== newOrder.workflowStatusId) {
          const oldStatus = oldOrder.workflowStatus?.name || 'Unknown';
          const newStatus = newOrder.workflowStatus?.name || 'Unknown';
          statusChanges.push({
            orderNumber: newOrder.number,
            oldStatus,
            newStatus
          });
        }
      }
      
      // Show notifications for status changes
      statusChanges.forEach(change => {
        addUpdateNotification(
          'status_change',
          `Order #${change.orderNumber} moved from "${change.oldStatus}" to "${change.newStatus}"`,
          undefined,
          change.orderNumber?.toString()
        );
      });
    }
    
    setPendingUpdates(new Set()); // Clear pending updates
  }, [orders, addUpdateNotification]);

  // WebSocket event handlers
  useEffect(() => {
    if (!realTimeUpdatesEnabled || !connectionStatus.connected) return;

    // DISABLED: QuickCheck updates should only be handled by Home.tsx to prevent duplicate processing
    // const unsubscribeQuickCheck = websocketService.on('quick_check_update', (message) => {
    //   console.log('📢 ShopMonkeyOrdersSection: Quick check update received', message);
    //   
    //   if (message.action === 'created' || message.action === 'updated') {
    //     const quickCheckData = message.data;
    //     if (quickCheckData?.data?.vin) {
    //       addUpdateNotification(
    //         'new_order',
    //         `New QuickCheck created for VIN: ${quickCheckData.data.vin}`,
    //         quickCheckData.id,
    //         quickCheckData.data.vin
    //       );
    //       
    //       // Trigger refresh if we have active orders
    //       if (orders.length > 0) {
    //         setPendingUpdates(prev => new Set([...prev, 'orders']));
    //       }
    //     }
    //   }
    // });

    const unsubscribeStatus = websocketService.on('status_update', (message) => {
      console.log('📣 ShopMonkeyOrdersSection: Status update received', message);
      
      if (message.statusType === 'info' && message.message?.includes('ShopMonkey')) {
        addUpdateNotification('order_update', message.message);
        // Trigger immediate refresh on ShopMonkey-related updates
        loadOrders();
        if (servicesDialogOpen && selectedOrder?.id) {
          fetchDetailedServicesForOrder(selectedOrder.id).then((services) => {
            if (Array.isArray(services) && services.length > 0) {
              setDetailedServicesCache(prev => ({ ...prev, [selectedOrder.id!]: services }));
              setSelectedOrderServices(services);
            }
          }).catch(() => {});
        }
      }
    });

    return () => {
      // unsubscribeQuickCheck(); // DISABLED: No longer subscribing to QuickCheck updates
      unsubscribeStatus();
    };
  }, [realTimeUpdatesEnabled, connectionStatus.connected, addUpdateNotification, orders.length, servicesDialogOpen, selectedOrder?.id, loadOrders]);

  // Auto-refresh management
  useEffect(() => {
    console.log('🔄 Auto-refresh effect triggered:', { autoRefreshEnabled, isAuthenticated });
    
    if (autoRefreshEnabled && isAuthenticated) {
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }

    return () => {
      console.log('🧹 Cleaning up auto-refresh effect');
      stopAutoRefresh();
    };
  }, [autoRefreshEnabled, isAuthenticated]); // Removed startAutoRefresh and stopAutoRefresh from dependencies

  // Clear old notifications
  useEffect(() => {
    const timer = setInterval(() => {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      setUpdateNotifications(prev => 
        prev.filter(notification => notification.timestamp > tenMinutesAgo)
      );
    }, 60000); // Check every minute

    return () => clearInterval(timer);
  }, []);

  // Format customer name
  const formatCustomerName = (customer?: WorkflowOrder['customer']): string => {
    if (!customer) return 'Unknown Customer';
    
    if (customer.companyName) return customer.companyName;
    
    const firstName = customer.firstName || '';
    const lastName = customer.lastName || '';
    return `${firstName} ${lastName}`.trim() || 'Unknown Customer';
  };

  // Format vehicle info
  const formatVehicleInfo = (vehicle?: WorkflowOrder['vehicle']): string => {
    if (!vehicle) return 'Unknown Vehicle';
    
    const year = vehicle.year || '';
    const make = vehicle.make || '';
    const model = vehicle.model || '';
    const submodel = vehicle.submodel || '';
    
    return `${year} ${make} ${model} ${submodel}`.trim() || 'Unknown Vehicle';
  };

  // Format currency
  const formatCurrency = (cents?: number): string => {
    if (!cents) return '$0.00';
    return `$${(cents / 100).toFixed(2)}`;
  };

  // Handle opening detail view
  const handleOpenDetailView = (order: WorkflowOrder) => {
    setSelectedOrder(order);
    setDetailDialogOpen(true);
  };

  // Handle closing detail view
  const handleCloseDetailView = () => {
    setDetailDialogOpen(false);
    setSelectedOrder(null);
  };

  // Handle opening vehicle details
  const handleOpenVehicleDetails = (e: React.MouseEvent, vehicle: WorkflowOrder['vehicle']) => {
    e.stopPropagation();
    if (vehicle) {
      setSelectedOrder({ ...selectedOrder!, vehicle });
      setVehicleDialogOpen(true);
    }
  };

  // Handle closing vehicle details
  const handleCloseVehicleDetails = () => {
    setVehicleDialogOpen(false);
  };

  // Handle opening customer details
  const handleOpenCustomerDetails = (e: React.MouseEvent, customer: WorkflowOrder['customer']) => {
    e.stopPropagation();
    if (customer) {
      setSelectedOrder({ ...selectedOrder!, customer });
      setCustomerDialogOpen(true);
    }
  };

  // Handle closing customer details
  const handleCloseCustomerDetails = () => {
    setCustomerDialogOpen(false);
  };

  const handleOpenServicesDetails = async (e: React.MouseEvent, order: WorkflowOrder) => {
    e.stopPropagation();
    
    // Try to get services from cache first
    let services = detailedServicesCache[order.id];
    
    if (!services || services.length === 0) {
      // Fetch services if not cached
      services = await fetchDetailedServicesForOrder(order.id);
    }
    
    setSelectedOrderServices(services || []);
    setServicesDialogOpen(true);

    // Optimistically refresh this order's services in background to reflect recent toggles
    try {
      const refreshed = await fetchDetailedServicesForOrder(order.id);
      if (refreshed && refreshed.length > 0) {
        setDetailedServicesCache(prev => ({ ...prev, [order.id]: refreshed }));
        // If viewing this order, update the list live
        setSelectedOrderServices(refreshed);
      }
    } catch {}
  };

  const handleCloseServicesDetails = () => {
    setServicesDialogOpen(false);
    setSelectedOrderServices([]);
  };

  // Live-sync services dialog with latest polled services for the selected order
  useEffect(() => {
    if (!servicesDialogOpen) return;
    const orderId = selectedOrder?.id;
    if (!orderId) return;
    const latest = detailedServicesCache[orderId];
    if (Array.isArray(latest) && latest.length > 0) {
      setSelectedOrderServices(latest);
    }
  }, [servicesDialogOpen, selectedOrder?.id, detailedServicesCache]);

  // While the Services dialog is open, poll that order's services on a short interval
  useEffect(() => {
    if (!servicesDialogOpen || !selectedOrder?.id) return;
    let cancelled = false;
    const orderId = selectedOrder.id;
    const refresh = async () => {
      try {
        const services = await fetchDetailedServicesForOrder(orderId);
        if (!cancelled && Array.isArray(services) && services.length >= 0) {
          setDetailedServicesCache(prev => ({ ...prev, [orderId]: services }));
          setSelectedOrderServices(services);
        }
      } catch {}
    };
    // Immediate refresh and start interval
    refresh();
    const intervalMs = Math.max(15000, refreshInterval || 30000); // Increased to reduce API load
    const timer = setInterval(refresh, intervalMs);
    return () => { cancelled = true; clearInterval(timer); };
  }, [servicesDialogOpen, selectedOrder?.id, refreshInterval]);

  // Load data on component mount
  useEffect(() => {
    const token = loadTokenFromStorage();
    if (token) {
      loadOrders();
    }
  }, [loadOrders]);

  // Trigger detailed services fetch when orders are loaded - DISABLED to prevent resource exhaustion
  useEffect(() => {
    if (orders.length > 0) {
      console.log(`📊 Loaded ${orders.length} orders. Services will be fetched on-demand to prevent resource exhaustion.`);
      // DISABLED: Concurrent fetching was causing ERR_INSUFFICIENT_RESOURCES
      // orders.forEach(order => triggerDetailedServicesFetch(order.id));
    }
  }, [orders]);

  // Load oil sticker mappings when component mounts
  useEffect(() => {
    loadOilStickerMappings();
  }, []);

  const groupedOrders = groupOrdersByStatus(orders);
  
  // Order status groups with "Next To Work On" first - only show desired statuses
  const statusOrder = ['Next To Work On', 'Drop Off'];
  
  // Create "In progress" group with Bay statuses
  const bayStatuses = ['Bay 2', 'Bay 3', 'Bay 4'];
  const inProgressOrders = orders.filter(order => {
    const orderStatusName = order.workflowStatus?.name || 
      statuses.find(s => s.id === order.workflowStatusId)?.name;
    return bayStatuses.includes(orderStatusName || '');
  });
  
  // Add "In progress" group to grouped orders if there are bay orders
  if (inProgressOrders.length > 0) {
    groupedOrders['In progress'] = inProgressOrders;
  }
  
  const orderedStatusNames = [
    ...statusOrder.filter(name => groupedOrders[name]), // Include only desired statuses that have orders
    ...(groupedOrders['In progress'] ? ['In progress'] : []) // Add "In progress" if it has orders
  ];

  // Determine inspection type based on services
  const getInspectionType = (order: WorkflowOrder): 'quick_check' | 'no_check' | 'vsi' | 'full_check' => {
    console.log('🔍 Determining inspection type for order:', order.number);
    
    // Check if we have cached detailed services
    const cachedServices = detailedServicesCache[order.id];
    if (cachedServices && cachedServices.length > 0) {
      console.log('✅ Found cached services:', cachedServices.length);
      // Check for specific service names that indicate inspection types
      const serviceNames = cachedServices.map(service => service.name?.toLowerCase() || '');
      console.log('📋 Service names:', serviceNames);
      
      // Check for "VSI" services (Vehicle Safety Inspection)
      if (serviceNames.some(name => name.includes('vsi') || name.includes('vehicle safety inspection') || name.includes('safety inspection'))) {
        console.log('🎯 Detected: VSI');
        return 'vsi';
      }
      
      // Check for "No Checklist" services
      if (serviceNames.some(name => name.includes('no checklist'))) {
        console.log('🎯 Detected: No Check');
        return 'no_check';
      }
      
      // Check for "Full Checklist" services
      if (serviceNames.some(name => name.includes('full checklist') || name.includes('checklist'))) {
        console.log('🎯 Detected: Full Check');
        return 'full_check';
      }
      
      // Check for "Quick Check" services
      if (serviceNames.some(name => name.includes('quick check'))) {
        console.log('🎯 Detected: Quick Check');
        return 'quick_check';
      }
    }
    
    // Fallback: check coalescedName for inspection type indicators
    const coalescedName = order.coalescedName?.toLowerCase() || '';
    console.log('📋 Coalesced name:', coalescedName);
    
    if (coalescedName.includes('vsi') || coalescedName.includes('vehicle safety inspection') || coalescedName.includes('safety inspection')) {
      console.log('🎯 Detected from coalescedName: VSI');
      return 'vsi';
    }
    if (coalescedName.includes('no checklist')) {
      console.log('🎯 Detected from coalescedName: No Check');
      return 'no_check';
    }
    if (coalescedName.includes('full checklist') || coalescedName.includes('checklist')) {
      console.log('🎯 Detected from coalescedName: Full Check');
      return 'full_check';
    }
    if (coalescedName.includes('quick check')) {
      console.log('🎯 Detected from coalescedName: Quick Check');
      return 'quick_check';
    }
    
    // Default to no_check if no specific type is found
    console.log('🎯 Default: No Check');
    return 'no_check';
  };

  // Get inspection type chip color
  const getInspectionTypeChipColor = (type: 'quick_check' | 'no_check' | 'vsi' | 'full_check'): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (type) {
      case 'quick_check':
        return 'primary'; // Blue
      case 'vsi':
        return 'warning'; // Orange (distinctive for safety inspection)
      case 'full_check':
        return 'success'; // Green
      case 'no_check':
        return 'default'; // Gray
      default:
        return 'default';
    }
  };

  // Get status chip color based on status name
  const getStatusChipColor = (statusName: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (statusName) {
      case 'Next To Work On':
        return 'warning'; // Orange
      case 'Drop Off':
        return 'info'; // Blue
      case 'Bay 2':
      case 'Bay 3':
      case 'Bay 4':
        return 'success'; // Green
      default:
        return 'default'; // Gray
    }
  };

  // Handle card click - navigate to appropriate inspection form based on inspection type
  const handleCardClick = (order: WorkflowOrder) => {
    console.log('🖱️ Card clicked for order:', order.number);
    
    const inspectionType = getInspectionType(order);
    
    if (inspectionType === 'quick_check' || inspectionType === 'no_check' || inspectionType === 'vsi' || inspectionType === 'full_check') {
      // Navigate to the correct inspection form with VIN and mileage
      const vin = order.vehicle?.vin || '';
      const mileage = order.vehicle?.mileage || 0;

      console.log('🚗 Vehicle data:', { vin, mileage, inspectionType });

      if (vin) {
        const params = new URLSearchParams({ vin: vin, mileage: mileage.toString() });
        let url: string;
        
        switch (inspectionType) {
          case 'quick_check':
            url = `/quick-check?${params.toString()}`;
            break;
          case 'no_check':
            url = `/no-check?${params.toString()}`;
            break;
          case 'vsi':
            url = `/vsi?${params.toString()}`;
            break;
          case 'full_check': // Full Check now routes to VSI
            console.log('🔄 Routing Full Check to VSI inspection');
            url = `/vsi?${params.toString()}`;
            break;
          default:
            url = `/quick-check?${params.toString()}`;
        }
        
        console.log('🧭 Navigating to:', url);
        navigate(url);
      } else {
        console.log('⚠️ No VIN found, showing error message');
        const inspectionTypeLabel = inspectionType === 'quick_check' ? 'Quick Check' : 
                                   inspectionType === 'no_check' ? 'No Check' : 
                                   inspectionType === 'vsi' ? 'VSI' :
                                   inspectionType === 'full_check' ? 'Full Check (VSI)' : inspectionType;
        setSuccessMessage(`⚠️ No VIN found in this order. VIN is required for ${inspectionTypeLabel} inspection.`);
      }
    } else {
      // Unknown/other inspection type: open order details
      console.log('ℹ️ Opening order details (non-supported inspection type)');
      handleOpenDetailView(order);
    }
  };

  // Handle info icon click - always show order details
  const handleInfoClick = (e: React.MouseEvent, order: WorkflowOrder) => {
    e.stopPropagation(); // Prevent card click
    console.log('ℹ️ Info icon clicked for order:', order.number);
    handleOpenDetailView(order);
  };

  if (!isAuthenticated) {
    return (
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BuildIcon color="primary" />
          ShopMonkey Work Queue
        </Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          ShopMonkey authentication required to view work orders.
        </Alert>
        <Tooltip title="Login to ShopMonkey to view work orders and manage your workflow">
          <Button
            variant="contained"
            startIcon={<LoginIcon />}
            onClick={() => {
              console.log('Login button clicked, setting showLoginDialog to true');
              setShowLoginDialog(true);
            }}
            sx={{ mt: 1 }}
          >
            Login to ShopMonkey
          </Button>
        </Tooltip>

        {/* Login Dialog - Always render this */}
        <Dialog
          open={showLoginDialog}
          onClose={() => setShowLoginDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            pb: 1
          }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Login to ShopMonkey
            </Typography>
            <IconButton 
              onClick={() => setShowLoginDialog(false)} 
              size="small"
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          
          <DialogContent sx={{ pt: 1 }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Enter your ShopMonkey credentials to access work orders
              </Typography>
            </Box>

            {loginError && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {loginError}
              </Alert>
            )}

            <Box sx={{ spaceY: 2 }}>
              <TextField
                label="Email"
                type="email"
                value={loginCredentials.email}
                onChange={(e) => setLoginCredentials(prev => ({ ...prev, email: e.target.value }))}
                fullWidth
                required
                disabled={loggingIn}
                sx={{ mb: 2 }}
              />
              <TextField
                label="Password"
                type="password"
                value={loginCredentials.password}
                onChange={(e) => setLoginCredentials(prev => ({ ...prev, password: e.target.value }))}
                fullWidth
                required
                disabled={loggingIn}
                sx={{ mb: 2 }}
              />
            </Box>
          </DialogContent>
          
          <DialogActions>
            <Button 
              onClick={() => setShowLoginDialog(false)}
              disabled={loggingIn}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleLogin}
              variant="contained"
              disabled={loggingIn || !loginCredentials.email || !loginCredentials.password}
              startIcon={loggingIn ? <CircularProgress size={16} /> : <LoginIcon />}
            >
              {loggingIn ? 'Logging in...' : 'Login'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: showDebugControls ? 1 : 4 }}>
      {/* Section Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: showDebugControls ? 1 : 3 }}>
        <Box>
          <Typography variant="h5" component="h2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BuildIcon color="primary" />
            ShopMonkey
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Estimates - Drop Off, Next To Work On & In Progress
          </Typography>
        </Box>
      
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Refresh Orders">
            <IconButton 
              onClick={loadOrders} 
              disabled={loading}
              size="small"
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Logout from ShopMonkey">
            <IconButton
              onClick={handleLogout}
              size="small"
              color="error"
            >
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Real-time Update Status Bar */}
      {/* Real-time Update Status Bar - Only shown when debug is enabled */}
      {showDebugControls && (
        <Paper sx={{ p: 1, mb: 1, backgroundColor: 'background.default' }}>
          <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} alignItems="center" justifyContent="space-between" gap={2}>
            <Box display="flex" alignItems="center" gap={2}>
              <Box display="flex" alignItems="center" gap={1}>
                {connectionStatus.connected ? (
                  <WifiIcon color="success" />
                ) : (
                  <WifiOffIcon color="error" />
                )}
                <Typography variant="body2" color={connectionStatus.connected ? 'success.main' : 'error.main'}>
                  WebSocket: {connectionStatus.connected ? 'Connected' : 'Disconnected'}
                </Typography>
              </Box>
              
              <Box display="flex" alignItems="center" gap={1}>
                {autoRefreshEnabled ? (
                  <SyncIcon color="primary" />
                ) : (
                  <SyncDisabledIcon color="disabled" />
                )}
                <Typography variant="body2" color={autoRefreshEnabled ? 'primary.main' : 'text.disabled'}>
                  Auto-refresh: {autoRefreshEnabled ? 'Enabled' : 'Disabled'}
                </Typography>
              </Box>
              
              <Typography variant="body2" color="text.secondary">
                Interval: {refreshInterval / 1000}s (Faster updates)
              </Typography>
              
              {isTimerActive && (
                <Typography variant="body2" color="success.main">
                  Timer: Active
                </Typography>
              )}
            </Box>
            
            <Box display="flex" alignItems="center" gap={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={realTimeUpdatesEnabled}
                    onChange={(e) => setRealTimeUpdatesEnabled(e.target.checked)}
                    size="small"
                  />
                }
                label="Real-time Updates"
              />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={autoRefreshEnabled}
                    onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
                    size="small"
                  />
                }
                label="Auto-refresh"
              />
              
              <Tooltip title="Update History">
                <IconButton 
                  onClick={() => setShowUpdateHistory(!showUpdateHistory)}
                  color="primary"
                  size="small"
                >
                  <Badge badgeContent={updateNotifications.length} color="secondary">
                    <NotificationsIcon />
                  </Badge>
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Debug: Test Auto-refresh">
                <IconButton 
                  onClick={() => {
                    console.log('🔧 Debug: Manually triggering auto-refresh test');
                    if (refreshTimer) {
                      console.log('🔧 Debug: Timer exists, clearing and restarting');
                      clearInterval(refreshTimer);
                      setRefreshTimer(null);
                      setIsTimerActive(false);
                    }
                    startAutoRefresh();
                  }}
                  color="secondary"
                  size="small"
                >
                  <SyncIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          
          {lastRefreshTime && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Last refresh: {lastRefreshTime.toLocaleTimeString()}
            </Typography>
          )}
          
          {pendingUpdates.size > 0 && (
            <Alert severity="info" sx={{ mt: 1 }}>
              <Typography variant="body2">
                Pending updates detected. Click refresh to sync latest data.
              </Typography>
            </Alert>
          )}
        </Paper>
      )}

      {/* Update History Dialog */}
      {showDebugControls && (
        <Dialog 
          open={showUpdateHistory} 
          onClose={() => setShowUpdateHistory(false)}
          maxWidth="md"
          fullWidth
        >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <NotificationsIcon />
            Real-time Update History
          </Box>
        </DialogTitle>
        <DialogContent>
          {updateNotifications.length === 0 ? (
            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
              No recent updates
            </Typography>
          ) : (
            <List>
              {updateNotifications.map((notification) => (
                <ListItem key={notification.id} divider>
                  <ListItemIcon>
                    {notification.type === 'new_order' && <AddIcon color="success" />}
                    {notification.type === 'order_update' && <InfoIcon color="info" />}
                    {notification.type === 'status_change' && <CheckCircleIcon color="primary" />}
                    {notification.type === 'service_completion' && <WorkIcon color="secondary" />}
                  </ListItemIcon>
                  <ListItemText
                    primary={notification.message}
                    secondary={notification.timestamp.toLocaleString()}
                  />
                  <ListItemSecondaryAction>
                    <Chip 
                      label={notification.type.replace('_', ' ')} 
                      size="small" 
                      variant="outlined"
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUpdateNotifications([])}>
            Clear History
          </Button>
          <Button onClick={() => setShowUpdateHistory(false)}>
            Close
          </Button>
        </DialogActions>
        </Dialog>
      )}

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Success Message */}
      {successMessage && (
        <Alert 
          severity={successMessage.startsWith('✅') ? 'success' : successMessage.startsWith('⚠️') ? 'warning' : successMessage.startsWith('ℹ️') ? 'info' : 'error'} 
          sx={{ mb: 2 }}
          onClose={() => setSuccessMessage('')}
        >
          {successMessage}
        </Alert>
      )}

      {/* Orders Content */}
      {!loading && !error && (
        <>
          {orders.length === 0 ? (
            <Card sx={{ p: 4, textAlign: 'center' }}>
              <BuildIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Orders Found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                No active estimates in "Drop Off", "Next To Work On", or "In progress" status
              </Typography>
            </Card>
          ) : (
            <Box>
              {/* Grouped Orders */}
              {orderedStatusNames.map((statusName) => {
                const statusOrders = groupedOrders[statusName];
                
                return (
                  <Box key={statusName} sx={{ mb: 2 }}>
                    {/* Status Header */}
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1, 
                      mb: 1,
                      p: 1,
                      backgroundColor: statusName === 'Next To Work On' ? '#e3f2fd' : 
                                    statusName === 'In progress' ? '#fff3e0' : '#f5f5f5',
                      borderRadius: 1
                    }}>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {statusName}
                        <span style={{ color: '#1976d2', marginLeft: '4px', fontWeight: 'bold', fontSize: '1.1em' }}>
                          {statusOrders.length}
                        </span>
                      </Typography>
                      {statusName === 'Next To Work On' && (
                        <Chip 
                          label="Priority"
                          size="small"
                          color="warning"
                          variant="outlined"
                        />
                      )}
                      {statusName === 'In progress' && (
                        <Chip 
                          label="In Progress"
                          size="small"
                          color="info"
                          variant="outlined"
                        />
                      )}
                    </Box>

                    {/* Orders Grid */}
                    <Box sx={{ display: 'grid', gap: 1 }}>
                      {statusOrders.map((order) => {
                        const inspectionType = getInspectionType(order);
                        
                        return (
                          <Tooltip 
                            key={order.id}
                            title={getInspectionType(order) === 'quick_check' 
                              ? 'Click to start Quick Check inspection' 
                              : 'Click to view order details'
                            }
                            placement="top"
                          >
                            <Card 
                              key={order.id} 
                              variant="outlined" 
                              sx={{ 
                                '&:hover': { boxShadow: 1 },
                                cursor: 'pointer',
                                borderColor: getInspectionType(order) === 'quick_check' ? 'primary.main' : 'divider',
                                borderWidth: getInspectionType(order) === 'quick_check' ? 2 : 1,
                                position: 'relative',
                                // Subtle loading animation for cards being updated
                                ...(updatingOrders.has(order.id) && {
                                  '&::before': {
                                    content: '""',
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    height: '2px',
                                    background: 'linear-gradient(90deg, transparent, #1976d2, transparent)',
                                    animation: 'loading-shimmer 2s ease-in-out infinite',
                                    zIndex: 1
                                  }
                                })
                              }}
                              onClick={() => handleCardClick(order)}
                            >
                              <CardContent sx={{ p: 1 }}>
                                {/* Header Row - More Compact */}
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                      #{order.number || 'N/A'}
                                    </Typography>
                                    
                                    {/* Status Chip */}
                                    {(() => {
                                      const orderStatusName = order.workflowStatus?.name || 
                                        statuses.find(s => s.id === order.workflowStatusId)?.name;
                                      return orderStatusName ? (
                                        <Chip
                                          label={orderStatusName}
                                          size="small"
                                          color={getStatusChipColor(orderStatusName)}
                                          variant="outlined"
                                          sx={{ 
                                            fontSize: '0.65rem', 
                                            height: '18px',
                                            fontWeight: 500
                                          }}
                                        />
                                      ) : null;
                                    })()}
                                    
                                    {/* Inspection Type Chip */}
                                    <Chip
                                      label={inspectionType === 'quick_check' ? 'Quick Check' : 
                                             inspectionType === 'vsi' ? 'VSI' :
                                             inspectionType === 'full_check' ? 'Full Check' : 'No Check'}
                                      size="small"
                                      color={getInspectionTypeChipColor(inspectionType)}
                                      variant="outlined"
                                      sx={{ 
                                        fontSize: '0.65rem', 
                                        height: '18px'
                                      }}
                                    />

                                    {/* Oil Type Chip */}
                                    {(() => {
                                      const oilType = findOilTypeFromServices(order);
                                      return oilType ? (
                                        <Chip
                                          label={`🛢️ ${oilType}`}
                                          size="small"
                                          color={getOilTypeChipColor(oilType)}
                                          variant="outlined"
                                          sx={{ fontSize: '0.65rem', height: '18px' }}
                                        />
                                      ) : null;
                                    })()}

                                    {/* Services Chip */}
                                    <Chip
                                      label={`🔧 Services`}
                                      size="small"
                                      color="info"
                                      variant="outlined"
                                      onClick={(e) => handleOpenServicesDetails(e, order)}
                                      sx={{ 
                                        fontSize: '0.65rem', 
                                        height: '18px',
                                        cursor: 'pointer',
                                        '&:hover': {
                                          backgroundColor: 'info.light',
                                          color: 'white'
                                        }
                                      }}
                                    />
                                    
                                    {/* Info Icon */}
                                    <Tooltip title="View order details" placement="top">
                                      <IconButton
                                        size="small"
                                        onClick={(e) => handleInfoClick(e, order)}
                                        sx={{ 
                                          p: 0.25,
                                          color: 'action.active',
                                          '&:hover': {
                                            color: 'primary.main',
                                            backgroundColor: 'action.hover'
                                          }
                                        }}
                                      >
                                        <InfoIcon fontSize="small" sx={{ fontSize: '0.9rem' }} />
                                      </IconButton>
                                    </Tooltip>

                                    {/* Create Oil Sticker Button */}
                                    {(() => {
                                      const oilType = findOilTypeFromServices(order);
                                      const hasVin = order.vehicle?.vin;
                                      return oilType && hasVin ? (
                                        <Tooltip title="Create Oil Sticker" placement="top">
                                          <IconButton
                                            size="small"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              printOilSticker(order);
                                            }}
                                            disabled={printingSticker === order.id}
                                            sx={{ 
                                              p: 0.25,
                                              color: 'primary.main',
                                              '&:hover': {
                                                color: 'primary.dark',
                                                backgroundColor: 'primary.light'
                                              }
                                            }}
                                          >
                                            {printingSticker === order.id ? (
                                              <CircularProgress size={12} />
                                            ) : (
                                              <StickerIcon fontSize="small" sx={{ fontSize: '1.2rem' }} />
                                            )}
                                          </IconButton>
                                        </Tooltip>
                                      ) : null;
                                    })()}
                                  </Box>
                                  <Box sx={{ textAlign: 'right' }}>
                                    {order.authorized && (
                                      <Chip label="Authorized" size="small" color="success" sx={{ fontSize: '0.65rem', height: '18px' }} />
                                    )}
                                  </Box>
                                </Box>

                                {/* Description - Smaller font */}
                                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', mb: 0.5, lineHeight: 1.2 }}>
                                  {order.coalescedName || order.generatedName || order.name || 'No description'}
                                  {order.vehicle?.vin && (
                                    <span style={{ color: 'text.secondary', fontSize: '0.7rem' }}>
                                      {' • VIN: '}{order.vehicle.vin}
                                    </span>
                                  )}
                                </Typography>

                                {/* Info Row - More Compact */}
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 0.5, alignItems: 'center', justifyContent: 'space-between' }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                                    <CarIcon fontSize="small" color="action" sx={{ fontSize: '0.8rem' }} />
                                    <Typography 
                                      variant="caption" 
                                      sx={{ 
                                        fontWeight: 500, 
                                        fontSize: '0.75rem',
                                        cursor: 'pointer',
                                        textDecoration: 'underline',
                                        '&:hover': { color: 'primary.main' }
                                      }}
                                      onClick={(e) => handleOpenVehicleDetails(e, order.vehicle)}
                                    >
                                      {formatVehicleInfo(order.vehicle)}
                                    </Typography>
                                  </Box>

                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                                    <ScheduleIcon fontSize="small" color="action" sx={{ fontSize: '0.8rem' }} />
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                      {order.createdDate ? new Date(order.createdDate).toLocaleDateString() : 'No date'}
                                    </Typography>
                                  </Box>

                                  {/* Labels - Moved to right side */}
                                  {order.labels && order.labels.length > 0 && (
                                    <Box sx={{ display: 'flex', gap: 0.25, flexWrap: 'wrap' }}>
                                      {order.labels.map((label) => (
                                        <Chip
                                          key={label.id}
                                          label={label.name}
                                          size="small"
                                          color={getColorForLabel(label.color)}
                                          sx={{
                                            fontSize: '0.65rem',
                                            height: '18px'
                                          }}
                                        />
                                      ))}
                                    </Box>
                                  )}
                                </Box>
                              </CardContent>
                            </Card>
                          </Tooltip>
                        );
                      })}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
        </>
      )}

      {/* Detail View Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={handleCloseDetailView}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          pb: 1
        }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Order Details - #{selectedOrder?.number || 'N/A'}
          </Typography>
          <IconButton onClick={handleCloseDetailView} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ pt: 1 }}>
          {selectedOrder && (
            <Box>
              {/* Order Header */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                  {selectedOrder.coalescedName || selectedOrder.generatedName || selectedOrder.name || 'No description'}
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Chip 
                    label={selectedOrder.workflowStatus?.name || 'Unknown Status'} 
                    color="primary" 
                    size="small"
                  />
                  <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
                    {formatCurrency(selectedOrder.totalCostCents)}
                  </Typography>
                  {selectedOrder.authorized && (
                    <Chip label="Authorized" size="small" color="success" />
                  )}
                  {selectedOrder.invoiced && (
                    <Chip label="Invoiced" size="small" color="warning" />
                  )}
                </Box>
              </Box>

              <Divider sx={{ mb: 3 }} />

              {/* Customer Information */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Customer Information
                </Typography>
                <Box sx={{ display: 'grid', gap: 2 }}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                      {formatCustomerName(selectedOrder.customer)}
                    </Typography>
                    {selectedOrder.customer?.emails?.[0] && (
                      <Typography variant="body2" color="text.secondary">
                        Email: {selectedOrder.customer.emails[0].email}
                      </Typography>
                    )}
                    {selectedOrder.customer?.phoneNumbers?.[0] && (
                      <Typography variant="body2" color="text.secondary">
                        Phone: {selectedOrder.customer.phoneNumbers[0].number}
                      </Typography>
                    )}
                    {selectedOrder.customer?.address1 && (
                      <Typography variant="body2" color="text.secondary">
                        Address: {selectedOrder.customer.address1}
                        {selectedOrder.customer.city && `, ${selectedOrder.customer.city}`}
                        {selectedOrder.customer.state && `, ${selectedOrder.customer.state}`}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>

              {/* Vehicle Information */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Vehicle Information
                </Typography>
                <Box sx={{ display: 'grid', gap: 2 }}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                      {formatVehicleInfo(selectedOrder.vehicle)}
                    </Typography>
                    {selectedOrder.vehicle?.vin && (
                      <Typography variant="body2" color="text.secondary">
                        VIN: {selectedOrder.vehicle.vin}
                      </Typography>
                    )}
                    {selectedOrder.vehicle?.licensePlate && (
                      <Typography variant="body2" color="text.secondary">
                        License: {selectedOrder.vehicle.licensePlate}
                        {selectedOrder.vehicle.licensePlateState && ` (${selectedOrder.vehicle.licensePlateState})`}
                      </Typography>
                    )}
                    {selectedOrder.vehicle?.mileage && (
                      <Typography variant="body2" color="text.secondary">
                        Mileage: {selectedOrder.vehicle.mileage.toLocaleString()}
                        {selectedOrder.vehicle.mileageUnit && ` ${selectedOrder.vehicle.mileageUnit}`}
                      </Typography>
                    )}
                    {selectedOrder.vehicle?.color && (
                      <Typography variant="body2" color="text.secondary">
                        Color: {selectedOrder.vehicle.color}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>

              {/* Order Details */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Order Details
                </Typography>
                <Box sx={{ display: 'grid', gap: 2 }}>
                  {selectedOrder.createdDate && (
                    <Typography variant="body2">
                      <strong>Created:</strong> {new Date(selectedOrder.createdDate).toLocaleString()}
                    </Typography>
                  )}
                  {selectedOrder.updatedDate && (
                    <Typography variant="body2">
                      <strong>Last Updated:</strong> {new Date(selectedOrder.updatedDate).toLocaleString()}
                    </Typography>
                  )}
                  {selectedOrder.purchaseOrderNumber && (
                    <Typography variant="body2">
                      <strong>PO Number:</strong> {selectedOrder.purchaseOrderNumber}
                    </Typography>
                  )}
                  {selectedOrder.complaint && (
                    <Typography variant="body2">
                      <strong>Complaint:</strong> {selectedOrder.complaint}
                    </Typography>
                  )}
                  {selectedOrder.recommendation && (
                    <Typography variant="body2">
                      <strong>Recommendation:</strong> {selectedOrder.recommendation}
                    </Typography>
                  )}
                </Box>
              </Box>

              {/* Labels */}
              {selectedOrder.labels && selectedOrder.labels.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Labels
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {selectedOrder.labels.map((label) => (
                      <Chip
                        key={label.id}
                        label={label.name}
                        size="small"
                        color={getColorForLabel(label.color)}
                      />
                    ))}
                  </Box>
                </Box>
              )}

              {/* Oil Type and Actions */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Actions
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Oil Type Chip */}
                  {(() => {
                    const oilType = findOilTypeFromServices(selectedOrder);
                    return oilType ? (
                      <Chip
                        label={`🛢️ ${oilType}`}
                        size="small"
                        color={getOilTypeChipColor(oilType)}
                        variant="outlined"
                      />
                    ) : null;
                  })()}

                  {/* Create Oil Sticker Button */}
                  {(() => {
                    const oilType = findOilTypeFromServices(selectedOrder);
                    const hasVin = selectedOrder.vehicle?.vin;
                    return oilType && hasVin ? (
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => printOilSticker(selectedOrder)}
                        disabled={printingSticker === selectedOrder.id}
                        startIcon={printingSticker === selectedOrder.id ? <CircularProgress size={16} /> : null}
                      >
                        {printingSticker === selectedOrder.id ? 'Creating...' : 'Create Oil Sticker'}
                      </Button>
                    ) : null;
                  })()}
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleCloseDetailView}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Vehicle Details Dialog */}
      <Dialog
        open={vehicleDialogOpen}
        onClose={handleCloseVehicleDetails}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          pb: 1
        }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Vehicle Details
          </Typography>
          <IconButton onClick={handleCloseVehicleDetails} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ pt: 1 }}>
          {selectedOrder?.vehicle && (
            <Box>
              {/* Vehicle Header */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                  {formatVehicleInfo(selectedOrder.vehicle)}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                  <CarIcon color="primary" />
                  <Typography variant="body2" color="text.secondary">
                    Vehicle Information
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ mb: 3 }} />

              {/* Vehicle Details */}
              <Box sx={{ display: 'grid', gap: 2 }}>
                {selectedOrder.vehicle.vin && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                      VIN
                    </Typography>
                    <Typography variant="body1" sx={{ fontFamily: 'monospace', backgroundColor: 'grey.100', p: 1, borderRadius: 1 }}>
                      {selectedOrder.vehicle.vin}
                    </Typography>
                  </Box>
                )}

                {selectedOrder.vehicle.licensePlate && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                      License Plate
                    </Typography>
                    <Typography variant="body1">
                      {selectedOrder.vehicle.licensePlate}
                      {selectedOrder.vehicle.licensePlateState && (
                        <Chip 
                          label={selectedOrder.vehicle.licensePlateState} 
                          size="small" 
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Typography>
                  </Box>
                )}

                {selectedOrder.vehicle.mileage && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                      Mileage
                    </Typography>
                    <Typography variant="body1">
                      {selectedOrder.vehicle.mileage.toLocaleString()}
                      {selectedOrder.vehicle.mileageUnit && ` ${selectedOrder.vehicle.mileageUnit}`}
                    </Typography>
                  </Box>
                )}

                {selectedOrder.vehicle.color && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                      Color
                    </Typography>
                    <Typography variant="body1">
                      {selectedOrder.vehicle.color}
                    </Typography>
                  </Box>
                )}

                {selectedOrder.vehicle.submodel && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                      Submodel
                    </Typography>
                    <Typography variant="body1">
                      {selectedOrder.vehicle.submodel}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleCloseVehicleDetails}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Customer Details Dialog */}
      <Dialog
        open={customerDialogOpen}
        onClose={handleCloseCustomerDetails}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          pb: 1
        }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Customer Details
          </Typography>
          <IconButton onClick={handleCloseCustomerDetails} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ pt: 1 }}>
          {selectedOrder?.customer && (
            <Box>
              {/* Customer Header */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                  {formatCustomerName(selectedOrder.customer)}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                  <PersonIcon color="primary" />
                  <Typography variant="body2" color="text.secondary">
                    Customer Information
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ mb: 3 }} />

              {/* Contact Information */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Contact Information
                </Typography>
                <Box sx={{ display: 'grid', gap: 2 }}>
                  {selectedOrder.customer.emails && selectedOrder.customer.emails.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                        Email Addresses
                      </Typography>
                      {selectedOrder.customer.emails.map((email, index) => (
                        <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography variant="body1" sx={{ color: 'primary.main' }}>
                            {email.email}
                          </Typography>
                          {email.primary && (
                            <Chip label="Primary" size="small" color="primary" />
                          )}
                        </Box>
                      ))}
                    </Box>
                  )}

                  {selectedOrder.customer.phoneNumbers && selectedOrder.customer.phoneNumbers.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                        Phone Numbers
                      </Typography>
                      {selectedOrder.customer.phoneNumbers.map((phone, index) => (
                        <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography variant="body1">
                            {phone.number}
                          </Typography>
                          {phone.primary && (
                            <Chip label="Primary" size="small" color="primary" />
                          )}
                          {phone.type && (
                            <Chip label={phone.type} size="small" variant="outlined" />
                          )}
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              </Box>

              {/* Address Information */}
              {(selectedOrder.customer.address1 || selectedOrder.customer.city || selectedOrder.customer.state) && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Address
                  </Typography>
                  <Box>
                    {selectedOrder.customer.address1 && (
                      <Typography variant="body1" sx={{ mb: 0.5 }}>
                        {selectedOrder.customer.address1}
                      </Typography>
                    )}
                    {(selectedOrder.customer.city || selectedOrder.customer.state) && (
                      <Typography variant="body1" color="text.secondary">
                        {[selectedOrder.customer.city, selectedOrder.customer.state].filter(Boolean).join(', ')}
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleCloseCustomerDetails}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Services Details Dialog */}
      <Dialog
        open={servicesDialogOpen}
        onClose={handleCloseServicesDetails}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          pb: 1
        }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Order Services
          </Typography>
          <IconButton onClick={handleCloseServicesDetails} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ pt: 1 }}>
          {selectedOrderServices.length > 0 ? (
            <Box>
              {selectedOrderServices.map((service, index) => (
                <Box key={service.id || index} sx={{ mb: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                  {/* Service Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {service.name}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      {service.completed && (
                        <Chip label="Completed" size="small" color="success" />
                      )}
                      {service.recommended && (
                        <Chip label="Recommended" size="small" color="warning" />
                      )}
                      <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
                        {formatCurrency(service.totalCents)}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Service Details */}
                  {service.note && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {service.note}
                    </Typography>
                  )}

                  {/* Parts */}
                  {service.parts && service.parts.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                        Parts
                      </Typography>
                      {service.parts.map((part: any, partIndex: number) => (
                        <Box key={part.id || partIndex} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                          <Typography variant="body2">
                            • {part.name} (Qty: {part.quantity})
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {formatCurrency(part.retailCostCents)}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  )}

                  {/* Labor */}
                  {service.labors && service.labors.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                        Labor
                      </Typography>
                      {service.labors.map((labor: any, laborIndex: number) => (
                        <Box key={labor.id || laborIndex} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                          <Typography variant="body2">
                            • {labor.name || 'Labor'} ({labor.hours} hrs @ {formatCurrency(labor.rateCents)}/hr)
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {labor.completed ? '✅ Done' : '⏳ Pending'}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  )}

                  {/* Subcontracts */}
                  {service.subcontracts && service.subcontracts.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                        Subcontracts
                      </Typography>
                      {service.subcontracts.map((subcontract: any, subIndex: number) => (
                        <Box key={subcontract.id || subIndex} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                          <Typography variant="body2">
                            • {subcontract.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {formatCurrency(subcontract.costCents)}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  )}

                  {/* Tires */}
                  {service.tires && service.tires.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                        Tires
                      </Typography>
                      {service.tires.map((tire: any, tireIndex: number) => (
                        <Box key={tire.id || tireIndex} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                          <Typography variant="body2">
                            • {tire.name} (Qty: {tire.quantity})
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {formatCurrency(tire.retailCostCents)}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <BuildIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Services Found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                No detailed services are available for this order.
              </Typography>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleCloseServicesDetails}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manual Oil Type Selection Dialog */}
      <Dialog
        open={showOilTypeDialog}
        onClose={() => {
          setShowOilTypeDialog(false);
          setPendingOrderForOilType(null);
          setSelectedOilTypeId('');
          setDetectedOilTypeName('');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          pb: 1
        }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Select Oil Type
          </Typography>
          <IconButton 
            onClick={() => {
              setShowOilTypeDialog(false);
              setPendingOrderForOilType(null);
              setSelectedOilTypeId('');
              setDetectedOilTypeName('');
            }} 
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ pt: 1 }}>
          <Box>
            {/* Order Information */}
            {pendingOrderForOilType && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                  Order #{pendingOrderForOilType.number || 'N/A'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {pendingOrderForOilType.coalescedName || pendingOrderForOilType.generatedName || pendingOrderForOilType.name || 'No description'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Vehicle: {formatVehicleInfo(pendingOrderForOilType.vehicle)}
                </Typography>
              </Box>
            )}

            <Divider sx={{ mb: 3 }} />

            {/* Detection Warning */}
            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Automatic detection limited:</strong> Using order description "{detectedOilTypeName}" as fallback. 
                Please select the correct oil type below.
              </Typography>
            </Alert>

            {/* Oil Type Selection */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Select Oil Type
              </Typography>
              <FormControl fullWidth>
                <InputLabel>Oil Type</InputLabel>
                <Select
                  value={selectedOilTypeId}
                  onChange={(e) => setSelectedOilTypeId(e.target.value)}
                  label="Oil Type"
                >
                  {StickerStorageService.getOilTypes().map((oilType) => (
                    <MenuItem key={oilType.id} value={oilType.id}>
                      <Box>
                        <Typography variant="body1">
                          {oilType.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {oilType.durationInDays} days / {oilType.mileageInterval.toLocaleString()} miles
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Help Text */}
            <Alert severity="info">
              <Typography variant="body2">
                <strong>Tip:</strong> For better automatic detection, click the order to load full details first, 
                then try creating the sticker from the order details page.
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button 
            onClick={() => {
              setShowOilTypeDialog(false);
              setPendingOrderForOilType(null);
              setSelectedOilTypeId('');
              setDetectedOilTypeName('');
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleManualOilTypeSelection}
            variant="contained"
            disabled={!selectedOilTypeId}
            startIcon={printingSticker === pendingOrderForOilType?.id ? <CircularProgress size={16} /> : null}
          >
            {printingSticker === pendingOrderForOilType?.id ? 'Creating...' : 'Create Sticker'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ShopMonkeyOrdersSection;