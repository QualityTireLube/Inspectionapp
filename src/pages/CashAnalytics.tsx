import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Analytics as AnalyticsIcon,
} from '@mui/icons-material';
import Grid from '../components/CustomGrid';
import { getCashAnalytics } from '../services/cashManagementApi';
import { useCashManagementStore } from '../stores/cashManagementStore';

const CashAnalytics: React.FC = () => {
  const { analytics, setAnalytics } = useCashManagementStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      const analyticsData = await getCashAnalytics();
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error loading analytics:', error);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <AnalyticsIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
          <Typography variant="h4" component="h1">
            Cash Management Analytics
          </Typography>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={60} />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {/* Summary Cards */}
            <Grid item xs={12} sm={6} md={3}>
              <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="h4" color="success.main">
                  {formatCurrency(0)}
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                  Total Cash In
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="h4" color="error.main">
                  {formatCurrency(0)}
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                  Total Cash Out
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="h4" color="primary.main">
                  {formatCurrency(0)}
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                  Net Cash Flow
                </Typography>
              </Paper>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="h4" color="warning.main">
                  {formatCurrency(0)}
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                  Total Discrepancies
                </Typography>
              </Paper>
            </Grid>

            {/* Charts Placeholder */}
            <Grid item xs={12}>
              <Paper elevation={2} sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Analytics Dashboard
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Cash management analytics and charts will be displayed here.
                  This includes drawer totals over time, cash in/out trends, and discrepancy reports.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        )}
      </Box>
    </Container>
  );
};

export default CashAnalytics; 