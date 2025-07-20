import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Button,
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
  IconButton
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import api, { getActiveQuickChecks, getSubmittedQuickChecks } from '../services/api';
import { quickCheckApi } from '../services/quickCheckApi';

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

const QuickCheckRecords: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [inProgressRecords, setInProgressRecords] = useState<QuickCheck[]>([]);
  const [submittedRecords, setSubmittedRecords] = useState<QuickCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecords = async () => {
      setLoading(true);
      try {
        const [inProgress, submitted] = await Promise.all([
          getActiveQuickChecks(),
          getSubmittedQuickChecks()
        ]);
        setInProgressRecords(inProgress);
        setSubmittedRecords(submitted);
      } catch (err: any) {
        console.error('Error fetching records:', err);
        setError(err.message || 'Failed to fetch records');
      } finally {
        setLoading(false);
      }
    };
    fetchRecords();
  }, []);

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

  const handleDeleteRecord = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    try {
      await quickCheckApi.delete(id);
      setInProgressRecords((prev) => prev.filter((record) => record.id !== id));
      setSubmittedRecords((prev) => prev.filter((record) => record.id !== id));
    } catch (err) {
      alert('Failed to delete record.');
    }
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
    <Container>
      <Box sx={{ my: 2 }}>
        <Typography variant="h4" gutterBottom>
          Quick Check Inspections
        </Typography>
        {loading && <CircularProgress />}
        {error && <Alert severity="error">{error}</Alert>}
        {/* In Progress Section */}
        <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>In Progress</Typography>
        {inProgressRecords.length === 0 ? (
          <Typography color="text.secondary">No in-progress checklists.</Typography>
        ) : (
          <TableContainer component={Paper} sx={{ mb: 4 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>VIN</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {inProgressRecords.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{record.data.vin}</TableCell>
                    <TableCell>{record.user_name}</TableCell>
                    <TableCell>{record.data.date}</TableCell>
                    <TableCell><Chip label="In Progress" color="warning" /></TableCell>
                    <TableCell>
                      <IconButton onClick={() => navigate(`/quick-check/${record.id}`)}><VisibilityIcon /></IconButton>
                      <IconButton onClick={() => handleDeleteRecord(record.id)}><DeleteIcon /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        {/* Submitted Section */}
        <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>Submitted</Typography>
        {submittedRecords.length === 0 ? (
          <Typography color="text.secondary">No submitted checklists.</Typography>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>VIN</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {submittedRecords.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{record.data.vin}</TableCell>
                    <TableCell>{record.user_name}</TableCell>
                    <TableCell>{record.data.date}</TableCell>
                    <TableCell><Chip label="Submitted" color="success" /></TableCell>
                    <TableCell>
                      <IconButton onClick={() => navigate(`/quick-check/${record.id}`)}><VisibilityIcon /></IconButton>
                      <IconButton onClick={() => handleDeleteRecord(record.id)}><DeleteIcon /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        <TablePagination
          component="div"
          count={inProgressRecords.length + submittedRecords.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Box>
    </Container>
  );
};

export default QuickCheckRecords; 