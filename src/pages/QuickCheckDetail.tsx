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
import api, { QuickCheckData, decodeVinCached, archiveQuickCheck, getUploadUrl } from '../services/api';
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

  useEffect(() => {
    const fetchQuickCheck = async () => {
      try {
        const response = await api.quickChecks.getById(Number(id));
        console.log('Fetched quick check data:', response);
        console.log('Quick check data structure:', response.data);
        console.log('Tire repair images data:', response.data.tire_repair_images);
        console.log('Tire repair status:', response.data.tire_repair_status);
        
        // Simple debug: Log what we got vs what we expect
        if (response.data.tire_repair_images) {
          console.log('✅ TIRE REPAIR IMAGES FOUND!');
          console.log('Number of positions:', Object.keys(response.data.tire_repair_images).length);
          
          // Type-safe iteration over known tire positions
          const tirePositions = ['driver_front', 'passenger_front', 'driver_rear_outer', 'driver_rear_inner', 'passenger_rear_inner', 'passenger_rear_outer', 'spare'] as const;
          tirePositions.forEach(position => {
            const images = response.data.tire_repair_images?.[position];
            if (images) {
              console.log(`Position ${position}:`, {
                not_repairable: images.not_repairable?.length || 0,
                tire_size_brand: images.tire_size_brand?.length || 0,
                repairable_spot: images.repairable_spot?.length || 0
              });
            }
          });
        } else {
          console.log('❌ NO TIRE REPAIR IMAGES IN RESPONSE');
          console.log('Available data keys:', Object.keys(response.data));
        }
        
        setQuickCheck(response);
        setLoading(false);
        
        // Decode VIN if available
        if (response.data.vin && response.data.vin.length === 17) {
          setVinDecodeLoading(true);
          try {
            const vehicleData = await decodeVinCached(response.data.vin);
            setVehicleDetails(vehicleData);
            setVinDecodeError(null);
          } catch (err) {
            console.error('VIN decode error:', err);
            setVinDecodeError('Failed to decode VIN');
            setVehicleDetails(null);
          } finally {
            setVinDecodeLoading(false);
          }
        }
      } catch (err) {
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
    if (!quickCheck) return;
    
    try {
      setArchiving(true);
      await archiveQuickCheck(quickCheck.id);
      setConfirmArchiveDialog(false);
      // Navigate back to the home page or previous page after successful archive
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to archive quick check');
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

  const renderImageGallery = (photos: { url: string }[]) => {
    if (!photos || photos.length === 0) return null;

    return (
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2, mt: 2 }}>
        {photos.map((photo, index) => (
          <Box key={index}>
            <Card>
              <CardMedia
                component="img"
                height="200"
                image={getUploadUrl(photo.url)}
                alt={`Photo ${index + 1}`}
                sx={{ objectFit: 'cover' }}
              />
            </Card>
          </Box>
        ))}
      </Box>
    );
  };

  const renderField = (label: string, value: any) => {
    if (value === undefined || value === null || value === '') return null;
    return (
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="body1">
          {value}
        </Typography>
      </Box>
    );
  };

  const renderChipField = (label: string, value: any, chipConfig: { [key: string]: { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'default' } }) => {
    if (value === undefined || value === null || value === '') return null;
    
    // Handle array values (like battery_condition)
    if (Array.isArray(value)) {
      if (value.length === 0) return null;
      return (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ minWidth: '120px' }}>
              {label}
            </Typography>
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
      return renderField(label, value);
    }
    
    return (
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ minWidth: '120px' }}>
            {label}
          </Typography>
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
          <Card key={`${tirePosition}-${category}-${index}`} sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(33.33% - 11px)' } }}>
            <CardMedia
              component="img"
              height="200"
              image={getUploadUrl(imageUrl)}
              alt={`${tirePosition} ${category} photo ${index + 1}`}
              sx={{ objectFit: 'cover' }}
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
            <Card key={index} sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(33.33% - 11px)' } }}>
              <CardMedia
                component="img"
                height="200"
                image={getUploadUrl(imageUrl)}
                alt={`${tireType} photo ${index + 1}`}
                sx={{ objectFit: 'cover' }}
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
      <Box sx={{ py: 4 }}>
        {/* Header Section */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box sx={{ display: 'flex', flex: 1 }}>
            <Typography variant="h4" gutterBottom>
              {formatInspectionType(data.inspection_type)}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body1" color="text.secondary">
                {quickCheck.user_name}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TimeIcon color="action" />
              <Typography variant="body2" color="text.secondary">
                {new Date(quickCheck.created_at).toLocaleString()}
              </Typography>
            </Box>
            
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
            {renderImageGallery(data.dash_lights_photos)}
          </Box>

          {/* Mileage Photos */}
          {data.mileage_photos && data.mileage_photos.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                Mileage Photos
              </Typography>
              {renderImageGallery(data.mileage_photos)}
            </Box>
          )}

          {/* VIN Photos */}
          {data.vin_photos && data.vin_photos.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                VIN Photos
              </Typography>
              {renderImageGallery(data.vin_photos)}
            </Box>
          )}

          {/* TPMS Placard */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              TPMS Placard
            </Typography>
            {renderImageGallery(data.tpms_placard)}
          </Box>

          {/* Notes Section */}
          {data.notes && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                Notes
              </Typography>
              <Typography variant="body1">
                {data.notes}
              </Typography>
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
              })}
            </Box>

            {/* State Inspection Month */}
            {data.state_inspection_month && (
              <Box sx={{ mb: 3 }}>
                {renderField('State Inspection Month', data.state_inspection_month)}
              </Box>
            )}

            {/* State Inspection Date Code */}
            {data.state_inspection_date_code && (
              <Box sx={{ mb: 3 }}>
                {renderField('State Inspection Date Code', data.state_inspection_date_code)}
              </Box>
            )}

            {/* State Inspection Status Photos */}
            {data.state_inspection_status_photos && data.state_inspection_status_photos.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  State Inspection Status Photos
                </Typography>
                {renderImageGallery(data.state_inspection_status_photos)}
              </Box>
            )}

            {/* State Inspection Date Code Photos */}
            {data.state_inspection_date_code_photos && data.state_inspection_date_code_photos.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  State Inspection Date Code Photos
                </Typography>
                {renderImageGallery(data.state_inspection_date_code_photos)}
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
                    {renderImageGallery(data.tire_repair_status_photos)}
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
                  onTPMSStatusChange={() => {}} // Read-only in details view
                  showDually={!!(data.tpms_statuses.driver_rear_inner || data.tpms_statuses.passenger_rear_inner)}
                  onDuallyToggle={() => {}} // No-op for read-only view
                />
                {/* TPMS Tool Photos */}
                {data.tpms_tool_photo && data.tpms_tool_photo.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      TPMS Tool Photos
                    </Typography>
                    {renderImageGallery(data.tpms_tool_photo)}
                  </Box>
                )}
              </Box>
            )}

            {/* Tire Rotation */}
            <Box sx={{ mb: 3 }}>
              {renderChipField('Tire Rotation', data.tire_rotation, {
                'good': { label: '✅ Good', color: 'success' },
                'bad': { label: '🔄 Recommend Tire Rotation', color: 'warning' }
              })}
            </Box>

            {/* Static Sticker with oil type selection */}
            <Box sx={{ mb: 3 }}>
              {data.static_sticker && (
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ minWidth: '120px' }}>
                      Static Sticker
                    </Typography>
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
              })}
            </Box>

            {/* Undercarriage Photos */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Undercarriage Photos
              </Typography>
              {data.undercarriage_photos && data.undercarriage_photos.length > 0 ? (
                renderImageGallery(data.undercarriage_photos)
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
              })}
            </Box>

            {/* Battery Condition Main */}
            {data.battery_condition_main && (
              <Box sx={{ mb: 3 }}>
                {renderChipField('Battery Condition Main', data.battery_condition_main, {
                  'good': { label: '✅ Good', color: 'success' },
                  'warning': { label: '⚠️ Warning', color: 'warning' },
                  'bad': { label: '❌ Bad', color: 'error' },
                  'na': { label: 'N/A', color: 'default' }
                })}
              </Box>
            )}

            {/* Battery Terminals */}
            {data.battery_terminals && data.battery_terminals.length > 0 && (
              <Box sx={{ mb: 3 }}>
                {renderChipField('Battery Terminals', data.battery_terminals, {
                  'terminal_cleaning': { label: '🔧 Terminal Cleaning', color: 'info' },
                  'terminal_damaged': { label: '❌ Terminal Damaged', color: 'error' }
                })}
              </Box>
            )}

            {/* Battery Terminal Damage Location */}
            {data.battery_terminal_damage_location && data.battery_terminal_damage_location.length > 0 && (
              <Box sx={{ mb: 3 }}>
                {renderChipField('Battery Terminal Damage Location', data.battery_terminal_damage_location, {
                  'positive': { label: '➕ Positive', color: 'error' },
                  'negative': { label: '➖ Negative', color: 'error' }
                })}
              </Box>
            )}

            {/* Battery Date Code */}
            {data.battery_date_code && (
              <Box sx={{ mb: 3 }}>
                {renderField('Battery Date Code', data.battery_date_code)}
              </Box>
            )}

            {/* Battery Date Code Photos */}
            {data.battery_date_code_photos && data.battery_date_code_photos.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Battery Date Code Photos
                </Typography>
                {renderImageGallery(data.battery_date_code_photos)}
              </Box>
            )}

            {renderImageGallery(data.battery_photos)}
          </Box>

          {/* Brakes Section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" gutterBottom>
              Brakes
            </Typography>
            
            {/* Front Brakes */}
            <Box sx={{ mb: 3 }}>
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
              {renderImageGallery(data.front_brakes)}
              
              {/* Front Brake Pads Photos */}
              {data.front_brake_pads_photos && data.front_brake_pads_photos.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Front Brake Pads Photos
                  </Typography>
                  {renderImageGallery(data.front_brake_pads_photos)}
                </Box>
              )}
            </Box>

            {/* Rear Brakes */}
            <Box sx={{ mb: 3 }}>
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
              {renderImageGallery(data.rear_brakes)}
              
              {/* Rear Brake Pads Photos */}
              {data.rear_brake_pads_photos && data.rear_brake_pads_photos.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Rear Brake Pads Photos
                  </Typography>
                  {renderImageGallery(data.rear_brake_pads_photos)}
                </Box>
              )}
            </Box>
          </Box>

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
              })}
            </Box>
            {renderImageGallery(data.engine_air_filter_photo)}
          </Box>

          {/* Tires Section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" gutterBottom>
              Tires
            </Typography>
            
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
              {renderTireTread('Spare', data.tire_tread.spare)}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {renderTireCommentChips(data.tire_comments?.spare || [])}
                </Box>
              </Box>
              {renderTirePhotos('spare')}
            </Box>
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
              })}
              {/* Windshield Condition Photos */}
              {data.windshield_condition_photos && data.windshield_condition_photos.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  {renderImageGallery(data.windshield_condition_photos)}
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
              })}
            </Box>

            {/* Wiper Blades Rear */}
            <Box sx={{ mb: 3 }}>
              {renderChipField('Wiper Blades Rear', data.wiper_blades_rear, {
                'good': { label: '✅ Good', color: 'success' },
                'minor': { label: '⚠️ Minor', color: 'warning' },
                'moderate': { label: '❌ Moderate', color: 'error' },
                'major': { label: '🚨 Major', color: 'error' }
              })}
              {/* Wiper Blades Photos - General (includes rear) */}
              {data.wiper_blades_photos && data.wiper_blades_photos.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  {renderImageGallery(data.wiper_blades_photos)}
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
              })}
              {/* Washer Squirters Photos */}
              {data.washer_squirters_photos && data.washer_squirters_photos.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  {renderImageGallery(data.washer_squirters_photos)}
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
              })}
              {/* Washer Fluid Photos */}
              {data.washer_fluid_photo && data.washer_fluid_photo.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  {renderImageGallery(data.washer_fluid_photo)}
                </Box>
              )}
            </Box>

          </Box>



          {/* TPMS Type Photos */}
          {data.tpms_type_photos && data.tpms_type_photos.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                TPMS Type Photos
              </Typography>
              {renderImageGallery(data.tpms_type_photos)}
            </Box>
          )}



          {/* Field Notes */}
          {data.field_notes && Object.keys(data.field_notes).length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h5" gutterBottom>
                Field Notes
              </Typography>
              {Object.entries(data.field_notes).map(([field, note]) => (
                <Box key={field} sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {field.replace('_', ' ').toUpperCase()}
                  </Typography>
                  <Typography variant="body1">
                    {note}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}


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
                      {renderField('Info Duration (seconds)', data.tab_timings.info_duration)}
                    </Box>
                    <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                      {renderField('Pulling Duration (seconds)', data.tab_timings.pulling_duration)}
                    </Box>
                    <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                      {renderField('Underhood Duration (seconds)', data.tab_timings.underhood_duration)}
                    </Box>
                    <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                      {renderField('Tires Duration (seconds)', data.tab_timings.tires_duration)}
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
                    {renderField('Created Date', data.created_datetime ? new Date(data.created_datetime).toLocaleString() : '')}
                  </Box>
                  <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                    {renderField('Submitted Date', data.submitted_datetime ? new Date(data.submitted_datetime).toLocaleString() : '')}
                  </Box>
                  <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                    {renderField('Archived Date', data.archived_datetime ? new Date(data.archived_datetime).toLocaleString() : '')}
                  </Box>
                  <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                    {renderField('Last Saved', data.lastSaved ? new Date(data.lastSaved).toLocaleString() : '')}
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
                    {renderField('Saved By', data.savedBy)}
                  </Box>
                  <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                    {renderField('Submitted By', data.submitted_by)}
                  </Box>
                  <Box sx={{ minWidth: '200px', flex: '1 1 200px' }}>
                    {renderField('Submitted By Name', data.submitted_by_name)}
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
              <Typography variant="h6">Tire Repair Details for {selectedTirePosition?.replace('_', ' ').toUpperCase()}</Typography>
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

                                     {/* Tire Leak Images */}
                   {(() => {
                     const tireImages = data.tire_repair_images[selectedTirePosition as keyof typeof data.tire_repair_images];
                     if (tireImages?.not_repairable && tireImages.not_repairable.length > 0) {
                       return (
                         <Box sx={{ mb: 3 }}>
                           <Typography variant="h6" gutterBottom>
                             Tire Leak Images
                           </Typography>
                           {renderTireRepairImages(selectedTirePosition, tireImages)}
                         </Box>
                       );
                     }
                     return null;
                   })()}

                                     {/* Tire Model/Size Images */}
                   {(() => {
                     const tireImages = data.tire_repair_images[selectedTirePosition as keyof typeof data.tire_repair_images];
                     if (tireImages?.tire_size_brand && tireImages.tire_size_brand.length > 0) {
                       return (
                         <Box sx={{ mb: 3 }}>
                           <Typography variant="h6" gutterBottom>
                             Tire Model/Size Images
                           </Typography>
                           <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                             {tireImages.tire_size_brand.map((img: any, index: number) => (
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
                                 onClick={() => handleTireModelImageClick(img)}
                               >
                                 <CardMedia
                                   component="img"
                                   height="200"
                                   image={getUploadUrl(img.url)}
                                   alt={`Tire model/size photo ${index + 1}`}
                                   sx={{ objectFit: 'cover' }}
                                 />
                               </Card>
                             ))}
                           </Box>
                         </Box>
                       );
                     }
                     return null;
                   })()}

                                     {/* Repairable Spot Images */}
                   {(() => {
                     const tireImages = data.tire_repair_images[selectedTirePosition as keyof typeof data.tire_repair_images];
                     if (tireImages?.repairable_spot && tireImages.repairable_spot.length > 0) {
                       return (
                         <Box sx={{ mb: 3 }}>
                           <Typography variant="h6" gutterBottom>
                             Repairable Spot Images
                           </Typography>
                           <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                             {tireImages.repairable_spot.map((img: any, index: number) => (
                               <Card key={index} sx={{ width: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(33.33% - 11px)' } }}>
                                 <CardMedia
                                   component="img"
                                   height="200"
                                   image={getUploadUrl(img.url)}
                                   alt={`Repairable spot photo ${index + 1}`}
                                   sx={{ objectFit: 'cover' }}
                                 />
                               </Card>
                             ))}
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
      </Box>
    </Container>
  );
};

export default QuickCheckDetail; 