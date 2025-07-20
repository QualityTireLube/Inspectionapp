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
  Menu as MenuIcon,
} from '@mui/icons-material';

// Import the individual components
import GeneralSettings from '../components/GeneralSettings';
import UsersContent from '../components/UsersContent';
import StickerSettingsContent from '../components/StickerSettingsContent';
import LabelSettingsContent from '../components/LabelSettingsContent';

type SettingsSection = 'general' | 'users' | 'stickers' | 'labels';

const DRAWER_WIDTH = 280;

const Settings: React.FC = () => {
  const [selectedSection, setSelectedSection] = useState<SettingsSection>('general');
  const [mobileOpen, setMobileOpen] = useState(false);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleSectionChange = (section: SettingsSection) => {
    setSelectedSection(section);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: SettingsSection) => {
    setSelectedSection(newValue);
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
    {
      id: 'stickers' as SettingsSection,
      label: 'Sticker Settings',
      icon: <StickerIcon />,
    },
    {
      id: 'labels' as SettingsSection,
      label: 'Label Settings',
      icon: <ArchitectureIcon />,
    },
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

  const renderContent = () => {
    switch (selectedSection) {
      case 'general':
        return <GeneralSettings />;
      case 'users':
        return <UsersContent />;
      case 'stickers':
        return <StickerSettingsContent />;
      case 'labels':
        return <LabelSettingsContent />;
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