/**
 * Enhanced Parts Ordering Integration Example
 * 
 * This shows how to integrate the new secure Parts Tech system
 * with your existing Parts Ordering page
 */

import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Tabs,
  Tab,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import PartsTeachIntegration from './PartsTeachIntegration';
import { getPartsTeachService } from '../services/partsTechService';
import { PartResult } from '../types/partsTech';

const PartsOrderingEnhanced: React.FC = () => {
  // Parts search state
  const [openPartsSearch, setOpenPartsSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<PartResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [vinSearchTerm, setVinSearchTerm] = useState('');
  const [searchTab, setSearchTab] = useState(0);
  const [selectedLocation, setSelectedLocation] = useState<{id: string, name: string} | null>(null);

  // Handle when Parts Tech is ready for searching
  const handlePartsSearchReady = (locationId: string, locationName: string) => {
    setSelectedLocation({ id: locationId, name: locationName });
    setOpenPartsSearch(true);
    setSearchResults([]);
    setSearchTerm('');
    setVinSearchTerm('');
    setSearchTab(0);
  };

  // Handle when setup is required
  const handleSetupRequired = (locationId: string, locationName: string) => {
    // The PartsTeachIntegration component handles the setup dialog
    console.log(`Setup required for ${locationName} (${locationId})`);
  };

  // Search parts by keyword
  const searchPartsByKeyword = async () => {
    if (!searchTerm.trim()) return;
    
    setIsSearching(true);
    try {
      const service = getPartsTeachService();
      if (!service) {
        throw new Error('Parts Tech service not initialized');
      }

      const searchResponse = await service.searchParts({
        searchParams: {
          keyword: searchTerm.trim()
        }
      });

      if (searchResponse.success && searchResponse.data) {
        setSearchResults(searchResponse.data.parts || []);
      } else {
        throw new Error(searchResponse.error?.message || 'Search failed');
      }
    } catch (error: any) {
      console.error('Parts search failed:', error);
      setSearchResults([]);
      // You could show an error snackbar here
    } finally {
      setIsSearching(false);
    }
  };

  // Search parts by VIN
  const searchPartsByVin = async () => {
    if (!vinSearchTerm.trim()) return;
    
    setIsSearching(true);
    try {
      const service = getPartsTeachService();
      if (!service) {
        throw new Error('Parts Tech service not initialized');
      }

      const searchResponse = await service.searchParts({
        searchParams: {
          vin: vinSearchTerm.trim()
        }
      });

      if (searchResponse.success && searchResponse.data) {
        setSearchResults(searchResponse.data.parts || []);
      } else {
        throw new Error(searchResponse.error?.message || 'VIN search failed');
      }
    } catch (error: any) {
      console.error('VIN search failed:', error);
      setSearchResults([]);
      // You could show an error snackbar here
    } finally {
      setIsSearching(false);
    }
  };

  // Add part to order (you would integrate this with your existing order system)
  const handleAddPartToOrder = (part: PartResult) => {
    console.log('Adding part to order:', part);
    // Here you would integrate with your existing order creation logic
    // For example:
    // setFormData({
    //   partNumber: part.partNumber,
    //   partName: part.partName,
    //   description: part.description,
    //   unitPrice: part.price || 0,
    //   supplier: part.manufacturer || 'Parts Tech',
    //   // ... other fields
    // });
    // setOpenDialog(true);
    setOpenPartsSearch(false);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Parts Ordering with Secure Parts Tech Integration
      </Typography>

      {/* Parts Tech Integration Component */}
      <PartsTeachIntegration
        onPartsSearchReady={handlePartsSearchReady}
        onSetupRequired={handleSetupRequired}
      />

      {/* Your existing Parts Ordering content would go here */}
      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body1">
          <strong>Integration Complete!</strong> The Parts Tech integration is now ready.
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          1. Select your company above<br />
          2. Click "Search Parts" when connected<br />
          3. If not configured, click "Setup Parts Tech" to add credentials<br />
          4. Search results will populate your parts orders
        </Typography>
      </Alert>

      {/* Parts Search Dialog */}
      <Dialog open={openPartsSearch} onClose={() => setOpenPartsSearch(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Search Parts - {selectedLocation?.name}
            </Typography>
            <IconButton onClick={() => setOpenPartsSearch(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={searchTab} onChange={(e, newValue) => setSearchTab(newValue)}>
              <Tab label="Keyword Search" />
              <Tab label="VIN Search" />
            </Tabs>
          </Box>

          {/* Keyword Search Tab */}
          {searchTab === 0 && (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  label="Search Parts by Keyword"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="e.g., brake pad, oil filter, spark plug"
                  onKeyPress={(e) => e.key === 'Enter' && searchPartsByKeyword()}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={isSearching ? <CircularProgress size={16} /> : <SearchIcon />}
                  onClick={searchPartsByKeyword}
                  disabled={isSearching || !searchTerm.trim()}
                >
                  Search
                </Button>
              </Grid>
            </Grid>
          )}

          {/* VIN Search Tab */}
          {searchTab === 1 && (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={8}>
                <TextField
                  fullWidth
                  label="Search Parts by VIN"
                  value={vinSearchTerm}
                  onChange={(e) => setVinSearchTerm(e.target.value)}
                  placeholder="Enter 17-character VIN"
                  onKeyPress={(e) => e.key === 'Enter' && searchPartsByVin()}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={isSearching ? <CircularProgress size={16} /> : <SearchIcon />}
                  onClick={searchPartsByVin}
                  disabled={isSearching || !vinSearchTerm.trim()}
                >
                  Search by VIN
                </Button>
              </Grid>
            </Grid>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Search Results ({searchResults.length} parts found)
              </Typography>
              <List>
                {searchResults.map((part, index) => (
                  <ListItem key={index} divider>
                    <ListItemText
                      primary={`${part.partNumber} - ${part.partName}`}
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {part.description}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Manufacturer: {part.manufacturer} | Price: ${part.price?.toFixed(2) || 'N/A'}
                          </Typography>
                          {part.availability && (
                            <Typography variant="body2" color="text.secondary">
                              Availability: {part.availability}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => handleAddPartToOrder(part)}
                      >
                        Add to Order
                      </Button>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {searchResults.length === 0 && (searchTerm || vinSearchTerm) && !isSearching && (
            <Alert severity="info">
              No parts found. Try a different search term or check your Parts Tech API configuration.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPartsSearch(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PartsOrderingEnhanced;
