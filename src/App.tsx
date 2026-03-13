import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import { appPages } from './pages/pageRegistry';
import { getRoles, UserRole } from './services/api';
import TechDashboard from './pages/TechDashboard';
import QuickCheck from './pages/QuickCheck';
import NoCheck from './pages/NoCheck';
import VSI from './pages/VSI';
import QuickCheckRecords from './pages/QuickCheckRecords';
import History from './pages/History';
import Layout from './components/Layout';
import QuickCheckDetail from './pages/QuickCheckDetail';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import ErrorBoundary from './components/ErrorBoundary';
import QuickCheckDrafts from './pages/QuickCheckDrafts';
import ActiveStickers from './pages/ActiveStickers';
import ArchivedStickers from './pages/ArchivedStickers';
import LabelManager from './pages/LabelManager';
import StateInspectionRecords from './pages/StateInspectionRecords';
import ShopMonkey from './pages/ShopMonkey';
import Databases from './pages/Databases';
import ImageUploadTest from './pages/ImageUploadTest';
// Removed Parts Ordering feature
import { WebSocketProvider } from './contexts/WebSocketProvider';
import { UserProvider } from './contexts/UserContext';
import { MigrationService } from './services/migrationService';
import useAuthBoot from './hooks/useAuthBoot';
import TokenExpirationTest from './components/TokenExpirationTest';
import Labels from './pages/Labels';
import PrintTokenManager from './pages/PrintTokenManager';
import PrintQueueArchive from './pages/PrintQueueArchive';
import { FieldShowcase } from './components/Fields';
import ExistingDesignShowcase from './components/Fields/demo/ExistingDesignShowcase';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#024FFF',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#ffffff',
      paper: '#ffffff',
    },
  },
});

function App() {
  // Initialize authentication on app start
  useAuthBoot();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <UserProvider>
        <WebSocketProvider key="websocket-provider" autoConnect>
          <Router future={{ 
            v7_startTransition: true,
            v7_relativeSplatPath: true 
          }}>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Protected routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <Layout>
                  <Home />
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/tech-dashboard" element={
              <ProtectedRoute>
                <Layout>
                  <TechDashboard />
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/quick-check" element={
              <ProtectedRoute>
                <QuickCheck />
              </ProtectedRoute>
            } />
            <Route path="/no-check" element={
              <ProtectedRoute>
                <NoCheck />
              </ProtectedRoute>
            } />
            
            <Route path="/vsi" element={
              <ProtectedRoute>
                <VSI />
              </ProtectedRoute>
            } />
            
            <Route path="/history" element={
              <ProtectedRoute>
                <Layout>
                  <ErrorBoundary>
                    <History />
                  </ErrorBoundary>
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/quick-check-records" element={
              <ProtectedRoute>
                <Layout>
                  <QuickCheckRecords />
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/quick-check/:id" element={
              <ProtectedRoute>
                <Layout>
                  <QuickCheckDetail />
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/profile" element={
              <ProtectedRoute>
                <Layout>
                  <Profile />
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/settings" element={
              <ProtectedRoute>
                <Layout>
                  <Settings />
                </Layout>
              </ProtectedRoute>
            } />
            
            {/* Debug/Test routes */}
            <Route path="/field-showcase" element={
              <ProtectedRoute>
                <Layout>
                  <FieldShowcase />
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/existing-design-showcase" element={
              <ProtectedRoute>
                <Layout>
                  <ExistingDesignShowcase />
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/image-upload-test" element={
              <ProtectedRoute>
                <Layout>
                  <ImageUploadTest />
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/token-expiration-test" element={
              <ProtectedRoute>
                <Layout>
                  <TokenExpirationTest />
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/quick-check-drafts" element={
              <ProtectedRoute>
                <Layout>
                  <QuickCheckDrafts />
                </Layout>
              </ProtectedRoute>
            } />
            

            <Route path="/databases" element={
              <ProtectedRoute>
                <Layout>
                  <Databases />
                </Layout>
              </ProtectedRoute>
            } />
            
            {/* Removed Parts Ordering route */}

            {/* Oil Change Sticker routes */}
            <Route path="/oil-change-stickers" element={
              <ProtectedRoute>
                <Layout>
                  <ActiveStickers />
                </Layout>
              </ProtectedRoute>
            } />
            
            <Route path="/oil-change-stickers/archived" element={
              <ProtectedRoute>
                <Layout>
                  <ArchivedStickers />
                </Layout>
              </ProtectedRoute>
            } />

            {/* Label Manager route */}
            <Route path="/label-manager" element={
              <ProtectedRoute>
                <LabelManager />
              </ProtectedRoute>
            } />

            {/* Labels route */}
            <Route path="/labels" element={
              <ProtectedRoute>
                <Layout>
                  <Labels />
                </Layout>
              </ProtectedRoute>
            } />

            {/* State Inspection Records route */}
            <Route path="/state-inspection-records" element={
              <ProtectedRoute>
                <Layout>
                  <StateInspectionRecords />
                </Layout>
              </ProtectedRoute>
            } />


            <Route path="/shopmonkey" element={
              <ProtectedRoute>
                <Layout>
                  <ShopMonkey />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/print-token-manager" element={
              <ProtectedRoute>
                <Layout>
                  <PrintTokenManager />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/print-queue-archive" element={
              <ProtectedRoute>
                <Layout>
                  <PrintQueueArchive />
                </Layout>
              </ProtectedRoute>
            } />


            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </WebSocketProvider>
    </UserProvider>
    </ThemeProvider>
  );
}

export default App; 