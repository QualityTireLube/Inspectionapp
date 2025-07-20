import { useState, useCallback } from 'react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationState {
  open: boolean;
  message: string;
  type: NotificationType;
  autoHideDuration?: number;
}

export interface UseNotificationReturn {
  notification: NotificationState;
  showNotification: (message: string, type?: NotificationType, autoHideDuration?: number) => void;
  showSuccess: (message: string, autoHideDuration?: number) => void;
  showError: (message: string, autoHideDuration?: number) => void;
  showWarning: (message: string, autoHideDuration?: number) => void;
  showInfo: (message: string, autoHideDuration?: number) => void;
  hideNotification: () => void;
  handleApiCall: <T>(
    apiCall: () => Promise<T>,
    options?: {
      successMessage?: string;
      errorMessage?: string;
      showSuccessNotification?: boolean;
      showErrorNotification?: boolean;
    }
  ) => Promise<T | null>;
}

export const useNotification = (): UseNotificationReturn => {
  const [notification, setNotification] = useState<NotificationState>({
    open: false,
    message: '',
    type: 'info',
    autoHideDuration: 6000,
  });

  const showNotification = useCallback((
    message: string, 
    type: NotificationType = 'info', 
    autoHideDuration: number = 6000
  ) => {
    setNotification({
      open: true,
      message,
      type,
      autoHideDuration,
    });
  }, []);

  const showSuccess = useCallback((message: string, autoHideDuration: number = 6000) => {
    showNotification(message, 'success', autoHideDuration);
  }, [showNotification]);

  const showError = useCallback((message: string, autoHideDuration: number = 8000) => {
    showNotification(message, 'error', autoHideDuration);
  }, [showNotification]);

  const showWarning = useCallback((message: string, autoHideDuration: number = 7000) => {
    showNotification(message, 'warning', autoHideDuration);
  }, [showNotification]);

  const showInfo = useCallback((message: string, autoHideDuration: number = 6000) => {
    showNotification(message, 'info', autoHideDuration);
  }, [showNotification]);

  const hideNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, open: false }));
  }, []);

  const handleApiCall = useCallback(async <T>(
    apiCall: () => Promise<T>,
    options: {
      successMessage?: string;
      errorMessage?: string;
      showSuccessNotification?: boolean;
      showErrorNotification?: boolean;
    } = {}
  ): Promise<T | null> => {
    const {
      successMessage = 'Operation completed successfully',
      errorMessage = 'Operation failed',
      showSuccessNotification = true,
      showErrorNotification = true,
    } = options;

    try {
      const result = await apiCall();
      
      if (showSuccessNotification) {
        showSuccess(successMessage);
      }
      
      return result;
    } catch (error: any) {
      console.error('API call failed:', error);
      
      if (showErrorNotification) {
        let errorMsg = errorMessage;
        
        // Extract more specific error message if available
        if (error?.response?.data?.error) {
          errorMsg = error.response.data.error;
        } else if (error?.response?.data?.message) {
          errorMsg = error.response.data.message;
        } else if (error?.message) {
          errorMsg = error.message;
        }
        
        showError(errorMsg);
      }
      
      return null;
    }
  }, [showSuccess, showError]);

  return {
    notification,
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    hideNotification,
    handleApiCall,
  };
}; 