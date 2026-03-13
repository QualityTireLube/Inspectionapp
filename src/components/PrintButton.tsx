import React, { useState } from 'react';
import {
  Button,
  IconButton,
  Fab,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider
} from '@mui/material';
import {
  Print as PrintIcon,
  PrintDisabled as PrintDisabledIcon,
  Settings as SettingsIcon,
  Preview as PreviewIcon
} from '@mui/icons-material';
import { usePrintConfiguration } from '../hooks/usePrintConfiguration';
import { useNavigate } from 'react-router-dom';

interface PrintButtonProps {
  formType: string; // 'labels', 'stickers', 'reports', etc.
  data?: any; // Data to print
  variant?: 'button' | 'icon' | 'fab'; // Different button styles
  size?: 'small' | 'medium' | 'large';
  children?: React.ReactNode; // Custom button content
  disabled?: boolean;
  showSettingsLink?: boolean; // Show link to configure printer
  onPreview?: () => void; // Optional preview function
}

const PrintButton: React.FC<PrintButtonProps> = ({
  formType,
  data,
  variant = 'button',
  size = 'medium',
  children,
  disabled = false,
  showSettingsLink = true,
  onPreview
}) => {
  const { isFormConfigured, printForForm } = usePrintConfiguration();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [printing, setPrinting] = useState(false);

  const isPrinterConfigured = isFormConfigured(formType);
  const isDisabled = disabled || !isPrinterConfigured || printing;

  const handlePrint = async () => {
    if (!data) {
      console.warn('No data provided for printing');
      return;
    }

    setPrinting(true);
    try {
      await printForForm(formType, data);
    } finally {
      setPrinting(false);
    }
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleConfigureSettings = () => {
    navigate('/settings');
    handleMenuClose();
  };

  const handlePreview = () => {
    if (onPreview) {
      onPreview();
    }
    handleMenuClose();
  };

  // If no printer configured and no settings link, don't show anything
  if (!isPrinterConfigured && !showSettingsLink) {
    return null;
  }

  const getTooltipText = () => {
    if (!isPrinterConfigured) {
      return `No printer configured for ${formType}. Click to configure.`;
    }
    if (printing) {
      return 'Sending to printer...';
    }
    return `Print ${formType}`;
  };

  const getButtonContent = () => {
    if (children) {
      return children;
    }
    
    if (printing) {
      return variant === 'icon' ? <PrintIcon /> : 'Printing...';
    }
    
    if (!isPrinterConfigured) {
      return variant === 'icon' ? <PrintDisabledIcon /> : `Configure ${formType} Printer`;
    }
    
    return variant === 'icon' ? <PrintIcon /> : `Print ${formType}`;
  };

  const buttonProps = {
    disabled: isDisabled && isPrinterConfigured, // Only disable if configured but other issues
    size,
    color: isPrinterConfigured ? 'primary' : 'warning' as any
  };

  // Handle click based on configuration state
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    if (!isPrinterConfigured) {
      if (showSettingsLink) {
        handleConfigureSettings();
      }
    } else if (onPreview || showSettingsLink) {
      handleMenuClick(event);
    } else {
      handlePrint();
    }
  };

  const renderButton = () => {
    switch (variant) {
      case 'fab':
        return (
          <Fab {...buttonProps} onClick={handleClick}>
            {getButtonContent()}
          </Fab>
        );
      case 'icon':
        return (
          <IconButton {...buttonProps} onClick={handleClick}>
            {getButtonContent()}
          </IconButton>
        );
      default:
        return (
          <Button
            {...buttonProps}
            variant={isPrinterConfigured ? 'contained' : 'outlined'}
            startIcon={isPrinterConfigured ? <PrintIcon /> : <PrintDisabledIcon />}
            onClick={handleClick}
          >
            {getButtonContent()}
          </Button>
        );
    }
  };

  return (
    <>
      <Tooltip title={getTooltipText()}>
        <span>
          {renderButton()}
        </span>
      </Tooltip>

      {/* Menu for additional options */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        {isPrinterConfigured && (
          <MenuItem onClick={handlePrint} disabled={!data}>
            <ListItemIcon>
              <PrintIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>
              Print Now
              {!data && (
                <Typography variant="caption" color="text.secondary" display="block">
                  No data to print
                </Typography>
              )}
            </ListItemText>
          </MenuItem>
        )}
        
        {onPreview && (
          <MenuItem onClick={handlePreview}>
            <ListItemIcon>
              <PreviewIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Preview</ListItemText>
          </MenuItem>
        )}
        
        {showSettingsLink && (
          <>
            {(isPrinterConfigured || onPreview) && <Divider />}
            <MenuItem onClick={handleConfigureSettings}>
              <ListItemIcon>
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>
                {isPrinterConfigured ? 'Print Settings' : 'Configure Printer'}
              </ListItemText>
            </MenuItem>
          </>
        )}
      </Menu>
    </>
  );
};

export default PrintButton; 