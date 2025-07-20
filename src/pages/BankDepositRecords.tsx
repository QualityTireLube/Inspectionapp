import React, { useState, useEffect, useMemo } from 'react';
import {
  Container,
  Typography,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  Menu,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Avatar,
  Divider,
  InputAdornment,
  Alert,
  CircularProgress,
  Paper,
  Fab,
} from '@mui/material';
import Grid from '../components/CustomGrid';
import {
  FilterList as FilterIcon,
  MoreVert as MoreVertIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  AttachMoney as CashIcon,
  RequestPage as CheckIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  PhotoLibrary as PhotoIcon,
  Add as AddIcon,
  Close as CloseIcon,
  AccountBalance as BankIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  ZoomIn as ZoomInIcon,
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { BankDeposit, CashManagementFilters } from '../types/cashManagement';
import { getBankDeposits, deleteBankDeposit } from '../services/cashManagementApi';
import { useCashManagementStore } from '../stores/cashManagementStore';
import { useNavigate } from 'react-router-dom';
import ImageUploadField from '../components/CashManagement/ImageUploadField';

interface BankDepositFilters {
  search: string;
  startDate: string;
  endDate: string;
  userId: string;
  minAmount: string;
  maxAmount: string;
}

interface OrganizedImages {
  cashDepositSlip: string[];
  checkDepositSlip: string[];
  individualCheckImages: string[];
  smsPaymentTypes: string[];
  unorganized: string[];
}

const BankDepositRecords: React.FC = () => {
  const navigate = useNavigate();
  const { bankDeposits, setBankDeposits } = useCashManagementStore();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDeposit, setSelectedDeposit] = useState<BankDeposit | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [depositToDelete, setDepositToDelete] = useState<BankDeposit | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuDeposit, setMenuDeposit] = useState<BankDeposit | null>(null);
  
  // Image slideshow states
  const [slideshowOpen, setSlideshowOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [slideshowImages, setSlideshowImages] = useState<{url: string, label: string}[]>([]);
  
  const [filters, setFilters] = useState<BankDepositFilters>({
    search: '',
    startDate: '',
    endDate: '',
    userId: '',
    minAmount: '',
    maxAmount: '',
  });

  const [filtersOpen, setFiltersOpen] = useState(false);

  // Organize images by estimated field types based on form structure
  const organizeImages = (images: string[]): OrganizedImages => {
    // Since images are currently flattened, we'll make educated guesses
    // based on typical upload patterns and image names
    const organized: OrganizedImages = {
      cashDepositSlip: [],
      checkDepositSlip: [],
      individualCheckImages: [],
      smsPaymentTypes: [],
      unorganized: [],
    };

    if (!images || images.length === 0) {
      return organized;
    }

    // Simple heuristic based on form submission order:
    // 1st image: likely cash deposit slip
    // 2nd image: likely check deposit slip  
    // 3rd+ images: likely individual checks
    // Last image (if 4+ total): might be SMS payment types

    if (images.length >= 1) {
      organized.cashDepositSlip.push(images[0]);
    }
    
    if (images.length >= 2) {
      organized.checkDepositSlip.push(images[1]);
    }
    
    if (images.length >= 3) {
      const remainingImages = images.slice(2);
      
      // If only one remaining image and total is exactly 3, might be SMS
      if (remainingImages.length === 1) {
        organized.smsPaymentTypes.push(remainingImages[0]);
      } else {
        // Multiple remaining images - treat as individual checks except possibly the last one
        if (remainingImages.length > 2) {
          organized.individualCheckImages.push(...remainingImages.slice(0, -1));
          organized.smsPaymentTypes.push(remainingImages[remainingImages.length - 1]);
        } else {
          organized.individualCheckImages.push(...remainingImages);
        }
      }
    }

    return organized;
  };

  // Create labeled images array with field names
  const createLabeledImages = (images: string[]) => {
    const organized = organizeImages(images);
    const labeledImages: {url: string, label: string}[] = [];

    // Add cash deposit slip images
    organized.cashDepositSlip.forEach((filename, index) => {
      labeledImages.push({
        url: getImageUrl(filename),
        label: 'Cash Deposit Slip'
      });
    });

    // Add check deposit slip images
    organized.checkDepositSlip.forEach((filename, index) => {
      labeledImages.push({
        url: getImageUrl(filename),
        label: 'Check Deposit Slip'
      });
    });

    // Add individual check images
    organized.individualCheckImages.forEach((filename, index) => {
      labeledImages.push({
        url: getImageUrl(filename),
        label: `Individual Check ${index + 1}`
      });
    });

    // Add SMS payment type images
    organized.smsPaymentTypes.forEach((filename, index) => {
      labeledImages.push({
        url: getImageUrl(filename),
        label: 'SMS Payment Types'
      });
    });

    return labeledImages;
  };

  // Fetch bank deposits
  const fetchDeposits = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const apiFilters: CashManagementFilters = {
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        userId: filters.userId || undefined,
      };
      
      const deposits = await getBankDeposits(apiFilters);
      setBankDeposits(deposits);
    } catch (err) {
      console.error('Error fetching bank deposits:', err);
      setError('Failed to load bank deposits');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeposits();
  }, [filters.startDate, filters.endDate, filters.userId]);

  // Filter deposits based on local filters
  const filteredDeposits = useMemo(() => {
    let filtered = [...bankDeposits];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(deposit =>
        deposit.userName.toLowerCase().includes(searchLower) ||
        deposit.notes.toLowerCase().includes(searchLower) ||
        deposit.userId.toLowerCase().includes(searchLower)
      );
    }

    // Amount filters
    if (filters.minAmount) {
      const minAmount = parseFloat(filters.minAmount);
      filtered = filtered.filter(deposit => 
        (deposit.totalCash + deposit.totalChecks) >= minAmount
      );
    }

    if (filters.maxAmount) {
      const maxAmount = parseFloat(filters.maxAmount);
      filtered = filtered.filter(deposit => 
        (deposit.totalCash + deposit.totalChecks) <= maxAmount
      );
    }

    return filtered.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [bankDeposits, filters]);

  // Get unique users for filter dropdown
  const uniqueUsers = useMemo(() => {
    const users = Array.from(new Set(bankDeposits.map(d => d.userName))).sort();
    return users;
  }, [bankDeposits]);

  const handleFilterChange = (key: keyof BankDepositFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      startDate: '',
      endDate: '',
      userId: '',
      minAmount: '',
      maxAmount: '',
    });
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, deposit: BankDeposit) => {
    setAnchorEl(event.currentTarget);
    setMenuDeposit(deposit);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuDeposit(null);
  };

  const handleView = (deposit: BankDeposit) => {
    setSelectedDeposit(deposit);
    setViewDialogOpen(true);
    handleMenuClose();
  };

  const handleDelete = (deposit: BankDeposit) => {
    setDepositToDelete(deposit);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const confirmDelete = async () => {
    if (!depositToDelete?.id) return;

    try {
      await deleteBankDeposit(depositToDelete.id);
      setBankDeposits(bankDeposits.filter(d => d.id !== depositToDelete.id));
      setDeleteDialogOpen(false);
      setDepositToDelete(null);
    } catch (err) {
      console.error('Error deleting deposit:', err);
      setError('Failed to delete deposit');
    }
  };

  const getImageUrl = (filename: string) => {
    const baseUrl = import.meta.env.VITE_UPLOAD_URL || 
      `${window.location.protocol === 'https:' ? 'https' : 'http'}://${window.location.hostname}:5001/uploads`;
    return `${baseUrl}/${filename}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getTotalAmount = (deposit: BankDeposit) => {
    return deposit.totalCash + deposit.totalChecks;
  };

  const handleImageClick = (imageUrl: string, fieldLabel: string, allFieldImages: {url: string, label: string}[]) => {
    if (!imageUrl || !allFieldImages || !Array.isArray(allFieldImages)) {
      console.error('Invalid parameters passed to handleImageClick');
      return;
    }
    
    const imageIndex = allFieldImages.findIndex(img => img.url === imageUrl);
    if (imageIndex === -1) {
      console.error('Image not found in allFieldImages');
      return;
    }
    
    setSlideshowImages(allFieldImages);
    setCurrentImageIndex(imageIndex);
    setSlideshowOpen(true);
  };

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? slideshowImages.length - 1 : prev - 1
    );
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => 
      prev === slideshowImages.length - 1 ? 0 : prev + 1
    );
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <BankIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
          <Box>
            <Typography variant="h4" component="h1">
              Bank Deposits
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {filteredDeposits.length} deposits found
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton onClick={() => setFiltersOpen(!filtersOpen)} color="primary">
            <FilterIcon />
          </IconButton>
          <IconButton onClick={fetchDeposits} disabled={loading}>
            <RefreshIcon />
          </IconButton>
          <Fab 
            color="primary" 
            aria-label="add"
            onClick={() => navigate('/bank-deposit')}
            sx={{ ml: 2 }}
          >
            <AddIcon />
          </Fab>
        </Box>
      </Box>

      {/* Filters */}
      {filtersOpen && (
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Filters
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Search"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                placeholder="Search by user, notes..."
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                label="End Date"
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>User</InputLabel>
                <Select
                  value={filters.userId}
                  onChange={(e) => handleFilterChange('userId', e.target.value)}
                  label="User"
                >
                  <MenuItem value="">All Users</MenuItem>
                  {uniqueUsers.map(user => (
                    <MenuItem key={user} value={user}>{user}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={1.5}>
              <TextField
                fullWidth
                label="Min Amount"
                type="number"
                value={filters.minAmount}
                onChange={(e) => handleFilterChange('minAmount', e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={1.5}>
              <TextField
                fullWidth
                label="Max Amount"
                type="number"
                value={filters.maxAmount}
                onChange={(e) => handleFilterChange('maxAmount', e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
              />
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={clearFilters} variant="outlined">
              Clear All
            </Button>
          </Box>
        </Paper>
      )}

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Loading */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Deposit Records - Vertical Rows */}
      {!loading && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filteredDeposits.map((deposit) => {
            const organizedImages = organizeImages(deposit.images || []);
            const hasImages = deposit.images && deposit.images.length > 0;
            
            return (
              <Card 
                key={deposit.id}
                elevation={2}
                sx={{ 
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 4,
                  }
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Grid container spacing={3}>
                    {/* Main Info */}
                    <Grid item xs={12}>
                      {/* Header with menu */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40, mr: 2 }}>
                            <BankIcon />
                          </Avatar>
                          <Box>
                            <Typography variant="h6" fontWeight="bold">
                              {formatCurrency(getTotalAmount(deposit))}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Deposit #{deposit.id}
                            </Typography>
                          </Box>
                        </Box>
                        <IconButton 
                          onClick={(e) => handleMenuOpen(e, deposit)}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </Box>

                      {/* Amount breakdown */}
                      <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid item xs={6}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <CashIcon sx={{ fontSize: 18, mr: 1, color: 'success.main' }} />
                            <Typography variant="body2" fontWeight="medium">Cash:</Typography>
                          </Box>
                          <Typography variant="h6" color="success.main">
                            {formatCurrency(deposit.totalCash)}
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <CheckIcon sx={{ fontSize: 18, mr: 1, color: 'info.main' }} />
                            <Typography variant="body2" fontWeight="medium">Checks:</Typography>
                          </Box>
                          <Typography variant="h6" color="info.main">
                            {formatCurrency(deposit.totalChecks)}
                          </Typography>
                        </Grid>
                      </Grid>

                      {/* User and date info */}
                      <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <PersonIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                          <Typography variant="body2">
                            {deposit.userName}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <CalendarIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary">
                            {format(parseISO(deposit.timestamp), 'MMM dd, yyyy h:mm a')}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Notes preview */}
                      {deposit.notes && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" fontWeight="medium" gutterBottom>
                            Notes:
                          </Typography>
                          <Typography 
                            variant="body2" 
                            color="text.secondary"
                            sx={{ 
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {deposit.notes}
                          </Typography>
                        </Box>
                      )}

                      {/* Actions */}
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button 
                          variant="contained"
                          size="small"
                          onClick={() => handleView(deposit)}
                          startIcon={<ViewIcon />}
                        >
                          View Details
                        </Button>
                        {hasImages && (
                          <Chip
                            icon={<PhotoIcon />}
                            label={`${deposit.images.length} image${deposit.images.length > 1 ? 's' : ''}`}
                            size="small"
                            variant="outlined"
                            color="primary"
                            clickable
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const labeledImages = createLabeledImages(deposit.images);
                              if (labeledImages.length > 0) {
                                handleImageClick(labeledImages[0].url, labeledImages[0].label, labeledImages);
                              }
                            }}
                          />
                        )}
                      </Box>
                    </Grid>


                  </Grid>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}

      {/* Empty state */}
      {!loading && filteredDeposits.length === 0 && (
        <Paper 
          elevation={1} 
          sx={{ 
            py: 8, 
            textAlign: 'center',
            bgcolor: 'grey.50',
          }}
        >
          <BankIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No bank deposits found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {bankDeposits.length === 0 
              ? "Start by creating your first bank deposit"
              : "Try adjusting your filters to see more results"
            }
          </Typography>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={() => navigate('/bank-deposit')}
          >
            Create Bank Deposit
          </Button>
        </Paper>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => menuDeposit && handleView(menuDeposit)}>
          <ViewIcon sx={{ mr: 1 }} />
          View Details
        </MenuItem>
        <MenuItem onClick={() => menuDeposit && handleDelete(menuDeposit)}>
          <DeleteIcon sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* View Details Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Bank Deposit Details - #{selectedDeposit?.id}
            </Typography>
            <IconButton onClick={() => setViewDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedDeposit && (
            <Grid container spacing={3}>
              {/* Amount Information */}
              <Grid item xs={12} md={6}>
                <Paper elevation={1} sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom color="primary">
                    Deposit Amounts
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography>Cash Amount:</Typography>
                      <Typography fontWeight="bold">
                        {formatCurrency(selectedDeposit.totalCash)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography>Check Amount:</Typography>
                      <Typography fontWeight="bold">
                        {formatCurrency(selectedDeposit.totalChecks)}
                      </Typography>
                    </Box>
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="h6">Total Deposit:</Typography>
                      <Typography variant="h6" color="primary" fontWeight="bold">
                        {formatCurrency(getTotalAmount(selectedDeposit))}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </Grid>

              {/* Metadata */}
              <Grid item xs={12} md={6}>
                <Paper elevation={1} sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom color="primary">
                    Deposit Information
                  </Typography>
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Submitted By:
                    </Typography>
                    <Typography>{selectedDeposit.userName}</Typography>
                  </Box>
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Date & Time:
                    </Typography>
                    <Typography>
                      {format(parseISO(selectedDeposit.timestamp), 'PPP p')}
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      User ID:
                    </Typography>
                    <Typography>{selectedDeposit.userId}</Typography>
                  </Box>
                </Paper>
              </Grid>

              {/* Notes */}
              {selectedDeposit.notes && (
                <Grid item xs={12}>
                  <Paper elevation={1} sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom color="primary">
                      Notes
                    </Typography>
                    <Typography>{selectedDeposit.notes}</Typography>
                  </Paper>
                </Grid>
              )}

              {/* Organized Images */}
              {selectedDeposit.images && selectedDeposit.images.length > 0 && (() => {
                const organizedImages = organizeImages(selectedDeposit.images);
                const fieldTypes = [
                  { 
                    key: 'cashDepositSlip', 
                    label: 'Cash Deposit Slip', 
                    images: organizedImages.cashDepositSlip,
                    icon: <CashIcon sx={{ fontSize: 16, mr: 0.5, color: 'success.main' }} />
                  },
                  { 
                    key: 'checkDepositSlip', 
                    label: 'Check Deposit Slip', 
                    images: organizedImages.checkDepositSlip,
                    icon: <CheckIcon sx={{ fontSize: 16, mr: 0.5, color: 'info.main' }} />
                  },
                  { 
                    key: 'individualCheckImages', 
                    label: 'Individual Check Images', 
                    images: organizedImages.individualCheckImages,
                    icon: <PhotoIcon sx={{ fontSize: 16, mr: 0.5, color: 'warning.main' }} />
                  },
                  { 
                    key: 'smsPaymentTypes', 
                    label: 'SMS Payment Types', 
                    images: organizedImages.smsPaymentTypes,
                    icon: <PhotoIcon sx={{ fontSize: 16, mr: 0.5, color: 'secondary.main' }} />
                  },
                ];

                const allImages = createLabeledImages(selectedDeposit.images);

                return (
                  <Grid item xs={12}>
                    <Paper elevation={1} sx={{ p: 2 }}>
                      <Typography variant="h6" gutterBottom color="primary">
                        Deposit Images ({selectedDeposit.images.length})
                      </Typography>
                      
                      {fieldTypes.map((fieldType) => (
                        fieldType.images.length > 0 && (
                          <Box key={fieldType.key} sx={{ mb: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              {fieldType.icon}
                              <Typography variant="subtitle1" fontWeight="bold">
                                {fieldType.label} ({fieldType.images.length})
                              </Typography>
                            </Box>
                            <Grid container spacing={1}>
                              {fieldType.images.map((filename, index) => {
                                const imageUrl = getImageUrl(filename);
                                return (
                                  <Grid item xs={6} sm={4} md={3} key={index}>
                                    <Box
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleImageClick(imageUrl, `${fieldType.label} ${index + 1}`, allImages);
                                      }}
                                      sx={{
                                        width: '100%',
                                        paddingTop: '75%',
                                        position: 'relative',
                                        borderRadius: 1,
                                        overflow: 'hidden',
                                        cursor: 'pointer',
                                        border: '2px solid',
                                        borderColor: 'transparent',
                                        '&:hover': {
                                          transform: 'scale(1.02)',
                                          borderColor: 'primary.main',
                                          transition: 'all 0.2s',
                                        },
                                      }}
                                    >
                                      <Box
                                        component="img"
                                        src={imageUrl}
                                        alt={`${fieldType.label} ${index + 1}`}
                                        sx={{
                                          position: 'absolute',
                                          top: 0,
                                          left: 0,
                                          width: '100%',
                                          height: '100%',
                                          objectFit: 'cover',
                                        }}
                                      />
                                      <Box
                                        sx={{
                                          position: 'absolute',
                                          top: 4,
                                          right: 4,
                                          backgroundColor: 'rgba(0, 0, 0, 0.6)',
                                          borderRadius: '50%',
                                          width: 24,
                                          height: 24,
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                        }}
                                      >
                                        <ZoomInIcon sx={{ color: 'white', fontSize: 14 }} />
                                      </Box>
                                    </Box>
                                  </Grid>
                                );
                              })}
                            </Grid>
                          </Box>
                        )
                      ))}
                    </Paper>
                  </Grid>
                );
              })()}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this bank deposit? This action cannot be undone.
          </Typography>
          {depositToDelete && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>Deposit #{depositToDelete.id}</strong><br />
                Total: {formatCurrency(getTotalAmount(depositToDelete))}<br />
                Date: {format(parseISO(depositToDelete.timestamp), 'PPP')}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Image Slideshow Dialog */}
      <Dialog
        open={slideshowOpen}
        onClose={() => setSlideshowOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            color: 'white',
          }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ color: 'white' }}>
              {slideshowImages[currentImageIndex]?.label || 'Image'}
            </Typography>
            <IconButton onClick={() => setSlideshowOpen(false)} sx={{ color: 'white' }}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0, position: 'relative', minHeight: '60vh' }}>
          {slideshowImages.length > 0 && (
            <>
              {/* Main Image */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: '60vh',
                  position: 'relative',
                }}
              >
                <Box
                  component="img"
                  src={slideshowImages[currentImageIndex]?.url}
                  alt={slideshowImages[currentImageIndex]?.label}
                  sx={{
                    maxWidth: '100%',
                    maxHeight: '60vh',
                    objectFit: 'contain',
                  }}
                />
              </Box>

              {/* Navigation Arrows */}
              {slideshowImages.length > 1 && (
                <>
                  <IconButton
                    onClick={handlePrevImage}
                    sx={{
                      position: 'absolute',
                      left: 16,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      },
                    }}
                  >
                    <ArrowBackIcon />
                  </IconButton>
                  <IconButton
                    onClick={handleNextImage}
                    sx={{
                      position: 'absolute',
                      right: 16,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      },
                    }}
                  >
                    <ArrowForwardIcon />
                  </IconButton>
                </>
              )}

              {/* Image Counter */}
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 16,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  px: 2,
                  py: 1,
                  borderRadius: 1,
                }}
              >
                <Typography variant="body2" sx={{ color: 'white' }}>
                  {currentImageIndex + 1} of {slideshowImages.length}
                </Typography>
              </Box>

              {/* Thumbnail Strip */}
              {slideshowImages.length > 1 && (
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 60,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    gap: 1,
                    maxWidth: '80%',
                    overflow: 'auto',
                    py: 1,
                  }}
                >
                  {slideshowImages.map((image, index) => (
                    <Box
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      sx={{
                        width: 60,
                        height: 40,
                        cursor: 'pointer',
                        border: index === currentImageIndex ? '2px solid white' : '2px solid transparent',
                        borderRadius: 1,
                        overflow: 'hidden',
                        flexShrink: 0,
                        '&:hover': {
                          borderColor: 'rgba(255, 255, 255, 0.7)',
                        },
                      }}
                    >
                      <Box
                        component="img"
                        src={image.url}
                        alt={image.label}
                        sx={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
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
    </Container>
  );
};

export default BankDepositRecords; 