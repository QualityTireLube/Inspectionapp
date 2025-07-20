import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from '@mui/material';
import Grid from '../components/CustomGrid';
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
} from '@mui/icons-material';
import { getSubmittedQuickChecks, getInProgressQuickChecks, archiveQuickCheck, deleteQuickCheck, getUploadUrl, getTimingSummary, decodeVinCached, formatVehicleDetails } from '../services/api';
import { StaticSticker, CreateStickerFormData, OilType } from '../types/stickers';
import { StickerStorageService } from '../services/stickerStorage';
import { VinDecoderService } from '../services/vinDecoder';
import { PDFGeneratorService } from '../services/pdfGenerator';
import StickerPreview from '../components/StickerPreview';
import LabelCreator from '../components/LabelCreator';
import { useWebSocket, useQuickCheckUpdates } from '../contexts/WebSocketProvider';
import ConnectionStatusIndicator from '../components/ConnectionStatusIndicator';

interface QuickCheck {
  id: number;
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
    [key: string]: any; // Allow additional dynamic fields
  };
  archived_at?: string;
  archived_by?: string;
  archived_by_name?: string;
  status?: string;
}

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [inProgressChecks, setInProgressChecks] = useState<QuickCheck[]>([]);
  const [submittedChecks, setSubmittedChecks] = useState<QuickCheck[]>([]);
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

  // WebSocket integration
  const { isConnected, connectionStatus, subscribe, reconnect } = useWebSocket();
  const [realtimeUpdateSnackbar, setRealtimeUpdateSnackbar] = useState({ open: false, message: '', action: '' });
  
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

  // Refs for auto-focus
  const mileageFieldRef = useRef<HTMLInputElement>(null);

  // Handle real-time WebSocket updates
  useEffect(() => {
    console.log('🔌 Setting up WebSocket subscription for quick_check_update');
    
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
    // The server sends: { type: 'quick_check_update', action: 'created', data: { id, title, data, user, ... } }
    const quickCheckData = update.data || {};
    const formData = quickCheckData.data || {}; // The actual form data is nested in data.data
    const vin = formData.vin || '';
    
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
          return prev;
        }
        console.log('➕ Adding to submitted list');
        return [newQuickCheck, ...prev];
      });
    }
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

  const loadQuickChecks = async (isAutoRefresh = false) => {
    try {
      if (isAutoRefresh) {
        setAutoRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');
      console.log('Calling getInProgressQuickChecks and getSubmittedQuickChecks APIs...'); // Debug log
      const [inProgress, submitted] = await Promise.all([
        getInProgressQuickChecks(),
        getSubmittedQuickChecks()
      ]);
      console.log('In Progress API response:', inProgress); // Debug log
      console.log('Submitted API response:', submitted); // Debug log
      setInProgressChecks(inProgress);
      setSubmittedChecks(submitted);
    } catch (err: any) {
      console.error('Error loading quick checks:', err); // Debug log
      console.error('Error details:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
        config: err.config
      }); // Debug log
      setError(err.response?.data?.error || 'Failed to load quick checks');
    } finally {
      setLoading(false);
      setAutoRefreshing(false);
    }
  };

  const loadStickersData = () => {
    setActiveStickers(StickerStorageService.getActiveStickers());
    setOilTypes(StickerStorageService.getOilTypes());
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

  const autoCreateStickerFromShopMonkey = async (oilStickerData: any, oilTypeId: string, passedDecodedVin?: any) => {
    const oilType = oilTypes.find(type => type.id === oilTypeId);
    if (!oilType) {
      throw new Error('Oil type not found');
    }

    const nextServiceDate = calculateNextServiceDate(oilTypeId);
    const settings = StickerStorageService.getSettings();
    
    const companyElement = settings.layout.elements.find(el => el.id === 'companyName');
    const addressElement = settings.layout.elements.find(el => el.id === 'address');
    const messageElement = settings.layout.elements.find(el => el.id === 'message');
    
    // Use passed decoded VIN data or component state, otherwise create basic details
    const vinDataToUse = passedDecodedVin || decodedVin;
    let transformedDecodedDetails: any = { error: 'VIN not decoded' };
    
    console.log('🔧 VIN data to use for sticker:', vinDataToUse ? 'Available' : 'Not available');
    
    if (vinDataToUse && vinDataToUse.Results && Array.isArray(vinDataToUse.Results)) {
      const getValue = (variable: string) => {
        const result = vinDataToUse.Results.find((r: any) => r.Variable === variable);
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
        ...vinDataToUse
      };
    } else if (oilStickerData.vehicleInfo) {
      // Create basic decoded details from vehicle info
      transformedDecodedDetails = {
        vehicleInfo: oilStickerData.vehicleInfo,
        customerName: oilStickerData.customerName,
        orderNumber: oilStickerData.orderNumber
      };
    }

    // Create new sticker
    const newSticker: StaticSticker = {
      id: Date.now().toString(),
      dateCreated: new Date().toISOString(),
      vin: VinDecoderService.formatVin(oilStickerData.vin),
      decodedDetails: transformedDecodedDetails,
      date: nextServiceDate,
      oilType,
      mileage: oilStickerData.mileage || 0,
      companyName: companyElement?.content.replace('{companyName}', '') || '',
      address: addressElement?.content.replace('{address}', '') || '',
      message: messageElement?.content || '',
      qrCode: '',
      printed: false,
      lastUpdated: new Date().toISOString(),
      archived: false,
    };

    newSticker.qrCode = generateQRCode(newSticker);

    // Save the sticker
    StickerStorageService.saveSticker(newSticker);
    
    // Generate PDF and open in new tab
    try {
      await PDFGeneratorService.generateStickerPDF(newSticker, settings, true);
      setStickerSuccess(`✅ Oil sticker created and PDF opened! Order #${oilStickerData.orderNumber || 'N/A'} - ${oilType.name}`);
    } catch (pdfError) {
      console.error('PDF generation failed:', pdfError);
      setStickerSuccess(`✅ Oil sticker created! Order #${oilStickerData.orderNumber || 'N/A'} - ${oilType.name}`);
    }

    // Refresh stickers list
    loadStickersData();
    
    // Clear form data
    setStickerFormData({
      vin: '',
      oilTypeId: '',
      mileage: 0,
    });
    setDecodedVin(null);

    // Clear success message after 5 seconds
    setTimeout(() => setStickerSuccess(''), 5000);
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

        StickerStorageService.saveSticker(updatedSticker);

        // Generate PDF and open in new tab
        await PDFGeneratorService.generateStickerPDF(updatedSticker, settings, true);

        setStickerSuccess('Oil sticker updated and opened in new tab!');
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

        StickerStorageService.saveSticker(newSticker);
        setStickerSuccess('Oil sticker created successfully!');
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

  const handleArchiveSticker = (id: string) => {
    try {
      StickerStorageService.archiveSticker(id);
      setStickerSuccess('Sticker archived successfully!');
      loadStickersData();
    } catch (error) {
      setStickerError('Failed to archive sticker');
    }
  };

  const handleDeleteSticker = (id: string) => {
    if (window.confirm('Are you sure you want to delete this sticker? This action cannot be undone.')) {
      try {
        StickerStorageService.deleteSticker(id);
        setStickerSuccess('Sticker deleted successfully!');
        loadStickersData();
      } catch (error) {
        setStickerError('Failed to delete sticker');
      }
    }
  };

  const handlePrintSticker = async (sticker: StaticSticker) => {
    try {
      const settings = StickerStorageService.getSettings();
      
      // Automatically open PDF in new tab
      await PDFGeneratorService.openStickerPDF(sticker, settings);
      
      StickerStorageService.saveSticker({ ...sticker, printed: true });
      setStickerSuccess('PDF opened in new tab successfully!');
      loadStickersData();
    } catch (error) {
      console.error('Error generating PDF:', error);
      setStickerError('Failed to generate PDF');
    }
  };

  const handleShowQR = (sticker: StaticSticker) => {
    setSelectedSticker(sticker);
    setShowQRDialog(true);
  };

  useEffect(() => {
    loadQuickChecks();
    loadStickersData();
    
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

  // Debug WebSocket connection status
  useEffect(() => {
    console.log('🔌 WebSocket connection status changed:', {
      isConnected,
      connectionStatus,
      authenticatedClients: connectionStatus.connectedClients
    });
  }, [isConnected, connectionStatus]);



  // Debug draft submission flow
  useEffect(() => {
    console.log('📊 Home component state updated:', {
      inProgressCount: inProgressChecks.length,
      submittedCount: submittedChecks.length,
      inProgressVins: inProgressChecks.map(check => check.data.vin),
      submittedVins: submittedChecks.map(check => check.data.vin)
    });
  }, [inProgressChecks, submittedChecks]);

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

  // Check for ShopMonkey oil sticker data on component mount
  useEffect(() => {
    const checkForShopMonkeyData = async () => {
      try {
        const storedData = localStorage.getItem('shopmonkey-oil-sticker-data');
        if (storedData) {
          const oilStickerData = JSON.parse(storedData);
                      console.log('🔍 Found ShopMonkey oil sticker data:', oilStickerData);
            console.log('🏷️ Oil type name from ShopMonkey:', `"${oilStickerData.oilTypeName}"`);
            
            // Find matching oil type ID with detailed debugging
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
          
          const oilTypeId = findOilTypeId(oilStickerData.oilTypeName);
          console.log('🏆 Final selected oil type ID:', oilTypeId);
          
          // Auto-fill the form data
          setStickerFormData({
            vin: oilStickerData.vin,
            oilTypeId: oilTypeId,
            mileage: oilStickerData.mileage || 0,
          });
          
          // Show success message
          setStickerSuccess(`🏷️ Auto-creating oil sticker from ShopMonkey order #${oilStickerData.orderNumber || 'N/A'} - ${oilStickerData.customerName || 'Unknown Customer'}`);
          
          // Decode VIN and create sticker in sequence
          const processVinAndCreateSticker = async () => {
            let decodedVinData = null;
            
            // Step 1: Decode VIN if available
            if (oilStickerData.vin && oilStickerData.vin.length === 17) {
              console.log('🔍 Decoding VIN from ShopMonkey:', oilStickerData.vin);
              setIsDecodingVin(true);
              try {
                decodedVinData = await decodeVinCached(oilStickerData.vin);
                console.log('✅ VIN decoded successfully:', decodedVinData);
                setDecodedVin(decodedVinData);
              } catch (error) {
                console.error('❌ VIN decoding failed:', error);
                setDecodedVin(null);
              } finally {
                setIsDecodingVin(false);
              }
            } else {
              console.log('⚠️ Invalid VIN for decoding:', oilStickerData.vin);
              setDecodedVin(null);
            }
            
            // Step 2: Create sticker with decoded VIN data
            try {
              console.log('🏷️ Creating sticker with decoded VIN data...');
              await autoCreateStickerFromShopMonkey(oilStickerData, oilTypeId, decodedVinData);
            } catch (error) {
              console.error('Error auto-creating sticker:', error);
              setStickerError('Failed to auto-create sticker. Please create manually.');
            }
          };
          
          // Start the process after a short delay
          setTimeout(processVinAndCreateSticker, 2000);
          
          // Clean up the localStorage data
          localStorage.removeItem('shopmonkey-oil-sticker-data');
        }
      } catch (error) {
        console.error('Error processing ShopMonkey oil sticker data:', error);
      }
    };

    // Only check if oil types are loaded
    if (oilTypes.length > 0) {
      checkForShopMonkeyData();
    }
  }, [oilTypes]); // Run when oil types are loaded

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

  const handleArchive = async (id: number) => {
    try {
      setArchivingId(id);
      await archiveQuickCheck(id);
      // No need to reload - WebSocket will handle the update
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to archive quick check');
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
      await deleteQuickCheck(id);
      // No need to reload - WebSocket will handle the update
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete quick check');
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
    // For in-progress checks, navigate to the Quick Check form to continue editing
    if (quickCheck.status === 'in_progress') {
      navigate(`/quick-check?draftId=${quickCheck.id}`);
    } else {
      navigate(`/quick-check/${quickCheck.id}`);
    }
  };

  const handleCloseDetailDialog = () => {
    setDetailDialogOpen(false);
    setSelectedQuickCheck(null);
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
      <Box sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Typography variant="h4" component="h1">
            Quick Check
          </Typography>
        </Box>
        <Typography variant="subtitle1" color="text.secondary" paragraph>
          
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="body2" color="text.secondary">
            {inProgressChecks.length + submittedChecks.length} inspection{(inProgressChecks.length + submittedChecks.length) !== 1 ? 's' : ''} total
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <ConnectionStatusIndicator compact={true} />
            <Button
              variant="contained"
              color="secondary"
              startIcon={<LabelIcon />}
              onClick={() => setShowLabelCreator(true)}
              size="small"
            >
              Create Label
            </Button>
            <Button
              startIcon={<RefreshIcon />}
              onClick={() => loadQuickChecks()}
              disabled={loading}
              variant="outlined"
              size="small"
            >
              Refresh
            </Button>
          </Box>
        </Box>

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
                  Quick checks currently being worked on by technicians
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {inProgressChecks.map((quickCheck) => (
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
                            '0%': {
                              boxShadow: '0 0 10px rgba(76, 175, 80, 0.3)',
                            },
                            '50%': {
                              boxShadow: '0 0 20px rgba(76, 175, 80, 0.6)',
                            },
                            '100%': {
                              boxShadow: '0 0 10px rgba(76, 175, 80, 0.3)',
                            },
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
                      {/* Dash Photo - Smaller and on the left */}
                      <Box sx={{ position: 'relative', width: 200, height: 150, flexShrink: 0 }}>
                        {imageLoadingStates.get(quickCheck.id) && (
                          <Box sx={{ 
                            position: 'absolute', 
                            top: 0, 
                            left: 0, 
                            right: 0, 
                            bottom: 0, 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            backgroundColor: '#f5f5f5',
                            zIndex: 1
                          }}>
                            <CircularProgress size={30} />
                          </Box>
                        )}
                        <CardMedia
                          component="img"
                          sx={{ 
                            width: 200,
                            height: 150,
                            objectFit: 'cover',
                            backgroundColor: '#f5f5f5',
                            flexShrink: 0
                          }}
                          image={getDashPhoto(quickCheck)}
                          alt="Dashboard"
                          onLoad={() => handleImageLoad(quickCheck.id)}
                          onError={() => handleImageError(quickCheck.id)}
                        />
                      </Box>

                      {/* Content - Details on the right */}
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        flexGrow: 1, 
                        p: 2, 
                        position: 'relative',
                        height: 150, // Match the image height
                        justifyContent: 'space-between'
                      }}>
                        <CardContent sx={{ flexGrow: 1, p: 0, pb: 1 }}>
                          {/* VIN */}
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <CarIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary" noWrap>
                              VIN: {quickCheck.data.vin || 'N/A'}
                            </Typography>
                          </Box>

                          {/* Vehicle Details (if available) */}
                          {(quickCheck.data.vehicle_details || (quickCheck.data.year && quickCheck.data.make && quickCheck.data.model)) && (
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              <CarIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                              <Typography variant="body2" color="text.secondary" noWrap>
                                {quickCheck.data.vehicle_details || 
                                  `${quickCheck.data.year} ${quickCheck.data.make} ${quickCheck.data.model}`}
                              </Typography>
                            </Box>
                          )}

                          {/* Mileage (if available) */}
                          {quickCheck.data.mileage && (
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              <SpeedIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                              <Typography variant="body2" color="text.secondary">
                                Mileage: {quickCheck.data.mileage.toLocaleString()} mi
                              </Typography>
                            </Box>
                          )}

                          {/* Technician Name */}
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <PersonIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                              {quickCheck.user_name}
                            </Typography>
                          </Box>

                          {/* Duration */}
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <AccessTimeIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                              Duration: {quickCheck.data.technician_duration ? formatDuration(quickCheck.data.technician_duration) : formatDurationFromTimestamps(quickCheck.created_at)}
                            </Typography>
                          </Box>

                          {/* Created Date */}
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <ScheduleIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                              {formatDate(quickCheck.created_at)}
                            </Typography>
                          </Box>

                          {/* Last Updated (if different from created) */}
                          {quickCheck.updated_at && quickCheck.updated_at !== quickCheck.created_at && (
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              <UpdateIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                Updated: {formatDate(quickCheck.updated_at)}
                              </Typography>
                            </Box>
                          )}
                        </CardContent>

                        {/* Bottom section with Status Chip */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto', mb: 1, transform: 'translateY(-17px)' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip 
                              label="In Progress" 
                              color="warning" 
                              size="small"
                              icon={<PlayArrowIcon />}
                            />
                            {recentlyUpdatedCards.has(quickCheck.id) && (
                              <Chip 
                                label="Updated" 
                                color="success" 
                                size="small"
                                sx={{ 
                                  fontSize: '0.65rem', 
                                  height: 20, 
                                  '& .MuiChip-label': { px: 1 },
                                  animation: 'fadeInOut 3s ease-in-out',
                                  '@keyframes fadeInOut': {
                                    '0%': { opacity: 0 },
                                    '20%': { opacity: 1 },
                                    '80%': { opacity: 1 },
                                    '100%': { opacity: 0 },
                                  },
                                }}
                              />
                            )}
                          </Box>
                          
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="View Timing">
                              <IconButton 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleShowTiming(quickCheck.id);
                                }}
                                disabled={timingLoading}
                                size="small"
                                color="primary"
                              >
                                {timingLoading ? (
                                  <CircularProgress size={20} />
                                ) : (
                                  <TimerIcon />
                                )}
                              </IconButton>
                            </Tooltip>
                            
                            <Tooltip title="Delete Quick Check">
                              <IconButton 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteClick(quickCheck.id);
                                }}
                                disabled={deletingId === quickCheck.id}
                                size="small"
                                color="error"
                              >
                                {deletingId === quickCheck.id ? (
                                  <CircularProgress size={20} />
                                ) : (
                                  <DeleteIcon />
                                )}
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                      </Box>
                    </Card>
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
                  Completed quick check inspections
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {submittedChecks.map((quickCheck) => (
                    <Card 
                      key={quickCheck.id}
                      sx={{ 
                        display: 'flex',
                        flexDirection: 'row',
                        height: 'auto',
                        cursor: 'pointer',
                        '&:hover': {
                          boxShadow: 6,
                          transform: 'translateY(-2px)',
                          transition: 'all 0.3s'
                        }
                      }}
                      onClick={() => handleCardClick(quickCheck)}
                    >
                      {/* Dash Photo - Smaller and on the left */}
                      <CardMedia
                        component="img"
                        sx={{ 
                          width: 200,
                          height: 150,
                          objectFit: 'cover',
                          backgroundColor: '#f5f5f5',
                          flexShrink: 0
                        }}
                        image={getDashPhoto(quickCheck)}
                        alt="Dashboard"
                        onLoad={() => handleImageLoad(quickCheck.id)}
                        onError={() => handleImageError(quickCheck.id)}
                      />

                      {/* Content - Details on the right */}
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        flexGrow: 1, 
                        p: 2, 
                        position: 'relative',
                        height: 150, // Match the image height
                        justifyContent: 'space-between'
                      }}>
                        <CardContent sx={{ flexGrow: 1, p: 0, pb: 1 }}>
                          {/* VIN */}
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <CarIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary" noWrap>
                              VIN: {quickCheck.data.vin || 'N/A'}
                            </Typography>
                          </Box>

                          {/* Technician Name */}
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <PersonIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                              {quickCheck.user_name}
                            </Typography>
                          </Box>

                          {/* Duration */}
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <AccessTimeIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                              Duration: {quickCheck.data.technician_duration ? formatDuration(quickCheck.data.technician_duration) : formatDurationFromTimestamps(quickCheck.created_at)}
                            </Typography>
                          </Box>

                          {/* Created Date */}
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <ScheduleIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                              {formatDate(quickCheck.created_at)}
                            </Typography>
                          </Box>
                        </CardContent>

                        {/* Bottom section with Status Chip and Archive Button */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto', mb: 1, transform: 'translateY(-17px)' }}>
                          <Chip 
                            label="Submitted" 
                            color="primary" 
                            size="small"
                          />
                          
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="View Timing">
                              <IconButton 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleShowTiming(quickCheck.id);
                                }}
                                disabled={timingLoading}
                                size="small"
                                color="primary"
                              >
                                {timingLoading ? (
                                  <CircularProgress size={20} />
                                ) : (
                                  <TimerIcon />
                                )}
                              </IconButton>
                            </Tooltip>
                            
                            <Tooltip title="Archive Quick Check">
                              <IconButton 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleArchiveClick(quickCheck.id);
                                }}
                                disabled={archivingId === quickCheck.id}
                                size="small"
                                color="secondary"
                              >
                                {archivingId === quickCheck.id ? (
                                  <CircularProgress size={20} />
                                ) : (
                                  <ArchiveIcon />
                                )}
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                      </Box>
                    </Card>
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
            <Typography variant="h4" component="h2" gutterBottom>
              Static Stickers
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              
            </Typography>
          </Box>
          <Button
            startIcon={<AddIcon />}
            onClick={() => setShowCreateStickerForm(true)}
            variant="outlined"
            size="small"
          >
            Static Sticker
          </Button>
        </Box>

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
            {activeStickers.map((sticker) => (
              <Card 
                key={sticker.id} 
                sx={{ 
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  p: 1.5,
                  minHeight: 60,
                  '&:hover': {
                    boxShadow: 3,
                    transform: 'translateY(-1px)',
                    transition: 'all 0.2s'
                  }
                }}
              >
                {/* Left Section - Oil Type & Vehicle Details */}
                <Box sx={{ minWidth: 180, mr: 2 }}>
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

                {/* Middle Section - Current Mileage */}
                <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', mr: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                    {sticker.mileage.toLocaleString()}Mi
                  </Typography>
                </Box>

                {/* Right Section - Status & Actions (Condensed) */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {sticker.printed && (
                    <Chip 
                      label="Printed" 
                      color="success" 
                      size="small"
                      sx={{ fontSize: '0.65rem', height: 20, '& .MuiChip-label': { px: 1 } }}
                    />
                  )}
                  
                  <Box sx={{ display: 'flex', gap: 0.25 }}>
                    <IconButton
                      size="small"
                      onClick={() => handleShowQR(sticker)}
                      title="QR Code"
                      sx={{ p: 0.5 }}
                    >
                      <QrCodeIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                    {sticker.oilType && (
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrintSticker(sticker);
                        }}
                        title="Open PDF in New Tab"
                        sx={{ p: 0.5 }}
                      >
                        <PrintIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    )}
                    <IconButton
                      size="small"
                      onClick={() => handleArchiveSticker(sticker.id)}
                      title="Archive"
                      sx={{ p: 0.5 }}
                    >
                      <ArchiveIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteSticker(sticker.id)}
                      title="Delete"
                      color="error"
                      sx={{ p: 0.5 }}
                    >
                      <DeleteIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
                </Box>
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
              <Grid item xs={12} md={4}>
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

              <Grid item xs={12} md={4}>
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

              <Grid item xs={12} md={4}>
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
                <Grid item xs={12} md={6}>
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
                <Grid item xs={12}>
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
                <Grid item xs={12} sm={6}>
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
                <Grid item xs={12} sm={6}>
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
                <Grid item xs={12} sm={6}>
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
                <Grid item xs={12} sm={6}>
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
                <Grid item xs={12} sm={4}>
                  <Paper sx={{ p: 2, bgcolor: 'success.light' }}>
                    <Typography variant="subtitle2" color="white">Created to Submitted</Typography>
                    <Typography variant="h6" color="white">
                      {formatDuration(timingData.durations?.createdToSubmitted || 0)}
                    </Typography>
                  </Paper>
                </Grid>
                {timingData.status === 'archived' && (
                  <>
                    <Grid item xs={12} sm={4}>
                      <Paper sx={{ p: 2, bgcolor: 'warning.light' }}>
                        <Typography variant="subtitle2" color="white">Submitted to Archived</Typography>
                        <Typography variant="h6" color="white">
                          {formatDuration(timingData.durations?.submittedToArchived || 0)}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={4}>
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
                <Grid item xs={12} sm={4}>
                  <Typography variant="body2">
                    <strong>Created:</strong><br />
                    {new Date(timingData.timestamps?.created).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="body2">
                    <strong>Last Updated:</strong><br />
                    {new Date(timingData.timestamps?.updated).toLocaleString()}
                  </Typography>
                </Grid>
                {timingData.timestamps?.archived && (
                  <Grid item xs={12} sm={4}>
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

    </Container>
  );
};

export default Home; 