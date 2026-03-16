import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Drawer,
  useTheme,
  useMediaQuery,
  IconButton,
  Toolbar,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  People as PeopleIcon,
  LocalOffer as StickerIcon,
  Architecture as ArchitectureIcon,
  Print as PrintIcon,
  Menu as MenuIcon,
  VpnKey as TokenIcon,
  LocationOn as LocationIcon,
  BugReport as DebugIcon,
  Build as PartsIcon,
} from '@mui/icons-material';

// Import the individual components
import GeneralSettings from '../components/GeneralSettings';
import UsersContent from '../components/UsersContent';
import LocationSettings from '../components/LocationSettings';
import TokenGenerator from './TokenGenerator';
import { useUser } from '../contexts/UserContext';
import LocationAwareStickerSettings from '../components/LocationAwareStickerSettings';

import LocationAwarePrinterSettings from '../components/LocationAwarePrinterSettings';
import RolePermissionsManager from '../components/RolePermissionsManager';
import DebugSettings from '../components/DebugSettings';
// Removed Parts Tech and NexPart settings

type SettingsSection = 'general' | 'users' | 'stickers' | 'locations' | 'printers' | 'tokens' | 'roles' | 'debug';

const DRAWER_WIDTH = 280;
const SETTINGS_SECTION_STORAGE_KEY = 'settings.selectedSection';

const Settings: React.FC = () => {
  const [selectedSection, setSelectedSection] = useState<SettingsSection>('general');
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, userLocation } = useUser();
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleSectionChange = (section: SettingsSection) => {
    setSelectedSection(section);
    try { localStorage.setItem(SETTINGS_SECTION_STORAGE_KEY, section); } catch {}
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: SettingsSection) => {
    setSelectedSection(newValue);
    try { localStorage.setItem(SETTINGS_SECTION_STORAGE_KEY, newValue); } catch {}
  };

  const navigationItems = [
    {
      id: 'general' as SettingsSection,
      label: 'General Settings',
      icon: <SettingsIcon />,
    },
    {
      id: 'users' as SettingsSection,
      label: 'Users',
      icon: <PeopleIcon />,
    },
    // Admin-only Roles management
    ...(user?.role === 'admin' ? [{
      id: 'roles' as SettingsSection,
      label: 'Role Permissions',
      icon: <ArchitectureIcon />,
    }] : []),
    // Show location-specific settings for regular users, or location management for admins
    ...(userLocation ? [
      {
        id: 'stickers' as SettingsSection,
        label: 'Sticker Settings',
        icon: <StickerIcon />,
      },

      {
        id: 'printers' as SettingsSection,
        label: 'Print Settings',
        icon: <PrintIcon />,
      },
    ] : []),
    // Admin-only location management
    ...(user?.role === 'admin' ? [{
      id: 'locations' as SettingsSection,
      label: 'Location Management',
      icon: <LocationIcon />,
    }] : []),
    {
      id: 'tokens' as SettingsSection,
      label: 'Token Generator',
      icon: <TokenIcon />,
    },
    // Removed Parts Tech and NexPart settings
    // Admin-only debug settings
    ...(user?.role === 'admin' ? [{
      id: 'debug' as SettingsSection,
      label: 'Debug Settings',
      icon: <DebugIcon />,
    }] : []),
  ];

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          Settings
        </Typography>
      </Toolbar>
      <List>
        {navigationItems.map((item) => (
          <ListItem key={item.id} disablePadding>
            <ListItemButton
              selected={selectedSection === item.id}
              onClick={() => handleSectionChange(item.id)}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: theme.palette.primary.main + '20',
                  borderRight: `3px solid ${theme.palette.primary.main}`,
                  '&:hover': {
                    backgroundColor: theme.palette.primary.main + '30',
                  },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  color: selectedSection === item.id ? theme.palette.primary.main : 'inherit',
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.label}
                sx={{
                  '& .MuiTypography-root': {
                    fontWeight: selectedSection === item.id ? 600 : 400,
                  },
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  // Restore last selected section if available and allowed for this user
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_SECTION_STORAGE_KEY) as SettingsSection | null;
      if (saved) {
        const allowedIds = navigationItems.map(i => i.id);
        if (allowedIds.includes(saved)) {
          setSelectedSection(saved);
        }
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(navigationItems.map(i => i.id))]);

  const renderContent = () => {
    switch (selectedSection) {
      case 'general':
        return <GeneralSettings />;
      case 'users':
        return <UsersContent />;
      case 'stickers':
        // Show location-specific sticker settings if user has a location
        if (userLocation) {
          return (
            <LocationAwareStickerSettings
              locationId={userLocation.id}
              locationName={userLocation.name}
            />
          );
        }
        return <div>Please contact admin to assign you to a location to access sticker settings.</div>;

      case 'printers':
        // Show location-specific printer settings if user has a location
        if (userLocation) {
          return (
            <LocationAwarePrinterSettings
              locationId={userLocation.id}
              locationName={userLocation.name}
            />
          );
        }
        return <div>Please contact admin to assign you to a location to access printer settings.</div>;
      case 'locations':
        // Admin-only location management
        return <LocationSettings />;
      case 'tokens':
        return <TokenGenerator />;
      case 'roles':
        return <RolePermissionsManager />;
      // Removed Parts Tech and NexPart content
      case 'debug':
        return <DebugSettings />;
      default:
        return <GeneralSettings />;
    }
  };

  return (
    <Box sx={{ display: 'flex' }}>
      {/* Desktop Navigation Drawer - only show on desktop */}
      {!isMobile && (
        <Box
          component="nav"
          sx={{ width: DRAWER_WIDTH, flexShrink: 0 }}
          aria-label="settings navigation"
        >
          <Drawer
            variant="permanent"
            sx={{
              '& .MuiDrawer-paper': { 
                boxSizing: 'border-box', 
                width: DRAWER_WIDTH,
                borderRight: `1px solid ${theme.palette.divider}`,
                position: 'relative',
              },
            }}
            open
          >
            {drawer}
          </Drawer>
        </Box>
      )}

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          minHeight: '100vh',
          backgroundColor: 'white',
        }}
      >
        {/* Mobile Tabs - only show on mobile */}
        {isMobile && (
          <Paper 
            elevation={1} 
            sx={{ 
              borderBottom: 1, 
              borderColor: 'divider',
              position: 'sticky',
              top: 0,
              zIndex: theme.zIndex.appBar - 1,
            }}
          >
            <Tabs
              value={selectedSection}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              sx={{
                minHeight: 48,
                '& .MuiTab-root': {
                  minHeight: 48,
                  textTransform: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                },
              }}
            >
              {navigationItems.map((item) => (
                <Tab
                  key={item.id}
                  label={item.label}
                  value={item.id}
                  icon={item.icon}
                  iconPosition="start"
                  sx={{
                    '& .MuiTab-iconWrapper': {
                      marginRight: 1,
                      marginBottom: 0,
                    },
                  }}
                />
              ))}
            </Tabs>
          </Paper>
        )}

        <Container maxWidth="xl" sx={{ py: 3, px: 3 }}>
          {renderContent()}
        </Container>
      </Box>
    </Box>
  );
};

export default Settings; 