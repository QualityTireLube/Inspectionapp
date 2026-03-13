import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Divider,
  Checkbox,
  FormControlLabel,
  Switch,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  Tooltip,
  Snackbar,
  Badge,
  Fab,
  Zoom,
  Collapse,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Key as KeyIcon,
  Assignment as OrderIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
  FilterList as FilterIcon,
  Archive as ArchiveIcon,
  Unarchive as UnarchiveIcon,
  Update as UpdateIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Check as CheckIcon,
  Cancel as CancelIcon,
  Edit as EditIcon,
  Label as LabelIcon,
  LocalOffer as TagIcon,
  BugReport as BugReportIcon,
  Build as ServiceIcon,
  Search as SearchIcon,
  AttachMoney as MoneyIcon,
  Settings as SettingsIcon,
  Print as PrintIcon,
  CarRepair as OilChangeIcon,
  Info as InfoIcon,
  Close as CloseIcon,
  DirectionsCar as CarIcon,
  Person as PersonIcon,
  Work as WorkIcon,
  Sync as SyncIcon,
  SyncDisabled as SyncDisabledIcon,
  Wifi as WifiIcon,
  WifiOff as WifiOffIcon,
  Timer as TimerIcon,
  AutoAwesome as AutoAwesomeIcon,
  Notifications as NotificationsIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { StickerStorageService } from '../services/stickerStorage';
import { PDFGeneratorService } from '../services/pdfGenerator';
import { VinDecoderService } from '../services/vinDecoder';
import { StaticSticker } from '../types/stickers';
import { decodeVinCached } from '../services/api';
import PrintApiService from '../services/printApi';
import { useWebSocket } from '../contexts/WebSocketProvider';
import { websocketService } from '../services/websocketService';

// Use our local API proxy endpoints - determine base URL
const getBaseUrl = () => {
  const hostname = window.location.hostname;
  const port = '5001';
  const protocol = 'https:';
  return `${protocol}//${hostname}:${port}/api`;
};

const API_BASE_URL = getBaseUrl();

// Hardcoded ShopMonkey token for testing
const SHOPMONKEY_TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjaWQiOiI2Mzk4YmFhZjRjZjcyMzAwMjQ0NGVkY2YiLCJpZCI6IjY2ODQ0NjU3NjA2NDhkZDdiZDZiY2NhZiIsImxpZCI6IjYzOThiYWFmNGNmNzIzMDAyNDQ0ZWRjZiIsInAiOiJhcGkiLCJyaWQiOiJ1YzEiLCJzYWQiOjAsInNpZCI6IjA1ZDA1YTFjNmJkYWI1ZTIiLCJkYXRhU2hhcmluZyI6ZmFsc2UsImhhc0hxIjpmYWxzZSwib25iIjo3LCJwYXkiOjYsImF1ZCI6ImFwaSIsImlzcyI6Imh0dHBzOi8vYXBpLnNob3Btb25rZXkuY2xvdWQiLCJpYXQiOjE3NTEyNDA3MDIsImV4cCI6NDkwNzAwMDcwMn0.Ep2_Dyc23S8yd6eHK4--oiYzRsaCHdaJmy-Ix9MVhe0';

// Manual API key
const MANUAL_API_KEY = {
  id: 'manual-quick-check',
  name: 'Quick check',
  audience: 'api',
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjaWQiOiI2Mzk4YmFhZjRjZjcyMzAwMjQ0NGVkY2YiLCJpZCI6IjY2ODQ0NjU3NjA2NDhkZDciODUiLCJsaWQiOiI2Mzk4YmFhZjRjZjcyMzAwMjQ0NGVkY2YiLCJwIjoiYXBpIiwicmlkIjoidWMxIiwic2FkIjowLCJzaWQiOiIwNWQwNWExYzZiZGFiNWUyIiwiZGF0YVNoYXJpbmciOmZhbHNlLCJoYXNIcSI6ZmFsc2UsIm9uYiI6NywicGF5Ijo2LCJhdWQiOiJhcGkiLCJpc3MiOiJodHRwczovL2FwaS5zaG9wbW9ua2V5LmNsb3VkIiwiaWF0IjoxNzUxMjQwNzAyLCJleHAiOjQ5MDcwMDA3MDJ9.Ep2_Dyc23S8yd6eHK4--oiYzRsaCHdaJmy-Ix9MVhe0',
  expiresAt: '2125-06-29T12:00:00.000Z', // Very long expiration based on JWT
  createdAt: '2025-06-29T19:25:02.000Z'
};

interface ApiKey {
  id: string;
  name: string;
  audience: string;
  expiresAt: string;
  createdAt: string;
}

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

