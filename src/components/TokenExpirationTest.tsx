import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Alert, Paper } from '@mui/material';
import { getItem } from '../services/safariStorage';
import tokenManager from '../services/tokenManager';

const TokenExpirationTest: React.FC = () => {
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [timeUntilExpiration, setTimeUntilExpiration] = useState<number>(0);

  const checkTokenStatus = () => {
    const token = getItem('token');
    if (token) {
      const info = tokenManager.getTokenInfo(token);
      setTokenInfo(info);
      setIsExpired(tokenManager.isTokenExpired(token));
      setTimeUntilExpiration(tokenManager.getTimeUntilExpiration(token));
    } else {
      setTokenInfo(null);
      setIsExpired(true);
      setTimeUntilExpiration(0);
    }
  };

  useEffect(() => {
    checkTokenStatus();
    const interval = setInterval(checkTokenStatus, 1000); // Check every second
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number): string => {
    if (seconds <= 0) return 'Expired';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Token Expiration Test
      </Typography>
      
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Current Token Status
        </Typography>
        
        {tokenInfo ? (
          <Box>
            <Alert 
              severity={isExpired ? 'error' : 'success'} 
              sx={{ mb: 2 }}
            >
              Token is {isExpired ? 'EXPIRED' : 'VALID'}
            </Alert>
            
            <Typography variant="body1" gutterBottom>
              <strong>Expires at:</strong> {tokenInfo.expiresAt?.toLocaleString() || 'Unknown'}
            </Typography>
            
            <Typography variant="body1" gutterBottom>
              <strong>Time until expiration:</strong> {formatTime(timeUntilExpiration)}
            </Typography>
            
            <Typography variant="body1" gutterBottom>
              <strong>Is expiring soon:</strong> {tokenManager.isTokenExpiringSoon(getItem('token') || '') ? 'Yes' : 'No'}
            </Typography>
          </Box>
        ) : (
          <Alert severity="warning">
            No token found in storage
          </Alert>
        )}
      </Paper>
      
      <Button 
        variant="contained" 
        onClick={checkTokenStatus}
        sx={{ mr: 2 }}
      >
        Refresh Status
      </Button>
      
      <Button 
        variant="outlined" 
        onClick={() => {
          const token = getItem('token');
          if (token) {
            console.log('Token info:', tokenManager.getTokenInfo(token));
          }
        }}
      >
        Log Token Info
      </Button>
    </Box>
  );
};

export default TokenExpirationTest; 