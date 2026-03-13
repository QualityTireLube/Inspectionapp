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
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import api from '../services/api';

interface QuickCheckData {
  exterior?: {
    inputs?: {
      condition?: string;
      front_tires?: string;
      rear_tires?: string;
      brake_pads?: string;
    };
  };
  interior?: {
    inputs?: {
      condition?: string;
      dash_lights?: string;
      windshield?: string;
      mileage?: number;
    };
  };
  engine?: {
    inputs?: {
      condition?: string;
      oil_level?: string;
      coolant_level?: string;
    };
  };
  vehicle_info?: {
    inputs?: {
      vin?: string;
      date?: string;
    };
  };
}

interface QuickCheck {
  id: number;
  user: string;
  title: string;
  data: QuickCheckData;
  timestamp: string;
}

const InspectionRecords: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [records, setRecords] = useState<QuickCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const response = await api.quickChecks.getHistory();
        setRecords(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching records:', err);
        setError('Failed to load records');
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

  const handleViewDetails = (record: QuickCheck) => {
    navigate(`/quick-check/${record.id}`);
  };

  const getOverallCondition = (data: QuickCheckData): string => {
    const conditions = [
      data.exterior?.inputs?.condition,
      data.interior?.inputs?.condition,
      data.engine?.inputs?.condition
    ].filter(Boolean);

    if (conditions.length === 0) return 'Unknown';
    
    const hasPoor = conditions.some(c => c?.toLowerCase().includes('poor'));
    const hasFair = conditions.some(c => c?.toLowerCase().includes('fair'));
    
    if (hasPoor) return 'Poor';
    if (hasFair) return 'Fair';
    return 'Good';
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography color="error">{error}</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/')}
          sx={{ mb: 2 }}
        >
          Back to Home
        </Button>

        <Typography variant="h4" component="h1" gutterBottom align="center">
          Inspection Records
        </Typography>

        <Paper elevation={3} sx={{ mt: 2 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>VIN</TableCell>
                  <TableCell>Inspector</TableCell>
                  <TableCell>Mileage</TableCell>
                  <TableCell>Condition</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {records
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((record) => {
                    const condition = getOverallCondition(record.data);
                    const mileage = record.data.interior?.inputs?.mileage;
                    const vin = record.data.vehicle_info?.inputs?.vin;
                    
                    return (
                      <TableRow key={record.id}>
                        <TableCell>{record.title}</TableCell>
                        <TableCell>{vin || 'N/A'}</TableCell>
                        <TableCell>{record.user}</TableCell>
                        <TableCell>{mileage ? `${mileage.toLocaleString()} mi` : 'N/A'}</TableCell>
                        <TableCell>
                          <Chip 
                            label={condition}
                            color={
                              condition === 'Good' ? 'success' :
                              condition === 'Fair' ? 'warning' :
                              condition === 'Poor' ? 'error' : 'default'
                            }
                          />
                        </TableCell>
                        <TableCell>{new Date(record.timestamp).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => handleViewDetails(record)}
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
    </Container>
  );
};

export default InspectionRecords; 