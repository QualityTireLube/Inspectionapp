import React, { useState, useEffect } from 'react';
import { Alert, Box, Typography, Button, Collapse } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { getStorageMessage, isPrivateBrowsing, getStorageType } from '../services/safariStorage';

interface SafariCompatibilityWarningProps {
  show?: boolean;
  onDismiss?: () => void;
}

const SafariCompatibilityWarning: React.FC<SafariCompatibilityWarningProps> = ({ 
  show = true, 
  onDismiss 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [storageMessage, setStorageMessage] = useState<string | null>(null);
  const [isPrivateBrowsingMode, setIsPrivateBrowsingMode] = useState(false);
  const [currentStorageType, setCurrentStorageType] = useState<string>('');

  useEffect(() => {
    // Check storage status
    const message = getStorageMessage();
    const isPrivate = isPrivateBrowsing();
    const storageType = getStorageType();
    
    setStorageMessage(message);
    setIsPrivateBrowsingMode(isPrivate);
    setCurrentStorageType(storageType);
    
    // Only show if there's a message to display
    setIsVisible(show && !!message);
  }, [show]);

  const handleDismiss = () => {
    setIsVisible(false);
    if (onDismiss) {
      onDismiss();
    }
  };

  const getSafariTips = () => {
    const tips = [];
    
    if (isPrivateBrowsingMode) {
      tips.push('Turn off Private Browsing for better experience');
      tips.push('Your session will end when you close the browser');
    }
    
    if (currentStorageType === 'memory') {
      tips.push('Enable cookies and website data in Safari settings');
      tips.push('Your login won\'t persist after page refresh');
    }
    
    return tips;
  };

  const getAlertSeverity = () => {
    if (currentStorageType === 'memory') return 'error';
    if (currentStorageType === 'sessionStorage') return 'warning';
    return 'info';
  };

  if (!isVisible || !storageMessage) {
    return null;
  }

  return (
    <Box sx={{ mb: 2 }}>
      <Collapse in={isVisible}>
        <Alert 
          severity={getAlertSeverity()}
          icon={<InfoOutlinedIcon />}
          action={
            <Button color="inherit" size="small" onClick={handleDismiss}>
              Dismiss
            </Button>
          }
        >
          <Typography variant="body2" sx={{ mb: 1 }}>
            <strong>Safari Compatibility Notice</strong>
          </Typography>
          
          <Typography variant="body2" sx={{ mb: 1 }}>
            {storageMessage}
          </Typography>
          
          {getSafariTips().length > 0 && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 0.5 }}>
                Tips for better experience:
              </Typography>
              <ul style={{ margin: '0', paddingLeft: '20px' }}>
                {getSafariTips().map((tip, index) => (
                  <li key={index}>
                    <Typography variant="body2">{tip}</Typography>
                  </li>
                ))}
              </ul>
            </Box>
          )}
          
          <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.8 }}>
            Storage mode: {currentStorageType}
          </Typography>
        </Alert>
      </Collapse>
    </Box>
  );
};

export default SafariCompatibilityWarning; 