interface DetailedOrder {
  id: string;
  publicId?: string;
  number?: number;
  name?: string;
  generatedName?: string;
  coalescedName?: string;
  workflowStatusId?: string;
  workflowStatusPosition?: number;
  totalCostCents?: number;
  createdDate?: string;
  updatedDate?: string | null;
  orderCreatedDate?: string;
  companyId?: string;
  locationId?: string;
  vehicleId?: string | null;
  customerId?: string | null;
  complaint?: string | null;
  recommendation?: string | null;
  purchaseOrderNumber?: string | null;
  archived?: boolean;
  authorized?: boolean;
  authorizedDate?: string | null;
  invoiced?: boolean;
  paid?: boolean;
  inspectionStatus?: string;
  inspectionCount?: number;
  messageCount?: number;
  assignedTechnicianIds?: string[];
  paidCostCents?: number;
  remainingCostCents?: number | null;
  partsCents?: number;
  tiresCents?: number;
  laborCents?: number;
  subcontractsCents?: number;
  epaCents?: number;
  discountCents?: number;
  discountPercent?: number;
  shopSuppliesCents?: number;
  feesCents?: number;
  taxCents?: number;
  dueDate?: string | null;
  serviceWriterId?: string | null;
  mileageIn?: number | null;
  mileageOut?: number | null;
  completedDate?: string | null;
  deleted?: boolean;
  readOnly?: boolean;
  deferredServiceCount?: number;
  customFields?: Record<string, any>;
  profitability?: {
    totalProfitPercent?: number;
    totalProfitCents?: number;
    totalRetailCents?: number;
    totalWholesaleCents?: number;
    totalDiscountCents?: number;
    totalDiscountPercent?: number;
  };
  customer?: {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
    companyName?: string | null;
    address1?: string | null;
    address2?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    postalCode?: string | null;
    note?: string;
    marketingOptIn?: boolean;
    taxExempt?: boolean;
    discountPercent?: number;
    emails?: Array<{
      id: string;
      email: string;
      primary: boolean;
      subscribed: boolean;
    }>;
    phoneNumbers?: Array<{
      id: string;
      number: string;
      extension?: string | null;
      type?: string | null;
      primary: boolean;
      optIn: boolean;
    }>;
    customFields?: Record<string, any>;
  };
  vehicle?: {
    id?: string;
    size?: string;
    year?: number | null;
    make?: string | null;
    model?: string | null;
    submodel?: string | null;
    engine?: string | null;
    transmission?: string | null;
    drivetrain?: string | null;
    vin?: string | null;
    color?: string | null;
    unit?: string | null;
    mileage?: number | null;
    mileageUnit?: string;
    licensePlate?: string | null;
    licensePlateState?: string | null;
    note?: string;
    customFields?: Record<string, any>;
  };
  workflowStatus?: {
    id: string;
    name: string;
    position: number;
  };
  appointments?: Array<{
    id: string;
    createdDate: string;
    name: string;
    startDate: string;
    endDate: string;
    note?: string;
    color: string;
    confirmed: boolean;
    allDay: boolean;
  }>;
  inspections?: Array<{
    id: string;
    createdDate: string;
    name: string;
    completed: boolean;
    completedDate?: string | null;
    ordinal: number;
  }>;
  authorizations?: Array<{
    id: string;
    createdDate: string;
    date: string;
    method: string;
    authorizedCostCents: number;
    note?: string;
  }>;
  services?: Array<{
    id: string;
    createdDate: string;
    name: string;
    note?: string;
    lumpSum: boolean;
    recommended: boolean;
    totalCents: number;
    authorizationStatus: string;
    ordinal: number;
    hidden: boolean;
    completed?: boolean;
    parts?: Array<{
      id: string;
      name: string;
      quantity: number;
      retailCostCents: number;
      partNumber?: string;
      note?: string;
    }>;
    labors?: Array<{
      id: string;
      name?: string;
      hours: number;
      rateCents: number;
      note?: string;
      completed: boolean;
    }>;
    subcontracts?: Array<{
      id: string;
      name: string;
      costCents: number;
      retailCostCents: number;
      note?: string | null;
    }>;
    tires?: Array<{
      id: string;
      name: string;
      quantity: number;
      retailCostCents: number;
      size?: string | null;
      partNumber?: string | null;
      model?: string | null;
    }>;
    fees?: Array<{
      id: string;
      name: string;
      feeType: string;
      percent?: number;
      amountCents: number;
    }>;
  }>;
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

interface CreateApiKeyData {
  name: string;
  audience: string;
  expirationInDays: number;
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

interface BulkUpdateData {
  orderIds: string[];
  workflowStatusId?: string;
  archived?: boolean;
}

interface CreateWorkflowStatusData {
  name: string;
  position: number;
  daysToArchive?: number;
  archiveWhenInactive?: boolean;
  archiveWhenPaid?: boolean;
  invoiceWorkflow?: boolean;
  repairOrderWorkflow?: boolean;
}

interface UpdateWorkflowStatusData {
  name?: string;
  position?: number;
  daysToArchive?: number;
  archiveWhenInactive?: boolean;
  archiveWhenPaid?: boolean;
  invoiceWorkflow?: boolean;
  repairOrderWorkflow?: boolean;
}

interface Label {
  id: string;
  name: string;
  color: 'aqua' | 'black' | 'blue' | 'brown' | 'gray' | 'green' | 'orange' | 'purple' | 'red' | 'yellow';
  entity: 'CannedService' | 'CannedServiceFee' | 'CannedServiceLabor' | 'CannedServicePart' | 'CannedServiceTire' | 'CannedServiceSubcontract' | 'Customer' | 'Fee' | 'Labor' | 'Order' | 'Part' | 'Service' | 'Subcontract' | 'Vehicle';
  companyId: string;
  locationId: string;
  createdDate: string;
  updatedDate: string;
  saved: boolean;
  labelTemplateId?: string;
  meta?: {
    userId?: string;
    sessionId?: string;
    version?: number;
  };
  metadata?: any;
}

interface CreateLabelData {
  name: string;
  color?: 'aqua' | 'black' | 'blue' | 'brown' | 'gray' | 'green' | 'orange' | 'purple' | 'red' | 'yellow';
  entity?: 'CannedService' | 'CannedServiceFee' | 'CannedServiceLabor' | 'CannedServicePart' | 'CannedServiceTire' | 'CannedServiceSubcontract' | 'Customer' | 'Fee' | 'Labor' | 'Order' | 'Part' | 'Service' | 'Subcontract' | 'Vehicle';
  saved?: boolean;
  entityId?: string;
  locationId?: string;
}

interface AssignLabelData {
  entity: 'Order' | 'Customer' | 'Vehicle' | 'Part' | 'Service' | 'Labor' | 'Fee' | 'Subcontract';
  entityId: string;
}

interface CannedService {
  id: string;
  name: string;
  description?: string;
  retailCostCents?: number;
  wholesaleCostCents?: number;
  laborHours?: number;
  category?: string;
  taxable?: boolean;
  companyId: string;
  locationId: string;
  createdDate: string;
  updatedDate: string;
}

interface ServiceData {
  name: string;
  note?: string;
  lumpSum?: boolean;
  recommended?: boolean;
  totalCents: number;
  quantity?: number;
  orderId?: string;
}

interface AddServiceForm {
  selectedOrderId: string;
  selectedServiceId: string;
  quantity: number;
  priceOverride: number;
  notes: string;
}

interface OilStickerMapping {
  id: string;
  cannedServiceName: string;
  oilType: string;
}

interface OilStickerData {
  vin: string;
  mileage: number;
  oilType: string;
  customerName: string;
  vehicleInfo: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`shopmonkey-tabpanel-${index}`}
      aria-labelledby={`shopmonkey-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `shopmonkey-tab-${index}`,
    'aria-controls': `shopmonkey-tabpanel-${index}`,
  };
}

const ShopMonkey: React.FC = () => {
  const navigate = useNavigate();
  
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

  // Tab state
  const [activeTab, setActiveTab] = useState(0);

  // Debug toggle state
  const [debugOverlayVisible, setDebugOverlayVisible] = useState(false);

  // Workflow grouping toggle state
  const [groupByWorkflow, setGroupByWorkflow] = useState(false);

  // State for API Keys
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [keysError, setKeysError] = useState<string>('');

  // State for Workflow Orders
  const [workflowOrders, setWorkflowOrders] = useState<WorkflowOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState<string>('');
  const [orderLimit, setOrderLimit] = useState<number>(10);
  
  // State for Workflow Statuses
  const [workflowStatuses, setWorkflowStatuses] = useState<WorkflowStatus[]>([]);
  const [loadingStatuses, setLoadingStatuses] = useState(false);
  const [statusesError, setStatusesError] = useState<string>('');
  
  // State for Filtering
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('');
  const [viewMode, setViewMode] = useState<'all' | 'estimates' | 'invoices'>('estimates');
  const [archiveMode, setArchiveMode] = useState<'all' | 'active' | 'archived'>('active');
  
  // State for Bulk Operations
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [bulkStatusId, setBulkStatusId] = useState<string>('');
  const [bulkArchived, setBulkArchived] = useState<boolean>(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [bulkUpdateError, setBulkUpdateError] = useState<string>('');

  // State for Create API Key Dialog
  const [createKeyDialog, setCreateKeyDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyExpiration, setNewKeyExpiration] = useState<number>(30);
  const [creatingKey, setCreatingKey] = useState(false);

  // State for Delete API Key Dialog
  const [deleteKeyDialog, setDeleteKeyDialog] = useState<{
    open: boolean;
    keyId: string;
    keyName: string;
  }>({ open: false, keyId: '', keyName: '' });
  const [deleteReason, setDeleteReason] = useState('');
  const [deletingKey, setDeletingKey] = useState(false);

  // Success messages
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Debug state
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [showDebugDialog, setShowDebugDialog] = useState<boolean>(false);

  // State for Create Workflow Status Dialog
  const [createStatusDialog, setCreateStatusDialog] = useState(false);
  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusPosition, setNewStatusPosition] = useState<number>(0);
  const [creatingStatus, setCreatingStatus] = useState(false);

  // State for Edit Workflow Status
  const [editingStatusId, setEditingStatusId] = useState<string>('');

  // State for Order Details Dialog
  const [orderDetailsDialog, setOrderDetailsDialog] = useState<{
    open: boolean;
    orderId: string;
    orderNumber: string;
  }>({ open: false, orderId: '', orderNumber: '' });
  const [orderDetails, setOrderDetails] = useState<DetailedOrder | null>(null);
  const [loadingOrderDetails, setLoadingOrderDetails] = useState(false);
  const [orderDetailsError, setOrderDetailsError] = useState<string>('');
  const [editingStatusName, setEditingStatusName] = useState<string>('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // State for Delete Workflow Status Dialog
  const [deleteStatusDialog, setDeleteStatusDialog] = useState<{
    open: boolean;
    statusId: string;
    statusName: string;
  }>({ open: false, statusId: '', statusName: '' });
  const [moveToStatusId, setMoveToStatusId] = useState('');
  const [deletingStatus, setDeletingStatus] = useState(false);

  // State for Labels
  const [labels, setLabels] = useState<Label[]>([]);
  const [loadingLabels, setLoadingLabels] = useState(false);
  const [labelsError, setLabelsError] = useState<string>('');

  // State for Create Label Dialog
  const [createLabelDialog, setCreateLabelDialog] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState<'aqua' | 'black' | 'blue' | 'brown' | 'gray' | 'green' | 'orange' | 'purple' | 'red' | 'yellow'>('blue');
  const [newLabelEntity, setNewLabelEntity] = useState<'Order' | 'Customer' | 'Vehicle' | 'Part' | 'Service' | 'Labor' | 'Fee' | 'Subcontract'>('Order');
  const [creatingLabel, setCreatingLabel] = useState(false);

  // State for Assign Label Dialog
  const [assignLabelDialog, setAssignLabelDialog] = useState<{
    open: boolean;
    orderId: string;
    orderNumber: string;
  }>({ open: false, orderId: '', orderNumber: '' });
  const [selectedLabelToAssign, setSelectedLabelToAssign] = useState('');
  const [assigningLabel, setAssigningLabel] = useState(false);

  // State for Delete Label Dialog
  const [deleteLabelDialog, setDeleteLabelDialog] = useState<{
    open: boolean;
    labelId: string;
    labelName: string;
  }>({ open: false, labelId: '', labelName: '' });
  const [deletingLabel, setDeletingLabel] = useState(false);

  // State for Add Services
  const [cannedServices, setCannedServices] = useState<CannedService[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [servicesError, setServicesError] = useState<string>('');
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');
  const [addServiceForm, setAddServiceForm] = useState<AddServiceForm>({
    selectedOrderId: '',
    selectedServiceId: '',
    quantity: 1,
    priceOverride: 0,
    notes: ''
  });
  const [addingService, setAddingService] = useState(false);
  const [addServiceError, setAddServiceError] = useState<string>('');
  const [addServiceSuccess, setAddServiceSuccess] = useState<string>('');
  const [serviceLimit, setServiceLimit] = useState<number>(50);
  const [updatingServiceCompletion, setUpdatingServiceCompletion] = useState<string>(''); // Store service ID being updated

  // State for Oil Sticker Settings
  const [oilStickerMappings, setOilStickerMappings] = useState<OilStickerMapping[]>([]);
  const [oilStickerSettingsDialog, setOilStickerSettingsDialog] = useState(false);
  const [newOilMapping, setNewOilMapping] = useState<{ cannedServiceName: string; oilType: string }>({
    cannedServiceName: '',
    oilType: ''
  });
  const [printingSticker, setPrintingSticker] = useState<string>(''); // Store order ID being processed for printing

  // State for Order Info Dialog
  const [orderInfoDialog, setOrderInfoDialog] = useState<{
    open: boolean;
    orderId: string;
    orderNumber: string;
  }>({ open: false, orderId: '', orderNumber: '' });
  const [orderInfoData, setOrderInfoData] = useState<string>('');

  // Cache for detailed services to improve oil type detection
  const [detailedServicesCache, setDetailedServicesCache] = useState<Record<string, any[]>>({});
  const [fetchingServices, setFetchingServices] = useState<Set<string>>(new Set());
  
  // Track coalescedName to detect when services change
  const [orderCoalescedNames, setOrderCoalescedNames] = useState<Record<string, string>>({});
  
  // VIN decoding cache for pre-decoded VINs
  const [preDecodedVins, setPreDecodedVins] = useState<Record<string, any>>({});
  const [decodingVins, setDecodingVins] = useState<Set<string>>(new Set());

  // Token status tracking
  const [tokenStatus, setTokenStatus] = useState<'valid' | 'invalid' | 'checking'>('checking');
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [lastTokenCheck, setLastTokenCheck] = useState<Date | null>(null);
  const [tokenCheckInterval, setTokenCheckInterval] = useState<NodeJS.Timeout | null>(null);

  // Printer settings for oil stickers (using same settings as static stickers)
  const [stickerPrintMethod, setStickerPrintMethod] = useState<'pdf' | 'queue' | 'queue-fallback'>('pdf');
  const [stickerPrinterId, setStickerPrinterId] = useState<string>('');
  const [stickerPrintOrientation, setStickerPrintOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [stickerPrintAutoPrint, setStickerPrintAutoPrint] = useState(false);

  // WebSocket and real-time update state
  const { connectionStatus } = useWebSocket();
  const [realTimeUpdatesEnabled, setRealTimeUpdatesEnabled] = useState(true);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5 seconds
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [refreshTimer, setRefreshTimer] = useState<NodeJS.Timeout | null>(null);
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

  // Axios instance with authentication for our local API
  const shopmonkeyApi = useMemo(() => {
    const instance = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Set token if available
    if (authToken) {
      instance.defaults.headers['x-shopmonkey-token'] = authToken;
      console.log('🔑 ShopMonkey token set in axios instance:', authToken.substring(0, 8) + '...');
    } else {
      console.log('⚠️ No ShopMonkey token available for axios instance');
    }

    return instance;
  }, [authToken]); // Recreate when authToken changes

  // Token persistence functions
  const saveTokenToStorage = (token: string) => {
    try {
      localStorage.setItem('shopmonkey_token', token);
      localStorage.setItem('shopmonkey_token_timestamp', new Date().toISOString());
      console.log('🔐 Token saved to localStorage');
    } catch (error) {
      console.warn('Failed to save token to localStorage:', error);
    }
  };

  const loadTokenFromStorage = (): string | null => {
    try {
      const token = localStorage.getItem('shopmonkey_token');
      const timestamp = localStorage.getItem('shopmonkey_token_timestamp');
      if (token && timestamp) {
        console.log('🔑 Token loaded from localStorage, saved at:', timestamp);
        return token;
      }
    } catch (error) {
      console.warn('Failed to load token from localStorage:', error);
    }
    return null;
  };

  const removeTokenFromStorage = () => {
    try {
      localStorage.removeItem('shopmonkey_token');
      localStorage.removeItem('shopmonkey_token_timestamp');
      console.log('🗑️ Token removed from localStorage');
    } catch (error) {
      console.warn('Failed to remove token from localStorage:', error);
    }
  };

  // Token validation function
  const checkTokenValidity = async (): Promise<boolean> => {
    if (!authToken) {
      console.log('🔍 No token to check');
      setTokenStatus('invalid');
      return false;
    }

    try {
      setTokenStatus('checking');
      console.log('🔍 Checking token validity...');
      
      // Test the token by making a simple API call
      const response = await shopmonkeyApi.get('/shopmonkey/workflow/orders', { 
        params: { limit: 1 },
        timeout: 10000 // 10 second timeout
      });
      
      const isValid = response.status === 200;
      console.log(isValid ? '✅ Token is valid' : '❌ Token is invalid');
      
      setTokenStatus(isValid ? 'valid' : 'invalid');
      setLastTokenCheck(new Date());
      
      // Show login prompt if token is invalid
      if (!isValid && !showLoginPrompt) {
        setShowLoginPrompt(true);
      }
      
      return isValid;
    } catch (error: any) {
      console.log('❌ Token validation failed:', error.response?.status || error.message);
      setTokenStatus('invalid');
      setLastTokenCheck(new Date());
      
      // Show login prompt if token is invalid
      if (!showLoginPrompt) {
        setShowLoginPrompt(true);
      }
      
      return false;
    }
  };

  // Initialize token from storage on component mount
  useEffect(() => {
    const storedToken = loadTokenFromStorage();
    if (storedToken && !authToken) {
      console.log('🔄 Restoring token from localStorage');
      setAuthToken(storedToken);
      setIsAuthenticated(true);
    }
  }, []);

  // Check token validity when token changes
  useEffect(() => {
    if (authToken) {
      checkTokenValidity();
    } else {
      setTokenStatus('invalid');
    }
  }, [authToken]);

  // Set up periodic token validation
  useEffect(() => {
    // Clear existing interval
    if (tokenCheckInterval) {
      clearInterval(tokenCheckInterval);
    }

    // Only set up interval if we have a token
    if (authToken) {
      console.log('⏰ Setting up token validation interval (every 5 minutes)');
      const interval = setInterval(() => {
        checkTokenValidity();
      }, 5 * 60 * 1000); // Check every 5 minutes

      setTokenCheckInterval(interval);

      return () => {
        clearInterval(interval);
      };
    } else {
      setTokenCheckInterval(null);
    }
  }, [authToken]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (tokenCheckInterval) {
        clearInterval(tokenCheckInterval);
      }
    };
  }, []);

  // Login to ShopMonkey via our proxy
  const handleLogin = async () => {
    if (!loginCredentials.email || !loginCredentials.password) {
      setLoginError('Email and password are required');
      return;
    }

    setLoggingIn(true);
    setLoginError('');

    // Capture debug information for login
    const loginDebugData: any = {
      timestamp: new Date().toISOString(),
      action: 'ShopMonkey Login',
      request: {
        method: 'POST',
        url: '/shopmonkey/login',
        baseURL: API_BASE_URL,
        headers: {
          'Content-Type': 'application/json'
        },
        data: {
          email: loginCredentials.email,
          password: '[REDACTED]', // Don't log password
          audience: loginCredentials.audience
        }
      },
      response: null,
      error: null,
      authState: {
        wasAuthenticated: isAuthenticated,
        hadToken: !!authToken,
        tokenLength: authToken ? authToken.length : 0
      }
    };

    try {
      console.log('🚀 Attempting ShopMonkey login for:', loginCredentials.email);
      console.log('📋 Login request data:', { ...loginCredentials, password: '[REDACTED]' });
      
      const response = await axios.post(`${API_BASE_URL}/shopmonkey/login`, loginCredentials);
      
      // Extract token from ShopMonkey response structure: response.data.data.token
      const actualToken = response.data.data?.token;
      
      // Capture successful response
      loginDebugData.response = {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: {
          ...response.data,
          token: actualToken ? actualToken.substring(0, 8) + '...' : 'NO TOKEN'
        }
      };
      
      console.log('✅ Login successful, token received:', actualToken?.substring(0, 8) + '...');
      console.log('📝 Setting auth state...');
      
      if (actualToken) {
        setAuthToken(actualToken);
        setIsAuthenticated(true);
        saveTokenToStorage(actualToken); // Save token to localStorage
        setShowLoginPrompt(false); // Close login prompt if open
        setSuccessMessage('Successfully logged in to ShopMonkey');
        
        // Update debug data with final state
        loginDebugData.authState.newAuthenticated = true;
        loginDebugData.authState.newToken = actualToken.substring(0, 8) + '...';
        loginDebugData.authState.newTokenLength = actualToken.length;
      } else {
        console.error('❌ No token found in response');
        setLoginError('No authentication token received from ShopMonkey');
        
        // Update debug data with error state
        loginDebugData.authState.newAuthenticated = false;
        loginDebugData.authState.newToken = 'NO TOKEN';
        loginDebugData.authState.newTokenLength = 0;
      }
      
      // Clear password for security
      setLoginCredentials(prev => ({ ...prev, password: '' }));
      
      // Show login debug info only if debug mode is on
      setDebugInfo(JSON.stringify(loginDebugData, null, 2));
      if (debugOverlayVisible) {
        setShowDebugDialog(true);
      }
      
    } catch (error: any) {
      console.error('❌ ShopMonkey login error:', error);
      console.error('📄 Login error response:', error.response?.data);
      
      // Capture error response
      loginDebugData.error = {
        message: error.message,
        code: error.code,
        response: error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          headers: error.response.headers,
          data: error.response.data
        } : null,
        config: error.config ? {
          method: error.config.method,
          url: error.config.url,
          baseURL: error.config.baseURL,
          headers: error.config.headers,
          data: error.config.data ? { ...error.config.data, password: '[REDACTED]' } : null
        } : null
      };
      
      setLoginError(error.response?.data?.error || 'Login failed');
      
      // Show login error debug info only if debug mode is on
      setDebugInfo(JSON.stringify(loginDebugData, null, 2));
      if (debugOverlayVisible) {
        setShowDebugDialog(true);
      }
      
    } finally {
      setLoggingIn(false);
    }
  };

  // Logout
  const handleLogout = () => {
    setAuthToken('');
    setIsAuthenticated(false);
    removeTokenFromStorage(); // Remove token from localStorage
    setTokenStatus('invalid'); // Update token status
    setShowLoginPrompt(false); // Close any open login prompt
    setApiKeys([]);
    setWorkflowOrders([]);
    setLoginCredentials({ email: '', password: '', audience: 'api' });
    setSuccessMessage('Logged out successfully');
  };

  // Quick test login with hardcoded token
  const handleTestLogin = () => {
    // Capture debug information for test login
    const testLoginDebugData: any = {
      timestamp: new Date().toISOString(),
      action: 'Use Test Token',
      authState: {
        wasAuthenticated: isAuthenticated,
        hadToken: !!authToken,
        oldTokenLength: authToken ? authToken.length : 0
      },
      testToken: {
        provided: SHOPMONKEY_TEST_TOKEN.substring(0, 8) + '...',
        fullLength: SHOPMONKEY_TEST_TOKEN.length,
        value: SHOPMONKEY_TEST_TOKEN
      }
    };

    console.log('🧪 Using test token:', SHOPMONKEY_TEST_TOKEN.substring(0, 8) + '...');
    console.log('📝 Setting test auth state...');
    
    setAuthToken(SHOPMONKEY_TEST_TOKEN);
    setIsAuthenticated(true);
    saveTokenToStorage(SHOPMONKEY_TEST_TOKEN); // Save token to localStorage
    setShowLoginPrompt(false); // Close login prompt if open
    setSuccessMessage('Using test token for ShopMonkey access');
    
    // Update debug data with final state
    testLoginDebugData.authState.newAuthenticated = true;
    testLoginDebugData.authState.newToken = SHOPMONKEY_TEST_TOKEN.substring(0, 8) + '...';
    testLoginDebugData.authState.newTokenLength = SHOPMONKEY_TEST_TOKEN.length;
    
    console.log('✅ Test token set, authenticated:', true);
    
    // Show test login debug info only if debug mode is on
    setDebugInfo(JSON.stringify(testLoginDebugData, null, 2));
    if (debugOverlayVisible) {
      setShowDebugDialog(true);
    }
  };

  // Test ShopMonkey API Health
  const testShopMonkeyApiHealth = async () => {
    try {
      console.log('🏥 Testing ShopMonkey API health...');
      
      // Test multiple endpoints to see which ones work
      const testResults = {
        workflow_orders: false,
        workflow_status: false,
        labels: false,
        api_key: false
      };

      // Test workflow orders (this seems to work)
      try {
        await shopmonkeyApi.get('/shopmonkey/workflow/orders', { 
          params: { limit: 1 } 
        });
        testResults.workflow_orders = true;
        console.log('✅ Workflow orders endpoint: Working');
      } catch (e) {
        console.log('❌ Workflow orders endpoint: Failed');
      }

      // Test workflow status
      try {
        await shopmonkeyApi.get('/shopmonkey/workflow_status');
        testResults.workflow_status = true;
        console.log('✅ Workflow status endpoint: Working');
      } catch (e) {
        console.log('❌ Workflow status endpoint: Failed');
      }

      // Test labels
      try {
        await shopmonkeyApi.get('/shopmonkey/label');
        testResults.labels = true;
        console.log('✅ Labels endpoint: Working');
      } catch (e) {
        console.log('❌ Labels endpoint: Failed');
      }

      // Test API keys
      try {
        await shopmonkeyApi.get('/shopmonkey/api_key');
        testResults.api_key = true;
        console.log('✅ API keys endpoint: Working');
      } catch (e) {
        console.log('❌ API keys endpoint: Failed');
      }

      return testResults;
    } catch (error) {
      console.error('Error testing ShopMonkey API health:', error);
      return null;
    }
  };

  // Load API Keys with rate limiting protection
  const loadApiKeys = async () => {
    // Prevent multiple simultaneous calls
    if (loadingKeys) {
      console.log('🔑 API keys already loading, skipping duplicate request');
      return;
    }
    
    setLoadingKeys(true);
    setKeysError('');
    
    // Always include the manual API key
    const manualKey: ApiKey = {
      id: MANUAL_API_KEY.id,
      name: MANUAL_API_KEY.name,
      audience: MANUAL_API_KEY.audience,
      expiresAt: MANUAL_API_KEY.expiresAt,
      createdAt: MANUAL_API_KEY.createdAt
    };
    
    try {
      console.log('🔑 Loading API keys from ShopMonkey...');
      const response = await shopmonkeyApi.get('/shopmonkey/api_key');
      const apiKeysFromShopMonkey = response.data.data || response.data || [];
      
      console.log(`✅ Successfully loaded ${apiKeysFromShopMonkey.length} API keys from ShopMonkey`);
      
      // Combine manual key with keys from ShopMonkey API
      setApiKeys([manualKey, ...apiKeysFromShopMonkey]);
    } catch (error: any) {
      console.warn('⚠️ ShopMonkey API keys endpoint is currently unavailable:', error.response?.status, error.response?.statusText);
      
      // Provide more detailed error message based on the response
      let errorMessage = 'ShopMonkey API keys endpoint is currently unavailable. ';
      
      if (error.response?.status === 429) {
        errorMessage += 'Rate limited - please wait before making another request. This prevents API overload.';
      } else if (error.response?.status === 500) {
        errorMessage += 'This appears to be an issue with ShopMonkey\'s servers. The application will continue to work with the manual API key.';
      } else if (error.response?.status === 401) {
        errorMessage += 'Authentication issue with ShopMonkey API. Please check your token.';
      } else if (error.response?.status === 403) {
        errorMessage += 'Your token may not have permission to access API keys.';
      } else {
        errorMessage += `Error: ${error.response?.data?.error || error.message}`;
      }
      
      setKeysError(errorMessage);
      
      // Even if API fails, show the manual key so functionality continues
      setApiKeys([manualKey]);
      console.log('🔧 Fallback: Using manual API key to maintain functionality');
    } finally {
      setLoadingKeys(false);
    }
  };

  // Load Workflow Orders
  const loadWorkflowOrders = async () => {
    // Check if user is authenticated first
    if (!isAuthenticated || !authToken) {
      setOrdersError('⚠️ You must login or use the test token first before loading workflow orders!');
      setSuccessMessage('');
      return;
    }

    // Prevent multiple simultaneous calls
    if (loadingOrders) {
      console.log('📋 Workflow orders already loading, skipping duplicate request');
      return;
    }

    setLoadingOrders(true);
    setOrdersError('');
    
    // Capture debug information
    const debugData: any = {
      timestamp: new Date().toISOString(),
      action: 'Load Workflow Orders',
      request: {
        method: 'GET',
        url: '/shopmonkey/workflow/orders',
        baseURL: API_BASE_URL,
        headers: { ...shopmonkeyApi.defaults.headers },
        params: {},
        authToken: authToken ? authToken.substring(0, 8) + '...' : 'NOT SET',
        authTokenLength: authToken ? authToken.length : 0,
        isAuthenticated: isAuthenticated,
        tokenInHeaders: shopmonkeyApi.defaults.headers['x-shopmonkey-token'] ? 'PRESENT' : 'MISSING'
      },
      response: null,
      error: null
    };

    try {
      const params: any = { 
        limit: orderLimit,
        include: {
          customer: true,
          vehicle: true,
          workflowStatus: true,
          labelConnections: true
        }
      };
      
      // Add status filtering if selected
      let whereClause: any = {};
      
      if (selectedStatusFilter) {
        // If it's a status ID, filter by workflowStatusId
        if (workflowStatuses.some(status => status.id === selectedStatusFilter)) {
          whereClause.workflowStatusId = selectedStatusFilter;
        } else {
          // Legacy: filter by status name (for backward compatibility)
          whereClause['workflowStatus.name'] = selectedStatusFilter;
        }
      }
      
      // Add invoice/estimate filtering based on view mode
      if (viewMode === 'estimates') {
        whereClause.invoiced = false;
      } else if (viewMode === 'invoices') {
        whereClause.invoiced = true;
      }
      
      // Add archive filtering based on archive mode
      if (archiveMode === 'active') {
        whereClause.archived = false;
      } else if (archiveMode === 'archived') {
        whereClause.archived = true;
      }
      
      // Apply where clause if any filters are set
      if (Object.keys(whereClause).length > 0) {
        params.where = JSON.stringify(whereClause);
      }
      
      debugData.request.params = params;
      
      console.log('🚀 Loading workflow orders with token:', authToken?.substring(0, 8) + '...');
      console.log('📋 Request params:', params);
      console.log('🔧 Axios instance headers:', shopmonkeyApi.defaults.headers);
      
      const response = await shopmonkeyApi.get('/shopmonkey/workflow/orders', { params });
      
      // Capture successful response
      debugData.response = {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data
      };
      
      // Transform the data to include legacy fields while preserving all order information
      const transformedOrders = (response.data.data || response.data).map((order: any) => ({
        ...order, // Include all original data
        // Legacy compatibility fields
        customerName: order.generatedCustomerName || order.customer?.companyName || 
                     (order.customer ? `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim() : '') || 
                     'N/A',
        vehicleInfo: order.generatedVehicleName || 
                    (order.vehicle ? `${order.vehicle.year || ''} ${order.vehicle.make || ''} ${order.vehicle.model || ''}`.trim() : '') || 
                    'N/A',
        createdAt: order.createdDate || order.orderCreatedDate || '',
        updatedAt: order.updatedDate || '',
        status: order.workflowStatus?.name || 'Unknown'
      }));

      setWorkflowOrders(transformedOrders);
      setSelectedOrders([]); // Clear selections when reloading
      
      // Show success debug info only if debug mode is on
      setDebugInfo(JSON.stringify(debugData, null, 2));
      if (debugOverlayVisible) {
        setShowDebugDialog(true);
      }
      
      // Pre-decode VINs for faster sticker creation (don't wait for this)
      if (transformedOrders.length > 0) {
        setTimeout(() => {
          preDecodeVinsForOrders(transformedOrders);
        }, 500); // Small delay to let the UI update first
      }
      
    } catch (error: any) {
      console.error('❌ Error loading workflow orders:', error);
      console.error('📄 Error response:', error.response?.data);
      
      // Capture error response
      debugData.error = {
        message: error.message,
        code: error.code,
        response: error.response ? {
          status: error.response.status,
          statusText: error.response.statusText,
          headers: error.response.headers,
          data: error.response.data
        } : null,
        config: error.config ? {
          method: error.config.method,
          url: error.config.url,
          baseURL: error.config.baseURL,
          headers: error.config.headers,
          params: error.config.params
        } : null
      };
      
      let errorMessage = 'Failed to load workflow orders. Please check your ShopMonkey token.';
      
      if (error.response?.status === 429) {
        errorMessage = 'Rate limited - please wait before making another request. This prevents API overload.';
      } else if (error.response?.data?.error || error.response?.data?.message) {
        errorMessage = error.response.data.error || error.response.data.message;
      }
      
      setOrdersError(errorMessage);
      
      // Show error debug info only if debug mode is on
      setDebugInfo(JSON.stringify(debugData, null, 2));
      if (debugOverlayVisible) {
        setShowDebugDialog(true);
      }
      
    } finally {
      setLoadingOrders(false);
    }
  };

  // Load Workflow Statuses
  const loadWorkflowStatuses = async () => {
    setLoadingStatuses(true);
    setStatusesError('');
    try {
      const response = await shopmonkeyApi.get('/shopmonkey/workflow_status');
      const statusData = response.data.data || response.data;
      // Ensure we always set an array and sort by position
      const statuses = Array.isArray(statusData) ? statusData : [];
      statuses.sort((a, b) => (a.position || 0) - (b.position || 0));
      setWorkflowStatuses(statuses);
    } catch (error: any) {
      console.error('Error loading workflow statuses:', error);
      setStatusesError(error.response?.data?.error || 'Failed to load workflow statuses');
      // Ensure workflowStatuses remains an array even on error
      setWorkflowStatuses([]);
    } finally {
      setLoadingStatuses(false);
    }
  };

  // Create new Workflow Status
  const createWorkflowStatus = async () => {
    if (!newStatusName.trim()) {
      setStatusesError('Workflow status name is required');
      return;
    }

    setCreatingStatus(true);
    setStatusesError('');
    try {
      const createData: CreateWorkflowStatusData = {
        name: newStatusName.trim(),
        position: newStatusPosition,
        invoiceWorkflow: true,
        repairOrderWorkflow: true,
        archiveWhenInactive: false,
        archiveWhenPaid: false,
        daysToArchive: 30
      };

      await shopmonkeyApi.post('/shopmonkey/workflow_status', createData);
      setSuccessMessage('Workflow status created successfully');
      setCreateStatusDialog(false);
      setNewStatusName('');
      setNewStatusPosition(0);
      await loadWorkflowStatuses();
    } catch (error: any) {
      console.error('Error creating workflow status:', error);
      setStatusesError(error.response?.data?.error || 'Failed to create workflow status');
    } finally {
      setCreatingStatus(false);
    }
  };

  // Update Workflow Status Name
  const updateWorkflowStatusName = async (statusId: string, newName: string) => {
    if (!newName.trim()) {
      setStatusesError('Workflow status name cannot be empty');
      return;
    }

    setUpdatingStatus(true);
    setStatusesError('');
    try {
      const updateData: UpdateWorkflowStatusData = {
        name: newName.trim()
      };

      await shopmonkeyApi.put(`/shopmonkey/workflow_status/${statusId}`, updateData);
      setSuccessMessage('Workflow status updated successfully');
      setEditingStatusId('');
      setEditingStatusName('');
      await loadWorkflowStatuses();
    } catch (error: any) {
      console.error('Error updating workflow status:', error);
      setStatusesError(error.response?.data?.error || 'Failed to update workflow status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Delete Workflow Status
  const deleteWorkflowStatus = async () => {
    setDeletingStatus(true);
    setStatusesError('');
    try {
      const params = moveToStatusId ? { move_to: moveToStatusId } : {};
      
      await shopmonkeyApi.delete(`/shopmonkey/workflow_status/${deleteStatusDialog.statusId}`, { 
        params 
      });
      setSuccessMessage('Workflow status deleted successfully');
      setDeleteStatusDialog({ open: false, statusId: '', statusName: '' });
      setMoveToStatusId('');
      await loadWorkflowStatuses();
    } catch (error: any) {
      console.error('Error deleting workflow status:', error);
      setStatusesError(error.response?.data?.error || 'Failed to delete workflow status');
    } finally {
      setDeletingStatus(false);
    }
  };

  // Handle edit workflow status
  const handleEditStatus = (status: WorkflowStatus) => {
    setEditingStatusId(status.id);
    setEditingStatusName(status.name || '');
  };

  // Cancel edit workflow status
  const cancelEditStatus = () => {
    setEditingStatusId('');
    setEditingStatusName('');
  };

  // Load Labels
  const loadLabels = async () => {
    setLoadingLabels(true);
    setLabelsError('');
    try {
      const response = await shopmonkeyApi.get('/shopmonkey/label');
      const labelData = response.data.data || response.data;
      const labelArray = Array.isArray(labelData) ? labelData : [];
      setLabels(labelArray);
    } catch (error: any) {
      console.error('Error loading labels:', error);
      setLabelsError(error.response?.data?.error || 'Failed to load labels');
      setLabels([]);
    } finally {
      setLoadingLabels(false);
    }
  };

  // Create new Label
  const createLabel = async () => {
    if (!newLabelName.trim()) {
      setLabelsError('Label name is required');
      return;
    }

    setCreatingLabel(true);
    setLabelsError('');
    try {
      const createData: CreateLabelData = {
        name: newLabelName.trim(),
        color: newLabelColor,
        entity: newLabelEntity,
        saved: true
      };

      await shopmonkeyApi.post('/shopmonkey/label', createData);
      setSuccessMessage('Label created successfully');
      setCreateLabelDialog(false);
      setNewLabelName('');
      setNewLabelColor('blue');
      setNewLabelEntity('Order');
      await loadLabels();
    } catch (error: any) {
      console.error('Error creating label:', error);
      setLabelsError(error.response?.data?.error || 'Failed to create label');
    } finally {
      setCreatingLabel(false);
    }
  };

  // Delete Label
  const deleteLabel = async () => {
    setDeletingLabel(true);
    setLabelsError('');
    try {
      await shopmonkeyApi.delete(`/shopmonkey/label/${deleteLabelDialog.labelId}`);
      setSuccessMessage('Label deleted successfully');
      setDeleteLabelDialog({ open: false, labelId: '', labelName: '' });
      await loadLabels();
    } catch (error: any) {
      console.error('Error deleting label:', error);
      setLabelsError(error.response?.data?.error || 'Failed to delete label');
    } finally {
      setDeletingLabel(false);
    }
  };

  // Assign Label to Order
  const assignLabelToOrder = async () => {
    if (!selectedLabelToAssign) {
      setLabelsError('Please select a label to assign');
      return;
    }

    setAssigningLabel(true);
    setLabelsError('');
    try {
      const assignData: AssignLabelData = {
        entity: 'Order',
        entityId: assignLabelDialog.orderId
      };

      await shopmonkeyApi.put(`/shopmonkey/label/${selectedLabelToAssign}/assign`, assignData);
      setSuccessMessage('Label assigned successfully');
      setAssignLabelDialog({ open: false, orderId: '', orderNumber: '' });
      setSelectedLabelToAssign('');
      await loadWorkflowOrders(); // Refresh orders to show new labels
    } catch (error: any) {
      console.error('Error assigning label:', error);
      setLabelsError(error.response?.data?.error || 'Failed to assign label');
    } finally {
      setAssigningLabel(false);
    }
  };

  // Remove Label from Order
  const removeLabelFromOrder = async (labelId: string, orderId: string) => {
    setLabelsError('');
    try {
      const removeData: AssignLabelData = {
        entity: 'Order',
        entityId: orderId
      };

      await shopmonkeyApi.delete(`/shopmonkey/label/${labelId}/assign`, { data: removeData });
      setSuccessMessage('Label removed successfully');
      await loadWorkflowOrders(); // Refresh orders to show updated labels
    } catch (error: any) {
      console.error('Error removing label:', error);
      setLabelsError(error.response?.data?.error || 'Failed to remove label');
    }
  };

  // Get color mapping for Material-UI colors
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

  // Helper function to get labels from either format
  const getOrderLabels = (order: WorkflowOrder | DetailedOrder) => {
    // Check for direct labels array first
    if (order.labels && order.labels.length > 0) {
      return order.labels;
    }
    // Fall back to labelConnections format
    if (order.labelConnections && order.labelConnections.length > 0) {
      return order.labelConnections.map(connection => connection.label);
    }
    return [];
  };

  // DISABLED: Quick check navigation should be handled by ShopMonkeyOrdersSection to prevent duplicates
  // const handleQuickCheckLabelClick = (order: WorkflowOrder | DetailedOrder) => {
  //   const vin = order.vehicle?.vin;
  //   const mileage = order.vehicle?.mileage;
  //   
  //   if (vin) {
  //     // Build URL parameters
  //     const params = new URLSearchParams();
  //     params.set('vin', vin);
  //     if (mileage) {
  //       params.set('mileage', mileage.toString());
  //     }
  //     
  //     // Navigate to QuickCheck page with VIN and mileage parameters
  //     navigate(`/quick-check?${params.toString()}`);
  //   } else {
  //     // Show notification if no VIN available
  //     setSuccessMessage('No VIN available for this order');
  //   }
  // };

  // Create new API Key
  const createApiKey = async () => {
    if (!newKeyName.trim()) {
      setKeysError('API key name is required');
      return;
    }

    setCreatingKey(true);
    setKeysError('');
    try {
      const createData: CreateApiKeyData = {
        name: newKeyName.trim(),
        audience: 'api',
        expirationInDays: newKeyExpiration,
      };

      await shopmonkeyApi.post('/shopmonkey/api_key', createData);
      setSuccessMessage('API key created successfully');
      setCreateKeyDialog(false);
      setNewKeyName('');
      setNewKeyExpiration(30);
      await loadApiKeys();
    } catch (error: any) {
      console.error('Error creating API key:', error);
      setKeysError(error.response?.data?.error || 'Failed to create API key');
    } finally {
      setCreatingKey(false);
    }
  };

  // Delete API Key
  const deleteApiKey = async () => {
    if (!deleteReason.trim()) {
      setKeysError('Delete reason is required');
      return;
    }

    setDeletingKey(true);
    setKeysError('');
    try {
      await shopmonkeyApi.delete(`/shopmonkey/api_key/${deleteKeyDialog.keyId}`, {
        data: { reason: deleteReason.trim() }
      });
      setSuccessMessage('API key deleted successfully');
      setDeleteKeyDialog({ open: false, keyId: '', keyName: '' });
      setDeleteReason('');
      await loadApiKeys();
    } catch (error: any) {
      console.error('Error deleting API key:', error);
      setKeysError(error.response?.data?.error || 'Failed to delete API key');
    } finally {
      setDeletingKey(false);
    }
  };

  // Handle order limit change
  const handleOrderLimitChange = (newLimit: number) => {
    if (newLimit > 0 && newLimit <= 1000) {
      setOrderLimit(newLimit);
    }
  };

  // Handle status filter change with auto-refresh
  const handleStatusFilterChange = async (statusId: string) => {
    setSelectedStatusFilter(statusId);
    setSelectedOrders([]); // Clear selections when changing filter
    
    // Auto-refresh orders when status filter changes
    if (isAuthenticated && authToken) {
      setLoadingOrders(true);
      await loadWorkflowOrders();
    }
  };

  // Handle view mode change with auto-refresh
  const handleViewModeChange = async (mode: 'all' | 'estimates' | 'invoices') => {
    setViewMode(mode);
    setSelectedOrders([]); // Clear selections when changing view mode
    
    // Auto-refresh orders when view mode changes
    if (isAuthenticated && authToken) {
      setLoadingOrders(true);
      await loadWorkflowOrders();
    }
  };

  // Handle archive mode change with auto-refresh
  const handleArchiveModeChange = async (mode: 'all' | 'active' | 'archived') => {
    setArchiveMode(mode);
    setSelectedOrders([]); // Clear selections when changing archive mode
    
    // Auto-refresh orders when archive mode changes
    if (isAuthenticated && authToken) {
      setLoadingOrders(true);
      await loadWorkflowOrders();
    }
  };

  // Handle order selection
  const handleOrderSelection = (orderId: string, checked: boolean) => {
    if (checked) {
      setSelectedOrders(prev => [...prev, orderId]);
    } else {
      setSelectedOrders(prev => prev.filter(id => id !== orderId));
    }
  };

  // Handle select all orders
  const handleSelectAllOrders = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(workflowOrders.map(order => order.id));
    } else {
      setSelectedOrders([]);
    }
  };

  // Bulk update workflow orders
  const handleBulkUpdate = async () => {
    if (selectedOrders.length === 0) {
      setBulkUpdateError('Please select at least one order');
      return;
    }

    if (!bulkStatusId && bulkArchived === undefined) {
      setBulkUpdateError('Please select a status or archive option');
      return;
    }

    setBulkUpdating(true);
    setBulkUpdateError('');
    try {
      const updateData: BulkUpdateData = {
        orderIds: selectedOrders,
      };

      if (bulkStatusId) {
        updateData.workflowStatusId = bulkStatusId;
      }

      if (bulkArchived !== undefined) {
        updateData.archived = bulkArchived;
      }

      await shopmonkeyApi.put('/shopmonkey/order/workflow_status/bulk', updateData);
      setSuccessMessage(`Successfully updated ${selectedOrders.length} orders`);
      setSelectedOrders([]);
      setBulkStatusId('');
      setBulkArchived(false);
      await loadWorkflowOrders();
    } catch (error: any) {
      console.error('Error bulk updating orders:', error);
      setBulkUpdateError(error.response?.data?.error || 'Failed to bulk update orders');
    } finally {
      setBulkUpdating(false);
    }
  };

  // Load canned services
  const loadCannedServices = async () => {
    setLoadingServices(true);
    setServicesError('');
    try {
      const response = await shopmonkeyApi.get(`/shopmonkey/canned_service?limit=${serviceLimit}`);
      
      if (debugOverlayVisible) {
        setDebugInfo(JSON.stringify({
          action: 'Load Canned Services',
          endpoint: '/shopmonkey/canned_service',
          params: { limit: serviceLimit },
          response: response.data
        }, null, 2));
        setShowDebugDialog(true);
      }
      
      setCannedServices(response.data || []);
    } catch (error: any) {
      console.error('Error loading canned services:', error);
      setServicesError(error.response?.data?.error || 'Failed to load canned services');
    } finally {
      setLoadingServices(false);
    }
  };

  // Add service to order
  const addServiceToOrder = async () => {
    if (!addServiceForm.selectedOrderId || !addServiceForm.selectedServiceId) {
      setAddServiceError('Please select both an order and a service');
      return;
    }

    if (addServiceForm.quantity < 1) {
      setAddServiceError('Quantity must be at least 1');
      return;
    }

    setAddingService(true);
    setAddServiceError('');
    setAddServiceSuccess('');

    try {
      const selectedService = Array.isArray(cannedServices) ? cannedServices.find(s => s.id === addServiceForm.selectedServiceId) : null;
      if (!selectedService) {
        setAddServiceError('Selected service not found');
        return;
      }

      // Calculate total price (use override if provided, otherwise use service price)
      const pricePerUnit = addServiceForm.priceOverride > 0 ? addServiceForm.priceOverride * 100 : (selectedService.retailCostCents || 0);
      const totalCents = pricePerUnit * addServiceForm.quantity;

      const serviceData: ServiceData = {
        name: selectedService.name,
        note: addServiceForm.notes.trim() || undefined,
        lumpSum: false,
        recommended: false,
        totalCents: totalCents,
        quantity: addServiceForm.quantity,
        orderId: addServiceForm.selectedOrderId
      };

      const response = await shopmonkeyApi.post(`/shopmonkey/order/${addServiceForm.selectedOrderId}/service`, serviceData);
      
      if (debugOverlayVisible) {
        setDebugInfo(JSON.stringify({
          action: 'Add Service to Order',
          endpoint: `/shopmonkey/order/${addServiceForm.selectedOrderId}/service`,
          requestData: serviceData,
          response: response.data
        }, null, 2));
        setShowDebugDialog(true);
      }

      setAddServiceSuccess(`Successfully added ${selectedService.name} to order`);
      
      // Reset form
      setAddServiceForm({
        selectedOrderId: '',
        selectedServiceId: '',
        quantity: 1,
        priceOverride: 0,
        notes: ''
      });

      // Refresh orders to show the updated service
      await loadWorkflowOrders();
      
    } catch (error: any) {
      console.error('Error adding service to order:', error);
      setAddServiceError(error.response?.data?.error || 'Failed to add service to order');
    } finally {
      setAddingService(false);
    }
  };

  // Check if a service is completed (all labor items completed)
  const isServiceCompleted = (service: any) => {
    // Check if service has explicit completed field
    if (service.completed !== undefined) {
      return service.completed;
    }
    
    // Fallback to labor-based completion check
    if (!service.labors || service.labors.length === 0) {
      return false; // Services without labor items should be explicitly marked complete
    }
    return service.labors.every((labor: any) => labor.completed);
  };

  // Toggle service completion status by updating service-level completion or labor items
  const toggleServiceCompletion = async (orderId: string, serviceId: string, currentStatus: boolean) => {
    setUpdatingServiceCompletion(serviceId);
    
    try {
      console.log(`🔧 Toggling service completion: Order ${orderId}, Service ${serviceId}, Currently ${currentStatus ? 'completed' : 'incomplete'}`);
      
      // Find the current service from the already-loaded order details
      const currentService = orderDetails?.services?.find(service => service.id === serviceId);
      
      if (!currentService) {
        throw new Error('Service not found in order details');
      }
      
      const newCompletionStatus = !currentStatus;
      const hasLaborItems = currentService.labors && currentService.labors.length > 0;
      
      console.log(`🔧 Service details:`, {
        serviceId,
        serviceName: currentService.name,
        hasLaborItems,
        laborCount: currentService.labors?.length || 0,
        currentServiceCompleted: currentService.completed,
        calculatedCompleted: currentStatus
      });
      
      let updateData: any = {};
      let response: any;
      
      if (hasLaborItems) {
        // Service has labor items - update service first, then labor items separately
        console.log(`🔧 Service has labor items - updating service and labor items separately`);
        console.log(`🔧 Current labor items:`, currentService.labors?.map(l => ({ id: l.id, name: l.name, completed: l.completed })));
        
        // Step 1: Update service completion
        updateData = {
          completed: newCompletionStatus,
          completedDate: newCompletionStatus ? new Date().toISOString() : null
        };
        
        console.log(`📤 Step 1: Sending service completion data to ShopMonkey:`, updateData);
        console.log(`🚀 Making API call to: /shopmonkey/order/${orderId}/service/${serviceId}`);
        console.log(`📦 Service payload:`, JSON.stringify(updateData, null, 2));
        
        let serviceResponse: any;
        try {
          console.log(`⏰ Starting service API call with 10 second timeout...`);
          serviceResponse = await Promise.race([
            shopmonkeyApi.put(`/shopmonkey/order/${orderId}/service/${serviceId}`, updateData),
            new Promise((_, reject) => setTimeout(() => reject(new Error('API call timeout after 10 seconds')), 10000))
          ]) as any;
          
          console.log(`✅ Service update completed - Status: ${serviceResponse.status}`);
          console.log(`🔧 Service response:`, serviceResponse.data);
        } catch (serviceError: any) {
          console.error(`❌ Service update failed:`, serviceError);
          
          if (serviceError.message === 'API call timeout after 10 seconds') {
            console.error(`⏰ API call timed out - this might indicate the endpoint doesn't exist or is very slow`);
          } else if (serviceError.response) {
            console.error(`❌ Service API Error - Status: ${serviceError.response.status}`);
            console.error(`❌ Service API Error - Data:`, serviceError.response.data);
          } else if (serviceError.request) {
            console.error(`❌ Network error - no response received:`, serviceError.request);
          } else {
            console.error(`❌ Unknown error:`, serviceError.message);
          }
          
          // Let's try just updating the labor items directly instead
          console.log(`🔄 Service update failed, trying labor-only approach...`);
          throw serviceError; // Re-throw to go to labor-only approach
        }
        
        // Step 2: Update each labor item individually
        console.log(`📤 Step 2: Updating labor items individually...`);
        
        // Check if labor endpoint is supported first
        const laborUpdatePromises = currentService.labors?.map(async (labor: any) => {
          const laborUpdateData = {
            completed: newCompletionStatus,
            completedDate: newCompletionStatus ? new Date().toISOString() : null
          };
          
          console.log(`🔧 Updating labor item ${labor.id} (${labor.name}):`, laborUpdateData);
          
          try {
            const laborResponse = await shopmonkeyApi.put(`/shopmonkey/labor/${labor.id}`, laborUpdateData);
            console.log(`✅ Labor item ${labor.id} updated - Status: ${laborResponse.status}`);
            return { success: true, laborId: labor.id, response: laborResponse.data };
          } catch (laborError: any) {
            console.error(`❌ Failed to update labor item ${labor.id}:`, laborError.response?.data || laborError.message);
            
            // Check if this is a 404 (endpoint not found)
            if (laborError.response?.status === 404) {
              console.log(`⚠️ Labor endpoint not supported - this is expected, service-level completion should be sufficient`);
              return { success: false, laborId: labor.id, error: 'Labor endpoint not supported', skipped: true };
            }
            
            return { success: false, laborId: labor.id, error: laborError.response?.data || laborError.message };
          }
        }) || [];
        
        const laborResults = await Promise.all(laborUpdatePromises);
        console.log(`🔧 Labor update results:`, laborResults);
        
        // Check if all failures were due to unsupported endpoint
        const unsupportedEndpointFailures = laborResults.filter(result => !result.success && result.skipped);
        const actualFailures = laborResults.filter(result => !result.success && !result.skipped);
        
        if (unsupportedEndpointFailures.length > 0 && actualFailures.length === 0) {
          console.log(`ℹ️ Labor item updates not supported by server - relying on service-level completion only`);
          console.log(`✅ Service completion successful - labor endpoint not needed`);
          // Don't treat this as an error - service completion worked
        } else if (actualFailures.length > 0) {
          console.warn(`⚠️ Some labor items failed to update:`, actualFailures);
          console.warn(`⚠️ Service completion may be incomplete due to labor item failures`);
          // Only throw error if there are actual failures (not just unsupported endpoints)
          const actualErrorMessages = actualFailures.map(f => f.error).join(', ');
          throw new Error(`Labor item update failures: ${actualErrorMessages}`);
        }
        
        const response = serviceResponse; // Use service response as main response
      } else {
        // Service has no labor items - update only service completion
        console.log(`🔧 Service has no labor items - updating only service completion`);
        
        updateData = {
          completed: newCompletionStatus,
          completedDate: newCompletionStatus ? new Date().toISOString() : null
        };
        
        console.log(`📤 Sending service completion data to ShopMonkey:`, updateData);
        console.log(`🚀 Making API call to: /shopmonkey/order/${orderId}/service/${serviceId}`);
        console.log(`📦 Service payload:`, JSON.stringify(updateData, null, 2));
        
        try {
          console.log(`⏰ Starting service API call with 10 second timeout...`);
          response = await Promise.race([
            shopmonkeyApi.put(`/shopmonkey/order/${orderId}/service/${serviceId}`, updateData),
            new Promise((_, reject) => setTimeout(() => reject(new Error('API call timeout after 10 seconds')), 10000))
          ]) as any;
          
          console.log(`✅ Service update completed - Status: ${response.status}`);
          console.log(`🔧 Service response:`, response.data);
        } catch (serviceError: any) {
          console.error(`❌ Service update failed:`, serviceError);
          
          if (serviceError.message === 'API call timeout after 10 seconds') {
            console.error(`⏰ API call timed out - this might indicate the endpoint doesn't exist or is very slow`);
          } else if (serviceError.response) {
            console.error(`❌ Service API Error - Status: ${serviceError.response.status}`);
            console.error(`❌ Service API Error - Data:`, serviceError.response.data);
          } else if (serviceError.request) {
            console.error(`❌ Network error - no response received:`, serviceError.request);
          } else {
            console.error(`❌ Unknown error:`, serviceError.message);
          }
          
          throw serviceError; // Re-throw to be caught by outer try-catch
        }
      }
      
      console.log(`✅ ShopMonkey API call completed`);
      console.log(`📊 Response status: ${response.status}`);
      console.log(`📊 Response headers:`, response.headers);
      console.log(`🔧 ShopMonkey update response:`, response.data);
      console.log(`🔧 Full response object:`, JSON.stringify(response.data, null, 2));
      
      // Check if ShopMonkey's response shows the updated service
      const responseService = response.data?.data?.order?.services?.find((s: any) => s.id === serviceId);
      if (responseService) {
        console.log(`📥 Updated service in ShopMonkey response:`, {
          serviceId: responseService.id,
          serviceName: responseService.name,
          completed: responseService.completed,
          completedDate: responseService.completedDate,
          laborItems: responseService.labors?.map((l: any) => ({ 
            id: l.id, 
            name: l.name, 
            completed: l.completed, 
            completedDate: l.completedDate 
          })) || []
        });
      } else {
        console.log(`⚠️ Updated service not found in ShopMonkey response`);
        console.log(`🔧 Response structure:`, Object.keys(response.data || {}));
        if (response.data?.data) {
          console.log(`🔧 Response data keys:`, Object.keys(response.data.data));
        }
      }
      
      if (debugOverlayVisible) {
        setDebugInfo(JSON.stringify({
          action: 'Toggle Service Completion',
          endpoint: `/shopmonkey/order/${orderId}/service/${serviceId}`,
          currentService: currentService,
          requestData: updateData,
          response: response.data
        }, null, 2));
        setShowDebugDialog(true);
      }

      // Check if we had labor endpoint issues but service completion still worked
      const hadLaborEndpointIssues = currentService.labors && currentService.labors.length > 0;
      if (hadLaborEndpointIssues) {
        setSuccessMessage(`Service marked as ${newCompletionStatus ? 'completed' : 'incomplete'} (Note: Individual labor item completion not supported by server, but service-level completion works fine)`);
      } else {
        setSuccessMessage(`Service marked as ${newCompletionStatus ? 'completed' : 'incomplete'}`);
      }
      
      // Refresh the order details to show updated status
      console.log(`🔄 Refreshing order details to see updated completion status...`);
      await loadOrderDetails(orderId);
      
      // Check the completion status after refresh
      const refreshedService = orderDetails?.services?.find(service => service.id === serviceId);
      if (refreshedService) {
        console.log(`🔧 After refresh - Service completion status:`, {
          serviceId: serviceId,
          serviceCompleted: refreshedService.completed,
          isCompleted: isServiceCompleted(refreshedService),
          laborItems: refreshedService.labors?.map(l => ({ id: l.id, name: l.name, completed: l.completed })) || []
        });
      }
      
    } catch (error: any) {
      console.error('❌ Error updating service completion:', error);
      
      // Safely extract error information
      const errorInfo = {
        message: error?.message || 'Unknown error',
        status: error?.response?.status || 'N/A',
        statusText: error?.response?.statusText || 'N/A',
        responseData: error?.response?.data || 'N/A',
        requestUrl: `/shopmonkey/order/${orderId}/service/${serviceId}`,
        errorType: typeof error,
        hasResponse: !!error?.response,
        hasMessage: !!error?.message
      };
      
      console.error('❌ Error details:', errorInfo);
      
      if (error?.response?.data) {
        try {
          console.error('❌ Full error response:', JSON.stringify(error.response.data, null, 2));
        } catch (jsonError) {
          console.error('❌ Could not stringify error response:', error.response.data);
        }
      }
      
      // Create user-friendly error message
      let errorMessage = 'Failed to update service completion status';
      if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      setAddServiceError(errorMessage);
    } finally {
      setUpdatingServiceCompletion('');
    }
  };

  // Filter services based on search query
  const filteredServices = useMemo(() => {
    // Ensure cannedServices is always an array
    const services = Array.isArray(cannedServices) ? cannedServices : [];
    
    if (!serviceSearchQuery.trim()) {
      return services;
    }
    
    const query = serviceSearchQuery.toLowerCase();
    return services.filter(service => 
      service.name.toLowerCase().includes(query) ||
      (service.description && service.description.toLowerCase().includes(query)) ||
      (service.category && service.category.toLowerCase().includes(query))
    );
  }, [cannedServices, serviceSearchQuery]);

  // Filter active orders for the dropdown
  const activeOrders = useMemo(() => {
    return workflowOrders.filter(order => !order.archived);
  }, [workflowOrders]);

  // VIN Decoding Functions
  const preDecodeVinsForOrders = async (orders: WorkflowOrder[]) => {
    const vinsToDecodeSet = new Set<string>();
    
    // Collect all valid VINs that haven't been decoded yet
    orders.forEach(order => {
      const vin = order.vehicle?.vin;
      if (vin && vin.length === 17 && !preDecodedVins[vin] && !decodingVins.has(vin)) {
        vinsToDecodeSet.add(vin);
      }
    });
    
    const vinsToDecodeArray = Array.from(vinsToDecodeSet);
    
    if (vinsToDecodeArray.length === 0) {
      console.log('🔍 No new VINs to decode');
      return;
    }
    
    console.log(`🔍 Pre-decoding ${vinsToDecodeArray.length} VINs for faster sticker creation...`);
    
    // Mark VINs as being decoded
    setDecodingVins(prev => new Set([...Array.from(prev), ...vinsToDecodeArray]));
    
    // Decode VINs in parallel (but limit concurrency to avoid rate limiting)
    const BATCH_SIZE = 3; // Decode 3 VINs at a time to avoid overwhelming the API
    const batches = [];
    for (let i = 0; i < vinsToDecodeArray.length; i += BATCH_SIZE) {
      batches.push(vinsToDecodeArray.slice(i, i + BATCH_SIZE));
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const batch of batches) {
      const batchPromises = batch.map(async (vin) => {
        try {
          console.log(`🔍 Decoding VIN: ${vin}`);
          const decodedData = await decodeVinCached(vin);
          
          if (decodedData && decodedData.Results && Array.isArray(decodedData.Results)) {
            const getValue = (variable: string) => {
              const result = decodedData.Results.find((r: any) => r.Variable === variable);
              return result && result.Value && result.Value !== 'Not Available' ? result.Value : null;
            };
            
            const transformedDecodedDetails = {
              year: getValue('Model Year'),
              make: getValue('Make'),
              model: getValue('Model'),
              engine: getValue('Engine Configuration'),
              engineL: getValue('Displacement (L)'),
              engineCylinders: getValue('Engine Number of Cylinders'),
              trim: getValue('Trim'),
              bodyType: getValue('Body Class'),
              bodyClass: getValue('Body Class'),
              driveType: getValue('Drive Type'),
              transmission: getValue('Transmission Style'),
              fuelType: getValue('Fuel Type - Primary'),
              manufacturer: getValue('Manufacturer Name'),
              plant: getValue('Plant Company Name'),
              vehicleType: getValue('Vehicle Type'),
              ...decodedData
            };
            
            // Store the decoded VIN data
            setPreDecodedVins(prev => ({
              ...prev,
              [vin]: transformedDecodedDetails
            }));
            
            successCount++;
            console.log(`✅ VIN decoded successfully: ${vin} (${getValue('Make')} ${getValue('Model')})`);
          } else {
            console.log(`⚠️ VIN decode returned empty data: ${vin}`);
            errorCount++;
          }
        } catch (error) {
          console.log(`❌ VIN decode failed: ${vin}`, error);
          errorCount++;
        }
      });
      
      // Wait for current batch to complete before starting next batch
      await Promise.all(batchPromises);
      
      // Small delay between batches to be nice to the API
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Remove VINs from decoding set
    setDecodingVins(prev => {
      const newSet = new Set(prev);
      vinsToDecodeArray.forEach(vin => newSet.delete(vin));
      return newSet;
    });
    
    console.log(`🎉 VIN pre-decoding completed: ${successCount} successful, ${errorCount} failed`);
    if (successCount > 0) {
      console.log('⚡ Oil stickers will now create instantly!');
    }
  };

  // Oil Sticker Functions
  const loadOilStickerMappings = () => {
    try {
      const saved = localStorage.getItem('shopmonkey-oil-sticker-mappings');
      if (saved) {
        setOilStickerMappings(JSON.parse(saved));
      } else {
        // Set default mappings using your specific service names
        // NOTE: Viscosity-agnostic patterns will match any viscosity (0W16, 5W30, 15W40, etc.)
        // ORDER MATTERS: Most specific mappings come first for accurate matching!
        const defaultMappings: OilStickerMapping[] = [
          // EXACT SERVICE MATCHES: Your specific service names (highest priority)
          { id: '1', cannedServiceName: 'Oil Change Full Service 5W20', oilType: 'Conventional Oil' },
          { id: '2', cannedServiceName: 'Oil Change Mobil Super Synthetic 5W30', oilType: 'Super Synthetic' },
          { id: '3', cannedServiceName: 'Oil Change Mobil 1 0W16', oilType: 'Mobil 1' },
          { id: '4', cannedServiceName: 'OIL Change Mobil 1 0W8', oilType: 'Mobil 1' },
          { id: '5', cannedServiceName: 'Oil Change Rotella T4 15W40', oilType: 'Rotella' },
          { id: '6', cannedServiceName: 'Oil Change Mobil 1 Delvac 5W40', oilType: 'Delvac 1' },
          { id: '7', cannedServiceName: 'Oil Change Mobil Delvac 1 5W40', oilType: 'Delvac 1' },
          
          // VISCOSITY-AGNOSTIC PATTERNS: Match any viscosity for each oil type
          { id: '8', cannedServiceName: 'Oil Change Full Service', oilType: 'Conventional Oil' },
          { id: '9', cannedServiceName: 'Oil Change Mobil Super Synthetic', oilType: 'Super Synthetic' },
          { id: '10', cannedServiceName: 'Oil Change Mobil 1', oilType: 'Mobil 1' },
          { id: '11', cannedServiceName: 'OIL Change Mobil 1', oilType: 'Mobil 1' },
          { id: '12', cannedServiceName: 'Oil Change Rotella T4', oilType: 'Rotella' },
          { id: '13', cannedServiceName: 'Oil Change Mobil 1 Delvac', oilType: 'Delvac 1' },
          { id: '14', cannedServiceName: 'Oil Change Mobil Delvac 1', oilType: 'Delvac 1' },
          
          // BRAND + PRODUCT COMBINATIONS: More specific patterns
          { id: '15', cannedServiceName: 'Mobil Super Synthetic', oilType: 'Super Synthetic' },
          { id: '16', cannedServiceName: 'Mobil Full Synthetic', oilType: 'Super Synthetic' },
          { id: '17', cannedServiceName: 'Mobil Delvac 1', oilType: 'Delvac 1' },
          { id: '18', cannedServiceName: 'Mobil 1 Delvac', oilType: 'Delvac 1' },
          { id: '19', cannedServiceName: 'Rotella T4', oilType: 'Rotella' },
          { id: '20', cannedServiceName: 'Rotella T6', oilType: 'Rotella' },
          { id: '21', cannedServiceName: 'Full Service', oilType: 'Conventional Oil' },
          { id: '22', cannedServiceName: 'Conventional Service', oilType: 'Conventional Oil' },
          
          // BRAND-SPECIFIC: Single brand mappings
          { id: '23', cannedServiceName: 'Mobil 1', oilType: 'Mobil 1' },
          { id: '24', cannedServiceName: 'Rotella', oilType: 'Rotella' },
          { id: '25', cannedServiceName: 'Delvac', oilType: 'Delvac 1' },
          
          // SERVICE TYPE: Oil type mappings
          { id: '26', cannedServiceName: 'Full Synthetic', oilType: 'Super Synthetic' },
          { id: '27', cannedServiceName: 'Synthetic', oilType: 'Super Synthetic' },
          { id: '28', cannedServiceName: 'High Mileage', oilType: 'Conventional Oil' },
          { id: '29', cannedServiceName: 'Conventional', oilType: 'Conventional Oil' },
          { id: '30', cannedServiceName: 'Diesel', oilType: 'Rotella' },
          
          // GENERIC: Basic oil service mappings
          { id: '31', cannedServiceName: 'Oil Change', oilType: 'Conventional Oil' },
          { id: '32', cannedServiceName: 'Lube', oilType: 'Conventional Oil' },
          { id: '33', cannedServiceName: 'Oil Service', oilType: 'Conventional Oil' },
          
          // FALLBACKS: Single word matching (least specific)
          { id: '34', cannedServiceName: 'oil', oilType: 'Conventional Oil' },
          { id: '35', cannedServiceName: 'mobil', oilType: 'Mobil 1' },
          { id: '36', cannedServiceName: 'synthetic', oilType: 'Super Synthetic' },
          { id: '37', cannedServiceName: 'lube', oilType: 'Conventional Oil' },
          { id: '38', cannedServiceName: 'rotella', oilType: 'Rotella' },
          { id: '39', cannedServiceName: 'delvac', oilType: 'Delvac 1' },
        ];
        setOilStickerMappings(defaultMappings);
        localStorage.setItem('shopmonkey-oil-sticker-mappings', JSON.stringify(defaultMappings));
      }
    } catch (error) {
      console.error('Error loading oil sticker mappings:', error);
      setOilStickerMappings([]);
    }
  };

  const saveOilStickerMappings = (mappings: OilStickerMapping[]) => {
    try {
      localStorage.setItem('shopmonkey-oil-sticker-mappings', JSON.stringify(mappings));
      setOilStickerMappings(mappings);
    } catch (error) {
      console.error('Error saving oil sticker mappings:', error);
    }
  };

  const resetOilStickerMappingsToDefaults = () => {
    try {
      localStorage.removeItem('shopmonkey-oil-sticker-mappings');
      loadOilStickerMappings(); // This will load the defaults
      setSuccessMessage('Oil sticker mappings reset to enhanced defaults (39 mappings including your specific service names)');
    } catch (error) {
      console.error('Error resetting oil sticker mappings:', error);
    }
  };

  const addOilStickerMapping = () => {
    if (!newOilMapping.cannedServiceName.trim() || !newOilMapping.oilType.trim()) {
      return;
    }

    const newMapping: OilStickerMapping = {
      id: Date.now().toString(),
      cannedServiceName: newOilMapping.cannedServiceName.trim(),
      oilType: newOilMapping.oilType.trim()
    };

    const updatedMappings = [...oilStickerMappings, newMapping];
    saveOilStickerMappings(updatedMappings);
    setNewOilMapping({ cannedServiceName: '', oilType: '' });
    setSuccessMessage('Oil sticker mapping added successfully');
  };

  const removeOilStickerMapping = (mappingId: string) => {
    const updatedMappings = oilStickerMappings.filter(mapping => mapping.id !== mappingId);
    saveOilStickerMappings(updatedMappings);
    setSuccessMessage('Oil sticker mapping removed successfully');
  };

  // Fetch detailed services for an order and cache them
  const fetchDetailedServicesForOrder = async (orderId: string): Promise<any[]> => {
    // Check if already cached
    if (detailedServicesCache[orderId]) {
      return detailedServicesCache[orderId];
    }

    // Check if already fetching to avoid duplicate requests
    if (fetchingServices.has(orderId)) {
      // Wait for existing request to complete
      return new Promise((resolve) => {
        const checkCache = () => {
          if (detailedServicesCache[orderId]) {
            resolve(detailedServicesCache[orderId]);
          } else if (!fetchingServices.has(orderId)) {
            // Request failed, return empty array
            resolve([]);
          } else {
            // Still fetching, check again in 100ms
            setTimeout(checkCache, 100);
          }
        };
        checkCache();
      });
    }

    // Mark as fetching
    setFetchingServices(prev => new Set(prev).add(orderId));

    try {
      console.log(`🔍 Fetching detailed services for order ${orderId}...`);
      const response = await shopmonkeyApi.get(`/shopmonkey/order/${orderId}/service`);
      
      // Ensure services is always an array
      let services = [];
      if (Array.isArray(response.data)) {
        services = response.data;
      } else if (response.data && typeof response.data === 'object') {
        services = response.data.services || response.data.data || [];
      }

      console.log(`✅ Fetched ${services.length} detailed services for order ${orderId}`);

      // Cache the result with metadata to detect staleness
      setDetailedServicesCache(prev => ({
        ...prev,
        [orderId]: services
      }));

      console.log(`📦 Cached ${services.length} services for order ${orderId}`);

      return services;
    } catch (error: any) {
      console.error(`❌ Failed to fetch detailed services for order ${orderId}:`, error?.message);
      // Cache empty array to avoid repeated failed requests
      setDetailedServicesCache(prev => ({
        ...prev,
        [orderId]: []
      }));
      return [];
    } finally {
      // Remove from fetching set
      setFetchingServices(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    }
  };

    // Enhanced oil type detection that uses fresh API data
  const getOilTypeForDisplay = useCallback((order: WorkflowOrder | DetailedOrder): string | null => {
    // Check if coalescedName has changed (indicates services changed)
    const currentCoalescedName = order.coalescedName || '';
    const lastKnownCoalescedName = orderCoalescedNames[order.id];
    
    // Handle state updates outside of render cycle to prevent infinite loops
    if (lastKnownCoalescedName && lastKnownCoalescedName !== currentCoalescedName) {
      // CoalescedName changed - services likely changed, invalidate cache
      if (order.number === 196489) {
        console.log(`🔄 CoalescedName changed for order #196489: "${lastKnownCoalescedName}" → "${currentCoalescedName}"`);
        console.log('   Invalidating cached services...');
      }
      
      // Schedule state updates to prevent render cycle disruption
      setTimeout(() => {
        setDetailedServicesCache(prev => {
          const newCache = { ...prev };
          delete newCache[order.id];
          return newCache;
        });
        
        setOrderCoalescedNames(prev => ({
          ...prev,
          [order.id]: currentCoalescedName
        }));
      }, 0);
    } else if (!lastKnownCoalescedName) {
      // First time seeing this order, track its coalescedName
      setTimeout(() => {
        setOrderCoalescedNames(prev => ({
          ...prev,
          [order.id]: currentCoalescedName
        }));
      }, 0);
    }
    
    // For consistent results, always prefer fresh detailed services over cached data
    // This ensures the chip shows the same result as the debug info
    
    // First, check if this order already has detailed services loaded (most current)
    if ('services' in order && order.services && order.services.length > 0) {
      const result = findOilTypeFromDetailedServices(order.services, order.number === 196489);
      if (result) {
        if (order.number === 196489) {
          console.log('✅ getOilTypeForDisplay using ORDER services result:', result);
        }
        return result;
      }
    }

    // Fallback to cached services only if no fresh data available
    const cachedServices = detailedServicesCache[order.id];
    if (cachedServices && cachedServices.length > 0) {
      const result = findOilTypeFromDetailedServices(cachedServices, order.number === 196489);
      if (result) {
        if (order.number === 196489) {
          console.log('⚠️ getOilTypeForDisplay using CACHED services result (might be stale):', result);
        }
        return result;
      }
    }

    // For orders that might have oil services, try to get fresh data
    if (order.coalescedName) {
      const coalescedLower = order.coalescedName.toLowerCase();
      
      // Check if this looks like it might contain oil services
      const mightHaveOilServices = coalescedLower.includes('oil') || 
                                  coalescedLower.includes('lube') || 
                                  coalescedLower.includes('mobil') || 
                                  coalescedLower.includes('synthetic') ||
                                  coalescedLower.includes('rotella') || 
                                  coalescedLower.includes('delvac') ||
                                  (coalescedLower.includes('and') && coalescedLower.includes('more'));
      
      if (mightHaveOilServices) {
        if (order.number === 196489) {
          console.log('🔄 getOilTypeForDisplay: Order might have oil services, trying to get fresh data');
        }
        
        // For important oil detection, always try to get the most current data
        // This ensures chip shows same result as debug info
        triggerDetailedServicesFetch(order.id);
        
        // For immediate display while fetching, use the same oil sticker mapping system
        // This ensures chip display matches oil sticker creation logic
        const coalescedServices = [{ name: order.coalescedName }];
        const coalescedResult = findOilTypeFromDetailedServices(coalescedServices, order.number === 196489);
        if (coalescedResult) {
          if (order.number === 196489) {
            console.log('🏷️ getOilTypeForDisplay: Found mapping match in coalescedName:', coalescedResult);
            console.log('   NOTE: This is temporary display while fetching accurate data');
          }
          return coalescedResult;
        }
        
        // Generic patterns for multiple services
        if (coalescedLower.includes('and') && coalescedLower.includes('more')) {
          if (order.number === 196489) {
            console.log('🏷️ getOilTypeForDisplay: Multiple services pattern detected');
          }
          return 'Multiple Services';
        }
        
        // Generic oil service indicator
        if (order.number === 196489) {
          console.log('🏷️ getOilTypeForDisplay: Generic oil service detected');
        }
        return 'Oil Service';
      }
    }

    if (order.number === 196489) {
      console.log('❌ getOilTypeForDisplay: No oil services detected');
    }

    return null;
  }, [detailedServicesCache, orderCoalescedNames, fetchingServices]);

  // Helper function to trigger fetching detailed services (fire and forget)
  const triggerDetailedServicesFetch = (orderId: string) => {
    // Only fetch if not already cached or fetching
    if (!detailedServicesCache[orderId] && !fetchingServices.has(orderId)) {
      console.log(`🚀 triggerDetailedServicesFetch: Starting fetch for order ${orderId}`);
      fetchDetailedServicesForOrder(orderId).then((services) => {
        // Services are now cached, component will re-render and show updated oil type
        console.log(`🔄 Detailed services fetched for order ${orderId}, ${services.length} services cached, UI will update`);
      }).catch(() => {
        // Silently handle errors - they're already logged in fetchDetailedServicesForOrder
        console.log(`❌ Failed to fetch detailed services for order ${orderId}`);
      });
    } else if (detailedServicesCache[orderId]) {
      console.log(`✅ triggerDetailedServicesFetch: Services already cached for order ${orderId}, count: ${detailedServicesCache[orderId].length}`);
    } else if (fetchingServices.has(orderId)) {
      console.log(`⏳ triggerDetailedServicesFetch: Already fetching services for order ${orderId}`);
    }
  };

  // Helper function to detect oil type from detailed services (with optional logging)
  const findOilTypeFromDetailedServices = (services: any[], enableLogging: boolean = true): string | null => {
    if (enableLogging) {
      console.log('🔧 Detailed services to check:', services.map((s, index) => `${index + 1}. "${s.name}"`));
    }

    // Match services against oil sticker mappings
    for (let i = 0; i < services.length; i++) {
      const service = services[i];
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
        
        if (serviceName === mappingName) {
          baseScore = 10000;
          matchType = 'EXACT';
        } else if (serviceName.includes(mappingName)) {
          baseScore = 5000 + mappingName.length;
          matchType = 'service contains mapping';
        } else if (mappingName.includes(serviceName)) {
          baseScore = 3000 + serviceName.length;
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
            baseScore = 1000 + (commonWords.length * 10);
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

  // Get color for oil type chip
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

  const findOilTypeFromServices = (order: WorkflowOrder | DetailedOrder): string | null => {
    console.log('🔍 Finding oil type for order:', order.id);
    console.log(`📊 Order Type: ${('services' in order) ? 'DetailedOrder' : 'WorkflowOrder'}`);
    
    // First, try to get services from the order if it's a DetailedOrder
    let services: any[] = [];
    
    if ('services' in order && order.services) {
      services = order.services;
      console.log('✅ Found detailed services in order:', services.length);
    } else {
      // Check if we have cached detailed services
      const cachedServices = detailedServicesCache[order.id];
      if (cachedServices && cachedServices.length > 0) {
        services = cachedServices;
        console.log('✅ Found cached detailed services:', services.length);
      }
    }
    
    // If no services found, check coalescedName as fallback (but warn user)
    if (services.length === 0 && order.coalescedName) {
      // Treat coalescedName as a single service for matching
      services = [{ name: order.coalescedName }];
      console.log('⚠️ No detailed services found, using coalescedName as fallback service:', order.coalescedName);
      console.log('💡 For better matching, click the order to load full details first, then try printing');
      console.log('📋 This means you\'re using the orange button in the table, not the green button in order details');
    }

    console.log('📋 Available mappings:', oilStickerMappings.map(m => `"${m.cannedServiceName}" → "${m.oilType}"`));

    // Use the shared helper function with logging enabled
    return findOilTypeFromDetailedServices(services, true);
  };

  // Handle sticker printing with auto-print functionality (same as Home.tsx)
  const handlePrintSticker = async (sticker: StaticSticker) => {
    try {
      const settings = StickerStorageService.getSettings();
      
      // Apply orientation setting to paper size
      const orientedSettings = {
        ...settings,
        paperSize: {
          ...settings.paperSize,
          width: stickerPrintOrientation === 'landscape' ? 
            Math.max(settings.paperSize.width, settings.paperSize.height) :
            Math.min(settings.paperSize.width, settings.paperSize.height),
          height: stickerPrintOrientation === 'landscape' ? 
            Math.min(settings.paperSize.width, settings.paperSize.height) :
            Math.max(settings.paperSize.width, settings.paperSize.height)
        }
      };
      
      // Check if queue printing is enabled
      if (stickerPrintMethod === 'queue' && stickerPrinterId) {
        // Generate PDF first, then send to print queue
        console.log('🖨️ Generating PDF for print queue...');
        console.log('🔄 Using orientation:', stickerPrintOrientation);
        
        // Generate the PDF blob
        const pdfBlob = await PDFGeneratorService.generateStickerPDFBlob(sticker, orientedSettings);
        
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
          filename: `sticker-${sticker.vin}-${Date.now()}.pdf`,
          printerId: stickerPrinterId,
          stickerInfo: {
            vin: sticker.vin,
            vehicleDetails: sticker.decodedDetails,
            oilType: sticker.oilType?.name,
            mileage: sticker.mileage,
            nextServiceDate: sticker.date,
            companyName: sticker.companyName
          },
          metadata: {
            documentType: 'oil-change-sticker',
            generated: new Date().toISOString(),
            source: 'shopmonkey-oil-sticker'
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
        await StickerStorageService.saveSticker({ ...sticker, printed: true });
        setSuccessMessage(`Oil sticker PDF queued for printing! Job ID: ${job.id.slice(0, 8)}...`);
      } else {
        // Use PDF method - open in new tab
        console.log('📄 Opening PDF in new tab...');
        console.log('🔄 Using orientation:', stickerPrintOrientation);
        await PDFGeneratorService.openStickerPDF(sticker, orientedSettings);
        
        await StickerStorageService.saveSticker({ ...sticker, printed: true });
        setSuccessMessage('Oil sticker PDF opened in new tab successfully!');
      }
    } catch (error) {
      console.error('Error printing oil sticker:', error);
      setOrdersError(stickerPrintMethod === 'queue' ? 'Failed to queue oil sticker PDF for printing' : 'Failed to generate oil sticker PDF');
    }
  };

  const printOilSticker = async (order: WorkflowOrder | DetailedOrder) => {
    setPrintingSticker(order.id);
    
    try {
      console.log('🖨️ Starting direct oil sticker creation for order:', order.id);
      
      // If this is a basic WorkflowOrder without detailed services, fetch them first
      let detailedOrder = order;
      if (!('services' in order && order.services)) {
        console.log('🔍 Fetching detailed services for oil sticker printing...');
        try {
          const response = await shopmonkeyApi.get(`/shopmonkey/order/${order.id}/service`);
          
          // Ensure services is always an array
          let services = [];
          if (Array.isArray(response.data)) {
            services = response.data;
          } else if (response.data && typeof response.data === 'object') {
            services = response.data.services || response.data.data || [];
          }
          
          // Create a DetailedOrder by combining the basic order with the fetched services
          detailedOrder = {
            ...order,
            services: services
          } as DetailedOrder;
          
          console.log('✅ Detailed services loaded for oil sticker printing:', services.length, 'services');
        } catch (error) {
          console.warn('⚠️ Could not fetch detailed services, using basic order data:', error);
          // Continue with original order data
        }
      }
      
      // Extract required data
      const vin = detailedOrder.vehicle?.vin || '';
      const mileage = detailedOrder.vehicle?.mileage || 0;
      const customerName = detailedOrder.customer?.companyName || 
                          (detailedOrder.customer ? `${detailedOrder.customer.firstName || ''} ${detailedOrder.customer.lastName || ''}`.trim() : '') || 
                          ('customerName' in detailedOrder ? (detailedOrder as any).customerName : '') || '';
      const vehicleInfo = detailedOrder.vehicle ? 
                         `${detailedOrder.vehicle.year || ''} ${detailedOrder.vehicle.make || ''} ${detailedOrder.vehicle.model || ''}`.trim() : 
                         ('vehicleInfo' in detailedOrder ? (detailedOrder as any).vehicleInfo : '') || '';
      
      // Enhanced debugging for each order
      console.log('📋 ORDER DETAILS:');
      console.log(`   🆔 Order ID: ${detailedOrder.id}`);
      console.log(`   🔢 Order Number: #${detailedOrder.number || 'N/A'}`);
      console.log(`   👤 Customer: "${customerName}" ${customerName ? '✅' : '❌'}`);
      console.log(`   🚗 Vehicle: "${vehicleInfo}" ${vehicleInfo ? '✅' : '❌'}`);
      console.log(`   🔑 VIN: "${vin}" ${vin && vin.length === 17 ? '✅' : '❌'}`);
      console.log(`   📏 Mileage: ${mileage} ${mileage > 0 ? '✅' : '❌'}`);
      console.log(`   📋 CoalescedName: "${detailedOrder.coalescedName || 'N/A'}"`);
      console.log(`   🔧 Services Available: ${('services' in detailedOrder && detailedOrder.services) ? '✅ Detailed' : '❌ Basic only'}`);
      
      // Find oil type from services
      const oilTypeName = findOilTypeFromServices(detailedOrder);
      console.log('🎯 Oil type returned from findOilTypeFromServices:', `"${oilTypeName}"`);
      
      if (!oilTypeName) {
        console.log('❌ RESULT: No oil sticker will be created - no oil services found');
        setSuccessMessage('⚠️ No oil change service found in this order. Please check your oil sticker mappings in settings.');
        setPrintingSticker('');
        return;
      }
      
      if (!vin) {
        setSuccessMessage('⚠️ No VIN found in this order. VIN is required for oil sticker creation.');
        setPrintingSticker('');
        return;
      }
      
      console.log('✅ RESULT: Oil sticker will be created!');
      console.log('🏷️ Oil sticker data extracted:', {
        vin,
        mileage,
        oilTypeName,
        customerName,
        vehicleInfo,
        orderNumber: order.number
      });
      
      // Get sticker settings and oil types
      const settings = StickerStorageService.getSettings();
      const oilTypes = settings.oilTypes;
      
      // Find matching oil type ID
      const findOilTypeId = (oilTypeName: string): string => {
        console.log('🔍 Finding oil type ID for:', `"${oilTypeName}"`);
        console.log('📋 Available oil types:', oilTypes.map(type => `"${type.name}" (id: ${type.id})`));
        
        // Try exact match first
        let oilType = oilTypes.find(type => 
          type.name.toLowerCase() === oilTypeName.toLowerCase()
        );
        
        if (oilType) {
          console.log('✅ Exact match found:', oilType.name, '(id:', oilType.id + ')');
          return oilType.id;
        }
        
        console.log('⚠️ No exact match, trying partial matches...');
        
        // Try partial matches
        oilType = oilTypes.find(type => {
          const typeNameLower = type.name.toLowerCase();
          const oilTypeNameLower = oilTypeName.toLowerCase();
          const match = oilTypeNameLower.includes(typeNameLower) || typeNameLower.includes(oilTypeNameLower);
          if (match) {
            console.log(`🎯 Partial match found: "${oilTypeName}" contains "${type.name}"`);
          }
          return match;
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
      const generateQRCode = (sticker: Omit<StaticSticker, 'qrCode'>): string => {
        return sticker.vin;
      };
      
      // Get company info from settings
      const companyElement = settings.layout.elements.find(el => el.id === 'companyName');
      const addressElement = settings.layout.elements.find(el => el.id === 'address');
      const messageElement = settings.layout.elements.find(el => el.id === 'message');
      
      // Use pre-decoded VIN data if available, otherwise use basic fallback
      let transformedDecodedDetails: any = {
        vehicleInfo: vehicleInfo,
        customerName: customerName,
        orderNumber: detailedOrder.number || detailedOrder.id
      };
      
      // Check if we have pre-decoded VIN data
      if (vin && vin.length === 17 && preDecodedVins[vin]) {
        console.log('⚡ Using pre-decoded VIN data for instant sticker creation!');
        transformedDecodedDetails = preDecodedVins[vin];
      } else if (vin && vin.length === 17) {
        console.log('🔍 VIN not pre-decoded, using basic vehicle info (consider waiting for VIN pre-decoding to complete)');
        // Basic vehicle info is already set above
      } else {
        console.log('⚠️ No valid VIN found, using basic vehicle info');
      }
      
      // Create new sticker immediately
      const newSticker: StaticSticker = {
        id: Date.now().toString(),
        dateCreated: new Date().toISOString(),
        vin: VinDecoderService.formatVin(vin),
        decodedDetails: transformedDecodedDetails,
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
      
      // Auto-print using same settings as static stickers
      if (stickerPrintAutoPrint && (stickerPrintMethod === 'queue' || stickerPrintMethod === 'queue-fallback') && stickerPrinterId) {
        try {
          await handlePrintSticker(newSticker);
          console.log('🎉 Oil sticker auto-printed successfully!');
        } catch (error) {
          console.error('Auto-print failed:', error);
          
          if (stickerPrintMethod === 'queue-fallback') {
            // Fallback to PDF in new tab for queue-fallback mode
            await PDFGeneratorService.generateStickerPDF(newSticker, settings, true);
            await StickerStorageService.saveSticker({ ...newSticker, printed: true });
            setSuccessMessage(`✅ Oil sticker created and opened in new tab! Order #${detailedOrder.number || 'N/A'} - ${oilType.name} (Auto-print failed)`);
          } else {
            // For regular queue mode, just show error
            setSuccessMessage(`✅ Oil sticker created! Order #${detailedOrder.number || 'N/A'} - ${oilType.name} (Auto-print failed - please print manually)`);
          }
        }
      } else {
        // Default behavior - open PDF in new tab
        console.log('🖨️ Opening PDF in new tab...');
        await PDFGeneratorService.generateStickerPDF(newSticker, settings, true);
        await StickerStorageService.saveSticker({ ...newSticker, printed: true });
        setSuccessMessage(`✅ Oil sticker created and PDF opened! Order #${detailedOrder.number || 'N/A'} - ${oilType.name}`);
      }
      console.log('🎉 Oil sticker process completed successfully!');
      
      if (debugOverlayVisible) {
        setDebugInfo(JSON.stringify({
          action: 'Print Oil Sticker - Direct Creation',
          orderId: detailedOrder.id,
          orderNumber: detailedOrder.number || 'N/A',
          extractedData: {
            vin: vin.toUpperCase(),
            mileage,
            oilTypeName,
            customerName,
            vehicleInfo,
            orderNumber: detailedOrder.number || detailedOrder.id
          },
          selectedOilType: oilType,
          mappingsUsed: oilStickerMappings
        }, null, 2));
        setShowDebugDialog(true);
      }
      
    } catch (error: any) {
      console.error('❌ Error creating oil sticker:', error);
      setOrdersError('Failed to create oil sticker: ' + (error.message || 'Unknown error'));
    } finally {
      setPrintingSticker('');
    }
  };

  // Load oil sticker mappings on component mount
  useEffect(() => {
    loadOilStickerMappings();
  }, []);

  // Load printer settings from localStorage on component mount
  useEffect(() => {
    const savedPrintMethod = (localStorage.getItem('stickerPrintMethod') as 'pdf' | 'queue' | 'queue-fallback') || 'pdf';
    const savedPrinterId = localStorage.getItem('stickerPrinterId') || '';
    const savedOrientation = (localStorage.getItem('stickerPrintOrientation') as 'portrait' | 'landscape') || 'portrait';
    const savedAutoPrint = localStorage.getItem('stickerPrintAutoPrint') === 'true';
    
    setStickerPrintMethod(savedPrintMethod);
    setStickerPrinterId(savedPrinterId);
    setStickerPrintOrientation(savedOrientation);
    setStickerPrintAutoPrint(savedAutoPrint);
    
    console.log('🖨️ Loaded sticker print settings:', {
      method: savedPrintMethod,
      printerId: savedPrinterId,
      orientation: savedOrientation,
      autoPrint: savedAutoPrint
    });
  }, []);

  // Load data when authenticated
  useEffect(() => {
    if (isAuthenticated && authToken) {
      // Run API health check only if debug mode is enabled
      if (process.env.NODE_ENV === 'development') {
        // Only run once per session to avoid rate limiting
        const healthCheckKey = 'shopmonkey-health-check-done';
        if (!sessionStorage.getItem(healthCheckKey)) {
          testShopMonkeyApiHealth();
          sessionStorage.setItem(healthCheckKey, 'true');
        }
      }
      
      loadApiKeys();
      loadWorkflowOrders();
      loadWorkflowStatuses();
      loadLabels();
      loadCannedServices();
    }
  }, [isAuthenticated, authToken]);

  // Reload orders when limit or filter changes (only if authenticated)
  useEffect(() => {
    if (isAuthenticated && authToken) {
      loadWorkflowOrders();
    }
  }, [orderLimit, selectedStatusFilter, viewMode, archiveMode, isAuthenticated, authToken]);

  // Reload services when service limit changes (only if authenticated)
  useEffect(() => {
    if (isAuthenticated && authToken) {
      loadCannedServices();
    }
  }, [serviceLimit, isAuthenticated, authToken]);

  // Clear success message after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Clear Add Service messages after 10 seconds
  useEffect(() => {
    if (addServiceSuccess) {
      const timer = setTimeout(() => setAddServiceSuccess(''), 10000);
      return () => clearTimeout(timer);
    }
  }, [addServiceSuccess]);

  useEffect(() => {
    if (addServiceError) {
      const timer = setTimeout(() => setAddServiceError(''), 10000);
      return () => clearTimeout(timer);
    }
  }, [addServiceError]);

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
    if (!autoRefreshEnabled || !isAuthenticated) return;
    
    console.log(`🔄 Starting auto-refresh with ${refreshInterval}ms interval`);
    
    const timer = setInterval(() => {
      console.log('🔄 Auto-refresh triggered');
      setLastRefreshTime(new Date());
      loadWorkflowOrders();
    }, refreshInterval);
    
    setRefreshTimer(timer);
  }, [autoRefreshEnabled, refreshInterval, isAuthenticated]);

  const stopAutoRefresh = useCallback(() => {
    if (refreshTimer) {
      console.log('⏹️ Stopping auto-refresh');
      clearInterval(refreshTimer);
      setRefreshTimer(null);
    }
  }, [refreshTimer]);

  const manualRefresh = useCallback(async () => {
    console.log('🔄 Manual refresh triggered');
    setLastRefreshTime(new Date());
    
    // Store current orders to detect changes
    const previousOrders = workflowOrders;
    
    await loadWorkflowOrders();
    
    // Check for status changes after refresh
    if (previousOrders.length > 0 && workflowOrders.length > 0) {
      const statusChanges = [];
      
      for (const newOrder of workflowOrders) {
        const oldOrder = previousOrders.find(o => o.id === newOrder.id);
        if (oldOrder && oldOrder.workflowStatusId !== newOrder.workflowStatusId) {
          const oldStatus = getWorkflowStatusName(oldOrder.workflowStatusId || '');
          const newStatus = getWorkflowStatusName(newOrder.workflowStatusId || '');
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
  }, [workflowOrders, addUpdateNotification]);

  // WebSocket event handlers
  useEffect(() => {
    if (!realTimeUpdatesEnabled || !connectionStatus.connected) return;

    // DISABLED: QuickCheck updates should only be handled by Home.tsx to prevent duplicate processing
    // const unsubscribeQuickCheck = websocketService.on('quick_check_update', (message) => {
    //   console.log('📢 ShopMonkey: Quick check update received', message);
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
    //       if (workflowOrders.length > 0) {
    //         setPendingUpdates(prev => new Set([...prev, 'orders']));
    //       }
    //     }
    //   }
    // });

    const unsubscribeStatus = websocketService.on('status_update', (message) => {
      console.log('📣 ShopMonkey: Status update received', message);
      
      if (message.statusType === 'info' && message.message?.includes('ShopMonkey')) {
        addUpdateNotification('order_update', message.message);
      }
    });

    return () => {
      // unsubscribeQuickCheck(); // DISABLED: No longer subscribing to QuickCheck updates
      unsubscribeStatus();
    };
  }, [realTimeUpdatesEnabled, connectionStatus.connected, addUpdateNotification, workflowOrders.length]);

  // Auto-refresh management
  useEffect(() => {
    if (autoRefreshEnabled && isAuthenticated) {
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }

    return () => stopAutoRefresh();
  }, [autoRefreshEnabled, isAuthenticated, startAutoRefresh, stopAutoRefresh]);

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

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get workflow status name by ID
  const getWorkflowStatusName = (statusId: string) => {
    const status = workflowStatuses.find(s => s.id === statusId);
    return status ? status.name : statusId;
  };

  // Get order counts by status (filtered by current view mode)
  const getStatusCounts = () => {
    const counts: Record<string, number> = {};
    const filteredOrders = getFilteredOrdersByViewMode();
    
    filteredOrders.forEach(order => {
      const statusId = order.workflowStatusId || 'unknown';
      counts[statusId] = (counts[statusId] || 0) + 1;
    });
    return counts;
  };

  // Get filtered orders based on view mode and archive mode (for client-side display counts)
  const getFilteredOrdersByViewMode = () => {
    let filtered = workflowOrders;
    
    // Filter by view mode (invoice status)
    if (viewMode === 'estimates') {
      filtered = filtered.filter(order => !order.invoiced);
    } else if (viewMode === 'invoices') {
      filtered = filtered.filter(order => order.invoiced);
    }
    
    // Filter by archive mode
    if (archiveMode === 'active') {
      filtered = filtered.filter(order => !order.archived);
    } else if (archiveMode === 'archived') {
      filtered = filtered.filter(order => order.archived);
    }
    
    return filtered;
  };

  // Get view mode counts (respecting current archive filter)
  const getViewModeCounts = () => {
    let baseOrders = workflowOrders;
    
    // Apply archive filter to base orders
    if (archiveMode === 'active') {
      baseOrders = baseOrders.filter(order => !order.archived);
    } else if (archiveMode === 'archived') {
      baseOrders = baseOrders.filter(order => order.archived);
    }
    
    return {
      all: baseOrders.length,
      estimates: baseOrders.filter(order => !order.invoiced).length,
      invoices: baseOrders.filter(order => order.invoiced).length
    };
  };

  // Get archive mode counts (respecting current view filter)
  const getArchiveModeCounts = () => {
    let baseOrders = workflowOrders;
    
    // Apply view filter to base orders
    if (viewMode === 'estimates') {
      baseOrders = baseOrders.filter(order => !order.invoiced);
    } else if (viewMode === 'invoices') {
      baseOrders = baseOrders.filter(order => order.invoiced);
    }
    
    return {
      all: baseOrders.length,
      active: baseOrders.filter(order => !order.archived).length,
      archived: baseOrders.filter(order => order.archived).length
    };
  };

  // Quick status filter buttons
  const quickStatusFilters = [
    { label: 'All Orders', value: '' },
    { label: 'Drop Off', value: 'drop-off' },
    { label: 'Next To Work On', value: 'next-to-work-on' },
    { label: 'In Progress', value: 'in-progress' },
    { label: 'Complete', value: 'complete' },
    { label: 'Ready for Pickup', value: 'ready-for-pickup' }
  ];

  // Load detailed order information
  const loadOrderDetails = async (orderId: string) => {
    setLoadingOrderDetails(true);
    setOrderDetailsError('');
    setOrderDetails(null);

    try {
      console.log('🔍 Loading order details for:', orderId);

      // Use the working endpoint (server is configured to include services)
      console.log(`🔍 Fetching order details from: /shopmonkey/order/${orderId}`);
      const response = await shopmonkeyApi.get(`/shopmonkey/order/${orderId}`);
      console.log(`✅ Order details response:`, response.data);

      if (debugOverlayVisible) {
        setDebugInfo(JSON.stringify({
          action: 'Load Order Details',
          endpoint: `/shopmonkey/order/${orderId}`,
          response: response.data
        }, null, 2));
        setShowDebugDialog(true);
      }

      // Handle both wrapped and direct response formats
      const orderData = response.data.data || response.data;
      
      // Debug: Log the complete order data structure
      console.log('🔧 Complete order data keys:', Object.keys(orderData));
      console.log('🔧 Services in order data:', orderData.services);
      console.log('🔧 Looking for services in various locations...');
      console.log('🔧 orderData.services:', orderData.services);
      console.log('🔧 orderData.lineItems:', orderData.lineItems);
      console.log('🔧 orderData.repairItems:', orderData.repairItems);
      
      // Note: Services should be included in the main response based on server config
      // If services are undefined, this might indicate:
      // 1. The order has no services
      // 2. ShopMonkey API is not returning services despite include parameter
      // 3. The services are in a different field name
      
      if (orderData.services && orderData.services.length > 0) {
        console.log('✅ Services found in main response:', orderData.services.length, 'services');
      } else {
        console.log('⚠️ No services in main response, trying separate services endpoint...');
        
        // Try to fetch services separately using the correct ShopMonkey API endpoint
        try {
          console.log(`🔧 Fetching services from: /shopmonkey/order/${orderId}/service`);
          const servicesResponse = await shopmonkeyApi.get(`/shopmonkey/order/${orderId}/service`);
          console.log('✅ Services response:', servicesResponse.data);
          
          if (servicesResponse.data && servicesResponse.data.data && servicesResponse.data.data.length > 0) {
            orderData.services = servicesResponse.data.data;
            console.log(`✅ Found ${orderData.services.length} services in separate endpoint`);
          } else {
            console.log('⚠️ No services found in separate endpoint either. This order has no services.');
          }
        } catch (serviceError: any) {
          console.log(`❌ Failed to fetch services separately:`, serviceError.response?.status, serviceError.response?.data?.message || serviceError.message);
          if (serviceError.response?.status !== 404) {
            console.error('Unexpected error fetching services:', serviceError);
          }
        }
      }

      setOrderDetails(orderData);
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to load order details';
      setOrderDetailsError(message);
      console.error('Order details error:', error);
    } finally {
      setLoadingOrderDetails(false);
    }
  };

  // Handle order row click to show details
  const handleOrderClick = (orderId: string, orderNumber: string) => {
    setOrderDetailsDialog({
      open: true,
      orderId,
      orderNumber
    });
    loadOrderDetails(orderId);
  };

  // Close order details dialog
  const closeOrderDetailsDialog = () => {
    setOrderDetailsDialog({ open: false, orderId: '', orderNumber: '' });
    setOrderDetails(null);
    setOrderDetailsError('');
  };

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Toggle debug overlay
  const toggleDebugOverlay = () => {
    const newDebugState = !debugOverlayVisible;
    setDebugOverlayVisible(newDebugState);
    
    // Only show debug dialog when turning debug ON and there's debug info
    if (newDebugState && debugInfo) {
      setShowDebugDialog(true);
    } else {
      setShowDebugDialog(false);
    }
  };

  // Group orders by workflow status
  const generateOrderInfo = (order: WorkflowOrder | DetailedOrder): string => {
    const vin = order.vehicle?.vin || '';
    const mileage = order.vehicle?.mileage || 0;
    const customerName = order.customer?.companyName || 
                        (order.customer ? `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim() : '') || 
                        ('customerName' in order ? (order as any).customerName : '') || '';
    const vehicleInfo = order.vehicle ? 
                       `${order.vehicle.year || ''} ${order.vehicle.make || ''} ${order.vehicle.model || ''}`.trim() : 
                       ('vehicleInfo' in order ? (order as any).vehicleInfo : '') || '';

    // Get services info
    let services: any[] = [];
    let serviceType = '';
    
    if ('services' in order && order.services && Array.isArray(order.services)) {
      services = order.services;
      serviceType = 'DetailedOrder - Full services loaded';
    } else if (order.coalescedName) {
      services = [{ name: order.coalescedName }];
      serviceType = 'WorkflowOrder - Using coalescedName fallback';
    }
    
    // Ensure services is always an array for safety
    if (!Array.isArray(services)) {
      console.warn('⚠️ Services is not an array, converting:', services);
      services = [];
    }

    // Try to find oil type
    const oilType = findOilTypeFromServices(order);

    const info = {
      timestamp: new Date().toISOString(),
      orderDetails: {
        id: order.id,
        number: order.number || 'N/A',
        coalescedName: order.coalescedName || 'N/A',
        status: getWorkflowStatusName(order.workflowStatusId || ''),
        totalCents: order.totalCostCents || 0,
        createdDate: order.createdDate || 'N/A',
        archived: order.archived || false,
        authorized: order.authorized || false,
        invoiced: order.invoiced || false,
        paid: order.paid || false
      },
      customer: {
        name: customerName,
        hasName: !!customerName,
        companyName: order.customer?.companyName || 'N/A',
        firstName: order.customer?.firstName || 'N/A',
        lastName: order.customer?.lastName || 'N/A',
        address: order.customer?.address1 || 'N/A',
        city: order.customer?.city || 'N/A',
        state: order.customer?.state || 'N/A',
        emails: order.customer?.emails?.map(e => e.email) || [],
        phoneNumbers: order.customer?.phoneNumbers?.map(p => p.number) || []
      },
      vehicle: {
        info: vehicleInfo,
        hasInfo: !!vehicleInfo,
        year: order.vehicle?.year || 'N/A',
        make: order.vehicle?.make || 'N/A',
        model: order.vehicle?.model || 'N/A',
        submodel: order.vehicle?.submodel || 'N/A',
        vin: vin,
        hasValidVin: vin && vin.length === 17,
        licensePlate: order.vehicle?.licensePlate || 'N/A',
        mileage: mileage,
        hasMileage: mileage > 0,
        color: order.vehicle?.color || 'N/A'
      },
      services: {
        type: serviceType,
        count: services.length,
        names: services.map((s, i) => `${i+1}. "${s.name || ''}"`),
        hasServices: services.length > 0,
        isUsingFallback: !('services' in order && order.services),
        detailedServicesAvailable: 'services' in order && order.services && order.services.length > 0,
        actionRequired: !('services' in order && order.services) ? 
          'CLICK THE ORDER ROW TO LOAD DETAILED SERVICES FIRST!' : 
          'Services loaded - ready for oil sticker matching'
      },
      oilSticker: {
        detectedOilType: oilType || 'None',
        canCreateSticker: !!(oilType && vin),
        reasons: {
          hasOilType: !!oilType,
          hasVin: !!vin,
          hasValidVin: vin && vin.length === 17,
          hasMileage: mileage > 0,
          hasCustomer: !!customerName,
          hasVehicle: !!vehicleInfo
        },
        availableMappings: oilStickerMappings.map(m => `"${m.cannedServiceName}" → "${m.oilType}"`),
        suggestions: services.length > 0 ? 
          !('services' in order && order.services) ? [
            '🚨 Cannot suggest mappings for summary data!',
            '1. Click the order row to load detailed services first',
            '2. Then check this debug info again to see actual service names',
            '3. Add mappings for the real service names (not "...and X more")'
          ] : services.map((service, i) => 
            `${i + 1}. Add mapping: "${service.name}" → "YOUR_OIL_TYPE"`
          ) : ['No services found to suggest mappings for']
      },
      labels: {
        count: getOrderLabels(order).length,
        names: getOrderLabels(order).map(l => l.name)
      },
      debugTips: [
        !('services' in order && order.services) ? 
          '🚨 MAIN ISSUE: Using coalescedName fallback instead of detailed services!' : 
          '✅ Detailed services loaded successfully',
        !('services' in order && order.services) ? 
          '🔧 SOLUTION: Click the order row first to load detailed services, then try oil sticker' : 
          '✅ Ready for oil sticker matching',
        !oilType && ('services' in order && order.services) ? 
          '⚠️ Oil type not detected - add mappings for the actual service names above' : 
          !oilType ? '⚠️ Oil type not detected - need detailed services first' : 
          `✅ Oil type detected: ${oilType}`,
        !vin ? '❌ No VIN found' : vin.length !== 17 ? '⚠️ VIN invalid (not 17 chars)' : '✅ VIN valid',
        !customerName ? '⚠️ No customer name found' : '✅ Customer name available',
        !vehicleInfo ? '⚠️ No vehicle info found' : '✅ Vehicle info available'
      ]
    };

    return JSON.stringify(info, null, 2);
  };

  const handleOrderInfoClick = async (order: WorkflowOrder | DetailedOrder) => {
    setOrderInfoDialog({
      open: true,
      orderId: order.id,
      orderNumber: `${order.number || 'N/A'}`
    });
    setOrderInfoData('Loading order details and services...');

    try {
      let detailedOrder = order;
      
      // If this is a basic WorkflowOrder without detailed services, fetch them
      if (!('services' in order && order.services)) {
        console.log('🔍 Fetching detailed services for debug info...');
        console.log('🔗 API URL:', `/shopmonkey/order/${order.id}/service`);
        
        const response = await shopmonkeyApi.get(`/shopmonkey/order/${order.id}/service`);
        
        console.log('📡 Raw API response:', response);
        console.log('📦 Response data:', response.data);
        console.log('📊 Data type:', typeof response.data);
        console.log('🔢 Is array?', Array.isArray(response.data));
        
        // Ensure services is always an array
        let services = [];
        if (Array.isArray(response.data)) {
          services = response.data;
        } else if (response.data && typeof response.data === 'object') {
          // Maybe it's wrapped in another property
          services = response.data.services || response.data.data || [];
        }
        
        // Create a DetailedOrder by combining the basic order with the fetched services
        detailedOrder = {
          ...order,
          services: services
        } as DetailedOrder;
        
        console.log('✅ Detailed services processed for debug info:', services.length, 'services');
        console.log('🔧 Services array:', services);
      }
      
      const infoData = generateOrderInfo(detailedOrder);
      setOrderInfoData(infoData);
    } catch (error) {
      const err = error as any;
      console.error('❌ Error loading detailed services for debug info:', err);
      console.error('❌ Error details:', {
        message: err?.message,
        response: err?.response?.data,
        status: err?.response?.status,
        url: err?.config?.url
      });
      
      const fallbackInfo = generateOrderInfo(order);
      const errorNote = `\n\n// ⚠️ ERROR: Could not load detailed services
// Using basic order data only
// Error: ${err?.message || String(err)}
// Status: ${err?.response?.status || 'Unknown'}
// URL: ${err?.config?.url || 'Unknown'}
// Response: ${JSON.stringify(err?.response?.data, null, 2) || 'No response data'}
\n\n`;
      setOrderInfoData(errorNote + fallbackInfo);
    }
  };

  const closeOrderInfoDialog = () => {
    setOrderInfoDialog({ open: false, orderId: '', orderNumber: '' });
    setOrderInfoData('');
  };

  const getGroupedOrders = () => {
    const grouped: Record<string, WorkflowOrder[]> = {};
    
    workflowOrders.forEach(order => {
      const statusId = order.workflowStatusId || 'unknown';
      if (!grouped[statusId]) {
        grouped[statusId] = [];
      }
      grouped[statusId].push(order);
    });

    // Sort groups by workflow status position
    const sortedGroups: Array<{ statusId: string; statusName: string; position: number; orders: WorkflowOrder[] }> = [];
    
    Object.entries(grouped).forEach(([statusId, orders]) => {
      const status = workflowStatuses.find(s => s.id === statusId);
      sortedGroups.push({
        statusId,
        statusName: status?.name || 'Unknown Status',
        position: status?.position || 999,
        orders: orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      });
    });

    return sortedGroups.sort((a, b) => a.position - b.position);
  };

  return (
    <Container maxWidth="xl" className="py-6">
      {/* Real-time Update Status Bar */}
      <Paper sx={{ p: 2, mb: 3, backgroundColor: 'background.default' }}>
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
            
            <Tooltip title="Manual Refresh (Check for ShopMonkey changes)">
              <IconButton 
                onClick={manualRefresh} 
                color="primary" 
                size="small"
                sx={{ 
                  backgroundColor: pendingUpdates.size > 0 ? 'warning.light' : 'transparent',
                  '&:hover': {
                    backgroundColor: pendingUpdates.size > 0 ? 'warning.main' : 'primary.light'
                  }
                }}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            
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

      {/* Update History Dialog */}
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

      <Box className="flex justify-between items-center mb-6">
        <Box>
          <Typography variant="h4" className="font-bold text-gray-800">
            ShopMonkey API Management
          </Typography>
          {isAuthenticated && authToken === SHOPMONKEY_TEST_TOKEN && (
            <Box className="mt-2 space-x-2">
              <Chip 
                label="TEST MODE" 
                color="warning" 
                size="small"
              />
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  setSuccessMessage('');
                  loadApiKeys();
                }}
                className="ml-2"
              >
                Test Token
              </Button>
            </Box>
          )}
        </Box>
        <Box className="flex items-center space-x-2">
          {isAuthenticated && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<BugReportIcon />}
              onClick={toggleDebugOverlay}
              className={debugOverlayVisible ? 'bg-yellow-100' : ''}
            >
              Debug {debugOverlayVisible ? 'ON' : 'OFF'}
            </Button>
          )}
          {isAuthenticated && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<LogoutIcon />}
              onClick={handleLogout}
            >
              Logout
            </Button>
          )}
        </Box>
      </Box>

      {/* Success Message */}
      {successMessage && (
        <Alert severity="success" className="mb-4" onClose={() => setSuccessMessage('')}>
          {successMessage}
        </Alert>
      )}

      {!isAuthenticated ? (
        /* Login Form */
        <Card className="max-w-md mx-auto shadow-lg">
          <CardContent className="p-6">
            <Box className="text-center mb-6">
              <LoginIcon className="text-6xl text-blue-600 mb-4" />
              <Typography variant="h5" className="font-semibold text-gray-700 mb-2">
                Login to ShopMonkey
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Enter your ShopMonkey credentials to access API management
              </Typography>
            </Box>

            {loginError && (
              <Alert severity="error" className="mb-4">
                {loginError}
              </Alert>
            )}

            <Box className="space-y-4">
              <TextField
                label="Email"
                type="email"
                value={loginCredentials.email}
                onChange={(e) => setLoginCredentials(prev => ({ ...prev, email: e.target.value }))}
                fullWidth
                required
                disabled={loggingIn}
              />
              <TextField
                label="Password"
                type="password"
                value={loginCredentials.password}
                onChange={(e) => setLoginCredentials(prev => ({ ...prev, password: e.target.value }))}
                fullWidth
                required
                disabled={loggingIn}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleLogin();
                  }
                }}
              />
              <TextField
                label="Audience"
                value={loginCredentials.audience}
                fullWidth
                disabled
                helperText="Audience is automatically set to 'api'"
              />
              <Button
                variant="contained"
                fullWidth
                onClick={handleLogin}
                disabled={loggingIn || !loginCredentials.email || !loginCredentials.password}
                className="bg-blue-600 hover:bg-blue-700 py-3"
              >
                {loggingIn ? (
                  <>
                    <CircularProgress size={20} className="mr-2" />
                    Logging in...
                  </>
                ) : (
                  'Login to ShopMonkey'
                )}
              </Button>
              
              <Divider className="my-4">or</Divider>
              
              <Button
                variant="outlined"
                fullWidth
                onClick={handleTestLogin}
                disabled={loggingIn}
                className="py-3 border-green-500 text-green-600 hover:bg-green-50"
              >
                Use Test Token
              </Button>
              
              <Alert severity="info" className="mt-4">
                <Typography variant="body2">
                  <strong>Note:</strong> The test token may not have valid ShopMonkey API access. 
                  If you get 401 errors, please use your actual ShopMonkey credentials above.
                </Typography>
              </Alert>
            </Box>
          </CardContent>
        </Card>
      ) : (
        /* Authenticated Content */
        <Box>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="ShopMonkey Tabs">
            <Tab label="Workflow Orders" {...a11yProps(0)} />
            <Tab label="API Keys" {...a11yProps(1)} />
            <Tab label="Workflow Statuses" {...a11yProps(2)} />
            <Tab label="Labels" {...a11yProps(3)} />
            <Tab label="Add Services" {...a11yProps(4)} />
            <Tab label="Debug" {...a11yProps(5)} />
          </Tabs>

          <TabPanel value={activeTab} index={1}>
            {/* API Keys Section */}
            <Card className="mb-8 shadow-lg">
              <CardContent>
                <Box className="flex justify-between items-center mb-4">
                  <Typography variant="h5" className="font-semibold text-gray-700">
                    <KeyIcon className="mr-2" />
                    API Keys
                  </Typography>
                  <Box className="space-x-2">
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<AddIcon />}
                      onClick={() => setCreateKeyDialog(true)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Create API Key
                    </Button>
                    <IconButton
                      onClick={loadApiKeys}
                      disabled={loadingKeys}
                      className="text-gray-600"
                    >
                      <RefreshIcon />
                    </IconButton>
                  </Box>
                </Box>

                {keysError && (
                  <Alert 
                    severity={keysError.includes('ShopMonkey API server error (500)') || keysError.includes('ShopMonkey\'s servers') ? "warning" : "error"} 
                    className="mb-4"
                  >
                    {keysError}
                  </Alert>
                )}

                {loadingKeys ? (
                  <Box className="flex justify-center p-4">
                    <CircularProgress />
                  </Box>
                ) : (
                  <TableContainer component={Paper} className="border rounded-lg">
                    <Table>
                      <TableHead className="bg-gray-50">
                        <TableRow>
                          <TableCell className="font-semibold">Name</TableCell>
                          <TableCell className="font-semibold">Audience</TableCell>
                          <TableCell className="font-semibold">Created</TableCell>
                          <TableCell className="font-semibold">Expires</TableCell>
                          <TableCell className="font-semibold">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {apiKeys.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                              No API keys found
                            </TableCell>
                          </TableRow>
                        ) : (
                          apiKeys.map((key) => (
                            <TableRow key={key.id} className="hover:bg-gray-50">
                              <TableCell className="font-medium">{key.name}</TableCell>
                              <TableCell>
                                <Chip label={key.audience} size="small" color="primary" />
                              </TableCell>
                              <TableCell>{formatDate(key.createdAt)}</TableCell>
                              <TableCell>{formatDate(key.expiresAt)}</TableCell>
                              <TableCell>
                                <IconButton
                                  onClick={() => setDeleteKeyDialog({
                                    open: true,
                                    keyId: key.id,
                                    keyName: key.name
                                  })}
                                  color="error"
                                  size="small"
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          </TabPanel>
          <TabPanel value={activeTab} index={2}>
            {/* Workflow Statuses Section */}
            <Card className="mb-8 shadow-lg">
              <CardContent>
                <Box className="flex justify-between items-center mb-4">
                  <Typography variant="h5" className="font-semibold text-gray-700">
                    <ScheduleIcon className="mr-2" />
                    Workflow Statuses
                  </Typography>
                  <Box className="space-x-2">
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<AddIcon />}
                      onClick={() => {
                        setNewStatusPosition(workflowStatuses.length);
                        setCreateStatusDialog(true);
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Create Status
                    </Button>
                    <IconButton
                      onClick={loadWorkflowStatuses}
                      disabled={loadingStatuses}
                      className="text-gray-600"
                    >
                      <RefreshIcon />
                    </IconButton>
                  </Box>
                </Box>

                {statusesError && (
                  <Alert severity="error" className="mb-4">
                    {statusesError}
                  </Alert>
                )}

                {loadingStatuses ? (
                  <Box className="flex justify-center p-4">
                    <CircularProgress />
                  </Box>
                ) : (
                  <TableContainer component={Paper} className="border rounded-lg">
                    <Table>
                      <TableHead className="bg-gray-50">
                        <TableRow>
                          <TableCell className="font-semibold">Position</TableCell>
                          <TableCell className="font-semibold">Name</TableCell>
                          <TableCell className="font-semibold">Settings</TableCell>
                          <TableCell className="font-semibold">Created</TableCell>
                          <TableCell className="font-semibold">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {workflowStatuses.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                              No workflow statuses found
                            </TableCell>
                          </TableRow>
                        ) : (
                          workflowStatuses.map((status) => (
                            <TableRow key={status.id} className="hover:bg-gray-50 group">
                              <TableCell>
                                <Chip 
                                  label={status.position} 
                                  size="small" 
                                  color="default"
                                  className="font-mono"
                                />
                              </TableCell>
                              <TableCell>
                                {editingStatusId === status.id ? (
                                  <Box className="flex items-center space-x-2">
                                    <TextField
                                      value={editingStatusName}
                                      onChange={(e) => setEditingStatusName(e.target.value)}
                                      size="small"
                                      variant="outlined"
                                      autoFocus
                                      onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                          updateWorkflowStatusName(status.id, editingStatusName);
                                        } else if (e.key === 'Escape') {
                                          cancelEditStatus();
                                        }
                                      }}
                                    />
                                    <IconButton
                                      size="small"
                                      onClick={() => updateWorkflowStatusName(status.id, editingStatusName)}
                                      disabled={updatingStatus}
                                      color="primary"
                                    >
                                      <CheckIcon />
                                    </IconButton>
                                    <IconButton
                                      size="small"
                                      onClick={cancelEditStatus}
                                      disabled={updatingStatus}
                                    >
                                      <CancelIcon />
                                    </IconButton>
                                  </Box>
                                ) : (
                                  <Box className="flex items-center space-x-2">
                                    <Typography variant="body1" className="font-medium">
                                      {status.name || 'Unnamed Status'}
                                    </Typography>
                                    <IconButton
                                      size="small"
                                      onClick={() => handleEditStatus(status)}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </Box>
                                )}
                              </TableCell>
                              <TableCell>
                                <Box className="flex flex-wrap gap-1">
                                  {status.invoiceWorkflow && (
                                    <Chip label="Invoice" size="small" color="primary" />
                                  )}
                                  {status.repairOrderWorkflow && (
                                    <Chip label="Repair Order" size="small" color="secondary" />
                                  )}
                                  {status.archiveWhenInactive && (
                                    <Chip label="Auto Archive" size="small" color="default" />
                                  )}
                                  {status.daysToArchive && (
                                    <Chip 
                                      label={`${status.daysToArchive}d Archive`} 
                                      size="small" 
                                      color="default" 
                                    />
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" color="text.secondary">
                                  {formatDate(status.createdDate)}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Box className="flex space-x-1">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleEditStatus(status)}
                                    color="primary"
                                    title="Edit Name"
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    onClick={() => setDeleteStatusDialog({
                                      open: true,
                                      statusId: status.id,
                                      statusName: status.name || 'Unnamed Status'
                                    })}
                                    color="error"
                                    title="Delete Status"
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Box>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          </TabPanel>
          <TabPanel value={activeTab} index={3}>
            {/* Labels Section */}
            <Card className="mb-8 shadow-lg">
              <CardContent>
                <Box className="flex justify-between items-center mb-4">
                  <Typography variant="h5" className="font-semibold text-gray-700">
                    <LabelIcon className="mr-2" />
                    Labels ({labels.length})
                  </Typography>
                  <Box className="space-x-2">
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<AddIcon />}
                      onClick={() => setCreateLabelDialog(true)}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      Create Label
                    </Button>
                    <IconButton
                      onClick={loadLabels}
                      disabled={loadingLabels}
                      className="text-gray-600"
                    >
                      <RefreshIcon />
                    </IconButton>
                  </Box>
                </Box>

                {labelsError && (
                  <Alert severity="error" className="mb-4">
                    {labelsError}
                  </Alert>
                )}

                {loadingLabels ? (
                  <Box className="flex justify-center p-4">
                    <CircularProgress />
                  </Box>
                ) : (
                  <Box className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {labels.length === 0 ? (
                      <Box className="col-span-full text-center text-gray-500 py-8">
                        No labels found
                      </Box>
                    ) : (
                      labels.map((label) => (
                        <Card key={label.id} variant="outlined" className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <Box className="flex items-center justify-between mb-2">
                              <Chip 
                                label={label.name}
                                color={getColorForLabel(label.color)}
                                size="medium"
                                icon={<TagIcon />}
                                className="font-medium"
                              />
                              <IconButton
                                size="small"
                                onClick={() => setDeleteLabelDialog({
                                  open: true,
                                  labelId: label.id,
                                  labelName: label.name
                                })}
                                color="error"
                                title="Delete Label"
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                            
                            <Box className="space-y-1">
                              <Typography variant="body2" color="text.secondary">
                                <strong>Entity:</strong> {label.entity}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                <strong>Color:</strong> {label.color}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                <strong>Created:</strong> {formatDate(label.createdDate)}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                <strong>ID:</strong> {label.id.substring(0, 8)}...
                              </Typography>
                            </Box>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          </TabPanel>
          <TabPanel value={activeTab} index={0}>
            {/* Workflow Orders Section */}
            <Card className="shadow-lg">
              <CardContent>
                <Box className="flex justify-between items-center mb-4">
                  <Box className="flex items-center space-x-3">
                    <Typography variant="h5" className="font-semibold text-gray-700">
                      <OrderIcon className="mr-2" />
                      Workflow Orders
                    </Typography>
                    {isAuthenticated && authToken ? (
                      <Chip 
                        label="Authenticated" 
                        color="success" 
                        size="small"
                      />
                    ) : (
                      <Chip 
                        label="Not Authenticated" 
                        color="error" 
                        size="small"
                      />
                    )}
                    <IconButton
                      onClick={() => setOilStickerSettingsDialog(true)}
                      size="small"
                      title="Oil Sticker Settings"
                      className="text-gray-600 hover:text-blue-600"
                    >
                      <SettingsIcon />
                    </IconButton>
                  </Box>
                  <Box className="flex items-center space-x-4">
                    <TextField
                      label="Limit"
                      type="number"
                      value={orderLimit}
                      onChange={(e) => handleOrderLimitChange(parseInt(e.target.value) || 10)}
                      inputProps={{ min: 1, max: 1000 }}
                      size="small"
                      className="w-24"
                    />
                    <FormControl size="small" className="w-48">
                      <InputLabel>Filter by Status</InputLabel>
                      <Select
                        value={selectedStatusFilter}
                        onChange={(e) => handleStatusFilterChange(e.target.value)}
                        label="Filter by Status"
                      >
                        <MenuItem value="">
                          <Box className="flex justify-between w-full">
                            <span>All Statuses</span>
                            <Chip size="small" label={getFilteredOrdersByViewMode().length} color="primary" />
                          </Box>
                        </MenuItem>
                        {workflowStatuses.map((status) => {
                          const count = getStatusCounts()[status.id] || 0;
                          return (
                            <MenuItem key={status.id} value={status.id}>
                              <Box className="flex justify-between w-full">
                                <span>{status.name}</span>
                                <Chip size="small" label={count} color={count > 0 ? "success" : "default"} />
                              </Box>
                            </MenuItem>
                          );
                        })}
                      </Select>
                    </FormControl>
                    <Button
                      variant={groupByWorkflow ? 'contained' : 'outlined'}
                      size="small"
                      onClick={() => setGroupByWorkflow(!groupByWorkflow)}
                      disabled={loadingOrders}
                      startIcon={groupByWorkflow ? <CheckIcon /> : <FilterIcon />}
                      className={groupByWorkflow ? 'bg-purple-600 text-white' : ''}
                    >
                      {groupByWorkflow ? 'Grouped' : 'Group by Workflow'}
                    </Button>
                    <IconButton
                      onClick={loadWorkflowOrders}
                      disabled={loadingOrders}
                      className="text-gray-600"
                      title="Refresh Orders (Shows Debug Info)"
                    >
                      <RefreshIcon />
                    </IconButton>
                  </Box>
                </Box>

                {/* View Mode Toggle */}
                <Box className="mb-4">
                  <Typography variant="subtitle2" className="text-gray-600 mb-2">
                    Invoice Status:
                  </Typography>
                  <Box className="flex flex-wrap gap-2 mb-2">
                    {[
                      { key: 'all', label: 'All Orders', icon: '📋' },
                      { key: 'estimates', label: 'Estimates Only', icon: '📝' },
                      { key: 'invoices', label: 'Invoices Only', icon: '💳' }
                    ].map((mode) => {
                      const counts = getViewModeCounts();
                      const count = counts[mode.key as keyof typeof counts];
                      const isSelected = viewMode === mode.key;
                      return (
                        <Button
                          key={mode.key}
                          variant={isSelected ? 'contained' : 'outlined'}
                          size="small"
                          onClick={() => handleViewModeChange(mode.key as 'all' | 'estimates' | 'invoices')}
                          disabled={loadingOrders}
                          className={
                            isSelected 
                              ? mode.key === 'all' ? 'bg-blue-600 text-white' 
                                : mode.key === 'estimates' ? 'bg-orange-600 text-white'
                                : 'bg-green-600 text-white'
                              : count === 0 ? 'opacity-50' : ''
                          }
                          startIcon={isSelected ? <RefreshIcon /> : <span>{mode.icon}</span>}
                        >
                          {mode.label} ({count})
                        </Button>
                      );
                    })}
                  </Box>
                </Box>

                {/* Archive Mode Toggle */}
                <Box className="mb-4">
                  <Typography variant="subtitle2" className="text-gray-600 mb-2">
                    Archive Status:
                  </Typography>
                  <Box className="flex flex-wrap gap-2 mb-4">
                    {[
                      { key: 'all', label: 'All Orders', icon: '📂' },
                      { key: 'active', label: 'Active Only', icon: '🟢' },
                      { key: 'archived', label: 'Archived Only', icon: '📦' }
                    ].map((mode) => {
                      const counts = getArchiveModeCounts();
                      const count = counts[mode.key as keyof typeof counts];
                      const isSelected = archiveMode === mode.key;
                      return (
                        <Button
                          key={mode.key}
                          variant={isSelected ? 'contained' : 'outlined'}
                          size="small"
                          onClick={() => handleArchiveModeChange(mode.key as 'all' | 'active' | 'archived')}
                          disabled={loadingOrders}
                          className={
                            isSelected 
                              ? mode.key === 'all' ? 'bg-blue-600 text-white' 
                                : mode.key === 'active' ? 'bg-green-600 text-white'
                                : 'bg-gray-600 text-white'
                              : count === 0 ? 'opacity-50' : ''
                          }
                          startIcon={isSelected ? <RefreshIcon /> : <span>{mode.icon}</span>}
                        >
                          {mode.label} ({count})
                        </Button>
                      );
                    })}
                  </Box>
                </Box>

                {/* Quick Status Filter Buttons */}
                <Box className="mb-4">
                  <Typography variant="subtitle2" className="text-gray-600 mb-2">
                    Status Filters:
                  </Typography>
                  <Box className="flex flex-wrap gap-2">
                    <Button
                      variant={selectedStatusFilter === '' ? 'contained' : 'outlined'}
                      size="small"
                      onClick={() => handleStatusFilterChange('')}
                      disabled={loadingOrders}
                      className={selectedStatusFilter === '' ? 'bg-blue-600 text-white' : ''}
                      startIcon={selectedStatusFilter === '' ? <RefreshIcon /> : null}
                    >
                      All Orders ({getFilteredOrdersByViewMode().length})
                    </Button>
                    {workflowStatuses
                      .filter(status => ['Drop Off', 'Next To Work On', 'In Progress', 'Complete', 'Ready for Pickup'].includes(status.name))
                      .sort((a, b) => a.position - b.position)
                      .map((status) => {
                        const count = getStatusCounts()[status.id] || 0;
                        const isSelected = selectedStatusFilter === status.id;
                        return (
                          <Button
                            key={status.id}
                            variant={isSelected ? 'contained' : 'outlined'}
                            size="small"
                            onClick={() => handleStatusFilterChange(status.id)}
                            disabled={loadingOrders}
                            className={isSelected ? 'bg-green-600 text-white' : count === 0 ? 'opacity-50' : ''}
                            startIcon={isSelected ? <RefreshIcon /> : null}
                          >
                            {status.name} ({count})
                          </Button>
                        );
                      })}
                    {/* Additional status buttons for other common statuses */}
                    {workflowStatuses
                      .filter(status => !['Drop Off', 'Next To Work On', 'In Progress', 'Complete', 'Ready for Pickup'].includes(status.name))
                      .filter(status => (getStatusCounts()[status.id] || 0) > 0)
                      .sort((a, b) => a.position - b.position)
                      .slice(0, 5) // Show only first 5 other statuses with orders
                      .map((status) => {
                        const count = getStatusCounts()[status.id] || 0;
                        const isSelected = selectedStatusFilter === status.id;
                        return (
                          <Button
                            key={status.id}
                            variant={isSelected ? 'contained' : 'outlined'}
                            size="small"
                            onClick={() => handleStatusFilterChange(status.id)}
                            disabled={loadingOrders}
                            className={isSelected ? 'bg-purple-600 text-white' : ''}
                            startIcon={isSelected ? <RefreshIcon /> : null}
                          >
                            {status.name} ({count})
                          </Button>
                        );
                      })}
                  </Box>
                  
                  {/* Active Filter Indicator */}
                  {(selectedStatusFilter || viewMode !== 'all' || archiveMode !== 'active') && (
                    <Box className="mt-2 flex items-center space-x-2 flex-wrap">
                      {viewMode !== 'all' && (
                        <Chip
                          label={viewMode === 'estimates' ? '📝 Estimates Only' : '💳 Invoices Only'}
                          color={viewMode === 'estimates' ? 'warning' : 'success'}
                          size="small"
                          onDelete={() => handleViewModeChange('all')}
                          deleteIcon={<span>✕</span>}
                        />
                      )}
                      {archiveMode !== 'active' && (
                        <Chip
                          label={archiveMode === 'all' ? '📂 All Archives' : '📦 Archived Only'}
                          color={archiveMode === 'all' ? 'info' : 'default'}
                          size="small"
                          onDelete={() => handleArchiveModeChange('active')}
                          deleteIcon={<span>✕</span>}
                        />
                      )}
                      {selectedStatusFilter && (
                        <Chip
                          label={`Status: ${getWorkflowStatusName(selectedStatusFilter)}`}
                          color="primary"
                          size="small"
                          onDelete={() => handleStatusFilterChange('')}
                          deleteIcon={<span>✕</span>}
                        />
                      )}
                      <Typography variant="caption" color="text.secondary">
                        {workflowOrders.length} order{workflowOrders.length !== 1 ? 's' : ''} found
                      </Typography>
                      {loadingOrders && (
                        <CircularProgress size={16} className="ml-2" />
                      )}
                      {workflowOrders.length > 0 && (
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => {
                            handleViewModeChange('all');
                            handleArchiveModeChange('active');
                            handleStatusFilterChange('');
                          }}
                          className="ml-2"
                        >
                          Clear All Filters
                        </Button>
                      )}
                    </Box>
                  )}
                </Box>

                {/* Bulk Operations */}
                {selectedOrders.length > 0 && (
                  <Card variant="outlined" className="mb-4 bg-blue-50">
                    <CardContent className="py-4">
                      <Typography variant="h6" className="mb-3 text-blue-700">
                        Bulk Operations ({selectedOrders.length} selected)
                      </Typography>
                      
                      {bulkUpdateError && (
                        <Alert severity="error" className="mb-3">
                          {bulkUpdateError}
                        </Alert>
                      )}

                      <Box className="flex items-center space-x-4 flex-wrap">
                        <FormControl size="small" className="min-w-48">
                          <InputLabel>Change Status To</InputLabel>
                          <Select
                            value={bulkStatusId}
                            onChange={(e) => setBulkStatusId(e.target.value)}
                            label="Change Status To"
                          >
                            <MenuItem value="">No Change</MenuItem>
                            {workflowStatuses.map((status) => (
                              <MenuItem key={status.id} value={status.id}>
                                {status.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        
                        <FormControlLabel
                          control={
                            <Switch
                              checked={bulkArchived}
                              onChange={(e) => setBulkArchived(e.target.checked)}
                              color="warning"
                            />
                          }
                          label="Archive Orders"
                        />
                        
                        <Button
                          variant="contained"
                          startIcon={<UpdateIcon />}
                          onClick={handleBulkUpdate}
                          disabled={bulkUpdating || (!bulkStatusId && bulkArchived === false)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {bulkUpdating ? <CircularProgress size={20} /> : 'Update Selected'}
                        </Button>
                        
                        <Button
                          variant="outlined"
                          onClick={() => setSelectedOrders([])}
                          disabled={bulkUpdating}
                        >
                          Clear Selection
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                )}

                {ordersError && (
                  <Alert severity="error" className="mb-4">
                    {ordersError}
                  </Alert>
                )}

                {statusesError && (
                  <Alert severity="warning" className="mb-4">
                    {statusesError}
                  </Alert>
                )}

                {loadingOrders ? (
                  <Box className="flex justify-center p-4">
                    <CircularProgress />
                  </Box>
                ) : groupByWorkflow ? (
                  /* Grouped View - Horizontal Scrollable Columns */
                  <Box>
                    <Box className="mb-3 space-y-1">
                      <Typography variant="caption" color="text.secondary" className="italic">
                        💡 Click any order card to view details • Scroll horizontally to see all workflow statuses
                      </Typography>
                      <Typography variant="caption" color="text.secondary" className="italic">
                        🖨️ For accurate oil sticker printing: Click card to open details, then use "Print Oil Sticker" button
                      </Typography>
                    </Box>
                    <Box 
                      className="flex gap-4 overflow-x-auto pb-4"
                      sx={{ 
                        '&::-webkit-scrollbar': {
                          height: '8px',
                        },
                        '&::-webkit-scrollbar-track': {
                          backgroundColor: '#f1f1f1',
                          borderRadius: '4px',
                        },
                        '&::-webkit-scrollbar-thumb': {
                          backgroundColor: '#c1c1c1',
                          borderRadius: '4px',
                        },
                        '&::-webkit-scrollbar-thumb:hover': {
                          backgroundColor: '#a1a1a1',
                        }
                      }}
                    >
                      {getGroupedOrders().map((group) => (
                        <Box 
                          key={group.statusId} 
                          className="flex-shrink-0 w-80"
                          sx={{ minWidth: '320px', maxWidth: '320px' }}
                        >
                          {/* Column Header */}
                          <Card variant="outlined" className="mb-3 shadow-sm">
                            <Box className="bg-gradient-to-r from-blue-50 to-purple-50 px-3 py-2">
                              <Box className="flex items-center justify-between">
                                <Box className="flex items-center space-x-2">
                                  <Box className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                                    <Typography variant="caption" className="font-bold text-white text-xs">
                                      {group.position}
                                    </Typography>
                                  </Box>
                                  <Box>
                                    <Typography variant="subtitle1" className="font-bold text-gray-800">
                                      {group.statusName}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {group.orders.length} orders • ${(group.orders.reduce((sum, order) => sum + (order.totalCostCents || 0), 0) / 100).toFixed(0)}
                                    </Typography>
                                  </Box>
                                </Box>
                              </Box>
                            </Box>
                          </Card>

                          {/* Scrollable Orders Column */}
                          <Box 
                            className="space-y-2 max-h-96 overflow-y-auto pr-1"
                            sx={{ 
                              '&::-webkit-scrollbar': {
                                width: '4px',
                              },
                              '&::-webkit-scrollbar-track': {
                                backgroundColor: '#f1f1f1',
                                borderRadius: '2px',
                              },
                              '&::-webkit-scrollbar-thumb': {
                                backgroundColor: '#c1c1c1',
                                borderRadius: '2px',
                              }
                            }}
                          >
                            {group.orders.length === 0 ? (
                              <Card variant="outlined" className="p-4 text-center">
                                <Box className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                  <span className="text-lg">📭</span>
                                </Box>
                                <Typography variant="caption" color="text.secondary">
                                  No orders
                                </Typography>
                              </Card>
                            ) : (
                              group.orders.map((order) => (
                                <Card 
                                  key={order.id} 
                                  variant="outlined" 
                                  className={`cursor-pointer hover:shadow-md transition-all duration-200 ${selectedOrders.includes(order.id) ? 'bg-blue-50 border-blue-300' : 'bg-white hover:bg-gray-50'}`}
                                  onClick={() => handleOrderClick(order.id, order.number?.toString() || order.id)}
                                  sx={{ borderRadius: 1, mb: 1 }}
                                >
                                  <Box className="p-2">
                                    {/* Compact Header */}
                                    <Box className="flex justify-between items-center mb-2">
                                      <Box className="flex items-center space-x-2">
                                        <Checkbox
                                          checked={selectedOrders.includes(order.id)}
                                          onChange={(e) => {
                                            e.stopPropagation();
                                            handleOrderSelection(order.id, e.target.checked);
                                          }}
                                          size="small"
                                        />
                                        <Typography variant="subtitle2" className="font-bold">
                                          #{order.number || order.id}
                                        </Typography>
                                      </Box>
                                      {order.totalCostCents && (
                                        <Typography variant="body2" className="font-semibold text-green-600">
                                          ${(order.totalCostCents / 100).toFixed(0)}
                                        </Typography>
                                      )}
                                    </Box>

                                    {/* Status Chips */}
                                    <Box className="flex flex-wrap gap-1 mb-2">
                                      <Chip 
                                        label={order.invoiced ? "Invoice" : "Estimate"} 
                                        size="small" 
                                        color={order.invoiced ? "success" : "warning"}
                                        sx={{ fontSize: '0.7rem', height: '20px' }}
                                      />
                                      {order.paid && (
                                        <Chip 
                                          label="Paid" 
                                          size="small" 
                                          color="success"
                                          variant="outlined"
                                          sx={{ fontSize: '0.7rem', height: '20px' }}
                                        />
                                      )}
                                      {(() => {
                                        const oilType = getOilTypeForDisplay(order);
                                        if (!oilType) return null;
                                        
                                        // Choose appropriate icon based on service type
                                        let icon = '🛢️'; // Default oil icon
                                        let title = `Detected oil type: ${oilType}`;
                                        
                                        if (oilType.toLowerCase().includes('multiple')) {
                                          icon = '🔧';
                                          title = `Multiple services detected - click for details`;
                                        } else if (oilType.toLowerCase().includes('package')) {
                                          icon = '📦';
                                          title = `Service package detected - click for details`;
                                        } else if (oilType.toLowerCase().includes('service')) {
                                          icon = '⚙️';
                                          title = `Service detected: ${oilType}`;
                                        }
                                        
                                        return (
                                          <Chip 
                                            label={`${icon} ${oilType}`}
                                            size="small" 
                                            color={getOilTypeChipColor(oilType)}
                                            variant="outlined"
                                            sx={{ fontSize: '0.7rem', height: '20px' }}
                                            title={title}
                                          />
                                        );
                                      })()}
                                    </Box>
                                    
                                    {/* Compact Customer/Vehicle Info */}
                                    <Box className="space-y-1">
                                      <Typography variant="caption" className="text-gray-600">
                                        👤 {order.customer?.companyName || 
                                             (order.customer ? `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim() : '') || 
                                             order.customerName || 'N/A'}
                                      </Typography>
                                      <Typography variant="caption" className="text-gray-600 block">
                                        🚗 {order.vehicle ? 
                                              `${order.vehicle.year || ''} ${order.vehicle.make || ''} ${order.vehicle.model || ''}`.trim() : 
                                              order.vehicleInfo || 'N/A'}
                                      </Typography>
                                      {/* CoalescedName Services */}
                                      {order.coalescedName && (
                                        <Box className="flex items-center">
                                          {order.coalescedName.toLowerCase().includes('quick check') ? (
                                            <Chip
                                              label={`🔧 ${order.coalescedName}`}
                                              size="small"
                                              color="primary"
                                              clickable
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                // DISABLED: Navigation handled by card click to prevent duplicates
                                                setSuccessMessage('Click the order card to start QuickCheck inspection');
                                              }}
                                              sx={{
                                                fontSize: '0.65rem',
                                                height: '18px',
                                                cursor: 'pointer',
                                                '&:hover': {
                                                  backgroundColor: 'primary.dark',
                                                  transform: 'scale(1.02)',
                                                  transition: 'all 0.2s ease-in-out'
                                                }
                                              }}
                                            />
                                          ) : (
                                            <Typography variant="caption" className="text-gray-600">
                                              🔧 {order.coalescedName}
                                            </Typography>
                                          )}
                                        </Box>
                                      )}
                                    </Box>

                                    {/* Compact Labels */}
                                                                          {getOrderLabels(order).length > 0 && (
                                      <Box className="flex flex-wrap gap-1 mt-2">
                                        {getOrderLabels(order).map((label) => (
                                          <Chip
                                            key={label.id}
                                            label={label.name}
                                            size="small"
                                            color={getColorForLabel(label.color)}
                                            clickable={label.name.toLowerCase() === 'quick check'}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (label.name.toLowerCase() === 'quick check') {
                                                handleQuickCheckLabelClick(order);
                                              }
                                            }}
                                            sx={{
                                              fontSize: '0.65rem',
                                              height: '18px',
                                              cursor: label.name.toLowerCase() === 'quick check' ? 'pointer' : 'default'
                                            }}
                                            icon={label.name.toLowerCase() === 'quick check' ? <span style={{fontSize: '0.7rem'}}>⚡</span> : undefined}
                                          />
                                        ))}
                                      </Box>
                                    )}

                                    {/* Action Buttons */}
                                    <Box className="flex justify-between items-center mt-2">
                                      <Box className="flex space-x-1">
                                        <IconButton
                                          size="small"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            printOilSticker(order);
                                          }}
                                          disabled={printingSticker === order.id}
                                          title={(() => {
                                            const vin = order.vehicle?.vin;
                                            const isDecoded = vin && vin.length === 17 && preDecodedVins[vin];
                                            const isDecoding = vin && vin.length === 17 && decodingVins.has(vin);
                                            
                                            if (printingSticker === order.id) return "Creating oil sticker...";
                                            if (isDecoded) return "⚡ VIN pre-decoded - Instant oil sticker creation!";
                                            if (isDecoding) return "🔍 VIN being decoded - will be instant soon...";
                                            if (vin && vin.length === 17) return "🔧 VIN available - will decode during creation";
                                            return "⚠️ No VIN available - limited sticker info";
                                          })()}
                                          className={(() => {
                                            if (!findOilTypeFromServices(order)) return 'text-gray-400';
                                            
                                            const vin = order.vehicle?.vin;
                                            const isDecoded = vin && vin.length === 17 && preDecodedVins[vin];
                                            const isDecoding = vin && vin.length === 17 && decodingVins.has(vin);
                                            
                                            if (isDecoded) return 'text-green-500'; // Green for instant creation
                                            if (isDecoding) return 'text-blue-500'; // Blue for decoding in progress
                                            return 'text-orange-500'; // Orange for standard creation
                                          })()}
                                          sx={{ padding: '2px' }}
                                        >
                                          {printingSticker === order.id ? (
                                            <CircularProgress size={14} />
                                          ) : (() => {
                                            const vin = order.vehicle?.vin;
                                            const isDecoded = vin && vin.length === 17 && preDecodedVins[vin];
                                            const isDecoding = vin && vin.length === 17 && decodingVins.has(vin);
                                            
                                            if (isDecoded) {
                                              return <span style={{ fontSize: '14px' }}>⚡</span>; // Lightning for instant
                                            }
                                            if (isDecoding) {
                                              return <span style={{ fontSize: '14px' }}>🔍</span>; // Magnifying glass for decoding
                                            }
                                            return <OilChangeIcon sx={{ fontSize: '14px' }} />; // Regular oil icon
                                          })()}
                                        </IconButton>
                                        <IconButton
                                          size="small"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOrderInfoClick(order);
                                          }}
                                          title="View Order Info & Debug Log"
                                          className="text-blue-500"
                                          sx={{ padding: '2px' }}
                                        >
                                          <InfoIcon sx={{ fontSize: '14px' }} />
                                        </IconButton>
                                      </Box>
                                    </Box>
                                  </Box>
                                </Card>
                              ))
                            )}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                ) : (
                  /* Flat Table View */
                  <>
                    <Box className="mb-2 space-y-1">
                      <Typography variant="caption" color="text.secondary" className="italic">
                        💡 Click any row to view order details
                      </Typography>
                      <Typography variant="caption" color="text.secondary" className="italic">
                        🖨️ For oil stickers: Click row to open details, then use "Print Oil Sticker" button (better service matching)
                      </Typography>
                    </Box>
                    <TableContainer component={Paper} className="border rounded-lg">
                    <Table>
                      <TableHead className="bg-gray-50">
                        <TableRow>
                          <TableCell padding="checkbox">
                            <Checkbox
                              indeterminate={selectedOrders.length > 0 && selectedOrders.length < workflowOrders.length}
                              checked={workflowOrders.length > 0 && selectedOrders.length === workflowOrders.length}
                              onChange={(e) => handleSelectAllOrders(e.target.checked)}
                            />
                          </TableCell>
                          <TableCell className="font-semibold">Order Number</TableCell>
                          <TableCell className="font-semibold">Status & Labels</TableCell>
                          <TableCell className="font-semibold">Customer</TableCell>
                          <TableCell className="font-semibold">Vehicle</TableCell>
                          <TableCell className="font-semibold">Created</TableCell>
                          <TableCell className="font-semibold">Updated</TableCell>
                          <TableCell className="font-semibold">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {workflowOrders.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                              No workflow orders found
                            </TableCell>
                          </TableRow>
                        ) : (
                          workflowOrders.map((order) => (
                            <TableRow 
                              key={order.id} 
                              className={`hover:bg-blue-50 cursor-pointer transition-colors ${selectedOrders.includes(order.id) ? 'bg-blue-100' : ''}`}
                              onClick={() => handleOrderClick(order.id, order.number?.toString() || order.id)}
                              title="Click to view order details"
                            >
                              <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                  checked={selectedOrders.includes(order.id)}
                                  onChange={(e) => handleOrderSelection(order.id, e.target.checked)}
                                />
                              </TableCell>
                              <TableCell className="font-medium">
                                <Box className="flex flex-col">
                                  <Typography variant="body2" className="font-semibold">
                                    #{order.number || order.id}
                                  </Typography>
                                  {order.totalCostCents && (
                                    <Typography variant="caption" color="text.secondary">
                                      ${(order.totalCostCents / 100).toFixed(2)}
                                    </Typography>
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Box className="flex flex-col space-y-1">
                                  <Chip 
                                    label={getWorkflowStatusName(order.workflowStatusId || order.status)} 
                                    size="small" 
                                    color={order.paid ? 'success' : order.authorized ? 'info' : 'default'}
                                  />
                                  {order.archived && (
                                    <Chip 
                                      label="Archived" 
                                      size="small" 
                                      color="warning"
                                      icon={<ArchiveIcon />}
                                    />
                                  )}
                                  {order.paid && (
                                    <Chip 
                                      label="Paid" 
                                      size="small" 
                                      color="success"
                                      icon={<CheckCircleIcon />}
                                    />
                                  )}
                                  <Chip 
                                    label={order.invoiced ? "💳 Invoice" : "📝 Estimate"} 
                                    size="small" 
                                    color={order.invoiced ? "success" : "warning"}
                                  />
                                  {/* Oil Type Chip */}
                                  {(() => {
                                    const oilType = getOilTypeForDisplay(order);
                                    if (!oilType) return null;
                                    
                                    // Choose appropriate icon based on service type
                                    let icon = '🛢️'; // Default oil icon
                                    let title = `Detected oil type: ${oilType}`;
                                    
                                    if (oilType.toLowerCase().includes('multiple')) {
                                      icon = '🔧';
                                      title = `Multiple services detected - click for details`;
                                    } else if (oilType.toLowerCase().includes('package')) {
                                      icon = '📦';
                                      title = `Service package detected - click for details`;
                                    } else if (oilType.toLowerCase().includes('service')) {
                                      icon = '⚙️';
                                      title = `Service detected: ${oilType}`;
                                    }
                                    
                                    return (
                                      <Chip 
                                        label={`${icon} ${oilType}`}
                                        size="small" 
                                        color={getOilTypeChipColor(oilType)}
                                        variant="outlined"
                                        title={title}
                                      />
                                    );
                                  })()}
                                  {/* Labels */}
                                  {getOrderLabels(order).length > 0 && (
                                    <Box className="flex flex-wrap gap-1 mt-1">
                                      {getOrderLabels(order).map((label, index) => (
                                        <Chip
                                          key={label.id}
                                          label={label.name}
                                          size="small"
                                          color={getColorForLabel(label.color)}
                                          clickable={label.name.toLowerCase() === 'quick check'}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (label.name.toLowerCase() === 'quick check') {
                                              handleQuickCheckLabelClick(order);
                                            }
                                          }}
                                          style={{
                                            fontSize: '0.7rem',
                                            height: '20px',
                                            cursor: label.name.toLowerCase() === 'quick check' ? 'pointer' : 'default'
                                          }}
                                        />
                                      ))}
                                    </Box>
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Box className="flex flex-col space-y-1">
                                  <Typography variant="body2" className="font-medium">
                                    {order.customer?.companyName || 
                                     (order.customer ? `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim() : '') || 
                                     order.customerName || 'N/A'}
                                  </Typography>
                                  {order.customer?.emails?.find(e => e.primary)?.email && (
                                    <Typography variant="caption" color="text.secondary">
                                      📧 {order.customer.emails.find(e => e.primary)?.email}
                                    </Typography>
                                  )}
                                  {order.customer?.phoneNumbers?.find(p => p.primary)?.number && (
                                    <Typography variant="caption" color="text.secondary">
                                      📞 {order.customer.phoneNumbers.find(p => p.primary)?.number}
                                    </Typography>
                                  )}
                                  {order.customer?.city && order.customer?.state && (
                                    <Typography variant="caption" color="text.secondary">
                                      📍 {order.customer.city}, {order.customer.state}
                                    </Typography>
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Box className="flex flex-col space-y-1">
                                  <Typography variant="body2" className="font-medium">
                                    {order.vehicle ? 
                                      `${order.vehicle.year || ''} ${order.vehicle.make || ''} ${order.vehicle.model || ''}`.trim() : 
                                      order.vehicleInfo || 'N/A'}
                                  </Typography>
                                  {order.coalescedName && (
                                    <Box className="mb-1">
                                      {order.coalescedName.toLowerCase().includes('quick check') ? (
                                        <Chip
                                          label={`🔧 ${order.coalescedName}`}
                                          size="small"
                                          color="primary"
                                          clickable
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            // DISABLED: Navigation handled by card click to prevent duplicates
                                            setSuccessMessage('Click the order card to start QuickCheck inspection');
                                          }}
                                          sx={{
                                            fontSize: '0.7rem',
                                            height: '22px',
                                            cursor: 'pointer',
                                            '&:hover': {
                                              backgroundColor: 'primary.dark',
                                              transform: 'scale(1.02)',
                                              transition: 'all 0.2s ease-in-out'
                                            }
                                          }}
                                        />
                                      ) : (
                                        <Typography variant="caption" color="text.secondary">
                                          🔧 {order.coalescedName}
                                        </Typography>
                                      )}
                                    </Box>
                                  )}
                                  {order.vehicle?.licensePlate && (
                                    <Typography variant="caption" color="text.secondary">
                                      🪪 {order.vehicle.licensePlate} {order.vehicle.licensePlateState && `(${order.vehicle.licensePlateState})`}
                                    </Typography>
                                  )}
                                  {order.vehicle?.vin && (
                                    <Typography variant="caption" color="text.secondary" className="font-mono">
                                      VIN: {order.vehicle.vin.substring(0, 8)}...
                                    </Typography>
                                  )}
                                  {order.vehicle?.mileage && (
                                    <Typography variant="caption" color="text.secondary">
                                      🛣️ {order.vehicle.mileage.toLocaleString()} {order.vehicle.mileageUnit || 'miles'}
                                    </Typography>
                                  )}
                                  {order.vehicle?.color && (
                                    <Typography variant="caption" color="text.secondary">
                                      🎨 {order.vehicle.color}
                                    </Typography>
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell>{formatDate(order.createdAt)}</TableCell>
                              <TableCell>{formatDate(order.updatedAt)}</TableCell>
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <Box className="flex space-x-1">
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    title="Print Oil Sticker (Basic - for better results, click row to open details)"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      printOilSticker(order);
                                    }}
                                    disabled={printingSticker === order.id}
                                    className={findOilTypeFromServices(order) ? 'text-orange-500' : 'text-gray-400'}
                                  >
                                    {printingSticker === order.id ? (
                                      <CircularProgress size={16} />
                                    ) : (
                                      <OilChangeIcon fontSize="small" />
                                    )}
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    title="Assign Labels"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setAssignLabelDialog({
                                        open: true,
                                        orderId: order.id,
                                        orderNumber: order.number?.toString() || order.id
                                      });
                                    }}
                                  >
                                    <LabelIcon fontSize="small" />
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    color="info"
                                    title="View Order Info & Debug Log"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOrderInfoClick(order);
                                    }}
                                  >
                                    <span style={{ fontSize: '12px' }}>ℹ️</span>
                                  </IconButton>
                                  <IconButton
                                    size="small"
                                    color={order.archived ? 'success' : 'warning'}
                                    title={order.archived ? 'Unarchive' : 'Archive'}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {order.archived ? <UnarchiveIcon /> : <ArchiveIcon />}
                                  </IconButton>
                                </Box>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  </>
                )}
              </CardContent>
            </Card>
          </TabPanel>
          
          <TabPanel value={activeTab} index={4}>
            {/* Add Services Section */}
            <Card className="mb-8 shadow-lg">
              <CardContent>
                <Box className="flex justify-between items-center mb-4">
                  <Typography variant="h5" className="font-semibold text-gray-700">
                    <ServiceIcon className="mr-2" />
                    Add Services to Orders
                  </Typography>
                  <Box className="space-x-2">
                    <TextField
                      label="Service Limit"
                      type="number"
                      value={serviceLimit}
                      onChange={(e) => setServiceLimit(Math.max(1, Math.min(100, parseInt(e.target.value) || 50)))}
                      size="small"
                      style={{ width: '120px' }}
                      inputProps={{ min: 1, max: 100 }}
                    />
                    <IconButton
                      onClick={loadCannedServices}
                      disabled={loadingServices}
                      className="text-gray-600"
                    >
                      <RefreshIcon />
                    </IconButton>
                  </Box>
                </Box>

                {/* Success/Error Messages */}
                {addServiceSuccess && (
                  <Alert severity="success" className="mb-4" onClose={() => setAddServiceSuccess('')}>
                    {addServiceSuccess}
                  </Alert>
                )}
                {addServiceError && (
                  <Alert severity="error" className="mb-4" onClose={() => setAddServiceError('')}>
                    {addServiceError}
                  </Alert>
                )}
                {servicesError && (
                  <Alert severity="error" className="mb-4">
                    {servicesError}
                  </Alert>
                )}

                {/* Add Service Form */}
                <Card variant="outlined" className="mb-6">
                  <CardContent>
                    <Typography variant="h6" className="mb-4 font-semibold">
                      Add Service to Order
                    </Typography>
                    
                    <Box className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {/* Order Selection */}
                      <FormControl fullWidth>
                        <InputLabel>Select Order</InputLabel>
                        <Select
                          value={addServiceForm.selectedOrderId}
                          onChange={(e) => setAddServiceForm(prev => ({ ...prev, selectedOrderId: e.target.value }))}
                          label="Select Order"
                          disabled={loadingOrders}
                        >
                          {activeOrders.map((order) => (
                            <MenuItem key={order.id} value={order.id}>
                              #{order.number || order.id} - {order.customer?.companyName || 
                                (order.customer ? `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim() : '') || 
                                order.customerName || 'N/A'}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      {/* Service Search */}
                      <TextField
                        label="Search Services"
                        value={serviceSearchQuery}
                        onChange={(e) => setServiceSearchQuery(e.target.value)}
                        placeholder="Search by name, description, or category..."
                        InputProps={{
                          startAdornment: <SearchIcon className="mr-2 text-gray-400" />
                        }}
                      />
                    </Box>

                    <Box className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {/* Service Selection */}
                      <FormControl fullWidth>
                        <InputLabel>Select Service</InputLabel>
                        <Select
                          value={addServiceForm.selectedServiceId}
                          onChange={(e) => setAddServiceForm(prev => ({ ...prev, selectedServiceId: e.target.value }))}
                          label="Select Service"
                          disabled={loadingServices}
                        >
                          {(Array.isArray(filteredServices) ? filteredServices : []).map((service) => (
                            <MenuItem key={service.id} value={service.id}>
                              <Box className="flex justify-between items-center w-full">
                                <span>{service.name}</span>
                                {service.retailCostCents && (
                                  <Chip 
                                    label={`$${(service.retailCostCents / 100).toFixed(2)}`} 
                                    size="small" 
                                    color="primary"
                                  />
                                )}
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      {/* Quantity */}
                      <TextField
                        label="Quantity"
                        type="number"
                        value={addServiceForm.quantity}
                        onChange={(e) => setAddServiceForm(prev => ({ ...prev, quantity: Math.max(1, parseInt(e.target.value) || 1) }))}
                        inputProps={{ min: 1 }}
                      />
                    </Box>

                    <Box className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {/* Price Override */}
                      <TextField
                        label="Price Override (per unit)"
                        type="number"
                        value={addServiceForm.priceOverride || ''}
                        onChange={(e) => setAddServiceForm(prev => ({ ...prev, priceOverride: parseFloat(e.target.value) || 0 }))}
                        placeholder="Leave empty to use service price"
                        InputProps={{
                          startAdornment: <MoneyIcon className="mr-1 text-gray-400" />
                        }}
                        helperText="Override the default service price"
                      />

                      {/* Total Calculation Display */}
                      <Box className="flex items-center">
                        {addServiceForm.selectedServiceId && addServiceForm.quantity > 0 && (
                          <Card variant="outlined" className="p-3 w-full bg-blue-50">
                            <Typography variant="body2" color="text.secondary">
                              Total Price
                            </Typography>
                            <Typography variant="h6" className="font-bold text-blue-600">
                              ${(() => {
                                const selectedService = Array.isArray(cannedServices) ? cannedServices.find(s => s.id === addServiceForm.selectedServiceId) : null;
                                if (!selectedService) return '0.00';
                                const pricePerUnit = addServiceForm.priceOverride > 0 
                                  ? addServiceForm.priceOverride 
                                  : (selectedService.retailCostCents || 0) / 100;
                                return (pricePerUnit * addServiceForm.quantity).toFixed(2);
                              })()}
                            </Typography>
                          </Card>
                        )}
                      </Box>
                    </Box>

                    {/* Notes */}
                    <TextField
                      label="Notes (Optional)"
                      value={addServiceForm.notes}
                      onChange={(e) => setAddServiceForm(prev => ({ ...prev, notes: e.target.value }))}
                      multiline
                      rows={2}
                      fullWidth
                      placeholder="Add any notes for this service..."
                      className="mb-4"
                    />

                    {/* Add Service Button */}
                    <Button
                      variant="contained"
                      onClick={addServiceToOrder}
                      disabled={addingService || !addServiceForm.selectedOrderId || !addServiceForm.selectedServiceId}
                      startIcon={addingService ? <CircularProgress size={20} /> : <AddIcon />}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {addingService ? 'Adding Service...' : 'Add Service to Order'}
                    </Button>
                  </CardContent>
                </Card>

                {/* Available Services List */}
                <Typography variant="h6" className="mb-4 font-semibold">
                  Available Services ({Array.isArray(filteredServices) ? filteredServices.length : 0})
                </Typography>
                {loadingServices ? (
                  <Box className="flex justify-center p-4">
                    <CircularProgress />
                  </Box>
                ) : (
                  <TableContainer component={Paper} className="border rounded-lg">
                    <Table>
                      <TableHead className="bg-gray-50">
                        <TableRow>
                          <TableCell className="font-semibold">Name</TableCell>
                          <TableCell className="font-semibold">Description</TableCell>
                          <TableCell className="font-semibold">Category</TableCell>
                          <TableCell className="font-semibold">Price</TableCell>
                          <TableCell className="font-semibold">Labor Hours</TableCell>
                          <TableCell className="font-semibold">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(!Array.isArray(filteredServices) || filteredServices.length === 0) ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                              {serviceSearchQuery ? 'No services match your search' : 'No services found'}
                            </TableCell>
                          </TableRow>
                        ) : (
                          (Array.isArray(filteredServices) ? filteredServices : []).map((service) => (
                            <TableRow key={service.id} className="hover:bg-gray-50">
                              <TableCell className="font-medium">{service.name}</TableCell>
                              <TableCell>
                                <Typography variant="body2" className="text-gray-600">
                                  {service.description || 'No description'}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                {service.category && (
                                  <Chip label={service.category} size="small" color="secondary" />
                                )}
                              </TableCell>
                              <TableCell>
                                {service.retailCostCents ? (
                                  <Typography variant="body2" className="font-semibold text-green-600">
                                    ${(service.retailCostCents / 100).toFixed(2)}
                                  </Typography>
                                ) : (
                                  <Typography variant="body2" color="text.secondary">
                                    No price set
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell>
                                {service.laborHours ? (
                                  <Typography variant="body2">
                                    {service.laborHours} hrs
                                  </Typography>
                                ) : (
                                  <Typography variant="body2" color="text.secondary">
                                    N/A
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => setAddServiceForm(prev => ({ 
                                    ...prev, 
                                    selectedServiceId: service.id 
                                  }))}
                                  startIcon={<AddIcon />}
                                >
                                  Select
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          </TabPanel>

          <TabPanel value={activeTab} index={5}>
            {/* Debug Panel */}
            <Box className="p-4 bg-white rounded-lg shadow-md">
              <Box className="flex justify-between items-center mb-4">
                <Typography variant="h6" className="font-semibold">
                  Debug Information
                </Typography>
                <IconButton onClick={toggleDebugOverlay}>
                  <BugReportIcon />
                </IconButton>
              </Box>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
                {debugInfo}
              </pre>
            </Box>
          </TabPanel>
        </Box>
      )}

      {/* All Dialogs */}

      {/* Create API Key Dialog */}
      <Dialog 
        open={createKeyDialog} 
        onClose={() => setCreateKeyDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New API Key</DialogTitle>
        <DialogContent>
          <Box className="space-y-4 pt-2">
            <TextField
              label="API Key Name"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              fullWidth
              required
              helperText="Enter a descriptive name for this API key"
            />
            <TextField
              label="Expiration (Days)"
              type="number"
              value={newKeyExpiration}
              onChange={(e) => setNewKeyExpiration(parseInt(e.target.value) || 30)}
              fullWidth
              inputProps={{ min: 1, max: 365 }}
              helperText="Number of days until the key expires (1-365)"
            />
            <TextField
              label="Audience"
              value="api"
              fullWidth
              disabled
              helperText="Audience is automatically set to 'api'"
            />
          </Box>
        </DialogContent>
        <DialogActions className="p-4">
          <Button onClick={() => setCreateKeyDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={createApiKey}
            variant="contained"
            disabled={creatingKey || !newKeyName.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {creatingKey ? <CircularProgress size={20} /> : 'Create Key'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete API Key Dialog */}
      <Dialog 
        open={deleteKeyDialog.open} 
        onClose={() => setDeleteKeyDialog({ open: false, keyId: '', keyName: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete API Key</DialogTitle>
        <DialogContent>
          <Box className="space-y-4 pt-2">
            <Typography>
              Are you sure you want to delete the API key "{deleteKeyDialog.keyName}"?
            </Typography>
            <TextField
              label="Reason for deletion"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              fullWidth
              required
              multiline
              rows={3}
              helperText="Please provide a reason for deleting this API key"
            />
          </Box>
        </DialogContent>
        <DialogActions className="p-4">
          <Button onClick={() => setDeleteKeyDialog({ open: false, keyId: '', keyName: '' })}>
            Cancel
          </Button>
          <Button
            onClick={deleteApiKey}
            variant="contained"
            color="error"
            disabled={deletingKey || !deleteReason.trim()}
          >
            {deletingKey ? <CircularProgress size={20} /> : 'Delete Key'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Workflow Status Dialog */}
      <Dialog 
        open={createStatusDialog} 
        onClose={() => setCreateStatusDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Workflow Status</DialogTitle>
        <DialogContent>
          <Box className="space-y-4 pt-2">
            <TextField
              label="Status Name"
              value={newStatusName}
              onChange={(e) => setNewStatusName(e.target.value)}
              fullWidth
              required
              helperText="Enter a descriptive name for this workflow status"
            />
            <TextField
              label="Position"
              type="number"
              value={newStatusPosition}
              onChange={(e) => setNewStatusPosition(parseInt(e.target.value) || 0)}
              fullWidth
              inputProps={{ min: 0 }}
              helperText="Position in the workflow (0 = first)"
            />
            <Alert severity="info">
              <Typography variant="body2">
                New workflow status will be created with default settings:
                • Invoice Workflow: Enabled
                • Repair Order Workflow: Enabled  
                • Days to Archive: 30
                • Auto Archive: Disabled
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions className="p-4">
          <Button onClick={() => setCreateStatusDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={createWorkflowStatus}
            variant="contained"
            disabled={creatingStatus || !newStatusName.trim()}
            className="bg-green-600 hover:bg-green-700"
          >
            {creatingStatus ? <CircularProgress size={20} /> : 'Create Status'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Workflow Status Dialog */}
      <Dialog 
        open={deleteStatusDialog.open} 
        onClose={() => setDeleteStatusDialog({ open: false, statusId: '', statusName: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Workflow Status</DialogTitle>
        <DialogContent>
          <Box className="space-y-4 pt-2">
            <Alert severity="warning">
              <Typography variant="body1">
                Are you sure you want to delete the workflow status "{deleteStatusDialog.statusName}"?
              </Typography>
            </Alert>
            
            <Typography variant="body2" color="text.secondary">
              When deleting a workflow status, any orders currently using this status should be moved to another status.
            </Typography>

            <FormControl fullWidth>
              <InputLabel>Move existing orders to (optional)</InputLabel>
              <Select
                value={moveToStatusId}
                onChange={(e) => setMoveToStatusId(e.target.value)}
                label="Move existing orders to (optional)"
              >
                <MenuItem value="">Don't move orders</MenuItem>
                {workflowStatuses
                  .filter(status => status.id !== deleteStatusDialog.statusId)
                  .map((status) => (
                    <MenuItem key={status.id} value={status.id}>
                      {status.name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions className="p-4">
          <Button onClick={() => setDeleteStatusDialog({ open: false, statusId: '', statusName: '' })}>
            Cancel
          </Button>
          <Button
            onClick={deleteWorkflowStatus}
            variant="contained"
            color="error"
            disabled={deletingStatus}
          >
            {deletingStatus ? <CircularProgress size={20} /> : 'Delete Status'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Label Dialog */}
      <Dialog 
        open={createLabelDialog} 
        onClose={() => setCreateLabelDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Label</DialogTitle>
        <DialogContent>
          <Box className="space-y-4 pt-2">
            <TextField
              label="Label Name"
              value={newLabelName}
              onChange={(e) => setNewLabelName(e.target.value)}
              fullWidth
              required
              helperText="Enter a descriptive name for this label"
            />
            <FormControl fullWidth>
              <InputLabel>Color</InputLabel>
              <Select
                value={newLabelColor}
                onChange={(e) => setNewLabelColor(e.target.value as any)}
                label="Color"
              >
                <MenuItem value="blue">🔵 Blue</MenuItem>
                <MenuItem value="red">🔴 Red</MenuItem>
                <MenuItem value="green">🟢 Green</MenuItem>
                <MenuItem value="yellow">🟡 Yellow</MenuItem>
                <MenuItem value="orange">🟠 Orange</MenuItem>
                <MenuItem value="purple">🟣 Purple</MenuItem>
                <MenuItem value="aqua">🔵 Aqua</MenuItem>
                <MenuItem value="gray">⚫ Gray</MenuItem>
                <MenuItem value="brown">🟤 Brown</MenuItem>
                <MenuItem value="black">⚫ Black</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Entity Type</InputLabel>
              <Select
                value={newLabelEntity}
                onChange={(e) => setNewLabelEntity(e.target.value as any)}
                label="Entity Type"
              >
                <MenuItem value="Order">Order</MenuItem>
                <MenuItem value="Customer">Customer</MenuItem>
                <MenuItem value="Vehicle">Vehicle</MenuItem>
                <MenuItem value="Part">Part</MenuItem>
                <MenuItem value="Service">Service</MenuItem>
                <MenuItem value="Labor">Labor</MenuItem>
                <MenuItem value="Fee">Fee</MenuItem>
                <MenuItem value="Subcontract">Subcontract</MenuItem>
              </Select>
            </FormControl>
            <Alert severity="info">
              <Typography variant="body2">
                Labels can be used to categorize and organize different entities in ShopMonkey. 
                Choose the entity type this label will primarily be used for.
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions className="p-4">
          <Button onClick={() => setCreateLabelDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={createLabel}
            variant="contained"
            disabled={creatingLabel || !newLabelName.trim()}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {creatingLabel ? <CircularProgress size={20} /> : 'Create Label'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Label Dialog */}
      <Dialog 
        open={assignLabelDialog.open} 
        onClose={() => setAssignLabelDialog({ open: false, orderId: '', orderNumber: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Assign Label to Order #{assignLabelDialog.orderNumber}</DialogTitle>
        <DialogContent>
          <Box className="space-y-4 pt-2">
            <Typography variant="body2" color="text.secondary">
              Select a label to assign to this work order. Labels help categorize and organize orders for easier management.
            </Typography>
            
            <FormControl fullWidth>
              <InputLabel>Select Label</InputLabel>
              <Select
                value={selectedLabelToAssign}
                onChange={(e) => setSelectedLabelToAssign(e.target.value)}
                label="Select Label"
              >
                <MenuItem value="">Choose a label...</MenuItem>
                {labels
                  .filter(label => label.entity === 'Order' || !label.entity)
                  .map((label) => (
                    <MenuItem key={label.id} value={label.id}>
                      <Box className="flex items-center space-x-2">
                        <Chip 
                          label={label.name}
                          color={getColorForLabel(label.color)}
                          size="small"
                        />
                        <Typography variant="body2" color="text.secondary">
                          ({label.color})
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            {labels.filter(label => label.entity === 'Order' || !label.entity).length === 0 && (
              <Alert severity="warning">
                No labels available for Orders. Create a label with entity type "Order" first.
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions className="p-4">
          <Button onClick={() => setAssignLabelDialog({ open: false, orderId: '', orderNumber: '' })}>
            Cancel
          </Button>
          <Button
            onClick={assignLabelToOrder}
            variant="contained"
            disabled={assigningLabel || !selectedLabelToAssign}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {assigningLabel ? <CircularProgress size={20} /> : 'Assign Label'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Label Dialog */}
      <Dialog 
        open={deleteLabelDialog.open} 
        onClose={() => setDeleteLabelDialog({ open: false, labelId: '', labelName: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Label</DialogTitle>
        <DialogContent>
          <Box className="space-y-4 pt-2">
            <Alert severity="warning">
              <Typography variant="body1">
                Are you sure you want to delete the label "{deleteLabelDialog.labelName}"?
              </Typography>
            </Alert>
            
            <Typography variant="body2" color="text.secondary">
              Deleting this label will remove it from all entities it's currently assigned to. 
              This action cannot be undone.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions className="p-4">
          <Button onClick={() => setDeleteLabelDialog({ open: false, labelId: '', labelName: '' })}>
            Cancel
          </Button>
          <Button
            onClick={deleteLabel}
            variant="contained"
            color="error"
            disabled={deletingLabel}
          >
            {deletingLabel ? <CircularProgress size={20} /> : 'Delete Label'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Order Details Dialog */}
      <Dialog
        open={orderDetailsDialog.open}
        onClose={closeOrderDetailsDialog}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { height: '90vh' }
        }}
      >
        <DialogTitle>
          <Box className="flex justify-between items-center">
            <Typography variant="h5">
              📋 Order Details #{orderDetailsDialog.orderNumber}
            </Typography>
            <IconButton onClick={closeOrderDetailsDialog}>
              <CancelIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers className="p-0">
          {loadingOrderDetails ? (
            <Box className="flex justify-center items-center py-8">
              <CircularProgress />
              <Typography className="ml-4">Loading order details...</Typography>
            </Box>
          ) : orderDetailsError ? (
            <Box className="p-6">
              <Alert severity="error">
                <Typography variant="h6">Failed to load order details</Typography>
                <Typography>{orderDetailsError}</Typography>
              </Alert>
            </Box>
          ) : orderDetails ? (
            <Box className="p-6 space-y-6">
              {/* Order Summary */}
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" className="mb-4 flex items-center">
                    📄 Order Summary
                  </Typography>
                  <Box className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">Order Number</Typography>
                      <Typography variant="body1" className="font-medium">#{orderDetails.number || 'N/A'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                      <Chip 
                        label={orderDetails.workflowStatus?.name || 'Unknown'} 
                        color={orderDetails.paid ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>
                    {orderDetails.coalescedName && (
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">Services</Typography>
                        {orderDetails.coalescedName.toLowerCase().includes('quick check') ? (
                          <Chip
                            label={orderDetails.coalescedName}
                            color="primary"
                            size="small"
                            clickable
                            onClick={(e) => {
                              e.stopPropagation();
                              const vin = orderDetails.vehicle?.vin;
                              const mileage = orderDetails.vehicle?.mileage;
                              
                              if (vin) {
                                // Build URL parameters
                                const params = new URLSearchParams();
                                params.set('vin', vin);
                                if (mileage) {
                                  params.set('mileage', mileage.toString());
                                }
                                navigate(`/quick-check?${params.toString()}`);
                              } else {
                                setSuccessMessage('No VIN available for this order - cannot start Quick Check');
                              }
                            }}
                            sx={{
                              cursor: 'pointer',
                              '&:hover': {
                                backgroundColor: 'primary.dark',
                                transform: 'scale(1.02)',
                                transition: 'all 0.2s ease-in-out'
                              }
                            }}
                          />
                        ) : (
                          <Typography variant="body1" className="font-medium">{orderDetails.coalescedName}</Typography>
                        )}
                      </Box>
                    )}
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">Total Cost</Typography>
                      <Typography variant="body1" className="font-medium">
                        ${((orderDetails.totalCostCents || 0) / 100).toFixed(2)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">Created Date</Typography>
                      <Typography variant="body1">{orderDetails.createdDate ? formatDate(orderDetails.createdDate) : 'N/A'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">Due Date</Typography>
                      <Typography variant="body1">{orderDetails.dueDate ? formatDate(orderDetails.dueDate) : 'Not set'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">Completed Date</Typography>
                      <Typography variant="body1">{orderDetails.completedDate ? formatDate(orderDetails.completedDate) : 'Not completed'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">Authorization Status</Typography>
                      <Chip 
                        label={orderDetails.authorized ? 'Authorized' : 'Not Authorized'} 
                        color={orderDetails.authorized ? 'success' : 'warning'}
                        size="small"
                      />
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">Payment Status</Typography>
                      <Chip 
                        label={orderDetails.paid ? 'Paid' : 'Unpaid'} 
                        color={orderDetails.paid ? 'success' : 'error'}
                        size="small"
                      />
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">Invoice Status</Typography>
                      <Chip 
                        label={orderDetails.invoiced ? 'Invoiced' : 'Not Invoiced'} 
                        color={orderDetails.invoiced ? 'info' : 'default'}
                        size="small"
                      />
                    </Box>
                  </Box>
                  {(orderDetails.complaint || orderDetails.recommendation) && (
                    <Box className="mt-4 space-y-2">
                      {orderDetails.complaint && (
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">Complaint</Typography>
                          <Typography variant="body2">{orderDetails.complaint}</Typography>
                        </Box>
                      )}
                      {orderDetails.recommendation && (
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">Recommendation</Typography>
                          <Typography variant="body2">{orderDetails.recommendation}</Typography>
                        </Box>
                      )}
                    </Box>
                  )}
                </CardContent>
              </Card>

              {/* Customer Information */}
              {orderDetails.customer && (
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" className="mb-4 flex items-center">
                      👤 Customer Information
                    </Typography>
                    <Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">Name</Typography>
                        <Typography variant="body1" className="font-medium">
                          {orderDetails.customer.companyName || 
                           `${orderDetails.customer.firstName || ''} ${orderDetails.customer.lastName || ''}`.trim() || 
                           'N/A'}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">Type</Typography>
                        <Typography variant="body1">{orderDetails.customer.companyName ? 'Company' : 'Individual'}</Typography>
                      </Box>
                      {orderDetails.customer.address1 && (
                        <Box className="md:col-span-2">
                          <Typography variant="subtitle2" color="text.secondary">Address</Typography>
                          <Typography variant="body1">
                            {orderDetails.customer.address1}
                            {orderDetails.customer.address2 && `, ${orderDetails.customer.address2}`}
                            {orderDetails.customer.city && `, ${orderDetails.customer.city}`}
                            {orderDetails.customer.state && `, ${orderDetails.customer.state}`}
                            {orderDetails.customer.postalCode && ` ${orderDetails.customer.postalCode}`}
                          </Typography>
                        </Box>
                      )}
                      {orderDetails.customer.emails && orderDetails.customer.emails.length > 0 && (
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">Email</Typography>
                          {orderDetails.customer.emails.map((email, index) => (
                            <Typography key={index} variant="body2">
                              {email.email} {email.primary && '(Primary)'}
                            </Typography>
                          ))}
                        </Box>
                      )}
                      {orderDetails.customer.phoneNumbers && orderDetails.customer.phoneNumbers.length > 0 && (
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">Phone</Typography>
                          {orderDetails.customer.phoneNumbers.map((phone, index) => (
                            <Typography key={index} variant="body2">
                              {phone.number} {phone.primary && '(Primary)'} {phone.type && `(${phone.type})`}
                            </Typography>
                          ))}
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              )}

              {/* Vehicle Information */}
              {orderDetails.vehicle && (
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" className="mb-4 flex items-center">
                      🚗 Vehicle Information
                    </Typography>
                    <Box className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">Vehicle</Typography>
                        <Typography variant="body1" className="font-medium">
                          {`${orderDetails.vehicle.year || ''} ${orderDetails.vehicle.make || ''} ${orderDetails.vehicle.model || ''}`.trim() || 'N/A'}
                        </Typography>
                      </Box>
                      {orderDetails.vehicle.submodel && (
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">Submodel</Typography>
                          <Typography variant="body1">{orderDetails.vehicle.submodel}</Typography>
                        </Box>
                      )}
                      {orderDetails.vehicle.engine && (
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">Engine</Typography>
                          <Typography variant="body1">{orderDetails.vehicle.engine}</Typography>
                        </Box>
                      )}
                      {orderDetails.vehicle.transmission && (
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">Transmission</Typography>
                          <Typography variant="body1">{orderDetails.vehicle.transmission}</Typography>
                        </Box>
                      )}
                      {orderDetails.vehicle.vin && (
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">VIN</Typography>
                          <Typography variant="body1" className="font-mono text-sm">{orderDetails.vehicle.vin}</Typography>
                        </Box>
                      )}
                      {orderDetails.vehicle.licensePlate && (
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">License Plate</Typography>
                          <Typography variant="body1">
                            {orderDetails.vehicle.licensePlate} {orderDetails.vehicle.licensePlateState && `(${orderDetails.vehicle.licensePlateState})`}
                          </Typography>
                        </Box>
                      )}
                      {orderDetails.vehicle.mileage && (
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">Mileage</Typography>
                          <Typography variant="body1">{orderDetails.vehicle.mileage.toLocaleString()} {orderDetails.vehicle.mileageUnit || 'miles'}</Typography>
                        </Box>
                      )}
                      {orderDetails.vehicle.color && (
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">Color</Typography>
                          <Typography variant="body1">{orderDetails.vehicle.color}</Typography>
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              )}

              {/* Debug Services Info */}
              {debugOverlayVisible && (
                <Card variant="outlined" className="mb-4 bg-yellow-50 border-yellow-300">
                  <CardContent>
                    <Typography variant="h6" className="mb-2 text-yellow-800">
                      🐛 Debug: Services Data
                    </Typography>
                    <Typography variant="body2" className="mb-2">
                      Services array exists: {orderDetails.services ? 'Yes' : 'No'}
                    </Typography>
                    <Typography variant="body2" className="mb-2">
                      Services count: {orderDetails.services ? orderDetails.services.length : 0}
                    </Typography>
                    <Typography variant="body2" className="mb-2">
                      Order has these keys: {Object.keys(orderDetails).join(', ')}
                    </Typography>
                    <Typography variant="body2" className="mb-2">
                      Looking for services in: services, lineItems, repairItems, parts, labor
                    </Typography>
                    <pre className="text-xs bg-white p-2 rounded border overflow-x-auto max-h-40">
                      {JSON.stringify({
                        services: orderDetails.services,
                        lineItems: (orderDetails as any).lineItems,
                        repairItems: (orderDetails as any).repairItems,
                        parts: (orderDetails as any).parts,
                        labor: (orderDetails as any).labor
                      }, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}

              {/* Services */}
              {orderDetails.services && orderDetails.services.length > 0 ? (
                <Card variant="outlined">
                  <CardContent>
                    <Box className="flex justify-between items-center mb-4">
                      <Typography variant="h6" className="flex items-center gap-2">
                        🔧 Services ({orderDetails.services.length})
                        <Chip 
                          label={`${orderDetails.services.filter(s => s.completed).length} / ${orderDetails.services.length} Completed`}
                          size="small"
                          color={orderDetails.services.filter(s => s.completed).length === orderDetails.services.length ? "success" : "info"}
                          variant="outlined"
                        />
                      </Typography>
                      <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        onClick={() => printOilSticker(orderDetails)}
                        disabled={printingSticker === orderDetails.id}
                        startIcon={printingSticker === orderDetails.id ? <CircularProgress size={16} /> : <OilChangeIcon />}
                        className={findOilTypeFromServices(orderDetails) ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-500'}
                      >
                        {printingSticker === orderDetails.id ? 'Printing...' : 'Print Oil Sticker'}
                      </Button>
                    </Box>
                    <Box className="space-y-4">
                      {orderDetails.services.map((service, index) => {
                        const serviceCompleted = isServiceCompleted(service);
                        return (
                        <Card key={service.id} variant="outlined" className={`border-l-4 ${serviceCompleted ? 'border-l-green-500 bg-green-50' : 'border-l-blue-500'}`}>
                          <CardContent>
                            <Box className="flex justify-between items-start mb-2">
                              <Box className="flex items-center gap-2">
                                <Typography variant="subtitle1" className={`font-medium ${serviceCompleted ? 'line-through text-gray-600' : ''}`}>
                                  {service.name}
                                </Typography>
                                {serviceCompleted && <Chip label="✅ Completed" size="small" color="success" />}
                              </Box>
                              <Box className="text-right flex flex-col items-end gap-2">
                                <Typography variant="h6" className="font-bold">
                                  ${(service.totalCents / 100).toFixed(2)}
                                </Typography>
                                <Box className="flex gap-1 flex-wrap">
                                  <Chip 
                                    label={service.authorizationStatus} 
                                    size="small" 
                                    color={service.authorizationStatus === 'authorized' ? 'success' : 'warning'}
                                  />
                                  <Button
                                    size="small"
                                    variant={serviceCompleted ? "outlined" : "contained"}
                                    color={serviceCompleted ? "secondary" : "success"}
                                    disabled={updatingServiceCompletion === service.id}
                                    onClick={() => toggleServiceCompletion(orderDetails.id, service.id, serviceCompleted)}
                                    startIcon={updatingServiceCompletion === service.id ? 
                                      <CircularProgress size={16} /> : 
                                      serviceCompleted ? '↩️' : '✅'
                                    }
                                  >
                                    {updatingServiceCompletion === service.id ? 
                                      'Updating...' : 
                                      serviceCompleted ? 'Mark Incomplete' : 'Mark Complete'
                                    }
                                  </Button>
                                </Box>
                              </Box>
                            </Box>
                            {service.note && (
                              <Typography variant="body2" color="text.secondary" className="mb-3">
                                {service.note}
                              </Typography>
                            )}
                            
                            {/* Parts */}
                            {service.parts && service.parts.length > 0 && (
                              <Box className="mb-3">
                                <Typography variant="subtitle2" className="font-medium mb-2">Parts:</Typography>
                                {service.parts.map((part) => (
                                  <Box key={part.id} className="ml-4 mb-1">
                                    <Typography variant="body2">
                                      • {part.name} (Qty: {part.quantity}) - ${(part.retailCostCents / 100).toFixed(2)}
                                      {part.partNumber && ` | PN: ${part.partNumber}`}
                                    </Typography>
                                  </Box>
                                ))}
                              </Box>
                            )}

                            {/* Labor */}
                            {service.labors && service.labors.length > 0 && (
                              <Box className="mb-3">
                                <Typography variant="subtitle2" className="font-medium mb-2 flex items-center gap-2">
                                  Labor:
                                  <Chip 
                                    label={`${service.labors.filter(l => l.completed).length} / ${service.labors.length} Complete`}
                                    size="small"
                                    color={service.labors.filter(l => l.completed).length === service.labors.length ? "success" : "warning"}
                                    variant="outlined"
                                  />
                                </Typography>
                                {service.labors.map((labor) => (
                                  <Box key={labor.id} className="ml-4 mb-1 flex items-center justify-between">
                                    <Typography variant="body2" className={labor.completed ? 'line-through text-gray-600' : ''}>
                                      • {labor.name || 'Labor'} ({labor.hours} hrs @ ${(labor.rateCents / 100).toFixed(2)}/hr)
                                    </Typography>
                                    {labor.completed && <Chip label="✅ Done" size="small" color="success" />}
                                  </Box>
                                ))}
                              </Box>
                            )}

                            {/* Subcontracts */}
                            {service.subcontracts && service.subcontracts.length > 0 && (
                              <Box className="mb-3">
                                <Typography variant="subtitle2" className="font-medium mb-2">Subcontracts:</Typography>
                                {service.subcontracts.map((subcontract) => (
                                  <Box key={subcontract.id} className="ml-4 mb-1">
                                    <Typography variant="body2">
                                      • {subcontract.name} - ${(subcontract.retailCostCents / 100).toFixed(2)}
                                    </Typography>
                                  </Box>
                                ))}
                              </Box>
                            )}

                            {/* Tires */}
                            {service.tires && service.tires.length > 0 && (
                              <Box className="mb-3">
                                <Typography variant="subtitle2" className="font-medium mb-2">Tires:</Typography>
                                {service.tires.map((tire) => (
                                  <Box key={tire.id} className="ml-4 mb-1">
                                    <Typography variant="body2">
                                      • {tire.name} (Qty: {tire.quantity}) - ${(tire.retailCostCents / 100).toFixed(2)}
                                      {tire.size && ` | Size: ${tire.size}`}
                                    </Typography>
                                  </Box>
                                ))}
                              </Box>
                            )}
                          </CardContent>
                        </Card>
                        );
                      })}
                    </Box>
                  </CardContent>
                </Card>
              ) : (
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" className="mb-4 flex items-center">
                      🔧 Services
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      No services found for this order.
                    </Typography>
                  </CardContent>
                </Card>
              )}

              {/* Cost Breakdown */}
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" className="mb-4 flex items-center">
                    💰 Cost Breakdown
                  </Typography>
                  <Box className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">Parts</Typography>
                      <Typography variant="body1">${((orderDetails.partsCents || 0) / 100).toFixed(2)}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">Labor</Typography>
                      <Typography variant="body1">${((orderDetails.laborCents || 0) / 100).toFixed(2)}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">Tires</Typography>
                      <Typography variant="body1">${((orderDetails.tiresCents || 0) / 100).toFixed(2)}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">Subcontracts</Typography>
                      <Typography variant="body1">${((orderDetails.subcontractsCents || 0) / 100).toFixed(2)}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">Fees</Typography>
                      <Typography variant="body1">${((orderDetails.feesCents || 0) / 100).toFixed(2)}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">Tax</Typography>
                      <Typography variant="body1">${((orderDetails.taxCents || 0) / 100).toFixed(2)}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">Discount</Typography>
                      <Typography variant="body1" className="text-green-600">
                        -${((orderDetails.discountCents || 0) / 100).toFixed(2)}
                        {orderDetails.discountPercent && ` (${orderDetails.discountPercent}%)`}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">Paid Amount</Typography>
                      <Typography variant="body1" className="text-green-600">
                        ${((orderDetails.paidCostCents || 0) / 100).toFixed(2)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">Remaining</Typography>
                      <Typography variant="body1" className="text-red-600">
                        ${((orderDetails.remainingCostCents || 0) / 100).toFixed(2)}
                      </Typography>
                    </Box>
                  </Box>
                  <Divider className="my-4" />
                  <Box className="flex justify-between items-center">
                    <Typography variant="h6">Total</Typography>
                    <Typography variant="h6" className="font-bold">
                      ${((orderDetails.totalCostCents || 0) / 100).toFixed(2)}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>

              {/* Labels */}
              {getOrderLabels(orderDetails).length > 0 && (
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" className="mb-4 flex items-center">
                      🏷️ Labels
                    </Typography>
                    <Box className="flex flex-wrap gap-2">
                      {getOrderLabels(orderDetails).map((label, index) => (
                        <Chip
                          key={label.id}
                          label={label.name}
                          color={getColorForLabel(label.color)}
                          size="small"
                          clickable={label.name.toLowerCase() === 'quick check'}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (label.name.toLowerCase() === 'quick check') {
                              handleQuickCheckLabelClick(orderDetails);
                            }
                          }}
                          style={{
                            cursor: label.name.toLowerCase() === 'quick check' ? 'pointer' : 'default'
                          }}
                        />
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              )}
            </Box>
          ) : (
            <Box className="p-6">
              <Alert severity="info">
                No order details available.
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions className="p-4">
          <Button onClick={closeOrderDetailsDialog} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Oil Sticker Settings Dialog */}
      <Dialog 
        open={oilStickerSettingsDialog} 
        onClose={() => setOilStickerSettingsDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box className="flex items-center space-x-2">
            <OilChangeIcon className="text-blue-600" />
            <Typography variant="h6">Oil Sticker Settings</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box className="space-y-6 pt-4">
            <Alert severity="info">
              <Typography variant="body2">
                Configure which service names should trigger oil sticker printing. 
                The system will match service names (case-insensitive) against your mappings.
                <br /><br />
                <strong>Viscosity-Agnostic:</strong> Mappings ignore viscosity numbers (0W16, 5W30, etc.) 
                so "Mobil 1" will match "Oil Change Mobil 1 0W16", "Oil Change Mobil 1 5W30", etc.
              </Typography>
            </Alert>

            {/* Available Oil Types Reference */}
            <Card variant="outlined" className="p-4 bg-blue-50">
              <Typography variant="subtitle1" className="mb-2 font-semibold text-blue-800">
                📋 Available Oil Types (from existing sticker system):
              </Typography>
              <Box className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <Box className="space-y-1">
                  <Typography variant="body2" className="font-medium">• <strong>Conventional Oil</strong> - 90 days / 3,000 miles</Typography>
                  <Typography variant="body2" className="font-medium">• <strong>Super Synthetic</strong> - 180 days / 7,000 miles</Typography>
                  <Typography variant="body2" className="font-medium">• <strong>Mobil 1</strong> - 365 days / 10,000 miles</Typography>
                </Box>
                <Box className="space-y-1">
                  <Typography variant="body2" className="font-medium">• <strong>Rotella</strong> - 90 days / 3,000 miles</Typography>
                  <Typography variant="body2" className="font-medium">• <strong>Delvac 1</strong> - 365 days / 10,000 miles</Typography>
                </Box>
              </Box>
              <Typography variant="caption" color="text.secondary" className="mt-2 block">
                💡 Use these exact names in the "Oil Type" field to match your existing sticker system
              </Typography>
            </Card>

            {/* Add New Mapping */}
            <Card variant="outlined" className="p-4">
              <Typography variant="subtitle1" className="mb-3 font-semibold">
                Add New Mapping
              </Typography>
              <Box className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <TextField
                  label="Canned Service Name"
                  value={newOilMapping.cannedServiceName}
                  onChange={(e) => setNewOilMapping(prev => ({ ...prev, cannedServiceName: e.target.value }))}
                  placeholder="e.g., Oil Change, Lube Service"
                  helperText="Service name to match against"
                  fullWidth
                />
                <Box>
                  <FormControl fullWidth>
                    <InputLabel>Oil Type</InputLabel>
                    <Select
                      value={newOilMapping.oilType}
                      onChange={(e) => setNewOilMapping(prev => ({ ...prev, oilType: e.target.value }))}
                      label="Oil Type"
                    >
                      <MenuItem value="Conventional Oil">Conventional Oil (90 days / 3,000 miles)</MenuItem>
                      <MenuItem value="Super Synthetic">Super Synthetic (180 days / 7,000 miles)</MenuItem>
                      <MenuItem value="Mobil 1">Mobil 1 (365 days / 10,000 miles)</MenuItem>
                      <MenuItem value="Rotella">Rotella (90 days / 3,000 miles)</MenuItem>
                      <MenuItem value="Delvac 1">Delvac 1 (365 days / 10,000 miles)</MenuItem>
                      <MenuItem value="">Custom (type below)</MenuItem>
                    </Select>
                  </FormControl>
                  {(newOilMapping.oilType === '' || !['Conventional Oil', 'Super Synthetic', 'Mobil 1', 'Rotella', 'Delvac 1'].includes(newOilMapping.oilType)) && (
                    <TextField
                      label="Custom Oil Type"
                      value={newOilMapping.oilType}
                      onChange={(e) => setNewOilMapping(prev => ({ ...prev, oilType: e.target.value }))}
                      placeholder="e.g., 5W-30 Full Synthetic, 0W-20 Synthetic Blend"
                      helperText="Enter custom oil type name"
                      fullWidth
                      className="mt-2"
                    />
                  )}
                  <Typography variant="caption" color="text.secondary" className="mt-1 block">
                    💡 Choose from predefined types or enter a custom oil type
                  </Typography>
                </Box>
              </Box>
              <Button
                variant="contained"
                onClick={addOilStickerMapping}
                disabled={!newOilMapping.cannedServiceName.trim() || !newOilMapping.oilType.trim()}
                startIcon={<AddIcon />}
                className="bg-green-600 hover:bg-green-700"
              >
                Add Mapping
              </Button>
            </Card>

            {/* Current Mappings */}
            <Box>
              <Box className="flex justify-between items-center mb-3">
                <Typography variant="subtitle1" className="font-semibold">
                  Current Mappings ({oilStickerMappings.length})
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={resetOilStickerMappingsToDefaults}
                  startIcon={<RefreshIcon />}
                  className="text-blue-600 border-blue-600 hover:bg-blue-50"
                >
                  Reset to Defaults
                </Button>
              </Box>
              {oilStickerMappings.length === 0 ? (
                <Paper variant="outlined" className="p-8 text-center">
                  <OilChangeIcon className="text-6xl text-gray-300 mb-4" />
                  <Typography variant="body1" color="text.secondary">
                    No oil sticker mappings configured yet.
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Add your first mapping above to get started.
                  </Typography>
                </Paper>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead className="bg-gray-50">
                      <TableRow>
                        <TableCell className="font-semibold">Service Name</TableCell>
                        <TableCell className="font-semibold">Oil Type</TableCell>
                        <TableCell className="font-semibold">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {oilStickerMappings.map((mapping) => (
                        <TableRow key={mapping.id} className="hover:bg-gray-50">
                          <TableCell>
                            <Box className="flex items-center space-x-2">
                              <OilChangeIcon className="text-blue-600" fontSize="small" />
                              <Typography variant="body2" className="font-medium">
                                {mapping.cannedServiceName}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={mapping.oilType} 
                              size="small" 
                              color="primary"
                              icon={<PrintIcon />}
                            />
                          </TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => removeOilStickerMapping(mapping.id)}
                              color="error"
                              title="Remove Mapping"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions className="p-4">
          <Button onClick={() => setOilStickerSettingsDialog(false)} variant="contained">
            Done
          </Button>
        </DialogActions>
      </Dialog>

      {/* Order Info Dialog */}
      <Dialog 
        open={orderInfoDialog.open} 
        onClose={closeOrderInfoDialog}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { backgroundColor: '#f8f9fa' }
        }}
      >
        <DialogTitle>
          <Box className="flex items-center justify-between">
            <Box className="flex items-center space-x-2">
              <span style={{ fontSize: '20px' }}>ℹ️</span>
              <Typography variant="h6">Order Info & Debug Log</Typography>
            </Box>
            <Typography variant="subtitle1" color="text.secondary">
              #{orderInfoDialog.orderNumber}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" className="mb-4">
            <Typography variant="body2">
              <strong>Debug Information:</strong> This shows all the data extracted from the order and the oil sticker matching process. 
              Use this to understand why oil stickers are or aren't being created for specific orders.
            </Typography>
          </Alert>
          
          {/* Special alert for coalescedName fallback issue */}
          {orderInfoData.includes('WorkflowOrder - Using coalescedName fallback') && (
            <Alert severity="warning" className="mb-4">
              <Typography variant="body2">
                <strong>⚠️ Main Issue Detected:</strong> This order is using summary data ("coalescedName") instead of detailed services.
                <br />
                <strong>🔧 Solution:</strong> Close this dialog, click the order row to load detailed services, then try the oil sticker button again.
                <br />
                <strong>💡 Why:</strong> Oil sticker matching needs individual service names, not summaries like "API test service and 4 more".
              </Typography>
            </Alert>
          )}
          
          <Card variant="outlined" className="p-0">
            <Box 
              component="pre"
              sx={{
                fontSize: '0.8rem',
                fontFamily: 'Monaco, "Lucida Console", monospace',
                lineHeight: 1.4,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                backgroundColor: '#1e1e1e',
                color: '#d4d4d4',
                padding: '16px',
                margin: 0,
                maxHeight: '70vh',
                overflow: 'auto',
                borderRadius: '4px'
              }}
            >
              {orderInfoData}
            </Box>
          </Card>
        </DialogContent>
        <DialogActions className="p-4">
          <Button 
            onClick={() => {
              navigator.clipboard.writeText(orderInfoData);
              setSuccessMessage('Order info copied to clipboard');
            }}
            variant="outlined"
            startIcon={<span>📋</span>}
          >
            Copy to Clipboard
          </Button>
          <Button onClick={closeOrderInfoDialog} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Debug Dialog for Request/Response Details */}
      <Dialog 
        open={showDebugDialog} 
        onClose={() => setShowDebugDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { height: '80vh' }
        }}
      >
        <DialogTitle>
          <Box className="flex justify-between items-center">
            <Typography variant="h6">🐛 API Debug Information</Typography>
            <Button
              onClick={() => navigator.clipboard.writeText(debugInfo)}
              size="small"
              variant="outlined"
            >
              Copy to Clipboard
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" className="mb-4">
            This shows the complete request and response details for debugging the authentication issue.
          </Alert>
          <Paper 
            variant="outlined" 
            className="p-4 h-full overflow-auto bg-gray-50"
            sx={{ fontFamily: 'monospace' }}
          >
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
              {debugInfo}
            </pre>
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDebugDialog(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* ShopMonkey Token Status Indicator */}
      <Box
        sx={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 1000,
        }}
      >
        <Tooltip
          title={
            tokenStatus === 'valid' 
              ? `ShopMonkey Connected${lastTokenCheck ? ` - Last checked: ${lastTokenCheck.toLocaleTimeString()}` : ''}`
              : tokenStatus === 'invalid'
              ? 'ShopMonkey Token Invalid - Click to login'
              : 'Checking ShopMonkey Connection...'
          }
          placement="top-end"
        >
          <Box
            onClick={tokenStatus === 'invalid' ? () => setShowLoginPrompt(true) : undefined}
            sx={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: 
                tokenStatus === 'valid' ? '#4CAF50' : // Green
                tokenStatus === 'invalid' ? '#F44336' : // Red
                '#FF9800', // Orange for checking
              cursor: tokenStatus === 'invalid' ? 'pointer' : 'default',
              border: '2px solid white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              animation: tokenStatus === 'checking' ? 'pulse 2s infinite' : 'none',
              '@keyframes pulse': {
                '0%': { opacity: 1 },
                '50%': { opacity: 0.5 },
                '100%': { opacity: 1 },
              },
            }}
          />
        </Tooltip>
      </Box>

      {/* Login Prompt Dialog */}
      <Dialog
        open={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box className="flex items-center space-x-2">
            <KeyIcon color="warning" />
            <Typography variant="h6">ShopMonkey Token Required</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" className="mb-4">
            <Typography variant="body2">
              Your ShopMonkey token is invalid or has expired. Please login to update your token and restore access to ShopMonkey features.
            </Typography>
          </Alert>
          
          <Box className="space-y-4">
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={loginCredentials.email}
              onChange={(e) => setLoginCredentials(prev => ({ ...prev, email: e.target.value }))}
              variant="outlined"
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={loginCredentials.password}
              onChange={(e) => setLoginCredentials(prev => ({ ...prev, password: e.target.value }))}
              variant="outlined"
            />
            {loginError && (
              <Alert severity="error">
                {loginError}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions className="p-4">
          <Button 
            onClick={() => setShowLoginPrompt(false)} 
            color="inherit"
          >
            Cancel
          </Button>
          <Button
            onClick={handleTestLogin}
            variant="outlined"
            startIcon={<KeyIcon />}
            className="mr-2"
          >
            Use Test Token
          </Button>
          <Button
            onClick={handleLogin}
            variant="contained"
            disabled={loggingIn || !loginCredentials.email || !loginCredentials.password}
            startIcon={loggingIn ? <CircularProgress size={20} /> : <LoginIcon />}
          >
            {loggingIn ? 'Logging In...' : 'Login'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Message Snackbar */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert 
          onClose={() => setSuccessMessage('')} 
          severity="success"
          variant="filled"
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ShopMonkey; 