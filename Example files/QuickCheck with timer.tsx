import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Container, Typography, Box, Button, TextField, Paper, CircularProgress, Alert, InputAdornment, IconButton,
  Dialog, DialogContent, IconButton as MuiIconButton, Tooltip, Tabs, Tab, FormControl, FormLabel, RadioGroup,
  FormControlLabel, Radio, Stack, Chip, Select, MenuItem, InputLabel, Divider, Modal, Popover, Menu,
  Snackbar, LinearProgress, Switch
} from '@mui/material';
import Grid from '../components/CustomGrid';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import CloseIcon from '@mui/icons-material/Close';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import FlashOffIcon from '@mui/icons-material/FlashOff';
import FlipCameraIosIcon from '@mui/icons-material/FlipCameraIos';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import { Html5QrcodeScanner } from 'html5-qrcode';
import LogoutIcon from '@mui/icons-material/Logout';
import api, { submitQuickCheck, getQuickCheckHistory, logout, deleteQuickCheck, decodeVinNHTSA, createDraftQuickCheck, updateQuickCheckStatus, updateDraftQuickCheck, updateDraftQuickCheckWithFiles, getDraftQuickChecks, deleteQuickCheckPhoto, trackTabEntry, trackTabExit, getTimingSummary } from '../services/api';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import TireRepairLayout from '../components/TireRepairLayout';
import TPMSLayout from '../components/TPMSLayout';
import TPMSToolField from '../components/TPMSToolField';
import InfoIcon from '@mui/icons-material/Info';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow, Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-coverflow';
import 'swiper/css/navigation';
import TireTreadSection from '../components/TireTreadSection';
import type { TireTreadData } from '../components/TireTreadSection';
import TireTreadSideView from '../components/TireTreadSideView';
import BrakePadSection from '../components/BrakePadSection';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import SaveIcon from '@mui/icons-material/Save';
import HistoryIcon from '@mui/icons-material/History';
import VisibilityIcon from '@mui/icons-material/Visibility';
import TimerIcon from '@mui/icons-material/Timer';

const essentialFields = [
  { name: 'vin', label: 'VIN', type: 'text', required: true },
  { name: 'date', label: 'Date', type: 'date', required: false },
  { name: 'dash_lights', label: 'Dash Lights', type: 'text', required: false },
  { name: 'windshield', label: 'Windshield Condition', type: 'text', required: false },
  { name: 'mileage', label: 'Mileage', type: 'number', required: false },
  { name: 'front_tires', label: 'Front Tires', type: 'text', required: false },
  { name: 'rear_tires', label: 'Rear Tires', type: 'text', required: false },
  { name: 'brake_pads', label: 'Brake Pads', type: 'text', required: false },
];

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
      id={`quick-check-tabpanel-${index}`}
      aria-labelledby={`quick-check-tab-${index}`}
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

interface ImageUpload {
  file: File;
  progress: number;
  url?: string;
  error?: string;
  position?: number; // Track the position in the sequence
  isDeleted?: boolean; // Track if this photo was deleted
}

type WindshieldCondition = 'good' | 'bad';
type WiperBladeCondition = 'good' | 'front_minor' | 'front_moderate' | 'front_major' | 'rear_minor' | 'rear_moderate' | 'rear_major';
type WasherSquirterCondition = 'good' | 'leaking' | 'not_working' | 'no_pump_sound';
type StateInspectionStatus = 'expired' | 'this_year' | 'next_year' | 'year_after';
type WasherFluidCondition = 'full' | 'leaking' | 'not_working' | 'no_pump_sound';
type EngineAirFilterCondition = 'good' | 'next_oil_change' | 'highly_recommended' | 'today' | 'animal_related';
type BatteryCondition = 'good' | 'warning' | 'bad' | 'na' | 'terminal_cleaning' | 'less_than_5yr';

type TireCondition = 'good' | 'warning' | 'bad' | 'over_7yr' | 'over_6yr' | 'inner_wear' | 'outer_wear' | 'wear_indicator' | 'separated' | 'dry_rotted' | 'na' | 'no_spare';
type BrakeCondition = 'good' | 'soon' | 'very_soon' | 'today' | 'metal_to_metal' | 'rotors' | 'pull_wheels' | 'drums_not_checked';
type StaticStickerStatus = 'good' | 'not_oil_change' | 'need_sticker';
type DrainPlugType = 'metal' | 'plastic';
type TireRepairStatus = 'repairable' | 'not_tire_repair' | 'non_repairable';
type TPMSType = 'not_check' | 'bad_sensor';
type TireRotationStatus = 'good' | 'bad';

type TreadCondition = 'green' | 'yellow' | 'red';

interface TireTread {
  inner_edge_depth: string;
  inner_depth: string;
  center_depth: string;
  outer_depth: string;
  outer_edge_depth: string;
  inner_edge_condition: TreadCondition;
  inner_condition: TreadCondition;
  center_condition: TreadCondition;
  outer_condition: TreadCondition;
  outer_edge_condition: TreadCondition;
}

interface TirePhoto {
  type: 'passenger_front' | 'driver_front' | 'driver_rear' | 'passenger_rear' | 'spare' | 'undercarriage' | 'front_brakes' | 'rear_brakes';
  photos: ImageUpload[];
}

interface TireRepairZone {
  position: string;
  status: 'good' | 'bad' | null;
}

interface TPMSZone {
  position: string;
  status: 'good' | 'bad' | null;
}

interface DraftData {
  id?: string;
  draft_data: QuickCheckForm;
  last_updated: string;
}

interface QuickCheckForm {
  vin: string;
  date: string;
  user: string;
  mileage: string;
  windshield_condition: WindshieldCondition;
  wiper_blades: WiperBladeCondition;
  washer_squirters: WasherSquirterCondition;
  dash_lights_photos: ImageUpload[];
  // Underhood fields
  tpms_placard: ImageUpload[];
  state_inspection_status: StateInspectionStatus;
  state_inspection_month: number | null;
  state_inspection_date_code: string;
  washer_fluid: WasherFluidCondition;
  washer_fluid_photo: ImageUpload[];
  engine_air_filter: EngineAirFilterCondition;
  engine_air_filter_photo: ImageUpload[];
  battery_condition: BatteryCondition[];
  battery_photos: ImageUpload[];
  battery_date_code: string;
  tpms_tool_photo: ImageUpload[];
  
  // Tires and Brakes fields
  passenger_front_tire: TireCondition;
  driver_front_tire: TireCondition;
  driver_rear_tire: TireCondition;
  passenger_rear_tire: TireCondition;
  spare_tire: TireCondition;
  front_brakes: ImageUpload[];
  rear_brakes: ImageUpload[];
  front_brake_pads: {
    inner: number;
    outer: number;
    rotor_condition: 'good' | 'grooves' | 'overheated' | 'scared';
  };
  rear_brake_pads: {
    inner: number;
    outer: number;
    rotor_condition: 'good' | 'grooves' | 'overheated' | 'scared';
  };
  tire_photos: TirePhoto[];
  tire_repair_status: TireRepairStatus;
  tire_repair_zones: TireRepairZone[];
  tpms_type: TPMSType;
  tpms_zones: TPMSZone[];
  tire_rotation: TireRotationStatus;
  static_sticker: StaticStickerStatus;
  drain_plug_type: DrainPlugType;
  notes: string;
  tire_repair_statuses: {
    driver_front: 'repairable' | 'non_repairable' | null;
    driver_rear_outer: 'repairable' | 'non_repairable' | null;
    driver_rear_inner: 'repairable' | 'non_repairable' | null;
    passenger_rear_inner: 'repairable' | 'non_repairable' | null;
    passenger_rear_outer: 'repairable' | 'non_repairable' | null;
    spare: 'repairable' | 'non_repairable' | null;
  };
  tpms_statuses: {
    driver_front: boolean | null;
    passenger_front: boolean | null;
    driver_rear_outer: boolean | null;
    driver_rear_inner: boolean | null;
    passenger_rear_inner: boolean | null;
    passenger_rear_outer: boolean | null;
    spare: boolean | null;
  };
  tire_comments: {
    [key: string]: string[];
  };
  tire_dates: {
    [key: string]: string;
  };
  tire_tread: {
    driver_front: TireTread;
    passenger_front: TireTread;
    driver_rear: TireTread;
    passenger_rear: TireTread;
    spare: TireTread;
  };
  // Timing fields
  tab_timings: {
    info_duration: number;
    pulling_duration: number;
    underhood_duration: number;
    tires_duration: number;
  };
  // Workflow timing fields
  created_datetime: string;
  submitted_datetime: string;
  archived_datetime: string;
}

const theme = createTheme({
  palette: {
    primary: {
      main: '#1042D8',
    },
  },
});

