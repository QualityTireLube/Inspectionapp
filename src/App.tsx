import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import theme from './theme';

// Pages
import Layout from './components/Layout';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import QuickCheck from './pages/QuickCheck';
import History from './pages/History';
import Scanner from './pages/Scanner';
import QuickCheckRecords from './pages/QuickCheckRecords';
import QuickCheckDetail from './pages/QuickCheckDetail';
import QuickCheckDatabase from './pages/QuickCheckDatabase';
import StateInspectionRecords from './pages/StateInspectionRecords';
import InspectionForm from './pages/InspectionForm';
import InspectionRecords from './pages/InspectionRecords';
import ActiveStickers from './pages/ActiveStickers';
import ArchivedStickers from './pages/ArchivedStickers';
import StickerSettings from './pages/StickerSettings';
import LabelManager from './pages/LabelManager';
import QuickCheckDrafts from './pages/QuickCheckDrafts';
import Login from './pages/Login';
import Register from './pages/Register';
import Chat from './pages/Chat';
import Users from './pages/Users';
import Databases from './pages/Databases';
import BankDepositForm from './pages/BankDepositForm';
import BankDepositRecords from './pages/BankDepositRecords';
import DrawerCountForm from './pages/DrawerCountForm';
import DrawerSettings from './pages/DrawerSettings';
import CashAnalytics from './pages/CashAnalytics';
import ShopMonkey from './pages/ShopMonkey';
import ImageUploadTest from './pages/ImageUploadTest';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import NotificationSnackbar from './components/NotificationSnackbar';
import { WebSocketProvider } from './contexts/WebSocketProvider';

function App() {
  // Initialize token manager on app start
  useEffect(() => {
    console.log('🚀 App starting - Token manager initialized');
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <WebSocketProvider autoConnect={true}>
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
            
            <Route path="/quick-check" element={
              <ProtectedRoute>
                <QuickCheck />
              </ProtectedRoute>
            } />
            
            <Route path="/chat" element={
              <ProtectedRoute>
                <Layout>
                  <Chat />
                </Layout>
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
                  {/* <TokenExpirationTest /> */}
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
            
            <Route path="/quick-check-database" element={
              <ProtectedRoute>
                <Layout>
                  <QuickCheckDatabase />
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

            {/* State Inspection Records route */}
            <Route path="/state-inspection-records" element={
              <ProtectedRoute>
                <Layout>
                  <StateInspectionRecords />
                </Layout>
              </ProtectedRoute>
            } />

            {/* Cash Management routes */}
            <Route path="/bank-deposit" element={
              <ProtectedRoute>
                <Layout>
                  <BankDepositForm />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/bank-deposit-records" element={
              <ProtectedRoute>
                <Layout>
                  <BankDepositRecords />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/drawer-count" element={
              <ProtectedRoute>
                <Layout>
                  <DrawerCountForm />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/drawer-settings" element={
              <ProtectedRoute>
                <Layout>
                  <DrawerSettings />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/cash-analytics" element={
              <ProtectedRoute>
                <Layout>
                  <CashAnalytics />
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

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </WebSocketProvider>
    </ThemeProvider>
  );
}

export default App; 