import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  ButtonGroup,
  Card,
  CardContent,
  CardActions,
  Grid,
  Chip,
  Alert,
  Snackbar,
  Tooltip,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Storage as StorageIcon,
  Assessment as TestIcon,
  CheckCircle as CheckIcon,
  ErrorOutline as ErrorIcon,
  Launch as LaunchIcon,
} from '@mui/icons-material';

// Import the test data and helper
import testInspectionData from '../../test-inspection-data.json';
import { TestInspectionDataHelper, TestDatasetKey } from '../utils/testInspectionDataHelper';

interface TestDataset {
  key: string;
  title: string;
  description: string;
  inspectionType: string;
  vin: string;
  url: string;
  dataSize: 'full' | 'minimal';
  color: 'primary' | 'secondary' | 'success' | 'warning';
}

const InspectionTestDataButtons: React.FC = () => {
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  // Define test datasets with metadata
  const testDatasets: TestDataset[] = [
    {
      key: 'quick_check_full',
      title: 'Quick Check (Full)',
      description: 'Comprehensive Quick Check with all sections populated and multiple photos',
      inspectionType: 'quick_check',
      vin: '1HGCM82633A123456',
      url: 'https://localhost:3000/quick-check?vin=1HGCM82633A123456',
      dataSize: 'full',
      color: 'primary',
    },
    {
      key: 'quick_check_minimal',
      title: 'Quick Check (Minimal)',
      description: 'Minimal Quick Check with only 3 fields populated for sparse data testing',
      inspectionType: 'quick_check',
      vin: '2T1BURHE5JC123789',
      url: 'https://localhost:3000/quick-check?vin=2T1BURHE5JC123789',
      dataSize: 'minimal',
      color: 'secondary',
    },
    {
      key: 'no_check_full',
      title: 'No Check (Full)',
      description: 'Complete No Check workflow with various conditions and damage scenarios',
      inspectionType: 'no_check',
      vin: '3VW447AU8JM123456',
      url: 'https://localhost:3000/no-check?vin=3VW447AU8JM123456',
      dataSize: 'full',
      color: 'success',
    },
    {
      key: 'no_check_minimal',
      title: 'No Check (Minimal)',
      description: 'Basic No Check functionality with minimal field population',
      inspectionType: 'no_check',
      vin: '1FTFW1ET5DFC12345',
      url: 'https://localhost:3000/no-check?vin=1FTFW1ET5DFC12345',
      dataSize: 'minimal',
      color: 'secondary',
    },
    {
      key: 'vsi_full',
      title: 'VSI (Full)',
      description: 'Complete Vehicle Safety Inspection with comprehensive documentation',
      inspectionType: 'vsi',
      vin: '1G1ZB5ST8HF123456',
      url: 'https://localhost:3000/vsi?vin=1G1ZB5ST8HF123456',
      dataSize: 'full',
      color: 'warning',
    },
    {
      key: 'vsi_minimal',
      title: 'VSI (Minimal)',
      description: 'Essential VSI fields for minimal inspection testing',
      inspectionType: 'vsi',
      vin: '5NPF34AF8HH123456',
      url: 'https://localhost:3000/vsi?vin=5NPF34AF8HH123456',
      dataSize: 'minimal',
      color: 'secondary',
    },
  ];

  const handleLoadTestData = (datasetKey: string) => {
    try {
      const success = TestInspectionDataHelper.loadTestData(datasetKey as TestDatasetKey);
      
      if (!success) {
        throw new Error(`Failed to load test data for key: ${datasetKey}`);
      }

      const metadata = TestInspectionDataHelper.getTestDataMetadata(datasetKey as TestDatasetKey);
      
      setNotification({
        open: true,
        message: `✅ ${datasetKey} test data loaded successfully! ${metadata?.fieldCount || 0} fields, ${metadata?.photoCount || 0} photos`,
        severity: 'success',
      });

    } catch (error) {
      console.error('Failed to load test data:', error);
      setNotification({
        open: true,
        message: `❌ Failed to load ${datasetKey}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
      });
    }
  };

  const handleOpenInspection = (url: string) => {
    window.open(url, '_blank');
  };

  const handleClearAllTestData = () => {
    try {
      const clearedCount = TestInspectionDataHelper.clearAllTestData();

      setNotification({
        open: true,
        message: `🗑️ Cleared ${clearedCount} test datasets from localStorage`,
        severity: 'success',
      });

    } catch (error) {
      console.error('Failed to clear test data:', error);
      setNotification({
        open: true,
        message: '❌ Failed to clear test data',
        severity: 'error',
      });
    }
  };



  const renderDatasetCard = (dataset: TestDataset) => {
    const stats = TestInspectionDataHelper.getDatasetStats(dataset.key as TestDatasetKey);
    const fieldCount = stats?.fieldCount || 0;
    const photoCount = stats?.photoCount || 0;

    return (
      <Grid item xs={12} sm={6} md={4} key={dataset.key}>
        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <CardContent sx={{ flexGrow: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="h6" component="h3">
                {dataset.title}
              </Typography>
              <Chip 
                size="small" 
                label={dataset.dataSize} 
                color={dataset.dataSize === 'full' ? 'primary' : 'default'}
              />
            </Box>
            
            <Typography variant="body2" color="text.secondary" paragraph>
              {dataset.description}
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
              <Chip size="small" label={`VIN: ${dataset.vin}`} variant="outlined" />
              <Chip size="small" label={`${fieldCount} fields`} variant="outlined" />
              <Chip size="small" label={`${photoCount} photos`} variant="outlined" />
            </Box>
          </CardContent>

          <CardActions>
            <ButtonGroup size="small" variant="outlined" fullWidth>
              <Tooltip title="Load test data into localStorage">
                <Button
                  onClick={() => handleLoadTestData(dataset.key)}
                  startIcon={<StorageIcon />}
                  color={dataset.color}
                >
                  Load Data
                </Button>
              </Tooltip>
              <Tooltip title="Open inspection form with VIN pre-filled">
                <Button
                  onClick={() => handleOpenInspection(dataset.url)}
                  startIcon={<LaunchIcon />}
                  color={dataset.color}
                >
                  Open Form
                </Button>
              </Tooltip>
            </ButtonGroup>
          </CardActions>
        </Card>
      </Grid>
    );
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <TestIcon color="primary" />
          <Typography variant="h6">
            Inspection Test Data
          </Typography>
          <Chip 
            label={`${testDatasets.length} datasets available`} 
            color="primary" 
            variant="outlined" 
          />
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Test inspection data</strong> provides realistic form data for comprehensive UI testing. 
            Load data into localStorage and open inspection forms to test various scenarios.
            <br /><br />
            <strong>How it works:</strong> When you click "Load Data", test data is stored in localStorage. 
            When you click "Open Form", the inspection form automatically detects and loads the test data 
            that matches the VIN or inspection type.
          </Typography>
        </Alert>

        {/* Quick Actions */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Quick Actions
          </Typography>
          <ButtonGroup variant="outlined" size="small">
            <Tooltip title="Load all full datasets for comprehensive testing">
              <Button
                onClick={() => {
                  testDatasets
                    .filter(d => d.dataSize === 'full')
                    .forEach(d => handleLoadTestData(d.key));
                }}
                startIcon={<PlayIcon />}
                color="primary"
              >
                Load All Full
              </Button>
            </Tooltip>
            <Tooltip title="Load all minimal datasets for sparse data testing">
              <Button
                onClick={() => {
                  testDatasets
                    .filter(d => d.dataSize === 'minimal')
                    .forEach(d => handleLoadTestData(d.key));
                }}
                startIcon={<PlayIcon />}
                color="secondary"
              >
                Load All Minimal
              </Button>
            </Tooltip>
            <Tooltip title="Clear all test data from localStorage">
              <Button
                onClick={handleClearAllTestData}
                startIcon={<ErrorIcon />}
                color="error"
              >
                Clear All
              </Button>
            </Tooltip>
          </ButtonGroup>
        </Box>

        {/* Dataset Cards */}
        <Typography variant="subtitle1" gutterBottom>
          Available Test Datasets
        </Typography>
        <Grid container spacing={2}>
          {testDatasets.map(renderDatasetCard)}
        </Grid>

        {/* Usage Instructions */}
        <Alert severity="success" sx={{ mt: 3 }} icon={<CheckIcon />}>
          <Typography variant="body2">
            <strong>How to use:</strong> 
            <br />1. Click "Load Data" to store test data in localStorage
            <br />2. Click "Open Form" to open the inspection form in a new tab
            <br />3. The form will automatically detect and load the matching test data
            <br />4. All fields and photos will be pre-populated for immediate testing
            <br /><br />
            <strong>Debug:</strong> Check browser console for test data loading messages and status.
          </Typography>
        </Alert>
      </CardContent>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={() => setNotification(prev => ({ ...prev, open: false }))}
        message={notification.message}
        action={
          <Button 
            color="inherit" 
            size="small" 
            onClick={() => setNotification(prev => ({ ...prev, open: false }))}
          >
            Close
          </Button>
        }
      />
    </Card>
  );
};

export default InspectionTestDataButtons;
