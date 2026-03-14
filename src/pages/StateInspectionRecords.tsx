import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Button,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
} from '@mui/material';
import {
  Add as AddIcon,
  Analytics as AnalyticsIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useStateInspectionStore } from '../stores/stateInspectionStore';
import { 
  getStateInspectionRecords, 
  getFleetAccounts, 
  getStateInspectionStats,
  PaginatedResponse
} from '../services/stateInspectionApi';
import { StateInspectionRecord } from '../types/stateInspection';
import AddRecordForm from '../components/StateInspection/AddRecordForm';
import RecordDeckView from '../components/StateInspection/RecordDeckView';
import AnalyticsView from '../components/StateInspection/AnalyticsView';
import { useNotification } from '../hooks/useNotification';
import NotificationSnackbar from '../components/NotificationSnackbar';

const StateInspectionRecords: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [autoReopen, setAutoReopen] = useState(false);
  const { notification, showSuccess, hideNotification } = useNotification();
  const isLoadingRef = useRef(false);

  const {
    records,
    fleetAccounts,
    stats,
    pagination,
    loading,
    error,
    setRecords,
    setPaginatedRecords,
    setFleetAccounts,
    setStats,
    setPagination,
    setLoading,
    setError,
    clearError,
    resetPagination
  } = useStateInspectionStore();

  // Check if we should show analytics based on URL parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === '2') {
      setShowAnalytics(true);
    }
  }, [searchParams]);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = useCallback(async (page = 1, pageSize = 50) => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const [recordsResponse, fleetAccountsData, statsData] = await Promise.all([
        getStateInspectionRecords({}, { page, pageSize }),
        getFleetAccounts(),
        getStateInspectionStats()
      ]);

      if ('data' in recordsResponse) {
        const paginatedData = recordsResponse as PaginatedResponse<StateInspectionRecord>;
        setPaginatedRecords(paginatedData.data, paginatedData.total, paginatedData.page, paginatedData.pageSize);
      } else {
        setRecords(recordsResponse as StateInspectionRecord[]);
      }

      setFleetAccounts(fleetAccountsData);
      setStats(statsData);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load data. Please try again.');
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [setPaginatedRecords, setRecords, setFleetAccounts, setStats, setLoading, setError]);

  const handlePageChange = useCallback((page: number, pageSize: number) => {
    loadData(page, pageSize);
  }, [loadData]);

  const handleRecordCreated = useCallback(() => {
    showSuccess('State inspection record created successfully');
    loadData();
    if (!autoReopen) setShowAddForm(false);
  }, [showSuccess, loadData, autoReopen]);

  const handleOpenAddForm = useCallback(() => {
    setShowAddForm(true);
    setAutoReopen(true);
  }, []);

  const handleCloseAddForm = useCallback(() => {
    setShowAddForm(false);
    setAutoReopen(false);
  }, []);

  const handleCloseAnalytics = useCallback(() => setShowAnalytics(false), []);
  const handleOpenAnalytics = useCallback(() => setShowAnalytics(true), []);



  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" component="h1" gutterBottom sx={{ mb: 0 }}>
              State Inspections
            </Typography>
            {loading && <CircularProgress size={18} thickness={5} />}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              startIcon={<AnalyticsIcon />}
              onClick={handleOpenAnalytics}
              variant="outlined"
              size="small"
            >
              Analytics
            </Button>
            <Button
              startIcon={<AddIcon />}
              onClick={handleOpenAddForm}
              variant="contained"
              size="small"
            >
              Add Inspection
            </Button>
          </Box>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert 
            severity="error" 
            onClose={clearError} 
            sx={{ mb: 3 }}
          >
            {error}
          </Alert>
        )}

        {/* Records Deck View */}
        <RecordDeckView
          records={records}
          fleetAccounts={fleetAccounts}
          pagination={pagination}
          onDataChange={loadData}
          onPageChange={handlePageChange}
        />



        {/* Add Record Dialog */}
        <Dialog 
          open={showAddForm} 
          onClose={handleCloseAddForm}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              State Inspection Form
              <IconButton onClick={handleCloseAddForm}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            <AddRecordForm 
              onRecordCreated={handleRecordCreated}
              fleetAccounts={fleetAccounts}
            />
          </DialogContent>
        </Dialog>

        {/* Analytics Dialog */}
        <Dialog 
          open={showAnalytics} 
          onClose={handleCloseAnalytics}
          maxWidth="xl"
          fullWidth
          PaperProps={{
            sx: { height: '90vh' }
          }}
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              State Inspection Analytics
              <IconButton onClick={handleCloseAnalytics}>
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ p: 0 }}>
            <AnalyticsView
              records={records}
              stats={stats}
              onRefresh={loadData}
            />
          </DialogContent>
        </Dialog>
      </Box>

      {/* Notification Snackbar */}
      <NotificationSnackbar
        notification={notification}
        onClose={hideNotification}
      />
    </Container>
  );
};

export default StateInspectionRecords; 