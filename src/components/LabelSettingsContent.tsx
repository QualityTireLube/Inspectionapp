import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Switch,
  FormControlLabel,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  Stack
} from '@mui/material';
import {
  Architecture as ArchitectureIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Archive as ArchiveIcon,
  Visibility as PreviewIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { LabelTemplate, PAPER_SIZES } from '../types/labelTemplates';
import { LabelApiService } from '../services/labelApi';
import { LabelPdfGenerator, LabelData } from '../services/labelPdfGenerator';

const LabelSettingsContent: React.FC = () => {
  const [templates, setTemplates] = useState<LabelTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [defaultCopies, setDefaultCopies] = useState(1);
  const [defaultPaperSize, setDefaultPaperSize] = useState<'Brother-QL800' | 'Dymo-TwinTurbo'>('Brother-QL800');
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  // Removed unused state variables

  useEffect(() => {
    loadTemplates();
    loadSettings();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const allTemplates = await LabelApiService.getAllTemplates();
      setTemplates(allTemplates.filter(t => !t.archived));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = () => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('labelSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        setDefaultCopies(settings.defaultCopies || 1);
        setDefaultPaperSize(settings.defaultPaperSize || 'Brother-QL800');
        setAutoSaveEnabled(settings.autoSaveEnabled !== false);
      } catch (error) {
        console.error('Error loading label settings:', error);
      }
    }
  };

  const saveSettings = () => {
    const settings = {
      defaultCopies,
      defaultPaperSize,
      autoSaveEnabled,
    };
    localStorage.setItem('labelSettings', JSON.stringify(settings));
  };

  const handleSettingChange = (setting: string, value: any) => {
    switch (setting) {
      case 'defaultCopies':
        setDefaultCopies(value);
        break;
      case 'defaultPaperSize':
        setDefaultPaperSize(value);
        break;
      case 'autoSaveEnabled':
        setAutoSaveEnabled(value);
        break;
    }
    // Auto-save settings
    setTimeout(saveSettings, 100);
  };

  const handlePreviewTemplate = async (template: LabelTemplate) => {
    try {
      // Generate sample data for preview
      const sampleData: LabelData = {};
      template.fields.forEach(field => {
        sampleData[field.name] = field.value || field.name;
      });

      const pdfBytes = await LabelPdfGenerator.generateLabelPdf(template, sampleData, 1);
      LabelPdfGenerator.openPdfInNewTab(pdfBytes);
    } catch (error) {
      setError('Failed to generate preview');
    }
  };

  const handleArchiveTemplate = async (template: LabelTemplate) => {
    try {
      await LabelApiService.archiveTemplate(template.id);
      await loadTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive template');
    }
  };

  const getTemplateStats = () => {
    const totalFields = templates.reduce((sum, template) => sum + template.fields.length, 0);
    const avgFields = templates.length > 0 ? Math.round(totalFields / templates.length) : 0;
    const paperSizeCount = templates.reduce((acc, template) => {
      acc[template.paperSize] = (acc[template.paperSize] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalTemplates: templates.length,
      totalFields,
      avgFields,
      paperSizeCount
    };
  };

  const stats = getTemplateStats();

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Label Settings
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => window.open('/label-manager', '_blank')}
        >
          Open Label Manager
        </Button>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Stack spacing={3}>
        {/* Default Settings */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Default Settings
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Configure default values for new label templates
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              label="Default Copies"
              type="number"
              value={defaultCopies}
              onChange={(e) => handleSettingChange('defaultCopies', Math.max(1, parseInt(e.target.value) || 1))}
              inputProps={{ min: 1, max: 100 }}
              size="small"
              fullWidth
            />

            <FormControl size="small" fullWidth>
              <InputLabel>Default Paper Size</InputLabel>
              <Select
                value={defaultPaperSize}
                onChange={(e) => handleSettingChange('defaultPaperSize', e.target.value)}
                label="Default Paper Size"
              >
                {Object.entries(PAPER_SIZES).map(([key, config]) => (
                  <MenuItem key={key} value={key}>
                    {config.name} ({config.width} x {config.height} {config.unit})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={autoSaveEnabled}
                  onChange={(e) => handleSettingChange('autoSaveEnabled', e.target.checked)}
                />
              }
              label="Auto-save templates while editing"
            />
          </Box>
        </Paper>

        {/* Statistics */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Template Statistics
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Overview of your label templates
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2">Total Templates:</Typography>
              <Chip label={stats.totalTemplates} size="small" />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2">Total Fields:</Typography>
              <Chip label={stats.totalFields} size="small" />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2">Average Fields per Template:</Typography>
              <Chip label={stats.avgFields} size="small" />
            </Box>
            
            <Divider />
            
            <Typography variant="subtitle2" sx={{ mt: 1 }}>
              Paper Size Distribution:
            </Typography>
            {Object.entries(stats.paperSizeCount).map(([paperSize, count]) => (
              <Box key={paperSize} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">{PAPER_SIZES[paperSize]?.name || paperSize}:</Typography>
                <Chip label={count} size="small" variant="outlined" />
              </Box>
            ))}
          </Box>

          <Button
            fullWidth
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadTemplates}
            sx={{ mt: 2 }}
            disabled={loading}
          >
            Refresh Statistics
          </Button>
        </Paper>

        {/* Recent Templates */}
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Recent Templates ({templates.length})
            </Typography>
            <Button
              variant="outlined"
              startIcon={<ArchitectureIcon />}
              onClick={() => window.open('/label-manager', '_blank')}
              size="small"
            >
              Manage All
            </Button>
          </Box>

          {templates.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <ArchitectureIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography variant="body1" color="text.secondary">
                No label templates found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Create your first template to get started
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => window.open('/label-manager', '_blank')}
              >
                Create Template
              </Button>
            </Box>
          ) : (
            <List>
              {templates.slice(0, 5).map((template, index) => (
                <React.Fragment key={template.id}>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemIcon>
                      <ArchitectureIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={template.labelName}
                      secondary={
                        <Box>
                          <Typography variant="caption" display="block">
                            {template.fields.length} fields • {PAPER_SIZES[template.paperSize]?.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Created {format(new Date(template.createdDate), 'MMM dd, yyyy')} by {template.createdBy}
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Tooltip title="Preview">
                        <IconButton 
                          size="small" 
                          onClick={() => handlePreviewTemplate(template)}
                        >
                          <PreviewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Archive">
                        <IconButton 
                          size="small" 
                          onClick={() => handleArchiveTemplate(template)}
                        >
                          <ArchiveIcon />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < Math.min(templates.length - 1, 4) && <Divider />}
                </React.Fragment>
              ))}
              {templates.length > 5 && (
                <ListItem sx={{ px: 0, justifyContent: 'center' }}>
                  <Button
                    variant="text"
                    onClick={() => window.open('/label-manager', '_blank')}
                  >
                    View {templates.length - 5} more templates
                  </Button>
                </ListItem>
              )}
            </List>
          )}
        </Paper>
      </Stack>
    </Box>
  );
};

export default LabelSettingsContent; 