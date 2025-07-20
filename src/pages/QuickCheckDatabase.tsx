import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Snackbar,
  TextField,
  InputAdornment,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ImageList,
  ImageListItem,
  ImageListItemBar
} from '@mui/material';
import Grid from '../components/CustomGrid';
import {
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Archive as ArchiveIcon,
  Unarchive as UnarchiveIcon,
  Download as DownloadIcon,
  FilterList as FilterIcon,
  Timer as TimerIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { 
  getQuickChecks, 
  deleteQuickCheck, 
  archiveQuickCheck, 
  updateQuickCheckStatus,
  getTimingSummary,
  getUploadUrl 
} from '../services/api';

interface QuickCheckRecord {
  id: number;
  user_email: string;
  user_name: string;
  title: string;
  data: any;
  created_at: string;
  updated_at: string;
  saved_at?: string;
  duration_seconds: number;
  status: string;
  archived_at?: string;
  archived_by?: string;
  archived_by_name?: string;
  // Timing fields
  tab_info_start?: string;
  tab_info_end?: string;
  tab_info_duration?: number;
  tab_pulling_start?: string;
  tab_pulling_end?: string;
  tab_pulling_duration?: number;
  tab_underhood_start?: string;
  tab_underhood_end?: string;
  tab_underhood_duration?: number;
  tab_tires_start?: string;
  tab_tires_end?: string;
  tab_tires_duration?: number;
  submitted_to_archived_duration?: number;
  created_to_archived_duration?: number;
}

interface ImageUpload {
  file?: File;
  progress?: number;
  url?: string;
  error?: string;
  position?: number;
  isDeleted?: boolean;
}

interface TimingData {
  id: number;
  status: string;
  totalDuration: number;
  tabTimings: {
    info: {
      start: string;
      end: string;
      duration: number;
      isActive: boolean;
    };
    pulling: {
      start: string;
      end: string;
      duration: number;
      isActive: boolean;
    };
    underhood: {
      start: string;
      end: string;
      duration: number;
      isActive: boolean;
    };
    tires: {
      start: string;
      end: string;
      duration: number;
      isActive: boolean;
    };
  };
  durations: {
    createdToSubmitted: number;
    submittedToArchived: number;
    createdToArchived: number;
  };
  timestamps: {
    created: string;
    updated: string;
    archived?: string;
  };
}

const QuickCheckDatabase: React.FC = () => {
  const [records, setRecords] = useState<QuickCheckRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<QuickCheckRecord | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<QuickCheckRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  // Timing state
  const [timingData, setTimingData] = useState<TimingData | null>(null);
  const [showTimingDialog, setShowTimingDialog] = useState(false);
  const [timingLoading, setTimingLoading] = useState(false);

  // Slideshow state
  const [slideshowOpen, setSlideshowOpen] = useState(false);
  const [slideshowImages, setSlideshowImages] = useState<{ url: string; title: string; subtitle: string }[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);



  const fetchRecords = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching records using API service...');
      
      const data = await getQuickChecks();
      console.log('✅ Records fetched successfully, count:', data.length);
      setRecords(data as QuickCheckRecord[]);
    } catch (err) {
      console.error('❌ fetchRecords error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleDelete = async (record: QuickCheckRecord) => {
    setRecordToDelete(record);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!recordToDelete) return;

    try {
      await deleteQuickCheck(recordToDelete.id);
      setRecords(records.filter(r => r.id !== recordToDelete.id));
      setSnackbar({
        open: true,
        message: 'Record deleted successfully',
        severity: 'success'
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to delete record',
        severity: 'error'
      });
    } finally {
      setDeleteDialogOpen(false);
      setRecordToDelete(null);
    }
  };

  const handleArchive = async (record: QuickCheckRecord) => {
    try {
      await archiveQuickCheck(record.id);

      // Update the record in the list
      setRecords(records.map(r => 
        r.id === record.id 
          ? { ...r, status: 'archived', archived_at: new Date().toISOString() }
          : r
      ));

      setSnackbar({
        open: true,
        message: 'Record archived successfully',
        severity: 'success'
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to archive record',
        severity: 'error'
      });
    }
  };

  const handleUnarchive = async (record: QuickCheckRecord) => {
    try {
      await updateQuickCheckStatus(record.id, 'submitted');

      // Update the record in the list
      setRecords(records.map(r => 
        r.id === record.id 
          ? { ...r, status: 'submitted', archived_at: undefined, archived_by: undefined, archived_by_name: undefined }
          : r
      ));

      setSnackbar({
        open: true,
        message: 'Record unarchived successfully',
        severity: 'success'
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to unarchive record',
        severity: 'error'
      });
    }
  };

  // Timing functions
  const handleShowTiming = async (record: QuickCheckRecord) => {
    setTimingLoading(true);
    try {
      const timing = await getTimingSummary(record.id);
      setTimingData(timing as TimingData);
      setShowTimingDialog(true);
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to load timing data',
        severity: 'error'
      });
    } finally {
      setTimingLoading(false);
    }
  };

  const handleResetTiming = async (record: QuickCheckRecord) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`/api/quick-checks/${record.id}/reset-timing`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to reset timing');
      }

      setSnackbar({
        open: true,
        message: 'Timing reset successfully',
        severity: 'success'
      });

      // Refresh the records to get updated data
      fetchRecords();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to reset timing',
        severity: 'error'
      });
    }
  };

  const handleView = (record: QuickCheckRecord) => {
    setSelectedRecord(record);
    setViewDialogOpen(true);
  };

  const exportToCSV = () => {
    const headers = ['ID', 'User Email', 'User Name', 'Title', 'Status', 'Created At', 'Saved At', 'Last Updated', 'Duration (seconds)', 'Duration (formatted)', 'Archived At', 'Archived By'];
    const csvData = filteredRecords.map(record => [
      record.id,
      record.user_email,
      record.user_name,
      record.title,
      record.status,
      record.created_at,
      record.saved_at || '',
      record.updated_at,
      record.duration_seconds,
      formatDuration(record.duration_seconds),
      record.archived_at || '',
      record.archived_by_name || ''
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quick-checks-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const filteredRecords = records.filter(record => {
    const matchesSearch = 
      record.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.id.toString().includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_progress':
        return 'warning';
      case 'submitted':
        return 'success';
      case 'archived':
        return 'default';
      default:
        return 'primary';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (seconds: number): string => {
    if (!seconds || seconds === 0) return '0s';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
  };

  const handleImageClick = (images: any[], title: string, clickedIndex: number) => {
    const slideImages = images.map((image, index) => {
      const imageUrl = typeof image === 'string' ? image : image.url;
      return {
        url: getUploadUrl(imageUrl),
        title: `${title} ${index + 1}`,
        subtitle: `Image ${index + 1} of ${images.length}`
      };
    });
    
    setSlideshowImages(slideImages);
    setCurrentImageIndex(clickedIndex);
    setSlideshowOpen(true);
  };

  const handleSlideshowNavigation = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentImageIndex((prev) => prev === 0 ? slideshowImages.length - 1 : prev - 1);
    } else {
      setCurrentImageIndex((prev) => prev === slideshowImages.length - 1 ? 0 : prev + 1);
    }
  };

  const renderImageGallery = (images: any[], title: string) => {
    if (!images || images.length === 0) return null;

    return (
      <Box key={title} sx={{ mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <ImageList sx={{ width: '100%', height: 200 }} cols={3} rowHeight={164}>
          {images.map((image, index) => {
            const imageUrl = typeof image === 'string' ? image : image.url;
            return (
              <ImageListItem 
                key={index} 
                sx={{ 
                  cursor: 'pointer',
                  '&:hover': {
                    opacity: 0.8,
                    transform: 'scale(1.02)',
                    transition: 'all 0.2s ease-in-out'
                  }
                }}
                onClick={() => handleImageClick(images, title, index)}
              >
                <img
                  src={getUploadUrl(imageUrl)}
                  alt={`${title} ${index + 1}`}
                  loading="lazy"
                  style={{ objectFit: 'cover' }}
                  onError={(e) => {
                    console.error(`Failed to load image for ${title}:`, imageUrl);
                    // Try alternative URL if the current one fails
                    if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('/uploads/')) {
                      const newUrl = `/uploads/${imageUrl}`;
                      console.log(`Trying alternative URL:`, newUrl);
                      e.currentTarget.src = getUploadUrl(newUrl);
                    }
                  }}
                />
                <ImageListItemBar
                  title={`${title} ${index + 1}`}
                  subtitle={`Click to view full size`}
                />
              </ImageListItem>
            );
          })}
        </ImageList>
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography>Loading records...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Quick Check Database
      </Typography>
      
      {/* Controls */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
          <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
            <TextField
              fullWidth
              placeholder="Search by title, user, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Box>
          <Box sx={{ flex: '0 1 200px', minWidth: 0 }}>
            <TextField
              select
              fullWidth
              label="Status Filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              SelectProps={{
                native: true,
              }}
            >
              <option value="all">All Statuses</option>
              <option value="in_progress">In Progress</option>
              <option value="submitted">Submitted</option>
              <option value="archived">Archived</option>
            </TextField>
          </Box>
          <Box sx={{ flex: '0 1 auto', display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchRecords}
            >
              Refresh
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={exportToCSV}
            >
              Export CSV
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Records Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>User</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Saved</TableCell>
              <TableCell>Last Updated</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRecords.map((record) => (
              <TableRow key={record.id}>
                <TableCell>{record.id}</TableCell>
                <TableCell>{record.title}</TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2">{record.user_name}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {record.user_email}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={record.status.replace('_', ' ')}
                    color={getStatusColor(record.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>{formatDate(record.created_at)}</TableCell>
                <TableCell>
                  {record.saved_at ? (
                    formatDate(record.saved_at)
                  ) : (
                    <Typography variant="caption" color="textSecondary">
                      Not manually saved
                    </Typography>
                  )}
                </TableCell>
                <TableCell>{formatDate(record.updated_at)}</TableCell>
                <TableCell>
                  {(() => {
                    // Calculate total duration from form data
                    const technicianDuration = record.data?.technician_duration || 0;
                    const serviceAdvisorDuration = record.data?.service_advisor_duration || 0;
                    const totalDuration = technicianDuration + serviceAdvisorDuration;
                    
                    // Use total duration from form data if available, otherwise fall back to duration_seconds
                    return formatDuration(totalDuration > 0 ? totalDuration : record.duration_seconds);
                  })()}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="View Details">
                      <IconButton
                        size="small"
                        onClick={() => handleView(record)}
                      >
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="View Timing">
                      <IconButton
                        size="small"
                        onClick={() => handleShowTiming(record)}
                        disabled={timingLoading}
                      >
                        <TimerIcon />
                      </IconButton>
                    </Tooltip>
                    {record.status === 'submitted' && (
                      <Tooltip title="Archive">
                        <IconButton
                          size="small"
                          onClick={() => handleArchive(record)}
                        >
                          <ArchiveIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    {record.status === 'archived' && (
                      <Tooltip title="Unarchive">
                        <IconButton
                          size="small"
                          onClick={() => handleUnarchive(record)}
                        >
                          <UnarchiveIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(record)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* View Details Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Quick Check Details - {selectedRecord?.title}
        </DialogTitle>
        <DialogContent>
          {selectedRecord && (
            <Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                <Box sx={{ flex: '1 1 400px', minWidth: 0 }}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Basic Information
                      </Typography>
                      <List dense>
                        <ListItem>
                          <ListItemText
                            primary="ID"
                            secondary={selectedRecord.id}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Title"
                            secondary={selectedRecord.title}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="User"
                            secondary={`${selectedRecord.user_name} (${selectedRecord.user_email})`}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Status"
                            secondary={
                              <Chip
                                label={selectedRecord.status.replace('_', ' ')}
                                color={getStatusColor(selectedRecord.status) as any}
                                size="small"
                              />
                            }
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Created"
                            secondary={formatDate(selectedRecord.created_at)}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Saved"
                            secondary={
                              selectedRecord.saved_at ? (
                                formatDate(selectedRecord.saved_at)
                              ) : (
                                <Typography variant="caption" color="textSecondary">
                                  Not manually saved
                                </Typography>
                              )
                            }
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Last Updated"
                            secondary={formatDate(selectedRecord.updated_at)}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText
                            primary="Duration"
                            secondary={(() => {
                              // Calculate total duration from form data
                              const technicianDuration = selectedRecord.data?.technician_duration || 0;
                              const serviceAdvisorDuration = selectedRecord.data?.service_advisor_duration || 0;
                              const totalDuration = technicianDuration + serviceAdvisorDuration;
                              
                              // Use total duration from form data if available, otherwise fall back to duration_seconds
                              return formatDuration(totalDuration > 0 ? totalDuration : selectedRecord.duration_seconds);
                            })()}
                          />
                        </ListItem>
                        {selectedRecord.archived_at && (
                          <ListItem>
                            <ListItemText
                              primary="Archived"
                              secondary={`${formatDate(selectedRecord.archived_at)} by ${selectedRecord.archived_by_name}`}
                            />
                          </ListItem>
                        )}
                      </List>
                    </CardContent>
                  </Card>
                </Box>
                <Box sx={{ flex: '1 1 400px', minWidth: 0 }}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Form Data
                      </Typography>
                      <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                        <pre style={{ fontSize: '12px', whiteSpace: 'pre-wrap' }}>
                          {JSON.stringify(selectedRecord.data, null, 2)}
                        </pre>
                      </Box>
                    </CardContent>
                  </Card>
                </Box>
              </Box>

              {/* Images Section */}
              {selectedRecord.data && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Images
                  </Typography>
                  {renderImageGallery(selectedRecord.data.dash_lights_photos, 'Dash Lights')}
                  {renderImageGallery(selectedRecord.data.tpms_placard, 'TPMS Placard')}
                  {renderImageGallery(selectedRecord.data.washer_fluid_photo, 'Washer Fluid')}
                  {renderImageGallery(selectedRecord.data.engine_air_filter_photo, 'Engine Air Filter')}
                  {renderImageGallery(selectedRecord.data.battery_photos, 'Battery')}
                  {renderImageGallery(selectedRecord.data.tpms_tool_photo, 'TPMS Tool')}
                  {renderImageGallery(selectedRecord.data.front_brakes, 'Front Brakes')}
                  {renderImageGallery(selectedRecord.data.rear_brakes, 'Rear Brakes')}
                  
                  {/* Tire Photos */}
                  {selectedRecord.data.tire_photos && selectedRecord.data.tire_photos.map((tirePhoto: any) => (
                    <Box key={tirePhoto.type} sx={{ mb: 2 }}>
                      <Typography variant="h6" gutterBottom>
                        {tirePhoto.type.replace('_', ' ').toUpperCase()} Tires
                      </Typography>
                      <ImageList sx={{ width: '100%', height: 200 }} cols={3} rowHeight={164}>
                        {tirePhoto.photos && tirePhoto.photos.map((image: any, index: number) => {
                          const imageUrl = typeof image === 'string' ? image : image.url;
                          const tireTitle = `${tirePhoto.type.replace('_', ' ').toUpperCase()} Tires`;
                          return (
                            <ImageListItem 
                              key={index}
                              sx={{ 
                                cursor: 'pointer',
                                '&:hover': {
                                  opacity: 0.8,
                                  transform: 'scale(1.02)',
                                  transition: 'all 0.2s ease-in-out'
                                }
                              }}
                              onClick={() => handleImageClick(tirePhoto.photos, tireTitle, index)}
                            >
                              <img
                                src={getUploadUrl(imageUrl)}
                                alt={`${tirePhoto.type} tire ${index + 1}`}
                                loading="lazy"
                                style={{ objectFit: 'cover' }}
                                onError={(e) => {
                                  console.error(`Failed to load tire image for ${tirePhoto.type}:`, imageUrl);
                                  // Try alternative URL if the current one fails
                                  if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('/uploads/')) {
                                    const newUrl = `/uploads/${imageUrl}`;
                                    console.log(`Trying alternative URL:`, newUrl);
                                    e.currentTarget.src = getUploadUrl(newUrl);
                                  }
                                }}
                              />
                              <ImageListItemBar
                                title={`${tirePhoto.type} tire ${index + 1}`}
                                subtitle={`Click to view full size`}
                              />
                            </ImageListItem>
                          );
                        })}
                      </ImageList>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Box>
            <Typography>
              Are you sure you want to delete the quick check "{recordToDelete?.title}"?
            </Typography>
            <Typography>This action cannot be undone.</Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Timing Dialog */}
      <Dialog open={showTimingDialog} onClose={() => setShowTimingDialog(false)} maxWidth="xl" fullWidth>
        <DialogContent>
          <Typography variant="h6" gutterBottom>Quick Check Timing Summary</Typography>
          {timingData && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>Status: {timingData.status}</Typography>
              
              {/* Vehicle Information */}
              {(timingData as any).formData && (
                <>
                  <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>Vehicle Information</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                        <Typography variant="subtitle2" color="primary">VIN</Typography>
                        <Typography variant="body1">
                          {(timingData as any).formData.vin || 'Not provided'}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                        <Typography variant="subtitle2" color="primary">Vehicle Details</Typography>
                        <Typography variant="body1">
                          {(timingData as any).formData.vehicle_details || 'Not decoded'}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                        <Typography variant="subtitle2" color="primary">Mileage</Typography>
                        <Typography variant="body1">
                          {(timingData as any).formData.mileage || 'Not provided'}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                        <Typography variant="subtitle2" color="primary">Technician</Typography>
                        <Typography variant="body1">
                          {(timingData as any).formData.user || 'Not provided'}
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>



                  {/* Notes */}
                  {(timingData as any).formData.notes && (
                    <>
                      <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>Notes</Typography>
                      <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                        <Typography variant="body1">
                          {(timingData as any).formData.notes}
                        </Typography>
                      </Paper>
                    </>
                  )}
                </>
              )}

              {/* Database Tab Timings */}
              <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>Tab Timings</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Paper sx={{ p: 2, bgcolor: 'grey.100' }}>
                    <Typography variant="subtitle2" color="primary">Info Tab</Typography>
                    <Typography variant="h6">
                      {formatDuration((timingData as any).tab_timings_from_form?.info_duration || 0)}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Paper sx={{ p: 2, bgcolor: 'grey.100' }}>
                    <Typography variant="subtitle2" color="primary">Pulling Into Bay</Typography>
                    <Typography variant="h6">
                      {formatDuration((timingData as any).tab_timings_from_form?.pulling_duration || 0)}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Paper sx={{ p: 2, bgcolor: 'grey.100' }}>
                    <Typography variant="subtitle2" color="primary">Underhood</Typography>
                    <Typography variant="h6">
                      {formatDuration((timingData as any).tab_timings_from_form?.underhood_duration || 0)}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Paper sx={{ p: 2, bgcolor: 'grey.100' }}>
                    <Typography variant="subtitle2" color="primary">Tires & Brakes</Typography>
                    <Typography variant="h6">
                      {formatDuration((timingData as any).tab_timings_from_form?.tires_duration || 0)}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* Workflow Durations */}
              {(timingData as any).technician_duration !== null || (timingData as any).service_advisor_duration !== null ? (
                <>
                  <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>Workflow Durations</Typography>
                  <Grid container spacing={2}>
                    {(timingData as any).technician_duration !== null && (
                      <Grid item xs={12} sm={6}>
                        <Paper sx={{ p: 2, bgcolor: 'primary.light' }}>
                          <Typography variant="subtitle2" color="white">Technician Duration</Typography>
                          <Typography variant="h6" color="white">
                            {formatDuration((timingData as any).technician_duration)}
                          </Typography>
                          <Typography variant="caption" color="white">
                            Created to Submitted
                          </Typography>
                        </Paper>
                      </Grid>
                    )}
                    {(timingData as any).service_advisor_duration !== null && (
                      <Grid item xs={12} sm={6}>
                        <Paper sx={{ p: 2, bgcolor: 'secondary.light' }}>
                          <Typography variant="subtitle2" color="white">Service Advisor Duration</Typography>
                          <Typography variant="h6" color="white">
                            {formatDuration((timingData as any).service_advisor_duration)}
                          </Typography>
                          <Typography variant="caption" color="white">
                            Submitted to Archived
                          </Typography>
                        </Paper>
                      </Grid>
                    )}
                  </Grid>
                </>
              ) : null}

              {/* Total Duration */}
              <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>Total Duration</Typography>
              <Paper sx={{ p: 2, bgcolor: 'info.light' }}>
                <Typography variant="h6" color="white">
                  {formatDuration(((timingData as any).technician_duration || 0) + ((timingData as any).service_advisor_duration || 0))}
                </Typography>
                <Typography variant="caption" color="white">
                  Technician Duration + Service Advisor Duration
                </Typography>
              </Paper>

              {/* Timestamps */}
              <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>Timestamps</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Typography variant="body2">
                    <strong>Created:</strong><br />
                    {new Date(timingData.timestamps.created).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="body2">
                    <strong>Last Updated:</strong><br />
                    {new Date(timingData.timestamps.updated).toLocaleString()}
                  </Typography>
                </Grid>
                {timingData.timestamps.archived && (
                  <Grid item xs={12} sm={4}>
                    <Typography variant="body2">
                      <strong>Archived:</strong><br />
                      {new Date(timingData.timestamps.archived).toLocaleString()}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
            <Button 
              onClick={() => timingData && handleResetTiming({ id: timingData.id } as QuickCheckRecord)}
              color="warning"
              variant="outlined"
            >
              Reset Timing
            </Button>
            <Button onClick={() => setShowTimingDialog(false)}>Close</Button>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Image Slideshow Dialog */}
      <Dialog
        open={slideshowOpen}
        onClose={() => setSlideshowOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { 
            bgcolor: 'black',
            minHeight: '80vh'
          }
        }}
      >
        <DialogTitle sx={{ 
          color: 'white', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          pb: 1
        }}>
          <Typography variant="h6" sx={{ color: 'white' }}>
            {slideshowImages[currentImageIndex]?.title}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ color: 'white', mr: 2 }}>
              {slideshowImages[currentImageIndex]?.subtitle}
            </Typography>
            <IconButton 
              onClick={() => setSlideshowOpen(false)} 
              sx={{ color: 'white' }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ 
          bgcolor: 'black', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          p: 0,
          position: 'relative'
        }}>
          {slideshowImages.length > 0 && (
            <>
              {/* Navigation buttons */}
              {slideshowImages.length > 1 && (
                <>
                  <IconButton
                    onClick={() => handleSlideshowNavigation('prev')}
                    sx={{
                      position: 'absolute',
                      left: 16,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      bgcolor: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      zIndex: 1,
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.3)'
                      }
                    }}
                  >
                    <ArrowBackIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => handleSlideshowNavigation('next')}
                    sx={{
                      position: 'absolute',
                      right: 16,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      bgcolor: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      zIndex: 1,
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.3)'
                      }
                    }}
                  >
                    <ArrowForwardIcon />
                  </IconButton>
                </>
              )}
              
              {/* Main image */}
              <img
                src={slideshowImages[currentImageIndex]?.url}
                alt={slideshowImages[currentImageIndex]?.title}
                style={{
                  maxWidth: '100%',
                  maxHeight: '70vh',
                  objectFit: 'contain'
                }}
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ bgcolor: 'black', justifyContent: 'center', pt: 1 }}>
          {slideshowImages.length > 1 && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              {slideshowImages.map((_, index) => (
                <Box
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: index === currentImageIndex ? 'white' : 'rgba(255,255,255,0.4)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      bgcolor: index === currentImageIndex ? 'white' : 'rgba(255,255,255,0.6)'
                    }
                  }}
                />
              ))}
            </Box>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QuickCheckDatabase; 