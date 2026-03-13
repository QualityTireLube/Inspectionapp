import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  FormControlLabel,
  Switch,
  Paper,
  Button,
  Grid,
  Chip,
  Alert,
  Collapse,
  IconButton,
  Divider,
  ButtonGroup,
  Tooltip,
  Card,
  CardContent,
  CardActions,
} from '@mui/material';
import {
  BugReport as BugIcon,
  Download as DownloadIcon,
  Delete as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { debugManager, DebugSettings as DebugSettingsType, DebugCategory } from '../services/debugManager';
import DebugTestComponent from './DebugTestComponent';
import InspectionTestDataButtons from './InspectionTestDataButtons';

const DebugSettings: React.FC = () => {
  const [settings, setSettings] = useState<DebugSettingsType>(debugManager.getSettings());
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    core: true,
    specialized: false,
    advanced: false,
  });

  // Load current settings on mount
  useEffect(() => {
    setSettings(debugManager.getSettings());
  }, []);

  const handleSettingChange = (category: DebugCategory, enabled: boolean) => {
    const newSettings = { ...settings, [category]: enabled };
    setSettings(newSettings);
    debugManager.updateSettings({ [category]: enabled });
  };

  const handleEnableAll = () => {
    debugManager.enableAll();
    setSettings(debugManager.getSettings());
  };

  const handleDisableAll = () => {
    debugManager.disableAll();
    setSettings(debugManager.getSettings());
  };

  const handleExportLogs = () => {
    debugManager.exportLogs();
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const categoryDescriptions = debugManager.getCategoryDescriptions();

  // Organize categories into logical groups
  const categoryGroups = {
    core: {
      title: 'Core System',
      description: 'Essential debugging for core application functionality',
      categories: ['general', 'api', 'auth', 'websocket', 'webhooks', 'storage'] as DebugCategory[],
    },
    communication: {
      title: 'Communication & Integration',
      description: 'External services and communication systems',
      categories: ['shopMonkey', 'notifications'] as DebugCategory[],
    },
    businessModules: {
      title: 'Business Modules & Inspections',
      description: 'Core business functionality and inspection workflows',
      categories: ['quickCheck', 'stateInspection', 'dvi', 'tpms', 'tireRepair', 'cashManagement'] as DebugCategory[],
    },
    features: {
      title: 'Features & Components',
      description: 'Application features and technical components',
      categories: ['print', 'labels', 'stickers', 'imageUpload', 'fileSystem'] as DebugCategory[],
    },
    userInterface: {
      title: 'User Interface',
      description: 'UI components and user interactions',
      categories: ['navigation', 'forms', 'ui'] as DebugCategory[],
    },
    data: {
      title: 'Data & Database',
      description: 'Data management and persistence',
      categories: ['database', 'sync', 'cache'] as DebugCategory[],
    },
    platform: {
      title: 'Platform & Browser',
      description: 'Platform-specific and browser compatibility',
      categories: ['safari', 'mobile', 'pwa', 'audio'] as DebugCategory[],
    },
    printSystem: {
      title: 'Print System',
      description: 'Print client and CUPS integration',
      categories: ['printClient', 'printQueue', 'cups'] as DebugCategory[],
    },
    system: {
      title: 'System & Performance',
      description: 'System monitoring and performance',
      categories: ['performance', 'network', 'security'] as DebugCategory[],
    },
    development: {
      title: 'Development & Testing',
      description: 'Development tools and testing framework',
      categories: ['development', 'testing'] as DebugCategory[],
    },
    logging: {
      title: 'Logging Levels',
      description: 'Control what types of messages are shown',
      categories: ['errors', 'warnings', 'info', 'debug'] as DebugCategory[],
    },
  };

  const getActiveCount = () => {
    return Object.values(settings).filter(Boolean).length;
  };

  const renderCategoryGroup = (groupKey: string, group: typeof categoryGroups.core) => {
    const isExpanded = expandedSections[groupKey];
    
    return (
      <Card key={groupKey} sx={{ mb: 2 }}>
        <CardContent sx={{ pb: 1 }}>
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              cursor: 'pointer'
            }}
            onClick={() => toggleSection(groupKey)}
          >
            <Box>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {group.title}
                <Chip 
                  size="small" 
                  label={`${group.categories.filter(cat => settings[cat]).length}/${group.categories.length}`}
                  color={group.categories.some(cat => settings[cat]) ? 'primary' : 'default'}
                />
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {group.description}
              </Typography>
            </Box>
            <IconButton>
              {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>

          <Collapse in={isExpanded}>
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={1}>
                {group.categories.map((category) => (
                  <Grid item xs={12} sm={6} md={4} key={category}>
                    <Box 
                      sx={{ 
                        p: 1, 
                        border: 1, 
                        borderColor: 'divider', 
                        borderRadius: 1,
                        backgroundColor: settings[category] ? 'action.selected' : 'background.paper'
                      }}
                    >
                      <FormControlLabel
                        control={
                          <Switch
                            checked={settings[category]}
                            onChange={(e) => handleSettingChange(category, e.target.checked)}
                            size="small"
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body2" fontWeight={500}>
                              {debugManager['getCategoryEmoji'](category)} {category}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {categoryDescriptions[category]}
                            </Typography>
                          </Box>
                        }
                        sx={{ 
                          m: 0,
                          alignItems: 'flex-start',
                          '& .MuiFormControlLabel-label': { 
                            ml: 1,
                            flex: 1 
                          }
                        }}
                      />
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Collapse>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <BugIcon color="primary" />
        <Typography variant="h4" component="h1">
          Debug Settings
        </Typography>
        <Chip 
          label={`${getActiveCount()} active`} 
          color={getActiveCount() > 0 ? 'primary' : 'default'}
          variant="outlined"
        />
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Debug logging</strong> helps diagnose issues but may impact performance. 
          Enable specific categories as needed for troubleshooting. Settings are automatically saved.
        </Typography>
      </Alert>

      {/* Quick Actions */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Quick Actions
        </Typography>
        <ButtonGroup variant="outlined" sx={{ mb: 2, mr: 2 }}>
          <Tooltip title="Enable all debug categories">
            <Button onClick={handleEnableAll} startIcon={<BugIcon />}>
              Enable All
            </Button>
          </Tooltip>
          <Tooltip title="Disable all except errors and warnings">
            <Button onClick={handleDisableAll} startIcon={<ClearIcon />}>
              Disable All
            </Button>
          </Tooltip>
        </ButtonGroup>
        
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={handleExportLogs}
          sx={{ ml: 2 }}
        >
          Export Debug Info
        </Button>
      </Paper>

      {/* Warning for high-impact categories */}
      {(settings.performance || settings.development || settings.api) && (
        <Alert severity="warning" sx={{ mb: 3 }} icon={<WarningIcon />}>
          <Typography variant="body2">
            <strong>Performance Impact:</strong> You have enabled debug categories that may affect application performance. 
            Consider disabling them when not actively troubleshooting.
          </Typography>
        </Alert>
      )}

      {/* Inspection Test Data */}
      <InspectionTestDataButtons />

      {/* Test Component */}
      <DebugTestComponent />

      {/* Category Groups */}
      {Object.entries(categoryGroups).map(([groupKey, group]) => 
        renderCategoryGroup(groupKey, group)
      )}

      {/* Usage Instructions */}
      <Paper sx={{ p: 3, mt: 3, backgroundColor: 'grey.50' }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <InfoIcon color="primary" />
          Usage Instructions
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Viewing Debug Output:</strong> Open your browser's Developer Tools (F12) and check the Console tab. 
          Debug messages are color-coded and timestamped for easy identification.
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Recommended Categories by Use Case:</strong>
        </Typography>
        <Box component="ul" sx={{ mt: 1, '& li': { mb: 0.5 } }}>
          <li><strong>General Issues:</strong> errors + warnings + general</li>
          <li><strong>Login Problems:</strong> auth + api + storage + safari (if Safari)</li>
          <li><strong>QuickCheck Issues:</strong> quickCheck + forms + imageUpload + print</li>
          <li><strong>State Inspection Problems:</strong> stateInspection + database + sync</li>
          <li><strong>DVI (DOT) Inspections:</strong> dvi + forms + print + stickers</li>
          <li><strong>TPMS Issues:</strong> tpms + ui + forms + print</li>
          <li><strong>Tire Repair Workflow:</strong> tireRepair + ui + forms + imageUpload</li>
          <li><strong>Cash Management:</strong> cashManagement + forms + imageUpload + sync</li>
          <li><strong>Print Issues:</strong> print + printQueue + printClient + cups</li>
          <li><strong>ShopMonkey Integration:</strong> shopMonkey + api + webhooks + sync</li>
          <li><strong>WebSocket/Real-time:</strong> websocket + webhooks + network</li>
          <li><strong>Performance Issues:</strong> performance + api + network (use sparingly)</li>
        </Box>
        <Typography variant="body2" sx={{ mt: 2, fontStyle: 'italic' }}>
          Settings are automatically saved to your browser and will persist across sessions.
        </Typography>
      </Paper>
    </Box>
  );
};

export default DebugSettings;
