import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Card,
  CardContent,
  CardActions,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Button,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Restore as RestoreIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  QrCode as QrCodeIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import QRCode from 'react-qr-code';
import { StaticSticker } from '../types/stickers';
import { StickerStorageService } from '../services/stickerStorage';

const ArchivedStickers: React.FC = () => {
  const [archivedStickers, setArchivedStickers] = useState<StaticSticker[]>([]);
  const [selectedSticker, setSelectedSticker] = useState<StaticSticker | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    
    // Set up auto-refresh timer (every 30 seconds)
    const refreshInterval = setInterval(() => {
      loadData();
    }, 30000);

    // Cleanup interval on component unmount
    return () => {
      clearInterval(refreshInterval);
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const stickers = await StickerStorageService.getArchivedStickers();
      setArchivedStickers(stickers);
      setError('');
    } catch (error) {
      console.error('Error loading archived stickers:', error);
      setError('Failed to load archived stickers');
      setArchivedStickers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreSticker = async (id: string) => {
    try {
      await StickerStorageService.restoreSticker(id);
      setSuccess('Sticker restored successfully!');
      loadData();
    } catch (error) {
      setError('Failed to restore sticker');
    }
  };

  const handleDeleteSticker = async (id: string) => {
    if (window.confirm('Are you sure you want to permanently delete this sticker? This action cannot be undone.')) {
      try {
        await StickerStorageService.deleteSticker(id);
        setSuccess('Sticker deleted permanently!');
        loadData();
      } catch (error) {
        setError('Failed to delete sticker');
      }
    }
  };

  const handleViewDetails = (sticker: StaticSticker) => {
    setSelectedSticker(sticker);
    setShowDetailDialog(true);
  };

  const handleShowQR = (sticker: StaticSticker) => {
    setSelectedSticker(sticker);
    setShowQRDialog(true);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Archived Oil Change Stickers
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {loading ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="h6" color="textSecondary">
              Loading archived stickers...
            </Typography>
          </Paper>
        ) : archivedStickers.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="textSecondary">
              No archived stickers found
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              Archived stickers will appear here when you archive them from the active stickers page
            </Typography>
          </Paper>
        ) : (
          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table sx={{ minWidth: 650 }} aria-label="archived stickers table">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Vehicle</strong></TableCell>
                  <TableCell><strong>VIN</strong></TableCell>
                  <TableCell><strong>Mileage</strong></TableCell>
                  <TableCell><strong>Oil Type</strong></TableCell>
                  <TableCell><strong>Next Service</strong></TableCell>
                  <TableCell><strong>Company</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>Archived</strong></TableCell>
                  <TableCell><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {archivedStickers.map((sticker) => (
                  <TableRow 
                    key={sticker.id}
                    sx={{ 
                      '&:last-child td, &:last-child th': { border: 0 },
                      opacity: 0.8,
                      '&:hover': { 
                        backgroundColor: 'action.hover',
                        opacity: 1 
                      }
                    }}
                  >
                    <TableCell component="th" scope="row">
                      <Typography variant="body2" fontWeight="medium">
                        {sticker.decodedDetails.year} {sticker.decodedDetails.make} {sticker.decodedDetails.model}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {sticker.vin}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {sticker.mileage.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {sticker.oilType.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {format(new Date(sticker.date), 'MM/dd/yyyy')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {sticker.companyName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        <Chip
                          label="Archived"
                          color="default"
                          size="small"
                        />
                        <Chip
                          label={sticker.printed ? 'Printed' : 'Not Printed'}
                          color={sticker.printed ? 'success' : 'default'}
                          size="small"
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {format(new Date(sticker.lastUpdated), 'MM/dd/yyyy')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleViewDetails(sticker)}
                          title="View Details"
                        >
                          <VisibilityIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleShowQR(sticker)}
                          title="Show QR Code"
                        >
                          <QrCodeIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleRestoreSticker(sticker.id)}
                          title="Restore to Active"
                          color="primary"
                        >
                          <RestoreIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteSticker(sticker.id)}
                          title="Delete Permanently"
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Detail Dialog */}
        <Dialog open={showDetailDialog} onClose={() => setShowDetailDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            Sticker Details
            <IconButton
              aria-label="close"
              onClick={() => setShowDetailDialog(false)}
              sx={{ position: 'absolute', right: 8, top: 8 }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            {selectedSticker && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="h6" gutterBottom>
                  Vehicle Information
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Vehicle:</strong> {selectedSticker.decodedDetails.year} {selectedSticker.decodedDetails.make} {selectedSticker.decodedDetails.model}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>VIN:</strong> {selectedSticker.vin}
                </Typography>
                {selectedSticker.decodedDetails.engine && (
                  <Typography variant="body1" gutterBottom>
                    <strong>Engine:</strong> {selectedSticker.decodedDetails.engine}
                  </Typography>
                )}

                <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                  Service Information
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Current Mileage:</strong> {selectedSticker.mileage.toLocaleString()}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Oil Type:</strong> {selectedSticker.oilType.name}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Next Service Date:</strong> {format(new Date(selectedSticker.date), 'MMMM dd, yyyy')}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Next Service Mileage:</strong> {(selectedSticker.mileage + selectedSticker.oilType.mileageInterval).toLocaleString()}
                </Typography>

                <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                  Company Information
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Company:</strong> {selectedSticker.companyName}
                </Typography>
                {selectedSticker.address && (
                  <Typography variant="body1" gutterBottom>
                    <strong>Address:</strong> {selectedSticker.address}
                  </Typography>
                )}
                {selectedSticker.message && (
                  <Typography variant="body1" gutterBottom>
                    <strong>Notes:</strong> {selectedSticker.message}
                  </Typography>
                )}

                <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                  Status
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Created:</strong> {format(new Date(selectedSticker.dateCreated), 'MMMM dd, yyyy')}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Last Updated:</strong> {format(new Date(selectedSticker.lastUpdated), 'MMMM dd, yyyy')}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Printed:</strong> {selectedSticker.printed ? 'Yes' : 'No'}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <strong>Status:</strong> Archived
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            {selectedSticker && (
              <>
                <Button onClick={() => handleRestoreSticker(selectedSticker.id)} color="primary">
                  Restore to Active
                </Button>
                <Button onClick={() => setShowDetailDialog(false)}>Close</Button>
              </>
            )}
          </DialogActions>
        </Dialog>

        {/* QR Code Dialog */}
        <Dialog open={showQRDialog} onClose={() => setShowQRDialog(false)} maxWidth="sm">
          <DialogTitle>QR Code</DialogTitle>
          <DialogContent sx={{ textAlign: 'center', p: 3 }}>
            {selectedSticker && (
              <>
                <Typography variant="h6" gutterBottom>
                  {selectedSticker.decodedDetails.year} {selectedSticker.decodedDetails.make} {selectedSticker.decodedDetails.model}
                </Typography>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  VIN: {selectedSticker.vin}
                </Typography>
                <Typography variant="body2" color="warning.main" gutterBottom>
                  (Archived Sticker)
                </Typography>
                <Box sx={{ mt: 2, mb: 2 }}>
                  <QRCode value={selectedSticker.qrCode} size={200} />
                </Box>
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowQRDialog(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
};

export default ArchivedStickers; 