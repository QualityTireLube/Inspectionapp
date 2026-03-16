import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, CircularProgress } from '@mui/material';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import ProfileSetupModal from './components/ProfileSetupModal';
import { WebSocketProvider } from './contexts/WebSocketProvider';
import { UserProvider } from './contexts/UserContext';
import useAuthBoot from './hooks/useAuthBoot';

// ── Eager (tiny, needed before auth resolves) ──────────────────────────────────
import Login from './pages/Login';
import Register from './pages/Register';

// ── Lazy-loaded pages (split into separate JS chunks) ─────────────────────────
const Home                   = React.lazy(() => import('./pages/Home'));
const TechDashboard          = React.lazy(() => import('./pages/TechDashboard'));
const QuickCheck             = React.lazy(() => import('./pages/QuickCheck'));
const NoCheck                = React.lazy(() => import('./pages/NoCheck'));
const VSI                    = React.lazy(() => import('./pages/VSI'));
const History                = React.lazy(() => import('./pages/History'));
const QuickCheckRecords      = React.lazy(() => import('./pages/QuickCheckRecords'));
const QuickCheckDetail       = React.lazy(() => import('./pages/QuickCheckDetail'));
const QuickCheckDrafts       = React.lazy(() => import('./pages/QuickCheckDrafts'));
const Profile                = React.lazy(() => import('./pages/Profile'));
const Settings               = React.lazy(() => import('./pages/Settings'));
const ActiveStickers         = React.lazy(() => import('./pages/ActiveStickers'));
const ArchivedStickers       = React.lazy(() => import('./pages/ArchivedStickers'));
const LabelManager           = React.lazy(() => import('./pages/LabelManager'));
const Labels                 = React.lazy(() => import('./pages/Labels'));
const StateInspectionRecords = React.lazy(() => import('./pages/StateInspectionRecords'));
const Databases              = React.lazy(() => import('./pages/Databases'));
const ImageUploadTest        = React.lazy(() => import('./pages/ImageUploadTest'));
const PrintTokenManager      = React.lazy(() => import('./pages/PrintTokenManager'));
const PrintQueueArchive      = React.lazy(() => import('./pages/PrintQueueArchive'));
const TokenExpirationTest    = React.lazy(() => import('./components/TokenExpirationTest'));
const FieldShowcase          = React.lazy(() => import('./components/Fields').then(m => ({ default: m.FieldShowcase })));
const ExistingDesignShowcase = React.lazy(() => import('./components/Fields/demo/ExistingDesignShowcase'));

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#024FFF' },
    secondary: { main: '#dc004e' },
    background: { default: '#ffffff', paper: '#ffffff' },
  },
});

const PageFallback = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
    <CircularProgress />
  </Box>
);

function App() {
  useAuthBoot();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <UserProvider>
        <ProfileSetupModal />
        <WebSocketProvider key="websocket-provider" autoConnect>
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                {/* Public */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Protected */}
                <Route path="/" element={<ProtectedRoute pageId="home"><Layout><Home /></Layout></ProtectedRoute>} />
                <Route path="/tech-dashboard" element={<ProtectedRoute pageId="techDashboard"><Layout><TechDashboard /></Layout></ProtectedRoute>} />
                <Route path="/quick-check" element={<ProtectedRoute pageId="quickCheck"><QuickCheck /></ProtectedRoute>} />
                <Route path="/no-check" element={<ProtectedRoute pageId="noCheck"><NoCheck /></ProtectedRoute>} />
                <Route path="/vsi" element={<ProtectedRoute pageId="vsi"><VSI /></ProtectedRoute>} />
                <Route path="/history" element={<ProtectedRoute pageId="archivedQuickCheck"><Layout><ErrorBoundary><History /></ErrorBoundary></Layout></ProtectedRoute>} />
                <Route path="/quick-check-records" element={<ProtectedRoute><Layout><QuickCheckRecords /></Layout></ProtectedRoute>} />
                <Route path="/quick-check/:id" element={<ProtectedRoute pageId="quickCheck"><Layout><QuickCheckDetail /></Layout></ProtectedRoute>} />
                <Route path="/quick-check-drafts" element={<ProtectedRoute pageId="quickCheckDrafts"><Layout><QuickCheckDrafts /></Layout></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute pageId="settings"><Layout><Settings /></Layout></ProtectedRoute>} />
                <Route path="/oil-change-stickers" element={<ProtectedRoute><Layout><ActiveStickers /></Layout></ProtectedRoute>} />
                <Route path="/oil-change-stickers/archived" element={<ProtectedRoute pageId="archivedStaticStickers"><Layout><ArchivedStickers /></Layout></ProtectedRoute>} />
                <Route path="/label-manager" element={<ProtectedRoute pageId="labelManager"><LabelManager /></ProtectedRoute>} />
                <Route path="/labels" element={<ProtectedRoute pageId="labels"><Layout><Labels /></Layout></ProtectedRoute>} />
                <Route path="/state-inspection-records" element={<ProtectedRoute pageId="stateInspections"><Layout><StateInspectionRecords /></Layout></ProtectedRoute>} />
                <Route path="/databases" element={<ProtectedRoute pageId="databases"><Layout><Databases /></Layout></ProtectedRoute>} />
                <Route path="/print-token-manager" element={<ProtectedRoute pageId="printTokenManager"><Layout><PrintTokenManager /></Layout></ProtectedRoute>} />
                <Route path="/print-queue-archive" element={<ProtectedRoute><Layout><PrintQueueArchive /></Layout></ProtectedRoute>} />

                {/* Dev/debug */}
                <Route path="/field-showcase" element={<ProtectedRoute><Layout><FieldShowcase /></Layout></ProtectedRoute>} />
                <Route path="/existing-design-showcase" element={<ProtectedRoute><Layout><ExistingDesignShowcase /></Layout></ProtectedRoute>} />
                <Route path="/image-upload-test" element={<ProtectedRoute><Layout><ImageUploadTest /></Layout></ProtectedRoute>} />
                <Route path="/token-expiration-test" element={<ProtectedRoute><Layout><TokenExpirationTest /></Layout></ProtectedRoute>} />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </Router>
        </WebSocketProvider>
      </UserProvider>
    </ThemeProvider>
  );
}

export default App;
