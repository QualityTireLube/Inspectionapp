import React, { useState, useRef, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Alert,
  TextField,
  Divider,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip
} from '@mui/material';
import {
  PhotoCamera,
  PhotoLibrary,
  CheckCircle,
  ErrorOutline,
  Warning,
  Info
} from '@mui/icons-material';
import { 
  logImageUploadAttempt, 
  showSafariImageAlert, 
  detectBrowser, 
  testImageUploadCapabilities,
  testAllImageMethods,
  showVisualImageDebug,
  getImageDebugReport
} from '../services/imageUploadDebug';

const ImageUploadTest: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [capabilities, setCapabilities] = useState<any>(null);
  const [testResults, setTestResults] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [browser, setBrowser] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Initial setup
    const detectedBrowser = detectBrowser();
    setBrowser(detectedBrowser);
    
    // Test capabilities
    const caps = testImageUploadCapabilities();
    setCapabilities(caps);
    
    // Add initial test results
    setTestResults([
      `Browser: ${detectedBrowser}`,
      `File Input: ${caps.fileInputSupported ? '✅ Supported' : '❌ Not Supported'}`,
      `Camera: ${caps.cameraSupported ? '✅ Supported' : '❌ Not Supported'}`,
      `HEIC: ${caps.heicSupported ? '✅ Supported' : '❌ Not Supported'}`,
      `File API: ${caps.fileAPISupported ? '✅ Supported' : '❌ Not Supported'}`
    ]);
    
    // Show Safari warning if needed
    if (detectedBrowser.includes('Safari')) {
      showSafariImageAlert('Safari detected! This test page will help diagnose image upload issues.');
    }
  }, []);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      setUploadStatus('No file selected');
      return;
    }

    const file = files[0];
    setSelectedFile(file);
    setUploadStatus('File selected successfully');
    
    // Log the attempt
    logImageUploadAttempt(file);
    
    // Update debug info
    setDebugInfo(showVisualImageDebug());
    
    // Add to test results
    const newResults = [
      ...testResults,
      `📁 File Selected: ${file.name}`,
      `📏 Size: ${(file.size / 1024 / 1024).toFixed(2)} MB`,
      `🖼️ Type: ${file.type}`,
      `📅 Modified: ${new Date(file.lastModified).toLocaleDateString()}`
    ];
    setTestResults(newResults);
  };

  const handleCameraSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      setUploadStatus('No photo captured');
      return;
    }

    const file = files[0];
    setSelectedFile(file);
    setUploadStatus('Photo captured successfully');
    
    // Log the attempt
    logImageUploadAttempt(file);
    
    // Update debug info
    setDebugInfo(showVisualImageDebug());
    
    // Add to test results
    const newResults = [
      ...testResults,
      `📸 Photo Captured: ${file.name}`,
      `📏 Size: ${(file.size / 1024 / 1024).toFixed(2)} MB`,
      `🖼️ Type: ${file.type}`
    ];
    setTestResults(newResults);
  };

  const runFullTest = async () => {
    setTestResults(['🧪 Running comprehensive test...']);
    await testAllImageMethods();
    
    const caps = testImageUploadCapabilities();
    const reports = getImageDebugReport();
    
    const newResults = [
      '🧪 Full Test Complete',
      `Browser: ${browser}`,
      `File Input: ${caps.fileInputSupported ? '✅' : '❌'}`,
      `Camera: ${caps.cameraSupported ? '✅' : '❌'}`,
      `HEIC: ${caps.heicSupported ? '✅' : '❌'}`,
      `File API: ${caps.fileAPISupported ? '✅' : '❌'}`,
      `Total Tests: ${reports.length}`
    ];
    
    setTestResults(newResults);
    setDebugInfo(showVisualImageDebug());
  };

  const clearResults = () => {
    setTestResults([]);
    setSelectedFile(null);
    setUploadStatus('');
    setDebugInfo('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const getStatusColor = (supported: boolean) => {
    return supported ? 'success' : 'error';
  };

  const getStatusIcon = (supported: boolean) => {
    return supported ? <CheckCircle color="success" /> : <ErrorOutline color="error" />;
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          📸 Image Upload Test & Debug
        </Typography>
        
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            This page helps diagnose iPhone Safari image upload issues. 
            Check the console (F12) for detailed debugging information.
          </Typography>
        </Alert>

        {/* Browser Info */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              🌐 Browser Information
            </Typography>
            <Typography variant="body1">
              <strong>Detected Browser:</strong> {browser}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {navigator.userAgent}
            </Typography>
          </CardContent>
        </Card>

        {/* Capabilities */}
        {capabilities && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🔧 Upload Capabilities
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    {getStatusIcon(capabilities.fileInputSupported)}
                  </ListItemIcon>
                  <ListItemText 
                    primary="File Input Support" 
                    secondary="Basic file selection from device"
                  />
                  <Chip 
                    label={capabilities.fileInputSupported ? 'Supported' : 'Not Supported'}
                    color={getStatusColor(capabilities.fileInputSupported)}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    {getStatusIcon(capabilities.cameraSupported)}
                  </ListItemIcon>
                  <ListItemText 
                    primary="Camera Support" 
                    secondary="Direct camera access via getUserMedia"
                  />
                  <Chip 
                    label={capabilities.cameraSupported ? 'Supported' : 'Not Supported'}
                    color={getStatusColor(capabilities.cameraSupported)}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    {getStatusIcon(capabilities.heicSupported)}
                  </ListItemIcon>
                  <ListItemText 
                    primary="HEIC Support" 
                    secondary="iPhone photo format conversion"
                  />
                  <Chip 
                    label={capabilities.heicSupported ? 'Supported' : 'Not Supported'}
                    color={getStatusColor(capabilities.heicSupported)}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    {getStatusIcon(capabilities.fileAPISupported)}
                  </ListItemIcon>
                  <ListItemText 
                    primary="File API Support" 
                    secondary="Reading and processing files"
                  />
                  <Chip 
                    label={capabilities.fileAPISupported ? 'Supported' : 'Not Supported'}
                    color={getStatusColor(capabilities.fileAPISupported)}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        )}

        {/* Test Buttons */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            onClick={() => fileInputRef.current?.click()}
            startIcon={<PhotoLibrary />}
          >
            Select from Gallery
          </Button>
          
          <Button
            variant="contained"
            onClick={() => cameraInputRef.current?.click()}
            startIcon={<PhotoCamera />}
            color="secondary"
          >
            Take Photo
          </Button>
          
          <Button
            variant="outlined"
            onClick={runFullTest}
            startIcon={<Info />}
          >
            Run Full Test
          </Button>
          
          <Button
            variant="outlined"
            onClick={clearResults}
            color="warning"
          >
            Clear Results
          </Button>
        </Box>

        {/* Hidden inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
        
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleCameraSelect}
        />

        {/* Upload Status */}
        {uploadStatus && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {uploadStatus}
          </Alert>
        )}

        {/* Selected File Info */}
        {selectedFile && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📄 Selected File Information
              </Typography>
              <Typography><strong>Name:</strong> {selectedFile.name}</Typography>
              <Typography><strong>Type:</strong> {selectedFile.type}</Typography>
              <Typography><strong>Size:</strong> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</Typography>
              <Typography><strong>Last Modified:</strong> {new Date(selectedFile.lastModified).toLocaleString()}</Typography>
            </CardContent>
          </Card>
        )}

        {/* Test Results */}
        {testResults.length > 0 && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🧪 Test Results
              </Typography>
              <List>
                {testResults.map((result, index) => (
                  <ListItem key={index}>
                    <ListItemText primary={result} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        )}

        {/* Debug Info */}
        {debugInfo && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🔍 Debug Information
              </Typography>
              <TextField
                multiline
                rows={8}
                value={debugInfo}
                fullWidth
                variant="outlined"
                InputProps={{
                  readOnly: true,
                  style: { fontFamily: 'monospace', fontSize: '12px' }
                }}
              />
            </CardContent>
          </Card>
        )}
      </Paper>
    </Container>
  );
};

export default ImageUploadTest; 