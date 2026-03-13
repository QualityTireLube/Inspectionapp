import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Stack,
  Alert,
  CircularProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  Grid,
  Collapse,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Print as PrintIcon,
  FilterList as FilterIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Cancel as CancelIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import PrintApiService from '../services/printApi';

// Get base URL for API (same pattern as other services)
const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) return envUrl;
  
  const hostname = window.location.hostname;
  
  // Production: use api.autoflopro.com subdomain
  if (hostname === 'autoflopro.com' || hostname === 'www.autoflopro.com') {
    return 'https://api.autoflopro.com';
  }
  
  const protocol = window.location.protocol;
  return `${protocol}//${hostname}:5001`;
};

const API_BASE = getApiBaseUrl();
import { useNotification } from '../hooks/useNotification';

// Types
interface ArchivedJob {
  id: string;
  formName: string;
  printerId: string;
  printerName: string;
  printClientId: string;
  printClientName: string;
  configuration: any;
  jobData: any;
  options: any;
  status: 'completed' | 'failed' | 'cancelled';
  priority: string;
  errorMessage: string | null;
  retryCount: number;
  locationId: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string;
  archivedAt: string;
}

interface ArchiveStats {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  byFormName: { form_name: string; count: number }[];
  byPrinter: { printer_name: string; count: number }[];
  byClient: { print_client_name: string; count: number }[];
  byStatus: { status: string; count: number }[];
}

interface PrinterOption {
  id: string;
  name: string;
  clientId: string;
  clientName: string;
  online?: boolean;
}

interface PrintClientOption {
  clientId: string;
  name: string;
  online: boolean;
  printers: PrinterOption[];
}

