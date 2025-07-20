import React, { useState, useEffect, useMemo } from 'react';
import {
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
  Typography,
} from '@mui/material';
import Grid from '../CustomGrid';
import {
  FilterList as FilterIcon,
  MoreVert as MoreVertIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  AttachMoney as CashIcon,
  RequestPage as CheckIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  PhotoLibrary as PhotoIcon,
  Close as CloseIcon,
  AccountBalance as BankIcon,
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { BankDeposit, CashManagementFilters } from '../../types/cashManagement';
import { getBankDeposits, deleteBankDeposit } from '../../services/cashManagementApi';
import { useCashManagementStore } from '../../stores/cashManagementStore';

interface BankDepositFilters {
  search: string;
  startDate: string;
  endDate: string;
  userId: string;
  minAmount: string;
  maxAmount: string;
}

interface BankDepositDeckViewProps {
  onDataChange?: () => void;
}

const BankDepositDeckView: React.FC<BankDepositDeckViewProps> = ({ onDataChange }) => {
  const { bankDeposits, setBankDeposits } = useCashManagementStore();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDeposit, setSelectedDeposit] = useState<BankDeposit | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [depositToDelete, setDepositToDelete] = useState<BankDeposit | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuDeposit, setMenuDeposit] = useState<BankDeposit | null>(null);
  
  const [filters, setFilters] = useState<BankDepositFilters>({
    search: '',
    startDate: '',
    endDate: '',
    userId: '',
    minAmount: '',
    maxAmount: '',
  });

  const [filtersOpen, setFiltersOpen] = useState(false);

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
      
      if (onDataChange) {
        onDataChange();
      }
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
      
      if (onDataChange) {
        onDataChange();
      }
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

  return (
    <Box>
      {/* Header with filters toggle */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" component="h2">
          Bank Deposits ({filteredDeposits.length})
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton onClick={() => setFiltersOpen(!filtersOpen)} color="primary">
            <FilterIcon />
          </IconButton>
          <IconButton onClick={fetchDeposits} disabled={loading}>
            <RefreshIcon />
          </IconButton>
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

      {/* Deposit Cards */}
      {!loading && (
        <Grid container spacing={3}>
          {filteredDeposits.map((deposit) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={deposit.id}>
              <Card 
                elevation={2}
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  }
                }}
              >
                <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                  {/* Header with menu */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32, mr: 1 }}>
                        <BankIcon fontSize="small" />
                      </Avatar>
                      <Box>
                        <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 'bold' }}>
                          {formatCurrency(getTotalAmount(deposit))}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Deposit #{deposit.id}
                        </Typography>
                      </Box>
                    </Box>
                    <IconButton 
                      size="small" 
                      onClick={(e) => handleMenuOpen(e, deposit)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Box>

                  {/* Amount breakdown */}
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <CashIcon sx={{ fontSize: 16, mr: 0.5, color: 'success.main' }} />
                        <Typography variant="body2">Cash:</Typography>
                      </Box>
                      <Typography variant="body2" fontWeight="medium">
                        {formatCurrency(deposit.totalCash)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <CheckIcon sx={{ fontSize: 16, mr: 0.5, color: 'info.main' }} />
                        <Typography variant="body2">Checks:</Typography>
                      </Box>
                      <Typography variant="body2" fontWeight="medium">
                        {formatCurrency(deposit.totalChecks)}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Images indicator */}
                  {deposit.images && deposit.images.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Chip
                        icon={<PhotoIcon />}
                        label={`${deposit.images.length} image${deposit.images.length > 1 ? 's' : ''}`}
                        size="small"
                        variant="outlined"
                        color="primary"
                      />
                    </Box>
                  )}

                  {/* Notes preview */}
                  {deposit.notes && (
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      sx={{ 
                        mb: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {deposit.notes}
                    </Typography>
                  )}

                  <Divider sx={{ my: 1 }} />

                  {/* User and date info */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <PersonIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">
                        {deposit.userName}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CalendarIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">
                        {format(parseISO(deposit.timestamp), 'MMM dd, yyyy')}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>

                <CardActions sx={{ pt: 0, justifyContent: 'center' }}>
                  <Button 
                    size="small" 
                    onClick={() => handleView(deposit)}
                    startIcon={<ViewIcon />}
                  >
                    View Details
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
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
          <Typography variant="body2" color="text.secondary">
            {bankDeposits.length === 0 
              ? "Start by creating your first bank deposit"
              : "Try adjusting your filters to see more results"
            }
          </Typography>
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

              {/* Images */}
              {selectedDeposit.images && selectedDeposit.images.length > 0 && (
                <Grid item xs={12}>
                  <Paper elevation={1} sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom color="primary">
                      Deposit Images ({selectedDeposit.images.length})
                    </Typography>
                    <Grid container spacing={2}>
                      {selectedDeposit.images.map((filename, index) => (
                        <Grid item xs={6} sm={4} md={3} key={index}>
                          <Box
                            sx={{
                              width: '100%',
                              paddingTop: '75%',
                              position: 'relative',
                              borderRadius: 1,
                              overflow: 'hidden',
                              cursor: 'pointer',
                              '&:hover': {
                                transform: 'scale(1.02)',
                                transition: 'transform 0.2s',
                              },
                            }}
                          >
                            <Box
                              component="img"
                              src={getImageUrl(filename)}
                              alt={`Deposit image ${index + 1}`}
                              sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                border: '1px solid',
                                borderColor: 'grey.300',
                              }}
                            />
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </Paper>
                </Grid>
              )}
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
    </Box>
  );
};

export default BankDepositDeckView; 