const QuickCheck: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { scannedVIN } = (location.state as any) || { scannedVIN: '' };
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [tabValue, setTabValue] = useState(0);

  const userName = localStorage.getItem('userName') || '';

  const initialFormState: QuickCheckForm = {
    vin: scannedVIN || '',
    date: new Date().toISOString().split('T')[0],
    user: userName,
    mileage: '',
    windshield_condition: 'good' as WindshieldCondition,
    wiper_blades: 'good' as WiperBladeCondition,
    washer_squirters: 'good' as WasherSquirterCondition,
    dash_lights_photos: [],
    // Underhood fields
    tpms_placard: [],
    state_inspection_status: 'this_year' as StateInspectionStatus,
    state_inspection_month: null,
    state_inspection_date_code: '',
    washer_fluid: 'full' as WasherFluidCondition,
    washer_fluid_photo: [],
    engine_air_filter: 'good' as EngineAirFilterCondition,
    engine_air_filter_photo: [],
    battery_condition: [],
    battery_photos: [],
    battery_date_code: '',
    tpms_tool_photo: [],
    
    // Tires and Brakes fields
    passenger_front_tire: 'good' as TireCondition,
    driver_front_tire: 'good' as TireCondition,
    driver_rear_tire: 'good' as TireCondition,
    passenger_rear_tire: 'good' as TireCondition,
    spare_tire: 'good' as TireCondition,
    front_brakes: [],
    rear_brakes: [],
    front_brake_pads: {
      inner: 0,
      outer: 0,
      rotor_condition: 'good' as 'good' | 'grooves' | 'overheated' | 'scared'
    },
    rear_brake_pads: {
      inner: 0,
      outer: 0,
      rotor_condition: 'good' as 'good' | 'grooves' | 'overheated' | 'scared'
    },
    tire_photos: [],
    tire_repair_status: 'not_tire_repair' as TireRepairStatus,
    tire_repair_zones: [
      { position: 'driver_front', status: null },
      { position: 'passenger_front', status: null },
      { position: 'driver_rear_outer', status: null },
      { position: 'driver_rear_inner', status: null },
      { position: 'passenger_rear_inner', status: null },
      { position: 'passenger_rear_outer', status: null }
    ],
    tpms_type: 'not_check',
    tpms_zones: [
      { position: 'driver_front', status: null },
      { position: 'passenger_front', status: null },
      { position: 'driver_rear_outer', status: null },
      { position: 'driver_rear_inner', status: null },
      { position: 'passenger_rear_inner', status: null },
      { position: 'passenger_rear_outer', status: null }
    ],
    tire_rotation: 'good' as TireRotationStatus,
    static_sticker: 'good' as StaticStickerStatus,
    drain_plug_type: 'metal' as DrainPlugType,
    notes: '',
    tire_repair_statuses: {
      driver_front: null,
      driver_rear_outer: null,
      driver_rear_inner: null,
      passenger_rear_inner: null,
      passenger_rear_outer: null,
      spare: null,
    },
    tpms_statuses: {
      driver_front: null,
      passenger_front: null,
      driver_rear_outer: null,
      driver_rear_inner: null,
      passenger_rear_inner: null,
      passenger_rear_outer: null,
      spare: null,
    },
    tire_comments: {},
    tire_dates: {
      passenger_front: '',
      driver_front: '',
      driver_rear: '',
      passenger_rear: '',
      spare: '',
    },
    tire_tread: {
      driver_front: {
        inner_edge_depth: '',
        inner_depth: '',
        center_depth: '',
        outer_depth: '',
        outer_edge_depth: '',
        inner_edge_condition: 'green',
        inner_condition: 'green',
        center_condition: 'green',
        outer_condition: 'green',
        outer_edge_condition: 'green',
      },
      passenger_front: {
        inner_edge_depth: '',
        inner_depth: '',
        center_depth: '',
        outer_depth: '',
        outer_edge_depth: '',
        inner_edge_condition: 'green',
        inner_condition: 'green',
        center_condition: 'green',
        outer_condition: 'green',
        outer_edge_condition: 'green',
      },
      driver_rear: {
        inner_edge_depth: '',
        inner_depth: '',
        center_depth: '',
        outer_depth: '',
        outer_edge_depth: '',
        inner_edge_condition: 'green',
        inner_condition: 'green',
        center_condition: 'green',
        outer_condition: 'green',
        outer_edge_condition: 'green',
      },
      passenger_rear: {
        inner_edge_depth: '',
        inner_depth: '',
        center_depth: '',
        outer_depth: '',
        outer_edge_depth: '',
        inner_edge_condition: 'green',
        inner_condition: 'green',
        center_condition: 'green',
        outer_condition: 'green',
        outer_edge_condition: 'green',
      },
      spare: {
        inner_edge_depth: '',
        inner_depth: '',
        center_depth: '',
        outer_depth: '',
        outer_edge_depth: '',
        inner_edge_condition: 'green',
        inner_condition: 'green',
        center_condition: 'green',
        outer_condition: 'green',
        outer_edge_condition: 'green',
      },
    },
    tab_timings: {
      info_duration: 0,
      pulling_duration: 0,
      underhood_duration: 0,
      tires_duration: 0,
    },
    created_datetime: new Date().toISOString(),
    submitted_datetime: '',
    archived_datetime: '',
  };

  const [form, setForm] = useState<QuickCheckForm>(initialFormState);

  const [images, setImages] = useState<{
    dashLights: ImageUpload | null;
    undercarriage: ImageUpload | null;
  }>({
    dashLights: null,
    undercarriage: null,
  });

  const [scannerOpen, setScannerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [qrBoxSize, setQrBoxSize] = useState(250);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [hasFlashSupport, setHasFlashSupport] = useState(false);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const [cameraType, setCameraType] = useState<'passenger_front' | 'driver_front' | 'driver_rear' | 'passenger_rear' | 'spare' | 'undercarriage' | 'front_brakes' | 'rear_brakes' | 'tpms_placard' | 'washer_fluid' | 'engine_air_filter' | 'battery' | 'tpms_tool'>('passenger_front');
  const [cameraPermission, setCameraPermission] = useState<PermissionState>('prompt');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const dashLightsInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [infoAnchorEl, setInfoAnchorEl] = useState<HTMLElement | null>(null);
  const [infoContent, setInfoContent] = useState<string>('');
  const [photoMenuAnchor, setPhotoMenuAnchor] = useState<null | HTMLElement>(null);
  const [photoMenuPosition, setPhotoMenuPosition] = useState<string>('');
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number>(0);
  const [slideshowOpen, setSlideshowOpen] = useState(false);
  const [slideshowPhotos, setSlideshowPhotos] = useState<ImageUpload[]>([]);

  // Add state for detail view
  const [selectedInspection, setSelectedInspection] = useState<any | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // Add state for vehicle details popup
  const [vehicleDetailsOpen, setVehicleDetailsOpen] = useState(false);

  // Add state for the tab
  const [vehicleDetailsTab, setVehicleDetailsTab] = useState(0);

  // Add a state to track the backend checklist ID
  const [backendChecklistId, setBackendChecklistId] = useState<number | null>(null);
  const [formStartTime, setFormStartTime] = useState<Date | null>(null);
  const [uploadedPhotos, setUploadedPhotos] = useState<{ [key: string]: Set<string> }>({});

  // Add state for cancel dialog
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  // Add state to track uploaded photos to prevent duplicates
  const [photoPositions, setPhotoPositions] = useState<{
    [key: string]: number; // fieldName -> next position number
  }>({});

  // Add state to prevent multiple draft creations
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);

  // Add state for history functionality
  const [showHistory, setShowHistory] = useState(false);
  const [inspectionHistory, setInspectionHistory] = useState<any[]>([]);

  // Add ref for tire photo input
  const tirePhotoInputRef = useRef<HTMLInputElement | null>(null);

  // Add timing state
  const [timingData, setTimingData] = useState<any>(null);
  const [showTimingDialog, setShowTimingDialog] = useState(false);
  const [currentTabStartTime, setCurrentTabStartTime] = useState<Date | null>(null);

  // Virtual timing state for real-time tracking
  const [virtualTiming, setVirtualTiming] = useState({
    info: { 
      duration: form.tab_timings.info_duration, 
      isActive: false, 
      startTime: null as Date | null 
    },
    pulling: { 
      duration: form.tab_timings.pulling_duration, 
      isActive: false, 
      startTime: null as Date | null 
    },
    underhood: { 
      duration: form.tab_timings.underhood_duration, 
      isActive: false, 
      startTime: null as Date | null 
    },
    tires: { 
      duration: form.tab_timings.tires_duration, 
      isActive: false, 
      startTime: null as Date | null 
    }
  });
  const [timingInterval, setTimingInterval] = useState<NodeJS.Timeout | null>(null);

  // Track tab exit when component unmounts
  useEffect(() => {
    return () => {
      if (backendChecklistId) {
        try {
          trackTabExit(backendChecklistId, tabValue).catch(error => {
            console.error('Failed to track tab exit on unmount:', error);
          });
        } catch (error) {
          console.error('Error in cleanup:', error);
        }
      }
      // Clean up timing interval
      if (timingInterval) {
        clearInterval(timingInterval);
      }
    };
  }, [backendChecklistId, tabValue, timingInterval]);

  // Virtual timing functions
  const startTabTimer = (tabName: 'info' | 'pulling' | 'underhood' | 'tires') => {
    setVirtualTiming(prev => ({
      ...prev,
      [tabName]: {
        ...prev[tabName],
        isActive: true,
        startTime: new Date()
      }
    }));

    // Start the interval timer if not already running
    if (!timingInterval) {
      const interval = setInterval(() => {
        setVirtualTiming(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(key => {
            const tab = updated[key as keyof typeof updated];
            if (tab.isActive && tab.startTime) {
              const elapsed = Math.floor((new Date().getTime() - tab.startTime.getTime()) / 1000);
              tab.duration = elapsed;
            }
          });
          return updated;
        });
      }, 1000); // Update every second
      setTimingInterval(interval);
    }
  };

  const stopTabTimer = (tabName: 'info' | 'pulling' | 'underhood' | 'tires') => {
    setVirtualTiming(prev => {
      const updated = {
        ...prev,
        [tabName]: {
          ...prev[tabName],
          isActive: false,
          startTime: null
        }
      };
      
      // Check if any tabs are still active after this update
      const anyActive = Object.values(updated).some(tab => tab.isActive);
      
      // If no tabs are active, clear the interval
      if (!anyActive && timingInterval) {
        clearInterval(timingInterval);
        setTimingInterval(null);
      }
      
      return updated;
    });
  };

  const getTabDuration = (tabName: 'info' | 'pulling' | 'underhood' | 'tires') => {
    const tab = virtualTiming[tabName];
    if (tab.isActive && tab.startTime) {
      const currentSessionElapsed = Math.floor((new Date().getTime() - tab.startTime.getTime()) / 1000);
      return tab.duration + currentSessionElapsed; // Return accumulated + current session
    }
    return tab.duration; // Return just accumulated duration if not active
  };

  // Cancel handler
  const handleCancel = () => {
    setCancelDialogOpen(true);
  };

  const confirmCancel = () => {
    // Clear form, remove draft, and navigate home
    setForm(initialFormState);
    localStorage.removeItem('quickCheckFormData');
    setCancelDialogOpen(false);
    navigate('/');
  };

  const cancelCancel = () => {
    setCancelDialogOpen(false);
  };

  // Handler to open detail view
  const handleViewInspection = (inspection: any) => {
    setSelectedInspection(inspection);
    setShowDetailDialog(true);
  };

  // Handler to close detail view
  const handleCloseDetailDialog = () => {
    setShowDetailDialog(false);
    setSelectedInspection(null);
  };

  // Function to detect if the device is mobile
  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  // Function to check flash support
  const checkFlashSupport = async (track: MediaStreamTrack) => {
    try {
      const imageCapture = new (window as any).ImageCapture(track);
      const capabilities = await imageCapture.getPhotoCapabilities();
      return capabilities.torch || false;
    } catch (error) {
      console.error('Error checking flash support:', error);
      return false;
    }
  };

  // Function to get all available cameras
  const getAvailableCameras = async () => {
    try {
      // First, request camera permission to get labels
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
      
      // Stop the temporary stream
      tempStream.getTracks().forEach(track => track.stop());

      // Now enumerate devices with labels
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setAvailableCameras(videoDevices);
      
      if (videoDevices.length === 0) {
        throw new Error('No cameras found');
      }

      // Find the rear camera on mobile devices
      if (isMobileDevice()) {
        // First try to find a camera with "back" or "rear" in the label
        const rearCamera = videoDevices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('rear')
        );

        if (rearCamera) {
          const index = videoDevices.indexOf(rearCamera);
          setCurrentCameraIndex(index);
          return rearCamera.deviceId;
        }

        // If no labeled rear camera found, try to use the last camera
        // (on most mobile devices, the last camera is the rear camera)
        if (videoDevices.length > 1) {
          const lastCamera = videoDevices[videoDevices.length - 1];
          const index = videoDevices.indexOf(lastCamera);
          setCurrentCameraIndex(index);
          return lastCamera.deviceId;
        }
      }

      // Default to first camera if no rear camera found
      setCurrentCameraIndex(0);
      return videoDevices[0].deviceId;
    } catch (error) {
      console.error('Error getting cameras:', error);
      throw error;
    }
  };

  // Function to check camera permission status
  const checkCameraPermission = async () => {
    try {
      const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
      setCameraPermission(result.state);
      
      result.addEventListener('change', () => {
        setCameraPermission(result.state);
      });
      
      return result.state;
    } catch (error) {
      console.error('Error checking camera permission:', error);
      return 'prompt';
    }
  };

  // Function to get browser-specific instructions for enabling camera
  const getCameraPermissionInstructions = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
      return 'To enable camera access in Safari:\n1. Click Safari in the menu bar\n2. Select Settings for This Website\n3. Find Camera and select Allow';
    } else if (userAgent.includes('chrome')) {
      return 'To enable camera access in Chrome:\n1. Click the lock/info icon in the address bar\n2. Find Camera in the permissions list\n3. Select Allow';
    } else if (userAgent.includes('firefox')) {
      return 'To enable camera access in Firefox:\n1. Click the lock icon in the address bar\n2. Click the Camera permission\n3. Select Allow';
    }
    
    return 'Please enable camera access in your browser settings to use this feature.';
  };

  // Update the camera error message to include instructions
  const handleCameraPermissionDenied = () => {
    const instructions = getCameraPermissionInstructions();
    setCameraError(`Camera access was denied. ${instructions}`);
    setCameraPermission('denied');
  };

  // Update requestCameraPermission to use the new error handler
  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setCameraPermission('granted');
      return true;
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      handleCameraPermissionDenied();
      return false;
    }
  };

  // Update initializeCamera to use the new error handler
  const initializeCamera = async (deviceId: string) => {
    try {
      // Check permission first
      const permissionStatus = await checkCameraPermission();
      
      if (permissionStatus === 'denied') {
        handleCameraPermissionDenied();
        throw new Error('Camera access denied');
      }
      
      if (permissionStatus === 'prompt') {
        const granted = await requestCameraPermission();
        if (!granted) {
          throw new Error('Camera access denied');
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: deviceId }
        }
      });

      const videoTrack = stream.getVideoTracks()[0];
      videoTrackRef.current = videoTrack;

      // Check flash support
      const hasFlash = await checkFlashSupport(videoTrack);
      setHasFlashSupport(hasFlash);

      // Start video stream
      await startVideoStream(stream);

      return stream;
    } catch (error) {
      console.error('Error initializing camera:', error);
      throw error;
    }
  };

  // Initialize scanner with the appropriate camera
  const initializeScanner = async (deviceId: string) => {
    try {
      // Stop existing scanner if any
      if (scannerRef.current) {
        scannerRef.current.clear();
      }

      // Initialize camera first
      await initializeCamera(deviceId);

      // Create new scanner instance
      scannerRef.current = new Html5QrcodeScanner(
        'qr-reader',
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          showTorchButtonIfSupported: false,
          showZoomSliderIfSupported: false,
          videoConstraints: {
            deviceId: { exact: deviceId }
          }
        },
        false
      );

      // Start scanning immediately
      scannerRef.current.render(
        (decodedText) => {
          setForm(f => ({ ...f, vin: decodedText }));
          setScannerOpen(false);
          scannerRef.current?.clear();
        },
        (error) => {
          console.error('QR Scan error:', error);
          setError('Error scanning QR code. Please try again.');
        }
      );
    } catch (error) {
      console.error('Scanner initialization error:', error);
      setError('Failed to initialize camera. Please ensure camera permissions are granted.');
    }
  };

  // Handle camera switch
  const handleCameraSwitch = async () => {
    if (availableCameras.length <= 1) return;
    
    try {
      // Stop current stream
      if (videoTrackRef.current) {
        videoTrackRef.current.stop();
      }

      // Calculate next camera index
      const newIndex = (currentCameraIndex + 1) % availableCameras.length;
      setCurrentCameraIndex(newIndex);
      const newDeviceId = availableCameras[newIndex].deviceId;

      // Initialize scanner with new camera
      await initializeScanner(newDeviceId);
    } catch (error) {
      console.error('Error switching camera:', error);
      setError('Failed to switch camera. Please try again.');
    }
  };

  // Handle flash toggle
  const handleFlashToggle = async () => {
    try {
      const track = videoTrackRef.current;
      if (!track) return;

      const newState = !isFlashOn;
      await track.applyConstraints({
        advanced: [{ torch: newState } as any]
      });
      
      setIsFlashOn(newState);
    } catch (error) {
      console.error('Error toggling flash:', error);
      setHasFlashSupport(false);
    }
  };

  // Handle QR box size adjustment
  const handleQrBoxResize = (increase: boolean) => {
    const newSize = increase ? qrBoxSize + 50 : qrBoxSize - 50;
    if (newSize >= 100 && newSize <= 500) {
      setQrBoxSize(newSize);
      scannerRef.current?.clear();
      initializeScanner(selectedCameraId);
    }
  };

  // Handle scanner open
  const handleScannerOpen = async () => {
    setError(null);
    setScannerOpen(true);
    
    try {
      const cameraId = await getAvailableCameras();
      await initializeScanner(cameraId);
    } catch (error) {
      console.error('Camera permission error:', error);
      setError('Camera access denied. Please allow camera access to scan VIN.');
      setScannerOpen(false);
    }
  };

  // Cleanup scanner and camera on unmount
  useEffect(() => {
    return () => {
      cleanupCamera();
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'mileage') {
      // Remove any non-digit characters
      const numericValue = value.replace(/\D/g, '');
      // Format with commas
      const formattedValue = numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      setForm(f => {
        const newForm = { ...f, [name]: formattedValue };
        return newForm;
      });
    } else {
      setForm(f => {
        const newForm = { ...f, [name]: value };
        return newForm;
      });
      if (name === 'vin') {
        setVinDecodeError(null);
        setVehicleDetails(null);
        if (value.length === 17 && value !== lastDecodedVin) {
          setVinDecodeLoading(true);
          decodeVinNHTSA(value)
            .then((data: any) => {
              setVehicleDetails(data);
              setLastDecodedVin(value);
              setVinDecodeLoading(false);
            })
            .catch((err: any) => {
              setVinDecodeError('Failed to decode VIN.');
              setVehicleDetails(null);
              setLastDecodedVin(null);
              setVinDecodeLoading(false);
            });
        }
      }
    }
  };

  const handleRadioChange = (name: string, value: string) => {
    setForm(f => {
      const newForm = { ...f, [name]: value };
      return newForm;
    });
  };

  const handleBatteryConditionToggle = (condition: BatteryCondition) => {
    setForm(f => {
      const currentConditions = f.battery_condition || [];
      const newConditions = currentConditions.includes(condition)
        ? currentConditions.filter(c => c !== condition)
        : [...currentConditions, condition];
      
      const newForm = { ...f, battery_condition: newConditions };
      return newForm;
    });
  };

  const handleDashLightsPhotoUpload = async (files: FileList | null) => {
    if (!files) return;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const validationError = await validateImage(file);
      
      if (validationError) {
        setError(validationError);
        continue;
      }

      // Get the next position for dash lights photos
      const currentPosition = photoPositions['dashLights'] || 1;
      
      // Create a new file with the proper naming convention
      const ext = file.name.split('.').pop() || 'jpg';
      const newFileName = `${backendChecklistId || 'draft'}_dashLights_${currentPosition}.${ext}`;
      const renamedFile = new File([file], newFileName, { type: file.type });

      const newPhoto: ImageUpload = {
        file: renamedFile,
        progress: 100,
        url: URL.createObjectURL(file),
        position: currentPosition,
        isDeleted: false
      };

      setForm(f => {
        const newForm = {
        ...f,
        dash_lights_photos: [...f.dash_lights_photos, newPhoto]
        };
        return newForm;
      });

      // Update the position counter
      setPhotoPositions(prev => ({
        ...prev,
        dashLights: currentPosition + 1
      }));
    }
  };

  const handleRemoveDashLightsPhoto = async (index: number) => {
    const photoToRemove = form.dash_lights_photos[index];
    if (photoToRemove && photoToRemove.position && backendChecklistId) {
      try {
        // Call the API to mark the photo as deleted
        await deleteQuickCheckPhoto(backendChecklistId, 'dashLights', photoToRemove.position);
        
        // Mark the photo as deleted in the local state
        setForm(f => {
          const newForm = {
            ...f,
            dash_lights_photos: f.dash_lights_photos.map((photo, i) => 
              i === index ? { ...photo, isDeleted: true } : photo
            )
          };
          return newForm;
        });
      } catch (error) {
        console.error('Error deleting photo:', error);
        setError('Failed to delete photo');
      }
    } else {
      // For draft mode or missing position, just remove from local state
      setForm(f => {
        const newForm = {
          ...f,
          dash_lights_photos: f.dash_lights_photos.filter((_, i) => i !== index)
        };
        return newForm;
      });
    }
  };

  const validateImage = (file: File): Promise<string | null> => {
    if (!file.type.startsWith('image/')) {
      return Promise.resolve('Please upload an image file (JPEG, PNG, etc.)');
    }
    if (file.size > 25 * 1024 * 1024) {
      return Promise.resolve('File size should be less than 25MB');
    }
    return Promise.resolve(null);
  };

  const handleImageUpload = async (file: File, type: 'passenger_front' | 'driver_front' | 'driver_rear' | 'passenger_rear' | 'spare' | 'undercarriage' | 'front_brakes' | 'rear_brakes' | 'tpms_placard' | 'washer_fluid' | 'engine_air_filter' | 'battery' | 'tpms_tool' | 'dashLights') => {
    try {
      const validationError = await validateImage(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      // Get the next position for this field type
      const currentPosition = photoPositions[type] || 1;
      
      // Create a new file with the proper naming convention
      const ext = file.name.split('.').pop() || 'jpg';
      const newFileName = `${backendChecklistId || 'draft'}_${type}_${currentPosition}.${ext}`;
      const renamedFile = new File([file], newFileName, { type: file.type });

      const imageUpload: ImageUpload = {
        file: renamedFile,
        progress: 100,
        url: URL.createObjectURL(file),
        position: currentPosition,
        isDeleted: false
      };

      if (type === 'dashLights') {
        setForm(f => {
          const newForm = {
          ...f,
          dash_lights_photos: [...f.dash_lights_photos, imageUpload]
          };
          return newForm;
        });
      } else if (type === 'tpms_placard') {
        setForm(f => {
          const newForm = {
          ...f,
          tpms_placard: [...f.tpms_placard, imageUpload]
          };
          return newForm;
        });
      } else if (type === 'engine_air_filter') {
        setForm(f => {
          const newForm = {
          ...f,
          engine_air_filter_photo: [...f.engine_air_filter_photo, imageUpload]
          };
          return newForm;
        });
      } else if (type === 'battery') {
        setForm(f => {
          const newForm = {
          ...f,
          battery_photos: [...f.battery_photos, imageUpload]
          };
          return newForm;
        });
      } else if (type === 'tpms_tool') {
        setForm(f => {
          const newForm = {
          ...f,
          tpms_tool_photo: [...f.tpms_tool_photo, imageUpload]
          };
          return newForm;
        });
      } else if (type === 'washer_fluid') {
        setForm(f => {
          const newForm = {
          ...f,
          washer_fluid_photo: [...f.washer_fluid_photo, imageUpload]
          };
          return newForm;
        });
      } else if (type === 'front_brakes') {
        setForm(f => {
          const newForm = {
          ...f,
          front_brakes: [...(f.front_brakes || []), imageUpload]
          };
          return newForm;
        });
      } else if (type === 'rear_brakes') {
        setForm(f => {
          const newForm = {
          ...f,
          rear_brakes: [...(f.rear_brakes || []), imageUpload]
          };
          return newForm;
        });
      } else if (['passenger_front', 'driver_front', 'driver_rear', 'passenger_rear', 'spare', 'undercarriage'].includes(type)) {
        setForm(f => {
          const existingPhoto = f.tire_photos.find(p => p.type === type);
          const newForm = existingPhoto ? {
              ...f,
              tire_photos: f.tire_photos.map(p => 
                p.type === type 
                  ? { ...p, photos: [...p.photos, imageUpload] }
                  : p
              )
          } : {
              ...f,
              tire_photos: [...f.tire_photos, { type: type as any, photos: [imageUpload] }]
            };
          return newForm;
        });
      }

      // Update the position counter for this field type
      setPhotoPositions(prev => ({
        ...prev,
        [type]: currentPosition + 1
      }));
    } catch (error) {
      console.error('Error handling image:', error);
      setError('Failed to process image');
    }
  };

  const handleImageRemove = (type: 'dashLights' | 'undercarriage') => {
    setImages(prev => ({
      ...prev,
      [type]: null
    }));
  };

  // New function to handle tab changes from any source (tab clicks, Next/Previous buttons)
  const changeTab = (newValue: number) => {
    const tabNames = ['info', 'pulling', 'underhood', 'tires'] as const;
    const currentTabName = tabNames[tabValue];
    const newTabName = tabNames[newValue];
    
    console.log('Changing tab:', { from: currentTabName, to: newTabName, currentTabValue: tabValue, newValue });
    
    // ✅ 1. Stop current tab and update both virtualTiming & form immediately
    if (currentTabName) {
      const currentTab = virtualTiming[currentTabName];
      console.log('Stopping tab:', currentTabName, currentTab);
      if (currentTab.isActive && currentTab.startTime) {
        const elapsed = Math.floor((Date.now() - currentTab.startTime.getTime()) / 1000);
        const newDuration = currentTab.duration + elapsed;
        console.log('Calculated elapsed:', elapsed, 'Previous duration:', currentTab.duration, 'New duration:', newDuration);
        
        // ✅ 1. Update virtualTiming immediately
        setVirtualTiming(prev => ({
          ...prev,
          [currentTabName]: {
            ...prev[currentTabName],
            isActive: false,
            duration: newDuration,
            startTime: null,
          },
        }));
        
        // ✅ 2. Update form.tab_timings immediately
        const formFieldName = `${currentTabName}_duration` as keyof typeof form.tab_timings;
        setForm(prevForm => ({
          ...prevForm,
          tab_timings: {
            ...prevForm.tab_timings,
            [formFieldName]: newDuration,
          },
        }));
        
        console.log(`Saved ${currentTabName} duration:`, newDuration);
      } else {
        // Just stop the timer if not active
        setVirtualTiming(prev => ({
          ...prev,
          [currentTabName]: {
            ...prev[currentTabName],
            isActive: false,
            startTime: null
          }
        }));
      }
    }
    
    // ✅ 3. Start new tab timer (or resume existing timer)
    if (newTabName) {
      const formFieldName = `${newTabName}_duration` as keyof typeof form.tab_timings;
      const savedDuration = form.tab_timings[formFieldName] || 0;
      const existingTab = virtualTiming[newTabName];
      
      console.log('Starting/resuming tab:', newTabName, 'Saved duration:', savedDuration, 'Existing tab state:', existingTab);
      
      // Always use the saved duration from form data as the source of truth
      // This ensures we don't lose accumulated time when returning to a tab
      const accumulatedDuration = savedDuration;
      
      setVirtualTiming(prev => ({
        ...prev,
        [newTabName]: {
          ...prev[newTabName],
          isActive: true,
          startTime: new Date(), // Start new session
          duration: accumulatedDuration, // Resume from saved duration
        },
      }));
      
      console.log(`Resumed ${newTabName} timer with accumulated duration:`, accumulatedDuration);
    }
    
    // Ensure interval is running if any tab is active
    const anyActive = Object.values(virtualTiming).some(tab => tab.isActive);
    if (anyActive && !timingInterval) {
      // Start interval if not already running
      const interval = setInterval(() => {
        setVirtualTiming(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(key => {
            const tab = updated[key as keyof typeof updated];
            if (tab.isActive && tab.startTime) {
              // Don't modify duration here - it should only be updated when stopping the tab
              // The getTabDuration function will calculate the current total
            }
          });
          return updated;
        });
      }, 1000);
      setTimingInterval(interval);
    }
    
    setTabValue(newValue);
  };

  // Synchronous function to get current timing data
  const getCurrentTimingData = () => {
    const tabNames = ['info', 'pulling', 'underhood', 'tires'] as const;
    const currentTabName = tabNames[tabValue];
    
    let timingData = { ...form.tab_timings };
    
    // If current tab is active, calculate its current duration
    if (currentTabName) {
      const currentTab = virtualTiming[currentTabName];
      if (currentTab.isActive && currentTab.startTime) {
        const elapsed = Math.floor((Date.now() - currentTab.startTime.getTime()) / 1000);
        const totalDuration = currentTab.duration + elapsed;
        const formFieldName = `${currentTabName}_duration` as keyof typeof form.tab_timings;
        timingData[formFieldName] = totalDuration;
      }
    }
    
    return timingData;
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      // ✅ 1. Get current timing data synchronously
      const finalTimingData = getCurrentTimingData();
      
      console.log('Submit clicked - Final timing data:', finalTimingData);
      
      // ✅ 2. Stop current tab timer and update both virtualTiming & form immediately
      const tabNames = ['info', 'pulling', 'underhood', 'tires'] as const;
      const currentTabName = tabNames[tabValue];
      
      if (currentTabName) {
        const currentTab = virtualTiming[currentTabName];
        console.log('Current tab state:', currentTab);
        
        if (currentTab.isActive && currentTab.startTime) {
          const elapsed = Math.floor((Date.now() - currentTab.startTime.getTime()) / 1000);
          const totalDuration = currentTab.duration + elapsed;
          
          console.log(`Stopping ${currentTabName} timer:`, {
            currentDuration: currentTab.duration,
            elapsed: elapsed,
            totalDuration: totalDuration
          });
          
          // ✅ Stop & update virtualTiming immediately
          setVirtualTiming(prev => ({
            ...prev,
            [currentTabName]: {
              ...prev[currentTabName],
              isActive: false,
              duration: totalDuration,
              startTime: null,
            },
          }));
          
          // ✅ Save to form immediately
          const formFieldName = `${currentTabName}_duration` as keyof typeof form.tab_timings;
          setForm(prevForm => ({
            ...prevForm,
            tab_timings: {
              ...prevForm.tab_timings,
              [formFieldName]: totalDuration,
            },
          }));
          
          // Clear the interval
          if (timingInterval) {
            clearInterval(timingInterval);
            setTimingInterval(null);
          }
          
          console.log(`Successfully saved ${currentTabName} duration:`, totalDuration);
        } else {
          console.log(`Tab ${currentTabName} is not active or has no start time`);
        }
      }

      // ✅ 3. Now proceed with form submission using the calculated timing data
      console.log('Proceeding with form submission...');
      console.log('Final form timing data:', finalTimingData);

      // Prepare the title for submission (no tab name)
      const submissionTitle = `Quick Check - ${form.vin} - ${form.date}`;

      // Prepare form data without files for JSON, using the calculated timing data
      const formDataForJson = {
        ...form,
        tab_timings: finalTimingData, // Use the calculated timing data
        submitted_datetime: new Date().toISOString(), // Set submission time
        dash_lights_photos: [],
        tpms_placard: [],
        washer_fluid_photo: [],
        engine_air_filter_photo: [],
        battery_photos: [],
        tpms_tool_photo: [],
        front_brakes: [],
        rear_brakes: [],
        tire_photos: form.tire_photos.map(tirePhoto => ({
          type: tirePhoto.type,
          photos: []
        }))
      };

      // Prepare file mappings for upload
      const fileMappings: { [fieldName: string]: File[] } = {};
      
      // Add all photo files to mappings
      form.dash_lights_photos.forEach((photo) => { 
        if (!fileMappings['dashLights']) fileMappings['dashLights'] = [];
        fileMappings['dashLights'].push(photo.file); 
      });
      form.tpms_placard.forEach((photo) => { 
        if (!fileMappings['tpms_placard']) fileMappings['tpms_placard'] = [];
        fileMappings['tpms_placard'].push(photo.file); 
      });
      form.washer_fluid_photo.forEach((photo) => { 
        if (!fileMappings['washer_fluid']) fileMappings['washer_fluid'] = [];
        fileMappings['washer_fluid'].push(photo.file); 
      });
      form.engine_air_filter_photo.forEach((photo) => { 
        if (!fileMappings['engine_air_filter']) fileMappings['engine_air_filter'] = [];
        fileMappings['engine_air_filter'].push(photo.file); 
      });
      form.battery_photos.forEach((photo) => { 
        if (!fileMappings['battery']) fileMappings['battery'] = [];
        fileMappings['battery'].push(photo.file); 
      });
      form.tpms_tool_photo.forEach((photo) => { 
        if (!fileMappings['tpms_tool']) fileMappings['tpms_tool'] = [];
        fileMappings['tpms_tool'].push(photo.file); 
      });
      form.front_brakes.forEach((photo) => { 
        if (!fileMappings['front_brakes']) fileMappings['front_brakes'] = [];
        fileMappings['front_brakes'].push(photo.file); 
      });
      form.rear_brakes.forEach((photo) => { 
        if (!fileMappings['rear_brakes']) fileMappings['rear_brakes'] = [];
        fileMappings['rear_brakes'].push(photo.file); 
      });
      
      // Add tire photos
      form.tire_photos.forEach(tirePhoto => {
        const fieldName = `tire_${tirePhoto.type}`;
        if (!fileMappings[fieldName]) fileMappings[fieldName] = [];
        tirePhoto.photos.forEach(photo => {
          fileMappings[fieldName].push(photo.file);
        });
      });

      // Submit the quick check using the new API format
      const finalId = await submitQuickCheck(
        submissionTitle,
        formDataForJson,
        backendChecklistId || undefined,
        Object.keys(fileMappings).length > 0 ? fileMappings : undefined
      );

      setSuccess(true);
      setLoading(false);
      // Clear saved form data from localStorage after successful submission
      localStorage.removeItem('quickCheckFormData');
      setTimeout(() => navigate('/'), 1500);
    } catch (err: any) {
      console.error('Error submitting form:', err);
      setError(err.message || 'Submission failed.');
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, clear local storage and redirect
      localStorage.removeItem('token');
      localStorage.removeItem('userName');
      localStorage.removeItem('userEmail');
      navigate('/login');
    }
  };

  const handleTabChange = async (event: React.SyntheticEvent, newValue: number) => {
    changeTab(newValue);
  };

  // Function to remove a file from uploaded photos tracking when it's deleted
  const removeFromUploadedTracking = (fieldName: string, fileName: string) => {
    setUploadedPhotos(prev => {
      const updated = { ...prev };
      if (updated[fieldName]) {
        updated[fieldName].delete(fileName);
        if (updated[fieldName].size === 0) {
          delete updated[fieldName];
        }
      }
      return updated;
    });
  };

  // Handle camera open
  const handleCameraOpen = async (type: 'passenger_front' | 'driver_front' | 'driver_rear' | 'passenger_rear' | 'spare' | 'undercarriage' | 'front_brakes' | 'rear_brakes' | 'tpms_placard' | 'washer_fluid' | 'engine_air_filter' | 'battery' | 'tpms_tool') => {
    // For all items, directly open file chooser
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true; // Allow multiple file selection
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        // Handle each file
        for (let i = 0; i < files.length; i++) {
          await handleImageUpload(files[i], type);
        }
      }
    };
    input.click();
  };

  // Function to capture image from video stream
  const captureImage = () => {
    if (!videoRef.current) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(videoRef.current, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg');
    setCapturedImage(imageData);
  };

  // Function to handle captured image
  const handleCapturedImage = async () => {
    if (!capturedImage) return;
    
    try {
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      const file = new File([blob], `${cameraType}_${Date.now()}.jpg`, { type: 'image/jpeg' });
      
      if (cameraType === 'engine_air_filter') {
    setForm(f => ({
      ...f,
          engine_air_filter_photo: [...f.engine_air_filter_photo, {
            file,
            progress: 100,
            url: capturedImage
          }]
        }));
      } else if (cameraType === 'battery') {
    setForm(f => ({
      ...f,
          battery_photos: [...f.battery_photos, {
            file,
            progress: 100,
            url: capturedImage
          }]
        }));
      } else if (cameraType === 'tpms_tool') {
    setForm(f => ({
      ...f,
          tpms_tool_photo: [...f.tpms_tool_photo, {
            file,
            progress: 100,
            url: capturedImage
          }]
        }));
      } else if (cameraType === 'tpms_placard') {
        setForm(f => ({
          ...f,
          tpms_placard: [...f.tpms_placard, {
            file,
            progress: 100,
            url: capturedImage
          }]
        }));
      } else if (['passenger_front', 'driver_front', 'driver_rear', 'passenger_rear', 'spare', 'undercarriage', 'front_brakes', 'rear_brakes'].includes(cameraType)) {
        // Add the photo to the tire_photos array
        setForm(f => ({
          ...f,
          tire_photos: [...f.tire_photos, {
            type: cameraType as any,
            photos: [{
              file,
              progress: 100,
              url: capturedImage
            }]
          }]
        }));
      }
      
      setScannerOpen(false);
      setCapturedImage(null);
    } catch (error) {
      console.error('Error handling captured image:', error);
      setError('Failed to process captured image. Please try again.');
    }
  };

  // Function to start video stream
  const startVideoStream = async (stream: MediaStream) => {
    const video = document.getElementById('video') as HTMLVideoElement;
    if (video) {
      video.srcObject = stream;
      await video.play();
    }
  };

  const handleTirePhotoUpload = async (position: 'passenger_front' | 'driver_front' | 'driver_rear' | 'passenger_rear' | 'spare' | 'undercarriage' | 'front_brakes' | 'rear_brakes') => {
    setError(null);
    setCameraError(null);
    
    try {
    setScannerOpen(true);
    setCameraType(position);
      
      const cameraId = await getAvailableCameras();
      if (cameraId) {
        await initializeScanner(cameraId);
      } else {
        throw new Error('No camera available');
      }
    } catch (error) {
      console.error('Error opening camera:', error);
      setError('Failed to open camera. Please ensure camera permissions are granted.');
    }
  };

  const handleTireRepairZoneToggle = (position: string) => {
    setForm(f => {
      const newForm = {
        ...f,
        tire_repair_zones: f.tire_repair_zones.map(zone => 
          zone.position === position 
            ? { ...zone, status: (zone.status === 'bad' ? 'good' : 'bad') as 'good' | 'bad' | null }
            : zone
        )
      };
      return newForm;
    });
  };

  const handleTPMSZoneToggle = (position: string) => {
    setForm(f => {
      const newForm = {
        ...f,
        tpms_zones: f.tpms_zones.map(zone => 
          zone.position === position 
            ? { ...zone, status: (zone.status === 'bad' ? 'good' : 'bad') as 'good' | 'bad' | null }
            : zone
        )
      };
      return newForm;
    });
  };

  const handleTireStatusChange = (position: string, status: 'repairable' | 'non_repairable' | null) => {
    setForm(f => {
      const newForm = {
      ...f,
      tire_repair_statuses: {
        ...f.tire_repair_statuses,
        [position]: status,
      },
      };
      return newForm;
    });
  };

  const handleTPMSStatusChange = (position: string, status: boolean | null) => {
    setForm(f => {
      const newForm = {
      ...f,
      tpms_statuses: {
        ...f.tpms_statuses,
        [position]: status,
      },
      };
      return newForm;
    });
  };

  // Cleanup function to stop camera and clear resources
  const cleanupCamera = () => {
    if (videoTrackRef.current) {
      videoTrackRef.current.stop();
    }
    if (scannerRef.current) {
      scannerRef.current.clear();
    }
  };

  // Add this new function for handling image click
  const handleImageClick = (photos: ImageUpload[]) => {
    setSlideshowOpen(true);
    setSlideshowPhotos(photos);
  };

  // Add this new function for closing the image modal
  const handleCloseImageModal = () => {
    setSelectedImage(null);
  };

  const handleInfoClick = (event: React.MouseEvent<HTMLElement>, content: string) => {
    setInfoAnchorEl(event.currentTarget);
    setInfoContent(content);
  };

  const handleInfoClose = () => {
    setInfoAnchorEl(null);
  };

  const open = Boolean(infoAnchorEl);

  const handlePhotoMenuOpen = (event: React.MouseEvent<HTMLElement>, position: string) => {
    setPhotoMenuAnchor(event.currentTarget);
    setPhotoMenuPosition(position);
  };

  const handlePhotoMenuClose = () => {
    setPhotoMenuAnchor(null);
    setPhotoMenuPosition('');
  };

  const handleTakePhoto = () => {
    handlePhotoMenuClose();
    if (photoMenuPosition) {
      handleTirePhotoUpload(photoMenuPosition as any);
    }
  };

  const handleTirePhotoFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    await handleImageUpload(file, cameraType);
  };

  type CameraType = 'passenger_front' | 'driver_front' | 'driver_rear' | 'passenger_rear' | 'spare' | 'undercarriage' | 'front_brakes' | 'rear_brakes' | 'dashLights' | 'tpms_placard' | 'washer_fluid' | 'engine_air_filter' | 'battery' | 'tpms_tool';

  const handleChooseFile = (type: CameraType) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true; // Enable multiple file selection
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        // Handle each file sequentially
        for (let i = 0; i < files.length; i++) {
          await handleImageUpload(files[i], type);
        }
      }
    };
    input.click();
  };

  const handleTirePhotoClick = (position: string) => {
    const tirePhotos = form.tire_photos.find(p => p.type === position)?.photos || [];
    // Filter out deleted photos
    const activeTirePhotos = tirePhotos.filter(photo => !photo.isDeleted);
    if (activeTirePhotos.length > 0) {
      setSlideshowOpen(true);
      setSlideshowPhotos(activeTirePhotos);
      setSelectedPhotoIndex(0);
    } else {
      handleChooseFile(position as CameraType);
    }
  };

  const handleDeleteImage = (index: number) => {
    if (slideshowPhotos.length > 0) {
      const updatedPhotos = [...slideshowPhotos];
      updatedPhotos.splice(index, 1);
      setSlideshowPhotos(updatedPhotos);
    }
  };

  // Add new component for the stacked preview
  const StackedPhotoPreview: React.FC<{
    photos: ImageUpload[];
    onPhotoClick: (index: number) => void;
  }> = ({ photos, onPhotoClick }) => {
    if (photos.length === 0) return null;

    return (
      <Box
        sx={{
          position: 'absolute',
          left: 16,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 2,
          width: '120px',
          height: '80px',
        }}
      >
        <Swiper
          effect={'coverflow'}
          grabCursor={true}
          centeredSlides={true}
          slidesPerView={'auto'}
          coverflowEffect={{
            rotate: 0,
            stretch: 0,
            depth: 100,
            modifier: 1,
            slideShadows: false,
          }}
          modules={[EffectCoverflow]}
          className="stacked-preview-swiper"
        >
          {photos.map((photo, index) => (
            <SwiperSlide key={index}>
              <Box
                onClick={() => onPhotoClick(index)}
                sx={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  '&:hover': {
                    transform: 'scale(1.05)',
                    transition: 'transform 0.2s',
                  },
                }}
              >
                <img
                  src={photo.url}
                  alt={`Preview ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              </Box>
            </SwiperSlide>
          ))}
        </Swiper>
      </Box>
    );
  };

  // Add new component for fullscreen view
  const FullscreenPhotoView: React.FC<{
    photos: ImageUpload[];
    initialIndex: number;
    onClose: () => void;
  }> = ({ photos, initialIndex, onClose }) => {
    return (
      <Modal
        open={true}
        onClose={onClose}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'rgba(0,0,0,0.9)',
        }}
      >
        <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
          <IconButton
            onClick={onClose}
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              color: 'white',
              zIndex: 2,
            }}
          >
            <CloseIcon />
          </IconButton>
          <Swiper
            initialSlide={initialIndex}
            navigation={true}
            modules={[Navigation]}
            className="fullscreen-swiper"
          >
            {photos.map((photo, index) => (
              <SwiperSlide key={index}>
                <Box
                  sx={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <img
                    src={photo.url}
                    alt={`Fullscreen ${index + 1}`}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain',
                    }}
                  />
                </Box>
              </SwiperSlide>
            ))}
          </Swiper>
        </Box>
      </Modal>
    );
  };

  // Modify the tire photo section to include the new preview system
  const TirePhotoSection: React.FC<{
    position: 'passenger_front' | 'driver_front' | 'driver_rear' | 'passenger_rear' | 'spare' | 'undercarriage' | 'front_brakes' | 'rear_brakes';
    photos: ImageUpload[];
    onPhotoUpload: (position: string) => void;
  }> = ({ position, photos, onPhotoUpload }) => {
    // Filter out deleted photos for display
    const activePhotos = photos.filter(photo => !photo.isDeleted);
    
    return (
      <Box sx={{ position: 'relative' }}>
        <Box
          sx={{
            border: '1px dashed #ccc',
            borderRadius: 2,
            width: '100%',
            aspectRatio: '4/1',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            mb: 2,
            overflow: 'hidden',
            bgcolor: 'grey.50',
          }}
        >
          {activePhotos.length === 0 ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                p: 2,
                width: '100%',
                height: '100%',
              }}
              onClick={() => onPhotoUpload(position)}
            >
              <CameraAltIcon sx={{ fontSize: 32, color: '#888', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                Click to upload {position.replace('_', ' ')} photos
              </Typography>
            </Box>
          ) : (
            <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
              <img
                src={activePhotos[0]?.url}
                alt={`${position} photo`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
              <IconButton
                onClick={() => onPhotoUpload(position)}
                sx={{
                  position: 'absolute',
                  bottom: 8,
                  right: 8,
                  bgcolor: 'rgba(255,255,255,0.9)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,1)' },
                  boxShadow: 1,
                }}
              >
                <CameraAltIcon sx={{ fontSize: 24, color: '#888' }} />
              </IconButton>
            </Box>
          )}
        </Box>
        {activePhotos.length > 0 && (
          <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {activePhotos.map((photo, index) => (
              <img
                key={index}
                src={photo.url}
                alt={`${position} ${index + 1}`}
                style={{ maxWidth: '100px', maxHeight: '100px', cursor: 'pointer' }}
                onClick={() => handleImageClick(activePhotos)}
              />
            ))}
          </Box>
        )}
      </Box>
    );
  };

  // Add styles for the Swiper components
  const swiperStyles = `
    .stacked-preview-swiper {
      width: 100%;
      height: 100%;
    }
    .stacked-preview-swiper .swiper-slide {
      width: 60px;
      height: 60px;
      margin-right: -20px;
    }
    .fullscreen-swiper {
      width: 100%;
      height: 100%;
    }
    .fullscreen-swiper .swiper-slide {
      width: 100%;
      height: 100%;
    }
  `;

  // Add the styles to the document
  const styleSheet = document.createElement('style');
  styleSheet.textContent = swiperStyles;
  document.head.appendChild(styleSheet);

  // Update the tire sections to use the new component
  // Replace each tire section's photo upload box with:
  <TirePhotoSection
    position="passenger_front"
    photos={form.tire_photos.find(p => p.type === 'passenger_front')?.photos || []}
    onPhotoUpload={handleTirePhotoClick}
  />

  // Add the fullscreen view component at the end of the component
  {slideshowOpen && photoMenuPosition && (
    <FullscreenPhotoView
      photos={form.tire_photos.find(p => p.type === photoMenuPosition)?.photos || []}
      initialIndex={selectedPhotoIndex}
      onClose={() => {
        setSlideshowOpen(false);
        setPhotoMenuPosition('');
      }}
    />
  )}

  // Update all tire condition sections
  const TireConditionSection: React.FC<{
    position: 'passenger_front' | 'driver_front' | 'driver_rear' | 'passenger_rear' | 'spare';
    label: string;
  }> = ({ position, label }) => {
    // Filter out deleted photos for the TireTreadSection
    const tirePhotos = form.tire_photos.find(p => p.type === position)?.photos || [];
    const activeTirePhotos = tirePhotos.filter(photo => !photo.isDeleted);
    
    return (
      <Box>
        <TireTreadSection
          label={label}
          value={form.tire_tread[position]}
          onChange={(field, value) => handleTreadChange(position, field, value)}
          onConditionChange={(field, condition) => handleTreadConditionChange(position, field, condition)}
          onPhotoClick={() => handleTirePhotoClick(position)}
          onAddPhoto={() => handleChooseFile(position)}
          onDeletePhoto={(index) => handleDeleteTirePhoto(position, index)}
          tireDate={form.tire_dates[position] || ''}
          onTireDateChange={(date) => handleTireDateChange(position, date)}
          tireComments={form.tire_comments[position] || []}
          onTireCommentToggle={(comment) => handleTireCommentToggle(position, comment)}
          photos={activeTirePhotos}
        />
      </Box>
    );
  };

  // Add the handleTireCommentToggle function
  const handleTireCommentToggle = (position: string, comment: string) => {
    setForm(f => ({
      ...f,
      tire_comments: {
        ...f.tire_comments,
        [position]: f.tire_comments?.[position]?.includes(comment)
          ? f.tire_comments[position].filter(c => c !== comment)
          : [...(f.tire_comments?.[position] || []), comment]
      }
    }));
  };

  const handleTreadChange = (position: string, field: keyof TireTread, value: string) => {
    setForm(f => {
      const newForm = {
        ...f,
        tire_tread: {
          ...f.tire_tread,
          [position]: {
            ...f.tire_tread[position as keyof typeof f.tire_tread],
            [field]: value,
          },
        },
      };
      return newForm;
    });
  };

  const handleTreadConditionChange = (position: string, field: keyof TireTread, value: TreadCondition) => {
    setForm(f => {
      const newForm = {
        ...f,
        tire_tread: {
          ...f.tire_tread,
          [position]: {
            ...f.tire_tread[position as keyof typeof f.tire_tread],
            [field]: value,
          },
        },
      };
      return newForm;
    });
  };

  const PhotoSlideshow: React.FC<{
    open: boolean;
    photos: ImageUpload[];
    onClose: () => void;
    onDelete: (index: number) => void;
  }> = ({ open, photos, onClose, onDelete }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const handlePrevious = () => {
      setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
    };

    const handleNext = () => {
      setCurrentIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
    };

    if (!open || photos.length === 0) return null;

    return (
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'black',
            position: 'relative',
            height: '90vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }
        }}
      >
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: 'white',
            zIndex: 1
          }}
        >
          <CloseIcon />
        </IconButton>

        <IconButton
          onClick={() => onDelete(currentIndex)}
          sx={{
            position: 'absolute',
            right: 8,
            top: 48,
            color: 'white',
            zIndex: 1
          }}
        >
          <DeleteIcon />
        </IconButton>

        <IconButton
          onClick={handlePrevious}
          sx={{
            position: 'absolute',
            left: 8,
            color: 'white',
            zIndex: 1
          }}
        >
          <ArrowBackIosIcon />
        </IconButton>

        <IconButton
          onClick={handleNext}
          sx={{
            position: 'absolute',
            right: 8,
            color: 'white',
            zIndex: 1
          }}
        >
          <ArrowForwardIosIcon />
        </IconButton>

        <Box
          sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
          }}
        >
          <img
            src={URL.createObjectURL(photos[currentIndex].file)}
            alt={`Photo ${currentIndex + 1}`}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain'
            }}
          />
          <Typography
            sx={{
              position: 'absolute',
              bottom: 16,
              color: 'white',
              bgcolor: 'rgba(0,0,0,0.5)',
              padding: '4px 8px',
              borderRadius: 1
            }}
          >
            {currentIndex + 1} / {photos.length}
          </Typography>
        </Box>
      </Dialog>
    );
  };

  const handleTireDateChange = (position: string, date: string) => {
    setForm(f => ({
      ...f,
      tire_dates: {
        ...f.tire_dates,
        [position]: date
      }
    }));
  };

  const handleDeleteTirePhoto = async (position: string, index: number) => {
    const tirePhoto = form.tire_photos.find(p => p.type === position);
    if (tirePhoto && tirePhoto.photos[index]) {
      const photoToRemove = tirePhoto.photos[index];
      
      if (photoToRemove.position && backendChecklistId) {
        try {
          // Call the API to mark the photo as deleted
          const fieldName = `tire_${position}`;
          await deleteQuickCheckPhoto(backendChecklistId, fieldName, photoToRemove.position);
          
          // Mark the photo as deleted in the local state
          setForm(f => ({
            ...f,
            tire_photos: f.tire_photos.map(photo => {
              if (photo.type === position) {
                return {
                  ...photo,
                  photos: photo.photos.map((p, i) => 
                    i === index ? { ...p, isDeleted: true } : p
                  )
                };
              }
              return photo;
            })
          }));
        } catch (error) {
          console.error('Error deleting tire photo:', error);
          setError('Failed to delete photo');
        }
      } else {
        // For draft mode or missing position, just remove from local state
        const fieldName = `tire_${position}`;
        removeFromUploadedTracking(fieldName, photoToRemove.file.name);
        
        setForm(f => ({
          ...f,
          tire_photos: f.tire_photos.map(photo => {
            if (photo.type === position) {
              return {
                ...photo,
                photos: photo.photos.filter((_, i) => i !== index)
              };
            }
            return photo;
          })
        }));
      }
    }
  };

  const loadInspectionHistory = async () => {
    try {
      const response = await getQuickCheckHistory();
      setInspectionHistory(response || []);
    } catch (error) {
      console.error('Failed to load inspection history:', error);
    }
  };

  const handleShowHistory = () => {
    setShowHistory(!showHistory);
    if (!showHistory) {
      loadInspectionHistory();
    }
  };

  // Function to show timing information
  const handleShowTiming = async () => {
    // Use virtual timing data and form data for complete timing information
    const virtualTimingData = {
      id: backendChecklistId || 0,
      status: 'active',
      totalDuration: Object.values(virtualTiming).reduce((sum, tab) => sum + tab.duration, 0),
      tabTimings: {
        info: {
          start: virtualTiming.info.startTime?.toISOString() || null,
          end: null,
          duration: getTabDuration('info'),
          isActive: virtualTiming.info.isActive,
          savedDuration: form.tab_timings.info_duration
        },
        pulling: {
          start: virtualTiming.pulling.startTime?.toISOString() || null,
          end: null,
          duration: getTabDuration('pulling'),
          isActive: virtualTiming.pulling.isActive,
          savedDuration: form.tab_timings.pulling_duration
        },
        underhood: {
          start: virtualTiming.underhood.startTime?.toISOString() || null,
          end: null,
          duration: getTabDuration('underhood'),
          isActive: virtualTiming.underhood.isActive,
          savedDuration: form.tab_timings.underhood_duration
        },
        tires: {
          start: virtualTiming.tires.startTime?.toISOString() || null,
          end: null,
          duration: getTabDuration('tires'),
          isActive: virtualTiming.tires.isActive,
          savedDuration: form.tab_timings.tires_duration
        }
      },
      durations: {
        createdToSubmitted: 0,
        submittedToArchived: 0,
        createdToArchived: 0
      },
      timestamps: {
        created: new Date().toISOString(),
        updated: new Date().toISOString()
      }
    };
    
    setTimingData(virtualTimingData);
      setShowTimingDialog(true);
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

  // Handler to delete an inspection
  const handleDeleteInspection = async (id: number) => {
    try {
      await deleteQuickCheck(id);
      setInspectionHistory((prev) => prev.filter((inspection) => inspection.id !== id));
    } catch (error) {
      alert('Failed to delete inspection.');
    }
  };

  const [vehicleDetails, setVehicleDetails] = useState<any | null>(null);
  const [vinDecodeLoading, setVinDecodeLoading] = useState(false);
  const [vinDecodeError, setVinDecodeError] = useState<string | null>(null);
  const [lastDecodedVin, setLastDecodedVin] = useState<string | null>(null);

  // Load saved form data from localStorage on component mount (only if not loading from URL)
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const draftIdFromUrl = urlParams.get('draftId');
    
    // Only load from localStorage if we're not loading from a URL parameter
    if (!draftIdFromUrl) {
      const savedFormData = localStorage.getItem('quickCheckFormData');
      if (savedFormData) {
        try {
          const parsedData = JSON.parse(savedFormData);
          setForm(parsedData);
          console.log('Loaded saved form data from localStorage');
        } catch (error) {
          console.error('Error loading saved form data:', error);
        }
      }
    }
  }, [location.search]);

  // Save form data to localStorage whenever form changes (excluding File objects)
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const draftIdFromUrl = urlParams.get('draftId');
    
    // Don't overwrite localStorage if we're loading from a URL parameter
    if (draftIdFromUrl) {
      console.log('Skipping localStorage save - loading from URL parameter');
      return;
    }
    
    const cleanData = {
      ...form,
      // Remove File objects since they can't be serialized to JSON
      dash_lights_photos: [],
      tpms_placard: [],
      washer_fluid_photo: [],
      engine_air_filter_photo: [],
      battery_photos: [],
      tpms_tool_photo: [],
      front_brakes: [],
      rear_brakes: [],
      tire_photos: form.tire_photos.map(tp => ({
        type: tp.type,
        photos: []
      }))
    };
    localStorage.setItem('quickCheckFormData', JSON.stringify(cleanData));
  }, [form, location.search]);

  // Function to clear saved form data
  const clearSavedFormData = () => {
    localStorage.removeItem('quickCheckFormData');
  };

  // Load draft data from URL parameter on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const draftIdFromUrl = urlParams.get('draftId');
    
    if (draftIdFromUrl) {
      const loadDraftFromUrl = async () => {
        try {
          // Fetch the draft data from the backend
          const response = await getDraftQuickChecks();
          const draft = response.find((d: any) => d.id === parseInt(draftIdFromUrl));
          
          if (draft && draft.data) {
            // Set the backend checklist ID
            setBackendChecklistId(parseInt(draftIdFromUrl));
            
            // Parse and set the form data
            const parsedData: any = JSON.parse(draft.data);
            
            console.log('Parsed draft data:', parsedData); // Debug log
            console.log('Dash lights photos from backend:', parsedData.dash_lights_photos); // Debug log
            
            // Track entry to current tab (default to 0 if not specified)
            try {
              await trackTabEntry(parseInt(draftIdFromUrl), 0);
              setCurrentTabStartTime(new Date());
              console.log('Tracked entry to tab for loaded draft');
            } catch (error) {
              console.error('Failed to track tab entry for loaded draft:', error);
            }
            
            // Convert image data to proper ImageUpload format
            const convertImagesToUploadFormat = (images: any[]): ImageUpload[] => {
              if (!Array.isArray(images)) return [];
              
              console.log('Converting images:', images); // Debug log
              
              const converted: ImageUpload[] = [];
              
              images.forEach((img: any, index: number) => {
                console.log(`Image ${index}:`, img); // Debug log for each image
                
                // Handle different possible formats
                let url = '';
                let filename = '';
                
                if (typeof img === 'string') {
                  // If img is just a string, treat it as a URL
                  url = img;
                  filename = `image_${index}.jpg`;
                } else if (img && typeof img === 'object') {
                  // If img is an object, look for various possible properties
                  url = img.url || img.path || img.src || img.filename || '';
                  filename = img.filename || img.name || `image_${index}.jpg`;
                }
                
                // If we still don't have a URL, try to construct one
                if (!url && img) {
                  // If img has a filename but no URL, construct a URL
                  if (img.filename) {
                    url = `/uploads/${img.filename}`;
                  }
                }
                
                console.log(`Converted image ${index}:`, { url, filename }); // Debug log
                
                // Only add if we have a valid URL
                if (url) {
                  converted.push({
                    file: new File([], filename, { type: 'image/jpeg' }),
                    progress: 100,
                    url: url
                  });
                }
              });
              
              console.log('Final converted images:', converted); // Debug log
              return converted;
            };
            
            // Convert tire photos
            const convertedTirePhotos = parsedData.tire_photos?.map((tp: any) => ({
              type: tp.type,
              photos: convertImagesToUploadFormat(tp.photos)
            })) || [];
            
            // Create the converted form data
            const convertedFormData = {
              ...parsedData,
              dash_lights_photos: convertImagesToUploadFormat(parsedData.dash_lights_photos),
              tpms_placard: convertImagesToUploadFormat(parsedData.tpms_placard),
              washer_fluid_photo: convertImagesToUploadFormat(parsedData.washer_fluid_photo),
              engine_air_filter_photo: convertImagesToUploadFormat(parsedData.engine_air_filter_photo),
              battery_photos: convertImagesToUploadFormat(parsedData.battery_photos),
              tpms_tool_photo: convertImagesToUploadFormat(parsedData.tpms_tool_photo),
              front_brakes: convertImagesToUploadFormat(parsedData.front_brakes),
              rear_brakes: convertImagesToUploadFormat(parsedData.rear_brakes),
              tire_photos: convertedTirePhotos
            };
            
            console.log('Final converted form data:', convertedFormData); // Debug log
            console.log('Dash lights photos in converted data:', convertedFormData.dash_lights_photos); // Debug log
            
            setForm(convertedFormData);
            
            // Save to localStorage for persistence
            localStorage.setItem('quickCheckFormData', draft.data);
            localStorage.setItem('currentDraftId', draftIdFromUrl);
            
            console.log('Loaded draft data from URL parameter:', draftIdFromUrl);
          } else {
            console.error('Draft not found:', draftIdFromUrl);
          }
        } catch (error: any) {
          console.error('Error loading draft from URL:', error);
        }
      };
      
      loadDraftFromUrl();
    }
  }, [location.search]);

  // Calculate duration in seconds
  const calculateDuration = () => {
    if (!formStartTime) return 0;
    const now = new Date();
    return Math.floor((now.getTime() - formStartTime.getTime()) / 1000);
  };

  // Set start time when component mounts
  useEffect(() => {
    setFormStartTime(new Date());
    // Start timer for the initial tab (Info tab)
    startTabTimer('info');
  }, []);

  return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4, pb: 12 }}>
          {/* Header with timing button */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h4" component="h1">
              Quick Check Form
            </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<TimerIcon />}
              onClick={handleShowTiming}
            >
              View Timing
            </Button>
            <Button
              variant="outlined"
              onClick={handleCancel}
              color="error"
            >
              Cancel
            </Button>
          </Box>
          </Box>

          <Paper sx={{ width: '100%' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs
                value={tabValue}
                onChange={handleTabChange}
                aria-label="quick check tabs"
                variant="scrollable"
                scrollButtons="auto"
              >
                <Tab label="Info" />
                <Tab label="Pulling Into Bay" />
                <Tab label="Underhood" />
                <Tab label="Tires and Brakes" />
              </Tabs>
            </Box>

            <form onSubmit={handleSubmit}>
              {/* Info Tab */}
              <TabPanel value={tabValue} index={0}>
                <Grid container spacing={3}>
                  <Grid columns={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="User"
                      name="user"
                      value={form.user}
                      disabled
                    />
                  </Grid>

                  <Grid columns={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="Date"
                      name="date"
                      type="date"
                      value={form.date}
                      disabled
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                </Grid>
              </TabPanel>
                
              {/* Pulling Into Bay Tab */}
              <TabPanel value={tabValue} index={1}>
                <Grid container spacing={3}>
                  {/* Dash Lights */}
                  <Grid columns={{ xs: 12 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body1" sx={{ flexGrow: 1 }}>
                        Dash Lights
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={(e) => handleInfoClick(e, "With Vehicle Running what lights are on before we perform any services?")}
                        sx={{ ml: 1 }}
                      >
                        <InfoIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    <Box
                      sx={{
                        border: '1px dashed #ccc',
                        borderRadius: 2,
                        width: '100%',
                        aspectRatio: '4/1',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        mb: 2,
                        overflow: 'hidden',
                        bgcolor: 'grey.50',
                      }}
                    >
                      {!form.dash_lights_photos.length ? (
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            p: 2,
                            width: '100%',
                            height: '100%',
                      }}
                      onClick={() => dashLightsInputRef.current?.click()}
                    >
                          <CameraAltIcon sx={{ fontSize: 32, color: '#888', mb: 1 }} />
                          <Typography variant="body2" color="text.secondary">
                            Click to upload dash light photos
                          </Typography>
                    </Box>
                      ) : (
                        <Box
                          sx={{
                            position: 'relative',
                            width: '100%',
                            height: '100%',
                          }}
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              gap: 2,
                              width: '100%',
                              height: '100%',
                              p: 2,
                              overflowX: 'auto',
                              '&::-webkit-scrollbar': {
                                height: '8px',
                              },
                              '&::-webkit-scrollbar-track': {
                                background: '#f1f1f1',
                                borderRadius: '4px',
                              },
                              '&::-webkit-scrollbar-thumb': {
                                background: '#888',
                                borderRadius: '4px',
                                '&:hover': {
                                  background: '#555',
                                },
                              },
                            }}
                          >
                            {form.dash_lights_photos
                              .filter(photo => !photo.isDeleted) // Filter out deleted photos
                              .map((photo, index) => {
                              console.log(`Rendering dash light photo ${index}:`, photo); // Debug log
                              return (
                                <Box
                                  key={index}
                                  sx={{
                                    position: 'relative',
                                    flex: '0 0 auto',
                                    width: 'calc(25% - 12px)',
                                    height: '100%',
                                    cursor: 'pointer',
                                    '&:hover': {
                                      '& .overlay': {
                                        opacity: 1,
                                      },
                                    },
                                  }}
                                  onClick={() => handleImageClick(form.dash_lights_photos.filter(p => !p.isDeleted))}
                                >
                                  <Tooltip title="Click to view full size">
                                    <img
                                      src={photo.url}
                                      alt={`Dash Light ${index + 1}`}
                                      style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        borderRadius: 4,
                                      }}
                                      onLoad={() => console.log(`Dash light image ${index} loaded successfully:`, photo.url)}
                                      onError={(e) => {
                                        console.error(`Failed to load dash light image ${index}:`, photo.url, e);
                                        // Try to construct a different URL if the current one fails
                                        if (photo.url && !photo.url.startsWith('http') && !photo.url.startsWith('/uploads/')) {
                                          const newUrl = `/uploads/${photo.url}`;
                                          console.log(`Trying alternative URL for image ${index}:`, newUrl);
                                          e.currentTarget.src = newUrl;
                                        }
                                      }}
                                    />
                                  </Tooltip>
                                  <Box
                                    className="overlay"
                                    sx={{
                                      position: 'absolute',
                                      top: 0,
                                      left: 0,
                                      right: 0,
                                      bottom: 0,
                                      bgcolor: 'rgba(0,0,0,0.5)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      opacity: 0,
                                      transition: 'opacity 0.2s',
                                    }}
                                  >
                                    <IconButton
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveDashLightsPhoto(index);
                                      }}
                                      sx={{
                                        color: 'white',
                                        bgcolor: 'rgba(0,0,0,0.5)',
                                        '&:hover': {
                                          bgcolor: 'rgba(0,0,0,0.7)',
                                        },
                                      }}
                                    >
                                      <CloseIcon />
                                    </IconButton>
                                  </Box>
                                </Box>
                              );
                            })}
                          </Box>
                          <IconButton
                            onClick={() => dashLightsInputRef.current?.click()}
                            sx={{
                              position: 'absolute',
                              top: 8,
                              right: 8,
                              bgcolor: 'rgba(255,255,255,0.9)',
                              '&:hover': {
                                bgcolor: 'rgba(255,255,255,1)',
                              },
                              boxShadow: 1,
                            }}
                          >
                            <CameraAltIcon sx={{ fontSize: 24, color: '#888' }} />
                          </IconButton>
                        </Box>
                      )}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      hidden
                      ref={dashLightsInputRef}
                      onChange={e => handleDashLightsPhotoUpload(e.target.files)}
                    />
                    </Box>
                  </Grid>

                  {/* Mileage */}
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body1" sx={{ flexGrow: 1 }}>
                        Mileage<span style={{ color: 'red' }}>*</span>
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={(e) => handleInfoClick(e, "What is the Current Mileage")}
                        sx={{ ml: 1 }}
                      >
                        <InfoIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    <TextField
                      fullWidth
                      name="mileage"
                      value={form.mileage}
                      onChange={handleChange}
                      inputProps={{
                        inputMode: 'numeric',
                        pattern: '[0-9,]*',
                      }}
                    />
                  </Grid>

                  {/* Windshield Condition */}
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body1" sx={{ flexGrow: 1 }}>
                      Windshield Condition
                    </Typography>
                      <IconButton
                        size="small"
                        onClick={(e) => handleInfoClick(e, "Does the Windshield have any cracks larger than 8in? Are there any Star Cracks larger than 1in?")}
                        sx={{ ml: 1 }}
                      >
                        <InfoIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                      <Chip
                        label="✅ Good"
                        color="success"
                        variant={form.windshield_condition === 'good' ? 'filled' : 'outlined'}
                        clickable
                        onClick={() => handleRadioChange('windshield_condition', 'good')}
                        sx={{ fontWeight: form.windshield_condition === 'good' ? 'bold' : 'normal' }}
                      />
                      <Chip
                        label="❌ Bad"
                        color="error"
                        variant={form.windshield_condition === 'bad' ? 'filled' : 'outlined'}
                        clickable
                        onClick={() => handleRadioChange('windshield_condition', 'bad')}
                        sx={{ fontWeight: form.windshield_condition === 'bad' ? 'bold' : 'normal' }}
                      />
                    </Stack>
                  </Grid>

                  {/* Add Info Popover */}
                  <Popover
                    open={open}
                    anchorEl={infoAnchorEl}
                    onClose={handleInfoClose}
                    anchorOrigin={{
                      vertical: 'bottom',
                      horizontal: 'right',
                    }}
                    transformOrigin={{
                      vertical: 'top',
                      horizontal: 'right',
                    }}
                    PaperProps={{
                      sx: {
                        p: 2,
                        maxWidth: 300,
                        bgcolor: 'background.paper',
                        boxShadow: 3,
                      },
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      {infoContent}
                    </Typography>
                  </Popover>

                  {/* Wiper Blades */}
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body1" sx={{ flexGrow: 1 }}>
                      Wiper Blades<span style={{ color: 'red' }}>*</span>
                    </Typography>
                    </Box>
                    <Stack direction="row" spacing={2} sx={{ mt: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label="✅ Good"
                          color="success"
                        variant={form.wiper_blades === 'good' ? 'filled' : 'outlined'}
                        clickable
                          onClick={() => handleRadioChange('wiper_blades', 'good')}
                        sx={{ fontWeight: form.wiper_blades === 'good' ? 'bold' : 'normal', mb: 1 }}
                      />
                      <Chip
                        label="⚠️ Front Minor"
                          color="warning"
                        variant={form.wiper_blades === 'front_minor' ? 'filled' : 'outlined'}
                        clickable
                          onClick={() => handleRadioChange('wiper_blades', 'front_minor')}
                        sx={{ fontWeight: form.wiper_blades === 'front_minor' ? 'bold' : 'normal', mb: 1 }}
                      />
                      <Chip
                        label="❌ Front Moderate"
                          color="error"
                        variant={form.wiper_blades === 'front_moderate' ? 'filled' : 'outlined'}
                        clickable
                          onClick={() => handleRadioChange('wiper_blades', 'front_moderate')}
                        sx={{ fontWeight: form.wiper_blades === 'front_moderate' ? 'bold' : 'normal', mb: 1 }}
                      />
                      <Chip
                        label="🚨 Front Major"
                          color="error"
                        variant={form.wiper_blades === 'front_major' ? 'filled' : 'outlined'}
                        clickable
                          onClick={() => handleRadioChange('wiper_blades', 'front_major')}
                        sx={{ fontWeight: form.wiper_blades === 'front_major' ? 'bold' : 'normal', mb: 1 }}
                      />
                      <Chip
                        label="⚠️ Rear Minor"
                          color="warning"
                        variant={form.wiper_blades === 'rear_minor' ? 'filled' : 'outlined'}
                        clickable
                          onClick={() => handleRadioChange('wiper_blades', 'rear_minor')}
                        sx={{ fontWeight: form.wiper_blades === 'rear_minor' ? 'bold' : 'normal', mb: 1 }}
                      />
                      <Chip
                        label="❌ Rear Moderate"
                          color="error"
                        variant={form.wiper_blades === 'rear_moderate' ? 'filled' : 'outlined'}
                        clickable
                          onClick={() => handleRadioChange('wiper_blades', 'rear_moderate')}
                        sx={{ fontWeight: form.wiper_blades === 'rear_moderate' ? 'bold' : 'normal', mb: 1 }}
                      />
                      <Chip
                        label="🚨 Rear Major"
                          color="error"
                        variant={form.wiper_blades === 'rear_major' ? 'filled' : 'outlined'}
                        clickable
                          onClick={() => handleRadioChange('wiper_blades', 'rear_major')}
                        sx={{ fontWeight: form.wiper_blades === 'rear_major' ? 'bold' : 'normal', mb: 1 }}
                      />
                    </Stack>
                  </Grid>

                  {/* Washer Squirters */}
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body1" sx={{ flexGrow: 1 }}>
                      Washer Squirters<span style={{ color: 'red' }}>*</span>
                    </Typography>
                      <IconButton
                        size="small"
                        onClick={(e) => handleInfoClick(e, "1. Is the washer Fluid full\n2. Are the washer sprayers working correctly?\n3. Are the washer squirters leaking?\n4. Do you hear the Washer Pump Turn on?")}
                        sx={{ ml: 1 }}
                      >
                        <InfoIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    <Stack direction="row" spacing={2} sx={{ mt: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label="✅ Good"
                          color="success"
                        variant={form.washer_squirters === 'good' ? 'filled' : 'outlined'}
                        clickable
                          onClick={() => handleRadioChange('washer_squirters', 'good')}
                        sx={{ fontWeight: form.washer_squirters === 'good' ? 'bold' : 'normal', mb: 1 }}
                      />
                      <Chip
                        label="❌ Leaking"
                          color="error"
                        variant={form.washer_squirters === 'leaking' ? 'filled' : 'outlined'}
                        clickable
                          onClick={() => handleRadioChange('washer_squirters', 'leaking')}
                        sx={{ fontWeight: form.washer_squirters === 'leaking' ? 'bold' : 'normal', mb: 1 }}
                      />
                      <Chip
                        label="❌ Not Working"
                          color="error"
                        variant={form.washer_squirters === 'not_working' ? 'filled' : 'outlined'}
                        clickable
                          onClick={() => handleRadioChange('washer_squirters', 'not_working')}
                        sx={{ fontWeight: form.washer_squirters === 'not_working' ? 'bold' : 'normal', mb: 1 }}
                      />
                      <Chip
                        label="❌ Didn't Hear the Pump"
                          color="error"
                        variant={form.washer_squirters === 'no_pump_sound' ? 'filled' : 'outlined'}
                        clickable
                          onClick={() => handleRadioChange('washer_squirters', 'no_pump_sound')}
                        sx={{ fontWeight: form.washer_squirters === 'no_pump_sound' ? 'bold' : 'normal', mb: 1 }}
                      />
                    </Stack>
                  </Grid>
                </Grid>
              </TabPanel>

              {/* Underhood Tab */}
              <TabPanel value={tabValue} index={2}>
                <Grid container spacing={3}>
                  <Grid columns={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="VIN"
                      name="vin"
                      value={form.vin}
                      onChange={handleChange}
                      required
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton onClick={handleScannerOpen}>
                              <QrCodeScannerIcon />
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                    {/* VIN Decode Results */}
                    {vinDecodeLoading && (
                      <Box sx={{ mt: 1 }}><CircularProgress size={20} /> Decoding VIN...</Box>
                    )}
                    {vinDecodeError && (
                      <Box sx={{ mt: 1 }}><Alert severity="error">{vinDecodeError}</Alert></Box>
                    )}
                    {vehicleDetails && vehicleDetails.Results && (() => {
                      // Helper to get value by variable name
                      const getValue = (variable: string) => {
                        const found = vehicleDetails.Results.find((r: any) => r.Variable === variable);
                        return found && found.Value && found.Value !== 'Not Applicable' && found.Value !== '0' ? found.Value : '';
                      };
                      const year = getValue('Model Year');
                      const make = getValue('Make');
                      const model = getValue('Model');
                      const engine = getValue('Displacement (L)');
                      const label = [year, make, model, engine ? engine + 'L' : ''].filter(Boolean).join(' ');
                      if (!label) return null;
                      return (
                        <Box sx={{ mt: 1 }}>
                          <Chip label={label} color="primary" clickable onClick={() => setVehicleDetailsOpen(true)} />
                        </Box>
                      );
                    })()}
                  </Grid>

                  {/* TPMS Placard */}
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" gutterBottom>
                      TPMS Placard
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      {/* Camera Box Interface for TPMS Placard */}
                      <Box
                        sx={{
                          border: '1px dashed #ccc',
                          borderRadius: 2,
                          width: '100%',
                          aspectRatio: '4/1',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                          mb: 2,
                          overflow: 'hidden',
                          bgcolor: 'grey.50',
                          cursor: !form.tpms_placard.length ? 'pointer' : 'default',
                        }}
                        onClick={() => {
                          if (!form.tpms_placard.length) {
                            handleCameraOpen('tpms_placard');
                          }
                        }}
                      >
                        {form.tpms_placard.length === 0 ? (
                          <Box
                            sx={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              p: 2,
                              width: '100%',
                              height: '100%',
                            }}
                          >
                            <CameraAltIcon sx={{ fontSize: 32, color: '#888', mb: 1 }} />
                            <Typography variant="body2" color="text.secondary">
                              Click to upload TPMS placard photo
                            </Typography>
                          </Box>
                        ) : (
                          <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
                            <img
                              src={URL.createObjectURL(form.tpms_placard[0].file)}
                              alt="TPMS Placard"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onClick={() => handleImageClick(form.tpms_placard)}
                            />
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                setForm(f => ({ ...f, tpms_placard: [] }));
                              }}
                              sx={{
                                position: 'absolute',
                                top: 8,
                                right: 8,
                                backgroundColor: 'rgba(0,0,0,0.5)',
                                color: 'white',
                                '&:hover': { backgroundColor: 'rgba(0,0,0,0.7)' },
                              }}
                            >
                              <CloseIcon />
                            </IconButton>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl component="fieldset">
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <FormLabel component="legend">State Inspection Status</FormLabel>
                        <IconButton
                          size="small"
                          onClick={(e) => handleInfoClick(e, "Format: MM/YY (e.g., 12/25 for December 2025)")}
                          sx={{ ml: 1 }}
                        >
                          <InfoIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                        <TextField
                          size="small"
                          label="State Inspection Date"
                          placeholder="MM/YY"
                          value={form.state_inspection_date_code || ''}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                            if (value.length === 4) {
                              const month = value.slice(0, 2);
                              const year = value.slice(2, 4);
                              const formatted = `${month}/${year}`;
                              setForm(f => ({ ...f, state_inspection_date_code: formatted }));
                            } else {
                              setForm(f => ({ ...f, state_inspection_date_code: value }));
                            }
                          }}
                          inputProps={{
                            maxLength: 4,
                            pattern: '[0-9]*',
                            inputMode: 'numeric',
                            style: { textAlign: 'center' }
                          }}
                          sx={{
                            width: '100px',
                            '& .MuiInputBase-input::placeholder': {
                              opacity: 1,
                              color: 'text.secondary'
                            }
                          }}
                        />
                        {form.state_inspection_date_code && form.state_inspection_date_code.length === 5 && (() => {
                          const [month, year] = form.state_inspection_date_code.split('/');
                          const inspectionDate = new Date(2000 + parseInt(year), parseInt(month) - 1, 1);
                          const currentDate = new Date();
                          const isExpired = inspectionDate < currentDate;
                          
                          return (
                            <Chip
                              label={isExpired ? "❌ EXPIRED" : "✅ Valid"}
                              color={isExpired ? "error" : "success"}
                              variant="filled"
                              sx={{ fontWeight: 'bold' }}
                            />
                          );
                        })()}
                      </Box>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl component="fieldset" sx={{ width: '100%', position: 'relative' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <FormLabel component="legend">Washer Fluid</FormLabel>
                      </Box>
                      <Stack 
                        direction="row" 
                        spacing={1} 
                        sx={{ 
                          mt: 1,
                          flexWrap: 'wrap',
                          gap: 1,
                          '& .MuiChip-root': {
                            mb: 1
                          }
                        }}
                      >
                        <Chip
                          label="✅ Full"
                          color="success"
                          variant={form.washer_fluid === 'full' ? 'filled' : 'outlined'}
                          clickable
                          onClick={() => handleRadioChange('washer_fluid', 'full')}
                          sx={{ fontWeight: form.washer_fluid === 'full' ? 'bold' : 'normal' }}
                        />
                        <Chip
                          label="❌ Leaking"
                          color="error"
                          variant={form.washer_fluid === 'leaking' ? 'filled' : 'outlined'}
                          clickable
                          onClick={() => handleRadioChange('washer_fluid', 'leaking')}
                          sx={{ fontWeight: form.washer_fluid === 'leaking' ? 'bold' : 'normal' }}
                        />
                        <Chip
                          label="❌ Not Working"
                          color="error"
                          variant={form.washer_fluid === 'not_working' ? 'filled' : 'outlined'}
                          clickable
                          onClick={() => handleRadioChange('washer_fluid', 'not_working')}
                          sx={{ fontWeight: form.washer_fluid === 'not_working' ? 'bold' : 'normal' }}
                        />
                        <Chip
                          label="❌ No Pump Sound"
                          color="error"
                          variant={form.washer_fluid === 'no_pump_sound' ? 'filled' : 'outlined'}
                          clickable
                          onClick={() => handleRadioChange('washer_fluid', 'no_pump_sound')}
                          sx={{ fontWeight: form.washer_fluid === 'no_pump_sound' ? 'bold' : 'normal' }}
                        />
                      </Stack>
                      {form.washer_fluid_photo.length > 0 && (
                        <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {form.washer_fluid_photo.map((photo, index) => (
                            <img
                              key={index}
                              src={URL.createObjectURL(photo.file)}
                              alt={`Washer Fluid ${index + 1}`}
                              style={{ maxWidth: '100px', maxHeight: '100px', cursor: 'pointer' }}
                              onClick={() => handleImageClick(form.washer_fluid_photo)}
                            />
                          ))}
                        </Box>
                      )}
                      <IconButton
                        onClick={() => handleCameraOpen('washer_fluid')}
                        color="primary"
                        size="small"
                        sx={{
                          position: 'absolute',
                          right: 0,
                          top: 0
                        }}
                      >
                        <CameraAltIcon />
                      </IconButton>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl component="fieldset" sx={{ width: '100%', position: 'relative' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <FormLabel component="legend">Engine Air Filter</FormLabel>
                      </Box>
                      <Stack 
                        direction="row" 
                        spacing={1} 
                        sx={{ 
                          mt: 1,
                          flexWrap: 'wrap',
                          gap: 1,
                          '& .MuiChip-root': {
                            mb: 1
                          }
                        }}
                      >
                        <Chip
                          label="✅ Good"
                          color="success"
                          variant={form.engine_air_filter === 'good' ? 'filled' : 'outlined'}
                          clickable
                          onClick={() => handleRadioChange('engine_air_filter', 'good')}
                          sx={{ fontWeight: form.engine_air_filter === 'good' ? 'bold' : 'normal' }}
                        />
                        <Chip
                          label="⚠️ Next Oil Change"
                          color="warning"
                          variant={form.engine_air_filter === 'next_oil_change' ? 'filled' : 'outlined'}
                          clickable
                          onClick={() => handleRadioChange('engine_air_filter', 'next_oil_change')}
                          sx={{ fontWeight: form.engine_air_filter === 'next_oil_change' ? 'bold' : 'normal' }}
                        />
                        <Chip
                          label="❌ Highly Recommended"
                          color="warning"
                          variant={form.engine_air_filter === 'highly_recommended' ? 'filled' : 'outlined'}
                          clickable
                          onClick={() => handleRadioChange('engine_air_filter', 'highly_recommended')}
                          sx={{ fontWeight: form.engine_air_filter === 'highly_recommended' ? 'bold' : 'normal' }}
                        />
                        <Chip
                          label="🚨 Today"
                          color="error"
                          variant={form.engine_air_filter === 'today' ? 'filled' : 'outlined'}
                          clickable
                          onClick={() => handleRadioChange('engine_air_filter', 'today')}
                          sx={{ fontWeight: form.engine_air_filter === 'today' ? 'bold' : 'normal' }}
                        />
                        <Chip
                          label="🐀 Animal Related"
                          color="error"
                          variant={form.engine_air_filter === 'animal_related' ? 'filled' : 'outlined'}
                          clickable
                          onClick={() => handleRadioChange('engine_air_filter', 'animal_related')}
                          sx={{ fontWeight: form.engine_air_filter === 'animal_related' ? 'bold' : 'normal' }}
                        />
                      </Stack>
                      {form.engine_air_filter_photo.length > 0 && (
                        <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {form.engine_air_filter_photo.map((photo, index) => (
                            <img
                              key={index}
                              src={URL.createObjectURL(photo.file)}
                              alt={`Engine Air Filter ${index + 1}`}
                              style={{ maxWidth: '100px', maxHeight: '100px', cursor: 'pointer' }}
                              onClick={() => handleImageClick(form.engine_air_filter_photo)}
                            />
                          ))}
                        </Box>
                      )}
                      <IconButton
                        onClick={() => handleCameraOpen('engine_air_filter')}
                        color="primary"
                        size="small"
                        sx={{
                          position: 'absolute',
                          right: 0,
                          top: 0
                        }}
                      >
                        <CameraAltIcon />
                      </IconButton>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <FormControl component="fieldset" sx={{ width: '100%', position: 'relative' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <FormLabel component="legend">Battery Condition</FormLabel>
                      </Box>
                      <Stack 
                        direction="row" 
                        spacing={1} 
                        sx={{ 
                          mt: 1,
                          flexWrap: 'wrap',
                          gap: 1,
                          '& .MuiChip-root': {
                            mb: 1
                          }
                        }}
                      >
                        <Chip
                          label="✅ Good"
                          color="success"
                          variant={form.battery_condition.some(condition => condition === 'good') ? 'filled' : 'outlined'}
                          clickable
                          onClick={() => handleBatteryConditionToggle('good')}
                          sx={{ fontWeight: form.battery_condition.some(condition => condition === 'good') ? 'bold' : 'normal' }}
                        />
                        <Chip
                          label="⚠️ Warning"
                          color="warning"
                          variant={form.battery_condition.some(condition => condition === 'warning') ? 'filled' : 'outlined'}
                          clickable
                          onClick={() => handleBatteryConditionToggle('warning')}
                          sx={{ fontWeight: form.battery_condition.some(condition => condition === 'warning') ? 'bold' : 'normal' }}
                        />
                        <Chip
                          label="❌ Bad"
                          color="error"
                          variant={form.battery_condition.some(condition => condition === 'bad') ? 'filled' : 'outlined'}
                          clickable
                          onClick={() => handleBatteryConditionToggle('bad')}
                          sx={{ fontWeight: form.battery_condition.some(condition => condition === 'bad') ? 'bold' : 'normal' }}
                        />
                        <Chip
                          label="N/A"
                          color="default"
                          variant={form.battery_condition.some(condition => condition === 'na') ? 'filled' : 'outlined'}
                          clickable
                          onClick={() => handleBatteryConditionToggle('na')}
                          sx={{ 
                            fontWeight: form.battery_condition.some(condition => condition === 'na') ? 'bold' : 'normal',
                            fontSize: form.battery_condition.some(condition => condition === 'na') ? '1.1em' : '1em',
                            transform: form.battery_condition.some(condition => condition === 'na') ? 'scale(1.05)' : 'scale(1)',
                            transition: 'all 0.2s ease-in-out',
                            boxShadow: form.battery_condition.some(condition => condition === 'na') ? '0 2px 8px rgba(0,0,0,0.3)' : 'none',
                            bgcolor: form.battery_condition.some(condition => condition === 'na') ? '#d0d0d0' : 'transparent',
                            color: form.battery_condition.some(condition => condition === 'na') ? '#333333' : 'inherit'
                          }}
                        />
                        <Chip
                          label="🔧 Terminal Cleaning"
                          color="info"
                          variant={form.battery_condition.some(condition => condition === 'terminal_cleaning') ? 'filled' : 'outlined'}
                          clickable
                          onClick={() => handleBatteryConditionToggle('terminal_cleaning')}
                          sx={{ fontWeight: form.battery_condition.some(condition => condition === 'terminal_cleaning') ? 'bold' : 'normal' }}
                        />
                      </Stack>
                      <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                        <TextField
                          size="small"
                          label="Battery Date Code"
                          placeholder="MM/YY"
                          value={form.battery_date_code || ''}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                            if (value.length === 4) {
                              const month = value.slice(0, 2);
                              const year = value.slice(2, 4);
                              const formatted = `${month}/${year}`;
                              setForm(f => ({ ...f, battery_date_code: formatted }));
                            } else {
                              setForm(f => ({ ...f, battery_date_code: value }));
                            }
                          }}
                          inputProps={{
                            maxLength: 4,
                            pattern: '[0-9]*',
                            inputMode: 'numeric',
                            style: { textAlign: 'center' }
                          }}
                          sx={{
                            width: '100px',
                            '& .MuiInputBase-input::placeholder': {
                              opacity: 1,
                              color: 'text.secondary'
                            }
                          }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          Format: MM/YY (e.g., 12/25 for December 2025)
                        </Typography>
                      </Box>
                      {form.battery_photos.length > 0 && (
                        <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {form.battery_photos.map((photo, index) => (
                            <img
                              key={index}
                              src={URL.createObjectURL(photo.file)}
                              alt={`Battery ${index + 1}`}
                              style={{ maxWidth: '100px', maxHeight: '100px', cursor: 'pointer' }}
                              onClick={() => handleImageClick(form.battery_photos)}
                            />
                          ))}
                        </Box>
                      )}
                      <IconButton
                        onClick={() => handleCameraOpen('battery')}
                        color="primary"
                        size="small"
                        sx={{
                          position: 'absolute',
                          right: 0,
                          top: 0
                        }}
                      >
                        <CameraAltIcon />
                      </IconButton>
                    </FormControl>
                  </Grid>
                </Grid>
              </TabPanel>

              {/* Tires and Brakes Tab */}
              <TabPanel value={tabValue} index={3}>
                <Grid container spacing={3}>
                  {/* Front Axle Section */}
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      Front Axle
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                  </Grid>

                  {/* Passenger Front */}
                  <Grid item xs={12} sm={6}>
                    <TireTreadSection
                      label="Passenger Front Tire Tread"
                      value={form.tire_tread.passenger_front}
                      onChange={(field, value) => handleTreadChange('passenger_front', field, value)}
                      onConditionChange={(field, condition) => handleTreadConditionChange('passenger_front', field, condition)}
                      onPhotoClick={() => handleTirePhotoClick('passenger_front')}
                      onAddPhoto={() => handleChooseFile('passenger_front')}
                      onDeletePhoto={(index) => handleDeleteTirePhoto('passenger_front', index)}
                      tireDate={form.tire_dates.passenger_front || ''}
                      onTireDateChange={(date) => handleTireDateChange('passenger_front', date)}
                      tireComments={form.tire_comments.passenger_front || []}
                      onTireCommentToggle={(comment) => handleTireCommentToggle('passenger_front', comment)}
                      photos={form.tire_photos.find(p => p.type === 'passenger_front')?.photos.filter(photo => !photo.isDeleted) || []}
                    />
                  </Grid>

                  {/* Front Brake Pads (New UI) */}
                  <Grid item xs={12} sm={6}>
                    <BrakePadSection
                      label="Front Brake Pads"
                      onCameraClick={() => handleCameraOpen('front_brakes')}
                      onChooseFile={() => handleChooseFile('front_brakes')}
                      photos={form.front_brakes}
                      onPhotoClick={handleImageClick}
                      onDeletePhoto={(index) => handleDeleteTirePhoto('front_brakes', index)}
                      innerPad={form.front_brake_pads.inner}
                      outerPad={form.front_brake_pads.outer}
                      rotorCondition={form.front_brake_pads.rotor_condition}
                      onInnerPadChange={(value) => setForm(prev => ({
                        ...prev,
                        front_brake_pads: {
                          ...prev.front_brake_pads,
                          inner: Number(value)
                        }
                      }))}
                      onOuterPadChange={(value) => setForm(prev => ({
                        ...prev,
                        front_brake_pads: {
                          ...prev.front_brake_pads,
                          outer: Number(value)
                        }
                      }))}
                      onRotorConditionChange={(condition) => setForm(prev => ({
                        ...prev,
                        front_brake_pads: {
                          ...prev.front_brake_pads,
                          rotor_condition: condition
                        }
                      }))}
                    />
                  </Grid>

                  {/* Driver Front */}
                  <Grid item xs={12} sm={6}>
                    <TireTreadSection
                      label="Driver Front Tire Tread"
                      value={form.tire_tread['driver_front']}
                      onChange={(field, value) => handleTreadChange('driver_front', field, value)}
                      onConditionChange={(field, condition) => handleTreadConditionChange('driver_front', field, condition)}
                      onPhotoClick={() => handleTirePhotoClick('driver_front')}
                      onAddPhoto={() => handleChooseFile('driver_front')}
                      onDeletePhoto={(index) => handleDeleteTirePhoto('driver_front', index)}
                      tireDate={form.tire_dates.driver_front || ''}
                      onTireDateChange={(date) => handleTireDateChange('driver_front', date)}
                      tireComments={form.tire_comments.driver_front || []}
                      onTireCommentToggle={(comment) => handleTireCommentToggle('driver_front', comment)}
                      photos={form.tire_photos.find(p => p.type === 'driver_front')?.photos.filter(photo => !photo.isDeleted) || []}
                    />
                  </Grid>

                  {/* Rear Axle Section */}
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
                      Rear Axle
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                  </Grid>

                  {/* Driver Rear */}
                  <Grid columns={{ xs: 12, sm: 6 }}>
                    <TireTreadSection
                      label="Driver Rear Tire Tread"
                      value={form.tire_tread['driver_rear']}
                      onChange={(field, value) => handleTreadChange('driver_rear', field, value)}
                      onConditionChange={(field, condition) => handleTreadConditionChange('driver_rear', field, condition)}
                      onPhotoClick={() => handleTirePhotoClick('driver_rear')}
                      onAddPhoto={() => handleChooseFile('driver_rear')}
                      onDeletePhoto={(index) => handleDeleteTirePhoto('driver_rear', index)}
                      tireDate={form.tire_dates.driver_rear || ''}
                      onTireDateChange={(date) => handleTireDateChange('driver_rear', date)}
                      tireComments={form.tire_comments.driver_rear || []}
                      onTireCommentToggle={(comment) => handleTireCommentToggle('driver_rear', comment)}
                      photos={form.tire_photos.find(p => p.type === 'driver_rear')?.photos || []}
                    />
                  </Grid>

                  {/* Passenger Rear */}
                  <Grid columns={{ xs: 12, sm: 6 }}>
                    <TireTreadSection
                      label="Passenger Rear Tire Tread"
                      value={form.tire_tread['passenger_rear']}
                      onChange={(field, value) => handleTreadChange('passenger_rear', field, value)}
                      onConditionChange={(field, condition) => handleTreadConditionChange('passenger_rear', field, condition)}
                      onPhotoClick={() => handleTirePhotoClick('passenger_rear')}
                      onAddPhoto={() => handleChooseFile('passenger_rear')}
                      onDeletePhoto={(index) => handleDeleteTirePhoto('passenger_rear', index)}
                      tireDate={form.tire_dates.passenger_rear || ''}
                      onTireDateChange={(date) => handleTireDateChange('passenger_rear', date)}
                      tireComments={form.tire_comments.passenger_rear || []}
                      onTireCommentToggle={(comment) => handleTireCommentToggle('passenger_rear', comment)}
                      photos={form.tire_photos.find(p => p.type === 'passenger_rear')?.photos || []}
                    />
                  </Grid>

                  {/* Spare */}
                  <Grid item xs={12} sm={6}>
                    <TireTreadSection
                      label="Spare Tire Tread"
                      value={form.tire_tread['spare']}
                      onChange={(field, value) => handleTreadChange('spare', field, value)}
                      onConditionChange={(field, condition) => handleTreadConditionChange('spare', field, condition)}
                      onPhotoClick={() => handleTirePhotoClick('spare')}
                      onAddPhoto={() => handleChooseFile('spare')}
                      onDeletePhoto={(index) => handleDeleteTirePhoto('spare', index)}
                      tireDate={form.tire_dates.spare || ''}
                      onTireDateChange={(date) => handleTireDateChange('spare', date)}
                      tireComments={form.tire_comments.spare || []}
                      onTireCommentToggle={(comment) => handleTireCommentToggle('spare', comment)}
                      photos={form.tire_photos.find(p => p.type === 'spare')?.photos || []}
                    />
                  </Grid>

                  {/* Rear Brake Pads (New UI) */}
                  <Grid item xs={12} sm={6}>
                    <BrakePadSection
                      label="Rear Brake Pads"
                      onCameraClick={() => handleCameraOpen('rear_brakes')}
                      onChooseFile={() => handleChooseFile('rear_brakes')}
                      photos={form.rear_brakes}
                      onPhotoClick={handleImageClick}
                      onDeletePhoto={(index) => handleDeleteTirePhoto('rear_brakes', index)}
                      innerPad={form.rear_brake_pads.inner}
                      outerPad={form.rear_brake_pads.outer}
                      rotorCondition={form.rear_brake_pads.rotor_condition}
                      onInnerPadChange={(value) => setForm(prev => ({
                        ...prev,
                        rear_brake_pads: {
                          ...prev.rear_brake_pads,
                          inner: Number(value)
                        }
                      }))}
                      onOuterPadChange={(value) => setForm(prev => ({
                        ...prev,
                        rear_brake_pads: {
                          ...prev.rear_brake_pads,
                          outer: Number(value)
                        }
                      }))}
                      onRotorConditionChange={(condition) => setForm(prev => ({
                        ...prev,
                        rear_brake_pads: {
                          ...prev.rear_brake_pads,
                          rotor_condition: condition
                        }
                      }))}
                    />
                  </Grid>

                  {/* MISC Section */}
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
                      MISC
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                  </Grid>

                  {/* Notes */}
                  <Grid columns={{ xs: 12 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body1" sx={{ flexGrow: 1 }}>
                        Notes
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={(e) => handleInfoClick(e, "Add any additional notes or observations about the vehicle inspection.")}
                        sx={{ ml: 1 }}
                      >
                        <InfoIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      label="Notes"
                      name="notes"
                      value={form.notes}
                      onChange={handleChange}
                    />
                  </Grid>

                  {/* Undercarriage */}
                  <Grid columns={{ xs: 12 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                        Undercarriage
                      </Typography>
                      <IconButton
                        onClick={() => handleChooseFile('undercarriage')} 
                        color="primary"
                      >
                        <CameraAltIcon />
                      </IconButton>
                    </Box>
                    {(() => {
                      const undercarriagePhotos = form.tire_photos.find(p => p.type === 'undercarriage')?.photos || [];
                      return undercarriagePhotos.length > 0 && (
                        <Box sx={{ 
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                          gap: 1,
                          width: '100%',
                          maxWidth: '400px',
                          mx: 'auto',
                          position: 'relative',
                          zIndex: 1
                        }}>
                          {undercarriagePhotos.map((photo, index) => (
                            <Box
                              key={index}
                              sx={{
                                position: 'relative',
                                width: '100%',
                                paddingTop: '100%',
                                borderRadius: 1,
                                overflow: 'hidden',
                                cursor: 'pointer',
                                boxShadow: 1,
                                '&:hover': {
                                  '& .delete-button': {
                                    opacity: 1
                                  }
                                }
                              }}
                            >
                              <img
                                src={photo.url}
                                alt={`Undercarriage ${index + 1}`}
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover'
                                }}
                                onClick={() => handleImageClick(undercarriagePhotos)}
                              />
                              <IconButton
                                className="delete-button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTirePhoto('undercarriage', index);
                                }}
                                sx={{
                                  position: 'absolute',
                                  top: 2,
                                  right: 2,
                                  bgcolor: 'rgba(0, 0, 0, 0.5)',
                                  color: 'white',
                                  opacity: 0,
                                  transition: 'opacity 0.2s',
                                  padding: '2px',
                                  '&:hover': {
                                    bgcolor: 'rgba(0, 0, 0, 0.7)',
                                  }
                                }}
                                size="small"
                              >
                                <CloseIcon sx={{ fontSize: '0.875rem' }} />
                              </IconButton>
                            </Box>
                          ))}
                        </Box>
                      );
                    })()}
                  </Grid>

                  {/* Tire Repair */}
                  <Grid columns={{ xs: 12 }}>
                    <FormControl component="fieldset">
                      <FormLabel component="legend">Tire Repair</FormLabel>
                      <Stack direction="row" spacing={2} sx={{ mt: 1, flexWrap: 'wrap' }}>
                        <Chip
                          label="⚠️ Not a tire repair"
                          color="warning"
                          variant={form.tire_repair_status === 'not_tire_repair' ? 'filled' : 'outlined'}
                          clickable
                          onClick={() => handleRadioChange('tire_repair_status', 'not_tire_repair')}
                          sx={{ fontWeight: form.tire_repair_status === 'not_tire_repair' ? 'bold' : 'normal', mb: 1 }}
                        />
                        <Chip
                          label="Tire Repair"
                          color="success"
                          variant={form.tire_repair_status === 'repairable' ? 'filled' : 'outlined'}
                          clickable
                          onClick={() => handleRadioChange('tire_repair_status', 'repairable')}
                          sx={{ fontWeight: form.tire_repair_status === 'repairable' ? 'bold' : 'normal', mb: 1 }}
                        />
                      </Stack>
                    </FormControl>
                  </Grid>

                  {/* Tire Repair Layout */}
                  {form.tire_repair_status === 'repairable' ? (
                    <Grid columns={{ xs: 12 }}>
                      <TireRepairLayout
                        tireStatuses={form.tire_repair_statuses}
                        onTireStatusChange={handleTireStatusChange}
                        showDually={false}
                        onDuallyToggle={() => {}}
                      />
                    </Grid>
                  ) : null}

                  {/* TPMS Check */}
                  <Grid columns={{ xs: 12 }}>
                    <FormControl component="fieldset">
                      <FormLabel component="legend">Check TPMS</FormLabel>
                      <Stack direction="row" spacing={2} sx={{ mt: 1, flexWrap: 'wrap' }}>
                        <Chip
                          label="✅ Not a TPMS Check"
                          color="success"
                          variant={form.tpms_type === 'not_check' ? 'filled' : 'outlined'}
                          clickable
                          onClick={() => handleRadioChange('tpms_type', 'not_check')}
                          sx={{ fontWeight: form.tpms_type === 'not_check' ? 'bold' : 'normal', mb: 1 }}
                        />
                        <Chip
                          label="❌ TPMS Check"
                          color="error"
                          variant={form.tpms_type === 'bad_sensor' ? 'filled' : 'outlined'}
                          clickable
                          onClick={() => handleRadioChange('tpms_type', 'bad_sensor')}
                          sx={{ fontWeight: form.tpms_type === 'bad_sensor' ? 'bold' : 'normal', mb: 1 }}
                        />
                      </Stack>
                    </FormControl>
                  </Grid>

                  {/* TPMS Tool Bad Sensors Photo */}
                  {form.tpms_type === 'bad_sensor' && (
                    <TPMSToolField
                      photos={form.tpms_tool_photo}
                      onImageClick={handleImageClick}
                      onCameraOpen={() => handleCameraOpen('tpms_tool')}
                    />
                  )}

                  {/* TPMS Layout */}
                  {form.tpms_type === 'bad_sensor' && (
                    <Grid item xs={12}>
                      <TPMSLayout
                        tpmsStatuses={form.tpms_statuses}
                        onTPMSStatusChange={handleTPMSStatusChange}
                        showDually={false}
                        onDuallyToggle={() => {}}
                      />
                    </Grid>
                  )}

                  {/* Tire Rotation */}
                  <Grid item xs={12}>
                    <FormControl component="fieldset">
                      <FormLabel component="legend">Tire Rotation</FormLabel>
                      <Stack direction="row" spacing={2} sx={{ mt: 1, flexWrap: 'wrap' }}>
                        <Chip
                          label="✅ Good"
                          color="success"
                          variant={form.tire_rotation === 'good' ? 'filled' : 'outlined'}
                          clickable
                          onClick={() => handleRadioChange('tire_rotation', 'good')}
                          sx={{ fontWeight: form.tire_rotation === 'good' ? 'bold' : 'normal', mb: 1 }}
                        />
                        <Chip
                          label="🔄 Recommend Tire Rotation"
                          color="warning"
                          variant={form.tire_rotation === 'bad' ? 'filled' : 'outlined'}
                          clickable
                          onClick={() => handleRadioChange('tire_rotation', 'bad')}
                          sx={{ fontWeight: form.tire_rotation === 'bad' ? 'bold' : 'normal', mb: 1 }}
                        />
                      </Stack>
                    </FormControl>
                  </Grid>

                  {/* Static Sticker */}
                  <Grid item xs={12}>
                    <FormControl component="fieldset">
                      <FormLabel component="legend">Static Sticker</FormLabel>
                      <Stack direction="row" spacing={2} sx={{ mt: 1, flexWrap: 'wrap' }}>
                        <Chip
                          label="✅ Good"
                          color="success"
                          variant={form.static_sticker === 'good' ? 'filled' : 'outlined'}
                          clickable
                          onClick={() => handleRadioChange('static_sticker', 'good')}
                          sx={{ fontWeight: form.static_sticker === 'good' ? 'bold' : 'normal', mb: 1 }}
                        />
                        <Chip
                          label="⚠️ Not Oil Change"
                          color="warning"
                          variant={form.static_sticker === 'not_oil_change' ? 'filled' : 'outlined'}
                          clickable
                          onClick={() => handleRadioChange('static_sticker', 'not_oil_change')}
                          sx={{ fontWeight: form.static_sticker === 'not_oil_change' ? 'bold' : 'normal', mb: 1 }}
                        />
                        <Chip
                          label="❌ Need Sticker"
                          color="error"
                          variant={form.static_sticker === 'need_sticker' ? 'filled' : 'outlined'}
                          clickable
                          onClick={() => handleRadioChange('static_sticker', 'need_sticker')}
                          sx={{ fontWeight: form.static_sticker === 'need_sticker' ? 'bold' : 'normal', mb: 1 }}
                        />
                      </Stack>
                    </FormControl>
                  </Grid>

                  {/* Drain Plug Type */}
                  <Grid item xs={12}>
                    <FormControl component="fieldset">
                      <FormLabel component="legend">Drain Plug Type</FormLabel>
                      <Stack direction="row" spacing={2} sx={{ mt: 1, flexWrap: 'wrap' }}>
                        <Chip
                          label="✅ Metal"
                          color="success"
                          variant={form.drain_plug_type === 'metal' ? 'filled' : 'outlined'}
                          clickable
                          onClick={() => handleRadioChange('drain_plug_type', 'metal')}
                          sx={{ fontWeight: form.drain_plug_type === 'metal' ? 'bold' : 'normal', mb: 1 }}
                        />
                        <Chip
                          label="⚠️ Plastic"
                          color="warning"
                          variant={form.drain_plug_type === 'plastic' ? 'filled' : 'outlined'}
                          clickable
                          onClick={() => handleRadioChange('drain_plug_type', 'plastic')}
                          sx={{ fontWeight: form.drain_plug_type === 'plastic' ? 'bold' : 'normal', mb: 1 }}
                        />
                      </Stack>
                    </FormControl>
                  </Grid>

                 
                </Grid>
              </TabPanel>
            </form>
          </Paper>
        </Box>

        {/* Fixed Bottom Navigation and Submit Buttons */}
        <Box
          sx={{
            position: 'fixed',
            left: 0,
            bottom: 0,
            width: '100vw',
            zIndex: 1200,
            bgcolor: 'background.paper',
            borderTop: 1,
            borderColor: 'divider',
            boxShadow: 3,
            p: 3,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Box sx={{ width: '100%', maxWidth: 1200, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', height: '100%', pt: 2 }}>
            <Button
              variant="outlined"
              onClick={() => changeTab(Math.max(0, tabValue - 1))}
              disabled={tabValue === 0}
            >
              Previous
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={handleCancel}
              sx={{ mx: 2 }}
            >
              Cancel
            </Button>
            {backendChecklistId && (
              <Button
                variant="outlined"
                onClick={handleShowTiming}
                sx={{ mx: 1 }}
                startIcon={<HistoryIcon />}
              >
                Timing
              </Button>
            )}
            {tabValue < 3 ? (
              <Button
                variant="contained"
                onClick={() => changeTab(Math.min(3, tabValue + 1))}
              >
                Next
              </Button>
            ) : (
              <Button
                variant="contained"
                color="primary"
                disabled={loading}
                onClick={() => handleSubmit()}
              >
                {loading ? <CircularProgress size={24} /> : 'Save'}
              </Button>
            )}
          </Box>
        </Box>

        {/* QR Scanner Dialog */}
                <Dialog 
                  open={scannerOpen} 
                  onClose={cleanupCamera}
                  maxWidth="md" 
                  fullWidth
                >
                  <DialogContent>
                    {cameraError && (
                      <Alert severity="error" sx={{ mb: 2 }}>
                        {cameraError}
                      </Alert>
                    )}
                    {error && (
                      <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                      </Alert>
                    )}
                    
                    <Box sx={{ position: 'relative', width: '100%', height: 'auto', aspectRatio: '4/3' }}>
                      {!capturedImage ? (
                        <>
                          <video
                            ref={videoRef}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              borderRadius: 4
                            }}
                            playsInline
                            autoPlay
                          />
                          {cameraType === 'tpms_placard' && (
                            <Box
                              sx={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                width: '80%',
                                height: '60%',
                                border: '2px solid #1042D8',
                                borderRadius: 2,
                                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                                pointerEvents: 'none',
                              }}
                            />
                          )}
                          {cameraType === 'undercarriage' && (
                            <Box
                              sx={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                width: '80%',
                                height: '60%',
                                border: '2px solid #1042D8',
                                borderRadius: 2,
                                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                                pointerEvents: 'none',
                              }}
                            />
                          )}
                          {['passenger_front', 'driver_front', 'driver_rear', 'passenger_rear', 'spare', 'front_brakes', 'rear_brakes'].includes(cameraType) && (
                            <Box
                              sx={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                width: '80%',
                                height: '60%',
                                border: '2px solid #1042D8',
                                borderRadius: 2,
                                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                                pointerEvents: 'none',
                              }}
                            />
                          )}
                          <Box
                            sx={{
                              position: 'absolute',
                              top: 16,
                              right: 16,
                              display: 'flex',
                              gap: 1
                            }}
                          >
                            {hasFlashSupport && (
                              <IconButton
                                onClick={handleFlashToggle}
                                sx={{
                                  bgcolor: 'rgba(0,0,0,0.5)',
                                  color: 'white',
                                  '&:hover': {
                                    bgcolor: 'rgba(0,0,0,0.7)',
                                  },
                                }}
                              >
                                {isFlashOn ? <FlashOnIcon /> : <FlashOffIcon />}
                              </IconButton>
                            )}
                            {availableCameras.length > 1 && (
                              <IconButton
                                onClick={handleCameraSwitch}
                                sx={{
                                  bgcolor: 'rgba(0,0,0,0.5)',
                                  color: 'white',
                                  '&:hover': {
                                    bgcolor: 'rgba(0,0,0,0.7)',
                                  },
                                }}
                              >
                                <FlipCameraIosIcon />
                              </IconButton>
                            )}
                          </Box>
                          <Button
                            variant="contained"
                            onClick={captureImage}
                            sx={{
                              position: 'absolute',
                              bottom: 16,
                              left: '50%',
                              transform: 'translateX(-50%)',
                              bgcolor: 'white',
                              color: 'black',
                              '&:hover': {
                                bgcolor: 'grey.100',
                              },
                            }}
                          >
                            Capture
                          </Button>
                        </>
                      ) : (
                        <Box sx={{ position: 'relative' }}>
                          <img
                            src={capturedImage}
                            alt="Captured"
                            style={{
                              width: '100%',
                              height: 'auto',
                              borderRadius: 4
                            }}
                          />
                          <Box
                            sx={{
                              position: 'absolute',
                              bottom: 16,
                              left: '50%',
                              transform: 'translateX(-50%)',
                              display: 'flex',
                              gap: 2
                            }}
                          >
                            <Button
                              variant="contained"
                              onClick={() => setCapturedImage(null)}
                              sx={{
                                bgcolor: 'white',
                                color: 'black',
                                '&:hover': {
                                  bgcolor: 'grey.100',
                                },
                              }}
                            >
                              Retake
                            </Button>
                            <Button
                              variant="contained"
                              onClick={handleCapturedImage}
                              sx={{
                                bgcolor: 'white',
                                color: 'black',
                                '&:hover': {
                                  bgcolor: 'grey.100',
                                },
                              }}
                            >
                              Use Photo
                            </Button>
                          </Box>
                        </Box>
                      )}
                    </Box>
                  </DialogContent>
                </Dialog>

        {/* Add Image Preview Modal */}
        <Modal
          open={!!selectedImage}
          onClose={handleCloseImageModal}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 2,
          }}
        >
          <Box
            sx={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              bgcolor: 'background.paper',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            {selectedImage && (
              <>
                <img
                  src={selectedImage}
                  alt="Preview"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                  }}
                />
                <IconButton
                  onClick={handleCloseImageModal}
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    bgcolor: 'rgba(0,0,0,0.5)',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'rgba(0,0,0,0.7)',
                    },
                  }}
                >
                  <CloseIcon />
                </IconButton>
              </>
            )}
          </Box>
        </Modal>

        <input
          type="file"
          accept="image/*"
          hidden
          ref={tirePhotoInputRef}
          onChange={e => handleTirePhotoFileUpload(e.target.files)}
        />

        <PhotoSlideshow
          open={slideshowOpen}
          photos={slideshowPhotos}
          onClose={() => setSlideshowOpen(false)}
          onDelete={(index) => {
            const updatedPhotos = [...slideshowPhotos];
            updatedPhotos.splice(index, 1);
            setSlideshowPhotos(updatedPhotos);
            
            // Update the form state based on the current photos
            if (slideshowPhotos === form.front_brakes) {
              setForm(prev => ({ ...prev, front_brakes: updatedPhotos }));
            } else if (slideshowPhotos === form.rear_brakes) {
              setForm(prev => ({ ...prev, rear_brakes: updatedPhotos }));
            } else if (slideshowPhotos === form.tpms_placard) {
              setForm(prev => ({ ...prev, tpms_placard: updatedPhotos }));
            } else if (slideshowPhotos === form.washer_fluid_photo) {
              setForm(prev => ({ ...prev, washer_fluid_photo: updatedPhotos }));
            } else if (slideshowPhotos === form.engine_air_filter_photo) {
              setForm(prev => ({ ...prev, engine_air_filter_photo: updatedPhotos }));
            } else if (slideshowPhotos === form.battery_photos) {
              setForm(prev => ({ ...prev, battery_photos: updatedPhotos }));
            } else if (slideshowPhotos === form.tpms_tool_photo) {
              setForm(prev => ({ ...prev, tpms_tool_photo: updatedPhotos }));
            }
          }}
        />

        {/* History modal */}
        <Dialog
          open={showHistory}
          onClose={() => setShowHistory(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogContent>
            <Typography variant="h6" gutterBottom>
              Inspection History
            </Typography>
            {inspectionHistory.length > 0 ? (
              <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                {inspectionHistory.map((inspection, index) => (
                  <Paper key={index} sx={{ p: 2, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="subtitle1">
                        VIN: {inspection.vin || inspection.data?.vin}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Date: {inspection.date || inspection.data?.date}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        User: {inspection.user || inspection.data?.user}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      <Button variant="outlined" onClick={() => handleViewInspection(inspection)}>
                        View
                      </Button>
                      <Button color="error" variant="outlined" onClick={() => handleDeleteInspection(inspection.id)}>
                        Delete
                      </Button>
                    </Stack>
                  </Paper>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No inspection history found.
              </Typography>
            )}
          </DialogContent>
        </Dialog>

        {/* Add the detail view dialog */}
        <Dialog
          open={showDetailDialog}
          onClose={handleCloseDetailDialog}
          maxWidth="md"
          fullWidth
        >
          <DialogContent>
          {selectedInspection && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Inspection Details
                </Typography>
              <Typography variant="subtitle1">VIN: {selectedInspection.data?.vin}</Typography>
              <Typography>Date: {selectedInspection.data?.date}</Typography>
              <Typography>User: {selectedInspection.data?.user}</Typography>
              <Typography>Mileage: {selectedInspection.data?.mileage}</Typography>
              <Typography>Windshield Condition: {selectedInspection.data?.windshield_condition}</Typography>
              <Typography>Wiper Blades: {selectedInspection.data?.wiper_blades}</Typography>
              <Typography>Washer Squirters: {selectedInspection.data?.washer_squirters}</Typography>
                {/* Add more fields as needed */}
                {/* Show dash lights photos if available */}
              {selectedInspection.data?.dash_lights_photos?.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2">Dash Lights Photos:</Typography>
                    <Stack direction="row" spacing={1}>
                    {selectedInspection.data.dash_lights_photos.map((photo: any, idx: number) => (
                        <img key={idx} src={photo.url} alt={`Dash Light ${idx + 1}`} style={{ maxWidth: 100, maxHeight: 100 }} />
                      ))}
                    </Stack>
                  </Box>
                )}
                {/* Add more photo sections as needed */}
              </Box>
            )}
          </DialogContent>
        </Dialog>

      {/* Vehicle Details Popup Dialog */}
      <Dialog open={vehicleDetailsOpen} onClose={() => setVehicleDetailsOpen(false)} maxWidth="sm" fullWidth>
        <DialogContent>
          <Tabs value={vehicleDetailsTab || 0} onChange={(_, v) => setVehicleDetailsTab(v)} sx={{ mb: 2 }}>
            <Tab label="Summary" />
            <Tab label="All Fields" />
            <Tab label="Raw JSON" />
          </Tabs>
          {/* Summary Tab */}
          {vehicleDetailsTab === 0 && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>Vehicle Details (Summary)</Typography>
              {vehicleDetails && vehicleDetails.Results && vehicleDetails.Results.length > 0 ? (
                <>
                  {[
                    'Model Year',
                    'Make',
                    'Model',
                    'Engine Number of Cylinders',
                    'Displacement (L)',
                    'Engine Configuration',
                    'Other Engine Info',
                    'Displacement (CI)',
                    'Engine Model',
                    'Engine Brake (hp) From',
                    'Drive Type',
                    'Transmission Speeds',
                    'Transmission Style',
                    'Vehicle Type',
                    'Body Class',
                  ].map((field) => {
                    const r = vehicleDetails.Results.find((r: any) => r.Variable === field);
                    return r && r.Value && r.Value !== 'Not Applicable' && r.Value !== '0' ? (
                      <Box key={field} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">{field}:</Typography>
                        <Typography variant="body2" fontWeight={500}>{r.Value}</Typography>
                      </Box>
                    ) : null;
                  })}
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">No details found for this VIN.</Typography>
              )}
            </Box>
          )}
          {/* All Fields Tab */}
          {vehicleDetailsTab === 1 && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>All Decoded Fields</Typography>
              {vehicleDetails && vehicleDetails.Results && vehicleDetails.Results.length > 0 ? (
                <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                  {vehicleDetails.Results.filter((r: any) => r.Value && r.Value !== 'Not Applicable' && r.Value !== '0').map((r: any) => (
                    <Box key={r.Variable} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">{r.Variable}:</Typography>
                      <Typography variant="body2" fontWeight={500}>{r.Value}</Typography>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">No details found for this VIN.</Typography>
              )}
            </Box>
          )}
          {/* Raw JSON Tab */}
          {vehicleDetailsTab === 2 && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>Raw API Response</Typography>
              <pre style={{ maxHeight: 400, overflow: 'auto', background: '#f5f5f5', padding: 12, borderRadius: 4 }}>
                {JSON.stringify(vehicleDetails, null, 2)}
              </pre>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onClose={cancelCancel}>
        <DialogContent>
          <Typography variant="h6" gutterBottom>Cancel Quick Check?</Typography>
          <Typography gutterBottom>Are you sure you want to cancel? All unsaved progress will be lost.</Typography>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
            <Button onClick={cancelCancel} color="primary">No</Button>
            <Button onClick={confirmCancel} color="error" variant="contained">Yes, Cancel</Button>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Info Popover - Global access from all tabs */}
      <Popover
        open={open}
        anchorEl={infoAnchorEl}
        onClose={handleInfoClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            p: 2,
            maxWidth: 300,
            bgcolor: 'background.paper',
            boxShadow: 3,
          },
        }}
      >
        <Typography variant="body2" color="text.secondary">
          {infoContent}
        </Typography>
      </Popover>

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
                  <Paper sx={{ p: 2, border: timingData.tabTimings.info.isActive ? 2 : 1, borderColor: timingData.tabTimings.info.isActive ? 'success.main' : 'divider' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Typography variant="subtitle2" color="primary">Info Tab</Typography>
                      {timingData.tabTimings.info.isActive && (
                        <Chip 
                          label="ACTIVE" 
                          size="small" 
                          color="success" 
                          sx={{ ml: 1, fontSize: '0.7rem' }}
                        />
                      )}
                    </Box>
                    <Typography variant="body2">Duration: {formatDuration(timingData.tabTimings.info.duration)}</Typography>
                    {timingData.tabTimings.info.start && (
                      <Typography variant="caption" color="text.secondary">
                        Start: {new Date(timingData.tabTimings.info.start).toLocaleString()}
                      </Typography>
                    )}
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Paper sx={{ p: 2, border: timingData.tabTimings.pulling.isActive ? 2 : 1, borderColor: timingData.tabTimings.pulling.isActive ? 'success.main' : 'divider' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Typography variant="subtitle2" color="primary">Pulling Into Bay</Typography>
                      {timingData.tabTimings.pulling.isActive && (
                        <Chip 
                          label="ACTIVE" 
                          size="small" 
                          color="success" 
                          sx={{ ml: 1, fontSize: '0.7rem' }}
                        />
                      )}
                    </Box>
                    <Typography variant="body2">Duration: {formatDuration(timingData.tabTimings.pulling.duration)}</Typography>
                    {timingData.tabTimings.pulling.start && (
                      <Typography variant="caption" color="text.secondary">
                        Start: {new Date(timingData.tabTimings.pulling.start).toLocaleString()}
                      </Typography>
                    )}
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Paper sx={{ p: 2, border: timingData.tabTimings.underhood.isActive ? 2 : 1, borderColor: timingData.tabTimings.underhood.isActive ? 'success.main' : 'divider' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Typography variant="subtitle2" color="primary">Underhood</Typography>
                      {timingData.tabTimings.underhood.isActive && (
                        <Chip 
                          label="ACTIVE" 
                          size="small" 
                          color="success" 
                          sx={{ ml: 1, fontSize: '0.7rem' }}
                        />
                      )}
                    </Box>
                    <Typography variant="body2">Duration: {formatDuration(timingData.tabTimings.underhood.duration)}</Typography>
                    {timingData.tabTimings.underhood.start && (
                      <Typography variant="caption" color="text.secondary">
                        Start: {new Date(timingData.tabTimings.underhood.start).toLocaleString()}
                      </Typography>
                    )}
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Paper sx={{ p: 2, border: timingData.tabTimings.tires.isActive ? 2 : 1, borderColor: timingData.tabTimings.tires.isActive ? 'success.main' : 'divider' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Typography variant="subtitle2" color="primary">Tires & Brakes</Typography>
                      {timingData.tabTimings.tires.isActive && (
                        <Chip 
                          label="ACTIVE" 
                          size="small" 
                          color="success" 
                          sx={{ ml: 1, fontSize: '0.7rem' }}
                        />
                      )}
                    </Box>
                    <Typography variant="body2">Duration: {formatDuration(timingData.tabTimings.tires.duration)}</Typography>
                    {timingData.tabTimings.tires.start && (
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
                      {formatDuration(timingData.durations.createdToSubmitted)}
                    </Typography>
                  </Paper>
                </Grid>
                {timingData.status === 'archived' && (
                  <>
                    <Grid item xs={12} sm={4}>
                      <Paper sx={{ p: 2, bgcolor: 'warning.light' }}>
                        <Typography variant="subtitle2" color="white">Submitted to Archived</Typography>
                        <Typography variant="h6" color="white">
                          {formatDuration(timingData.durations.submittedToArchived)}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Paper sx={{ p: 2, bgcolor: 'error.light' }}>
                        <Typography variant="subtitle2" color="white">Created to Archived</Typography>
                        <Typography variant="h6" color="white">
                          {formatDuration(timingData.durations.createdToArchived)}
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
                    {new Date(timingData.timestamps.created).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="body2">
                    <strong>Last Updated:</strong><br />
                    {new Date(timingData.timestamps.updated).toLocaleString()}
                  </Typography>
                </Grid>
                {timingData.timestamps.archived && (
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
      </Container>
  );
};

export default QuickCheck; 