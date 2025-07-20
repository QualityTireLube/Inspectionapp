import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Button,
  Alert,
  CircularProgress,
  Paper,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import { 
  Add as AddIcon, 
  Architecture as ArchitectureIcon,
  Download as ImportIcon,
  ExpandMore as ExpandMoreIcon,
  ArrowBack as BackIcon
} from '@mui/icons-material';
import { LabelTemplate } from '../types/labelTemplates';
import { LabelApiService } from '../services/labelApi';
import { useLabelStore } from '../stores/labelStore';
import LabelTemplateCard from '../components/LabelTemplateCard';
import LabelEditor from '../components/LabelEditor';
import { labelTemplates, getTireTemplates, getPartsTemplates } from '../data/labelTemplates';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`label-tabpanel-${index}`}
      aria-labelledby={`label-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const LabelManager: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<LabelTemplate | null>(null);
  const [importMenuAnchor, setImportMenuAnchor] = useState<null | HTMLElement>(null);
  
  const {
    templates,
    loading,
    error,
    setTemplates,
    setLoading,
    setError,
    clearError,
    getActiveTemplates,
    getArchivedTemplates,
    setActiveTemplate
  } = useLabelStore();

  // Load templates on component mount
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      clearError();
      
      const allTemplates = await LabelApiService.getAllTemplates();
      setTemplates(allTemplates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleCreateNew = () => {
    setEditingTemplate(null);
    setActiveTemplate(null);
    setShowEditor(true);
  };

  const handleEditTemplate = (template: LabelTemplate) => {
    setEditingTemplate(template);
    setActiveTemplate(template);
    setShowEditor(true);
  };

  const handleCloseEditor = () => {
    setShowEditor(false);
    setEditingTemplate(null);
    setActiveTemplate(null);
    // Reload templates after editing
    loadTemplates();
  };

  const handleArchiveTemplate = async (template: LabelTemplate) => {
    try {
      await LabelApiService.archiveTemplate(template.id);
      await loadTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive template');
    }
  };

  const handleRestoreTemplate = async (template: LabelTemplate) => {
    try {
      await LabelApiService.restoreTemplate(template.id);
      await loadTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore template');
    }
  };

  const handleDeleteTemplate = async (template: LabelTemplate) => {
    if (!window.confirm('Are you sure you want to permanently delete this template? This action cannot be undone.')) {
      return;
    }
    
    try {
      await LabelApiService.deleteTemplate(template.id);
      await loadTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template');
    }
  };

  const handleDuplicateTemplate = async (template: LabelTemplate) => {
    try {
      const userEmail = localStorage.getItem('userEmail') || 'Unknown User';
      await LabelApiService.duplicateTemplate(template.id, userEmail);
      await loadTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate template');
    }
  };

  const handleImportMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setImportMenuAnchor(event.currentTarget);
  };

  const handleImportMenuClose = () => {
    setImportMenuAnchor(null);
  };

  const handleExit = () => {
    // Navigate back to home or previous page
    window.history.back();
  };

  const handleImportPredefinedTemplates = async (category?: 'tire' | 'parts' | 'all') => {
    handleImportMenuClose();
    
    try {
      setLoading(true);
      const userEmail = localStorage.getItem('userEmail') || 'System';
      
      let templatesToImport: LabelTemplate[] = [];
      
      switch(category) {
        case 'tire':
          templatesToImport = getTireTemplates();
          break;
        case 'parts':
          templatesToImport = getPartsTemplates();
          break;
        default:
          templatesToImport = labelTemplates;
      }
      
      // Import templates one by one
      for (const template of templatesToImport) {
        const templateData = {
          ...template,
          createdBy: userEmail,
          createdDate: new Date().toISOString()
        };
        
        try {
          await LabelApiService.createTemplate(templateData);
        } catch (err) {
          console.warn(`Failed to import template: ${template.labelName}`, err);
        }
      }
      
      // Reload templates to show imported ones
      await loadTemplates();
      
      const categoryText = category ? `${category} ` : '';
      alert(`Successfully imported ${categoryText}templates!`);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import templates');
    } finally {
      setLoading(false);
    }
  };

  const activeTemplates = getActiveTemplates();
  const archivedTemplates = getArchivedTemplates();

  if (showEditor) {
    return (
      <LabelEditor
        template={editingTemplate}
        onClose={handleCloseEditor}
        onSave={handleCloseEditor}
      />
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ py: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<BackIcon />}
              onClick={handleExit}
              sx={{ mr: 2 }}
            >
              Exit
            </Button>
            <ArchitectureIcon sx={{ fontSize: 32, color: 'primary.main' }} />
            <Typography variant="h4" component="h1">
              Label Template Manager
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<ImportIcon />}
              endIcon={<ExpandMoreIcon />}
              onClick={handleImportMenuOpen}
              sx={{ minWidth: 160 }}
            >
              Import Templates
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateNew}
              sx={{ minWidth: 160 }}
            >
              Create New Template
            </Button>
          </Box>
        </Box>

        {/* Import Menu */}
        <Menu
          anchorEl={importMenuAnchor}
          open={Boolean(importMenuAnchor)}
          onClose={handleImportMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          <MenuItem onClick={() => handleImportPredefinedTemplates('all')}>
            <ListItemIcon>
              <ImportIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>All Templates (9)</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => handleImportPredefinedTemplates('tire')}>
            <ListItemIcon>
              <ImportIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Tire Templates (5)</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => handleImportPredefinedTemplates('parts')}>
            <ListItemIcon>
              <ImportIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Parts Templates (4)</ListItemText>
          </MenuItem>
        </Menu>

        {/* Error Alert */}
        {error && (
          <Alert 
            severity="error" 
            onClose={clearError}
            sx={{ mb: 3 }}
          >
            {error}
          </Alert>
        )}

        {/* Loading */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Content */}
        {!loading && (
          <Paper sx={{ width: '100%' }}>
            {/* Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={tabValue} onChange={handleTabChange}>
                <Tab 
                  label={`Active Templates (${activeTemplates.length})`} 
                  id="label-tab-0"
                  aria-controls="label-tabpanel-0"
                />
                <Tab 
                  label={`Archived Templates (${archivedTemplates.length})`} 
                  id="label-tab-1"
                  aria-controls="label-tabpanel-1"
                />
              </Tabs>
            </Box>

            {/* Active Templates Tab */}
            <TabPanel value={tabValue} index={0}>
              {activeTemplates.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <ArchitectureIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No active templates found
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Create your first label template to get started
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleCreateNew}
                  >
                    Create New Template
                  </Button>
                </Box>
              ) : (
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
                  gap: 3 
                }}>
                  {activeTemplates.map((template) => (
                    <LabelTemplateCard
                      key={template.id}
                      template={template}
                      onEdit={handleEditTemplate}
                      onArchive={handleArchiveTemplate}
                      onDuplicate={handleDuplicateTemplate}
                      showArchiveButton
                    />
                  ))}
                </Box>
              )}
            </TabPanel>

            {/* Archived Templates Tab */}
            <TabPanel value={tabValue} index={1}>
              {archivedTemplates.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <ArchitectureIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No archived templates found
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Archived templates will appear here
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
                  gap: 3 
                }}>
                  {archivedTemplates.map((template) => (
                    <LabelTemplateCard
                      key={template.id}
                      template={template}
                      onEdit={handleEditTemplate}
                      onRestore={handleRestoreTemplate}
                      onDelete={handleDeleteTemplate}
                      onDuplicate={handleDuplicateTemplate}
                      showRestoreButton
                      showDeleteButton
                    />
                  ))}
                </Box>
              )}
            </TabPanel>
          </Paper>
        )}
      </Box>
    </Container>
  );
};

export default LabelManager; 