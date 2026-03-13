import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
  IconButton,
  Divider
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Close as CloseIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { axiosInstance } from '../services/api';

interface RestockLabelsCsvUploadProps {
  open: boolean;
  onClose: () => void;
  onUploadComplete: () => void;
}

interface ProcessedRecord {
  id: string;
  type: 'parts' | 'tires';
  data: any;
  status: 'pending' | 'success' | 'error';
  error?: string;
}

interface UploadResult {
  success: boolean;
  message: string;
  processed: number;
  errors: string[];
}

const RestockLabelsCsvUpload: React.FC<RestockLabelsCsvUploadProps> = ({
  open,
  onClose,
  onUploadComplete
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [processedRecords, setProcessedRecords] = useState<ProcessedRecord[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadResult(null);
    setProcessedRecords([]);

    try {
      // First test basic connectivity
      console.log('🧪 Testing basic connectivity...');
      const testResponse = await axiosInstance.post('/restock-labels/test');
      console.log('✅ Test response:', testResponse.data);

      // Now try the actual CSV upload
      console.log('📤 Starting CSV upload...');
      const formData = new FormData();
      formData.append('csvFile', file);

      const response = await axiosInstance.post('/restock-labels/csv-upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const result = response.data as UploadResult;
      setUploadResult(result);
      
      if (result.success) {
        onUploadComplete();
      }
    } catch (error: any) {
      console.error('CSV upload error:', error);
      setUploadResult({
        success: false,
        message: error.response?.data?.error || 'Failed to upload CSV file',
        processed: 0,
        errors: [error.response?.data?.error || 'Upload failed']
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClose = () => {
    setUploadResult(null);
    setProcessedRecords([]);
    onClose();
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '400px' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Upload Restock Labels CSV
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Upload a CSV file with parts and tires restock labels. The CSV should contain separate sheets:
          </Typography>
          
          <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
              Sheet 1: Tires_restock
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', mb: 1 }}>
              tire Size, Part Number, Tire brand, Vendor, Bin/location, Label Type
            </Typography>
            
            <Divider sx={{ my: 1 }} />
            
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
              Sheet 2: Parts_restock
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
              Name*, part number, Vendor, Bin/location, Part type, Label Type
            </Typography>
          </Paper>

          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              • CSV file should contain both sheets or use sheet names to identify the type
              <br />
              • Missing required fields will be skipped with errors
              <br />
              • Successfully processed records will be added to the labels database
            </Typography>
          </Alert>
        </Box>

        {!uploading && !uploadResult && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <Button
              variant="contained"
              startIcon={<UploadIcon />}
              onClick={triggerFileSelect}
              size="large"
            >
              Select CSV File
            </Button>
          </Box>
        )}

        {uploading && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="body2" color="text.secondary">
              Processing CSV file...
            </Typography>
          </Box>
        )}

        {uploadResult && (
          <Box>
            <Alert 
              severity={uploadResult.success ? 'success' : 'error'} 
              icon={uploadResult.success ? <SuccessIcon /> : <ErrorIcon />}
              sx={{ mb: 2 }}
            >
              <Typography variant="body2">
                {uploadResult.message}
              </Typography>
              {uploadResult.processed > 0 && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Successfully processed: {uploadResult.processed} records
                </Typography>
              )}
            </Alert>

            {uploadResult.errors.length > 0 && (
              <Paper sx={{ p: 2, maxHeight: 200, overflow: 'auto' }}>
                <Typography variant="subtitle2" sx={{ mb: 1, color: 'error.main' }}>
                  Errors ({uploadResult.errors.length}):
                </Typography>
                <List dense>
                  {uploadResult.errors.map((error, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={error}
                        primaryTypographyProps={{
                          variant: 'body2',
                          color: 'error'
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} variant="outlined">
          Close
        </Button>
        {uploadResult?.success && (
          <Button
            onClick={triggerFileSelect}
            variant="contained"
            startIcon={<UploadIcon />}
          >
            Upload Another File
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default RestockLabelsCsvUpload;