const PrintQueueArchive: React.FC = () => {
  const { showNotification } = useNotification();
  
  // State
  const [jobs, setJobs] = useState<ArchivedJob[]>([]);
  const [stats, setStats] = useState<ArchiveStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalJobs, setTotalJobs] = useState(0);
  
  // Filters
  const [showFilters, setShowFilters] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [formNameFilter, setFormNameFilter] = useState<string>('');
  const [printerFilter, setPrinterFilter] = useState<string>('');
  const [clientFilter, setClientFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  // Grouping
  const [groupBy, setGroupBy] = useState<string>('none');
  const [viewMode, setViewMode] = useState<'list' | 'grouped'>('list');
  
  // Reprint dialog
  const [reprintDialogOpen, setReprintDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<ArchivedJob | null>(null);
  const [availablePrinters, setAvailablePrinters] = useState<PrinterOption[]>([]);
  const [availableClients, setAvailableClients] = useState<PrintClientOption[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedPrinterId, setSelectedPrinterId] = useState<string>('');
  const [reprinting, setReprinting] = useState(false);
  
  // Job details dialog
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [detailsJob, setDetailsJob] = useState<ArchivedJob | null>(null);

  // Fetch archived jobs
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (formNameFilter) params.append('formName', formNameFilter);
      if (printerFilter) params.append('printerId', printerFilter);
      if (clientFilter) params.append('printClientId', clientFilter);
      if (startDate) params.append('startDate', new Date(startDate).toISOString());
      if (endDate) params.append('endDate', new Date(endDate).toISOString());
      params.append('limit', rowsPerPage.toString());
      params.append('offset', (page * rowsPerPage).toString());
      
      const response = await fetch(`${API_BASE}/api/print/archive?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to fetch archived jobs');
      
      const data = await response.json();
      setJobs(data.jobs);
      setTotalJobs(data.total);
    } catch (err: any) {
      setError(err.message || 'Failed to load archived jobs');
      console.error('Error fetching archived jobs:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, formNameFilter, printerFilter, clientFilter, startDate, endDate, page, rowsPerPage]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', new Date(startDate).toISOString());
      if (endDate) params.append('endDate', new Date(endDate).toISOString());
      
      const response = await fetch(`${API_BASE}/api/print/archive/stats?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to fetch stats');
      
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, [startDate, endDate]);

  // Fetch available printers for reprint
  const fetchPrinters = async () => {
    try {
      const printers = await PrintApiService.getPrinters();
      const clients = await PrintApiService.getPrintClients();
      
      // Create printer options
      const printerOptions: PrinterOption[] = printers.map(p => {
        const client = clients.find(c => c.clientId === p.printClientId);
        return {
          id: p.id,
          name: p.name,
          clientId: p.printClientId || '',
          clientName: client?.name || 'Unknown Client',
          online: p.status === 'online',
        };
      });
      
      // Group printers by client
      const clientOptions: PrintClientOption[] = clients.map(c => ({
        clientId: c.clientId,
        name: c.name,
        online: c.status === 'online',
        printers: printerOptions.filter(p => p.clientId === c.clientId),
      })).filter(c => c.printers.length > 0); // Only show clients with printers
      
      setAvailablePrinters(printerOptions);
      setAvailableClients(clientOptions);
    } catch (err) {
      console.error('Error fetching printers:', err);
    }
  };

  useEffect(() => {
    fetchJobs();
    fetchStats();
  }, [fetchJobs, fetchStats]);

  useEffect(() => {
    fetchPrinters();
  }, []);

  // Handle reprint
  const handleReprintClick = (job: ArchivedJob) => {
    setSelectedJob(job);
    // Try to pre-select the original client and printer
    const originalPrinter = availablePrinters.find(p => p.id === job.printerId);
    if (originalPrinter) {
      setSelectedClientId(originalPrinter.clientId);
      setSelectedPrinterId(job.printerId);
    } else {
      setSelectedClientId('');
      setSelectedPrinterId('');
    }
    setReprintDialogOpen(true);
  };

  // Handle client selection change
  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    setSelectedPrinterId(''); // Reset printer when client changes
  };

  // Get printers for selected client
  const getPrintersForSelectedClient = () => {
    const client = availableClients.find(c => c.clientId === selectedClientId);
    return client?.printers || [];
  };

  const handleReprint = async () => {
    if (!selectedJob || !selectedPrinterId) return;
    
    setReprinting(true);
    try {
      // Submit a new print job based on the archived job
      const selectedPrinter = availablePrinters.find(p => p.id === selectedPrinterId);
      
      await PrintApiService.submitPrintJob({
        formName: selectedJob.formName,
        jobData: selectedJob.jobData,
        options: {
          ...selectedJob.options,
          priority: 'normal',
        },
      });
      
      showNotification(`Reprint job submitted to ${selectedPrinter?.name || 'printer'}`, 'success');
      setReprintDialogOpen(false);
    } catch (err: any) {
      showNotification(err.message || 'Failed to reprint', 'error');
    } finally {
      setReprinting(false);
    }
  };

  // Handle view details
  const handleViewDetails = (job: ArchivedJob) => {
    setDetailsJob(job);
    setDetailsDialogOpen(true);
  };

  // Clear filters
  const handleClearFilters = () => {
    setStatusFilter('');
    setFormNameFilter('');
    setPrinterFilter('');
    setClientFilter('');
    setStartDate('');
    setEndDate('');
    setPage(0);
  };

  // Get status chip
  const getStatusChip = (status: string) => {
    switch (status) {
      case 'completed':
        return <Chip icon={<CheckCircleIcon />} label="Completed" color="success" size="small" />;
      case 'failed':
        return <Chip icon={<ErrorIcon />} label="Failed" color="error" size="small" />;
      case 'cancelled':
        return <Chip icon={<CancelIcon />} label="Cancelled" color="warning" size="small" />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  // Get form name display
  const getFormNameDisplay = (formName: string) => {
    switch (formName) {
      case 'stickers':
        return 'Static Sticker';
      case 'labels':
        return 'Label';
      default:
        return formName;
    }
  };

  // Group jobs by selected field
  const getGroupedJobs = () => {
    if (groupBy === 'none') return { 'All Jobs': jobs };
    
    const grouped: Record<string, ArchivedJob[]> = {};
    jobs.forEach(job => {
      let key = '';
      switch (groupBy) {
        case 'status':
          key = job.status;
          break;
        case 'formName':
          key = getFormNameDisplay(job.formName);
          break;
        case 'printer':
          key = job.printerName || 'Unknown Printer';
          break;
        case 'client':
          key = job.printClientName || 'Unknown Client';
          break;
        case 'date':
          key = new Date(job.completedAt).toLocaleDateString();
          break;
        default:
          key = 'Other';
      }
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(job);
    });
    
    return grouped;
  };

  // Format date
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString();
  };

  return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PrintIcon /> Print Queue Archive
        </Typography>
        
        {/* Stats Cards */}
        {stats && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>Total Jobs</Typography>
                  <Typography variant="h4">{stats.totalJobs}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderLeft: '4px solid', borderLeftColor: 'success.main' }}>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>Completed</Typography>
                  <Typography variant="h4" color="success.main">{stats.completedJobs}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderLeft: '4px solid', borderLeftColor: 'error.main' }}>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>Failed</Typography>
                  <Typography variant="h4" color="error.main">{stats.failedJobs}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>Success Rate</Typography>
                  <Typography variant="h4">
                    {stats.totalJobs > 0 
                      ? `${Math.round((stats.completedJobs / stats.totalJobs) * 100)}%`
                      : '-'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: showFilters ? 2 : 0 }}>
            <Button
              startIcon={showFilters ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              onClick={() => setShowFilters(!showFilters)}
            >
              <FilterIcon sx={{ mr: 1 }} /> Filters
            </Button>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(e, v) => v && setViewMode(v)}
                size="small"
              >
                <ToggleButton value="list">
                  <ViewListIcon />
                </ToggleButton>
                <ToggleButton value="grouped">
                  <ViewModuleIcon />
                </ToggleButton>
              </ToggleButtonGroup>
              <Button
                startIcon={<RefreshIcon />}
                onClick={() => { fetchJobs(); fetchStats(); }}
                disabled={loading}
              >
                Refresh
              </Button>
            </Box>
          </Box>
          
          <Collapse in={showFilters}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Status"
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="completed">Completed</MenuItem>
                    <MenuItem value="failed">Failed</MenuItem>
                    <MenuItem value="cancelled">Cancelled</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={formNameFilter}
                    label="Type"
                    onChange={(e) => { setFormNameFilter(e.target.value); setPage(0); }}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="stickers">Stickers</MenuItem>
                    <MenuItem value="labels">Labels</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Printer</InputLabel>
                  <Select
                    value={printerFilter}
                    label="Printer"
                    onChange={(e) => { setPrinterFilter(e.target.value); setPage(0); }}
                  >
                    <MenuItem value="">All</MenuItem>
                    {availablePrinters.map(p => (
                      <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  label="Start Date"
                  type="date"
                  size="small"
                  fullWidth
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPage(0); }}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  label="End Date"
                  type="date"
                  size="small"
                  fullWidth
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPage(0); }}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Group By</InputLabel>
                  <Select
                    value={groupBy}
                    label="Group By"
                    onChange={(e) => setGroupBy(e.target.value)}
                  >
                    <MenuItem value="none">None</MenuItem>
                    <MenuItem value="status">Status</MenuItem>
                    <MenuItem value="formName">Type</MenuItem>
                    <MenuItem value="printer">Printer</MenuItem>
                    <MenuItem value="client">Print Client</MenuItem>
                    <MenuItem value="date">Date</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <Button variant="outlined" onClick={handleClearFilters} size="small">
                  Clear Filters
                </Button>
              </Grid>
            </Grid>
          </Collapse>
        </Paper>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Loading */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Jobs Table */}
        {!loading && (
          <>
            {viewMode === 'list' ? (
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Status</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Printer</TableCell>
                      <TableCell>Print Client</TableCell>
                      <TableCell>Completed</TableCell>
                      <TableCell>Error</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {jobs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          <Typography color="text.secondary" sx={{ py: 4 }}>
                            No archived jobs found
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      jobs.map((job) => (
                        <TableRow key={job.id} hover>
                          <TableCell>{getStatusChip(job.status)}</TableCell>
                          <TableCell>{getFormNameDisplay(job.formName)}</TableCell>
                          <TableCell>{job.printerName || '-'}</TableCell>
                          <TableCell>{job.printClientName || '-'}</TableCell>
                          <TableCell>{formatDate(job.completedAt)}</TableCell>
                          <TableCell>
                            {job.errorMessage ? (
                              <Tooltip title={job.errorMessage}>
                                <Typography 
                                  variant="body2" 
                                  color="error"
                                  sx={{ 
                                    maxWidth: 200, 
                                    overflow: 'hidden', 
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {job.errorMessage}
                                </Typography>
                              </Tooltip>
                            ) : '-'}
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="View Details">
                              <IconButton size="small" onClick={() => handleViewDetails(job)}>
                                <InfoIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Reprint">
                              <IconButton 
                                size="small" 
                                onClick={() => handleReprintClick(job)}
                                color="primary"
                              >
                                <PrintIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                <TablePagination
                  component="div"
                  count={totalJobs}
                  page={page}
                  onPageChange={(e, newPage) => setPage(newPage)}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={(e) => {
                    setRowsPerPage(parseInt(e.target.value, 10));
                    setPage(0);
                  }}
                  rowsPerPageOptions={[10, 25, 50, 100]}
                />
              </TableContainer>
            ) : (
              // Grouped View
              <Box>
                {Object.entries(getGroupedJobs()).map(([group, groupJobs]) => (
                  <Paper key={group} sx={{ mb: 2 }}>
                    <Box sx={{ p: 2, bgcolor: 'grey.100', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="h6">{group}</Typography>
                      <Chip label={`${groupJobs.length} jobs`} size="small" />
                    </Box>
                    <Divider />
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Status</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Printer</TableCell>
                          <TableCell>Print Client</TableCell>
                          <TableCell>Completed</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {groupJobs.map((job) => (
                          <TableRow key={job.id} hover>
                            <TableCell>{getStatusChip(job.status)}</TableCell>
                            <TableCell>{getFormNameDisplay(job.formName)}</TableCell>
                            <TableCell>{job.printerName || '-'}</TableCell>
                            <TableCell>{job.printClientName || '-'}</TableCell>
                            <TableCell>{formatDate(job.completedAt)}</TableCell>
                            <TableCell align="right">
                              <Tooltip title="View Details">
                                <IconButton size="small" onClick={() => handleViewDetails(job)}>
                                  <InfoIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Reprint">
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleReprintClick(job)}
                                  color="primary"
                                >
                                  <PrintIcon />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Paper>
                ))}
              </Box>
            )}
          </>
        )}

        {/* Reprint Dialog */}
        <Dialog open={reprintDialogOpen} onClose={() => setReprintDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Reprint Job</DialogTitle>
          <DialogContent>
            {selectedJob && (
              <Box sx={{ pt: 1 }}>
                {/* Original Job Info */}
                <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="subtitle2" gutterBottom>Original Job Details</Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Type</Typography>
                      <Typography variant="body2">{getFormNameDisplay(selectedJob.formName)}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Status</Typography>
                      <Box>{getStatusChip(selectedJob.status)}</Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Original Printer</Typography>
                      <Typography variant="body2">{selectedJob.printerName || 'Unknown'}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Original Client</Typography>
                      <Typography variant="body2">{selectedJob.printClientName || 'Unknown'}</Typography>
                    </Grid>
                    {selectedJob.errorMessage && (
                      <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary">Error</Typography>
                        <Alert severity="error" sx={{ mt: 0.5, py: 0 }}>
                          <Typography variant="body2">{selectedJob.errorMessage}</Typography>
                        </Alert>
                      </Grid>
                    )}
                  </Grid>
                </Paper>

                <Divider sx={{ my: 2 }} />
                
                <Typography variant="subtitle2" gutterBottom>Select New Destination</Typography>
                
                {/* Print Client Selection */}
                <FormControl fullWidth sx={{ mt: 2 }}>
                  <InputLabel>Print Client</InputLabel>
                  <Select
                    value={selectedClientId}
                    label="Print Client"
                    onChange={(e) => handleClientChange(e.target.value)}
                  >
                    {availableClients.map(client => (
                      <MenuItem key={client.clientId} value={client.clientId}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip 
                            size="small" 
                            label={client.online ? 'Online' : 'Offline'} 
                            color={client.online ? 'success' : 'default'}
                            sx={{ minWidth: 60 }}
                          />
                          {client.name}
                          <Typography variant="caption" color="text.secondary">
                            ({client.printers.length} printer{client.printers.length !== 1 ? 's' : ''})
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Printer Selection (only show when client is selected) */}
                {selectedClientId && (
                  <FormControl fullWidth sx={{ mt: 2 }}>
                    <InputLabel>Printer</InputLabel>
                    <Select
                      value={selectedPrinterId}
                      label="Printer"
                      onChange={(e) => setSelectedPrinterId(e.target.value)}
                    >
                      {getPrintersForSelectedClient().map(printer => (
                        <MenuItem key={printer.id} value={printer.id}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip 
                              size="small" 
                              label={printer.online ? 'Online' : 'Offline'} 
                              color={printer.online ? 'success' : 'default'}
                              sx={{ minWidth: 60 }}
                            />
                            {printer.name}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                {/* Selection Summary */}
                {selectedPrinterId && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      Job will be sent to <strong>{availablePrinters.find(p => p.id === selectedPrinterId)?.name}</strong> on <strong>{availableClients.find(c => c.clientId === selectedClientId)?.name}</strong>
                    </Typography>
                  </Alert>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setReprintDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleReprint} 
              variant="contained" 
              disabled={!selectedPrinterId || reprinting}
              startIcon={reprinting ? <CircularProgress size={16} /> : <PrintIcon />}
            >
              {reprinting ? 'Reprinting...' : 'Reprint'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Job Details Dialog */}
        <Dialog open={detailsDialogOpen} onClose={() => setDetailsDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Job Details</DialogTitle>
          <DialogContent>
            {detailsJob && (
              <Box sx={{ pt: 1 }}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Job ID</Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{detailsJob.id}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Status</Typography>
                    <Box>{getStatusChip(detailsJob.status)}</Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Type</Typography>
                    <Typography variant="body2">{getFormNameDisplay(detailsJob.formName)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Priority</Typography>
                    <Typography variant="body2">{detailsJob.priority}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Printer</Typography>
                    <Typography variant="body2">{detailsJob.printerName || '-'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Print Client</Typography>
                    <Typography variant="body2">{detailsJob.printClientName || '-'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Created</Typography>
                    <Typography variant="body2">{formatDate(detailsJob.createdAt)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">Completed</Typography>
                    <Typography variant="body2">{formatDate(detailsJob.completedAt)}</Typography>
                  </Grid>
                  {detailsJob.errorMessage && (
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary">Error Message</Typography>
                      <Alert severity="error" sx={{ mt: 0.5 }}>{detailsJob.errorMessage}</Alert>
                    </Grid>
                  )}
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">Job Data</Typography>
                    <Paper sx={{ p: 1, mt: 0.5, bgcolor: 'grey.50', maxHeight: 200, overflow: 'auto' }}>
                      <pre style={{ margin: 0, fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify(detailsJob.jobData, null, 2)}
                      </pre>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
            {detailsJob && (
              <Button 
                onClick={() => {
                  setDetailsDialogOpen(false);
                  handleReprintClick(detailsJob);
                }}
                variant="contained"
                startIcon={<PrintIcon />}
              >
                Reprint
              </Button>
            )}
          </DialogActions>
        </Dialog>
      </Box>
  );
};

export default PrintQueueArchive;
