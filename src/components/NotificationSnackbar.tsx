import React from 'react';
import { Snackbar, Alert } from '@mui/material';
import { NotificationState } from '../hooks/useNotification';

interface NotificationSnackbarProps {
  notification: NotificationState;
  onClose: () => void;
}

export const NotificationSnackbar: React.FC<NotificationSnackbarProps> = ({
  notification,
  onClose,
}) => {
  return (
    <Snackbar
      open={notification.open}
      autoHideDuration={notification.autoHideDuration}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <Alert
        onClose={onClose}
        severity={notification.type}
        variant="filled"
        sx={{
          width: '100%',
          minWidth: 300,
          maxWidth: 500,
        }}
      >
        {notification.message}
      </Alert>
    </Snackbar>
  );
};

export default NotificationSnackbar; 