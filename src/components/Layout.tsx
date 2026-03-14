import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ConnectionStatusIndicator from './ConnectionStatusIndicator';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Box,
  Avatar,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  Menu,
  MenuItem,
  ListItemIcon,
  Collapse,
  useTheme,
  useMediaQuery,
  Paper,
  BottomNavigation,
  BottomNavigationAction,
  Fab
} from '@mui/material';
import { debug } from '../services/debugManager';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Settings as SettingsIcon,
  AccountCircle as AccountCircleIcon,
  Home as HomeIcon,
  QuestionAnswer as QuestionAnswerIcon,
  Description as DescriptionIcon,
  Assessment as AssessmentIcon,
  Archive as ArchiveIcon,
  ExpandLess,
  ExpandMore,
  Group as GroupIcon,
  Close as CloseIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Assignment as AssignmentIcon,
  People as PeopleIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
  Refresh as RefreshIcon,
  Architecture as ArchitectureIcon,
  Analytics as AnalyticsIcon,
  LocalPolice as LocalPoliceIcon,
  Security as SecurityIcon,
  Label as LabelIcon,
  CarRepair as CarRepairIcon
} from '@mui/icons-material';
import { signOutUser as logout } from '../services/firebase/auth';
import { getRoles, getUserSettings, UserRole } from '../services/firebase/users';
import { appPages } from '../pages/pageRegistry';
import { fetchSchemas } from '../services/inspectionSchemasApi';
import { useUser } from '../contexts/UserContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const { user, allowedPageIds } = useUser();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileMenuAnchor, setProfileMenuAnchor] = useState<null | HTMLElement>(null);
  const [archivedExpanded, setArchivedExpanded] = useState(false);
  const [adminExpanded, setAdminExpanded] = useState(false);
  const [dviExpanded, setDviExpanded] = useState(false);
  
  
  // Mobile view state
  const [mobileViewEnabled, setMobileViewEnabled] = useState(false);
  const [bottomNavValue, setBottomNavValue] = useState(0);
  const [dviMenuItems, setDviMenuItems] = useState<{ text: string; path: string; icon: JSX.Element }[]>([]);

  const currentUserEmail = localStorage.getItem('userEmail') || '';
  const currentUserName = localStorage.getItem('userName') || '';

  // Initialize settings and DVI items on mount
  useEffect(() => {
    // Prefer server-backed per-user setting, fallback to localStorage, then role default
    const initMobileView = async () => {
      try {
        const serverSettings = await getUserSettings();
        if (serverSettings && typeof serverSettings === 'object' && serverSettings.mobileViewEnabled !== undefined) {
          setMobileViewEnabled(!!serverSettings.mobileViewEnabled);
          return;
        }
      } catch {}

      const savedSettings = localStorage.getItem('quickCheckSettings');
      if (savedSettings) {
        try {
          const settings = JSON.parse(savedSettings);
          setMobileViewEnabled(settings.mobileViewEnabled !== undefined ? settings.mobileViewEnabled : true);
          return;
        } catch (error) {
      debug.error('storage', 'Error loading mobile view settings:', error);
        }
      }
      setMobileViewEnabled(true);
    };
    initMobileView();

    // Load inspection types for bottom nav visibility
    (async () => {
      try {
        const data = await fetchSchemas();
        const schemas = (data as any)?.schemas || {};
        const enabled = Object.entries(schemas)
          .filter(([, s]: any) => s?.showInBottomNav !== false)
          .sort(([, a]: any, [, b]: any) => {
            const A = typeof a?.navOrder === 'number' ? a.navOrder : Number.MAX_SAFE_INTEGER;
            const B = typeof b?.navOrder === 'number' ? b.navOrder : Number.MAX_SAFE_INTEGER;
            if (A !== B) return A - B;
            return (a?.title || '').localeCompare(b?.title || '');
          });
        const items: { text: string; path: string; icon: JSX.Element }[] = enabled.flatMap(([key, s]: any) => {
          const path = key === 'quick_check' ? '/quick-check' : key === 'no_check' ? '/no-check' : key === 'vsi' ? '/vsi' : null;
          if (!path) return [];
          const label = s.title || key;
          let icon: JSX.Element = <AssignmentIcon />;
          const iconKey = s?.navIcon;
          if (iconKey === 'security' || key === 'vsi') icon = <SecurityIcon />;
          else if (iconKey === 'question_answer' || key === 'quick_check') icon = <QuestionAnswerIcon />;
          else if (iconKey === 'assignment') icon = <AssignmentIcon />;
          else if (iconKey === 'car_repair') icon = <CarRepairIcon />;
          else if (iconKey === 'build') icon = <ArchitectureIcon />;
          return [{ text: label, path, icon }];
        });
        setDviMenuItems(items);
      } catch {}
    })();
    
    // Set bottom nav value based on current location
    const path = window.location.pathname;
    const computeIndex = (p: string) => {
      if (p === '/tech-dashboard') return 0;
      if (p === '/settings') return (dviMenuItems.length + 1);
      const idx = dviMenuItems.findIndex(i => i.path === p);
      return idx >= 0 ? idx + 1 : 0;
    };
    setBottomNavValue(computeIndex(path));
  }, []);

  // Update bottom nav value when route changes
  useEffect(() => {
    const path = window.location.pathname;
    const computeIndex = (p: string) => {
      if (p === '/tech-dashboard') return 0;
      if (p === '/settings') return (dviMenuItems.length + 1);
      const idx = dviMenuItems.findIndex(i => i.path === p);
      return idx >= 0 ? idx + 1 : 0;
    };
    setBottomNavValue(computeIndex(path));
  }, [window.location.pathname, dviMenuItems]);

  // Listen for settings changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'quickCheckSettings' && e.newValue) {
        try {
          const settings = JSON.parse(e.newValue);
          setMobileViewEnabled(settings.mobileViewEnabled !== undefined ? settings.mobileViewEnabled : true);
        } catch (error) {
          debug.error('storage', 'Error parsing settings from storage event:', error);
        }
      }
    };

    const handleSettingsChanged = (e: CustomEvent) => {
      const settings = e.detail;
      setMobileViewEnabled(settings.mobileViewEnabled !== undefined ? settings.mobileViewEnabled : true);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('quickCheckSettingsChanged', handleSettingsChanged as EventListener);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('quickCheckSettingsChanged', handleSettingsChanged as EventListener);
    };
  }, []);


  const getUserInitials = (name?: string) => {
    const userName = name || localStorage.getItem('userName') || '';
    if (!userName) return 'U';
    const names = userName.trim().split(' ');
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  const isAdmin = () => user?.role === 'admin';

  /** Returns true if the current user's role is allowed to access the given pageId. */
  const canAccessPage = (pageId: string) => {
    if (isAdmin()) return true;
    if (!allowedPageIds) return false;
    return allowedPageIds.includes(pageId);
  };

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setDrawerOpen(false);
  };

  const handleArchivedToggle = () => {
    setArchivedExpanded(!archivedExpanded);
  };

  const handleAdminToggle = () => {
    setAdminExpanded(!adminExpanded);
  };

  const handleDviToggle = () => {
    setDviExpanded(!dviExpanded);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setProfileMenuAnchor(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setProfileMenuAnchor(null);
  };

  const handleProfileClick = () => {
    navigate('/profile');
    handleProfileMenuClose();
  };

  const handleSettingsClick = () => {
    navigate('/settings');
    handleProfileMenuClose();
  };

  const handleLogoutClick = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      debug.error('auth', 'Logout error:', error);
      // Force logout even if API call fails
      localStorage.removeItem('token');
      localStorage.removeItem('userName');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userId');
      navigate('/login');
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const menuItems = [
    { text: 'Home', path: '/' },
    { text: 'Quick Check', path: '/quick-check' },
  ];

  const archivedMenuItems = [
    { text: 'Archived Static Stickers', path: '/oil-change-stickers/archived' },
    { text: 'Archived Quick Check', path: '/history' }
  ];

  // Legacy static definition kept for reference; dynamic items are loaded above.


  const getHomeRedirectPath = () => {
    try {
      const raw = localStorage.getItem('roles.cache');
      if (raw && user?.role) {
        const roles: UserRole[] = JSON.parse(raw);
        const role = roles.find(r => r.id === user.role);
        if (role?.homePageId) {
          const page = appPages.find(p => p.id === role.homePageId);
          if (page) return page.path;
        }
      }
    } catch {}
    return '/';
  };

  // Cache roles in localStorage occasionally for quick sync redirect
  useEffect(() => {
    (async () => {
      try {
        const roles = await getRoles();
        localStorage.setItem('roles.cache', JSON.stringify(roles));
      } catch {}
    })();
  }, []);

  const drawer = (
    <Box sx={{ width: 250 }} role="presentation">
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" component="div">
          Navigation
        </Typography>
      </Box>
      <Divider />
      <List>
        {canAccessPage('home') && (
          <ListItem disablePadding>
            <ListItemButton onClick={() => handleNavigation(getHomeRedirectPath())}>
              <ListItemIcon>
                <HomeIcon />
              </ListItemIcon>
              <ListItemText primary="Home" />
            </ListItemButton>
          </ListItem>
        )}

        {canAccessPage('techDashboard') && (
          <ListItem disablePadding>
            <ListItemButton onClick={() => handleNavigation('/tech-dashboard')}>
              <ListItemIcon>
                <DashboardIcon />
              </ListItemIcon>
              <ListItemText primary="Tech Dashboard" />
            </ListItemButton>
          </ListItem>
        )}

        {canAccessPage('labels') && (
          <ListItem disablePadding>
            <ListItemButton onClick={() => handleNavigation('/labels')}>
              <ListItemIcon>
                <LabelIcon />
              </ListItemIcon>
              <ListItemText primary="Labels" />
            </ListItemButton>
          </ListItem>
        )}

        {canAccessPage('stateInspections') && (
          <ListItem disablePadding>
            <ListItemButton onClick={() => handleNavigation('/state-inspection-records')}>
              <ListItemIcon>
                <LocalPoliceIcon />
              </ListItemIcon>
              <ListItemText primary="State Inspections" />
            </ListItemButton>
          </ListItem>
        )}

        {/* Archived section — only show if user can access at least one archived page */}
        {(canAccessPage('archivedStaticStickers') || canAccessPage('archivedQuickCheck')) && (
          <>
            <ListItem disablePadding>
              <ListItemButton onClick={handleArchivedToggle}>
                <ListItemText primary="Archived" />
                {archivedExpanded ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
            </ListItem>
            <Collapse in={archivedExpanded} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {archivedMenuItems
                  .filter(item => {
                    if (item.path === '/oil-change-stickers/archived') return canAccessPage('archivedStaticStickers');
                    if (item.path === '/history') return canAccessPage('archivedQuickCheck');
                    return true;
                  })
                  .map((item) => (
                    <ListItem key={item.text} disablePadding>
                      <ListItemButton sx={{ pl: 4 }} onClick={() => handleNavigation(item.path)}>
                        <ListItemText primary={item.text} />
                      </ListItemButton>
                    </ListItem>
                  ))}
              </List>
            </Collapse>
          </>
        )}
        
        {/* DVI section — filter individual DVI items by their page IDs */}
        {dviMenuItems.length > 0 && (
          <>
            <ListItem disablePadding>
              <ListItemButton onClick={handleDviToggle}>
                <ListItemIcon>
                  <CarRepairIcon />
                </ListItemIcon>
                <ListItemText primary="DVI" />
                {dviExpanded ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
            </ListItem>
            <Collapse in={dviExpanded} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {dviMenuItems
                  .filter(item => {
                    if (item.path === '/quick-check') return canAccessPage('quickCheck');
                    if (item.path === '/no-check') return canAccessPage('noCheck');
                    if (item.path === '/vsi') return canAccessPage('vsi');
                    return true;
                  })
                  .map((item) => (
                    <ListItem key={item.text} disablePadding>
                      <ListItemButton sx={{ pl: 4 }} onClick={() => handleNavigation(item.path)}>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          {item.icon}
                        </ListItemIcon>
                        <ListItemText primary={item.text} />
                      </ListItemButton>
                    </ListItem>
                  ))}
              </List>
            </Collapse>
          </>
        )}
        
        {/* Admin section — only show for roles that can access admin pages */}
        {(canAccessPage('quickCheckDrafts') || canAccessPage('databases') || canAccessPage('labelManager') ||
          canAccessPage('printQueueArchive') || canAccessPage('stateInspectionAnalytics') ||
          canAccessPage('printTokenManager') || canAccessPage('roleManager')) && (
          <>
            <ListItem disablePadding>
              <ListItemButton onClick={handleAdminToggle}>
                <ListItemText primary="Admin" />
                {adminExpanded ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
            </ListItem>
            <Collapse in={adminExpanded} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {[
                  { text: 'Quick Check Drafts',        path: '/quick-check-drafts',          pageId: 'quickCheckDrafts' },
                  { text: 'Database',                   path: '/databases',                   pageId: 'databases' },
                  { text: 'Label Manager',              path: '/label-manager',               pageId: 'labelManager' },
                  { text: 'Print Queue Archive',        path: '/print-queue-archive',         pageId: 'printQueueArchive' },
                  { text: 'State Inspection Analytics', path: '/state-inspection-records?tab=2', pageId: 'stateInspectionAnalytics' },
                  { text: 'Print Token Manager',        path: '/print-token-manager',         pageId: 'printTokenManager' },
                  { text: 'Role Manager',               path: '/role-manager',                pageId: 'roleManager' },
                ]
                  .filter(item => canAccessPage(item.pageId))
                  .map((item) => (
                    <ListItem key={item.text} disablePadding>
                      <ListItemButton sx={{ pl: 4 }} onClick={() => handleNavigation(item.path)}>
                        <ListItemText primary={item.text} />
                      </ListItemButton>
                    </ListItem>
                  ))}
              </List>
            </Collapse>
          </>
        )}
      </List>
    </Box>
  );


  const handleBottomNavChange = (event: React.SyntheticEvent, newValue: number) => {
    setBottomNavValue(newValue);
    if (newValue === 0) {
      navigate('/tech-dashboard');
      return;
    }
    const settingsIndex = dviMenuItems.length + 1;
    if (newValue === settingsIndex) {
      navigate('/settings');
      return;
    }
    const item = dviMenuItems[newValue - 1];
    if (item) navigate(item.path);
  };

  // Check if we're in QuickCheck form mode (should hide bottom nav)
  const isInQuickCheckForm = () => {
    const path = window.location.pathname;
    // Only hide bottom nav when actually in a specific inspection form, not on the main quick-check page
    return path.includes('/quick-check/');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#024FFF' }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography
            variant="h6"
            component="div"
            sx={{ flexGrow: 1, cursor: 'pointer' }}
            onClick={() => navigate('/')}
            title="Go to Home"
          >
            DVI Management
          </Typography>
          <IconButton
            onClick={handleProfileMenuOpen}
            sx={{
              width: 40,
              height: 40,
              backgroundColor: '#024FFF',
              color: 'white',
              mr: 1,
              '&:hover': {
                backgroundColor: '#0240E6',
              }
            }}
          >
            <Avatar
              sx={{
                width: 32,
                height: 32,
                fontSize: '0.875rem',
                fontWeight: 'bold',
                backgroundColor: 'transparent',
                color: 'white'
              }}
            >
              {getUserInitials()}
            </Avatar>
          </IconButton>
          <IconButton
            onClick={handleRefresh}
            sx={{
              width: 40,
              height: 40,
              backgroundColor: '#f5f5f5',
              color: '#666',
              '&:hover': {
                backgroundColor: '#e0e0e0',
              }
            }}
          >
            <RefreshIcon />
          </IconButton>
          <ConnectionStatusIndicator position="relative" compact={true} />
        </Toolbar>
      </AppBar>

      <Menu
        anchorEl={profileMenuAnchor}
        open={Boolean(profileMenuAnchor)}
        onClose={handleProfileMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 150,
          }
        }}
      >
        <MenuItem onClick={handleProfileClick}>
          <ListItemIcon>
            <PersonIcon fontSize="small" />
          </ListItemIcon>
          Profile
        </MenuItem>
        <MenuItem onClick={handleSettingsClick}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          Settings
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogoutClick}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>

      <Drawer
        variant="temporary"
        anchor="left"
        open={drawerOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={{
          display: { xs: 'block' },
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: 250 
          },
        }}
      >
        {drawer}
      </Drawer>

      <Container 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          py: 4, 
          pb: mobileViewEnabled && !isInQuickCheckForm() ? 10 : 4,
          backgroundColor: 'white',
          minHeight: 'calc(100vh - 64px)', // Subtract AppBar height
          margin: 0,
          maxWidth: 'none !important',
          width: '100%'
        }}
      >
        {children}
      </Container>

      {/* Bottom Navigation for Mobile View */}
      {mobileViewEnabled && !isInQuickCheckForm() && (
        <Paper 
          sx={{ 
            position: 'fixed', 
            bottom: 0, 
            left: 0, 
            right: 0, 
            zIndex: 1000,
            borderTop: 1,
            borderColor: 'divider',
            backgroundColor: '#024FFF'
          }} 
          elevation={3}
        >
          <BottomNavigation
            value={bottomNavValue}
            onChange={handleBottomNavChange}
            showLabels
            sx={{ 
              height: 70,
              backgroundColor: '#024FFF',
              '& .MuiBottomNavigationAction-root': {
                minWidth: 'auto',
                fontSize: '0.75rem',
                color: 'rgba(255, 255, 255, 0.7)',
                '&.Mui-selected': {
                  color: 'white',
                },
              },
            }}
          >
              <BottomNavigationAction label="Dashboard" icon={<DashboardIcon />} />
              {dviMenuItems.map((item, idx) => (
                <BottomNavigationAction key={idx} label={item.text} icon={item.icon} />
              ))}
              <BottomNavigationAction label="Settings" icon={<SettingsIcon />} />
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  );
};

export default Layout; 