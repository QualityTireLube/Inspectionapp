import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Button,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Paper,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Fab,
  Snackbar,
  Slider,
} from '@mui/material';
import Grid from '../components/CustomGrid';
import PrintQueueBadge from '../components/PrintQueueBadge';
import {
  Archive as ArchiveIcon,
  Visibility as VisibilityIcon,
  AccessTime as AccessTimeIcon,
  Person as PersonIcon,
  DirectionsCar as CarIcon,
  Schedule as ScheduleIcon,
  Refresh as RefreshIcon,
  PlayArrow as PlayArrowIcon,
  Delete as DeleteIcon,
  Timer as TimerIcon,
  Add as AddIcon,
  Print as PrintIcon,
  QrCode as QrCodeIcon,
  LocalGasStation as OilIcon,
  Label as LabelIcon,
  Speed as SpeedIcon,
  Update as UpdateIcon,
  Settings as SettingsIcon,
  ContentCopy as CopyIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Close as CloseIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { archiveInspection, deleteInspection } from '../services/firebase/inspections';
import { deleteDraftById } from '../services/firebase/drafts';
import { getUploadUrl } from '../services/api';
import { decodeVinCached } from '../services/vinDecoder';
import { getUserSettings } from '../services/firebase/users';
// Legacy stubs — replaced by Firestore realtime data
const getTimingSummary = async (_id: any) => ({});
const formatVehicleDetails = (d: any) => d;
const archiveQuickCheck = async (id: any) => archiveInspection(id);
const deleteQuickCheck = async (id: any) => deleteInspection(id);
import { StaticSticker, CreateStickerFormData, OilType } from '../types/stickers';
import { GeneratedLabel } from '../types/labels';
import { LabelTemplate } from '../types/labelTemplates';
import { StickerStorageService } from '../services/stickerStorage';
import { GeneratedLabelStorageService } from '../services/generatedLabelStorage';
import { LocationAwareStorageService } from '../services/locationAwareStorage';
import { VinDecoderService } from '../services/vinDecoder';
import { PDFGeneratorService } from '../services/pdfGenerator';
import { LabelPdfGenerator } from '../services/labelPdfGenerator';
import { LabelApiService } from '../services/labelApi';
import PrintApiService from '../services/printApi';
import { LocationPrintDefaultsService, LocationPrintDefaults } from '../services/locationPrintDefaults';
import { usePrintStore } from '../stores/printStore';
import StickerPreview from '../components/StickerPreview';
import LabelCreator from '../components/LabelCreator';
import StickerPrintSettings from '../components/StickerPrintSettings';
import LabelPrintSettings from '../components/LabelPrintSettings';
import { useWebSocket, useQuickCheckUpdates, useStaticStickerUpdates, useGeneratedLabelUpdates } from '../contexts/WebSocketProvider';
import LocationIndicator from '../components/LocationIndicator';

interface QuickCheck {
  id: string;
  firestoreId?: string;
  user_name: string;
  title: string;
  created_at: string;
  updated_at?: string;
  data: {
    vin: string;
    date: string;
    user: string;
    mileage: string;
    dash_lights_photos: { url: string }[];
    technician_duration?: number;
    vehicle_details?: string;
    year?: string;
    make?: string;
    model?: string;
    engine?: string;
    engineCylinders?: string;
    inspection_type?: string;
    [key: string]: any;
  };
  archived_at?: string;
  archived_by?: string;
  archived_by_name?: string;
  status?: string;
}

// IMPORTANT: This section handles VEHICLE INSPECTIONS ONLY!
// State inspections are a completely separate system with different data structures,
// tables, and workflows. Do NOT mix them with vehicle inspections.

/**
 * Vehicle inspection types that should appear in the home dashboard
 * 
 * VEHICLE INSPECTIONS (QuickCheckForm):
 * - quick_check: Standard vehicle condition assessment
 * - no_check: Oil change without full inspection  
 * - vsi: Vehicle Safety Inspection (comprehensive)
 * - full_check: Alias for VSI inspections
 * 
 * STATE INSPECTIONS (StateInspectionRecord):
 * - Handled separately via StateInspectionRecords.tsx
 * - Different data structure (sticker numbers, pass/fail, payments)
 * - Should NEVER appear in vehicle inspection sections
 */
const VEHICLE_INSPECTION_TYPES = [
  'quick_check',
  'no_check', 
  'vsi',
  'full_check'
] as const;

// Utility function to get display name for VEHICLE inspection types only
const getVehicleInspectionDisplayName = (inspectionType: string): string => {
  const displayNames: { [key: string]: string } = {
    'quick_check': 'Quick Check',
    'no_check': 'No Check',
    'vsi': 'VSI',
    'full_check': 'Full Check'
  };
  return displayNames[inspectionType] || inspectionType.charAt(0).toUpperCase() + inspectionType.slice(1).replace('_', ' ');
};

// Utility function to group VEHICLE inspections by type and sort alphabetically
// EXCLUDES state inspections which are handled separately
const groupVehicleInspectionsByType = (inspections: QuickCheck[]) => {
  const groups: { [key: string]: QuickCheck[] } = {};
  
  // Group inspections by their inspection_type, but ONLY vehicle inspections
  inspections.forEach(inspection => {
    const inspectionType = inspection?.data?.inspection_type || 'quick_check';
    
    // CRITICAL: Only include vehicle inspection types, exclude state inspections
    if (VEHICLE_INSPECTION_TYPES.includes(inspectionType as any)) {
      if (!groups[inspectionType]) {
        groups[inspectionType] = [];
      }
      groups[inspectionType].push(inspection);
    }
    // State inspections and other types are intentionally filtered out
  });
  
  // Sort group keys alphabetically and return ordered groups
  const sortedTypes = Object.keys(groups).sort((a, b) => {
    const displayA = getVehicleInspectionDisplayName(a);
    const displayB = getVehicleInspectionDisplayName(b);
    return displayA.localeCompare(displayB);
  });
  
  return sortedTypes.map(type => ({
    type,
    displayName: getVehicleInspectionDisplayName(type),
    inspections: groups[type]
  }));
};

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user, userLocation } = useUser();
  const [inProgressChecks, setInProgressChecks] = useState<QuickCheck[]>([]);
  const [submittedChecks, setSubmittedChecks] = useState<QuickCheck[]>([]);
  
  // Admin location selection state
  const [adminSelectedLocation, setAdminSelectedLocation] = useState<Location | null>(null);
  
  // Determine the effective location for filtering (admin selection or user's assigned location)
  const effectiveLocation = user?.role === 'Admin' 
    ? adminSelectedLocation // Allow null for "All Locations"
    : userLocation;
  
  // Print store for queue functionality
  const { getConfiguration } = usePrintStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [archivingId, setArchivingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [selectedQuickCheck, setSelectedQuickCheck] = useState<QuickCheck | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [confirmArchiveDialog, setConfirmArchiveDialog] = useState<{ open: boolean; quickCheckId: number | null }>({ open: false, quickCheckId: null });
  const [confirmDeleteDialog, setConfirmDeleteDialog] = useState<{ open: boolean; quickCheckId: number | null }>({ open: false, quickCheckId: null });
  const [autoRefreshing, setAutoRefreshing] = useState(false);
  const [timingData, setTimingData] = useState<any>(null);
  const [showTimingDialog, setShowTimingDialog] = useState(false);
  const [timingLoading, setTimingLoading] = useState(false);

  // Firestore realtime integration (replaces WebSocket)
  const { isConnected, connectionStatus, subscribe, reconnect, inProgressInspections, submittedInspections } = useWebSocket() as any;

  // Sync Firestore realtime data into component state
  useEffect(() => {
    if (inProgressInspections) {
      setInProgressChecks((inProgressInspections as any[]).map(mapInspection));
      setLoading(false);
    }
  }, [inProgressInspections]);

  useEffect(() => {
    if (submittedInspections) {
      setSubmittedChecks((submittedInspections as any[]).map(mapInspection));
    }
  }, [submittedInspections]);
  const [realtimeUpdateSnackbar, setRealtimeUpdateSnackbar] = useState({ open: false, message: '', action: '' });
  
  // Track processing IDs to prevent duplicate WebSocket processing
  const processingIds = useRef(new Set<number>());
  
  // WebSocket hooks for real-time updates
  const { subscribeToUpdates: subscribeToStaticStickerUpdates } = useStaticStickerUpdates();
  const { subscribeToUpdates: subscribeToGeneratedLabelUpdates } = useGeneratedLabelUpdates();
  
  // Track last notification to prevent duplicates
  const [lastNotification, setLastNotification] = useState({ type: '', vehicle: '', timestamp: 0 });

  // Stacked notification system
  const [notificationStack, setNotificationStack] = useState<Array<{
    id: string;
    type: 'created' | 'saved' | 'canceled' | 'submitted' | 'info';
    message: string;
    user: string;
    vehicle: string;
    timestamp: number;
    open: boolean;
  }>>([]);

  // Track recently updated cards for visual feedback
  const [recentlyUpdatedCards, setRecentlyUpdatedCards] = useState<Set<number>>(new Set());

  // Track image loading states
  const [imageLoadingStates, setImageLoadingStates] = useState<Map<number, boolean>>(new Map());

  // Audio context for notification sounds
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [audioInitialized, setAudioInitialized] = useState(false);

  // iOS Safari detection
  const isIOSSafari = () => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && 
           /Safari/.test(navigator.userAgent) && 
           !/CriOS/.test(navigator.userAgent);
  };

  // Initialize audio context for iOS compatibility
  const initializeAudioForIOS = async () => {
    if (audioInitialized) return;
    
    try {
      console.log('🔊 Initializing audio for iOS compatibility');
      
      // Create audio context
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // iOS requires user interaction and context resume
      if (context.state === 'suspended') {
        console.log('🔊 Audio context suspended, resuming...');
        await context.resume();
      }
      
      // For iOS Safari, create a silent oscillator to unlock audio
      if (isIOSSafari()) {
        console.log('📱 iOS Safari detected, unlocking audio...');
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        
        // Set volume to 0 (silent)
        gainNode.gain.setValueAtTime(0, context.currentTime);
        
        oscillator.start(context.currentTime);
        oscillator.stop(context.currentTime + 0.01);
      }
      
      setAudioContext(context);
      setAudioInitialized(true);
      console.log('✅ Audio initialized successfully for iOS');
    } catch (error) {
      console.error('❌ Failed to initialize audio for iOS:', error);
    }
  };

  // Static Stickers state
  const [activeStickers, setActiveStickers] = useState<StaticSticker[]>([]);
  const [oilTypes, setOilTypes] = useState<OilType[]>([]);
  const [showCreateStickerForm, setShowCreateStickerForm] = useState(false);

  // Generated Labels state
  const [activeLabels, setActiveLabels] = useState<GeneratedLabel[]>([]);
  const [labelError, setLabelError] = useState<string>('');

  // Detail view state for labels and stickers
  const [selectedItem, setSelectedItem] = useState<GeneratedLabel | StaticSticker | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingSticker, setEditingSticker] = useState<Partial<StaticSticker>>({});
  const [editingLabel, setEditingLabel] = useState<Partial<GeneratedLabel>>({});
  const [labelTemplates, setLabelTemplates] = useState<any[]>([]);
  const [labelSuccess, setLabelSuccess] = useState<string>('');
  const [showLabelPrintSettings, setShowLabelPrintSettings] = useState(false);
  const [labelPrintMethod, setLabelPrintMethod] = useState<'pdf' | 'queue' | 'queue-fallback'>('pdf');
  const [labelPrinterId, setLabelPrinterId] = useState<string>('');
  const [labelPrintOrientation, setLabelPrintOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [labelPrintAutoPrint, setLabelPrintAutoPrint] = useState(false);
  const [labelAutoCut, setLabelAutoCut] = useState<boolean>(true);
  const [stickerFormData, setStickerFormData] = useState<CreateStickerFormData>({
    vin: '',
    oilTypeId: '',
    mileage: 0,
  });
  const [isDecodingVin, setIsDecodingVin] = useState(false);
  const [decodedVin, setDecodedVin] = useState<any>(null);
  const [selectedSticker, setSelectedSticker] = useState<StaticSticker | null>(null);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [stickerError, setStickerError] = useState<string>('');
  const [stickerSuccess, setStickerSuccess] = useState<string>('');
  const [showLabelCreator, setShowLabelCreator] = useState(false);
  const [showStickerPrintSettings, setShowStickerPrintSettings] = useState(false);
  const [stickerPrintMethod, setStickerPrintMethod] = useState<'pdf' | 'queue' | 'queue-fallback'>('pdf');
  const [stickerPrinterId, setStickerPrinterId] = useState<string>('');
  const [stickerPrintOrientation, setStickerPrintOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [stickerPrintAutoPrint, setStickerPrintAutoPrint] = useState(false);
  
  // Track where settings came from (user override, location default, or system default)
  const [labelSettingsSource, setLabelSettingsSource] = useState<'user' | 'location' | 'system'>('system');
  const [stickerSettingsSource, setStickerSettingsSource] = useState<'user' | 'location' | 'system'>('system');
  
  // Copies dialog state for generated labels
  const [showCopiesDialog, setShowCopiesDialog] = useState(false);
  const [pendingPrintLabel, setPendingPrintLabel] = useState<GeneratedLabel | null>(null);
  const [selectedCopies, setSelectedCopies] = useState(1);
  
  // Offline printer warning dialog state
  const [showOfflinePrinterWarning, setShowOfflinePrinterWarning] = useState(false);
  const [offlinePrinterMessage, setOfflinePrinterMessage] = useState('');
  const [pendingPrintAction, setPendingPrintAction] = useState<(() => Promise<void>) | null>(null);
  
  // Print job status notifications
  const [printJobNotification, setPrintJobNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
    jobId?: string;
  }>({ open: false, message: '', severity: 'info' });
  
  // Rate limiting state for print buttons
  const [printingInProgress, setPrintingInProgress] = useState<Set<string>>(new Set());
  const printCooldownRef = useRef<Map<string, number>>(new Map());
  const PRINT_COOLDOWN_MS = 3000; // 3 second cooldown between prints

  // Refs for auto-focus
  const mileageFieldRef = useRef<HTMLInputElement>(null);

  // Handle real-time WebSocket updates (subscribe is a no-op shim — Firestore onSnapshot drives data)
  useEffect(() => {
    const unsubscribe = subscribe('quick_check_update', (message) => {
      console.log('🔄 Real-time Quick Check update received:', message);
      console.log('📊 WebSocket connection status:', connectionStatus);
      console.log('🕒 Timestamp:', new Date().toISOString());
      
      const updateMessage = getUpdateMessage(message);
      console.log('📝 Update message:', updateMessage);
      
      // Update local state based on the update
      if (message.action === 'created') {
        console.log('➕ Processing create action');
        console.log('📊 Current lists before update:', {
          inProgress: inProgressChecks.length,
          submitted: submittedChecks.length
        });
        handleRealtimeCreate(message);
        
        // Only show notification if VIN is decoded (vehicle_details is available)
        const quickCheckData = message.data || {};
        const formData = quickCheckData.data || {};
        const vin = formData.vin || '';
        const vehicleDetails = formData.vehicle_details || '';
        const user = quickCheckData.user || 'Unknown User';
        const status = quickCheckData.status || 'submitted';
        
        // Check location filtering for notifications
        const updateLocation = formData.location || quickCheckData.location;
            if (effectiveLocation && updateLocation && updateLocation !== effectiveLocation.name) {
      console.log('🚫 Skipping notification - different location:', updateLocation, 'vs', effectiveLocation.name);
          return;
        }
        
        console.log('🔍 Notification Debug - Form Data:', formData);
        console.log('🔍 Notification Debug - VIN:', vin);
        console.log('🔍 Notification Debug - Vehicle Details Field:', vehicleDetails);
        console.log('🔍 Notification Debug - Status:', status);
        
        // Always play sound for created/submitted actions
        if (vin) {
          const notificationType = status === 'submitted' ? 'submitted' : 'created';
          playNotificationSoundForAction(notificationType);
        }
        
        // Only trigger notification if VIN is decoded and vehicle details are available
        if (vin && vehicleDetails && vehicleDetails.trim()) {
          console.log('🔍 Notification Debug - VIN Decoded, showing notification');
          
          // Determine notification type based on status
          const notificationType = status === 'submitted' ? 'submitted' : 'created';
          const notificationMessage = status === 'submitted' 
            ? `Inspection Submitted by ${user} on ${vehicleDetails}`
            : `Inspection Created by ${user} on ${vehicleDetails}`;
          
          if (notificationType === 'submitted') {
            showNotification('submitted', user, vehicleDetails);
          } else {
            showNotification('created', user, vehicleDetails);
          }
        } else if (vin && !vehicleDetails) {
          console.log('🔍 Notification Debug - VIN present but not decoded yet, skipping notification');
        }
      } else if (message.action === 'archived') {
        console.log('📦 Processing archive action');
        handleRealtimeArchive(message);
      } else if (message.action === 'deleted') {
        console.log('🗑️ Processing delete action');
        handleRealtimeDelete(message);
        
        // Check if this is a draft being submitted (don't show deletion notification)
        const quickCheckData = message.data || {};
        const isDraftSubmission = quickCheckData.reason === 'draft_submitted';
        
        if (!isDraftSubmission) {
          // Show general update notification with warning style for deletions
          const formData = quickCheckData.data || {};
          const vin = formData.vin || '';
          const user = quickCheckData.deleted_by || quickCheckData.user || 'Unknown User';
          
          // Always play sound for delete actions
          if (vin) {
            playNotificationSoundForAction('deleted');
            
            setRealtimeUpdateSnackbar({
              open: true,
              message: `Quick Check for ${vin} was deleted by ${user}`,
              action: 'deleted'
            });
          }
        } else {
          console.log('🔄 Draft submission detected - skipping deletion notification');
        }
      } else if (message.action === 'updated') {
        console.log('🔄 Processing update action');
        console.log('📊 Current lists before update:', {
          inProgress: inProgressChecks.length,
          submitted: submittedChecks.length
        });
        handleRealtimeUpdate(message);
        
        // Check if this is a draft being submitted (status changed to submitted)
        const quickCheckData = message.data || {};
        const formData = quickCheckData.data || {};
        const vin = formData.vin || '';
        const vehicleDetails = formData.vehicle_details || '';
        const user = quickCheckData.user || 'Unknown User';
        const newStatus = quickCheckData.status;
        const oldStatus = quickCheckData.previousStatus; // This might not be available
        
        // Show notification when a draft is submitted
        if (newStatus === 'submitted' && vin && vehicleDetails && vehicleDetails.trim()) {
          console.log('🔍 Draft submitted notification - showing notification');
          showNotification('submitted', user, vehicleDetails);
          playNotificationSoundForAction('submitted');
        }
        
        // Note: Removed "saved" notification from updated action
        // Only show "created" notification when VIN is first decoded
        // and "saved" notification for actual save operations (not VIN decoding)
      } else if (message.action === 'vin_decoded') {
        console.log('🔍 Processing VIN decoded action');
        
        // Show notification when VIN is successfully decoded
        const quickCheckData = message.data || {};
        const formData = quickCheckData.data || {};
        const vin = formData.vin || '';
        const vehicleDetails = formData.vehicle_details || '';
        const user = quickCheckData.user || 'Unknown User';
        
        console.log('🔍 VIN Decoded Debug - Form Data:', formData);
        console.log('🔍 VIN Decoded Debug - VIN:', vin);
        console.log('🔍 VIN Decoded Debug - Vehicle Details:', vehicleDetails);
        
        if (vin && vehicleDetails && vehicleDetails.trim()) {
          console.log('🔍 VIN Decoded - Showing notification');
          showNotification('created', user, vehicleDetails);
        }
      } else {
        console.log('❓ Unknown action:', message.action);
      }
      
      // Only show general notification for archive/delete operations
      if (message.action === 'archived' || message.action === 'deleted') {
        setRealtimeUpdateSnackbar({
          open: true,
          message: updateMessage,
          action: message.action || 'updated'
        });
      }
    });

    return unsubscribe;
  }, [subscribe, connectionStatus]);

  // Handle real-time static sticker updates
  useEffect(() => {
    
    const unsubscribe = subscribeToStaticStickerUpdates((update) => {
      console.log('🔄 Real-time static sticker update received:', update);
      
      // Reload stickers data to get the latest
      loadStickersData();
      
      // Show notification based on action
      if (update.action === 'created') {
        setRealtimeUpdateSnackbar({
          open: true,
          message: `New static sticker created for VIN: ${update.vin}`,
          action: 'created'
        });
        playNotificationSoundForAction('created');
      } else if (update.action === 'updated') {
        setRealtimeUpdateSnackbar({
          open: true,
          message: `Static sticker updated for VIN: ${update.vin}`,
          action: 'updated'
        });
      } else if (update.action === 'deleted') {
        setRealtimeUpdateSnackbar({
          open: true,
          message: 'Static sticker deleted',
          action: 'deleted'
        });
        playNotificationSoundForAction('deleted');
      } else if (update.action === 'archived') {
        setRealtimeUpdateSnackbar({
          open: true,
          message: 'Static sticker archived',
          action: 'archived'
        });
      }
    });

    return unsubscribe;
  }, [subscribeToStaticStickerUpdates]);

  // Handle real-time generated label updates
  useEffect(() => {
    
    const unsubscribe = subscribeToGeneratedLabelUpdates((update) => {
      console.log('🔄 Real-time generated label update received:', update);
      
      // Reload labels data to get the latest
      loadLabelsData();
      
      // Show notification based on action
      if (update.action === 'created') {
        setRealtimeUpdateSnackbar({
          open: true,
          message: `New generated label created: ${update.templateName}`,
          action: 'created'
        });
        playNotificationSoundForAction('created');
      } else if (update.action === 'updated') {
        setRealtimeUpdateSnackbar({
          open: true,
          message: `Generated label updated: ${update.templateName}`,
          action: 'updated'
        });
      } else if (update.action === 'deleted') {
        setRealtimeUpdateSnackbar({
          open: true,
          message: 'Generated label deleted',
          action: 'deleted'
        });
        playNotificationSoundForAction('deleted');
      } else if (update.action === 'archived') {
        setRealtimeUpdateSnackbar({
          open: true,
          message: 'Generated label archived',
          action: 'archived'
        });
      } else if (update.action === 'printed') {
        setRealtimeUpdateSnackbar({
          open: true,
          message: 'Generated label printed',
          action: 'printed'
        });
      }
    });

    return unsubscribe;
  }, [subscribeToGeneratedLabelUpdates]);

  // Handle real-time print job updates (completion/failure notifications)
  useEffect(() => {
    
    const unsubscribe = subscribe('print_job_update', (message: any) => {
      console.log('🖨️ Real-time print job update received:', message);
      
      const jobData = message.data || message;
      const action = message.action || jobData.action;
      const status = jobData.status;
      const jobId = jobData.job_id || jobData.id;
      const formName = jobData.form_name || 'Unknown';
      const printerName = jobData.printer_name || 'Unknown Printer';
      
      // Only show notifications for jobs from this location
      const currentLocationId = localStorage.getItem('selectedLocationId');
      const jobLocationId = jobData.location_id;
      
      if (currentLocationId && jobLocationId && currentLocationId !== jobLocationId) {
        console.log('🚫 Skipping print notification - different location');
        return;
      }
      
      // Show notification based on job status
      if (status === 'completed' || action === 'completed') {
        const formDisplay = formName === 'stickers' ? 'Sticker' : formName === 'labels' ? 'Label' : formName;
        setPrintJobNotification({
          open: true,
          message: `✅ ${formDisplay} printed successfully on ${printerName}`,
          severity: 'success',
          jobId
        });
        
        // Play success sound
        playNotificationSoundForAction('submitted');
        
        // Clear from printing in progress
        if (jobId) {
          setPrintingInProgress(prev => {
            const next = new Set(prev);
            next.delete(jobId);
            return next;
          });
        }
      } else if (status === 'failed' || action === 'failed') {
        const errorMessage = jobData.error_message || 'Unknown error';
        const formDisplay = formName === 'stickers' ? 'Sticker' : formName === 'labels' ? 'Label' : formName;
        const willRetry = jobData.will_retry || jobData.willRetry;
        
        if (willRetry) {
          setPrintJobNotification({
            open: true,
            message: `⚠️ ${formDisplay} print failed: ${errorMessage}. Retrying...`,
            severity: 'warning',
            jobId
          });
        } else {
          setPrintJobNotification({
            open: true,
            message: `❌ ${formDisplay} print failed: ${errorMessage}`,
            severity: 'error',
            jobId
          });
          
          // Play error sound
          playNotificationSoundForAction('deleted');
        }
        
        // Clear from printing in progress on permanent failure
        if (!willRetry && jobId) {
          setPrintingInProgress(prev => {
            const next = new Set(prev);
            next.delete(jobId);
            return next;
          });
        }
      } else if (status === 'printing' || action === 'claimed') {
        const formDisplay = formName === 'stickers' ? 'Sticker' : formName === 'labels' ? 'Label' : formName;
        setPrintJobNotification({
          open: true,
          message: `🖨️ ${formDisplay} is now printing on ${printerName}...`,
          severity: 'info',
          jobId
        });
      }
    });

    return unsubscribe;
  }, [subscribe]);

  const getUpdateMessage = (update: any): string => {
    const quickCheckData = update.data || {};
    const formData = quickCheckData.data || {};
    const vin = formData.vin || quickCheckData.vin || 'Unknown VIN';
    const user = quickCheckData.user || 'Unknown User';
    
    switch (update.action) {
      case 'created':
        return `New Quick Check created for ${vin} by ${user}`;
      case 'archived':
        return `Quick Check for ${vin} was archived by ${quickCheckData.archived_by || user}`;
      case 'deleted':
        return `Quick Check for ${vin} was deleted by ${quickCheckData.deleted_by || user}`;
      case 'updated':
        return `Quick Check for ${vin} was updated by ${quickCheckData.updated_by || user}`;
      case 'vin_decoded':
        return `VIN decoded for ${vin} by ${user}`;
      default:
        return `Quick Check for ${vin} was updated`;
    }
  };

  const handleRealtimeCreate = (update: any) => {
    console.log('🔄 Handling real-time create:', update);
    
    // Extract data from the WebSocket message
    const quickCheckData = update.data || {};
    const formData = quickCheckData.data || {};
    const vin = formData.vin || '';
    const quickCheckId = quickCheckData.id;
    
    // Prevent duplicate processing of the same ID
    if (processingIds.current.has(quickCheckId)) {
      console.log('🚫 Skipping duplicate processing for ID:', quickCheckId);
      return;
    }
    
    // Mark as processing
    processingIds.current.add(quickCheckId);
    
    // Check location filtering - only process if it matches effective location or no location filter
    const updateLocation = formData.location || quickCheckData.location;
    if (effectiveLocation && updateLocation && updateLocation !== effectiveLocation.name) {
      console.log('🚫 Skipping QuickCheck update - different location:', updateLocation, 'vs', effectiveLocation.name);
      // Remove from processing set since we're not processing it
      processingIds.current.delete(quickCheckId);
      return;
    }
    
    const newQuickCheck: QuickCheck = {
      id: quickCheckData.id,
      user_name: quickCheckData.user || 'Unknown User',
      title: quickCheckData.title || `Quick Check ${quickCheckData.id}`,
      created_at: quickCheckData.created_at || new Date().toISOString(),
      data: {
        vin: vin,
        date: formData.date || new Date().toISOString(),
        user: formData.user || quickCheckData.user || 'Unknown User',
        mileage: formData.mileage || '',
        dash_lights_photos: formData.dash_lights_photos || [],
        technician_duration: formData.technician_duration
      },
      status: quickCheckData.status || 'submitted'
    };

    console.log('🆕 Created QuickCheck object:', newQuickCheck);

    // Add to appropriate list based on status
    if (quickCheckData.status === 'pending' || quickCheckData.status === 'in_progress') {
      console.log('📝 Adding to IN-PROGRESS list (status:', quickCheckData.status, ')');
      setInProgressChecks(prev => {
        // Check if it already exists to avoid duplicates
        const exists = prev.some(check => check.id === newQuickCheck.id);
        if (exists) {
          console.log('⚠️ QuickCheck already exists in in-progress list');
          // Clean up processing ID since we're not adding anything
          processingIds.current.delete(quickCheckId);
          return prev;
        }
        console.log('➕ Adding to in-progress list');
        return [newQuickCheck, ...prev];
      });
    } else {
      console.log('📝 Adding to SUBMITTED list (status:', quickCheckData.status, ')');
      
      // When a draft is submitted, remove any existing draft with the same VIN from in-progress
      if (vin && quickCheckData.status === 'submitted') {
        console.log('🔄 Draft submitted - removing any existing draft with VIN:', vin);
        setInProgressChecks(prev => {
          const filtered = prev.filter(check => check.data.vin !== vin);
          if (filtered.length !== prev.length) {
            console.log('🗑️ Removed draft from in-progress list for VIN:', vin);
          }
          return filtered;
        });
      }
      
      setSubmittedChecks(prev => {
        // Check if it already exists to avoid duplicates
        const exists = prev.some(check => check.id === newQuickCheck.id);
        if (exists) {
          console.log('⚠️ QuickCheck already exists in submitted list');
          // Clean up processing ID since we're not adding anything
          processingIds.current.delete(quickCheckId);
          return prev;
        }
        console.log('➕ Adding to submitted list');
        return [newQuickCheck, ...prev];
      });
    }
    
    // Clean up processing ID after successful processing
    processingIds.current.delete(quickCheckId);
  };

  const handleRealtimeArchive = (update: any) => {
    console.log('🔄 Handling real-time archive:', update);
    const quickCheckData = update.data || {};
    const quickCheckId = quickCheckData.id;
    
    // Remove from both lists since archived items are no longer shown
    setSubmittedChecks(prev => {
      const filtered = prev.filter(check => check.id !== quickCheckId);
      console.log(`🗑️ Removed QuickCheck ${quickCheckId} from submitted list`);
      return filtered;
    });
    setInProgressChecks(prev => {
      const filtered = prev.filter(check => check.id !== quickCheckId);
      console.log(`🗑️ Removed QuickCheck ${quickCheckId} from in-progress list`);
      return filtered;
    });
  };

  const handleRealtimeDelete = (update: any) => {
    console.log('🔄 Handling real-time delete:', update);
    const quickCheckData = update.data || {};
    const quickCheckId = quickCheckData.id;
    
    // Check location filtering (skip if admin is viewing all locations)
    const updateLocation = quickCheckData.location || (quickCheckData.data && quickCheckData.data.location);
    if (effectiveLocation && updateLocation && updateLocation !== effectiveLocation.name) {
      console.log('🚫 Skipping QuickCheck delete - different location:', updateLocation, 'vs', effectiveLocation.name);
      return;
    }
    
    // Remove from both arrays
    setSubmittedChecks(prev => {
      const filtered = prev.filter(check => check.id !== quickCheckId);
      console.log(`🗑️ Removed QuickCheck ${quickCheckId} from submitted list`);
      return filtered;
    });
    setInProgressChecks(prev => {
      const filtered = prev.filter(check => check.id !== quickCheckId);
      console.log(`🗑️ Removed QuickCheck ${quickCheckId} from in-progress list`);
      return filtered;
    });
  };

  const handleRealtimeUpdate = (update: any) => {
    console.log('🔄 Handling real-time update:', update);
    const quickCheckData = update.data || {};
    const quickCheckId = quickCheckData.id;
    const newStatus = quickCheckData.status;
    const updatedData = quickCheckData.data || {};
    
    // Check location filtering (skip if admin is viewing all locations)
    const updateLocation = updatedData.location || quickCheckData.location;
    if (effectiveLocation && updateLocation && updateLocation !== effectiveLocation.name) {
      console.log('🚫 Skipping QuickCheck update - different location:', updateLocation, 'vs', effectiveLocation.name);
      return;
    }
    
    console.log('🔍 Update details:', {
      quickCheckId,
      newStatus,
      updatedFields: Object.keys(updatedData),
      currentInProgressCount: inProgressChecks.length,
      currentSubmittedCount: submittedChecks.length,
      inProgressIds: inProgressChecks.map(c => c.id),
      submittedIds: submittedChecks.map(c => c.id)
    });
    
    // Helper function to determine if this is a form field change vs system update
    const isFormFieldChange = (updatedFields: string[], updatedData: any, currentData: any) => {
      // Define form fields that represent actual user input
      const formFields = [
        'mileage', 'notes', 'dash_lights_photos', 'technician_duration',
        'tire_pressure_front_left', 'tire_pressure_front_right', 'tire_pressure_rear_left', 'tire_pressure_rear_right',
        'tire_tread_front_left', 'tire_tread_front_right', 'tire_tread_rear_left', 'tire_tread_rear_right',
        'brake_pad_front_left', 'brake_pad_front_right', 'brake_pad_rear_left', 'brake_pad_rear_right',
        'engine_air_filter', 'cabin_air_filter', 'oil_level', 'coolant_level',
        'transmission_fluid', 'brake_fluid', 'power_steering_fluid', 'washer_fluid',
        'battery_condition', 'alternator_condition', 'starter_condition',
        'headlights', 'taillights', 'turn_signals', 'hazard_lights',
        'horn', 'wipers', 'defroster', 'ac_heating',
        'radio', 'navigation', 'bluetooth', 'usb_ports',
        'seatbelts', 'airbags', 'abs_light', 'check_engine_light',
        'oil_pressure_light', 'battery_light', 'tire_pressure_light', 'fuel_light',
        'odometer', 'speedometer', 'tachometer', 'temperature_gauge',
        'fuel_gauge', 'voltage_gauge', 'oil_pressure_gauge', 'boost_gauge'
      ];
      
      // Check if any of the updated fields are actual form fields
      const hasFormFieldChanges = updatedFields.some(field => {
        // Check if it's a form field
        if (formFields.includes(field)) {
          // For array fields like photos, check if the content actually changed
          if (Array.isArray(updatedData[field]) && Array.isArray(currentData[field])) {
            return JSON.stringify(updatedData[field]) !== JSON.stringify(currentData[field]);
          }
          // For other fields, check if the value actually changed
          return updatedData[field] !== currentData[field];
        }
        return false;
      });
      
      console.log('🔍 Form field change analysis:', {
        updatedFields,
        formFields: updatedFields.filter(f => formFields.includes(f)),
        hasFormFieldChanges,
        fieldChanges: updatedFields.filter(f => formFields.includes(f)).map(field => ({
          field,
          oldValue: currentData[field],
          newValue: updatedData[field],
          changed: updatedData[field] !== currentData[field]
        }))
      });
      
      return hasFormFieldChanges;
    };
    
    // Add visual feedback for updated cards only if actual form fields changed
    if (Object.keys(updatedData).length > 0) {
      // Find the current quick check to compare against
      const currentQuickCheck = [...inProgressChecks, ...submittedChecks].find(check => check.id === quickCheckId);
      
      if (currentQuickCheck && isFormFieldChange(Object.keys(updatedData), updatedData, currentQuickCheck.data)) {
        console.log('✅ Form field changes detected - showing update chip');
        setRecentlyUpdatedCards(prev => {
          const newSet = new Set(prev);
          newSet.add(quickCheckId);
          // Remove the highlight after 3 seconds
          setTimeout(() => {
            setRecentlyUpdatedCards(current => {
              const updatedSet = new Set(current);
              updatedSet.delete(quickCheckId);
              return updatedSet;
            });
          }, 3000);
          return newSet;
        });
      } else {
        console.log('ℹ️ No form field changes detected - skipping update chip');
      }
    }
    
    const updateQuickCheck = (check: QuickCheck) => {
      if (check.id === quickCheckId) {
        const updatedCheck = {
          ...check,
          data: {
            ...check.data,
            ...updatedData, // Merge updated data with existing data
            // Preserve existing fields that might not be in the update
            vin: updatedData.vin || check.data.vin,
            date: updatedData.date || check.data.date,
            user: updatedData.user || check.data.user,
            mileage: updatedData.mileage || check.data.mileage,
            dash_lights_photos: updatedData.dash_lights_photos || check.data.dash_lights_photos,
            technician_duration: updatedData.technician_duration !== undefined ? updatedData.technician_duration : check.data.technician_duration,
            // Add any new fields that might be updated
            vehicle_details: updatedData.vehicle_details || check.data.vehicle_details,
            year: updatedData.year || check.data.year,
            make: updatedData.make || check.data.make,
            model: updatedData.model || check.data.model,
            engine: updatedData.engine || check.data.engine,
            engineCylinders: updatedData.engineCylinders || check.data.engineCylinders,
            // Add any other form fields that might be updated
            ...updatedData
          },
          status: newStatus || check.status,
          user_name: quickCheckData.user || check.user_name,
          title: quickCheckData.title || check.title,
          // Update timestamps if provided
          created_at: quickCheckData.created_at || check.created_at,
          updated_at: quickCheckData.updated_at || check.updated_at
        };
        console.log(`🔄 Updated QuickCheck ${quickCheckId}:`, {
          oldVin: check.data.vin,
          newVin: updatedCheck.data.vin,
          oldMileage: check.data.mileage,
          newMileage: updatedCheck.data.mileage,
          oldDuration: check.data.technician_duration,
          newDuration: updatedCheck.data.technician_duration,
          updatedFields: Object.keys(updatedData)
        });
        
        // Log specific field changes for debugging
        Object.keys(updatedData).forEach(field => {
          const oldValue = check.data[field];
          const newValue = updatedData[field];
          if (oldValue !== newValue) {
            console.log(`📝 Field "${field}" updated:`, { oldValue, newValue });
          }
        });
        return updatedCheck;
      }
      return check;
    };

    // Handle status changes by moving items between lists
    if (newStatus === 'pending' || newStatus === 'in_progress') {
      console.log('📝 Status is pending/in_progress - moving from submitted to in-progress');
      // Move from submitted to in-progress
      setSubmittedChecks(prev => {
        const itemToMove = prev.find(check => check.id === quickCheckId);
        if (itemToMove) {
          console.log('🔄 Found item in submitted list, moving to in-progress');
          const updatedItem = updateQuickCheck(itemToMove);
          setInProgressChecks(prevInProgress => {
            const exists = prevInProgress.some(check => check.id === quickCheckId);
            if (!exists) {
              console.log('➕ Adding to in-progress list');
              return [updatedItem, ...prevInProgress];
            }
            console.log('🔄 Updating existing item in in-progress list');
            return prevInProgress.map(updateQuickCheck);
          });
          return prev.filter(check => check.id !== quickCheckId);
        }
        console.log('⚠️ Item not found in submitted list, just updating');
        return prev.map(updateQuickCheck);
      });
    } else if (newStatus === 'submitted') {
      console.log('📝 Status changed to submitted - moving from in-progress to submitted');
      // Move from in-progress to submitted
      setInProgressChecks(prev => {
        const itemToMove = prev.find(check => check.id === quickCheckId);
        if (itemToMove) {
          console.log('🔄 Found item in in-progress list, moving to submitted');
          const updatedItem = updateQuickCheck(itemToMove);
          setSubmittedChecks(prevSubmitted => {
            const exists = prevSubmitted.some(check => check.id === quickCheckId);
            if (!exists) {
              console.log('➕ Adding to submitted list');
              return [updatedItem, ...prevSubmitted];
            }
            console.log('🔄 Updating existing item in submitted list');
            return prevSubmitted.map(updateQuickCheck);
          });
          return prev.filter(check => check.id !== quickCheckId);
        }
        console.log('⚠️ Item not found in in-progress list, just updating');
        return prev.map(updateQuickCheck);
      });
    } else {
      console.log('📝 Status is other (archived, etc.) - updating in place');
      // For other status changes (like archived), just update in place
      setInProgressChecks(prev => prev.map(updateQuickCheck));
      setSubmittedChecks(prev => prev.map(updateQuickCheck));
    }
  };

  // Format number with thousands separator
  const formatNumberWithCommas = (num: number): string => {
    return num.toLocaleString();
  };

  // Parse number from formatted string (removes commas)
  const parseFormattedNumber = (str: string): number => {
    return parseInt(str.replace(/,/g, '')) || 0;
  };

  /** Map a Firestore InspectionDocument to the legacy QuickCheck shape */
  const mapInspection = (doc: any): QuickCheck => {
    const ts = doc.createdAt?.toDate ? doc.createdAt.toDate() : new Date();
    const upd = doc.updatedAt?.toDate ? doc.updatedAt.toDate() : ts;
    return {
      id: doc.id,
      firestoreId: doc.id,
      user_name: doc.userName ?? '',
      title: doc.data?.vin ?? '',
      created_at: ts.toISOString(),
      updated_at: upd.toISOString(),
      status: doc.status,
      data: {
        ...doc.data,
        vin: doc.data?.vin ?? '',
        date: doc.data?.date ?? '',
        user: doc.data?.user ?? doc.userName ?? '',
        mileage: String(doc.data?.mileage ?? ''),
        dash_lights_photos: doc.data?.dash_lights_photos ?? [],
        inspection_type: doc.inspectionType,
      },
    };
  };

  const loadQuickChecks = async (isAutoRefresh = false) => {
    // Data comes via Firestore onSnapshot in WebSocketProvider — this function
    // is kept for compatibility but relies on the realtime sync useEffect below.
    if (!isAutoRefresh) setLoading(false);
    setAutoRefreshing(false);
  };

  const loadStickersData = async () => {
    try {
      if (effectiveLocation?.id) {
        // Load location-specific stickers
        const stickers = await LocationAwareStorageService.getActiveStickersByLocation(effectiveLocation.id);
        setActiveStickers(Array.isArray(stickers) ? stickers : []);
      } else {
        // Fallback to all stickers if no location
        const stickers = await StickerStorageService.getActiveStickers();
        setActiveStickers(Array.isArray(stickers) ? stickers : []);
      }
      setOilTypes(StickerStorageService.getOilTypes());
    } catch (error) {
      console.error('Error loading stickers data:', error);
      setActiveStickers([]);
    }
  };

  const loadLabelsData = async () => {
    try {
      if (effectiveLocation?.id) {
        // Load location-specific labels
        const labels = await LocationAwareStorageService.getActiveLabelsByLocation(effectiveLocation.id);
        setActiveLabels(Array.isArray(labels) ? labels : []);
      } else {
        // Fallback to all labels if no location
        const labels = await GeneratedLabelStorageService.getActiveGeneratedLabels();
        setActiveLabels(Array.isArray(labels) ? labels : []);
      }
    } catch (error) {
      console.error('Error loading labels data:', error);
      setActiveLabels([]);
    }
  };

  const handleVinChange = async (vin: string) => {
    setStickerFormData(prev => ({ ...prev, vin }));
    
    if (vin.length === 17) {
      setIsDecodingVin(true);
      try {
        const decoded = await decodeVinCached(vin);
        setDecodedVin(decoded);
      } catch (error) {
        console.error('VIN decoding failed:', error);
      } finally {
        setIsDecodingVin(false);
      }
      
      // Auto-focus to mileage field when VIN is complete
      setTimeout(() => {
        if (mileageFieldRef.current) {
          mileageFieldRef.current.focus();
        }
      }, 100);
    } else {
      setDecodedVin(null);
    }
  };

  const calculateNextServiceDate = (oilTypeId: string): string => {
    const oilType = oilTypes.find(type => type.id === oilTypeId);
    if (!oilType) return '';
    
    const today = new Date();
    const nextDate = new Date(today.getTime() + (oilType.durationInDays * 24 * 60 * 60 * 1000));
    return nextDate.toISOString().split('T')[0];
  };

  const generateQRCode = (sticker: Omit<StaticSticker, 'qrCode'>): string => {
    return sticker.vin;
  };


  const handleCreateSticker = async () => {
    try {
      setStickerError('');
      
      if (!stickerFormData.vin || !stickerFormData.oilTypeId) {
        setStickerError('Please fill in all required fields');
        return;
      }

      if (!VinDecoderService.validateVin(stickerFormData.vin)) {
        setStickerError('Please enter a valid 17-character VIN');
        return;
      }

      const oilType = oilTypes.find(type => type.id === stickerFormData.oilTypeId);
      if (!oilType) {
        setStickerError('Please select a valid oil type');
        return;
      }

      const nextServiceDate = stickerFormData.dateOverride || calculateNextServiceDate(stickerFormData.oilTypeId);
      const settings = StickerStorageService.getSettings();
      
      const companyElement = settings.layout.elements.find(el => el.id === 'companyName');
      const addressElement = settings.layout.elements.find(el => el.id === 'address');
      const messageElement = settings.layout.elements.find(el => el.id === 'message');
      
      let transformedDecodedDetails = { error: 'VIN not decoded' };
      if (decodedVin && decodedVin.Results && Array.isArray(decodedVin.Results)) {
        const getValue = (variable: string) => {
          const result = decodedVin.Results.find((r: any) => r.Variable === variable);
          return result && result.Value && result.Value !== 'Not Available' ? result.Value : null;
        };
        
        transformedDecodedDetails = {
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
          ...decodedVin
        };
      }

      // Check if we're updating an existing sticker or creating a new one
      if (selectedSticker) {
        // Update existing sticker with oil type
        const updatedSticker: StaticSticker = {
          ...selectedSticker,
          oilType,
          date: nextServiceDate,
          lastUpdated: new Date().toISOString(),
        };

        await StickerStorageService.saveSticker(updatedSticker);

        // Auto-print if enabled and using print queue, otherwise generate PDF and open in new tab
        if (stickerPrintAutoPrint && (stickerPrintMethod === 'queue' || stickerPrintMethod === 'queue-fallback') && stickerPrinterId) {
          try {
            await handlePrintSticker(updatedSticker);
            setStickerSuccess('Oil sticker updated and queued for printing!');
          } catch (error) {
            console.error('Auto-print failed:', error);
            
            if (stickerPrintMethod === 'queue-fallback') {
              // Fallback to PDF in new tab for queue-fallback mode
              await PDFGeneratorService.generateStickerPDF(updatedSticker, settings, true);
              setStickerSuccess('Oil sticker updated and opened in new tab! (Auto-print failed)');
            } else {
              // For regular queue mode, just show error
              setStickerSuccess('Oil sticker updated! (Auto-print failed - please print manually)');
            }
          }
        } else {
          // Generate PDF and open in new tab
          await PDFGeneratorService.generateStickerPDF(updatedSticker, settings, true);
          setStickerSuccess('Oil sticker updated and opened in new tab!');
        }
      } else {
        // Create new sticker
        const newSticker: StaticSticker = {
          id: Date.now().toString(),
          dateCreated: new Date().toISOString(),
          vin: VinDecoderService.formatVin(stickerFormData.vin),
          decodedDetails: transformedDecodedDetails,
          date: nextServiceDate,
          oilType,
          mileage: stickerFormData.mileage,
          companyName: companyElement?.content.replace('{companyName}', '') || '',
          address: addressElement?.content.replace('{address}', '') || '',
          message: messageElement?.content || '',
          qrCode: '',
          printed: false,
          lastUpdated: new Date().toISOString(),
          archived: false,
        };

        newSticker.qrCode = generateQRCode(newSticker);

        // Save the sticker with location
        let stickerWithLocation;
        if (effectiveLocation?.id) {
          stickerWithLocation = await LocationAwareStorageService.createLocationAwareSticker(newSticker, effectiveLocation.id);
          console.log('✅ Created location-aware sticker:', stickerWithLocation);
        } else {
          await StickerStorageService.saveSticker(newSticker);
          stickerWithLocation = newSticker;
        }
        
        // Update the stickers list
        setActiveStickers(prev => [stickerWithLocation, ...(Array.isArray(prev) ? prev : [])]);
        setStickerSuccess('Oil sticker created successfully!');
        
        // Auto-print if enabled and using print queue
        if (stickerPrintAutoPrint && (stickerPrintMethod === 'queue' || stickerPrintMethod === 'queue-fallback') && stickerPrinterId) {
          try {
            await handlePrintSticker(stickerWithLocation);
            setStickerSuccess('Oil sticker created and queued for printing!');
          } catch (error) {
            console.error('Auto-print failed:', error);
            
            if (stickerPrintMethod === 'queue-fallback') {
              // Fallback to PDF for queue-fallback mode
              try {
                await PDFGeneratorService.generateStickerPDF(stickerWithLocation, settings, true);
                setStickerSuccess('Oil sticker created and opened in new tab! (Auto-print failed)');
              } catch (pdfError) {
                setStickerSuccess('Oil sticker created successfully! (Auto-print and PDF generation failed)');
              }
            } else {
              // For regular queue mode, just show error
              setStickerSuccess('Oil sticker created successfully! (Auto-print failed - please print manually)');
            }
          }
        }
      }

      // Refresh stickers list
      loadStickersData();
      
      // Clear form and close dialog
      setStickerFormData({
        vin: '',
        oilTypeId: '',
        mileage: 0,
      });
      setDecodedVin(null);
      setSelectedSticker(null);
      setShowCreateStickerForm(false);

      // Clear success message after 3 seconds
      setTimeout(() => setStickerSuccess(''), 3000);

    } catch (error) {
      console.error('Error creating/updating oil sticker:', error);
      setStickerError('Failed to process oil sticker. Please try again.');
    }
  };

  const handleArchiveSticker = async (id: string) => {
    try {
      await StickerStorageService.archiveSticker(id);
      setStickerSuccess('Sticker archived successfully!');
      loadStickersData();
    } catch (error) {
      setStickerError('Failed to archive sticker');
    }
  };

  const handleDeleteSticker = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this sticker? This action cannot be undone.')) {
      try {
        await StickerStorageService.deleteSticker(id);
        setStickerSuccess('Sticker deleted successfully!');
        loadStickersData();
      } catch (error) {
        setStickerError('Failed to delete sticker');
      }
    }
  };

  // Generated Labels handlers
  const handleReprintLabel = async (label: GeneratedLabel) => {
    // Rate limiting check
    const printKey = `label-${label.id}`;
    if (isPrintRateLimited(printKey)) {
      setLabelError('Please wait a moment before printing again');
      return;
    }
    if (printingInProgress.has(printKey)) {
      setLabelError('Print job already in progress');
      return;
    }
    
    try {
      // Handle labels without PDF data by generating PDF on-the-fly
      if (!label.pdfBlob) {
        console.warn('PDF data not available for label:', label.id, 'Template:', label.templateName);
        console.log('Generating PDF on-the-fly for imported label...');
        
        try {
          // Fetch the template for this label
          const template = await LabelApiService.getTemplate(label.templateId);
          if (!template) {
            throw new Error(`Template not found: ${label.templateId}`);
          }
          
          // Generate PDF using the template and label data
          const pdfBytes = await LabelPdfGenerator.generateLabelPdf(template, label.labelData, 1);
          const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
          
          console.log('✅ PDF generated successfully, proceeding with print...');
          
          // Create a temporary label object with the generated PDF for printing
          const labelWithPdf = { ...label, pdfBlob };
          
          // Continue with printing using the temporary PDF data
          return handleReprintLabel(labelWithPdf);
          
        } catch (error) {
          console.error('Failed to generate PDF for label:', error);
          setLabelError(`Failed to generate PDF for this label. Please try creating a new label from the "${label.templateName}" template. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          return;
        }
      }

      // Set rate limit and mark as in progress
      setPrintCooldown(printKey);
      setPrintingInProgress(prev => new Set(prev).add(printKey));

      // Check if custom copies is enabled
      const enableCustomCopies = localStorage.getItem('labelPrintEnableCustomCopies') === 'true';
      
      if (enableCustomCopies) {
        // Show copies dialog - clear printing state since dialog will handle it
        setPrintingInProgress(prev => {
          const next = new Set(prev);
          next.delete(printKey);
          return next;
        });
        setPendingPrintLabel(label);
        setSelectedCopies(1);
        setShowCopiesDialog(true);
        return;
      }

      // Use print settings from state (loaded from server or localStorage)
      const printMethod = labelPrintMethod;
      const printerId = labelPrinterId;
      const orientation = labelPrintOrientation;
      const autoCut = labelAutoCut;

      // Check if queue printing is enabled
      if ((printMethod === 'queue' || printMethod === 'queue-fallback') && printerId) {
        // Check printer status before submitting
        const printerStatus = await PrintApiService.checkPrinterStatus(printerId);
        
        // Define the actual print action
        const executeLabelPrint = async () => {
          // Fetch template to get paper size information
          let template: LabelTemplate | null = null;
          try {
            template = await LabelApiService.getTemplate(label.templateId);
          } catch (error) {
            console.warn('Could not fetch template for paper size:', error);
          }

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
            reader.readAsDataURL(label.pdfBlob!);
          });

          // Prepare job data with PDF content
          const labelPrintData = {
            type: 'pdf-print',
            pdfData: pdfBase64,
            filename: `label-${label.templateName}-${Date.now()}.pdf`,
            printerId: printerId,
            paperSize: template?.paperSize || 'Unknown',
            autoCut: autoCut,
            templateInfo: {
              templateId: label.templateId,
              templateName: label.templateName,
              paperSize: template?.paperSize || 'Unknown',
              customWidth: template?.customWidth,
              customHeight: template?.customHeight,
              customUnit: template?.customUnit
            },
            labelInfo: {
              templateName: label.templateName,
              labelData: label.labelData,
              createdBy: label.createdBy,
              createdDate: label.createdDate
            },
            metadata: {
              documentType: 'generated-label',
              generated: new Date().toISOString(),
              source: 'generated-labels-deck',
              orientation: orientation,
              autoCut: autoCut
            }
          };

          const attemptQueuePrint = async (retryCount = 0): Promise<void> => {
            const maxRetries = printMethod === 'queue-fallback' ? 3 : 1;
            
            try {
              console.log(`🖨️ Submitting label PDF to print queue (attempt ${retryCount + 1}/${maxRetries})...`);
              const job = await PrintApiService.submitPrintJob({
                formName: 'labels',
                jobData: labelPrintData,
                options: {
                  priority: 'normal',
                  copies: 1
                }
              });

              console.log('✅ Label print job queued successfully:', job.id);
              
              // Record the print and update UI
              await GeneratedLabelStorageService.recordPrint(label.id);
              loadLabelsData();
              setLabelSuccess(`Label PDF queued for printing! Job ID: ${job.id.slice(0, 8)}...`);
              
              // Clear printing in progress after job is queued
              setPrintingInProgress(prev => {
                const next = new Set(prev);
                next.delete(printKey);
                return next;
              });
              
            } catch (printError) {
              console.error(`Label print queue attempt ${retryCount + 1} failed:`, printError);
              
              if (retryCount < maxRetries - 1) {
                // Retry after a short delay
                setTimeout(() => {
                  attemptQueuePrint(retryCount + 1);
                }, 2000);
                
                setLabelError(`Print queue attempt ${retryCount + 1} failed. Retrying... (${maxRetries - retryCount - 1} attempts remaining)`);
              } else {
                // All retries exhausted
                if (printMethod === 'queue-fallback') {
                  // Fallback to PDF for queue-fallback mode
                  console.log('🔄 All print queue attempts failed. Opening PDF for manual printing...');
                  const blobUrl = URL.createObjectURL(label.pdfBlob!);
                  window.open(blobUrl, '_blank');
                  
                                   await GeneratedLabelStorageService.recordPrint(label.id);
                   loadLabelsData();
                   setLabelSuccess(`Print queue failed after ${maxRetries} attempts. PDF opened for manual printing.`);
                } else {
                  // For regular queue mode, just show error
                  setLabelError(`Failed to queue label for printing after ${maxRetries} attempts. Please try again or use manual printing.`);
                }
            }
          }
        };

          // Start the print queue attempt process
          await attemptQueuePrint();
        };
        
        // If printer or client is offline, show warning dialog
        if (!printerStatus.printerOnline || !printerStatus.clientOnline) {
          setOfflinePrinterMessage(printerStatus.message);
          setPendingPrintAction(() => executeLabelPrint);
          setShowOfflinePrinterWarning(true);
          // Clear printing in progress since we're showing a dialog
          setPrintingInProgress(prev => {
            const next = new Set(prev);
            next.delete(printKey);
            return next;
          });
          return;
        }
        
        // Printer is online, proceed with printing
        await executeLabelPrint();
        
      } else {
        // Use PDF method - open in new tab
        console.log('📄 Opening label PDF in new tab...');
        const blobUrl = URL.createObjectURL(label.pdfBlob);
        window.open(blobUrl, '_blank');
        
        // Record the print
        await GeneratedLabelStorageService.recordPrint(label.id);
        loadLabelsData();
        setLabelSuccess('Label PDF opened in new tab for printing!');
        
        // Clear printing in progress for PDF method
        setPrintingInProgress(prev => {
          const next = new Set(prev);
          next.delete(printKey);
          return next;
        });
      }
      
    } catch (error) {
      console.error('Error reprinting label:', error);
      const printMethod = localStorage.getItem('labelPrintMethod');
      setLabelError(printMethod === 'queue' || printMethod === 'queue-fallback' ? 'Failed to queue label PDF for printing' : 'Failed to reprint label');
      
      // Clear printing in progress on error
      setPrintingInProgress(prev => {
        const next = new Set(prev);
        next.delete(printKey);
        return next;
      });
    }
  };

  const handleArchiveLabel = async (id: string) => {
    try {
      const userName = localStorage.getItem('userName') || 'Unknown User';
      await GeneratedLabelStorageService.archiveGeneratedLabel(id, userName);
      setLabelSuccess('Label archived successfully!');
      loadLabelsData();
    } catch (error) {
      setLabelError('Failed to archive label');
    }
  };

  const handleDeleteLabel = async (id: string) => {
    console.log('🗑️ Attempting to delete label with ID:', id);
    if (window.confirm('Are you sure you want to delete this label? This action cannot be undone.')) {
      try {
        const success = await GeneratedLabelStorageService.deleteGeneratedLabel(id);
        if (success) {
          console.log('✅ Label deleted successfully');
          setLabelSuccess('Label deleted successfully!');
          loadLabelsData();
        } else {
          console.warn('⚠️ Label not found or already deleted');
          setLabelError('Label not found or already deleted');
        }
      } catch (error) {
        console.error('❌ Error deleting label:', error);
        setLabelError('Failed to delete label');
      }
    } else {
      console.log('❌ Label deletion cancelled by user');
    }
  };

  // Handle copies dialog confirmation for generated labels
  const handleCopiesConfirm = async (copies: number) => {
    if (!pendingPrintLabel) return;

    try {
      // Use print settings from state (loaded from server or localStorage)
      const printMethod = labelPrintMethod;
      const printerId = labelPrinterId;
      const orientation = labelPrintOrientation;
      const autoCut = labelAutoCut;
      const labelToPrint = pendingPrintLabel; // Capture for closure

      // Check if queue printing is enabled
      if ((printMethod === 'queue' || printMethod === 'queue-fallback') && printerId) {
        // Check printer status before submitting
        const printerStatus = await PrintApiService.checkPrinterStatus(printerId);
        
        // Define the actual print action
        const executeCopiesPrint = async () => {
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
            reader.readAsDataURL(labelToPrint.pdfBlob!);
          });

          // Prepare job data with PDF content
          const labelPrintData = {
            type: 'pdf-print',
            pdfData: pdfBase64,
            filename: `label-${labelToPrint.templateName}-${Date.now()}.pdf`,
            printerId: printerId,
            autoCut: autoCut,
            labelInfo: {
              templateName: labelToPrint.templateName,
              labelData: labelToPrint.labelData,
              createdBy: labelToPrint.createdBy,
              createdDate: labelToPrint.createdDate
            },
            metadata: {
              documentType: 'generated-label',
              generated: new Date().toISOString(),
              source: 'generated-labels-deck-with-copies',
              orientation: orientation,
              autoCut: autoCut
            }
          };

          const attemptQueuePrint = async (retryCount = 0): Promise<void> => {
            const maxRetries = printMethod === 'queue-fallback' ? 3 : 1;
            
            try {
              console.log(`🖨️ Submitting label PDF to print queue with ${copies} copies (attempt ${retryCount + 1}/${maxRetries})...`);
              const job = await PrintApiService.submitPrintJob({
                formName: 'labels',
                jobData: labelPrintData,
                options: {
                  priority: 'normal',
                  copies: copies
                }
              });

              console.log('✅ Label print job queued successfully:', job.id);
              
              // Record the print and update UI
              await GeneratedLabelStorageService.recordPrint(labelToPrint.id);
              loadLabelsData();
              setLabelSuccess(`Label PDF queued for printing with ${copies} copies! Job ID: ${job.id.slice(0, 8)}...`);
              
            } catch (printError) {
              console.error(`Label print queue attempt ${retryCount + 1} failed:`, printError);
              
              if (retryCount < maxRetries - 1) {
                // Retry after a short delay
                setTimeout(() => {
                  attemptQueuePrint(retryCount + 1);
                }, 2000);
                
                setLabelError(`Print queue attempt ${retryCount + 1} failed. Retrying... (${maxRetries - retryCount - 1} attempts remaining)`);
              } else {
                // All retries exhausted
                if (printMethod === 'queue-fallback') {
                  // Fallback to PDF for queue-fallback mode
                  console.log('🔄 All print queue attempts failed. Opening PDF for manual printing...');
                  const blobUrl = URL.createObjectURL(labelToPrint.pdfBlob!);
                  window.open(blobUrl, '_blank');
                  
                  await GeneratedLabelStorageService.recordPrint(labelToPrint.id);
                  loadLabelsData();
                  setLabelSuccess(`Print queue failed after ${maxRetries} attempts. PDF opened for manual printing.`);
                } else {
                  // For regular queue mode, just show error
                  setLabelError(`Failed to queue label for printing after ${maxRetries} attempts. Please try again or use manual printing.`);
                }
              }
            }
          };

          // Start the print queue attempt process
          await attemptQueuePrint();
          
          // Close dialog and reset state
          setShowCopiesDialog(false);
          setPendingPrintLabel(null);
          setSelectedCopies(1);
        };
        
        // If printer or client is offline, show warning dialog
        if (!printerStatus.printerOnline || !printerStatus.clientOnline) {
          // Close the copies dialog first
          setShowCopiesDialog(false);
          
          setOfflinePrinterMessage(printerStatus.message);
          setPendingPrintAction(() => executeCopiesPrint);
          setShowOfflinePrinterWarning(true);
          return;
        }
        
        // Printer is online, proceed with printing
        await executeCopiesPrint();
        return; // Already handled dialog close in executeCopiesPrint
        
      } else {
        // Use PDF method - open in new tab
        console.log('📄 Opening label PDF in new tab...');
        const blobUrl = URL.createObjectURL(pendingPrintLabel.pdfBlob!);
        window.open(blobUrl, '_blank');
        
        // Record the print
        await GeneratedLabelStorageService.recordPrint(pendingPrintLabel.id);
        loadLabelsData();
        setLabelSuccess('Label PDF opened in new tab for printing!');
      }

      // Close dialog and reset state
      setShowCopiesDialog(false);
      setPendingPrintLabel(null);
      setSelectedCopies(1);
      
    } catch (error) {
      console.error('Error printing label with copies:', error);
      setLabelError('Failed to print label with copies');
      setShowCopiesDialog(false);
      setPendingPrintLabel(null);
      setSelectedCopies(1);
    }
  };

  const handleLabelCreated = () => {
    // Refresh labels list (same pattern as static stickers)
    loadLabelsData();
    
    // Set success message (same pattern as static stickers)
    setLabelSuccess('Label created and saved successfully!');

    // Clear success message after 3 seconds (same pattern as static stickers)
    setTimeout(() => setLabelSuccess(''), 3000);
  };

  const handleLabelPrintSettingsChange = (printMethod: 'pdf' | 'queue' | 'queue-fallback', printerId?: string, orientation?: string, autoPrint?: boolean) => {
    // Reload all print settings to get the latest hierarchy resolution
    loadPrintSettings();
    
    // Update local state immediately for responsiveness
    setLabelPrintMethod(printMethod);
    setLabelPrinterId(printerId || '');
    
    // Update orientation and autoPrint if provided
    if (orientation) {
      setLabelPrintOrientation(orientation as 'portrait' | 'landscape');
    }
    if (autoPrint !== undefined) {
      setLabelPrintAutoPrint(autoPrint);
    }
    
    // Reload settings from localStorage if not provided
    const savedOrientation = orientation || (localStorage.getItem('labelPrintOrientation') as 'portrait' | 'landscape') || 'portrait';
    const savedAutoPrint = autoPrint !== undefined ? autoPrint : (localStorage.getItem('labelPrintAutoPrint') === 'true');
    
    if ((printMethod === 'queue' || printMethod === 'queue-fallback') && printerId) {
      const autoPrintText = savedAutoPrint ? ' with auto-print enabled' : '';
      const fallbackText = printMethod === 'queue-fallback' ? ' (with PDF fallback on failure)' : '';
      setLabelSuccess(`Print queue enabled for labels${autoPrintText}${fallbackText}. Will print to configured printer in ${savedOrientation} orientation.`);
    } else {
      setLabelSuccess(`Print settings updated. Labels will open as PDFs in ${savedOrientation} orientation.`);
    }
  };

  // Helper function to check if a print action is rate-limited
  const isPrintRateLimited = (itemId: string): boolean => {
    const lastPrintTime = printCooldownRef.current.get(itemId);
    if (lastPrintTime && Date.now() - lastPrintTime < PRINT_COOLDOWN_MS) {
      return true;
    }
    return false;
  };
  
  // Helper function to set print cooldown
  const setPrintCooldown = (itemId: string) => {
    printCooldownRef.current.set(itemId, Date.now());
    // Clean up old entries after cooldown expires
    setTimeout(() => {
      printCooldownRef.current.delete(itemId);
    }, PRINT_COOLDOWN_MS + 1000);
  };

  const handlePrintSticker = async (sticker: StaticSticker) => {
    // Rate limiting check
    const printKey = `sticker-${sticker.id}`;
    if (isPrintRateLimited(printKey)) {
      setStickerError('Please wait a moment before printing again');
      return;
    }
    if (printingInProgress.has(printKey)) {
      setStickerError('Print job already in progress');
      return;
    }
    
    // Set rate limit and mark as in progress
    setPrintCooldown(printKey);
    setPrintingInProgress(prev => new Set(prev).add(printKey));
    
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
        // Check printer status before submitting
        console.log('🔍 Checking printer status for:', stickerPrinterId);
        const printerStatus = await PrintApiService.checkPrinterStatus(stickerPrinterId);
        console.log('🔍 Printer status result:', printerStatus);
        
        // Define the actual print action
        const executePrint = async () => {
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
              source: 'static-sticker-deck'
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
          setStickerSuccess(`Sticker PDF queued for printing! Job ID: ${job.id.slice(0, 8)}...`);
          loadStickersData();
          
          // Clear printing in progress after job is queued
          setPrintingInProgress(prev => {
            const next = new Set(prev);
            next.delete(printKey);
            return next;
          });
        };
        
        // If printer or client is offline, show warning dialog
        if (!printerStatus.printerOnline || !printerStatus.clientOnline) {
          setOfflinePrinterMessage(printerStatus.message);
          setPendingPrintAction(() => executePrint);
          setShowOfflinePrinterWarning(true);
          // Clear printing in progress since we're showing a dialog
          setPrintingInProgress(prev => {
            const next = new Set(prev);
            next.delete(printKey);
            return next;
          });
          return;
        }
        
        // Printer is online, proceed with printing
        await executePrint();
      } else {
        // Use PDF method - open in new tab
        console.log('📄 Opening PDF in new tab...');
        console.log('🔄 Using orientation:', stickerPrintOrientation);
        await PDFGeneratorService.openStickerPDF(sticker, orientedSettings);
        
        await StickerStorageService.saveSticker({ ...sticker, printed: true });
        setStickerSuccess('PDF opened in new tab successfully!');
        loadStickersData();
        
        // Clear printing in progress for PDF method (no queue tracking needed)
        setPrintingInProgress(prev => {
          const next = new Set(prev);
          next.delete(printKey);
          return next;
        });
      }
    } catch (error) {
      console.error('Error printing sticker:', error);
      setStickerError(stickerPrintMethod === 'queue' ? 'Failed to queue sticker PDF for printing' : 'Failed to generate PDF');
      
      // Clear printing in progress on error
      setPrintingInProgress(prev => {
        const next = new Set(prev);
        next.delete(printKey);
        return next;
      });
    }
  };
  
  // Handle confirming print despite offline printer
  const handleConfirmOfflinePrint = async () => {
    setShowOfflinePrinterWarning(false);
    if (pendingPrintAction) {
      try {
        await pendingPrintAction();
      } catch (error) {
        console.error('Error executing pending print action:', error);
        setStickerError('Failed to queue print job');
      }
    }
    setPendingPrintAction(null);
  };
  
  // Handle canceling print due to offline printer
  const handleCancelOfflinePrint = () => {
    setShowOfflinePrinterWarning(false);
    setPendingPrintAction(null);
    setStickerError('Print cancelled - printer or print client is offline');
  };

  const handleShowQR = (sticker: StaticSticker) => {
    setSelectedSticker(sticker);
    setShowQRDialog(true);
  };

  // Load print settings with hierarchical resolution:
  // 1. User settings (if isUserOverride is true)
  // 2. Location defaults
  // 3. System defaults (PDF method)
  const loadPrintSettings = async () => {
    try {
      // Get current location ID
      const currentLocationId = localStorage.getItem('selectedLocationId');
      
      // Load user settings from server
      const userSettings = await getUserSettings();
      
      // Load location defaults if we have a location
      let locationDefaults: LocationPrintDefaults = { stickers: null, labels: null };
      if (currentLocationId) {
        try {
          locationDefaults = await LocationPrintDefaultsService.getLocationDefaults(currentLocationId);
          console.log('📍 Loaded location print defaults:', locationDefaults);
        } catch (locErr) {
          console.warn('Failed to load location print defaults:', locErr);
        }
      }
      
      // Resolve LABEL settings with hierarchy
      const resolvedLabelSettings = LocationPrintDefaultsService.resolveSettings(
        userSettings,
        locationDefaults.labels,
        'labels'
      );
      
      setLabelPrintMethod(resolvedLabelSettings.printMethod);
      setLabelPrinterId(resolvedLabelSettings.printerId);
      setLabelPrintOrientation(resolvedLabelSettings.orientation);
      setLabelPrintAutoPrint(resolvedLabelSettings.autoPrint);
      setLabelAutoCut(resolvedLabelSettings.autoCut);
      setLabelSettingsSource(resolvedLabelSettings.source);
      
      console.log(`🏷️ Label settings resolved from: ${resolvedLabelSettings.source}`, resolvedLabelSettings);
      
      // Resolve STICKER settings with hierarchy
      const resolvedStickerSettings = LocationPrintDefaultsService.resolveSettings(
        userSettings,
        locationDefaults.stickers,
        'stickers'
      );
      
      setStickerPrintMethod(resolvedStickerSettings.printMethod);
      setStickerPrinterId(resolvedStickerSettings.printerId);
      setStickerPrintOrientation(resolvedStickerSettings.orientation);
      setStickerPrintAutoPrint(resolvedStickerSettings.autoPrint);
      setStickerSettingsSource(resolvedStickerSettings.source);
      
      console.log(`🏷️ Sticker settings resolved from: ${resolvedStickerSettings.source}`, resolvedStickerSettings);
      
    } catch (err) {
      console.error('Failed to load print settings, using localStorage fallback:', err);
      
      // Fallback to localStorage if server fails
      const savedLabelPrintMethod = (localStorage.getItem('labelPrintMethod') as 'pdf' | 'queue' | 'queue-fallback') || 'pdf';
      const savedLabelPrinterId = localStorage.getItem('labelPrinterId') || '';
      const savedLabelOrientation = (localStorage.getItem('labelPrintOrientation') as 'portrait' | 'landscape') || 'portrait';
      const savedLabelAutoPrint = localStorage.getItem('labelPrintAutoPrint') === 'true';
      const savedLabelAutoCut = localStorage.getItem('labelPrintAutoCut') !== 'false';
      setLabelPrintMethod(savedLabelPrintMethod);
      setLabelPrinterId(savedLabelPrinterId);
      setLabelPrintOrientation(savedLabelOrientation);
      setLabelPrintAutoPrint(savedLabelAutoPrint);
      setLabelAutoCut(savedLabelAutoCut);
      setLabelSettingsSource('system');
      
      const savedPrintMethod = (localStorage.getItem('stickerPrintMethod') as 'pdf' | 'queue' | 'queue-fallback') || 'pdf';
      const savedPrinterId = localStorage.getItem('stickerPrinterId') || '';
      const savedOrientation = (localStorage.getItem('stickerPrintOrientation') as 'portrait' | 'landscape') || 'portrait';
      const savedAutoPrint = localStorage.getItem('stickerPrintAutoPrint') === 'true';
      setStickerPrintMethod(savedPrintMethod);
      setStickerPrinterId(savedPrinterId);
      setStickerPrintOrientation(savedOrientation);
      setStickerPrintAutoPrint(savedAutoPrint);
      setStickerSettingsSource('system');
    }
  };

  useEffect(() => {
    loadQuickChecks();
    loadStickersData();
    loadLabelsData();
    loadPrintSettings();
    
    // Initialize audio context for notification sounds
    console.log('🔊 Initializing notification sounds');
    
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      setAudioContext(context);
      console.log('🔊 Audio context initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize audio context:', error);
    }
    

    
    // No polling needed - WebSocket handles real-time updates
    // Only refresh on initial load and manual refresh button clicks
  }, []);

  // Reload data when user location changes
  useEffect(() => {
    if (effectiveLocation) {
      console.log('Effective location changed, reloading location-specific data:', effectiveLocation.name);
      loadQuickChecks();
      loadStickersData();
      loadLabelsData();
      
      // Initialize location data for existing items
      LocationAwareStorageService.initializeLocationData();
    }
  }, [effectiveLocation?.id]);

  // iOS Audio Initialization on User Interaction
  useEffect(() => {
    if (isIOSSafari()) {
      console.log('📱 iOS Safari detected, setting up user interaction handlers');
      
      const handleUserInteraction = () => {
        console.log('👆 User interaction detected, initializing audio for iOS');
        initializeAudioForIOS();
        
        // Show a subtle notification that audio is ready
        if (!audioInitialized) {
          setNotificationStack(prev => [{
            id: 'ios-audio-ready',
            type: 'info' as any,
            message: '🔊 Audio notifications enabled',
            user: 'System',
            vehicle: 'iOS Device',
            timestamp: Date.now(),
            open: true
          }, ...prev.slice(0, 2)]);
          
          // Auto-close the iOS audio notification after 3 seconds
          setTimeout(() => {
            setNotificationStack(prev => 
              prev.map(notification => 
                notification.id === 'ios-audio-ready' 
                  ? { ...notification, open: false }
                  : notification
              )
            );
          }, 3000);
        }
        
        // Remove listeners after first interaction
        document.removeEventListener('touchstart', handleUserInteraction);
        document.removeEventListener('click', handleUserInteraction);
        document.removeEventListener('keydown', handleUserInteraction);
      };
      
      // Add listeners for iOS audio unlock
      document.addEventListener('touchstart', handleUserInteraction, { once: true });
      document.addEventListener('click', handleUserInteraction, { once: true });
      document.addEventListener('keydown', handleUserInteraction, { once: true });
      
      return () => {
        document.removeEventListener('touchstart', handleUserInteraction);
        document.removeEventListener('click', handleUserInteraction);
        document.removeEventListener('keydown', handleUserInteraction);
      };
    }
  }, [audioInitialized]);


  // Export test function for debugging
  useEffect(() => {
    (window as any).testWebSocket = () => {
      console.log('🧪 Testing WebSocket connection...');
      console.log('Connection status:', {
        isConnected,
        connectionStatus,
        inProgressCount: inProgressChecks.length,
        submittedCount: submittedChecks.length
      });
      
      // Test the WebSocket service directly
      import('../services/websocketService').then(({ websocketService }) => {
        websocketService.testConnection();
      });
    };
  }, [isConnected, connectionStatus, inProgressChecks.length, submittedChecks.length]);

  // Handle when selectedSticker changes (for updating existing stickers)
  useEffect(() => {
    if (selectedSticker && showCreateStickerForm) {
      setStickerFormData({
        vin: selectedSticker.vin,
        oilTypeId: '',
        mileage: selectedSticker.mileage,
      });
      if (selectedSticker.decodedDetails) {
        setDecodedVin(selectedSticker.decodedDetails);
      }
    }
  }, [selectedSticker, showCreateStickerForm]);


  const handleCreateStickerFormClose = () => {
    setShowCreateStickerForm(false);
    setSelectedSticker(null);
    setStickerFormData({
      vin: '',
      oilTypeId: '',
      mileage: 0,
    });
    setDecodedVin(null);
    setStickerError('');
    setStickerSuccess('');
  };

  const handleStickerPrintSettingsChange = (printMethod: 'pdf' | 'queue' | 'queue-fallback', printerId?: string, orientation?: string, autoPrint?: boolean) => {
    // Reload all print settings to get the latest hierarchy resolution
    loadPrintSettings();
    
    // Update local state immediately for responsiveness
    setStickerPrintMethod(printMethod);
    setStickerPrinterId(printerId || '');
    
    // Update orientation and autoPrint if provided
    if (orientation) {
      setStickerPrintOrientation(orientation as 'portrait' | 'landscape');
    }
    if (autoPrint !== undefined) {
      setStickerPrintAutoPrint(autoPrint);
    }
    
    // Reload settings from localStorage if not provided
    const savedOrientation = orientation || (localStorage.getItem('stickerPrintOrientation') as 'portrait' | 'landscape') || 'portrait';
    const savedAutoPrint = autoPrint !== undefined ? autoPrint : (localStorage.getItem('stickerPrintAutoPrint') === 'true');
    
    if ((printMethod === 'queue' || printMethod === 'queue-fallback') && printerId) {
      const autoPrintText = savedAutoPrint ? ' with auto-print enabled' : '';
      const fallbackText = printMethod === 'queue-fallback' ? ' (with PDF fallback on failure)' : '';
      setStickerSuccess(`Print queue enabled for stickers${autoPrintText}${fallbackText}. Will print to configured printer in ${savedOrientation} orientation.`);
    } else {
      setStickerSuccess(`Print settings updated. Stickers will open as PDFs in ${savedOrientation} orientation.`);
    }
  };

  const handleArchive = async (id: number) => {
    try {
      setArchivingId(id);
      const item = [...inProgressChecks, ...submittedChecks].find(c => c.id === id);
      const fid = item?.firestoreId ?? String(id);
      await archiveQuickCheck(fid);
    } catch (err: any) {
      setError('Failed to archive inspection');
    } finally {
      setArchivingId(null);
    }
  };

  const handleArchiveClick = (quickCheckId: number) => {
    setConfirmArchiveDialog({ open: true, quickCheckId });
  };

  const handleConfirmArchive = async () => {
    if (confirmArchiveDialog.quickCheckId) {
      await handleArchive(confirmArchiveDialog.quickCheckId);
      setConfirmArchiveDialog({ open: false, quickCheckId: null });
    }
  };

  const handleCancelArchive = () => {
    setConfirmArchiveDialog({ open: false, quickCheckId: null });
  };

  const handleDelete = async (id: number) => {
    try {
      setDeletingId(id);
      const item = [...inProgressChecks, ...submittedChecks].find(c => c.id === id);
      const fid = item?.firestoreId ?? String(id);
      if (item?.status === 'draft' || item?.status === 'in_progress') {
        // In-progress inspections live in the 'drafts' collection
        await deleteDraftById(fid);
      } else {
        // Submitted / archived inspections live in the 'inspections' collection
        await deleteQuickCheck(fid);
      }
    } catch (err: any) {
      setError('Failed to delete inspection');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteClick = (quickCheckId: number) => {
    setConfirmDeleteDialog({ open: true, quickCheckId });
  };

  const handleConfirmDelete = async () => {
    if (confirmDeleteDialog.quickCheckId) {
      await handleDelete(confirmDeleteDialog.quickCheckId);
      setConfirmDeleteDialog({ open: false, quickCheckId: null });
    }
  };

  const handleCancelDelete = () => {
    setConfirmDeleteDialog({ open: false, quickCheckId: null });
  };

  const handleViewDetails = (quickCheck: QuickCheck) => {
    setSelectedQuickCheck(quickCheck);
    setDetailDialogOpen(true);
  };

  const handleCardClick = (quickCheck: QuickCheck) => {
    if (quickCheck.status === 'draft' || quickCheck.status === 'in_progress') {
      const iType = quickCheck.data?.inspection_type || 'quick_check';
      const route = iType === 'vsi' ? '/vsi' : iType === 'no_check' ? '/no-check' : '/quick-check';
      navigate(route);
    } else {
      navigate(`/quick-check/${quickCheck.id}`);
    }
  };

  const handleCloseDetailDialog = () => {
    setDetailDialogOpen(false);
    setSelectedQuickCheck(null);
  };

  // Detail view functions for labels and stickers
  const handleItemClick = async (item: GeneratedLabel | StaticSticker) => {
    setSelectedItem(item);
    setDetailDialogOpen(true);
    setIsEditing(false);
    setEditingSticker({});
    
    // Generate PDF preview
    await generatePdfPreview(item);
  };

  const generatePdfPreview = async (item: GeneratedLabel | StaticSticker) => {
    setGeneratingPdf(true);
    try {
      if ('templateId' in item) {
        // Generated label
        if (item.pdfBlob) {
          const url = URL.createObjectURL(item.pdfBlob);
          setPdfPreviewUrl(url);
        } else {
          // Regenerate PDF if blob is missing
          const template = labelTemplates.find((t: any) => t.id === item.templateId);
          if (template) {
            const pdfBytes = await LabelPdfGenerator.generateLabelPdf(template, item.labelData, 1);
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            setPdfPreviewUrl(url);
          }
        }
      } else {
        // Static sticker
        const stickerSettings = StickerStorageService.getSettings();
        const blob = await PDFGeneratorService.generateStickerPDFBlob(item, stickerSettings);
        const url = URL.createObjectURL(blob);
        setPdfPreviewUrl(url);
      }
    } catch (err) {
      console.error('Error generating PDF preview:', err);
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleCloseDetail = () => {
    setDetailDialogOpen(false);
    setSelectedItem(null);
    setIsEditing(false);
    setEditingSticker({});
    setEditingLabel({});
    if (pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl);
      setPdfPreviewUrl(null);
    }
  };

  const handleEdit = () => {
    if (selectedItem && 'vin' in selectedItem) {
      setEditingSticker({ ...selectedItem });
      setIsEditing(true);
    } else if (selectedItem && 'templateId' in selectedItem) {
      setEditingLabel({ ...selectedItem });
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (selectedItem && 'vin' in selectedItem && editingSticker) {
      try {
        const updatedSticker = { ...selectedItem, ...editingSticker };
        await StickerStorageService.saveSticker(updatedSticker);
        const allStickers = await StickerStorageService.getActiveStickers();
        setActiveStickers(Array.isArray(allStickers) ? allStickers : []);
        setSelectedItem(updatedSticker);
        setIsEditing(false);
        setEditingSticker({});
        
        // Regenerate PDF preview
        await generatePdfPreview(updatedSticker);
        setStickerSuccess('Sticker updated and PDF preview refreshed!');
      } catch (error) {
        console.error('Error saving sticker:', error);
      }
    } else if (selectedItem && 'templateId' in selectedItem && editingLabel) {
      try {
        const updatedLabel = { ...selectedItem, ...editingLabel };
        // Save the label with location
        const labelWithLocation = effectiveLocation?.id 
          ? LocationAwareStorageService.createLocationAwareLabel(updatedLabel, effectiveLocation.id)
          : (() => { GeneratedLabelStorageService.saveGeneratedLabel(updatedLabel); return updatedLabel; })();
        // Reload labels with location filtering
        if (effectiveLocation?.id) {
          const labels = await LocationAwareStorageService.getActiveLabelsByLocation(effectiveLocation.id);
          setActiveLabels(Array.isArray(labels) ? labels : []);
        } else {
          const labels = await GeneratedLabelStorageService.getActiveGeneratedLabels();
          setActiveLabels(Array.isArray(labels) ? labels : []);
        }
        setSelectedItem(labelWithLocation);
        setIsEditing(false);
        setEditingLabel({});
        
        // Regenerate PDF preview
        await generatePdfPreview(updatedLabel);
      } catch (error) {
        console.error('Error saving label:', error);
      }
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingSticker({});
    setEditingLabel({});
  };

  // Function to show timing information
  const handleShowTiming = async (quickCheckId: number) => {
    setTimingLoading(true);
    try {
      const timing = await getTimingSummary(quickCheckId);
      setTimingData(timing);
      setShowTimingDialog(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to get timing summary');
    } finally {
      setTimingLoading(false);
    }
  };

  // Function to format duration in human readable format
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const remainingSeconds = seconds % 60;
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    }
  };

  const formatDurationFromTimestamps = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}d ${diffHours % 24}h`;
    } else if (diffHours > 0) {
      return `${diffHours}h ${diffMins % 60}m`;
    } else {
      return `${diffMins}m`;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getVehicleDetailsFromVin = (formData: any): string => {
    const year = formData.year || '';
    const make = formData.make || '';
    const model = formData.model || '';
    const engine = formData.engine || '';
    const engineCylinders = formData.engineCylinders || '';
    
    // Format engine displacement to max 2 decimal places
    const formattedEngine = engine ? parseFloat(engine).toFixed(2).replace(/\.?0+$/, '') + 'L' : '';
    
    const parts = [year, make, model, formattedEngine, engineCylinders ? engineCylinders + ' cyl' : ''].filter(Boolean);
    
    if (parts.length > 0) {
      return parts.join(' ');
    } else {
      return 'Unknown Vehicle';
    }
  };

  const getVehicleDetailsFromVinData = async (formData: any): Promise<string> => {
    // Check if we have vehicle_details field (formatted vehicle info)
    if (formData.vehicle_details && formData.vehicle_details.trim()) {
      return formData.vehicle_details;
    }
    
    // Check if we have decoded VIN data in the form
    if (formData.decodedVin && formData.decodedVin.Results && Array.isArray(formData.decodedVin.Results)) {
      const getValue = (variable: string) => {
        const result = formData.decodedVin.Results.find((r: any) => r.Variable === variable);
        return result && result.Value && result.Value !== 'Not Available' ? result.Value : null;
      };
      
      const year = getValue('Model Year');
      const make = getValue('Make');
      const model = getValue('Model');
      const engine = getValue('Displacement (L)');
      const engineCylinders = getValue('Engine Number of Cylinders');
      
      // Format engine displacement to max 2 decimal places
      const formattedEngine = engine ? parseFloat(engine).toFixed(2).replace(/\.?0+$/, '') + 'L' : '';
      
      const parts = [year, make, model, formattedEngine, engineCylinders ? engineCylinders + ' cyl' : ''].filter(Boolean);
      
      if (parts.length > 0) {
        return parts.join(' ');
      }
    }
    
    // Try to decode VIN on the fly if we have a VIN but no vehicle details
    if (formData.vin && formData.vin.length === 17 && !formData.vehicle_details) {
      try {
        console.log('🔍 Attempting to decode VIN on the fly for notification:', formData.vin);
        const decodedData = await decodeVinCached(formData.vin);
        const formattedDetails = formatVehicleDetails(decodedData);
        if (formattedDetails) {
          console.log('✅ Successfully decoded VIN for notification:', formattedDetails);
          return formattedDetails;
        }
      } catch (error) {
        console.log('❌ Failed to decode VIN for notification:', error);
      }
    }
    
    // Fallback to basic VIN data
    const year = formData.year || '';
    const make = formData.make || '';
    const model = formData.model || '';
    const engine = formData.engine || '';
    const engineCylinders = formData.engineCylinders || '';
    
    // Format engine displacement to max 2 decimal places
    const formattedEngine = engine ? parseFloat(engine).toFixed(2).replace(/\.?0+$/, '') + 'L' : '';
    
    const parts = [year, make, model, formattedEngine, engineCylinders ? engineCylinders + ' cyl' : ''].filter(Boolean);
    
    if (parts.length > 0) {
      return parts.join(' ');
    } else {
      return 'Unknown Vehicle';
    }
  };

  const playNotificationSound = async (type: 'created' | 'saved' | 'canceled') => {
    // Initialize audio if not already done (required for iOS)
    if (!audioInitialized) {
      await initializeAudioForIOS();
    }
    
    if (!audioContext) {
      console.warn('⚠️ Audio context not available');
      return;
    }

    try {
      // iOS Safari requires context to be resumed on each play
      if (audioContext.state === 'suspended') {
        console.log('🔊 Resuming audio context for iOS...');
        await audioContext.resume();
      }

      // iPhone Pulse sound implementation for created notifications
      if (type === 'created') {
        const playIPhonePulseSound = () => {
          const now = audioContext.currentTime;
          
          // iPhone Pulse sound frequencies (approximation)
          const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
          const durations = [0.08, 0.12, 0.16]; // Different durations for each note
          
          frequencies.forEach((freq, index) => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Set frequency
            oscillator.frequency.setValueAtTime(freq, now);
            
            // Create envelope for each note - Pulse has a quick attack and gentle decay
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.4, now + 0.005); // Quick attack
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + durations[index]);
            
            oscillator.start(now);
            oscillator.stop(now + durations[index]);
          });
          
          // Add a second pulse with slight delay
          setTimeout(() => {
            const secondNow = audioContext.currentTime;
            const secondFrequencies = [659.25, 783.99]; // E5, G5
            const secondDurations = [0.06, 0.1];
            
            secondFrequencies.forEach((freq, index) => {
              const oscillator = audioContext.createOscillator();
              const gainNode = audioContext.createGain();
              
              oscillator.connect(gainNode);
              gainNode.connect(audioContext.destination);
              
              oscillator.frequency.setValueAtTime(freq, secondNow);
              
              gainNode.gain.setValueAtTime(0, secondNow);
              gainNode.gain.linearRampToValueAtTime(0.3, secondNow + 0.003);
              gainNode.gain.exponentialRampToValueAtTime(0.01, secondNow + secondDurations[index]);
              
              oscillator.start(secondNow);
              oscillator.stop(secondNow + secondDurations[index]);
            });
          }, 120); // 120ms delay for the second pulse
        };
        
        playIPhonePulseSound();
        console.log('🔊 Playing iPhone Pulse sound for created notification');
      } else if (type === 'canceled') {
        // Deletion sound - descending error-like tone
        const playDeletionSound = () => {
          const now = audioContext.currentTime;
          
          // Create a descending tone pattern for deletion
          const frequencies = [800, 600, 400]; // Descending frequencies
          const durations = [0.15, 0.2, 0.25]; // Increasing durations
          
          frequencies.forEach((freq, index) => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Set frequency
            oscillator.frequency.setValueAtTime(freq, now + (index * 0.1)); // Staggered start
            
            // Create envelope - error sound has a sharp attack and longer decay
            gainNode.gain.setValueAtTime(0, now + (index * 0.1));
            gainNode.gain.linearRampToValueAtTime(0.5, now + (index * 0.1) + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + (index * 0.1) + durations[index]);
            
            oscillator.start(now + (index * 0.1));
            oscillator.stop(now + (index * 0.1) + durations[index]);
          });
        };
        
        playDeletionSound();
        console.log('🔊 Playing deletion sound for canceled notification');
      } else {
        // For saved notifications, use a simple confirmation sound
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
        
        console.log('🔊 Playing saved notification sound');
      }
    } catch (error) {
      console.error('Failed to play notification sound:', error);
    }
  };

  // Check if this is a duplicate notification (same type, vehicle, within 5 seconds)
  const isDuplicateNotification = (type: string, vehicle: string): boolean => {
    const now = Date.now();
    const timeDiff = now - lastNotification.timestamp;
    
    // Check if any notification is currently open for the same vehicle in the stack
    const hasOpenNotification = notificationStack.some(notification => 
      notification.open && notification.vehicle === vehicle
    );
    
    if (hasOpenNotification) {
      console.log('⚠️ Notification already open for this vehicle, skipping:', { type, vehicle });
      return true;
    }
    
    if (lastNotification.type === type && 
        lastNotification.vehicle === vehicle && 
        timeDiff < 5000) { // 5 seconds
      console.log('⚠️ Duplicate notification detected, skipping:', { type, vehicle, timeDiff });
      return true;
    }
    
    return false;
  };

  // Play notification sound regardless of duplicate status
  const playNotificationSoundForAction = (action: string) => {
    switch (action) {
      case 'created':
        console.log('🔊 Playing created notification sound');
        playNotificationSound('created');
        break;
      case 'saved':
      case 'submitted':
        console.log('🔊 Playing saved notification sound');
        playNotificationSound('saved');
        break;
      case 'deleted':
        console.log('🔊 Playing canceled notification sound');
        playNotificationSound('canceled');
        break;
      default:
        console.log('🔊 No sound for action:', action);
    }
  };

  // Show notification with duplicate protection
  const showNotification = (type: 'created' | 'saved' | 'canceled' | 'submitted', user: string, vehicle: string) => {
    // Always play sound regardless of duplicate status
    playNotificationSoundForAction(type);
    
    if (isDuplicateNotification(type, vehicle)) {
      return;
    }

    const message = `Inspection ${type === 'created' ? 'Created' : type === 'saved' ? 'Saved' : type === 'submitted' ? 'Submitted' : 'Canceled'} by ${user} on ${vehicle}`;
    
    setLastNotification({ type, vehicle, timestamp: Date.now() });
    
    // Add to notification stack
    const newNotification = {
      id: `${type}-${vehicle}-${Date.now()}`,
      type,
      message,
      user,
      vehicle,
      timestamp: Date.now(),
      open: true
    };
    
    setNotificationStack(prev => [newNotification, ...prev.slice(0, 2)]); // Keep only 3 notifications max
    
    // Auto-close after 1 minute
    setTimeout(() => {
      setNotificationStack(prev => 
        prev.map(notification => 
          notification.id === newNotification.id 
            ? { ...notification, open: false }
            : notification
        )
      );
    }, 60000);
  };

  // Close specific notification
  const closeNotification = (id: string) => {
    setNotificationStack(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, open: false }
          : notification
      )
    );
  };

  // Remove notification from stack after animation
  const removeNotification = (id: string) => {
    setNotificationStack(prev => prev.filter(notification => notification.id !== id));
  };

  const getDashPhoto = (quickCheck: QuickCheck) => {
    console.log('🖼️ Getting dash photo for QuickCheck:', {
      id: quickCheck.id,
      hasPhotos: !!quickCheck.data.dash_lights_photos,
      photoCount: quickCheck.data.dash_lights_photos?.length || 0,
      firstPhotoUrl: quickCheck.data.dash_lights_photos?.[0]?.url
    });
    
    if (quickCheck.data.dash_lights_photos && quickCheck.data.dash_lights_photos.length > 0) {
      const photoUrl = getUploadUrl(quickCheck.data.dash_lights_photos[0].url);
      console.log('🖼️ Using uploaded photo:', photoUrl);
      return photoUrl;
    }
    
    console.log('🖼️ Using placeholder photo');
    return getUploadUrl('/uploads/placeholder-dash.jpg');
  };

  const handleImageLoad = (quickCheckId: number) => {
    console.log('🖼️ Image loaded for QuickCheck:', quickCheckId);
    setImageLoadingStates(prev => {
      const newMap = new Map(prev);
      newMap.set(quickCheckId, false);
      return newMap;
    });
  };

  const handleImageError = (quickCheckId: number) => {
    console.log('🖼️ Image failed to load for QuickCheck:', quickCheckId);
    setImageLoadingStates(prev => {
      const newMap = new Map(prev);
      newMap.set(quickCheckId, false);
      return newMap;
    });
  };



  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <LocationIndicator 
          selectedLocation={adminSelectedLocation}
          onLocationChange={setAdminSelectedLocation}
        />
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {/* Small queue circle to the left of Oil Sticker button */}
          <PrintQueueBadge />
          <Button
            variant="contained"
            color="secondary"
            onClick={() => setShowLabelCreator(true)}
            size="small"
            sx={{ minWidth: 'auto', px: 1.5, py: 0.5, fontSize: '0.7rem' }}
          >
            Label
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setShowCreateStickerForm(true)}
            size="small"
            sx={{ minWidth: 'auto', px: 1.5, py: 0.5, fontSize: '0.7rem' }}
          >
            Oil Sticker
          </Button>
        </Box>
      </Box>
      <Box sx={{ py: 4 }}>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* WebSocket Connection Status Alert */}
        {!isConnected && !connectionStatus.reconnecting && (
          <Alert 
            severity="warning" 
            sx={{ mb: 3 }}
            action={
              <Button 
                color="inherit" 
                size="small" 
                onClick={reconnect}
                disabled={connectionStatus.reconnecting}
              >
                Reconnect
              </Button>
            }
          >
            WebSocket connection is offline. Real-time updates may not work properly.
          </Alert>
        )}

        {connectionStatus.reconnecting && (
          <Alert severity="info" sx={{ mb: 3 }}>
            Attempting to reconnect to WebSocket...
          </Alert>
        )}

        {inProgressChecks.length === 0 && submittedChecks.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No quick checks found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Quick checks will appear here once technicians start or complete inspections
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {/* Quick Checks Section Header */}
            <Box>
              <Typography variant="h5" component="h2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CarIcon color="primary" />
                Quick Check Inspections
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Vehicle inspections performed by technicians
              </Typography>
            </Box>

            {/* In Progress Section */}
            {inProgressChecks.length > 0 && (
              <Box>
                <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PlayArrowIcon color="warning" />
                  In Progress ({inProgressChecks.length})
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Vehicle inspections currently being worked on by technicians (excludes state inspections)
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* Dynamic inspection type groups */}
                  {groupVehicleInspectionsByType(inProgressChecks || []).map((group, groupIndex) => (
                    <Box key={group.type}>
                      <Typography variant="subtitle1" sx={{ mt: groupIndex > 0 ? 2 : 1 }}>
                        {group.displayName}
                      </Typography>
                      {group.inspections.map((quickCheck) => (
                        <Card 
                          key={quickCheck.id}
                          sx={{ 
                            display: 'flex',
                            flexDirection: 'row',
                            height: 'auto',
                            cursor: 'pointer',
                            border: '2px solid #ff9800',
                            ...(recentlyUpdatedCards.has(quickCheck.id) && {
                              border: '2px solid #4caf50',
                              boxShadow: '0 0 10px rgba(76, 175, 80, 0.3)',
                              animation: 'pulse 2s ease-in-out',
                              '@keyframes pulse': {
                                '0%': { boxShadow: '0 0 10px rgba(76, 175, 80, 0.3)' },
                                '50%': { boxShadow: '0 0 20px rgba(76, 175, 80, 0.6)' },
                                '100%': { boxShadow: '0 0 10px rgba(76, 175, 80, 0.3)' },
                              },
                            }),
                            '&:hover': {
                              boxShadow: 6,
                              transform: 'translateY(-2px)',
                              transition: 'all 0.3s'
                            }
                          }}
                          onClick={() => handleCardClick(quickCheck)}
                        >
                          <Box sx={{ position: 'relative', width: 200, height: 150, flexShrink: 0 }}>
                            {imageLoadingStates.get(quickCheck.id) && (
                              <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5', zIndex: 1 }}>
                                <CircularProgress size={30} />
                              </Box>
                            )}
                            <CardMedia component="img" sx={{ width: 200, height: 150, objectFit: 'cover', backgroundColor: '#f5f5f5', flexShrink: 0 }} image={getDashPhoto(quickCheck)} alt="Dashboard" onLoad={() => handleImageLoad(quickCheck.id)} onError={() => handleImageError(quickCheck.id)} />
                          </Box>
                          <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, p: 2, position: 'relative', height: 150, justifyContent: 'space-between' }}>
                            <CardContent sx={{ flexGrow: 1, p: 0, pb: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <CarIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                                <Typography variant="body2" color="text.secondary" noWrap>
                                  VIN: {quickCheck.data.vin || 'N/A'}
                                </Typography>
                              </Box>
                              {(quickCheck.data.vehicle_details || (quickCheck.data.year && quickCheck.data.make && quickCheck.data.model)) && (
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                  <CarIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                                  <Typography variant="body2" color="text.secondary" noWrap>
                                    {quickCheck.data.vehicle_details || `${quickCheck.data.year} ${quickCheck.data.make} ${quickCheck.data.model}`}
                                  </Typography>
                                </Box>
                              )}
                              {quickCheck.data.mileage && (
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                  <SpeedIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                                  <Typography variant="body2" color="text.secondary">Mileage: {quickCheck.data.mileage.toLocaleString()} mi</Typography>
                                </Box>
                              )}
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <PersonIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                                <Typography variant="body2" color="text.secondary">{quickCheck.user_name}</Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <AccessTimeIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                                <Typography variant="body2" color="text.secondary">Duration: {quickCheck.data.technician_duration ? formatDuration(quickCheck.data.technician_duration) : formatDurationFromTimestamps(quickCheck.created_at)}</Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <ScheduleIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                                <Typography variant="body2" color="text.secondary">{formatDate(quickCheck.created_at)}</Typography>
                              </Box>
                              {quickCheck.updated_at && quickCheck.updated_at !== quickCheck.created_at && (
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                  <UpdateIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>Updated: {formatDate(quickCheck.updated_at)}</Typography>
                                </Box>
                              )}
                            </CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto', mb: 1, transform: 'translateY(-17px)' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Chip label="In Progress" color="warning" size="small" icon={<PlayArrowIcon />} />
                                {recentlyUpdatedCards.has(quickCheck.id) && (<Chip label="Updated" color="success" size="small" sx={{ fontSize: '0.65rem', height: 20, '& .MuiChip-label': { px: 1 }, animation: 'fadeInOut 3s ease-in-out', '@keyframes fadeInOut': { '0%': { opacity: 0 }, '20%': { opacity: 1 }, '80%': { opacity: 1 }, '100%': { opacity: 0 } } }} />)}
                              </Box>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Tooltip title="View Timing"><IconButton onClick={(e) => { e.stopPropagation(); handleShowTiming(quickCheck.id); }} disabled={timingLoading} size="small" color="primary">{timingLoading ? (<CircularProgress size={20} />) : (<TimerIcon />)}</IconButton></Tooltip>
                                <Tooltip title="Delete Quick Check"><IconButton onClick={(e) => { e.stopPropagation(); handleDeleteClick(quickCheck.id); }} disabled={deletingId === quickCheck.id} size="small" color="error">{deletingId === quickCheck.id ? (<CircularProgress size={20} />) : (<DeleteIcon />)}</IconButton></Tooltip>
                              </Box>
                            </Box>
                          </Box>
                        </Card>
                      ))}
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {/* Submitted Section */}
            {submittedChecks.length > 0 && (
              <Box>
                <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ArchiveIcon color="primary" />
                  Submitted ({submittedChecks.length})
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Completed vehicle inspections (excludes state inspections)
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* Dynamic inspection type groups */}
                  {groupVehicleInspectionsByType(submittedChecks || []).map((group, groupIndex) => (
                    <Box key={group.type}>
                      <Typography variant="subtitle1" sx={{ mt: groupIndex > 0 ? 2 : 1 }}>
                        {group.displayName}
                      </Typography>
                      {group.inspections.map((quickCheck) => (
                        <Card key={quickCheck.id} sx={{ display: 'flex', flexDirection: 'row', height: 'auto', cursor: 'pointer', '&:hover': { boxShadow: 6, transform: 'translateY(-2px)', transition: 'all 0.3s' } }} onClick={() => handleCardClick(quickCheck)}>
                          <CardMedia component="img" sx={{ width: 200, height: 150, objectFit: 'cover', backgroundColor: '#f5f5f5', flexShrink: 0 }} image={getDashPhoto(quickCheck)} alt="Dashboard" onLoad={() => handleImageLoad(quickCheck.id)} onError={() => handleImageError(quickCheck.id)} />
                          <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, p: 2, position: 'relative', height: 150, justifyContent: 'space-between' }}>
                            <CardContent sx={{ flexGrow: 1, p: 0, pb: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <CarIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                                <Typography variant="body2" color="text.secondary" noWrap>VIN: {quickCheck.data.vin || 'N/A'}</Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <PersonIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                                <Typography variant="body2" color="text.secondary">{quickCheck.user_name}</Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <AccessTimeIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                                <Typography variant="body2" color="text.secondary">Duration: {quickCheck.data.technician_duration ? formatDuration(quickCheck.data.technician_duration) : formatDurationFromTimestamps(quickCheck.created_at)}</Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <ScheduleIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                                <Typography variant="body2" color="text.secondary">{formatDate(quickCheck.created_at)}</Typography>
                              </Box>
                            </CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto', mb: 1, transform: 'translateY(-17px)' }}>
                              <Chip label="Submitted" color="primary" size="small" />
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Tooltip title="View Timing"><IconButton onClick={(e) => { e.stopPropagation(); handleShowTiming(quickCheck.id); }} disabled={timingLoading} size="small" color="primary">{timingLoading ? (<CircularProgress size={20} />) : (<TimerIcon />)}</IconButton></Tooltip>
                                <Tooltip title="Archive Quick Check"><IconButton onClick={(e) => { e.stopPropagation(); handleArchiveClick(quickCheck.id); }} disabled={archivingId === quickCheck.id} size="small" color="secondary">{archivingId === quickCheck.id ? (<CircularProgress size={20} />) : (<ArchiveIcon />)}</IconButton></Tooltip>
                              </Box>
                            </Box>
                          </Box>
                        </Card>
                      ))}
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* Static Stickers Section */}
      <Divider sx={{ my: 4 }} />
      
      <Box sx={{ py: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h5" component="h2" gutterBottom>
              Static Stickers
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              startIcon={<SettingsIcon />}
              onClick={() => setShowStickerPrintSettings(true)}
              variant={(stickerPrintMethod === 'queue' || stickerPrintMethod === 'queue-fallback') ? "contained" : "outlined"}
              color={(stickerPrintMethod === 'queue' || stickerPrintMethod === 'queue-fallback') ? "primary" : undefined}
              size="small"
              title={(stickerPrintMethod === 'queue' || stickerPrintMethod === 'queue-fallback') ? "Print queue enabled" : "Configure print settings"}
            >
              Print Settings
            </Button>
          </Box>
        </Box>

        {/* Prompt to configure default printer if none set */}
        {stickerSettingsSource === 'system' && (
          <Alert 
            severity="warning" 
            sx={{ mb: 2 }}
            action={
              <Button 
                color="inherit" 
                size="small" 
                onClick={() => setShowStickerPrintSettings(true)}
                startIcon={<SettingsIcon />}
              >
                Configure Now
              </Button>
            }
          >
            <strong>No default sticker printer configured.</strong> Select a printer to enable automatic printing for this location.
          </Alert>
        )}

        {stickerError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setStickerError('')}>
            {stickerError}
          </Alert>
        )}

        {stickerSuccess && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setStickerSuccess('')}>
            {stickerSuccess}
          </Alert>
        )}

        {activeStickers.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="textSecondary">
              No active stickers found
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              Click the + button to create your first oil change sticker
            </Typography>
          </Paper>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {(activeStickers || []).filter(sticker => sticker && sticker.id).map((sticker) => (
              <Card 
                key={sticker.id} 
                onClick={() => handleItemClick(sticker)}
                sx={{ 
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  p: 1.5,
                  minHeight: 60,
                  cursor: 'pointer',
                  position: 'relative',
                  '&:hover': {
                    boxShadow: 3,
                    transform: 'translateY(-1px)',
                    transition: 'all 0.2s'
                  }
                }}
              >
                {/* Red X in top right corner */}
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSticker(sticker.id);
                  }}
                  title="Delete"
                  sx={{ 
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    zIndex: 10,
                    p: 0.5,
                    color: 'red',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 1)',
                      color: 'darkred'
                    }
                  }}
                >
                  <CloseIcon sx={{ fontSize: 18 }} />
                </IconButton>

                {/* Left Section - Oil Type & Vehicle Details */}
                <Box sx={{ minWidth: 180, mr: 2, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                      <OilIcon sx={{ fontSize: 16, mr: 0.5, color: 'primary.main' }} />
                      {sticker.oilType ? (
                        <Typography variant="subtitle1" component="h3" sx={{ fontSize: '0.9rem', fontWeight: 600 }}>
                          {sticker.oilType.name}
                        </Typography>
                      ) : (
                        <Chip
                          label="Select Oil Type"
                          color="warning"
                          size="small"
                          clickable
                          onClick={() => {
                            // Show dialog to select oil type for this sticker
                            setSelectedSticker(sticker);
                            setShowCreateStickerForm(true);
                          }}
                          sx={{ fontSize: '0.75rem', fontWeight: 600 }}
                        />
                      )}
                    </Box>
                    {sticker.decodedDetails && !sticker.decodedDetails.error && (
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', lineHeight: 1.2 }}>
                        {[
                          sticker.decodedDetails.year,
                          sticker.decodedDetails.make,
                          sticker.decodedDetails.model
                        ].filter(Boolean).join(' ')}
                      </Typography>
                    )}
                  </Box>
                  {/* Bottom left - VIN */}
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', mt: 'auto' }}>
                    {sticker.vin}
                  </Typography>
                </Box>

                {/* Right Section - Print Count & Icons (centered vertically) */}
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'center', 
                  alignItems: 'flex-end', 
                  height: '100%',
                  position: 'absolute',
                  right: 4,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 1
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip 
                      label={`${sticker.mileage.toLocaleString()}Mi`} 
                      color="info" 
                      size="small"
                      sx={{ fontSize: '0.65rem', height: 20, '& .MuiChip-label': { px: 1 } }}
                    />
                    
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton
                        size="medium"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShowQR(sticker);
                        }}
                        title="QR Code"
                        sx={{ p: 0.75 }}
                      >
                        <QrCodeIcon sx={{ fontSize: 20 }} />
                      </IconButton>
                      {sticker.oilType && (
                        <IconButton
                          size="medium"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrintSticker(sticker);
                          }}
                          disabled={printingInProgress.has(`sticker-${sticker.id}`) || isPrintRateLimited(`sticker-${sticker.id}`)}
                          title={
                            printingInProgress.has(`sticker-${sticker.id}`) 
                              ? "Printing..." 
                              : isPrintRateLimited(`sticker-${sticker.id}`)
                                ? "Please wait..."
                                : stickerPrintMethod === 'queue' 
                                  ? "Send to Print Queue" 
                                  : "Open PDF in New Tab"
                          }
                          sx={{ p: 0.75 }}
                        >
                          {printingInProgress.has(`sticker-${sticker.id}`) ? (
                            <CircularProgress size={20} />
                          ) : (
                            <PrintIcon sx={{ 
                              fontSize: 20, 
                              color: stickerPrintMethod === 'queue' ? 'primary.main' : 'inherit' 
                            }} />
                          )}
                        </IconButton>
                      )}
                      <IconButton
                        size="medium"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleArchiveSticker(sticker.id);
                        }}
                        title="Archive"
                        sx={{ p: 0.75 }}
                      >
                        <ArchiveIcon sx={{ fontSize: 20 }} />
                      </IconButton>
                    </Box>
                  </Box>
                </Box>

                {/* Bottom right - Date and Time created */}
                <Typography variant="body2" color="text.secondary" sx={{ 
                  fontSize: '0.75rem', 
                  position: 'absolute',
                  bottom: 4,
                  right: 4,
                  zIndex: 1
                }}>
                  {new Date(sticker.dateCreated).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  })} {new Date(sticker.dateCreated).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Typography>
              </Card>
            ))}
          </Box>
        )}
      </Box>

      {/* Generated Labels Section */}
      <Divider sx={{ my: 4 }} />
      
      <Box sx={{ py: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h5" component="h2" gutterBottom>
              Labels
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              startIcon={<SettingsIcon />}
              onClick={() => setShowLabelPrintSettings(true)}
              variant={(labelPrintMethod === 'queue' || labelPrintMethod === 'queue-fallback') ? "contained" : "outlined"}
              color={(labelPrintMethod === 'queue' || labelPrintMethod === 'queue-fallback') ? "primary" : undefined}
              size="small"
              title={(labelPrintMethod === 'queue' || labelPrintMethod === 'queue-fallback') ? "Print queue enabled" : "Configure print settings"}
            >
              Print Settings
            </Button>

          </Box>
        </Box>

        {/* Prompt to configure default printer if none set */}
        {labelSettingsSource === 'system' && (
          <Alert 
            severity="warning" 
            sx={{ mb: 2 }}
            action={
              <Button 
                color="inherit" 
                size="small" 
                onClick={() => setShowLabelPrintSettings(true)}
                startIcon={<SettingsIcon />}
              >
                Configure Now
              </Button>
            }
          >
            <strong>No default label printer configured.</strong> Select a printer to enable automatic printing for this location.
          </Alert>
        )}

        {labelError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setLabelError('')}>
            {labelError}
          </Alert>
        )}

        {labelSuccess && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setLabelSuccess('')}>
            {labelSuccess}
          </Alert>
        )}

        {(activeLabels || []).filter(label => label && label.id && !label.restocking).length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="textSecondary">
              No labels found
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              Click the "Create Label" button above to create your first label
            </Typography>
          </Paper>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {(activeLabels || []).filter(label => label && label.id && !label.restocking).map((label) => (
              <Card 
                key={label.id} 
                onClick={() => handleItemClick(label)}
                sx={{ 
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  p: 1.5,
                  minHeight: 60,
                  cursor: 'pointer',
                  position: 'relative',
                  '&:hover': {
                    boxShadow: 3,
                    transform: 'translateY(-1px)',
                    transition: 'all 0.2s'
                  }
                }}
              >
                {/* Red X in top right corner */}
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteLabel(label.id);
                  }}
                  title="Delete"
                  sx={{ 
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    zIndex: 10,
                    p: 0.5,
                    color: 'red',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 1)',
                      color: 'darkred'
                    }
                  }}
                >
                  <CloseIcon sx={{ fontSize: 18 }} />
                </IconButton>
                {/* Left Section - Template & Data */}
                <Box sx={{ minWidth: 200, mr: 2, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                      <LabelIcon sx={{ fontSize: 16, mr: 0.5, color: 'secondary.main' }} />
                      <Typography variant="subtitle1" component="h3" sx={{ fontSize: '0.9rem', fontWeight: 600 }}>
                        {label.templateName}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', lineHeight: 1.2 }}>
                      {/* Show some key field data */}
                      {Object.entries(label.labelData)
                        .filter(([key, value]) => 
                          value && 
                          key !== 'Created By' && 
                          key !== 'Created Date' && 
                          key !== 'Copies to be Printed' &&
                          !key.toLowerCase().includes('label name')
                        )
                        .slice(0, 2) // Show first 2 relevant fields
                        .map(([key, value]) => `${key}: ${value}`)
                        .join(' • ')}
                    </Typography>
                  </Box>
                  {/* Bottom left - Created by */}
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', mt: 'auto' }}>
                    {label.createdBy}
                  </Typography>
                </Box>

                {/* Right Section - Print Count & Icons (centered vertically) */}
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'center', 
                  alignItems: 'flex-end', 
                  height: '100%',
                  position: 'absolute',
                  right: 4,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 1
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip 
                      label={`Printed ${label.printCount}x`} 
                      color="info" 
                      size="small"
                      sx={{ fontSize: '0.65rem', height: 20, '& .MuiChip-label': { px: 1 } }}
                    />
                    
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton
                        size="medium"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReprintLabel(label);
                        }}
                        disabled={printingInProgress.has(`label-${label.id}`) || isPrintRateLimited(`label-${label.id}`)}
                        title={
                          printingInProgress.has(`label-${label.id}`) 
                            ? "Printing..." 
                            : isPrintRateLimited(`label-${label.id}`)
                              ? "Please wait..."
                              : "Reprint Label"
                        }
                        sx={{ p: 0.75 }}
                      >
                        {printingInProgress.has(`label-${label.id}`) ? (
                          <CircularProgress size={20} />
                        ) : (
                          <PrintIcon sx={{ fontSize: 20 }} />
                        )}
                      </IconButton>
                      <IconButton
                        size="medium"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleArchiveLabel(label.id);
                        }}
                        title="Archive"
                        sx={{ p: 0.75 }}
                      >
                        <ArchiveIcon sx={{ fontSize: 20 }} />
                      </IconButton>
                    </Box>
                  </Box>
                </Box>
                {/* Bottom right - Date and Time created */}
                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  sx={{ 
                    fontSize: '0.75rem', 
                    position: 'absolute',
                    bottom: 4,
                    right: 4,
                    zIndex: 1,
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}
                >
                  {new Date(label.createdDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  })} {new Date(label.createdDate).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Typography>
              </Card>
            ))}
          </Box>
        )}
      </Box>

      {/* Create Sticker Dialog */}
      <Dialog 
        open={showCreateStickerForm} 
        onClose={handleCreateStickerFormClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedSticker ? 'Select Oil Type for Sticker' : 'Create New Oil Change Sticker'}
        </DialogTitle>
        <DialogContent>
          {stickerError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {stickerError}
            </Alert>
          )}
          {stickerSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {stickerSuccess}
            </Alert>
          )}
          <Box sx={{ pt: 2 }}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="VIN Number"
                  value={stickerFormData.vin}
                  onChange={(e) => handleVinChange(e.target.value.toUpperCase())}
                  inputProps={{ maxLength: 17 }}
                  helperText={`${stickerFormData.vin.length}/17 characters`}
                  disabled={!!selectedSticker}
                />
                {isDecodingVin && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <CircularProgress size={16} sx={{ mr: 1 }} />
                    <Typography variant="caption">Decoding VIN...</Typography>
                  </Box>
                )}
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="Current Mileage"
                  type="text"
                  value={stickerFormData.mileage ? formatNumberWithCommas(stickerFormData.mileage) : ''}
                  onChange={(e) => {
                    const numericValue = parseFormattedNumber(e.target.value);
                    setStickerFormData(prev => ({ ...prev, mileage: numericValue }));
                  }}
                  inputRef={mileageFieldRef}
                  inputProps={{
                    inputMode: 'numeric',
                    pattern: '[0-9,]*'
                  }}
                  placeholder="0"
                  disabled={!!selectedSticker}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <FormControl fullWidth>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Oil Type {selectedSticker && <span style={{ color: '#f57c00' }}>(Required)</span>}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {oilTypes.map((oilType) => (
                      <Chip
                        key={oilType.id}
                        label={oilType.name}
                        clickable
                        color={stickerFormData.oilTypeId === oilType.id ? 'primary' : 'default'}
                        variant={stickerFormData.oilTypeId === oilType.id ? 'filled' : 'outlined'}
                        onClick={() => setStickerFormData(prev => ({ ...prev, oilTypeId: oilType.id }))}
                        sx={{
                          '&:hover': {
                            transform: 'translateY(-1px)',
                            boxShadow: 2
                          },
                          transition: 'all 0.2s'
                        }}
                      />
                    ))}
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                    {stickerFormData.oilTypeId && (() => {
                      const selectedOilType = oilTypes.find(type => type.id === stickerFormData.oilTypeId);
                      return selectedOilType ? `${selectedOilType.durationInDays} days / ${selectedOilType.mileageInterval.toLocaleString()} miles` : '';
                    })()}
                  </Typography>
                </FormControl>
              </Grid>

              {stickerFormData.oilTypeId && (
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Next Service Date"
                    type="date"
                    value={stickerFormData.dateOverride || calculateNextServiceDate(stickerFormData.oilTypeId)}
                    onChange={(e) => setStickerFormData(prev => ({ ...prev, dateOverride: e.target.value }))}
                    InputLabelProps={{
                      shrink: true,
                    }}
                  />
                </Grid>
              )}

              {decodedVin && decodedVin.Results && (
                <Grid size={12}>
                  <Paper sx={{ p: 2, bgcolor: 'success.light', color: 'success.contrastText' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      ✅ VIN Successfully Decoded
                    </Typography>
                    <Typography variant="body2">
                      {(() => {
                        const getValue = (variable: string) => {
                          const result = decodedVin.Results.find((r: any) => r.Variable === variable);
                          return result && result.Value && result.Value !== 'Not Available' ? result.Value : null;
                        };
                        
                        const year = getValue('Model Year');
                        const make = getValue('Make');
                        const model = getValue('Model');
                        const engine = getValue('Displacement (L)');
                        const cylinders = getValue('Engine Number of Cylinders');
                        
                        // Format engine displacement to max 2 decimal places
                        const formattedEngine = engine ? parseFloat(engine).toFixed(2).replace(/\.?0+$/, '') + 'L' : '';
                        
                        return [year, make, model, formattedEngine, cylinders ? cylinders + ' cyl' : ''].filter(Boolean).join(' ');
                      })()}
                    </Typography>
                  </Paper>
                </Grid>
              )}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCreateStickerFormClose}>Cancel</Button>
          <Button onClick={handleCreateSticker} variant="contained">
            {selectedSticker ? 'Update Sticker & Open PDF' : 'Create Sticker'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={showQRDialog} onClose={() => setShowQRDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>QR Code</DialogTitle>
        <DialogContent>
          {selectedSticker && (
            <Box sx={{ textAlign: 'center', p: 2 }}>
              <Box sx={{ mb: 2, p: 2, bgcolor: 'white', borderRadius: 1, display: 'inline-block' }}>
                <div style={{ height: 'auto', margin: '0 auto', maxWidth: 256, width: '100%' }}>
                  {/* Note: You might need to install react-qr-code or use a different QR library */}
                  <Typography variant="h6" sx={{ border: '1px solid #ccc', p: 2, borderRadius: 1, fontFamily: 'monospace' }}>
                    {selectedSticker.qrCode}
                  </Typography>
                </div>
              </Box>
              <Typography variant="h6" gutterBottom>
                {selectedSticker.oilType.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                VIN: {selectedSticker.vin}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowQRDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog 
        open={detailDialogOpen} 
        onClose={handleCloseDetailDialog}
        maxWidth="md"
        fullWidth
      >
        {selectedQuickCheck && (
          <>
            <DialogTitle>
              Quick Check Details
            </DialogTitle>
            <DialogContent>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
                {/* Dash Photo */}
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" gutterBottom>
                    Dashboard Photo
                  </Typography>
                  <img 
                    src={getDashPhoto(selectedQuickCheck)}
                    alt="Dashboard"
                    style={{ 
                      width: '100%', 
                      height: 'auto', 
                      borderRadius: '8px',
                      backgroundColor: '#f5f5f5'
                    }}
                  />
                </Box>

                {/* Details */}
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" gutterBottom>
                    Inspection Information
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      VIN Number
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {selectedQuickCheck.data.vin || 'N/A'}
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Technician
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {selectedQuickCheck.user_name}
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Created Date
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {formatDate(selectedQuickCheck.created_at)}
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Duration
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {selectedQuickCheck.data.technician_duration ? formatDuration(selectedQuickCheck.data.technician_duration) : formatDurationFromTimestamps(selectedQuickCheck.created_at)}
                    </Typography>
                  </Box>

                  {selectedQuickCheck.data.mileage && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Mileage
                      </Typography>
                      <Typography variant="body1" gutterBottom>
                        {selectedQuickCheck.data.mileage} miles
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDetailDialog}>
                Close
              </Button>
              <Button 
                onClick={() => handleArchive(selectedQuickCheck.id)}
                disabled={archivingId === selectedQuickCheck.id}
                variant="contained" 
                color="secondary"
                startIcon={archivingId === selectedQuickCheck.id ? <CircularProgress size={16} /> : <ArchiveIcon />}
              >
                {archivingId === selectedQuickCheck.id ? 'Archiving...' : 'Archive'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <Dialog
        open={confirmArchiveDialog.open}
        onClose={handleCancelArchive}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Confirm Archive
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to archive this quick check? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelArchive} color="primary">
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmArchive}
            variant="contained" 
            color="secondary"
            disabled={archivingId === confirmArchiveDialog.quickCheckId}
            startIcon={archivingId === confirmArchiveDialog.quickCheckId ? <CircularProgress size={16} /> : <ArchiveIcon />}
          >
            {archivingId === confirmArchiveDialog.quickCheckId ? 'Archiving...' : 'Archive'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={confirmDeleteDialog.open}
        onClose={handleCancelDelete}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Confirm Delete
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this in-progress quick check? This action cannot be undone and all progress will be lost.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete} color="primary">
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmDelete}
            variant="contained" 
            color="error"
            disabled={deletingId === confirmDeleteDialog.quickCheckId}
            startIcon={deletingId === confirmDeleteDialog.quickCheckId ? <CircularProgress size={16} /> : <DeleteIcon />}
          >
            {deletingId === confirmDeleteDialog.quickCheckId ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Timing Dialog */}
      <Dialog open={showTimingDialog} onClose={() => setShowTimingDialog(false)} maxWidth="md" fullWidth>
        <DialogContent>
          <Typography variant="h6" gutterBottom>Quick Check Timing Summary</Typography>
          {timingData && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>Status: {timingData.status}</Typography>
              
              {/* Tab Timings */}
              <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>Tab Timings</Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Paper sx={{ p: 2, border: timingData.tabTimings?.info?.isActive ? 2 : 1, borderColor: timingData.tabTimings?.info?.isActive ? 'success.main' : 'divider' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Typography variant="subtitle2" color="primary">Info Tab</Typography>
                      {timingData.tabTimings?.info?.isActive && (
                        <Chip 
                          label="ACTIVE" 
                          size="small" 
                          color="success" 
                          sx={{ ml: 1, fontSize: '0.7rem' }}
                        />
                      )}
                    </Box>
                    <Typography variant="body2">Duration: {formatDuration(timingData.tabTimings?.info?.duration || 0)}</Typography>
                    {timingData.tabTimings?.info?.start && (
                      <Typography variant="caption" color="text.secondary">
                        Start: {new Date(timingData.tabTimings.info.start).toLocaleString()}
                      </Typography>
                    )}
                  </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Paper sx={{ p: 2, border: timingData.tabTimings?.pulling?.isActive ? 2 : 1, borderColor: timingData.tabTimings?.pulling?.isActive ? 'success.main' : 'divider' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Typography variant="subtitle2" color="primary">Pulling Into Bay</Typography>
                      {timingData.tabTimings?.pulling?.isActive && (
                        <Chip 
                          label="ACTIVE" 
                          size="small" 
                          color="success" 
                          sx={{ ml: 1, fontSize: '0.7rem' }}
                        />
                      )}
                    </Box>
                    <Typography variant="body2">Duration: {formatDuration(timingData.tabTimings?.pulling?.duration || 0)}</Typography>
                    {timingData.tabTimings?.pulling?.start && (
                      <Typography variant="caption" color="text.secondary">
                        Start: {new Date(timingData.tabTimings.pulling.start).toLocaleString()}
                      </Typography>
                    )}
                  </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Paper sx={{ p: 2, border: timingData.tabTimings?.underhood?.isActive ? 2 : 1, borderColor: timingData.tabTimings?.underhood?.isActive ? 'success.main' : 'divider' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Typography variant="subtitle2" color="primary">Underhood</Typography>
                      {timingData.tabTimings?.underhood?.isActive && (
                        <Chip 
                          label="ACTIVE" 
                          size="small" 
                          color="success" 
                          sx={{ ml: 1, fontSize: '0.7rem' }}
                        />
                      )}
                    </Box>
                    <Typography variant="body2">Duration: {formatDuration(timingData.tabTimings?.underhood?.duration || 0)}</Typography>
                    {timingData.tabTimings?.underhood?.start && (
                      <Typography variant="caption" color="text.secondary">
                        Start: {new Date(timingData.tabTimings.underhood.start).toLocaleString()}
                      </Typography>
                    )}
                  </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Paper sx={{ p: 2, border: timingData.tabTimings?.tires?.isActive ? 2 : 1, borderColor: timingData.tabTimings?.tires?.isActive ? 'success.main' : 'divider' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Typography variant="subtitle2" color="primary">Tires & Brakes</Typography>
                      {timingData.tabTimings?.tires?.isActive && (
                        <Chip 
                          label="ACTIVE" 
                          size="small" 
                          color="success" 
                          sx={{ ml: 1, fontSize: '0.7rem' }}
                        />
                      )}
                    </Box>
                    <Typography variant="body2">Duration: {formatDuration(timingData.tabTimings?.tires?.duration || 0)}</Typography>
                    {timingData.tabTimings?.tires?.start && (
                      <Typography variant="caption" color="text.secondary">
                        Start: {new Date(timingData.tabTimings.tires.start).toLocaleString()}
                      </Typography>
                    )}
                  </Paper>
                </Grid>
              </Grid>

              {/* Overall Durations */}
              <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>Overall Durations</Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Paper sx={{ p: 2, bgcolor: 'success.light' }}>
                    <Typography variant="subtitle2" color="white">Created to Submitted</Typography>
                    <Typography variant="h6" color="white">
                      {formatDuration(timingData.durations?.createdToSubmitted || 0)}
                    </Typography>
                  </Paper>
                </Grid>
                {timingData.status === 'archived' && (
                  <>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Paper sx={{ p: 2, bgcolor: 'warning.light' }}>
                        <Typography variant="subtitle2" color="white">Submitted to Archived</Typography>
                        <Typography variant="h6" color="white">
                          {formatDuration(timingData.durations?.submittedToArchived || 0)}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <Paper sx={{ p: 2, bgcolor: 'error.light' }}>
                        <Typography variant="subtitle2" color="white">Created to Archived</Typography>
                        <Typography variant="h6" color="white">
                          {formatDuration(timingData.durations?.createdToArchived || 0)}
                        </Typography>
                      </Paper>
                    </Grid>
                  </>
                )}
              </Grid>

              {/* Timestamps */}
              <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>Timestamps</Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant="body2">
                    <strong>Created:</strong><br />
                    {new Date(timingData.timestamps?.created).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant="body2">
                    <strong>Last Updated:</strong><br />
                    {new Date(timingData.timestamps?.updated).toLocaleString()}
                  </Typography>
                </Grid>
                {timingData.timestamps?.archived && (
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="body2">
                      <strong>Archived:</strong><br />
                      {new Date(timingData.timestamps.archived).toLocaleString()}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button onClick={() => setShowTimingDialog(false)}>Close</Button>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Label Creator Dialog */}
      <LabelCreator
        open={showLabelCreator}
        onClose={() => setShowLabelCreator(false)}
        onLabelCreated={handleLabelCreated}
      />

      {/* Real-time Update Snackbar */}
      <Snackbar
        open={realtimeUpdateSnackbar.open}
        autoHideDuration={4000}
        onClose={() => setRealtimeUpdateSnackbar({ open: false, message: '', action: '' })}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setRealtimeUpdateSnackbar({ open: false, message: '', action: '' })}
          severity={realtimeUpdateSnackbar.action === 'deleted' ? 'warning' : 'info'}
          sx={{ width: '100%' }}
        >
          {realtimeUpdateSnackbar.message}
        </Alert>
      </Snackbar>

      {/* Print Job Status Notification */}
      <Snackbar
        open={printJobNotification.open}
        autoHideDuration={printJobNotification.severity === 'error' ? 8000 : 5000}
        onClose={() => setPrintJobNotification(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setPrintJobNotification(prev => ({ ...prev, open: false }))}
          severity={printJobNotification.severity}
          variant="filled"
          sx={{ 
            width: '100%',
            minWidth: 300,
            '& .MuiAlert-icon': {
              fontSize: '1.5rem'
            }
          }}
        >
          {printJobNotification.message}
        </Alert>
      </Snackbar>

      {/* Stacked Notification System */}
      {notificationStack.map((notification, index) => (
        <Snackbar
          key={notification.id}
          open={notification.open}
          autoHideDuration={60000}
          onClose={() => closeNotification(notification.id)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          TransitionComponent={({ children, ...props }) => (
            <div
              {...props}
              style={{
                ...props.style,
                transform: `translateY(${index * 8}px)`,
                zIndex: 1000 - index,
                opacity: 1 - (index * 0.1),
                filter: `blur(${index * 0.5}px)`,
              }}
            >
              {children}
            </div>
          )}
        >
          <Alert 
            onClose={() => closeNotification(notification.id)}
            severity={notification.type === 'created' ? 'success' : notification.type === 'saved' || notification.type === 'submitted' ? 'info' : 'warning'}
            sx={{ 
              width: '100%',
              transform: `scale(${1 - index * 0.05})`,
              boxShadow: `0 ${4 + index * 2}px ${8 + index * 4}px rgba(0,0,0,0.${0.1 + index * 0.05})`,
            }}
            icon={
              notification.type === 'created' ? <AddIcon /> :
              notification.type === 'saved' || notification.type === 'submitted' ? <RefreshIcon /> :
              <DeleteIcon />
            }
          >
            {notification.message}
          </Alert>
        </Snackbar>
      ))}

      {/* Sticker Print Settings Dialog */}
      <StickerPrintSettings
        open={showStickerPrintSettings}
        onClose={() => setShowStickerPrintSettings(false)}
        onSettingsChange={handleStickerPrintSettingsChange}
        settingsSource={stickerSettingsSource}
      />

      {/* Label Print Settings Dialog */}
      <LabelPrintSettings
        open={showLabelPrintSettings}
        onClose={() => setShowLabelPrintSettings(false)}
        onSettingsChange={handleLabelPrintSettingsChange}
        settingsSource={labelSettingsSource}
      />

      {/* Copies Selection Dialog for Generated Labels */}
      <Dialog open={showCopiesDialog} onClose={() => setShowCopiesDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CopyIcon />
            <Typography variant="h6">Set Copies for {pendingPrintLabel?.templateName || 'Label'}</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <Typography variant="body1" gutterBottom>
              How many copies would you like to print?
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 3, display: 'block' }}>
              This will print the specified number of copies of your label.
            </Typography>
            
            <Box sx={{ px: 2, py: 3 }}>
              <Typography variant="h4" align="center" color="primary" gutterBottom>
                {selectedCopies}
              </Typography>
              <Typography variant="body2" align="center" color="text.secondary" gutterBottom>
                {selectedCopies === 1 ? 'copy' : 'copies'}
              </Typography>
              
              <Slider
                value={selectedCopies}
                onChange={(_, value) => setSelectedCopies(value as number)}
                min={1}
                max={10}
                step={1}
                marks={[
                  { value: 1, label: '1' },
                  { value: 5, label: '5' },
                  { value: 10, label: '10' }
                ]}
                valueLabelDisplay="auto"
                sx={{ mt: 3 }}
              />
            </Box>
            
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
              {[1, 2, 3, 4, 5].map((num) => (
                <Chip
                  key={num}
                  label={`${num} ${num === 1 ? 'copy' : 'copies'}`}
                  onClick={() => setSelectedCopies(num)}
                  color={selectedCopies === num ? 'primary' : 'default'}
                  variant={selectedCopies === num ? 'filled' : 'outlined'}
                  sx={{ cursor: 'pointer' }}
                />
              ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setShowCopiesDialog(false);
            setPendingPrintLabel(null);
            setSelectedCopies(1);
          }}>
            Cancel
          </Button>
          <Button onClick={() => handleCopiesConfirm(selectedCopies)} variant="contained">
            Print {selectedCopies} {selectedCopies === 1 ? 'Copy' : 'Copies'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Offline Printer Warning Dialog */}
      <Dialog 
        open={showOfflinePrinterWarning} 
        onClose={handleCancelOfflinePrint}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'warning.main' }}>
          <WarningIcon color="warning" />
          Printer Offline
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            {offlinePrinterMessage}
          </Alert>
          <Typography variant="body1" gutterBottom>
            Would you like to queue the print job anyway?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            The job will be added to the print queue and will print automatically when the printer/client comes back online.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelOfflinePrint} color="inherit">
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmOfflinePrint} 
            variant="contained" 
            color="warning"
            startIcon={<PrintIcon />}
          >
            Queue Anyway
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail Dialog for Labels and Stickers */}
      <Dialog 
        open={detailDialogOpen} 
        onClose={handleCloseDetail}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              {selectedItem && 'templateId' in selectedItem 
                ? `Generated Label: ${selectedItem.templateName}`
                : 'Static Sticker Details'
              }
            </Typography>
            <Box>
              {selectedItem && (
                <>
                  {isEditing ? (
                    <>
                      <IconButton onClick={handleSave} color="primary">
                        <SaveIcon />
                      </IconButton>
                      <IconButton onClick={handleCancel}>
                        <CancelIcon />
                      </IconButton>
                    </>
                  ) : (
                    <IconButton onClick={handleEdit}>
                      <EditIcon />
                    </IconButton>
                  )}
                </>
              )}
              <IconButton onClick={handleCloseDetail}>
                <CancelIcon />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedItem && (
            <Grid container spacing={3}>
              {/* Details Section */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="h6" gutterBottom>
                  Details
                </Typography>
                {selectedItem && 'templateId' in selectedItem ? (
                  // Generated Label Details
                  <Box>
                    {isEditing ? (
                      // Edit Form for Labels
                      <Box>
                        <Typography variant="body2" gutterBottom>
                          <strong>Template:</strong> {selectedItem.templateName}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Created By:</strong> {selectedItem.createdBy}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Created Date:</strong> {new Date(selectedItem.createdDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Print Count:</strong> {selectedItem.printCount}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Label Data:</strong>
                        </Typography>
                        <Box sx={{ ml: 2, mt: 1 }}>
                          {Object.entries(selectedItem.labelData).map(([key, value]) => (
                            <TextField
                              key={key}
                              fullWidth
                              label={key}
                              value={editingLabel.labelData?.[key] || String(value)}
                              onChange={(e) => setEditingLabel({
                                ...editingLabel,
                                labelData: {
                                  ...editingLabel.labelData,
                                  [key]: e.target.value
                                }
                              })}
                              margin="normal"
                              size="small"
                            />
                          ))}
                        </Box>
                      </Box>
                    ) : (
                      // Display Details
                      <Box>
                        <Typography variant="body2" gutterBottom>
                          <strong>Template:</strong> {selectedItem.templateName}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Created By:</strong> {selectedItem.createdBy}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Created Date:</strong> {new Date(selectedItem.createdDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Print Count:</strong> {selectedItem.printCount}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Label Data:</strong>
                        </Typography>
                        <Box sx={{ ml: 2, mt: 1 }}>
                          {Object.entries(selectedItem.labelData).map(([key, value]) => (
                            <Typography key={key} variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                              <strong>{key}:</strong> {String(value)}
                            </Typography>
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Box>
                ) : (
                  // Static Sticker Details
                  <Box>
                    {isEditing ? (
                      // Edit Form
                      <Box>
                        <TextField
                          fullWidth
                          label="VIN"
                          value={editingSticker.vin || ''}
                          onChange={(e) => setEditingSticker({...editingSticker, vin: e.target.value})}
                          margin="normal"
                        />
                        <TextField
                          fullWidth
                          label="Mileage"
                          type="number"
                          value={editingSticker.mileage || ''}
                          onChange={(e) => setEditingSticker({...editingSticker, mileage: parseInt(e.target.value) || 0})}
                          margin="normal"
                        />
                        <TextField
                          fullWidth
                          label="Service Date"
                          type="date"
                          value={editingSticker.date || ''}
                          onChange={(e) => setEditingSticker({...editingSticker, date: e.target.value})}
                          margin="normal"
                          InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                          fullWidth
                          label="Company Name"
                          value={editingSticker.companyName || ''}
                          onChange={(e) => setEditingSticker({...editingSticker, companyName: e.target.value})}
                          margin="normal"
                        />
                        <TextField
                          fullWidth
                          label="Address"
                          value={editingSticker.address || ''}
                          onChange={(e) => setEditingSticker({...editingSticker, address: e.target.value})}
                          margin="normal"
                        />
                      </Box>
                    ) : (
                      // Display Details
                      <Box>
                        <Typography variant="body2" gutterBottom>
                          <strong>VIN:</strong> {selectedItem.vin}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Vehicle:</strong> {selectedItem.decodedDetails.make} {selectedItem.decodedDetails.model}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Service Date:</strong> {new Date(selectedItem.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Mileage:</strong> {selectedItem.mileage.toLocaleString()}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Oil Type:</strong> {selectedItem.oilType.name}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Company:</strong> {selectedItem.companyName}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Address:</strong> {selectedItem.address}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Status:</strong> 
                          <Chip 
                            label={selectedItem.archived ? 'Archived' : 'Active'} 
                            size="small" 
                            color={selectedItem.archived ? 'default' : 'success'}
                            sx={{ ml: 1 }}
                          />
                        </Typography>
                      </Box>
                    )}
                  </Box>
                )}
              </Grid>

              {/* PDF Preview Section */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  mb: 3,
                  pb: 2,
                  borderBottom: '2px solid #f0f0f0'
                }}>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 600, color: '#2c3e50' }}>
                      PDF Preview
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Live preview of your sticker
                    </Typography>
                  </Box>
                  {pdfPreviewUrl && (
                    <Button
                      size="small"
                      onClick={() => window.open(pdfPreviewUrl, '_blank')}
                      variant="contained"
                      sx={{
                        background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                        boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
                        '&:hover': {
                          background: 'linear-gradient(45deg, #1976D2 30%, #1E88E5 90%)',
                        }
                      }}
                    >
                      Open Full Size
                    </Button>
                  )}
                </Box>
                
                <Box sx={{
                  background: '#424242',
                  borderRadius: 3,
                  p: 2,
                  height: '650px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {generatingPdf ? (
                    <Box display="flex" justifyContent="center" alignItems="center" flexDirection="column" sx={{ height: '100%' }}>
                      <Box sx={{
                        background: 'white',
                        borderRadius: '50%',
                        p: 3,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                        mb: 2
                      }}>
                        <CircularProgress size={50} sx={{ color: '#2196F3' }} />
                      </Box>
                      <Typography variant="h6" color="text.primary" sx={{ fontWeight: 500 }}>
                        Generating Preview
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Creating your sticker PDF...
                      </Typography>
                    </Box>
                  ) : pdfPreviewUrl ? (
                    <Box sx={{
                      width: '100%',
                      height: '100%',
                      background: 'transparent',
                      borderRadius: 2,
                      overflow: 'hidden',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Box
                        component="iframe"
                        src={pdfPreviewUrl}
                        sx={{
                          width: '100%',
                          height: '100%',
                          border: 'none',
                          display: 'block',
                          background: 'transparent'
                        }}
                      />
                      <Box sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '4px',
                        background: 'linear-gradient(90deg, #2196F3, #21CBF3, #4CAF50)',
                        borderRadius: '2px 2px 0 0'
                      }} />
                    </Box>
                  ) : (
                    <Box display="flex" justifyContent="center" alignItems="center" flexDirection="column" sx={{ height: '100%' }}>
                      <Box sx={{
                        background: 'white',
                        borderRadius: 2,
                        p: 4,
                        textAlign: 'center',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                        maxWidth: 300
                      }}>
                        <Typography variant="h6" color="text.primary" sx={{ mb: 2, fontWeight: 500 }}>
                          Preview Unavailable
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                          Unable to generate PDF preview. This may be due to missing data or configuration.
                        </Typography>
                        <Button
                          variant="contained"
                          onClick={() => generatePdfPreview(selectedItem!)}
                          startIcon={<RefreshIcon />}
                          sx={{
                            background: 'linear-gradient(45deg, #FF6B6B 30%, #FF8E53 90%)',
                            boxShadow: '0 3px 5px 2px rgba(255, 107, 107, .3)',
                            '&:hover': {
                              background: 'linear-gradient(45deg, #FF5252 30%, #FF7043 90%)',
                            }
                          }}
                        >
                          Try Again
                        </Button>
                      </Box>
                    </Box>
                  )}
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          {selectedItem && 'vin' in selectedItem && (
            <Button
              onClick={() => handlePrintSticker(selectedItem)}
              startIcon={<PrintIcon />}
              variant="contained"
            >
              Print Sticker
            </Button>
          )}
          {selectedItem && 'templateId' in selectedItem && (
            <Button
              onClick={() => handleReprintLabel(selectedItem)}
              startIcon={<PrintIcon />}
              variant="contained"
            >
              Print Label
            </Button>
          )}
          <Button onClick={handleCloseDetail}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

    </Container>
  );
};

export default Home; 