import React, { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Alert,
  Menu,
  Paper,
} from '@mui/material';
import Grid from '../CustomGrid';
import {
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  Receipt as ReceiptIcon,
  Assessment as AssessmentIcon,
  Person as PersonIcon,
  FilterList as FilterIcon,
  Close as CloseIcon,
  MonetizationOn as CashIcon,
  Description as CheckIcon,
  DirectionsCar as FleetIcon,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, startOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import { StateInspectionRecord, StateInspectionStats, StateInspectionFilters } from '../../types/stateInspection';

interface AnalyticsViewProps {
  records: StateInspectionRecord[];
  stats: StateInspectionStats | null;
  onRefresh: () => void;
}

const COLORS = ['#024FFF', '#dc004e', '#ff7300', '#387908', '#8884d8', '#82ca9d'];

const AnalyticsView: React.FC<AnalyticsViewProps> = ({ records, stats, onRefresh }) => {
  const [filterMenuAnchor, setFilterMenuAnchor] = useState<null | HTMLElement>(null);
  const [filters, setFilters] = useState<StateInspectionFilters>({});

  // Get unique creators for filter dropdown
  const uniqueCreators = useMemo(() => {
    const creators = [...new Set(records.map(record => record.createdBy))];
    return creators.sort();
  }, [records]);

  // Apply filters to records
  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      // Date range filter
      if (filters.dateFrom && record.createdDate < filters.dateFrom) return false;
      if (filters.dateTo && record.createdDate > filters.dateTo) return false;
      
      // Creator filter
      if (filters.createdBy && record.createdBy !== filters.createdBy) return false;
      
      // Payment type filter
      if (filters.paymentType && filters.paymentType !== 'All' && record.paymentType !== filters.paymentType) return false;
      
      // Status filter
      if (filters.status && filters.status !== 'All' && record.status !== filters.status) return false;
      
      return true;
    });
  }, [records, filters]);

  const handleFilterChange = (key: keyof StateInspectionFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === '' ? undefined : value
    }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const hasActiveFilters = Object.keys(filters).some(key => filters[key as keyof StateInspectionFilters]);
  
  // Calculate monthly data for the last 12 months (using filtered records)
  const monthlyData = useMemo(() => {
    const last12Months = eachMonthOfInterval({
      start: subMonths(new Date(), 11),
      end: new Date()
    });

    return last12Months.map(month => {
      const monthStart = startOfMonth(month);
      const monthKey = format(monthStart, 'yyyy-MM');
      
      const monthRecords = filteredRecords.filter(record => {
        const recordDate = format(new Date(record.createdDate), 'yyyy-MM');
        return recordDate === monthKey;
      });

      const revenue = monthRecords.reduce((sum, record) => sum + record.paymentAmount, 0);

      return {
        month: format(month, 'MMM yyyy'),
        count: monthRecords.length,
        revenue: revenue,
        cash: monthRecords.filter(r => r.paymentType === 'Cash').length,
        check: monthRecords.filter(r => r.paymentType === 'Check').length,
        fleet: monthRecords.filter(r => r.paymentType === 'Fleet').length,
      };
    });
  }, [filteredRecords]);

  // Calculate payment type distribution
  const paymentTypeData = useMemo(() => {
    const paymentCounts = filteredRecords.reduce((acc, record) => {
      acc[record.paymentType] = (acc[record.paymentType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(paymentCounts).map(([type, count]) => ({
      name: type,
      value: count,
      revenue: filteredRecords
        .filter(r => r.paymentType === type)
        .reduce((sum, r) => sum + r.paymentAmount, 0)
    }));
  }, [filteredRecords]);

  // Calculate status distribution
  const statusData = useMemo(() => {
    const statusCounts = filteredRecords.reduce((acc, record) => {
      const status = record.status || 'Pass';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status,
      value: count,
      revenue: filteredRecords
        .filter(r => (r.status || 'Pass') === status)
        .reduce((sum, r) => sum + r.paymentAmount, 0)
    }));
  }, [filteredRecords]);

  // Calculate creator performance data
  const creatorData = useMemo(() => {
    const creatorStats = filteredRecords.reduce((acc, record) => {
      if (!acc[record.createdBy]) {
        acc[record.createdBy] = { count: 0, revenue: 0 };
      }
      acc[record.createdBy].count += 1;
      acc[record.createdBy].revenue += record.paymentAmount;
      return acc;
    }, {} as Record<string, { count: number; revenue: number }>);

    return Object.entries(creatorStats)
      .map(([creator, data]) => ({
        creator,
        count: data.count,
        revenue: data.revenue,
        average: data.count > 0 ? data.revenue / data.count : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 creators
  }, [filteredRecords]);

  // Calculate key metrics
  const totalRecords = filteredRecords.length;
  const totalRevenue = filteredRecords.reduce((sum, record) => sum + record.paymentAmount, 0);
  const averagePayment = totalRecords > 0 ? totalRevenue / totalRecords : 0;
  const thisMonthRecords = filteredRecords.filter(record => {
    const recordMonth = format(new Date(record.createdDate), 'yyyy-MM');
    const currentMonth = format(new Date(), 'yyyy-MM');
    return recordMonth === currentMonth;
  }).length;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6">
            Analytics Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Showing {totalRecords} of {records.length} records
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton
            onClick={(e) => setFilterMenuAnchor(e.currentTarget)}
            color={hasActiveFilters ? 'primary' : 'default'}
            title="Filters"
          >
            <FilterIcon />
          </IconButton>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={onRefresh}
          >
            Refresh Data
          </Button>
        </Box>
      </Box>

      {/* Active filters display */}
      {hasActiveFilters && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
          {filters.dateFrom && (
            <Chip
              label={`From: ${filters.dateFrom}`}
              onDelete={() => handleFilterChange('dateFrom', '')}
              size="small"
            />
          )}
          {filters.dateTo && (
            <Chip
              label={`To: ${filters.dateTo}`}
              onDelete={() => handleFilterChange('dateTo', '')}
              size="small"
            />
          )}
          {filters.createdBy && (
            <Chip
              label={`Creator: ${filters.createdBy}`}
              onDelete={() => handleFilterChange('createdBy', '')}
              size="small"
            />
          )}
          {filters.paymentType && filters.paymentType !== 'All' && (
            <Chip
              label={`Payment: ${filters.paymentType}`}
              onDelete={() => handleFilterChange('paymentType', '')}
              size="small"
            />
          )}
          {filters.status && filters.status !== 'All' && (
            <Chip
              label={`Status: ${filters.status}`}
              onDelete={() => handleFilterChange('status', '')}
              size="small"
            />
          )}
          <Chip
            label="Clear All"
            onClick={clearFilters}
            size="small"
            variant="outlined"
            color="secondary"
          />
        </Box>
      )}

      {/* Key Metrics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="overline">
                    Total Records
                  </Typography>
                  <Typography variant="h4" component="div">
                    {totalRecords}
                  </Typography>
                </Box>
                <AssessmentIcon sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="overline">
                    Total Revenue
                  </Typography>
                  <Typography variant="h4" component="div">
                    ${totalRevenue.toLocaleString()}
                  </Typography>
                </Box>
                <ReceiptIcon sx={{ fontSize: 40, color: 'success.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="overline">
                    Average Payment
                  </Typography>
                  <Typography variant="h4" component="div">
                    ${averagePayment.toFixed(2)}
                  </Typography>
                </Box>
                <TrendingUpIcon sx={{ fontSize: 40, color: 'info.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="text.secondary" gutterBottom variant="overline">
                    This Month
                  </Typography>
                  <Typography variant="h4" component="div">
                    {thisMonthRecords}
                  </Typography>
                </Box>
                <PersonIcon sx={{ fontSize: 40, color: 'warning.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        {/* Monthly Revenue and Record Count Chart */}
        <Grid xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Monthly Revenue and Record Count
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="count" stroke="#024FFF" strokeWidth={3} name="Record Count" />
                  <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#dc004e" strokeWidth={3} name="Revenue ($)" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Payment Type Distribution */}
        <Grid xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Payment Type Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={paymentTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {paymentTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value, `${name} Records`]} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Status Distribution */}
        <Grid xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Status Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => {
                      const statusColors = { 'Pass': '#387908', 'Retest': '#ff7300', 'Fail': '#ff0000' };
                      return (
                        <Cell key={`cell-${index}`} fill={statusColors[entry.name as keyof typeof statusColors] || COLORS[index % COLORS.length]} />
                      );
                    })}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value, `${name} Records`]} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Top Creators Performance */}
        <Grid xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Top Creators by Record Count
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={creatorData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="creator" type="category" width={120} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#024FFF" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Monthly Payment Type Breakdown */}
        <Grid xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Monthly Payment Type Breakdown
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="cash" stackId="a" fill="#387908" name="Cash" />
                  <Bar dataKey="check" stackId="a" fill="#024FFF" name="Check" />
                  <Bar dataKey="fleet" stackId="a" fill="#ff7300" name="Fleet" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Payment Type Summary */}
        <Grid xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Payment Type Summary
              </Typography>
              <Grid container spacing={2}>
                {paymentTypeData.map((type, index) => (
                  <Grid key={type.name} xs={12}>
                    <Box sx={{ 
                      p: 2, 
                      border: 1, 
                      borderColor: 'divider', 
                      borderRadius: 1,
                      bgcolor: 'background.paper'
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Box sx={{
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          bgcolor: COLORS[index % COLORS.length]
                        }} />
                        <Typography variant="h6">
                          {type.name}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Records: {type.value}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Revenue: ${type.revenue.toLocaleString()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Average: ${type.value > 0 ? (type.revenue / type.value).toFixed(2) : '0.00'}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Status Summary */}
        <Grid xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Status Summary
              </Typography>
              <Grid container spacing={2}>
                {statusData.map((status, index) => {
                  const statusColors = { 'Pass': '#387908', 'Retest': '#ff7300', 'Fail': '#ff0000' };
                  return (
                    <Grid key={status.name} xs={12}>
                      <Box sx={{ 
                        p: 2, 
                        border: 1, 
                        borderColor: 'divider', 
                        borderRadius: 1,
                        bgcolor: 'background.paper'
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Box sx={{
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            bgcolor: statusColors[status.name as keyof typeof statusColors] || COLORS[index % COLORS.length]
                          }} />
                          <Typography variant="h6">
                            {status.name}
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          Records: {status.value}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Revenue: ${status.revenue.toLocaleString()}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Average: ${status.value > 0 ? (status.revenue / status.value).toFixed(2) : '0.00'}
                        </Typography>
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter Menu */}
      <Menu
        anchorEl={filterMenuAnchor}
        open={Boolean(filterMenuAnchor)}
        onClose={() => setFilterMenuAnchor(null)}
        PaperProps={{
          sx: { width: 350, maxHeight: 500 }
        }}
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Filter Analytics
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Date Range */}
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Date Range
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="From Date"
                  type="date"
                  value={filters.dateFrom || ''}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                  size="small"
                />
                <TextField
                  label="To Date"
                  type="date"
                  value={filters.dateTo || ''}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                  size="small"
                />
              </Box>
            </Box>

            {/* Creator Filter */}
            <FormControl fullWidth size="small">
              <InputLabel>Creator</InputLabel>
              <Select
                value={filters.createdBy || ''}
                label="Creator"
                onChange={(e) => handleFilterChange('createdBy', e.target.value)}
              >
                <MenuItem value="">All Creators</MenuItem>
                {uniqueCreators.map((creator) => (
                  <MenuItem key={creator} value={creator}>
                    {creator}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Payment Type Filter */}
            <FormControl fullWidth size="small">
              <InputLabel>Payment Type</InputLabel>
              <Select
                value={filters.paymentType || 'All'}
                label="Payment Type"
                onChange={(e) => handleFilterChange('paymentType', e.target.value)}
              >
                <MenuItem value="All">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    All Payment Types
                  </Box>
                </MenuItem>
                <MenuItem value="Cash">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CashIcon sx={{ fontSize: 18, color: 'success.main' }} />
                    Cash
                  </Box>
                </MenuItem>
                <MenuItem value="Check">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckIcon sx={{ fontSize: 18, color: 'info.main' }} />
                    Check
                  </Box>
                </MenuItem>
                <MenuItem value="Fleet">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FleetIcon sx={{ fontSize: 18, color: 'warning.main' }} />
                    Fleet
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            {/* Status Filter */}
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status || 'All'}
                label="Status"
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <MenuItem value="All">All Statuses</MenuItem>
                <MenuItem value="Pass">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ 
                      width: 12, 
                      height: 12, 
                      borderRadius: '50%', 
                      bgcolor: 'success.main' 
                    }} />
                    Pass
                  </Box>
                </MenuItem>
                <MenuItem value="Retest">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ 
                      width: 12, 
                      height: 12, 
                      borderRadius: '50%', 
                      bgcolor: 'warning.main' 
                    }} />
                    Retest
                  </Box>
                </MenuItem>
                <MenuItem value="Fail">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ 
                      width: 12, 
                      height: 12, 
                      borderRadius: '50%', 
                      bgcolor: 'error.main' 
                    }} />
                    Fail
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            {/* Clear Filters Button */}
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => {
                clearFilters();
                setFilterMenuAnchor(null);
              }}
              disabled={!hasActiveFilters}
              fullWidth
              size="small"
            >
              Clear All Filters
            </Button>

            {/* Summary */}
            {hasActiveFilters && (
              <Alert severity="info" sx={{ mt: 1 }}>
                Showing {totalRecords} of {records.length} total records
              </Alert>
            )}
          </Box>
        </Box>
      </Menu>
    </Box>
  );
};

export default AnalyticsView; 