import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  CircularProgress,
  Alert,
  Card,
  CardMedia,
  CardContent,
  Divider,
  Chip,
  Grid,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Button,
  Tabs,
  Tab,
  Tooltip,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Slider
} from '@mui/material';
import { LocalGasStation as OilIcon, Archive as ArchiveIcon, Info as InfoIcon, ExpandMore as ExpandMoreIcon, Close as CloseIcon, AccessTime as TimeIcon } from '@mui/icons-material';
import { getInspectionById, archiveInspection } from '../services/firebase/inspections';
import BrakePadSideView from '../components/BrakePadSideView';
import BrakePadFrontAxleView from '../components/BrakePadFrontAxleView';
import TireRepairLayout from '../components/TireRepairLayout';
import TPMSLayout from '../components/TPMSLayout';
import TireTreadSideView from '../components/TireTreadSideView';
import { StaticSticker, OilType } from '../types/stickers';
import { StickerStorageService } from '../services/stickerStorage';
import { VinDecoderService } from '../services/vinDecoder';
import { PDFGeneratorService } from '../services/pdfGenerator';

interface QuickCheck {
  id: number;
  user_name: string;
  title: string;
  created_at: string;
  data: QuickCheckData;
  status?: string;
}

const QuickCheckDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quickCheck, setQuickCheck] = useState<QuickCheck | null>(null);
  const [vehicleDetails, setVehicleDetails] = useState<any | null>(null);
  const [vinDecodeLoading, setVinDecodeLoading] = useState(false);
  const [vinDecodeError, setVinDecodeError] = useState<string | null>(null);
  
  // Add state for vehicle details popup
  const [vehicleDetailsOpen, setVehicleDetailsOpen] = useState(false);
  const [vehicleDetailsTab, setVehicleDetailsTab] = useState(0);

  // Oil sticker state
  const [oilTypes, setOilTypes] = useState<OilType[]>([]);
  const [showOilTypeDialog, setShowOilTypeDialog] = useState(false);

  // Archive functionality state
  const [archiving, setArchiving] = useState(false);
  const [confirmArchiveDialog, setConfirmArchiveDialog] = useState(false);

  // Debug functionality state
  const [debugDialogOpen, setDebugDialogOpen] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  // Timing dialog state
  const [timingDialogOpen, setTimingDialogOpen] = useState(false);

  // Tire repair detail popup state
  const [tireRepairDetailOpen, setTireRepairDetailOpen] = useState(false);
  const [selectedTirePosition, setSelectedTirePosition] = useState<string | null>(null);

  // Tire model/size image full-view state
  const [tireModelFullViewOpen, setTireModelFullViewOpen] = useState(false);
  const [selectedTireModelImage, setSelectedTireModelImage] = useState<any>(null);
  const [imageRotation, setImageRotation] = useState(0);

  // Slideshow state
  const [slideshowOpen, setSlideshowOpen] = useState(false);
  const [slideshowImages, setSlideshowImages] = useState<{url: string, title: string}[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [slideshowRotation, setSlideshowRotation] = useState(0);
  const [slideshowZoom, setSlideshowZoom] = useState(1);
  const [slideshowPan, setSlideshowPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialPan, setInitialPan] = useState({ x: 0, y: 0 });
  const [showSlideshowControls, setShowSlideshowControls] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchQuickCheck = async () => {
      try {
        const doc = await getInspectionById(id);
        if (!doc) {
          setError('Inspection not found');
          setLoading(false);
          return;
        }

        // Map InspectionDocument to the legacy QuickCheck shape this component expects
        const response: QuickCheck = {
          id: 0, // legacy numeric id — not used for navigation
          user_name: doc.userName ?? '',
          title: doc.data?.vin ?? '',
          created_at: (doc.createdAt as any)?.toDate ? (doc.createdAt as any).toDate().toISOString() : '',
          data: doc.data as any,
          status: doc.status,
        };

        setQuickCheck(response);
        setLoading(false);

        const vin = doc.data?.vin;
        if (doc.data?.decoded_vin_data) {
          setVehicleDetails(doc.data.decoded_vin_data);
          setVinDecodeError(null);
        } else if (vin && vin.length === 17) {
          setVinDecodeLoading(true);
          try {
            const vehicleData = await VinDecoderService.decodeVin(vin);
            setVehicleDetails(vehicleData);
            setVinDecodeError(null);
          } catch (err) {
            setVinDecodeError('Failed to decode VIN');
            setVehicleDetails(null);
          } finally {
            setVinDecodeLoading(false);
          }
        }
      } catch {
        setError('Failed to load quick check details');
        setLoading(false);
      }
    };

    fetchQuickCheck();
  }, [id]);

  // Load oil types on component mount
  useEffect(() => {
    setOilTypes(StickerStorageService.getOilTypes());
  }, []);

  // Function to handle oil type selection and create the sticker
  const handleOilTypeSelection = async (oilTypeId: string) => {
    if (!quickCheck) return;

    try {
      const oilType = oilTypes.find(type => type.id === oilTypeId);
      if (!oilType) {
        alert('Selected oil type not found');
        return;
      }

      const settings = StickerStorageService.getSettings();
      const companyElement = settings.layout.elements.find(el => el.id === 'companyName');
      const addressElement = settings.layout.elements.find(el => el.id === 'address');
      const messageElement = settings.layout.elements.find(el => el.id === 'message');

      // Calculate next service date
      const today = new Date();
      const nextDate = new Date(today.getTime() + (oilType.durationInDays * 24 * 60 * 60 * 1000));
      const nextServiceDate = nextDate.toISOString().split('T')[0];

      // Transform NHTSA data to match VinDecodedDetails interface
      let transformedDecodedDetails = { error: 'VIN not decoded' };
      if (vehicleDetails && vehicleDetails.Results && Array.isArray(vehicleDetails.Results)) {
        const getValue = (variable: string) => {
          const result = vehicleDetails.Results.find((r: any) => r.Variable === variable);
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
          ...vehicleDetails
        };
      }

      // Create the sticker
      const newSticker: StaticSticker = {
        id: Date.now().toString(),
        dateCreated: new Date().toISOString(),
        vin: VinDecoderService.formatVin(quickCheck.data.vin),
        decodedDetails: transformedDecodedDetails,
        date: nextServiceDate,
        oilType,
        mileage: parseInt(quickCheck.data.mileage.replace(/,/g, '')) || 0,
        companyName: companyElement?.content.replace('{companyName}', '') || '',
        address: addressElement?.content.replace('{address}', '') || '',
        message: messageElement?.content || '',
        qrCode: quickCheck.data.vin, // Simple QR code with just VIN
        printed: false,
        lastUpdated: new Date().toISOString(),
        archived: false,
      };

      // Save the sticker
      StickerStorageService.saveSticker(newSticker);

      // Generate PDF and open in new tab
      await PDFGeneratorService.generateStickerPDF(newSticker, settings, true);

      alert('Oil sticker created successfully and opened in new tab!');
      
      // Close dialog
      setShowOilTypeDialog(false);

    } catch (error) {
      console.error('Error creating oil sticker:', error);
      alert('Failed to create oil sticker. Please try again.');
    }
  };

  // Archive functionality handlers
  const handleArchiveClick = () => {
    setConfirmArchiveDialog(true);
  };

  const handleConfirmArchive = async () => {
    if (!id) return;

    try {
      setArchiving(true);
      await archiveInspection(id);
      setConfirmArchiveDialog(false);
      navigate('/');
    } catch (err: any) {
      setError(err?.message || 'Failed to archive inspection');
    } finally {
      setArchiving(false);
    }
  };

  const handleCancelArchive = () => {
    setConfirmArchiveDialog(false);
  };

  const handleTireRepairDetailClick = (tirePosition: string) => {
    setSelectedTirePosition(tirePosition);
    setTireRepairDetailOpen(true);
  };

  const handleTireRepairDetailClose = () => {
    setTireRepairDetailOpen(false);
    setSelectedTirePosition(null);
  };

  const handleTireModelImageClick = (image: any) => {
    setSelectedTireModelImage(image);
    setImageRotation(0);
    setTireModelFullViewOpen(true);
  };

  const handleTireModelFullViewClose = () => {
    setTireModelFullViewOpen(false);
    setSelectedTireModelImage(null);
    setImageRotation(0);
  };

  const handleRotationChange = (event: Event, newValue: number | number[]) => {
    setImageRotation(newValue as number);
  };

  const handleRotationReset = () => {
    setImageRotation(0);
  };

  // Slideshow functions
  const openSlideshow = (images: {url: string, title: string}[], startIndex: number = 0) => {
    setSlideshowImages(images);
    setCurrentImageIndex(startIndex);
    setSlideshowRotation(0);
    setSlideshowZoom(1);
    setSlideshowPan({ x: 0, y: 0 });
    setInitialPan({ x: 0, y: 0 });
    setSlideshowOpen(true);
  };

  const closeSlideshow = () => {
    setSlideshowOpen(false);
    setSlideshowImages([]);
    setCurrentImageIndex(0);
    setSlideshowRotation(0);
    setSlideshowZoom(1);
    setSlideshowPan({ x: 0, y: 0 });
    setInitialPan({ x: 0, y: 0 });
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % slideshowImages.length);
    setSlideshowRotation(0); // Reset rotation when changing images
    setSlideshowZoom(1); // Reset zoom when changing images
    setSlideshowPan({ x: 0, y: 0 }); // Reset pan when changing images
    setInitialPan({ x: 0, y: 0 }); // Reset initial pan when changing images
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + slideshowImages.length) % slideshowImages.length);
    setSlideshowRotation(0); // Reset rotation when changing images
    setSlideshowZoom(1); // Reset zoom when changing images
    setSlideshowPan({ x: 0, y: 0 }); // Reset pan when changing images
    setInitialPan({ x: 0, y: 0 }); // Reset initial pan when changing images
  };

  const goToImage = (index: number) => {
    setCurrentImageIndex(index);
    setSlideshowRotation(0); // Reset rotation when changing images
    setSlideshowZoom(1); // Reset zoom when changing images
    setSlideshowPan({ x: 0, y: 0 }); // Reset pan when changing images
    setInitialPan({ x: 0, y: 0 }); // Reset initial pan when changing images
  };

  const handleSlideshowRotationChange = (event: Event, newValue: number | number[]) => {
    setSlideshowRotation(newValue as number);
  };

  const handleSlideshowRotationReset = () => {
    setSlideshowRotation(0);
  };

  // Zoom and Pan functions
  const handleZoomIn = () => {
    setSlideshowZoom(prev => Math.min(prev * 1.5, 5)); // Max 5x zoom
  };

  const handleZoomOut = () => {
    setSlideshowZoom(prev => Math.max(prev / 1.5, 0.5)); // Min 0.5x zoom
  };

  const handleZoomReset = () => {
    setSlideshowZoom(1);
    setSlideshowPan({ x: 0, y: 0 });
    setInitialPan({ x: 0, y: 0 });
  };

  // Helper function to transform mouse/touch delta for rotated images
  // This ensures dragging feels natural regardless of image rotation angle
  const transformDeltaForRotation = (deltaX: number, deltaY: number) => {
    if (slideshowRotation === 0) {
      // No rotation, no transformation needed
      return { x: deltaX, y: deltaY };
    }
    
    const rotationRadians = (slideshowRotation * Math.PI) / 180;
    const cos = Math.cos(rotationRadians);
    const sin = Math.sin(rotationRadians);
    
    // Apply inverse rotation matrix to convert screen coordinates to image's local coordinates
    // This makes dragging feel natural: moving cursor right moves the visible image rightward
    return {
      x: deltaX * cos + deltaY * sin,
      y: -deltaX * sin + deltaY * cos
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (slideshowZoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      setInitialPan({ x: slideshowPan.x, y: slideshowPan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && slideshowZoom > 1) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      
      // Transform delta to account for image rotation
      const transformedDelta = transformDeltaForRotation(deltaX, deltaY);
      
      setSlideshowPan({
        x: initialPan.x + transformedDelta.x,
        y: initialPan.y + transformedDelta.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setSlideshowZoom(prev => Math.min(Math.max(prev * delta, 0.5), 5));
  };

  // Touch support for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && slideshowZoom > 1) {
      setIsDragging(true);
      setDragStart({ 
        x: e.touches[0].clientX, 
        y: e.touches[0].clientY 
      });
      setInitialPan({ x: slideshowPan.x, y: slideshowPan.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging && slideshowZoom > 1) {
      e.preventDefault();
      const deltaX = e.touches[0].clientX - dragStart.x;
      const deltaY = e.touches[0].clientY - dragStart.y;
      
      // Transform delta to account for image rotation
      const transformedDelta = transformDeltaForRotation(deltaX, deltaY);
      
      setSlideshowPan({
        x: initialPan.x + transformedDelta.x,
        y: initialPan.y + transformedDelta.y
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Function to collect ALL images from the entire QuickCheck
  const getAllImages = () => {
    const allImages: {url: string, title: string}[] = [];
    
    // Helper function to add images from a photo array
    const addPhotos = (photos: any[], sectionTitle: string) => {
      if (photos && Array.isArray(photos)) {
        photos.forEach((photo, index) => {
          if (photo && photo.url) {
            allImages.push({
              url: photo.url,
              title: `${sectionTitle} ${index + 1}`
            });
          }
        });
      }
    };

    // Helper function to process tire photos with different structures
    const addTirePhotos = (tireType: string) => {
      let photos: any[] = [];
      
      // Try different ways to access the photos (same logic as renderTirePhotos)
      if (data.tire_photos && Array.isArray(data.tire_photos)) {
        const tireGroup = data.tire_photos.find(group => group.type === tireType);
        if (tireGroup && tireGroup.photos) {
          photos = tireGroup.photos;
        }
      }
      
      if (photos.length === 0) {
        const directPhotos = (data as any)[`${tireType}_photos`];
        if (directPhotos) {
          photos = directPhotos;
        }
      }
      
      if (photos.length === 0 && data.tire_photos && typeof data.tire_photos === 'object') {
        const directTirePhotos = (data.tire_photos as any)[tireType];
        if (directTirePhotos) {
          photos = directTirePhotos;
        }
      }

      photos.forEach((photo, index) => {
        let imageUrl = '';
        if (typeof photo === 'string') {
          imageUrl = photo;
        } else if (photo && typeof photo === 'object') {
          imageUrl = photo.url || photo.path || photo.src || photo.filename || '';
        }
        
        if (!imageUrl && photo && photo.filename) {
          imageUrl = `/uploads/${photo.filename}`;
        }
        
        if (imageUrl) {
          allImages.push({
            url: imageUrl,
            title: `${tireType.replace('_', ' ')} tire photo ${index + 1}`
          });
        }
      });
    };

    // Helper function to add tire repair images
    const addTireRepairImages = (position: string, tireImages: any) => {
      if (!tireImages) return;
      
      const categories = ['not_repairable', 'tire_size_brand', 'repairable_spot'];
      const categoryTitles = ['tire leak', 'tire model/size', 'repairable spot'];
      
      categories.forEach((category, categoryIndex) => {
        if (tireImages[category] && Array.isArray(tireImages[category])) {
          tireImages[category].forEach((img: any, index: number) => {
            let imageUrl = '';
            if (typeof img === 'string') {
              imageUrl = img;
            } else if (img && typeof img === 'object') {
              imageUrl = img.url || img.path || img.src || img.filename || '';
            }
            
            if (!imageUrl && img && img.filename) {
              imageUrl = `/uploads/${img.filename}`;
            }
            
            if (imageUrl) {
              allImages.push({
                url: imageUrl,
                title: `${position.replace('_', ' ')} ${categoryTitles[categoryIndex]} ${index + 1}`
              });
            }
          });
        }
      });
    };

    // Add all basic photo arrays
    addPhotos(data.dash_lights_photos || [], 'Dash Lights Photo');
    addPhotos(data.mileage_photos || [], 'Mileage Photo');
    addPhotos(data.vin_photos || [], 'VIN Photo');
    addPhotos(data.tpms_placard || [], 'TPMS Placard Photo');
    addPhotos(data.state_inspection_status_photos || [], 'State Inspection Status Photo');
    addPhotos(data.state_inspection_date_code_photos || [], 'State Inspection Date Code Photo');
    addPhotos(data.tire_repair_status_photos || [], 'Tire Repair Status Photo');
    addPhotos(data.tpms_tool_photo || [], 'TPMS Tool Photo');
    addPhotos(data.undercarriage_photos || [], 'Undercarriage Photo');
    addPhotos(data.battery_date_code_photos || [], 'Battery Date Code Photo');
    addPhotos(data.battery_photos || [], 'Battery Photo');
    addPhotos(data.front_brakes || [], 'Front Brake Photo');
    addPhotos(data.front_brake_pads_photos || [], 'Front Brake Pad Photo');
    addPhotos(data.rear_brakes || [], 'Rear Brake Photo');
    addPhotos(data.rear_brake_pads_photos || [], 'Rear Brake Pad Photo');
    addPhotos(data.engine_air_filter_photo || [], 'Engine Air Filter Photo');
    addPhotos(data.windshield_condition_photos || [], 'Windshield Condition Photo');
    addPhotos(data.wiper_blades_photos || [], 'Wiper Blade Photo');
    addPhotos(data.washer_squirters_photos || [], 'Washer Squirter Photo');
    addPhotos(data.washer_fluid_photo || [], 'Washer Fluid Photo');
    addPhotos(data.tpms_type_photos || [], 'TPMS Type Photo');

    // Add tire photos for each position
    const tirePositions = ['driver_front', 'passenger_front', 'driver_rear', 'driver_rear_inner', 'passenger_rear', 'passenger_rear_inner', 'spare'];
    tirePositions.forEach(position => {
      addTirePhotos(position);
    });

    // Add tire repair images
    if (data.tire_repair_images) {
      Object.entries(data.tire_repair_images).forEach(([position, tireImages]) => {
        addTireRepairImages(position, tireImages);
      });
    }

    return allImages;
  };

  // Function to find the index of a specific image in the master list
  const findImageIndex = (targetUrl: string, sectionImages: {url: string, title: string}[], sectionStartIndex: number = 0) => {
    const allImages = getAllImages();
    
    // First try to find by URL (most reliable)
    const index = allImages.findIndex(img => img.url === targetUrl);
    if (index >= 0) {
      return index;
    }
    
    // If we have section-specific images, try to find the exact image by title as fallback
    if (sectionImages.length > 0 && sectionStartIndex >= 0 && sectionStartIndex < sectionImages.length) {
      const targetImage = sectionImages[sectionStartIndex];
      const titleIndex = allImages.findIndex(img => img.url === targetImage.url && img.title === targetImage.title);
      if (titleIndex >= 0) {
        return titleIndex;
      }
    }
    
    // Last resort: return first image
    return 0;
  };

    const handleDebugClick = () => {
    if (!quickCheck) return;
    
    // Gather simplified debug information to avoid type errors
    const debugData = {
      timestamp: new Date().toISOString(),
      quickCheck: {
        id: quickCheck.id,
        user_name: quickCheck.user_name,
        title: quickCheck.title,
        created_at: quickCheck.created_at,
        status: quickCheck.status || 'submitted'
      },
      dataKeys: Object.keys(quickCheck.data),
      imageFieldCounts: {
        dash_lights_photos: quickCheck.data.dash_lights_photos?.length || 0,
        tpms_placard: quickCheck.data.tpms_placard?.length || 0,
        washer_fluid_photo: quickCheck.data.washer_fluid_photo?.length || 0,
        engine_air_filter_photo: quickCheck.data.engine_air_filter_photo?.length || 0,
        battery_photos: quickCheck.data.battery_photos?.length || 0,
        tpms_tool_photo: quickCheck.data.tpms_tool_photo?.length || 0,
        front_brakes: quickCheck.data.front_brakes?.length || 0,
        rear_brakes: quickCheck.data.rear_brakes?.length || 0,
        tire_photos: quickCheck.data.tire_photos?.length || 0,
        tire_repair_images: quickCheck.data.tire_repair_images ? Object.keys(quickCheck.data.tire_repair_images).length : 0
      },
      sampleUrls: {
        dash_lights_first: quickCheck.data.dash_lights_photos?.[0]?.url || 'N/A',
        tire_photos_first: quickCheck.data.tire_photos?.[0]?.photos?.[0] ? JSON.stringify(quickCheck.data.tire_photos[0].photos[0]) : 'N/A'
      },
      environment: {
        windowLocation: {
          hostname: window.location.hostname,
          protocol: window.location.protocol,
          port: window.location.port
        },
        userAgent: navigator.userAgent,
        nodeEnv: process.env.NODE_ENV
      }
    };
    
    setDebugInfo(debugData);
    setDebugDialogOpen(true);
    
    // Also log full data to console for easy copying
    console.log('QuickCheck Debug Info:', debugData);
    console.log('Full Quick Check Data:', quickCheck);
  };

  // Helper function to format inspection type for display
  const formatInspectionType = (inspectionType: string) => {
    switch (inspectionType) {
      case 'no_check':
        return 'No Check';
      case 'quick_check':
        return 'Quick Check';
      case 'vsi':
        return 'VSI';
      default:
        return inspectionType || 'Unknown';
    }
  };

  const renderImageGallery = (photos: { url: string }[], title: string = 'Photos') => {
    if (!photos || photos.length === 0) return null;

    const images = photos.map((photo, index) => ({
      url: photo.url,
      title: `${title} ${index + 1}`
    }));

    return (
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2, mt: 2 }}>
        {photos.map((photo, index) => (
          <Box key={index}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                '&:hover': {
                  transform: 'scale(1.02)',
                  boxShadow: 4
                }
              }}
              onClick={() => {
                const allImages = getAllImages();
                const targetIndex = findImageIndex(photo.url, images, index);
                openSlideshow(allImages, targetIndex);
              }}
            >
              <CardMedia
                component="img"
                height="200"
                image={getUploadUrl(photo.url)}
                alt={`Photo ${index + 1}`}
                sx={{ objectFit: 'contain' }}
              />
            </Card>
          </Box>
        ))}
      </Box>
    );
  };

  const renderField = (label: string, value: any, note?: string) => {
    if (value === undefined || value === null || value === '') return null;
    return (
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" color="text.secondary">
          {label}
        </Typography>
        {note && (
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 0.5 }}>
            {note}
          </Typography>
        )}
        <Typography variant="body1">
          {value}
        </Typography>
      </Box>
    );
  };

  const renderChipField = (label: string, value: any, chipConfig: { [key: string]: { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'default' } }, note?: string) => {
    if (value === undefined || value === null || value === '') return null;
    
    // Handle array values (like battery_condition)
    if (Array.isArray(value)) {
      if (value.length === 0) return null;
      return (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ minWidth: '120px' }}>
              <Typography variant="subtitle2" color="text.secondary">
                {label}
              </Typography>
              {note && (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', fontSize: '0.75rem' }}>
                  {note}
                </Typography>
              )}
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {value.map((item, index) => {
                const config = chipConfig[item];
                if (!config) return null;
                return (
                  <Chip
                    key={index}
                    label={config.label}
                    color={config.color}
                    variant="filled"
                    size="small"
                  />
                );
              })}
            </Box>
          </Box>
        </Box>
      );
    }
    
    // Handle single values
    const config = chipConfig[value];
    if (!config) {
      // Fallback to regular field rendering if no chip config
      return renderField(label, value, note);
    }
    
    return (
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ minWidth: '120px' }}>
            <Typography variant="subtitle2" color="text.secondary">
              {label}
            </Typography>
            {note && (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', fontSize: '0.75rem' }}>
                {note}
              </Typography>
            )}
          </Box>
          <Chip
            label={config.label}
            color={config.color}
            variant="filled"
            size="small"
          />
        </Box>
      </Box>
    );
  };

  const renderTireCommentChips = (tireComments: string[] = []) => {
    // Show all tire comment chips - matching the form styling
    const commentConfig: { [key: string]: { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'default' } } = {
      'separated': { label: 'Separated', color: 'error' },
      'dry_rotted': { label: 'Dry-Rotted', color: 'error' },
      'choppy': { label: 'Choppy', color: 'warning' },
      'cupped': { label: 'Cupped', color: 'warning' }
    };

    const chips: React.ReactNode[] = [];

    // Add comment chips if they exist
    tireComments.forEach((comment, index) => {
      if (commentConfig[comment]) {
        chips.push(
          <Chip
            key={`comment-${index}`}
            label={commentConfig[comment].label}
            color={commentConfig[comment].color}
            variant="filled"
            size="small"
            sx={{ fontWeight: 'normal' }}
          />
        );
      }
    });

    return chips;
  };

  const renderTireTread = (position: string, tread: any) => {
    if (!tread) return null;
    return (
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <TireTreadSideView
            innerEdgeCondition={tread.inner_edge_condition}
            innerCondition={tread.inner_condition}
            centerCondition={tread.center_condition}
            outerCondition={tread.outer_condition}
            outerEdgeCondition={tread.outer_edge_condition}
            innerEdgeDepth={parseInt(tread.inner_edge_depth) || 0}
            innerDepth={parseInt(tread.inner_depth) || 0}
            centerDepth={parseInt(tread.center_depth) || 0}
            outerDepth={parseInt(tread.outer_depth) || 0}
            outerEdgeDepth={parseInt(tread.outer_edge_depth) || 0}
            width={300}
            height={120}
          />
        </Box>
      </Box>
    );
  };

  const renderTireRepairImages = (tirePosition: string, tireImages?: { not_repairable: { url: string }[]; tire_size_brand: { url: string }[]; repairable_spot: { url: string }[]; }) => {
    console.log(`renderTireRepairImages called for ${tirePosition}:`, tireImages);
    
    if (!tireImages) {
      console.log(`No tire images provided for ${tirePosition}`);
      return (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            No tire repair images available for {tirePosition.replace('_', ' ')}
          </Typography>
        </Box>
      );
    }

    console.log(`${tirePosition} tire images structure:`, {
      not_repairable: tireImages.not_repairable,
      tire_size_brand: tireImages.tire_size_brand,
      repairable_spot: tireImages.repairable_spot
    });

    // Debug: Log the actual contents of the arrays
    if (tireImages.tire_size_brand.length > 0) {
      console.log(`${tirePosition} tire_size_brand images:`, tireImages.tire_size_brand);
      tireImages.tire_size_brand.forEach((img, index) => {
        console.log(`${tirePosition} tire_size_brand[${index}]:`, img);
      });
    }
    if (tireImages.not_repairable.length > 0) {
      console.log(`${tirePosition} not_repairable images:`, tireImages.not_repairable);
    }
    if (tireImages.repairable_spot.length > 0) {
      console.log(`${tirePosition} repairable_spot images:`, tireImages.repairable_spot);
    }

    const renderImageArray = (images: any[], category: string) => {
      const imageData = images.map((photo, index) => {
        let imageUrl = '';
        if (typeof photo === 'string') {
          imageUrl = photo;
        } else if (photo && typeof photo === 'object') {
          imageUrl = photo.url || photo.path || photo.src || photo.filename || '';
        }
        
        if (!imageUrl && photo && photo.filename) {
          imageUrl = `/uploads/${photo.filename}`;
        }
        
        return imageUrl ? {
          url: imageUrl,
          title: `${tirePosition.replace('_', ' ')} ${category.replace('_', ' ')} ${index + 1}`
        } : null;
      }).filter((item): item is {url: string, title: string} => item !== null);

      return images.map((photo, index) => {
        // Handle different photo object structures - same logic as renderTirePhotos
        let imageUrl = '';
        if (typeof photo === 'string') {
          imageUrl = photo;
        } else if (photo && typeof photo === 'object') {
          imageUrl = photo.url || photo.path || photo.src || photo.filename || '';
        }
        
        // If we don't have a URL, try to construct one
        if (!imageUrl && photo && photo.filename) {
          imageUrl = `/uploads/${photo.filename}`;
        }
        
        if (!imageUrl) {
          console.warn(`Could not determine image URL for ${tirePosition} ${category} photo:`, photo);
          return null;
        }
        
        return (
          <Card 
            key={`${tirePosition}-${category}-${index}`} 
            sx={{ 
              width: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(33.33% - 11px)' },
              cursor: 'pointer',
              transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
              '&:hover': {
                transform: 'scale(1.02)',
                boxShadow: 4
              }
            }}
            onClick={() => {
              const allImages = getAllImages();
              const targetIndex = findImageIndex(imageUrl, imageData, index);
              openSlideshow(allImages, targetIndex);
            }}
          >
            <CardMedia
              component="img"
              height="200"
              image={getUploadUrl(imageUrl)}
              alt={`${tirePosition} ${category} photo ${index + 1}`}
              sx={{ objectFit: 'contain' }}
              onError={(e) => {
                console.error(`Failed to load tire repair image for ${tirePosition} ${category}:`, imageUrl);
                // Try alternative URL if the current one fails
                if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('/uploads/')) {
                  const newUrl = `/uploads/${imageUrl}`;
                  console.log(`Trying alternative URL:`, newUrl);
                  e.currentTarget.src = getUploadUrl(newUrl);
                }
              }}
            />
          </Card>
        );
      }).filter(Boolean); // Remove null entries
    };

    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
        {renderImageArray(tireImages.not_repairable, 'not_repairable')}
        {renderImageArray(tireImages.tire_size_brand, 'tire_size_brand')}
        {renderImageArray(tireImages.repairable_spot, 'repairable_spot')}
      </Box>
    );
  };

  const renderTirePhotos = (tireType: string) => {
    // Check if this inspection type supports tire photos
    if (data.inspection_type === 'no_check') {
      return (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Tire photos not collected for No Check inspections
          </Typography>
        </Box>
      );
    }

    // Debug: Log the data structure to see what we're working with
    console.log('Tire photos data:', data.tire_photos);
    console.log('Looking for tire type:', tireType);
    
    // Try different ways to access the photos
    let photos: any[] = [];
    
    // Method 1: Try the expected structure
    if (data.tire_photos && Array.isArray(data.tire_photos)) {
      const tireGroup = data.tire_photos.find(group => group.type === tireType);
      if (tireGroup && tireGroup.photos) {
        photos = tireGroup.photos;
      }
    }
    
    // Method 2: Try direct access if photos are stored differently
    if (photos.length === 0) {
      const directPhotos = (data as any)[`${tireType}_photos`];
      if (directPhotos) {
        photos = directPhotos;
      }
    }
    
    // Method 3: Try accessing as a direct property
    if (photos.length === 0 && data.tire_photos && typeof data.tire_photos === 'object') {
      const directTirePhotos = (data.tire_photos as any)[tireType];
      if (directTirePhotos) {
        photos = directTirePhotos;
      }
    }
    
    console.log(`Found ${photos.length} photos for ${tireType}:`, photos);
    
    if (photos.length === 0) {
      return (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            No photos available for {tireType.replace('_', ' ')}
          </Typography>
        </Box>
      );
    }

    // Prepare image data for slideshow
    const imageData = photos.map((photo, index) => {
      let imageUrl = '';
      if (typeof photo === 'string') {
        imageUrl = photo;
      } else if (photo && typeof photo === 'object') {
        imageUrl = photo.url || photo.path || photo.src || photo.filename || '';
      }
      
      if (!imageUrl && photo && photo.filename) {
        imageUrl = `/uploads/${photo.filename}`;
      }
      
      return imageUrl ? {
        url: imageUrl,
        title: `${tireType.replace('_', ' ')} photo ${index + 1}`
      } : null;
    }).filter((item): item is {url: string, title: string} => item !== null);

    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
        {photos.map((photo, index) => {
          // Handle different photo object structures
          let imageUrl = '';
          if (typeof photo === 'string') {
            imageUrl = photo;
          } else if (photo && typeof photo === 'object') {
            imageUrl = photo.url || photo.path || photo.src || photo.filename || '';
          }
          
          // If we don't have a URL, try to construct one
          if (!imageUrl && photo && photo.filename) {
            imageUrl = `/uploads/${photo.filename}`;
          }
          
          if (!imageUrl) {
            console.warn('Could not determine image URL for photo:', photo);
            return null;
          }
          
          return (
            <Card 
              key={index} 
              sx={{ 
                width: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(33.33% - 11px)' },
                cursor: 'pointer',
                transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                '&:hover': {
                  transform: 'scale(1.02)',
                  boxShadow: 4
                }
              }}
              onClick={() => {
                const allImages = getAllImages();
                const targetIndex = findImageIndex(imageUrl, imageData, index);
                openSlideshow(allImages, targetIndex);
              }}
            >
              <CardMedia
                component="img"
                height="200"
                image={getUploadUrl(imageUrl)}
                alt={`${tireType} photo ${index + 1}`}
                sx={{ objectFit: 'contain' }}
                onError={(e) => {
                  console.error(`Failed to load image for ${tireType}:`, imageUrl);
                  // Try alternative URL if the current one fails
                  if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('/uploads/')) {
                    const newUrl = `/uploads/${imageUrl}`;
                    console.log(`Trying alternative URL:`, newUrl);
                    e.currentTarget.src = getUploadUrl(newUrl);
                  }
                }}
              />
            </Card>
          );
        })}
      </Box>
    );
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

  if (error) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 4 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      </Container>
    );
  }

  if (!quickCheck) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 4 }}>
          <Alert severity="warning">Quick check not found</Alert>
        </Box>
      </Container>
    );
  }

  const data = quickCheck.data;

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 0 }}>
        {/* Page Title - Inspection Type with Action Icons */}
        <Box sx={{ position: 'relative', mb: 2 }}>
          <Typography variant="h5" component="h1" sx={{ color: 'primary.main', textAlign: 'center' }}>
            {formatInspectionType(data.inspection_type)}
          </Typography>
          <Box sx={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="View Timing Information">
              <IconButton
                color="primary"
                onClick={() => setTimingDialogOpen(true)}
                size="medium"
              >
                <TimeIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Archive Quick Check">
              <IconButton
                color="primary"
                onClick={handleArchiveClick}
                disabled={archiving}
                size="medium"
              >
                {archiving ? <CircularProgress size={20} /> : <ArchiveIcon />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Paper sx={{ width: '100%', p: 3 }}>
          {/* Inspector and Date Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, pb: 2, borderBottom: '1px solid #e0e0e0' }}>
            <Typography variant="body2" color="text.secondary">
              {quickCheck.user_name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {new Date(quickCheck.created_at).toLocaleString()}
            </Typography>
          </Box>

          {/* Decoded Details Section */}
          <Box sx={{ mb: 4 }}>
            {/* Loading and Error States */}
            {vinDecodeLoading && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <CircularProgress size={16} />
                <Typography variant="body2" color="text.secondary">
                  Decoding VIN...
                </Typography>
              </Box>
            )}
            {vinDecodeError && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="error">
                  {vinDecodeError}
                </Typography>
              </Box>
            )}
            
            {/* Decoded Vehicle Details Chip */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
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
                const cylinders = getValue('Engine Number of Cylinders');
                
                // Format engine displacement to max 2 decimal places
                const formattedEngine = engine ? parseFloat(engine).toFixed(2).replace(/\.?0+$/, '') + 'L' : '';
                
                const label = [
                  year, 
                  make, 
                  model, 
                  formattedEngine, 
                  cylinders ? cylinders + ' cyl' : ''
                ].filter(Boolean).join(' ');
                if (!label) return null;
                return (
                  <Chip 
                    label={label} 
                    color="primary" 
                    variant="filled"
                    clickable
                    onClick={() => setVehicleDetailsOpen(true)}
                    sx={{ fontWeight: 'medium' }}
                  />
                );
              })()}
            </Box>
            
            {/* VIN and Mileage */}
            <Box sx={{ display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center' }}>
              <Typography variant="h6" gutterBottom>
                {data.vin}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Mileage: {data.mileage}
              </Typography>
            </Box>
          </Box>

          {/* Dash Lights Photos */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Dash Lights Photos
            </Typography>
            {data.field_notes?.dash_lights_photos && (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
                {data.field_notes.dash_lights_photos}
              </Typography>
            )}
            {renderImageGallery(data.dash_lights_photos, 'Dash Lights Photo')}
          </Box>

          {/* Mileage Photos */}
          {data.mileage_photos && data.mileage_photos.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                Mileage Photos
              </Typography>
              {data.field_notes?.mileage_photos && (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
                  {data.field_notes.mileage_photos}
                </Typography>
              )}
              {renderImageGallery(data.mileage_photos, 'Mileage Photo')}
            </Box>
          )}

          {/* VIN Photos */}
          {data.vin_photos && data.vin_photos.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                VIN Photos
              </Typography>
              {data.field_notes?.vin_photos && (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
                  {data.field_notes.vin_photos}
                </Typography>
              )}
              {renderImageGallery(data.vin_photos, 'VIN Photo')}
            </Box>
          )}

          {/* TPMS Placard */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              TPMS Placard
            </Typography>
            {data.field_notes?.tpms_placard && (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
                {data.field_notes.tpms_placard}
              </Typography>
            )}
            {renderImageGallery(data.tpms_placard, 'TPMS Placard Photo')}
          </Box>

          {/* Notes Section */}
          {data.notes && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                Notes
              </Typography>
              {data.field_notes?.notes && (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 1 }}>
                  {data.field_notes.notes}
                </Typography>
              )}
              <Typography variant="body1">
                {data.notes}
              </Typography>
            </Box>
          )}

          {/* Leaks (VSI) */}
          {(data.inspection_type === 'vsi' || data.leaks) && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" gutterBottom>
                Leaks (VSI)
              </Typography>

              {/* Leaks */}
              {data.leaks && (
                <Box sx={{ mb: 3 }}>
                  {renderChipField('Leaks', data.leaks, {
                    'good': { label: '✅ No Leaks', color: 'success' },
                    'warning': { label: '⚠️ Minor Leaks', color: 'warning' },
                    'bad': { label: '❌ Major Leaks', color: 'error' },
                    'na': { label: 'N/A', color: 'default' }
                  }, data.field_notes?.leaks)}
                </Box>
              )}

              {/* Leaks Photos */}
              {data.leaks_photos && data.leaks_photos.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Leaks Photos
                  </Typography>
                  {data.field_notes?.leaks_photos && (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
                      {data.field_notes.leaks_photos}
                    </Typography>
                  )}
                  {renderImageGallery(data.leaks_photos, 'Leaks Photo')}
                </Box>
              )}
            </Box>
          )}

          {/* Shock Struts (VSI) */}
          {(data.inspection_type === 'vsi' || data.front_shock_struts || data.rear_shock_struts) && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" gutterBottom>
                Shock Struts (VSI)
              </Typography>

              {/* Front Shock Struts */}
              {data.front_shock_struts && (
                <Box sx={{ mb: 3 }}>
                  {renderChipField('Front Shock Struts', data.front_shock_struts, {
                    'good': { label: '✅ Good', color: 'success' },
                    'warning': { label: '⚠️ Warning', color: 'warning' },
                    'bad': { label: '❌ Bad', color: 'error' },
                    'na': { label: 'N/A', color: 'default' }
                  }, data.field_notes?.front_shock_struts)}
                </Box>
              )}

              {/* Front Shock Struts Photos */}
              {data.front_shock_struts_photos && data.front_shock_struts_photos.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Front Shock Struts Photos
                  </Typography>
                  {data.field_notes?.front_shock_struts_photos && (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
                      {data.field_notes.front_shock_struts_photos}
                    </Typography>
                  )}
                  {renderImageGallery(data.front_shock_struts_photos, 'Front Shock Struts Photo')}
                </Box>
              )}

              {/* Rear Shock Struts */}
              {data.rear_shock_struts && (
                <Box sx={{ mb: 3 }}>
                  {renderChipField('Rear Shock Struts', data.rear_shock_struts, {
                    'good': { label: '✅ Good', color: 'success' },
                    'warning': { label: '⚠️ Warning', color: 'warning' },
                    'bad': { label: '❌ Bad', color: 'error' },
                    'na': { label: 'N/A', color: 'default' }
                  }, data.field_notes?.rear_shock_struts)}
                </Box>
              )}

              {/* Rear Shock Struts Photos */}
              {data.rear_shock_struts_photos && data.rear_shock_struts_photos.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Rear Shock Struts Photos
                  </Typography>
                  {data.field_notes?.rear_shock_struts_photos && (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
                      {data.field_notes.rear_shock_struts_photos}
                    </Typography>
                  )}
                  {renderImageGallery(data.rear_shock_struts_photos, 'Rear Shock Struts Photo')}
                </Box>
              )}
            </Box>
          )}

          {/* Suspension Components (VSI) */}
          {(data.inspection_type === 'vsi' || data.left_control_arm_bushings || data.left_ball_joints || data.right_control_arm_bushings || data.right_ball_joints || data.sway_bar || data.suspension_type) && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" gutterBottom>
                Suspension Components (VSI)
              </Typography>

              {/* Left Ball Joints */}
              {data.left_ball_joints && (
                <Box sx={{ mb: 3 }}>
                  {renderChipField('Left Ball Joints', data.left_ball_joints, {
                    'good': { label: '✅ Good', color: 'success' },
                    'warning': { label: '⚠️ Warning', color: 'warning' },
                    'bad': { label: '❌ Bad', color: 'error' },
                    'na': { label: 'N/A', color: 'default' }
                  }, data.field_notes?.left_ball_joints)}
                </Box>
              )}

              {/* Left Ball Joints Photos */}
              {data.left_ball_joints_photos && data.left_ball_joints_photos.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Left Ball Joints Photos
                  </Typography>
                  {data.field_notes?.left_ball_joints_photos && (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
                      {data.field_notes.left_ball_joints_photos}
                    </Typography>
                  )}
                  {renderImageGallery(data.left_ball_joints_photos, 'Left Ball Joints Photo')}
                </Box>
              )}

              {/* Left Control Arm Bushings */}
              {data.left_control_arm_bushings && (
                <Box sx={{ mb: 3 }}>
                  {renderChipField('Left Control Arm Bushings', data.left_control_arm_bushings, {
                    'good': { label: '✅ Good', color: 'success' },
                    'warning': { label: '⚠️ Warning', color: 'warning' },
                    'bad': { label: '❌ Bad', color: 'error' },
                    'na': { label: 'N/A', color: 'default' }
                  }, data.field_notes?.left_control_arm_bushings)}
                </Box>
              )}

              {/* Left Control Arm Bushings Photos */}
              {data.left_control_arm_bushings_photos && data.left_control_arm_bushings_photos.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Left Control Arm Bushings Photos
                  </Typography>
                  {data.field_notes?.left_control_arm_bushings_photos && (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
                      {data.field_notes.left_control_arm_bushings_photos}
                    </Typography>
                  )}
                  {renderImageGallery(data.left_control_arm_bushings_photos, 'Left Control Arm Bushings Photo')}
                </Box>
              )}

              {/* Right Ball Joints */}
              {data.right_ball_joints && (
                <Box sx={{ mb: 3 }}>
                  {renderChipField('Right Ball Joints', data.right_ball_joints, {
                    'good': { label: '✅ Good', color: 'success' },
                    'warning': { label: '⚠️ Warning', color: 'warning' },
                    'bad': { label: '❌ Bad', color: 'error' },
                    'na': { label: 'N/A', color: 'default' }
                  }, data.field_notes?.right_ball_joints)}
                </Box>
              )}

              {/* Right Ball Joints Photos */}
              {data.right_ball_joints_photos && data.right_ball_joints_photos.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Right Ball Joints Photos
                  </Typography>
                  {data.field_notes?.right_ball_joints_photos && (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
                      {data.field_notes.right_ball_joints_photos}
                    </Typography>
                  )}
                  {renderImageGallery(data.right_ball_joints_photos, 'Right Ball Joints Photo')}
                </Box>
              )}

              {/* Right Control Arm Bushings */}
              {data.right_control_arm_bushings && (
                <Box sx={{ mb: 3 }}>
                  {renderChipField('Right Control Arm Bushings', data.right_control_arm_bushings, {
                    'good': { label: '✅ Good', color: 'success' },
                    'warning': { label: '⚠️ Warning', color: 'warning' },
                    'bad': { label: '❌ Bad', color: 'error' },
                    'na': { label: 'N/A', color: 'default' }
                  }, data.field_notes?.right_control_arm_bushings)}
                </Box>
              )}

              {/* Right Control Arm Bushings Photos */}
              {data.right_control_arm_bushings_photos && data.right_control_arm_bushings_photos.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Right Control Arm Bushings Photos
                  </Typography>
                  {data.field_notes?.right_control_arm_bushings_photos && (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
                      {data.field_notes.right_control_arm_bushings_photos}
                    </Typography>
                  )}
                  {renderImageGallery(data.right_control_arm_bushings_photos, 'Right Control Arm Bushings Photo')}
                </Box>
              )}

              {/* Suspension Type */}
              {data.suspension_type && (
                <Box sx={{ mb: 3 }}>
                  {renderChipField('Suspension Type', data.suspension_type, {
                    'independent': { label: '🔧 Independent', color: 'info' },
                    'solid_axle': { label: '🔧 Solid Axle', color: 'info' },
                    'torsion_beam': { label: '🔧 Torsion Beam', color: 'info' },
                    'na': { label: 'N/A', color: 'default' }
                  }, data.field_notes?.suspension_type)}
                </Box>
              )}

              {/* Suspension Type Photos */}
              {data.suspension_type_photos && data.suspension_type_photos.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Suspension Type Photos
                  </Typography>
                  {data.field_notes?.suspension_type_photos && (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
                      {data.field_notes.suspension_type_photos}
                    </Typography>
                  )}
                  {renderImageGallery(data.suspension_type_photos, 'Suspension Type Photo')}
                </Box>
              )}

              {/* Sway Bar */}
              {data.sway_bar && (
                <Box sx={{ mb: 3 }}>
                  {renderChipField('Sway Bar', data.sway_bar, {
                    'good': { label: '✅ Good', color: 'success' },
                    'warning': { label: '⚠️ Warning', color: 'warning' },
                    'bad': { label: '❌ Bad', color: 'error' },
                    'na': { label: 'N/A', color: 'default' }
                  }, data.field_notes?.sway_bar)}
                </Box>
              )}

              {/* Sway Bar Photos */}
              {data.sway_bar_photos && data.sway_bar_photos.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Sway Bar Photos
                  </Typography>
                  {data.field_notes?.sway_bar_photos && (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
                      {data.field_notes.sway_bar_photos}
                    </Typography>
                  )}
                  {renderImageGallery(data.sway_bar_photos, 'Sway Bar Photo')}
                </Box>
              )}
            </Box>
          )}

          {/* MISC Section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" gutterBottom>
              MISC
            </Typography>
            
            {/* State Inspection Status */}
            <Box sx={{ mb: 3 }}>
              {renderChipField('State Inspection Status', data.state_inspection_status, {
                'expired': { label: '❌ Expired', color: 'error' },
                'this_year': { label: '✅ This Year', color: 'success' },
                'next_year': { label: '⚠️ Next Year', color: 'warning' },
                'year_after': { label: '⚠️ Year After', color: 'warning' },
                'no_sticker': { label: '❌ No Sticker', color: 'error' }
              }, data.field_notes?.state_inspection_status)}
            </Box>

            {/* State Inspection Month */}
            {data.state_inspection_month && (
              <Box sx={{ mb: 3 }}>
                {renderField('State Inspection Month', data.state_inspection_month, data.field_notes?.state_inspection_month)}
              </Box>
            )}

            {/* State Inspection Date Code */}
            {data.state_inspection_date_code && (
              <Box sx={{ mb: 3 }}>
                {renderField('State Inspection Date Code', data.state_inspection_date_code, data.field_notes?.state_inspection_date_code)}
              </Box>
            )}

            {/* State Inspection Status Photos */}
            {data.state_inspection_status_photos && data.state_inspection_status_photos.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  State Inspection Status Photos
                </Typography>
                {data.field_notes?.state_inspection_status_photos && (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
                    {data.field_notes.state_inspection_status_photos}
                  </Typography>
                )}
                {renderImageGallery(data.state_inspection_status_photos, 'State Inspection Status Photo')}
              </Box>
            )}

            {/* State Inspection Date Code Photos */}
            {data.state_inspection_date_code_photos && data.state_inspection_date_code_photos.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  State Inspection Date Code Photos
                </Typography>
                {data.field_notes?.state_inspection_date_code_photos && (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
                    {data.field_notes.state_inspection_date_code_photos}
                  </Typography>
                )}
                {renderImageGallery(data.state_inspection_date_code_photos, 'State Inspection Date Code Photo')}
              </Box>
            )}



            {/* Tire Repair Zones */}
            {data.tire_repair_status === 'repairable' && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Tire Repair Zones
                </Typography>
                <TireRepairLayout
                  tireStatuses={{
                    driver_front: data.tire_repair_statuses.driver_front,
                    passenger_front: data.tire_repair_statuses.passenger_front,
                    driver_rear_outer: data.tire_repair_statuses.driver_rear_outer,
                    driver_rear_inner: data.tire_repair_statuses.driver_rear_inner,
                    passenger_rear_inner: data.tire_repair_statuses.passenger_rear_inner,
                    passenger_rear_outer: data.tire_repair_statuses.passenger_rear_outer,
                    spare: data.tire_repair_statuses.spare
                  }}
                  tireImages={data.tire_repair_images ? Object.fromEntries(
                    Object.entries(data.tire_repair_images).map(([position, images]) => [
                      position,
                      {
                        not_repairable: images.not_repairable?.map((img: any) => ({
                          file: {} as File,
                          progress: 100,
                          url: img.url
                        })) || [],
                        tire_size_brand: images.tire_size_brand?.map((img: any) => ({
                          file: {} as File,
                          progress: 100,
                          url: img.url
                        })) || [],
                        repairable_spot: images.repairable_spot?.map((img: any) => ({
                          file: {} as File,
                          progress: 100,
                          url: img.url
                        })) || []
                      }
                    ])
                  ) : undefined}
                  onTireStatusChange={() => {}} // Read-only in details view
                  showDually={!!(data.tire_repair_statuses.driver_rear_inner || data.tire_repair_statuses.passenger_rear_inner)}
                  onDuallyToggle={() => {}} // No-op for read-only view
                  onTireClick={handleTireRepairDetailClick}
                />
                {/* Tire Repair Status Photos */}
                {data.tire_repair_status_photos && data.tire_repair_status_photos.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Tire Repair Status Photos
                    </Typography>
                    {data.field_notes?.tire_repair_status_photos && (
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
                        {data.field_notes.tire_repair_status_photos}
                      </Typography>
                    )}
                    {renderImageGallery(data.tire_repair_status_photos, 'Tire Repair Status Photo')}
                  </Box>
                )}
              </Box>
            )}



            {/* TPMS Zones */}
            {data.tpms_type === 'bad_sensor' && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  TPMS Zones
                </Typography>
                {data.field_notes?.tpms_type && (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
                    {data.field_notes.tpms_type}
                  </Typography>
                )}
                <TPMSLayout
                  tpmsStatuses={{
                    driver_front: data.tpms_statuses.driver_front,
                    passenger_front: data.tpms_statuses.passenger_front,
                    driver_rear_outer: data.tpms_statuses.driver_rear_outer,
                    driver_rear_inner: data.tpms_statuses.driver_rear_inner,
                    passenger_rear_inner: data.tpms_statuses.passenger_rear_inner,
                    passenger_rear_outer: data.tpms_statuses.passenger_rear_outer,
                    spare: data.tpms_statuses.spare
                  }}
                  tpmsSensorTypes={data.tpms_sensor_types || {}}
                  onTPMSStatusChange={() => {}} // Read-only in details view
                  onTPMSSensorTypeChange={() => {}} // No-op for read-only view
                  showDually={!!(data.tpms_statuses.driver_rear_inner || data.tpms_statuses.passenger_rear_inner)}
                  onDuallyToggle={() => {}} // No-op for read-only view
                  readOnly={true} // Disable popups in detail view
                />
                {/* TPMS Tool Photos */}
                {data.tpms_tool_photo && data.tpms_tool_photo.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      TPMS Tool Photos
                    </Typography>
                    {data.field_notes?.tpms_tool_photo && (
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
                        {data.field_notes.tpms_tool_photo}
                      </Typography>
                    )}
                    {renderImageGallery(data.tpms_tool_photo, 'TPMS Tool Photo')}
                  </Box>
                )}
              </Box>
            )}

            {/* Tire Rotation */}
            <Box sx={{ mb: 3 }}>
              {renderChipField('Tire Rotation', data.tire_rotation, {
                'good': { label: '✅ Good', color: 'success' },
                'bad': { label: '🔄 Recommend Tire Rotation', color: 'warning' }
              }, data.field_notes?.tire_rotation)}
            </Box>

            {/* Static Sticker with oil type selection */}
            <Box sx={{ mb: 3 }}>
              {data.static_sticker && (
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ minWidth: '120px' }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Static Sticker
                      </Typography>
                      {data.field_notes?.static_sticker && (
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', fontSize: '0.75rem' }}>
                          {data.field_notes.static_sticker}
                        </Typography>
                      )}
                    </Box>
                    {data.static_sticker === 'need_sticker' ? (
                      <Chip
                        label="Select Oil Type"
                        color="primary"
                        variant="filled"
                        size="small"
                        clickable
                        icon={<OilIcon />}
                        onClick={() => setShowOilTypeDialog(true)}
                        sx={{ fontWeight: 'bold' }}
                      />
                    ) : (
                      <Chip
                        label={
                          data.static_sticker === 'good' ? '✅ Good' :
                          data.static_sticker === 'not_oil_change' ? '⚠️ Not Oil Change' :
                          '❌ Need Sticker'
                        }
                        color={
                          data.static_sticker === 'good' ? 'success' :
                          data.static_sticker === 'not_oil_change' ? 'warning' :
                          'error'
                        }
                        variant="filled"
                        size="small"
                      />
                    )}
                  </Box>
                </Box>
              )}
            </Box>

            {/* Drain Plug Type */}
            <Box sx={{ mb: 3 }}>
              {renderChipField('Drain Plug Type', data.drain_plug_type, {
                'metal': { label: '✅ Metal', color: 'success' },
                'plastic': { label: '⚠️ Plastic', color: 'warning' }
              }, data.field_notes?.drain_plug_type)}
            </Box>

            {/* Undercarriage Photos */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Undercarriage Photos
              </Typography>
              {data.field_notes?.undercarriage_photos && (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
                  {data.field_notes.undercarriage_photos}
                </Typography>
              )}
              {data.undercarriage_photos && data.undercarriage_photos.length > 0 ? (
                renderImageGallery(data.undercarriage_photos, 'Undercarriage Photo')
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No undercarriage photos available
                </Typography>
              )}
            </Box>
          </Box>

          {/* Battery Section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" gutterBottom>
              Battery
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
              {renderChipField('Battery Condition', data.battery_condition, {
                'good': { label: '✅ Good', color: 'success' },
                'warning': { label: '⚠️ Warning', color: 'warning' },
                'bad': { label: '❌ Bad', color: 'error' },
                'na': { label: 'N/A', color: 'default' },
                'terminal_cleaning': { label: '🔧 Terminal Cleaning', color: 'info' },
                'less_than_5yr': { label: '📅 Less than 5yr', color: 'info' }
              }, data.field_notes?.battery_condition)}
            </Box>

            {/* Battery Condition Main */}
            {data.battery_condition_main && (
              <Box sx={{ mb: 3 }}>
                {renderChipField('Battery Condition Main', data.battery_condition_main, {
                  'good': { label: '✅ Good', color: 'success' },
                  'warning': { label: '⚠️ Warning', color: 'warning' },
                  'bad': { label: '❌ Bad', color: 'error' },
                  'na': { label: 'N/A', color: 'default' }
                }, data.field_notes?.battery_condition_main)}
              </Box>
            )}

            {/* Battery Terminals */}
            {data.battery_terminals && data.battery_terminals.length > 0 && (
              <Box sx={{ mb: 3 }}>
                {renderChipField('Battery Terminals', data.battery_terminals, {
                  'terminal_cleaning': { label: '🔧 Terminal Cleaning', color: 'info' },
                  'terminal_damaged': { label: '❌ Terminal Damaged', color: 'error' }
                }, data.field_notes?.battery_terminals)}
              </Box>
            )}

            {/* Battery Terminal Damage Location */}
            {data.battery_terminal_damage_location && data.battery_terminal_damage_location.length > 0 && (
              <Box sx={{ mb: 3 }}>
                {renderChipField('Battery Terminal Damage Location', data.battery_terminal_damage_location, {
                  'positive': { label: '➕ Positive', color: 'error' },
                  'negative': { label: '➖ Negative', color: 'error' }
                }, data.field_notes?.battery_terminal_damage_location)}
              </Box>
            )}

            {/* Battery Date Code */}
            {data.battery_date_code && (
              <Box sx={{ mb: 3 }}>
                {renderField('Battery Date Code', data.battery_date_code, data.field_notes?.battery_date_code)}
              </Box>
            )}

            {/* Battery Date Code Photos */}
            {data.battery_date_code_photos && data.battery_date_code_photos.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Battery Date Code Photos
                </Typography>
                {data.field_notes?.battery_date_code_photos && (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
                    {data.field_notes.battery_date_code_photos}
                  </Typography>
                )}
                {renderImageGallery(data.battery_date_code_photos, 'Battery Date Code Photo')}
              </Box>
            )}

            {data.field_notes?.battery_photos && (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
                {data.field_notes.battery_photos}
              </Typography>
            )}
            {renderImageGallery(data.battery_photos, 'Battery Photo')}
          </Box>

          {/* VSI-Specific Sections - Alphabetically Ordered */}
          
          {/* Check Engine Mounts (VSI) */}
          {(data.inspection_type === 'vsi' || data.check_engine_mounts) && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" gutterBottom>
                Check Engine Mounts (VSI)
              </Typography>

              {/* Check Engine Mounts */}
              {data.check_engine_mounts && (
                <Box sx={{ mb: 3 }}>
                  {renderChipField('Check Engine Mounts', data.check_engine_mounts, {
                    'good': { label: '✅ Good', color: 'success' },
                    'warning': { label: '⚠️ Warning', color: 'warning' },
                    'bad': { label: '❌ Bad', color: 'error' },
                    'na': { label: 'N/A', color: 'default' }
                  }, data.field_notes?.check_engine_mounts)}
                </Box>
              )}

              {/* Check Engine Mounts Photos */}
              {data.check_engine_mounts_photos && data.check_engine_mounts_photos.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Check Engine Mounts Photos
                  </Typography>
                  {data.field_notes?.check_engine_mounts_photos && (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
                      {data.field_notes.check_engine_mounts_photos}
                    </Typography>
                  )}
                  {renderImageGallery(data.check_engine_mounts_photos, 'Check Engine Mounts Photo')}
                </Box>
              )}
            </Box>
          )}

          {/* Cooling System (VSI) */}
          {(data.inspection_type === 'vsi' || data.coolant || data.cooling_hoses || data.radiator_end_caps) && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" gutterBottom>
                Cooling System (VSI)
              </Typography>

              {/* Coolant */}
              {data.coolant && (
                <Box sx={{ mb: 3 }}>
                  {renderChipField('Coolant', data.coolant, {
                    'good': { label: '✅ Good', color: 'success' },
                    'warning': { label: '⚠️ Warning', color: 'warning' },
                    'bad': { label: '❌ Bad', color: 'error' },
                    'na': { label: 'N/A', color: 'default' }
                  }, data.field_notes?.coolant)}
                </Box>
              )}

              {/* Coolant Photos */}
              {data.coolant_photos && data.coolant_photos.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Coolant Photos
                  </Typography>
                  {data.field_notes?.coolant_photos && (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
                      {data.field_notes.coolant_photos}
                    </Typography>
                  )}
                  {renderImageGallery(data.coolant_photos, 'Coolant Photo')}
                </Box>
              )}

              {/* Cooling Hoses */}
              {data.cooling_hoses && (
                <Box sx={{ mb: 3 }}>
                  {renderChipField('Cooling Hoses', data.cooling_hoses, {
                    'good': { label: '✅ Good', color: 'success' },
                    'warning': { label: '⚠️ Warning', color: 'warning' },
                    'bad': { label: '❌ Bad', color: 'error' },
                    'na': { label: 'N/A', color: 'default' }
                  }, data.field_notes?.cooling_hoses)}
                </Box>
              )}

              {/* Cooling Hoses Photos */}
              {data.cooling_hoses_photos && data.cooling_hoses_photos.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Cooling Hoses Photos
                  </Typography>
                  {data.field_notes?.cooling_hoses_photos && (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
                      {data.field_notes.cooling_hoses_photos}
                    </Typography>
                  )}
                  {renderImageGallery(data.cooling_hoses_photos, 'Cooling Hoses Photo')}
                </Box>
              )}

              {/* Radiator End Caps */}
              {data.radiator_end_caps && (
                <Box sx={{ mb: 3 }}>
                  {renderChipField('Radiator End Caps', data.radiator_end_caps, {
                    'good': { label: '✅ Good', color: 'success' },
                    'warning': { label: '⚠️ Warning', color: 'warning' },
                    'bad': { label: '❌ Bad', color: 'error' },
                    'na': { label: 'N/A', color: 'default' }
                  }, data.field_notes?.radiator_end_caps)}
                </Box>
              )}

              {/* Radiator End Caps Photos */}
              {data.radiator_end_caps_photos && data.radiator_end_caps_photos.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Radiator End Caps Photos
                  </Typography>
                  {data.field_notes?.radiator_end_caps_photos && (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
                      {data.field_notes.radiator_end_caps_photos}
                    </Typography>
                  )}
                  {renderImageGallery(data.radiator_end_caps_photos, 'Radiator End Caps Photo')}
                </Box>
              )}
            </Box>
          )}

          {/* Drive Belt (VSI) */}
          {(data.inspection_type === 'vsi' || data.drive_belt) && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" gutterBottom>
                Drive Belt (VSI)
              </Typography>

              {/* Drive Belt */}
              {data.drive_belt && (
                <Box sx={{ mb: 3 }}>
                  {renderChipField('Drive Belt', data.drive_belt, {
                    'good': { label: '✅ Good', color: 'success' },
                    'warning': { label: '⚠️ Warning', color: 'warning' },
                    'bad': { label: '❌ Bad', color: 'error' },
                    'na': { label: 'N/A', color: 'default' }
                  }, data.field_notes?.drive_belt)}
                </Box>
              )}

              {/* Drive Belt Photos */}
              {data.drive_belt_photos && data.drive_belt_photos.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Drive Belt Photos
                  </Typography>
                  {data.field_notes?.drive_belt_photos && (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
                      {data.field_notes.drive_belt_photos}
                    </Typography>
                  )}
                  {renderImageGallery(data.drive_belt_photos, 'Drive Belt Photo')}
                </Box>
              )}
            </Box>
          )}

          {/* Engine Mounts (VSI) */}
          {(data.inspection_type === 'vsi' || data.engine_mounts) && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" gutterBottom>
                Engine Mounts (VSI)
              </Typography>

              {/* Engine Mounts */}
              {data.engine_mounts && (
                <Box sx={{ mb: 3 }}>
                  {renderChipField('Engine Mounts', data.engine_mounts, {
                    'good': { label: '✅ Good', color: 'success' },
                    'warning': { label: '⚠️ Warning', color: 'warning' },
                    'bad': { label: '❌ Bad', color: 'error' },
                    'na': { label: 'N/A', color: 'default' }
                  }, data.field_notes?.engine_mounts)}
                </Box>
              )}

              {/* Engine Mounts Photos */}
              {data.engine_mounts_photos && data.engine_mounts_photos.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Engine Mounts Photos
                  </Typography>
                  {data.field_notes?.engine_mounts_photos && (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
                      {data.field_notes.engine_mounts_photos}
                    </Typography>
                  )}
                  {renderImageGallery(data.engine_mounts_photos, 'Engine Mounts Photo')}
                </Box>
              )}
            </Box>
          )}

          {/* Exterior Lights (VSI) */}
          {(data.inspection_type === 'vsi' || data.exterior_lights_front || data.exterior_lights_rear) && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" gutterBottom>
                Exterior Lights (VSI)
              </Typography>

              {/* Exterior Lights Front */}
              {data.exterior_lights_front && (
                <Box sx={{ mb: 3 }}>
                  {renderChipField('Exterior Lights Front', data.exterior_lights_front, {
                    'good': { label: '✅ Good', color: 'success' },
                    'warning': { label: '⚠️ Warning', color: 'warning' },
                    'bad': { label: '❌ Bad', color: 'error' },
                    'na': { label: 'N/A', color: 'default' }
                  }, data.field_notes?.exterior_lights_front)}
                </Box>
              )}

              {/* Exterior Lights Photos */}
              {data.exterior_lights_photos && data.exterior_lights_photos.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Exterior Lights Photos
                  </Typography>
                  {data.field_notes?.exterior_lights_photos && (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
                      {data.field_notes.exterior_lights_photos}
                    </Typography>
                  )}
                  {renderImageGallery(data.exterior_lights_photos, 'Exterior Lights Photo')}
                </Box>
              )}

              {/* Exterior Lights Rear */}
              {data.exterior_lights_rear && (
                <Box sx={{ mb: 3 }}>
                  {renderChipField('Exterior Lights Rear', data.exterior_lights_rear, {
                    'good': { label: '✅ Good', color: 'success' },
                    'warning': { label: '⚠️ Warning', color: 'warning' },
                    'bad': { label: '❌ Bad', color: 'error' },
                    'na': { label: 'N/A', color: 'default' }
                  }, data.field_notes?.exterior_lights_rear)}
                </Box>
              )}
            </Box>
          )}

          {/* Fluids (VSI) */}
          {(data.inspection_type === 'vsi' || data.brake_fluid || data.powersteering_fluid) && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" gutterBottom>
                Fluids (VSI)
              </Typography>

              {/* Brake Fluid */}
              {data.brake_fluid && (
                <Box sx={{ mb: 3 }}>
                  {renderChipField('Brake Fluid', data.brake_fluid, {
                    'good': { label: '✅ Good', color: 'success' },
                    'warning': { label: '⚠️ Warning', color: 'warning' },
                    'bad': { label: '❌ Bad', color: 'error' },
                    'na': { label: 'N/A', color: 'default' }
                  }, data.field_notes?.brake_fluid)}
                </Box>
              )}

              {/* Brake Fluid Photos */}
              {data.brake_fluid_photos && data.brake_fluid_photos.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Brake Fluid Photos
                  </Typography>
                  {data.field_notes?.brake_fluid_photos && (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
                      {data.field_notes.brake_fluid_photos}
                    </Typography>
                  )}
                  {renderImageGallery(data.brake_fluid_photos, 'Brake Fluid Photo')}
                </Box>
              )}

              {/* Power Steering Fluid */}
              {data.powersteering_fluid && (
                <Box sx={{ mb: 3 }}>
                  {renderChipField('Power Steering Fluid', data.powersteering_fluid, {
                    'good': { label: '✅ Good', color: 'success' },
                    'warning': { label: '⚠️ Warning', color: 'warning' },
                    'bad': { label: '❌ Bad', color: 'error' },
                    'na': { label: 'N/A', color: 'default' }
                  }, data.field_notes?.powersteering_fluid)}
                </Box>
              )}

              {/* Power Steering Fluid Photos */}
              {data.powersteering_fluid_photos && data.powersteering_fluid_photos.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Power Steering Fluid Photos
                  </Typography>
                  {data.field_notes?.powersteering_fluid_photos && (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
                      {data.field_notes.powersteering_fluid_photos}
                    </Typography>
                  )}
                  {renderImageGallery(data.powersteering_fluid_photos, 'Power Steering Fluid Photo')}
                </Box>
              )}
            </Box>
          )}

          {/* Brakes Section - Only for QuickCheck */}
          {data.inspection_type === 'quick_check' && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" gutterBottom>
                Brakes
              </Typography>
            
            {/* Front Brakes */}
            <Box sx={{ mb: 3 }}>
              {data.field_notes?.front_brake_pads && (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
                  {data.field_notes.front_brake_pads}
                </Typography>
              )}
              <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center', mb: 2 }}>
                <BrakePadFrontAxleView
                  driverInnerPad={
                    'driver' in (data.front_brake_pads || {}) 
                      ? (data.front_brake_pads as any)?.driver?.inner || 'good'
                      : 'good'
                  }
                  driverOuterPad={
                    'driver' in (data.front_brake_pads || {}) 
                      ? (data.front_brake_pads as any)?.driver?.outer || 'good'
                      : 'good'
                  }
                  driverRotorCondition={
                    'driver' in (data.front_brake_pads || {}) 
                      ? (data.front_brake_pads as any)?.driver?.rotor_condition || 'good'
                      : (data.front_brake_pads as any)?.rotor_condition || 'good'
                  }
                  passengerInnerPad={
                    'passenger' in (data.front_brake_pads || {}) 
                      ? (data.front_brake_pads as any)?.passenger?.inner || 'good'
                      : 'good'
                  }
                  passengerOuterPad={
                    'passenger' in (data.front_brake_pads || {}) 
                      ? (data.front_brake_pads as any)?.passenger?.outer || 'good'
                      : 'good'
                  }
                  passengerRotorCondition={
                    'passenger' in (data.front_brake_pads || {}) 
                      ? (data.front_brake_pads as any)?.passenger?.rotor_condition || 'good'
                      : (data.front_brake_pads as any)?.rotor_condition || 'good'
                  }
                  title="Front Brakes"
                  isRearAxle={false}
                  width={650}
                  height={350}
                />
              </Box>
              {renderImageGallery(data.front_brakes, 'Front Brake Photo')}
              
              {/* Front Brake Pads Photos */}
              {data.front_brake_pads_photos && data.front_brake_pads_photos.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Front Brake Pads Photos
                  </Typography>
                  {data.field_notes?.front_brake_pads_photos && (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
                      {data.field_notes.front_brake_pads_photos}
                    </Typography>
                  )}
                  {renderImageGallery(data.front_brake_pads_photos, 'Front Brake Pad Photo')}
                </Box>
              )}
            </Box>

            {/* Rear Brakes */}
            <Box sx={{ mb: 3 }}>
              {data.field_notes?.rear_brake_pads && (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
                  {data.field_notes.rear_brake_pads}
                </Typography>
              )}
              <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center', mb: 2 }}>
                <BrakePadFrontAxleView
                  driverInnerPad={
                    'driver' in (data.rear_brake_pads || {}) 
                      ? (data.rear_brake_pads as any)?.driver?.inner || 'good'
                      : 'good'
                  }
                  driverOuterPad={
                    'driver' in (data.rear_brake_pads || {}) 
                      ? (data.rear_brake_pads as any)?.driver?.outer || 'good'
                      : 'good'
                  }
                  driverRotorCondition={
                    'driver' in (data.rear_brake_pads || {}) 
                      ? (data.rear_brake_pads as any)?.driver?.rotor_condition || 'good'
                      : (data.rear_brake_pads as any)?.rotor_condition || 'good'
                  }
                  passengerInnerPad={
                    'passenger' in (data.rear_brake_pads || {}) 
                      ? (data.rear_brake_pads as any)?.passenger?.inner || 'good'
                      : 'good'
                  }
                  passengerOuterPad={
                    'passenger' in (data.rear_brake_pads || {}) 
                      ? (data.rear_brake_pads as any)?.passenger?.outer || 'good'
                      : 'good'
                  }
                  passengerRotorCondition={
                    'passenger' in (data.rear_brake_pads || {}) 
                      ? (data.rear_brake_pads as any)?.passenger?.rotor_condition || 'good'
                      : (data.rear_brake_pads as any)?.rotor_condition || 'good'
                  }
                  title="Rear Brakes"
                  isRearAxle={true}
                  width={650}
                  height={350}
                />
              </Box>
              
              {/* Rear Brake Photos - moved to be directly under SVG */}
              {renderImageGallery(data.rear_brakes, 'Rear Brake Photo')}
              
              {/* Rear Brake Pads Photos */}
              {data.rear_brake_pads_photos && data.rear_brake_pads_photos.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Rear Brake Pads Photos
                  </Typography>
                  {data.field_notes?.rear_brake_pads_photos && (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
                      {data.field_notes.rear_brake_pads_photos}
                    </Typography>
                  )}
                  {renderImageGallery(data.rear_brake_pads_photos, 'Rear Brake Pad Photo')}
                </Box>
              )}
            </Box>
          </Box>
          )}

          {/* Filters Section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" gutterBottom>
              Filters
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
              {renderChipField('Engine Air Filter', data.engine_air_filter, {
                'good': { label: '✅ Good', color: 'success' },
                'next_oil_change': { label: '⚠️ Next Oil Change', color: 'warning' },
                'highly_recommended': { label: '❌ Highly Recommended', color: 'warning' },
                'today': { label: '🚨 Today', color: 'error' },
                'animal_related': { label: '🐀 Animal Related', color: 'error' }
              }, data.field_notes?.engine_air_filter)}
            </Box>
            {data.field_notes?.engine_air_filter_photo && (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
                {data.field_notes.engine_air_filter_photo}
              </Typography>
            )}
            {renderImageGallery(data.engine_air_filter_photo, 'Engine Air Filter Photo')}
          </Box>

          {/* Tires Section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" gutterBottom>
              Tires
            </Typography>
            
            {/* Detailed Tire Inspections - Only for QuickCheck */}
            {data.inspection_type === 'quick_check' && (
              <>
                {/* Driver Front */}
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="h6" gutterBottom>
                      DRIVER FRONT
                    </Typography>
                {data.tire_dates?.driver_front && (
                  <Chip label={data.tire_dates.driver_front} color="info" variant="outlined" size="small" />
                )}
              </Box>
              {data.field_notes?.driver_front_tire_tread && (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 1 }}>
                  {data.field_notes.driver_front_tire_tread}
                </Typography>
              )}
              {renderTireTread('Driver Front', data.tire_tread.driver_front)}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {renderTireCommentChips(data.tire_comments?.driver_front || [])}
                </Box>
              </Box>
              {renderTirePhotos('driver_front')}
            </Box>

            {/* Passenger Front */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="h6" gutterBottom>
                  PASSENGER FRONT
                </Typography>
                {data.tire_dates?.passenger_front && (
                  <Chip label={data.tire_dates.passenger_front} color="info" variant="outlined" size="small" />
                )}
              </Box>
              {data.field_notes?.passenger_front_tire_tread && (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 1 }}>
                  {data.field_notes.passenger_front_tire_tread}
                </Typography>
              )}
              {renderTireTread('Passenger Front', data.tire_tread.passenger_front)}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {renderTireCommentChips(data.tire_comments?.passenger_front || [])}
                </Box>
              </Box>
              {renderTirePhotos('passenger_front')}
            </Box>

            {/* Driver Rear */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="h6" gutterBottom>
                  DRIVER REAR
                </Typography>
                {data.tire_dates?.driver_rear && (
                  <Chip label={data.tire_dates.driver_rear} color="info" variant="outlined" size="small" />
                )}
              </Box>
              {data.field_notes?.driver_rear_tire_tread && (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 1 }}>
                  {data.field_notes.driver_rear_tire_tread}
                </Typography>
              )}
              {renderTireTread('Driver Rear', data.tire_tread.driver_rear)}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {renderTireCommentChips(data.tire_comments?.driver_rear || [])}
                </Box>
              </Box>
              {renderTirePhotos('driver_rear')}
            </Box>

            {/* Driver Rear Inner */}
            {data.tire_tread && (data.tire_tread as any)['driver_rear_inner'] && (
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="h6" gutterBottom>
                    DRIVER REAR INNER
                  </Typography>
                  {(data.tire_dates as any)?.['driver_rear_inner'] && (
                    <Chip label={(data.tire_dates as any)['driver_rear_inner']} color="info" variant="outlined" size="small" />
                  )}
                </Box>
                {(data.field_notes as any)?.driver_rear_inner_tire_tread && (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 1 }}>
                    {(data.field_notes as any).driver_rear_inner_tire_tread}
                  </Typography>
                )}
                {renderTireTread('Driver Rear Inner', (data.tire_tread as any)['driver_rear_inner'])}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {renderTireCommentChips((data.tire_comments as any)?.['driver_rear_inner'] || [])}
                  </Box>
                </Box>
                {renderTirePhotos('driver_rear_inner')}
              </Box>
            )}

            {/* Passenger Rear */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="h6" gutterBottom>
                  PASSENGER REAR
                </Typography>
                {data.tire_dates?.passenger_rear && (
                  <Chip label={data.tire_dates.passenger_rear} color="info" variant="outlined" size="small" />
                )}
              </Box>
              {data.field_notes?.passenger_rear_tire_tread && (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 1 }}>
                  {data.field_notes.passenger_rear_tire_tread}
                </Typography>
              )}
              {renderTireTread('Passenger Rear', data.tire_tread.passenger_rear)}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {renderTireCommentChips(data.tire_comments?.passenger_rear || [])}
                </Box>
              </Box>
              {renderTirePhotos('passenger_rear')}
            </Box>

            {/* Passenger Rear Inner */}
            {data.tire_tread && (data.tire_tread as any)['passenger_rear_inner'] && (
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="h6" gutterBottom>
                    PASSENGER REAR INNER
                  </Typography>
                  {(data.tire_dates as any)?.['passenger_rear_inner'] && (
                    <Chip label={(data.tire_dates as any)['passenger_rear_inner']} color="info" variant="outlined" size="small" />
                  )}
                </Box>
                {(data.field_notes as any)?.passenger_rear_inner_tire_tread && (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 1 }}>
                    {(data.field_notes as any).passenger_rear_inner_tire_tread}
                  </Typography>
                )}
                {renderTireTread('Passenger Rear Inner', (data.tire_tread as any)['passenger_rear_inner'])}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {renderTireCommentChips((data.tire_comments as any)?.['passenger_rear_inner'] || [])}
                  </Box>
                </Box>
                {renderTirePhotos('passenger_rear_inner')}
              </Box>
            )}

            {/* Spare */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="h6" gutterBottom>
                  SPARE
                </Typography>
                {data.tire_dates?.spare && (
                  <Chip label={data.tire_dates.spare} color="info" variant="outlined" size="small" />
                )}
              </Box>
              {data.field_notes?.spare_tire_tread && (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 1 }}>
                  {data.field_notes.spare_tire_tread}
                </Typography>
              )}
              {renderTireTread('Spare', data.tire_tread.spare)}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {renderTireCommentChips(data.tire_comments?.spare || [])}
                </Box>
              </Box>
              {renderTirePhotos('spare')}
            </Box>
              </>
            )}

            {/* NoCheck tire info */}
            {data.inspection_type === 'no_check' && (
              <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="body2" color="text.secondary">
                  <strong>No Check Inspection:</strong> This inspection type includes basic tire service information (rotation, drain plug type, etc.) but does not include detailed tire tread measurements or individual tire photos.
                </Typography>
                {(data.tire_rotation || data.drain_plug_type || data.static_sticker) && (
                  <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {data.tire_rotation && <Chip label={`Rotation: ${data.tire_rotation}`} size="small" variant="outlined" />}
                    {data.drain_plug_type && <Chip label={`Drain Plug: ${data.drain_plug_type}`} size="small" variant="outlined" />}
                    {data.static_sticker && <Chip label={`Static Sticker: ${data.static_sticker}`} size="small" variant="outlined" />}
                  </Box>
                )}
              </Box>
            )}
          </Box>

          {/* Wipers Section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" gutterBottom>
              Wipers
            </Typography>
            
            {/* Windshield Condition */}
            <Box sx={{ mb: 3 }}>
              {renderChipField('Windshield Condition', data.windshield_condition, {
                'good': { label: '✅ Good', color: 'success' },
                'bad': { label: '❌ Bad', color: 'error' }
              }, data.field_notes?.windshield_condition)}
              {/* Windshield Condition Photos */}
              {data.windshield_condition_photos && data.windshield_condition_photos.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  {data.field_notes?.windshield_condition_photos && (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
                      {data.field_notes.windshield_condition_photos}
                    </Typography>
                  )}
                  {renderImageGallery(data.windshield_condition_photos, 'Windshield Condition Photo')}
                </Box>
              )}
            </Box>

            {/* Wiper Blades Front */}
            <Box sx={{ mb: 3 }}>
              {renderChipField('Wiper Blades Front', data.wiper_blades_front, {
                'good': { label: '✅ Good', color: 'success' },
                'minor': { label: '⚠️ Minor', color: 'warning' },
                'moderate': { label: '❌ Moderate', color: 'error' },
                'major': { label: '🚨 Major', color: 'error' }
              }, data.field_notes?.wiper_blades_front)}
            </Box>

            {/* Wiper Blades Rear */}
            <Box sx={{ mb: 3 }}>
              {renderChipField('Wiper Blades Rear', data.wiper_blades_rear, {
                'good': { label: '✅ Good', color: 'success' },
                'minor': { label: '⚠️ Minor', color: 'warning' },
                'moderate': { label: '❌ Moderate', color: 'error' },
                'major': { label: '🚨 Major', color: 'error' }
              }, data.field_notes?.wiper_blades_rear)}
              {/* Wiper Blades Photos - General (includes rear) */}
              {data.wiper_blades_photos && data.wiper_blades_photos.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  {data.field_notes?.wiper_blades_photos && (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
                      {data.field_notes.wiper_blades_photos}
                    </Typography>
                  )}
                  {renderImageGallery(data.wiper_blades_photos, 'Wiper Blade Photo')}
                </Box>
              )}
            </Box>

            {/* Washer Squirters */}
            <Box sx={{ mb: 3 }}>
              {renderChipField('Washer Squirters', data.washer_squirters, {
                'good': { label: '✅ Good', color: 'success' },
                'leaking': { label: '❌ Leaking', color: 'error' },
                'not_working': { label: '❌ Not Working', color: 'error' },
                'no_pump_sound': { label: '❌ Didn\'t Hear the Pump', color: 'error' }
              }, data.field_notes?.washer_squirters)}
              {/* Washer Squirters Photos */}
              {data.washer_squirters_photos && data.washer_squirters_photos.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  {data.field_notes?.washer_squirters_photos && (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
                      {data.field_notes.washer_squirters_photos}
                    </Typography>
                  )}
                  {renderImageGallery(data.washer_squirters_photos, 'Washer Squirter Photo')}
                </Box>
              )}
            </Box>

            {/* Washer Fluid */}
            <Box sx={{ mb: 3 }}>
              {renderChipField('Washer Fluid', data.washer_fluid, {
                'full': { label: '✅ Full', color: 'success' },
                'leaking': { label: '❌ Leaking', color: 'error' },
                'not_working': { label: '❌ Not Working', color: 'error' },
                'no_pump_sound': { label: '❌ No Pump Sound', color: 'error' }
              }, data.field_notes?.washer_fluid)}
              {/* Washer Fluid Photos */}
              {data.washer_fluid_photo && data.washer_fluid_photo.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  {data.field_notes?.washer_fluid_photo && (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
                      {data.field_notes.washer_fluid_photo}
                    </Typography>
                  )}
                  {renderImageGallery(data.washer_fluid_photo, 'Washer Fluid Photo')}
                </Box>
              )}
            </Box>

          </Box>










        </Paper>

        {/* Oil Type Selection Dialog */}
        <Dialog 
          open={showOilTypeDialog} 
          onClose={() => setShowOilTypeDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <OilIcon color="primary" />
              <Typography variant="h6">Select Oil Type</Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
              Select the oil type for the new oil change sticker. The sticker will be created using 
              VIN: {quickCheck?.data.vin} and Mileage: {quickCheck?.data.mileage}
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {oilTypes.map((oilType) => (
                <Card 
                  key={oilType.id}
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { boxShadow: 2 },
                    border: '1px solid',
                    borderColor: 'divider'
                  }}
                  onClick={() => handleOilTypeSelection(oilType.id)}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="h6" sx={{ color: 'primary.main' }}>
                        {oilType.name}
                      </Typography>
                      <OilIcon color="primary" />
                    </Box>
                    <Typography variant="body2" color="textSecondary">
                      {oilType.durationInDays} days / {oilType.mileageInterval.toLocaleString()} miles
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowOilTypeDialog(false)}>Cancel</Button>
          </DialogActions>
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
        
        {/* Archive Confirmation Dialog */}
        <Dialog
          open={confirmArchiveDialog}
          onClose={handleCancelArchive}
          maxWidth="xs"
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
              color="primary"
              variant="contained"
              disabled={archiving}
              startIcon={archiving ? <CircularProgress size={16} /> : <ArchiveIcon />}
            >
              {archiving ? 'Archiving...' : 'Archive'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Timing Information Dialog */}
        <Dialog
          open={timingDialogOpen}
          onClose={() => setTimingDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TimeIcon color="primary" />
              <Typography variant="h6">Timing Information</Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              {/* Tab Timings */}
              {data.tab_timings && (
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h6" gutterBottom>
                    Tab Durations
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                      {renderField('Info Duration (seconds)', data.tab_timings.info_duration, data.field_notes?.info_duration)}
                    </Box>
                    <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                      {renderField('Pulling Duration (seconds)', data.tab_timings.pulling_duration, data.field_notes?.pulling_duration)}
                    </Box>
                    <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                      {renderField('Underhood Duration (seconds)', data.tab_timings.underhood_duration, data.field_notes?.underhood_duration)}
                    </Box>
                    <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                      {renderField('Tires Duration (seconds)', data.tab_timings.tires_duration, data.field_notes?.tires_duration)}
                    </Box>
                  </Box>
                </Box>
              )}

              {/* Date Information */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom>
                  Date Information
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                    {renderField('Created Date', data.created_datetime ? new Date(data.created_datetime).toLocaleString() : '', data.field_notes?.created_datetime)}
                  </Box>
                  <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                    {renderField('Submitted Date', data.submitted_datetime ? new Date(data.submitted_datetime).toLocaleString() : '', data.field_notes?.submitted_datetime)}
                  </Box>
                  <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                    {renderField('Archived Date', data.archived_datetime ? new Date(data.archived_datetime).toLocaleString() : '', data.field_notes?.archived_datetime)}
                  </Box>
                  <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                    {renderField('Last Saved', data.lastSaved ? new Date(data.lastSaved).toLocaleString() : '', data.field_notes?.lastSaved)}
                  </Box>
                </Box>
              </Box>

              {/* User Information */}
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom>
                  User Information
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                    {renderField('Saved By', data.savedBy, data.field_notes?.savedBy)}
                  </Box>
                  <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                    {renderField('Submitted By', data.submitted_by, data.field_notes?.submitted_by)}
                  </Box>
                  <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                    {renderField('Submitted By Name', data.submitted_by_name, data.field_notes?.submitted_by_name)}
                  </Box>
                </Box>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setTimingDialogOpen(false)} color="primary">
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* Tire Repair Detail Popup */}
        <Dialog
          open={tireRepairDetailOpen}
          onClose={handleTireRepairDetailClose}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <InfoIcon color="primary" />
              <Typography variant="h6">Tire Repair Details for {selectedTirePosition?.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}</Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2 }}>
              {selectedTirePosition && data.tire_repair_images && (
                <>
                  {/* Tire Tread SVG */}
                  {data.tire_tread && (data.tire_tread as any)[selectedTirePosition] && (
                    <Box sx={{ mb: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Typography variant="h6">
                          Tire Tread
                        </Typography>
                        {data.tire_repair_statuses && data.tire_repair_statuses[selectedTirePosition as keyof typeof data.tire_repair_statuses] && (
                          <Chip
                            label={
                              data.tire_repair_statuses[selectedTirePosition as keyof typeof data.tire_repair_statuses] === 'repairable' ? '✅ Repairable' :
                              data.tire_repair_statuses[selectedTirePosition as keyof typeof data.tire_repair_statuses] === 'non_repairable' ? '❌ Non-Repairable' :
                              'Unknown'
                            }
                            color={
                              data.tire_repair_statuses[selectedTirePosition as keyof typeof data.tire_repair_statuses] === 'repairable' ? 'success' :
                              data.tire_repair_statuses[selectedTirePosition as keyof typeof data.tire_repair_statuses] === 'non_repairable' ? 'error' :
                              'default'
                            }
                            variant="filled"
                            size="small"
                            sx={{ fontWeight: 'bold' }}
                          />
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <TireTreadSideView
                          innerEdgeCondition={(data.tire_tread as any)[selectedTirePosition].inner_edge_condition}
                          innerCondition={(data.tire_tread as any)[selectedTirePosition].inner_condition}
                          centerCondition={(data.tire_tread as any)[selectedTirePosition].center_condition}
                          outerCondition={(data.tire_tread as any)[selectedTirePosition].outer_condition}
                          outerEdgeCondition={(data.tire_tread as any)[selectedTirePosition].outer_edge_condition}
                          innerEdgeDepth={parseInt((data.tire_tread as any)[selectedTirePosition].inner_edge_depth) || 0}
                          innerDepth={parseInt((data.tire_tread as any)[selectedTirePosition].inner_depth) || 0}
                          centerDepth={parseInt((data.tire_tread as any)[selectedTirePosition].center_depth) || 0}
                          outerDepth={parseInt((data.tire_tread as any)[selectedTirePosition].outer_depth) || 0}
                          outerEdgeDepth={parseInt((data.tire_tread as any)[selectedTirePosition].outer_edge_depth) || 0}
                          width={400}
                          height={160}
                        />
                      </Box>
                    </Box>
                  )}

                  {/* Tire Leak Images (not_repairable only) */}
                  {(() => {
                    const tireImages = data.tire_repair_images[selectedTirePosition as keyof typeof data.tire_repair_images];
                    if (tireImages?.not_repairable && tireImages.not_repairable.length > 0) {
                      return (
                        <Box sx={{ mb: 3 }}>
                          <Typography variant="h6" gutterBottom>
                            Tire Leak Images
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                            {(() => {
                              const imageData = tireImages.not_repairable.map((img: any, index: number) => ({
                                url: img.url,
                                title: `${selectedTirePosition?.replace('_', ' ')} tire leak ${index + 1}`
                              }));
                              
                              return tireImages.not_repairable.map((img: any, index: number) => (
                                <Card 
                                  key={index} 
                                  sx={{ 
                                    width: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(33.33% - 11px)' },
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s ease-in-out',
                                    '&:hover': {
                                      transform: 'scale(1.02)',
                                      boxShadow: 4
                                    }
                                  }}
                                  onClick={() => {
                                    const allImages = getAllImages();
                                    const targetIndex = findImageIndex(img.url, imageData, index);
                                    openSlideshow(allImages, targetIndex);
                                  }}
                                >
                                  <CardMedia
                                    component="img"
                                    height="200"
                                    image={getUploadUrl(img.url)}
                                    alt={`Tire leak photo ${index + 1}`}
                                    sx={{ objectFit: 'contain' }}
                                  />
                                </Card>
                              ));
                            })()}
                          </Box>
                        </Box>
                      );
                    }
                    return null;
                  })()}

                  {/* Tire Model/Size Images (tire_size_brand only) */}
                  {(() => {
                    const tireImages = data.tire_repair_images[selectedTirePosition as keyof typeof data.tire_repair_images];
                    if (tireImages?.tire_size_brand && tireImages.tire_size_brand.length > 0) {
                      return (
                        <Box sx={{ mb: 3 }}>
                          <Typography variant="h6" gutterBottom>
                            Tire Model/Size Images
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                            {(() => {
                              const imageData = tireImages.tire_size_brand.map((img: any, index: number) => ({
                                url: img.url,
                                title: `${selectedTirePosition?.replace('_', ' ')} tire model/size ${index + 1}`
                              }));
                              
                              return tireImages.tire_size_brand.map((img: any, index: number) => (
                                <Card 
                                  key={index} 
                                  sx={{ 
                                    width: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(33.33% - 11px)' },
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s ease-in-out',
                                    '&:hover': {
                                      transform: 'scale(1.02)',
                                      boxShadow: 4
                                    }
                                  }}
                                  onClick={() => {
                                    const allImages = getAllImages();
                                    const targetIndex = findImageIndex(img.url, imageData, index);
                                    openSlideshow(allImages, targetIndex);
                                  }}
                                >
                                  <CardMedia
                                    component="img"
                                    height="200"
                                    image={getUploadUrl(img.url)}
                                    alt={`Tire model/size photo ${index + 1}`}
                                    sx={{ objectFit: 'contain' }}
                                  />
                                </Card>
                              ));
                            })()}
                          </Box>
                        </Box>
                      );
                    }
                    return null;
                  })()}

                  {/* Repairable Spot Images (repairable_spot only) */}
                  {(() => {
                    const tireImages = data.tire_repair_images[selectedTirePosition as keyof typeof data.tire_repair_images];
                    if (tireImages?.repairable_spot && tireImages.repairable_spot.length > 0) {
                      return (
                        <Box sx={{ mb: 3 }}>
                          <Typography variant="h6" gutterBottom>
                            Repairable Spot Images
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                            {(() => {
                              const imageData = tireImages.repairable_spot.map((img: any, index: number) => ({
                                url: img.url,
                                title: `${selectedTirePosition?.replace('_', ' ')} repairable spot ${index + 1}`
                              }));
                              
                              return tireImages.repairable_spot.map((img: any, index: number) => (
                                <Card 
                                  key={index} 
                                  sx={{ 
                                    width: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(33.33% - 11px)' },
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s ease-in-out',
                                    '&:hover': {
                                      transform: 'scale(1.02)',
                                      boxShadow: 4
                                    }
                                  }}
                                  onClick={() => {
                                    const allImages = getAllImages();
                                    const targetIndex = findImageIndex(img.url, imageData, index);
                                    openSlideshow(allImages, targetIndex);
                                  }}
                                >
                                  <CardMedia
                                    component="img"
                                    height="200"
                                    image={getUploadUrl(img.url)}
                                    alt={`Repairable spot photo ${index + 1}`}
                                    sx={{ objectFit: 'contain' }}
                                  />
                                </Card>
                              ));
                            })()}
                          </Box>
                        </Box>
                      );
                    }
                    return null;
                  })()}
                </>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleTireRepairDetailClose} color="primary">
              Close
            </Button>
          </DialogActions>
        </Dialog>

                 {/* Tire Model/Size Image Full-View Dialog */}
         <Dialog
           open={tireModelFullViewOpen}
           onClose={handleTireModelFullViewClose}
           maxWidth="lg"
           fullWidth
         >
           <DialogTitle>
             <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
               <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                 <InfoIcon color="primary" />
                 <Typography variant="h6">Tire Model/Size Image</Typography>
               </Box>
               <IconButton onClick={handleTireModelFullViewClose}>
                 <CloseIcon />
               </IconButton>
             </Box>
           </DialogTitle>
           <DialogContent>
             <Box sx={{ mt: 2 }}>
               {/* Image Rotation Controls */}
               <Box sx={{ 
                 display: 'flex', 
                 flexDirection: { xs: 'column', sm: 'row' },
                 justifyContent: 'space-between', 
                 alignItems: 'center', 
                 mb: 3,
                 gap: 2
               }}>
                 <Button 
                   variant="outlined" 
                   onClick={handleRotationReset}
                   startIcon={<span>🔄</span>}
                 >
                   Reset Rotation
                 </Button>
                 <Box sx={{ 
                   display: 'flex', 
                   flexDirection: { xs: 'column', sm: 'row' },
                   alignItems: 'center', 
                   gap: 2, 
                   flex: 1,
                   minWidth: { xs: '100%', sm: '400px' },
                   maxWidth: { sm: '600px' }
                 }}>
                   <Typography variant="body2" sx={{ minWidth: '80px', textAlign: 'center' }}>
                     Rotation: {imageRotation}°
                   </Typography>
                   <Slider
                     value={imageRotation}
                     onChange={handleRotationChange}
                     aria-labelledby="rotation-slider"
                     step={1}
                     min={0}
                     max={359}
                     sx={{ 
                       flex: 1,
                       minWidth: { xs: '100%', sm: '300px' },
                       maxWidth: { sm: '500px' },
                       '& .MuiSlider-track': {
                         height: 6,
                       },
                       '& .MuiSlider-thumb': {
                         width: 20,
                         height: 20,
                       },
                       '& .MuiSlider-rail': {
                         height: 6,
                       }
                     }}
                   />
                 </Box>
               </Box>
               
               {/* Image Display */}
               <Box sx={{ 
                 display: 'flex', 
                 justifyContent: 'center',
                 alignItems: 'center',
                 minHeight: '400px',
                 bgcolor: 'grey.100',
                 borderRadius: 2,
                 p: 2
               }}>
                 {selectedTireModelImage && (
                   <img
                     src={getUploadUrl(selectedTireModelImage.url)}
                     alt="Tire Model/Size"
                     style={{ 
                       transform: `rotate(${imageRotation}deg)`,
                       maxWidth: '100%',
                       maxHeight: '500px',
                       objectFit: 'contain',
                       transition: 'transform 0.3s ease-in-out'
                     }}
                   />
                 )}
               </Box>
             </Box>
           </DialogContent>
         </Dialog>

        {/* Image Slideshow Dialog */}
        <Dialog
          open={slideshowOpen}
          onClose={closeSlideshow}
          maxWidth={false}
          fullWidth
          PaperProps={{
            sx: {
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
              margin: 1,
              maxHeight: 'calc(100vh - 16px)',
              maxWidth: 'calc(100vw - 16px)',
            }
          }}
          onKeyDown={(e) => {
            if (!isDragging) {
              if (e.key === 'ArrowLeft') prevImage();
              if (e.key === 'ArrowRight') nextImage();
            }
            if (e.key === 'Escape') closeSlideshow();
            if (e.key === 'c' || e.key === 'C') setShowSlideshowControls(!showSlideshowControls);
          }}
        >
          <DialogTitle sx={{ 
            color: 'white', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            pb: 1 
          }}>
            <Typography variant="h6">
              {slideshowImages[currentImageIndex]?.title || 'Image'} ({currentImageIndex + 1} of {slideshowImages.length})
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Tooltip title={showSlideshowControls ? "Hide Controls (C)" : "Show Controls (C)"}>
                <IconButton 
                  onClick={() => setShowSlideshowControls(!showSlideshowControls)} 
                  sx={{ 
                    color: 'white',
                    backgroundColor: showSlideshowControls ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.3)' }
                  }}
                >
                  {showSlideshowControls ? '🎛️' : '⚙️'}
                </IconButton>
              </Tooltip>
              <IconButton onClick={closeSlideshow} sx={{ color: 'white' }}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            minHeight: '60vh',
            position: 'relative',
            p: 0
          }}>
            {slideshowImages.length > 0 && (
              <>
                {/* Image Controls */}
                {showSlideshowControls && (
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    width: '100%',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)'
                  }}>
                    {/* Zoom Controls */}
                    <Box sx={{ 
                      display: 'flex', 
                      flexDirection: { xs: 'column', sm: 'row' },
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      width: '100%',
                      px: 2,
                      py: 1,
                      gap: 2
                    }}>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Button 
                          variant="outlined" 
                          onClick={handleZoomOut}
                          disabled={slideshowZoom <= 0.5}
                          sx={{ 
                            color: 'white', 
                            borderColor: 'rgba(255, 255, 255, 0.5)',
                            '&:hover': { borderColor: 'white' },
                            minWidth: '40px',
                            padding: '6px 8px'
                          }}
                        >
                          🔍-
                        </Button>
                        <Typography variant="body2" sx={{ color: 'white', minWidth: '80px', textAlign: 'center' }}>
                          Zoom: {Math.round(slideshowZoom * 100)}%
                        </Typography>
                        <Button 
                          variant="outlined" 
                          onClick={handleZoomIn}
                          disabled={slideshowZoom >= 5}
                          sx={{ 
                            color: 'white', 
                            borderColor: 'rgba(255, 255, 255, 0.5)',
                            '&:hover': { borderColor: 'white' },
                            minWidth: '40px',
                            padding: '6px 8px'
                          }}
                        >
                          🔍+
                        </Button>
                        <Button 
                          variant="outlined" 
                          onClick={handleZoomReset}
                          sx={{ 
                            color: 'white', 
                            borderColor: 'rgba(255, 255, 255, 0.5)',
                            '&:hover': { borderColor: 'white' },
                            fontSize: '0.75rem'
                          }}
                        >
                          Reset View
                        </Button>
                      </Box>
                      
                      <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center' }}>
                        {slideshowZoom > 1 ? 'Drag to pan • ' : ''}Mouse wheel to zoom
                      </Typography>
                    </Box>
                    
                    {/* Rotation Controls */}
                    <Box sx={{ 
                      display: 'flex', 
                      flexDirection: { xs: 'column', sm: 'row' },
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      width: '100%',
                      px: 2,
                      py: 1,
                      gap: 2,
                      borderTop: '1px solid rgba(255, 255, 255, 0.2)'
                    }}>
                      <Button 
                        variant="outlined" 
                        onClick={handleSlideshowRotationReset}
                        startIcon={<span>🔄</span>}
                        sx={{ 
                          color: 'white', 
                          borderColor: 'rgba(255, 255, 255, 0.5)',
                          '&:hover': { borderColor: 'white' }
                        }}
                      >
                        Reset Rotation
                      </Button>
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: { xs: 'column', sm: 'row' },
                        alignItems: 'center', 
                        gap: 2, 
                        flex: 1,
                        minWidth: { xs: '100%', sm: '300px' },
                        maxWidth: { sm: '500px' }
                      }}>
                        <Typography variant="body2" sx={{ color: 'white', minWidth: '80px', textAlign: 'center' }}>
                          Rotation: {slideshowRotation}°
                        </Typography>
                        <Slider
                          value={slideshowRotation}
                          onChange={handleSlideshowRotationChange}
                          aria-labelledby="slideshow-rotation-slider"
                          step={1}
                          min={0}
                          max={359}
                          sx={{ 
                            flex: 1,
                            minWidth: { xs: '100%', sm: '200px' },
                            maxWidth: { sm: '400px' },
                            color: 'white',
                            '& .MuiSlider-track': {
                              height: 6,
                              color: 'white'
                            },
                            '& .MuiSlider-thumb': {
                              width: 20,
                              height: 20,
                              color: 'white'
                            },
                            '& .MuiSlider-rail': {
                              height: 6,
                              color: 'rgba(255, 255, 255, 0.3)'
                            }
                          }}
                        />
                      </Box>
                    </Box>
                  </Box>
                )}

                {/* Controls Hidden Hint */}
                {!showSlideshowControls && (
                  <Box sx={{ 
                    width: '100%',
                    py: 0.5,
                    px: 2,
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', textAlign: 'center', display: 'block' }}>
                      Mouse wheel to zoom • {slideshowZoom > 1 ? 'Drag to pan • ' : ''}Press 'C' to show controls
                    </Typography>
                  </Box>
                )}

                {/* Main Image */}
                <Box 
                  sx={{ 
                    display: 'flex', 
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '100%',
                    height: showSlideshowControls ? '50vh' : '65vh',
                    position: 'relative',
                    overflow: 'hidden',
                    cursor: slideshowZoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
                  }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onWheel={handleWheel}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  <img
                    src={getUploadUrl(slideshowImages[currentImageIndex]?.url)}
                    alt={slideshowImages[currentImageIndex]?.title}
                    style={{ 
                      maxWidth: slideshowZoom === 1 ? '100%' : 'none',
                      maxHeight: slideshowZoom === 1 ? '100%' : 'none',
                      width: slideshowZoom > 1 ? `${slideshowZoom * 100}%` : 'auto',
                      height: slideshowZoom > 1 ? `${slideshowZoom * 100}%` : 'auto',
                      objectFit: 'contain',
                      transform: `rotate(${slideshowRotation}deg) translate(${slideshowPan.x}px, ${slideshowPan.y}px)`,
                      transition: isDragging ? 'none' : 'transform 0.3s ease-in-out',
                      userSelect: 'none',
                      pointerEvents: 'none'
                    }}
                    draggable={false}
                  />
                  
                  {/* Navigation Arrows */}
                  {slideshowImages.length > 1 && (
                    <>
                      <IconButton
                        onClick={prevImage}
                        sx={{
                          position: 'absolute',
                          left: 16,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          backgroundColor: 'rgba(255, 255, 255, 0.2)',
                          color: 'white',
                          '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.3)',
                          },
                          fontSize: '2rem'
                        }}
                      >
                        ←
                      </IconButton>
                      <IconButton
                        onClick={nextImage}
                        sx={{
                          position: 'absolute',
                          right: 16,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          backgroundColor: 'rgba(255, 255, 255, 0.2)',
                          color: 'white',
                          '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.3)',
                          },
                          fontSize: '2rem'
                        }}
                      >
                        →
                      </IconButton>
                    </>
                  )}
                </Box>

                {/* Thumbnail Strip */}
                {slideshowImages.length > 1 && (
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'center',
                    gap: 1,
                    mt: 2,
                    px: 2,
                    overflowX: 'auto',
                    maxWidth: '100%',
                    pb: 1
                  }}>
                    {slideshowImages.map((img, index) => (
                      <Box
                        key={index}
                        onClick={() => goToImage(index)}
                        sx={{
                          cursor: 'pointer',
                          border: index === currentImageIndex ? '2px solid white' : '2px solid transparent',
                          borderRadius: 1,
                          flexShrink: 0,
                          opacity: index === currentImageIndex ? 1 : 0.6,
                          transition: 'opacity 0.2s ease-in-out',
                          '&:hover': {
                            opacity: 1
                          }
                        }}
                      >
                        <img
                          src={getUploadUrl(img.url)}
                          alt={img.title}
                          style={{
                            width: '60px',
                            height: '60px',
                            objectFit: 'cover',
                            borderRadius: '4px'
                          }}
                        />
                      </Box>
                    ))}
                  </Box>
                )}
              </>
            )}
          </DialogContent>
        </Dialog>
      </Box>
    </Container>
  );
};

export default QuickCheckDetail; 