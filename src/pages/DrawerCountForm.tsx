import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Button,
  Box,
  Paper,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  TextField,
} from '@mui/material';
import {
  AccountBalance as DrawerIcon,
  Save as SaveIcon,
  Calculate as CalculateIcon,
  Add as AddIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import Grid from '../components/CustomGrid';
import DenominationInput from '../components/CashManagement/DenominationInput';
import { submitDrawerCount, calculateTotalCash, calculateCashOut, getDrawerCounts, deleteDrawerCount, updateDrawerCount } from '../services/cashManagementApi';
import { useCashManagementStore, initializeDefaultDrawers } from '../stores/cashManagementStore';
import { DenominationCount, DrawerCount, DrawerCountType } from '../types/cashManagement';

const DrawerCountForm: React.FC = () => {
  const {
    drawerSettings,
    currentDrawerCounts,
    setDrawerCount,
    clearDrawerCount,
    addDrawerCountHistory,
    selectedDrawerId,
    setSelectedDrawerId,
    drawerCountHistory,
    setDrawerCountHistory,
  } = useCashManagementStore();

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openFormDialog, setOpenFormDialog] = useState(false);
  const [openDrawerSelection, setOpenDrawerSelection] = useState(false);
  const [openCountTypeDialog, setOpenCountTypeDialog] = useState(false);
  const [openEditDrawerSelection, setOpenEditDrawerSelection] = useState(false);
  const [openEditCountTypeDialog, setOpenEditCountTypeDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewRecord, setViewRecord] = useState<DrawerCount | null>(null);
  const [editRecord, setEditRecord] = useState<DrawerCount | null>(null);
  const [countType, setCountType] = useState<DrawerCountType>('opening');
  const [smsCash, setSmsCash] = useState<number>(0);
  const [isSmsCashFocused, setIsSmsCashFocused] = useState(false);

  // Initialize default drawers and load data on mount
  useEffect(() => {
    initializeDefaultDrawers();
    loadDrawerCounts();
  }, []);

  // Set first drawer as selected if none selected
  useEffect(() => {
    if (!selectedDrawerId && drawerSettings.length > 0) {
      setSelectedDrawerId(drawerSettings[0].id);
    }
  }, [drawerSettings, selectedDrawerId, setSelectedDrawerId]);

  const loadDrawerCounts = async () => {
    try {
      setLoading(true);
      const counts = await getDrawerCounts();
      setDrawerCountHistory(counts);
    } catch (error) {
      console.error('Error loading drawer counts:', error);
      setError('Failed to load drawer count records');
    } finally {
      setLoading(false);
    }
  };

  const selectedDrawer = drawerSettings.find(d => d.id === selectedDrawerId);
  const currentCount = selectedDrawerId ? currentDrawerCounts[selectedDrawerId] : null;

  const defaultDenominations: DenominationCount = {
    pennies: 0,
    nickels: 0,
    dimes: 0,
    quarters: 0,
    ones: 0,
    fives: 0,
    tens: 0,
    twenties: 0,
    fifties: 0,
    hundreds: 0,
  };



  const handleDenominationChange = (denominations: DenominationCount) => {
    if (!selectedDrawerId) return;
    
    setDrawerCount(selectedDrawerId, denominations);
    
    // Clear success/error when user changes values
    if (success) setSuccess(false);
    if (error) setError(null);
  };

  const handleSmsCashFocus = () => {
    setIsSmsCashFocused(true);
  };

  const handleSmsCashBlur = () => {
    setIsSmsCashFocused(false);
  };

  const calculateTotals = () => {
    if (!selectedDrawer || !currentCount) return null;

    const totalCash = calculateTotalCash(currentCount);
    
    // For opening counts, no cash is pulled out (cash out = 0)
    // For closing counts, calculate normal cash out based on target denominations
    let cashOut: DenominationCount;
    if (countType === 'opening') {
      cashOut = {
        pennies: 0,
        nickels: 0,
        dimes: 0,
        quarters: 0,
        ones: 0,
        fives: 0,
        tens: 0,
        twenties: 0,
        fifties: 0,
        hundreds: 0,
      };
    } else {
      cashOut = calculateCashOut(currentCount, selectedDrawer.targetDenominations);
    }
    
    const totalCashOut = calculateTotalCash(cashOut);
    const totalForDeposit = totalCash - totalCashOut;

    return {
      totalCash,
      cashOut,
      totalCashOut,
      totalForDeposit,
    };
  };

  const totals = calculateTotals();

  const handleSubmit = async () => {
    if (!selectedDrawer || !currentCount || !totals) {
      setError('Please complete the drawer count');
      return;
    }

    if (totals.totalCash <= 0) {
      setError('Total cash must be greater than zero');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const drawerCountData = {
        drawerId: selectedDrawer.id,
        drawerName: selectedDrawer.name,
        countType,
        denominations: currentCount,
        cashOut: totals.cashOut,
        totalCash: totals.totalCash,
        totalForDeposit: totals.totalForDeposit,
        ...(countType === 'closing' && { smsCash }),
      };

      let savedCount: DrawerCount;
      
      if (editRecord) {
        // Update existing record
        savedCount = await updateDrawerCount(editRecord.id!, drawerCountData);
        // Update the record in history
        const updatedHistory = drawerCountHistory.map(record => 
          record.id === editRecord.id ? savedCount : record
        );
        setDrawerCountHistory(updatedHistory);
      } else {
        // Create new record
        savedCount = await submitDrawerCount(drawerCountData);
        addDrawerCountHistory(savedCount);
      }
      
      setSuccess(true);
      
      // Clear the current count
      clearDrawerCount(selectedDrawer.id);

      // Refresh the table data
      await loadDrawerCounts();

      // Close dialog after successful submission
      setTimeout(() => {
        setOpenFormDialog(false);
        setSuccess(false);
        setEditRecord(null);
      }, 2000);
      
    } catch (error) {
      console.error('Error submitting drawer count:', error);
      setError('Failed to submit drawer count. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    if (selectedDrawerId) {
      clearDrawerCount(selectedDrawerId);
    }
    setCountType('opening');
    setSmsCash(0);
    setIsSmsCashFocused(false);
    setSuccess(false);
    setError(null);
    setEditRecord(null);
    setOpenEditDrawerSelection(false);
    setOpenEditCountTypeDialog(false);
  };

  const handleOpenFormDialog = () => {
    setCountType('opening');
    setSmsCash(0);
    setIsSmsCashFocused(false);
    setSuccess(false);
    setError(null);
    setEditRecord(null);
    setOpenEditDrawerSelection(false);
    setOpenEditCountTypeDialog(false);
    setOpenDrawerSelection(true);
  };

  const handleDrawerSelection = (drawerId: string) => {
    setSelectedDrawerId(drawerId);
    setOpenDrawerSelection(false);
    setOpenCountTypeDialog(true);
  };

  const handleCountTypeSelection = (type: DrawerCountType) => {
    setCountType(type);
    setOpenCountTypeDialog(false);
    setOpenFormDialog(true);
  };

  const handleEditDrawerSelection = (drawerId: string) => {
    setSelectedDrawerId(drawerId);
    setOpenEditDrawerSelection(false);
    setOpenEditCountTypeDialog(true);
  };

  const handleEditCountTypeSelection = (type: DrawerCountType) => {
    setCountType(type);
    setOpenEditCountTypeDialog(false);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this drawer count record?')) {
      return;
    }

    try {
      await deleteDrawerCount(id);
      await loadDrawerCounts();
    } catch (error) {
      console.error('Error deleting drawer count:', error);
      setError('Failed to delete drawer count record');
    }
  };

  const handleEdit = (record: DrawerCount) => {
    setEditRecord(record);
    setSelectedDrawerId(record.drawerId);
    setCountType(record.countType);
    setSmsCash(record.smsCash || 0);
    setDrawerCount(record.drawerId, record.denominations);
    setOpenFormDialog(true);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateRecordDiscrepancy = (record: DrawerCount) => {
    // Only calculate discrepancy for closing records
    if (record.countType !== 'closing' || !record.smsCash) {
      return null;
    }

    // Find the most recent opening record for the same drawer
    const openingRecords = drawerCountHistory.filter(r => 
      r.drawerId === record.drawerId && 
      r.countType === 'opening' &&
      new Date(r.timestamp) <= new Date(record.timestamp)
    );

    if (openingRecords.length === 0) {
      return null;
    }

    const openingRecord = openingRecords[0]; // Most recent opening before this closing
    const expected = openingRecord.totalCash + record.smsCash;
    const actual = record.totalCash;
    const discrepancy = actual - expected;

    return {
      expected,
      actual,
      discrepancy,
      openingAmount: openingRecord.totalCash,
      smsCash: record.smsCash,
    };
  };

  const calculateDiscrepancy = (drawerId: string) => {
    const drawerRecords = drawerCountHistory.filter(record => record.drawerId === drawerId);
    const openingRecords = drawerRecords.filter(record => record.countType === 'opening');
    const closingRecords = drawerRecords.filter(record => record.countType === 'closing');
    
    if (openingRecords.length === 0 || closingRecords.length === 0) {
      return null;
    }

    // Get the most recent opening and closing records
    const latestOpening = openingRecords[0]; // Records are sorted by timestamp DESC
    const latestClosing = closingRecords[0];
    
    if (!latestClosing.smsCash) {
      return null;
    }

    const drawerDifference = latestClosing.totalCash - latestOpening.totalCash;
    const discrepancy = drawerDifference - latestClosing.smsCash;
    
    return {
      openingAmount: latestOpening.totalCash,
      closingAmount: latestClosing.totalCash,
      drawerDifference,
      smsCash: latestClosing.smsCash,
      discrepancy,
      openingDate: latestOpening.timestamp,
      closingDate: latestClosing.timestamp,
    };
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 3, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <DrawerIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
            <Typography variant="h4" component="h1">
              Drawer Count Down
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenFormDialog}
            disabled={drawerSettings.length === 0}
          >
            Add Count
          </Button>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* No Drawers Alert */}
        {drawerSettings.length === 0 && (
          <Alert severity="info" sx={{ mb: 3 }}>
            No drawers configured. Please set up drawers in the Drawer Settings page first.
          </Alert>
        )}

        {/* Records Table */}
        <Paper elevation={2}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date/Time</TableCell>
                  <TableCell>Drawer</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell align="right">Total Cash</TableCell>
                  <TableCell align="right">SMS Cash</TableCell>
                  <TableCell align="right">Cash Out</TableCell>
                  <TableCell align="right">For Deposit</TableCell>
                  <TableCell align="right">Discrepancy</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {drawerCountHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                      <Typography variant="body1" color="text.secondary">
                        No drawer count records found. Click "Add Count" to create your first record.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  drawerCountHistory.map((record) => (
                    <TableRow 
                      key={record.id} 
                      hover
                      onClick={() => setViewRecord(record)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>{formatDate(record.timestamp)}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography>{record.drawerName}</Typography>
                          <Chip 
                            label={record.drawerId} 
                            size="small" 
                            variant="outlined" 
                            sx={{ ml: 1 }} 
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={record.countType?.charAt(0).toUpperCase() + (record.countType?.slice(1) || '')} 
                          size="small" 
                          color={record.countType === 'opening' ? 'success' : 'primary'}
                          variant="filled"
                        />
                      </TableCell>
                      <TableCell>{record.userName}</TableCell>
                      <TableCell align="right">
                        <Typography fontWeight="bold" color="primary">
                          {formatCurrency(record.totalCash)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {record.countType === 'closing' && record.smsCash !== undefined ? (
                          <Typography fontWeight="bold" color="warning.main">
                            {formatCurrency(record.smsCash)}
                          </Typography>
                        ) : (
                          <Typography color="text.disabled">-</Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Typography color="secondary">
                          {formatCurrency(calculateTotalCash(record.cashOut))}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography fontWeight="bold" color="success.main">
                          {formatCurrency(record.totalForDeposit)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {(() => {
                          const discrepancy = calculateRecordDiscrepancy(record);
                          if (!discrepancy) {
                            return <Typography color="text.disabled">-</Typography>;
                          }

                          const { discrepancy: amount } = discrepancy;
                          let color = 'success.main';
                          let text = '✓ Perfect';
                          
                          if (amount > 0) {
                            color = 'error.main';
                            text = `+${formatCurrency(Math.abs(amount))}`;
                          } else if (amount < 0) {
                            color = 'warning.main';
                            text = `-${formatCurrency(Math.abs(amount))}`;
                          }

                          return (
                            <Typography 
                              fontWeight="bold" 
                              color={color}
                              sx={{ fontSize: '0.875rem' }}
                            >
                              {text}
                            </Typography>
                          );
                        })()}
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="Edit">
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(record);
                              }}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={(e) => {
                                e.stopPropagation();
                                record.id && handleDelete(record.id);
                              }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Drawer Selection Dialog */}
        <Dialog 
          open={openDrawerSelection} 
          onClose={() => setOpenDrawerSelection(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6">Select Drawer</Typography>
              <IconButton onClick={() => setOpenDrawerSelection(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ py: 2 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {drawerSettings.map((drawer) => (
                  <Chip
                    key={drawer.id}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography>{drawer.name}</Typography>
                        {drawer.isActive ? (
                          <Chip label="Active" color="success" size="small" />
                        ) : (
                          <Chip label="Inactive" color="default" size="small" />
                        )}
                      </Box>
                    }
                    onClick={() => handleDrawerSelection(drawer.id)}
                    variant="outlined"
                    color="primary"
                    sx={{ 
                      p: 1,
                      height: 'auto',
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: 'primary.light',
                        color: 'white'
                      }
                    }}
                  />
                ))}
              </Box>
            </Box>
          </DialogContent>
        </Dialog>

        {/* Count Type Selection Dialog */}
        <Dialog 
          open={openCountTypeDialog} 
          onClose={() => setOpenCountTypeDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6">
                Select Count Type for {selectedDrawer?.name}
              </Typography>
              <IconButton onClick={() => setOpenCountTypeDialog(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ py: 2 }}>
              <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                <Chip
                  label={
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 1 }}>
                      <Typography variant="h6">Opening Count</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Start of shift
                      </Typography>
                    </Box>
                  }
                  onClick={() => handleCountTypeSelection('opening')}
                  color="success"
                  variant="outlined"
                  sx={{ 
                    p: 2,
                    height: 'auto',
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: 'success.light',
                      color: 'white'
                    }
                  }}
                />
                <Chip
                  label={
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 1 }}>
                      <Typography variant="h6">Closing Count</Typography>
                      <Typography variant="caption" color="text.secondary">
                        End of shift
                      </Typography>
                    </Box>
                  }
                  onClick={() => handleCountTypeSelection('closing')}
                  color="primary"
                  variant="outlined"
                  sx={{ 
                    p: 2,
                    height: 'auto',
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: 'primary.light',
                      color: 'white'
                    }
                  }}
                />
              </Box>
            </Box>
          </DialogContent>
        </Dialog>

        {/* Edit Drawer Selection Dialog */}
        <Dialog 
          open={openEditDrawerSelection} 
          onClose={() => setOpenEditDrawerSelection(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6">Change Drawer</Typography>
              <IconButton onClick={() => setOpenEditDrawerSelection(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ py: 2 }}>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Select a different drawer:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {drawerSettings.map((drawer) => (
                  <Chip
                    key={drawer.id}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography>{drawer.name}</Typography>
                        {drawer.isActive ? (
                          <Chip label="Active" color="success" size="small" />
                        ) : (
                          <Chip label="Inactive" color="default" size="small" />
                        )}
                      </Box>
                    }
                    onClick={() => handleEditDrawerSelection(drawer.id)}
                    variant="outlined"
                    color="primary"
                    sx={{ 
                      p: 1,
                      height: 'auto',
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: 'primary.light',
                        color: 'white'
                      }
                    }}
                  />
                ))}
              </Box>
            </Box>
          </DialogContent>
        </Dialog>

        {/* Edit Count Type Selection Dialog */}
        <Dialog 
          open={openEditCountTypeDialog} 
          onClose={() => setOpenEditCountTypeDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6">
                Change Count Type for {selectedDrawer?.name}
              </Typography>
              <IconButton onClick={() => setOpenEditCountTypeDialog(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ py: 2 }}>
              <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                <Chip
                  label={
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 1 }}>
                      <Typography variant="h6">Opening Count</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Start of shift
                      </Typography>
                    </Box>
                  }
                  onClick={() => handleEditCountTypeSelection('opening')}
                  color="success"
                  variant="outlined"
                  sx={{ 
                    p: 2,
                    height: 'auto',
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: 'success.light',
                      color: 'white'
                    }
                  }}
                />
                <Chip
                  label={
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 1 }}>
                      <Typography variant="h6">Closing Count</Typography>
                      <Typography variant="caption" color="text.secondary">
                        End of shift
                      </Typography>
                    </Box>
                  }
                  onClick={() => handleEditCountTypeSelection('closing')}
                  color="primary"
                  variant="outlined"
                  sx={{ 
                    p: 2,
                    height: 'auto',
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: 'primary.light',
                      color: 'white'
                    }
                  }}
                />
              </Box>
            </Box>
          </DialogContent>
        </Dialog>

        {/* Add Count Down Form Dialog */}
        <Dialog 
          open={openFormDialog} 
          onClose={() => setOpenFormDialog(false)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6">
                {editRecord ? 'Edit' : 'Add'} {countType.charAt(0).toUpperCase() + countType.slice(1)} Drawer Count
              </Typography>
              <IconButton onClick={() => {
                setOpenFormDialog(false);
                setEditRecord(null);
                setOpenEditDrawerSelection(false);
                setOpenEditCountTypeDialog(false);
              }}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            {/* Success Alert */}
            {success && (
              <Alert severity="success" sx={{ mb: 3 }}>
                Drawer count submitted successfully!
              </Alert>
            )}

            {/* Error Alert */}
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {/* Selected Drawer and Count Type Info */}
            <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Selected Configuration
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Typography variant="body1" color="text.secondary">Drawer:</Typography>
                <Chip 
                  label={selectedDrawer?.name || 'None'} 
                  color="primary" 
                  variant="filled"
                  onClick={editRecord ? () => setOpenEditDrawerSelection(true) : undefined}
                  sx={editRecord ? { cursor: 'pointer' } : {}}
                />
                <Typography variant="body1" color="text.secondary">Type:</Typography>
                <Chip 
                  label={countType.charAt(0).toUpperCase() + countType.slice(1)} 
                  color={countType === 'opening' ? 'success' : 'primary'}
                  variant="filled"
                  onClick={editRecord ? () => setOpenEditCountTypeDialog(true) : undefined}
                  sx={editRecord ? { cursor: 'pointer' } : {}}
                />
              </Box>
            </Paper>

            {selectedDrawer && (
              <>
                {/* SMS Cash Field (only for closing counts) */}
                {countType === 'closing' && (
                  <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      SMS Cash Collected
                    </Typography>
                    <TextField
                      fullWidth
                      label="SMS Cash Amount"
                      type="number"
                      value={isSmsCashFocused && smsCash === 0 ? '' : smsCash}
                      onChange={(e) => setSmsCash(Number(e.target.value) || 0)}
                      onFocus={handleSmsCashFocus}
                      onBlur={handleSmsCashBlur}
                      disabled={submitting}
                      InputProps={{
                        startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
                      }}
                      helperText="Enter the total SMS cash collected during the day"
                    />
                  </Paper>
                )}

                {/* Current Count */}
                <DenominationInput
                  values={currentCount || defaultDenominations}
                  onChange={handleDenominationChange}
                  label="Current Drawer Count"
                  disabled={submitting}
                />

                {/* Calculations */}
                {totals && (
                  <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      <CalculateIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Calculations
                    </Typography>

                    {/* Simple Summary */}
                    <Box sx={{ mt: 2 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="h6">Total Cash in Drawer:</Typography>
                          <Typography variant="h6" color="primary">
                            {formatCurrency(totals.totalCash)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="h6">Total Cash Out:</Typography>
                          <Typography variant="h6" color="secondary">
                            {formatCurrency(totals.totalCashOut)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="h6">Total for Deposit:</Typography>
                          <Typography variant="h6" color="success.main">
                            {formatCurrency(totals.totalForDeposit)}
                          </Typography>
                        </Box>
                        
                        {/* Discrepancy Calculation for Closing Counts */}
                        {countType === 'closing' && (() => {
                          // Find the most recent opening record for this drawer
                          const openingRecords = drawerCountHistory.filter(r => 
                            r.drawerId === selectedDrawer.id && 
                            r.countType === 'opening'
                          );
                          
                          // Debug info (can remove later)
                          console.log('Looking for opening records for drawer:', selectedDrawer.id, selectedDrawer.name);
                          console.log('All records:', drawerCountHistory.map(r => ({ id: r.drawerId, name: r.drawerName, type: r.countType })));
                          console.log('Found opening records:', openingRecords.length);
                          
                          if (openingRecords.length > 0 && smsCash > 0) {
                            const latestOpening = openingRecords[0]; // Most recent opening
                            const expected = latestOpening.totalCash + smsCash;
                            const actual = totals.totalCash;
                            const discrepancy = actual - expected;
                            
                            return (
                              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="h6">Discrepancy:</Typography>
                                <Typography 
                                  variant="h6" 
                                  fontWeight="bold"
                                  color={discrepancy === 0 ? 'success.main' : discrepancy > 0 ? 'error.main' : 'warning.main'}
                                >
                                  {discrepancy === 0 ? '✓ Perfect Match' : 
                                   discrepancy > 0 ? `+${formatCurrency(Math.abs(discrepancy))} Over` :
                                   `-${formatCurrency(Math.abs(discrepancy))} Short`}
                                </Typography>
                              </Box>
                            );
                          } else if (openingRecords.length === 0) {
                            return (
                              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="h6">Discrepancy:</Typography>
                                <Typography variant="h6" color="text.disabled">
                                  No opening record found for "{selectedDrawer.name}"
                                </Typography>
                              </Box>
                            );
                          } else if (smsCash === 0) {
                            return (
                              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="h6">Discrepancy:</Typography>
                                <Typography variant="h6" color="text.disabled">
                                  Enter SMS Cash to calculate
                                </Typography>
                              </Box>
                            );
                          }
                          return null;
                        })()}
                      </Box>
                    </Box>
                  </Paper>
                )}
              </>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button
              variant="outlined"
              onClick={handleReset}
              disabled={submitting}
            >
              Clear Count
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={submitting || !totals || totals.totalCash <= 0}
              startIcon={submitting ? <CircularProgress size={20} /> : <SaveIcon />}
            >
              {submitting ? 'Saving...' : editRecord ? 'Update Count' : 'Save Count'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* View Record Dialog */}
        <Dialog 
          open={!!viewRecord} 
          onClose={() => setViewRecord(null)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6">Drawer Count Details</Typography>
              <IconButton onClick={() => setViewRecord(null)}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            {viewRecord && (
              <>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">Date/Time</Typography>
                    <Typography variant="body1">{formatDate(viewRecord.timestamp)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">User</Typography>
                    <Typography variant="body1">{viewRecord.userName}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">Drawer</Typography>
                    <Typography variant="body1">{viewRecord.drawerName}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">Drawer ID</Typography>
                    <Typography variant="body1">{viewRecord.drawerId}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">Count Type</Typography>
                    <Chip 
                      label={viewRecord.countType?.charAt(0).toUpperCase() + (viewRecord.countType?.slice(1) || '')} 
                      size="small" 
                      color={viewRecord.countType === 'opening' ? 'success' : 'primary'}
                      variant="filled"
                    />
                  </Grid>
                  {viewRecord.countType === 'closing' && viewRecord.smsCash !== undefined && (
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary">SMS Cash</Typography>
                      <Typography variant="body1" fontWeight="bold" color="warning.main">
                        {formatCurrency(viewRecord.smsCash)}
                      </Typography>
                    </Grid>
                  )}
                </Grid>

                <Divider sx={{ mb: 3 }} />

                {/* Discrepancy Analysis */}
                {(() => {
                  const recordDiscrepancy = calculateRecordDiscrepancy(viewRecord);
                  return recordDiscrepancy && (
                    <>
                      <Paper elevation={1} sx={{ p: 2, mb: 3, bgcolor: 'background.paper' }}>
                        <Typography variant="h6" gutterBottom>
                          Discrepancy Analysis
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">Opening Amount</Typography>
                            <Typography variant="body1">{formatCurrency(recordDiscrepancy.openingAmount)}</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">SMS Cash Collected</Typography>
                            <Typography variant="body1" color="warning.main">
                              {formatCurrency(recordDiscrepancy.smsCash)}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">Expected Amount</Typography>
                            <Typography variant="body1" color="info.main" fontWeight="bold">
                              {formatCurrency(recordDiscrepancy.expected)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              (Opening + SMS Cash)
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">Actual Amount</Typography>
                            <Typography variant="body1" color="primary" fontWeight="bold">
                              {formatCurrency(recordDiscrepancy.actual)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              (Closing Count)
                            </Typography>
                          </Grid>
                          <Grid item xs={12}>
                            <Divider sx={{ my: 1 }} />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="h6">Discrepancy:</Typography>
                              <Typography 
                                variant="h6" 
                                color={recordDiscrepancy.discrepancy === 0 ? 'success.main' : 
                                       recordDiscrepancy.discrepancy > 0 ? 'error.main' : 'warning.main'}
                                fontWeight="bold"
                              >
                                {recordDiscrepancy.discrepancy === 0 ? '✓ Perfect Match' : 
                                 recordDiscrepancy.discrepancy > 0 ? `+${formatCurrency(Math.abs(recordDiscrepancy.discrepancy))} Over` :
                                 `-${formatCurrency(Math.abs(recordDiscrepancy.discrepancy))} Short`}
                              </Typography>
                            </Box>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                              Discrepancy = Actual Amount - Expected Amount
                            </Typography>
                          </Grid>
                        </Grid>
                      </Paper>
                      <Divider sx={{ mb: 3 }} />
                    </>
                  );
                })()}

                <Grid container spacing={3}>
                  {/* Denominations */}
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>Current Count</Typography>
                    <Box sx={{ bgcolor: 'info.50', p: 2, borderRadius: 1 }}>
                      {Object.entries(viewRecord.denominations).map(([key, value]) => (
                        <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                            {key.replace(/([A-Z])/g, ' $1')}:
                          </Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {value as number}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Grid>

                  {/* Cash Out */}
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>Cash Out</Typography>
                    <Box sx={{ bgcolor: 'error.50', p: 2, borderRadius: 1 }}>
                      {Object.entries(viewRecord.cashOut).map(([key, value]) => (
                        <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                            {key.replace(/([A-Z])/g, ' $1')}:
                          </Typography>
                          <Typography 
                            variant="body2" 
                            color={(value as number) > 0 ? 'error.main' : 'text.secondary'}
                            fontWeight="bold"
                          >
                            {value as number}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Grid>

                  {/* Totals */}
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="h6">Total Cash in Drawer:</Typography>
                        <Typography variant="h6" color="primary">
                          {formatCurrency(viewRecord.totalCash)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="h6">Total Cash Out:</Typography>
                        <Typography variant="h6" color="secondary">
                          {formatCurrency(calculateTotalCash(viewRecord.cashOut))}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="h6">Total for Deposit:</Typography>
                        <Typography variant="h6" color="success.main">
                          {formatCurrency(viewRecord.totalForDeposit)}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </>
            )}
          </DialogContent>
        </Dialog>
      </Box>
    </Container>
  );
};

export default DrawerCountForm; 