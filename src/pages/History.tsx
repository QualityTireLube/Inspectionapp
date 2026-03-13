import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  CircularProgress,
  Chip,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  DialogContentText
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import api from '../services/api';
import { quickCheckApi } from '../services/quickCheckApi';
import { useNotification } from '../hooks/useNotification';
import NotificationSnackbar from '../components/NotificationSnackbar';

interface QuickCheckData {
  vin: string;
  date: string;
  user: string;
  mileage: string;
  windshield_condition: string;
  wiper_blades: string;
  washer_squirters: string;
  state_inspection_status: string;
  state_inspection_month: number | null;
  washer_fluid: string;
  engine_air_filter: string;
  battery_condition: string;
  passenger_front_tire: string;
  driver_front_tire: string;
  driver_rear_tire: string;
  passenger_rear_tire: string;
  spare_tire: string;
  tire_rotation: string;
  static_sticker: string;
  tpms_type: string;
  drain_plug_type: string;
  notes: string;
  tire_tread: {
    driver_front: {
      inner_edge_depth: string;
      inner_depth: string;
      center_depth: string;
      outer_depth: string;
      outer_edge_depth: string;
      inner_edge_condition: string;
      inner_condition: string;
      center_condition: string;
      outer_condition: string;
      outer_edge_condition: string;
    };
    passenger_front: {
      inner_edge_depth: string;
      inner_depth: string;
      center_depth: string;
      outer_depth: string;
      outer_edge_depth: string;
      inner_edge_condition: string;
      inner_condition: string;
      center_condition: string;
      outer_condition: string;
      outer_edge_condition: string;
    };
    driver_rear: {
      inner_edge_depth: string;
      inner_depth: string;
      center_depth: string;
      outer_depth: string;
      outer_edge_depth: string;
      inner_edge_condition: string;
      inner_condition: string;
      center_condition: string;
      outer_condition: string;
      outer_edge_condition: string;
    };
    passenger_rear: {
      inner_edge_depth: string;
      inner_depth: string;
      center_depth: string;
      outer_depth: string;
      outer_edge_depth: string;
      inner_edge_condition: string;
      inner_condition: string;
      center_condition: string;
      outer_condition: string;
      outer_edge_condition: string;
    };
    spare: {
      inner_edge_depth: string;
      inner_depth: string;
      center_depth: string;
      outer_depth: string;
      outer_edge_depth: string;
      inner_edge_condition: string;
      inner_condition: string;
      center_condition: string;
      outer_condition: string;
      outer_edge_condition: string;
    };
  };
}

interface QuickCheck {
  id: number;
  user_name: string;
  created_at: string;
  data: QuickCheckData;
}

const History: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [records, setRecords] = useState<QuickCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<QuickCheck | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { notification, hideNotification, handleApiCall } = useNotification();

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    setError(null);
    
    const result = await handleApiCall(
      () => api.quickChecks.getAll(),
      {
        successMessage: 'Records loaded successfully',
        errorMessage: 'Failed to load inspection records',
        showSuccessNotification: false, // Don't show success for initial load
        showErrorNotification: true,
      }
    );

    if (result) {
      setRecords(result);
      setError(null);
    } else {
      setError('Failed to load records');
    }
    setLoading(false);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewRecord = (id: number) => {
    navigate(`/quick-check/${id}`);
  };

  const handleDeleteClick = (record: QuickCheck, event: React.MouseEvent) => {
    event.stopPropagation();
    setRecordToDelete(record);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!recordToDelete) return;
    
    setIsDeleting(true);
    
    const result = await handleApiCall(
      () => quickCheckApi.delete(recordToDelete.id),
      {
        successMessage: `Inspection record for ${recordToDelete.data.vin} deleted successfully`,
        errorMessage: 'Failed to delete inspection record',
      }
    );

    if (result !== null) {
      setRecords((prev) => prev.filter((record) => record.id !== recordToDelete.id));
    }
    
    setIsDeleting(false);
    setDeleteDialogOpen(false);
    setRecordToDelete(null);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setRecordToDelete(null);
  };

  const getOverallCondition = (record: QuickCheck) => {
    const conditions = [
      record.data.windshield_condition,
      record.data.wiper_blades,
      record.data.washer_squirters,
      record.data.washer_fluid,
      record.data.engine_air_filter,
      record.data.battery_condition,
      record.data.passenger_front_tire,
      record.data.driver_front_tire,
      record.data.driver_rear_tire,
      record.data.passenger_rear_tire,
      record.data.spare_tire,
      record.data.tire_rotation,
      record.data.static_sticker
    ];

    // Check tire tread conditions
    const tireTreadConditions = [
      record.data.tire_tread.driver_front,
      record.data.tire_tread.passenger_front,
      record.data.tire_tread.driver_rear,
      record.data.tire_tread.passenger_rear,
      record.data.tire_tread.spare
    ].flatMap(tire => [
      tire.inner_edge_condition,
      tire.inner_condition,
      tire.center_condition,
      tire.outer_condition,
      tire.outer_edge_condition
    ]);

    conditions.push(...tireTreadConditions);

    const redCount = conditions.filter(c => c === 'red').length;
    const yellowCount = conditions.filter(c => c === 'yellow').length;

    if (redCount > 0) return 'red';
    if (yellowCount > 0) return 'yellow';
    return 'green';
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

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" gutterBottom>
            Inspection History
          </Typography>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchRecords}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>

        <Paper sx={{ width: '100%', mt: 3 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>VIN</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Mileage</TableCell>
                  <TableCell>Overall Condition</TableCell>
                  <TableCell>State Inspection</TableCell>
                  <TableCell>TPMS Type</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {records
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((record) => (
                    <TableRow 
                      key={record.id}
                      onClick={() => handleViewRecord(record.id)}
                      sx={{ 
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: 'rgba(0, 0, 0, 0.04)'
                        }
                      }}
                    >
                      <TableCell>{new Date(record.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>{record.data.vin}</TableCell>
                      <TableCell>{record.user_name}</TableCell>
                      <TableCell>{record.data.mileage}</TableCell>
                      <TableCell>
                        <Chip
                          label={getOverallCondition(record)}
                          color={getOverallCondition(record) === 'green' ? 'success' : getOverallCondition(record) === 'yellow' ? 'warning' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {record.data.state_inspection_status}
                        {record.data.state_inspection_month && ` (${record.data.state_inspection_month})`}
                      </TableCell>
                      <TableCell>{record.data.tpms_type}</TableCell>
                      <TableCell>
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewRecord(record.id);
                          }}
                          size="small"
                          color="primary"
                        >
                          <VisibilityIcon />
                        </IconButton>
                        <IconButton
                          onClick={(e) => handleDeleteClick(record, e)}
                          size="small"
                          color="error"
                          disabled={isDeleting}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={records.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Paper>
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Confirm Delete
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete the inspection record for VIN{' '}
            <strong>{recordToDelete?.data.vin}</strong>?
            <br /><br />
            This action cannot be undone and will permanently remove the record and all associated data.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={isDeleting}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={16} /> : <DeleteIcon />}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification Snackbar */}
      <NotificationSnackbar
        notification={notification}
        onClose={hideNotification}
      />
    </Container>
  );
};

export default History; 