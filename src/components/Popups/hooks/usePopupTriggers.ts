/**
 * Popup Trigger Hooks
 * 
 * Convenient hooks for components to trigger popups based on
 * common patterns like field interactions and tab navigation.
 */

import { useCallback, useEffect } from 'react';
import { usePopupManager } from '../core/PopupManager';

/**
 * Hook for tab components to trigger popups on navigation
 */
export function useTabPopups(tabId: string) {
  const { showPopup } = usePopupManager();

  const triggerTabEnter = useCallback(() => {
    // Trigger any popups registered for this tab
    showPopup(`${tabId}_welcome`, { 
      triggeredBy: `tab_enter:${tabId}`,
      tabId 
    });
  }, [showPopup, tabId]);

  const triggerTabExit = useCallback(() => {
    showPopup(`${tabId}_summary`, { 
      triggeredBy: `tab_exit:${tabId}`,
      tabId 
    });
  }, [showPopup, tabId]);

  return {
    triggerTabEnter,
    triggerTabExit
  };
}

/**
 * Hook for field validation popups
 */
export function useFieldValidationPopups(fieldId: string, value: any) {
  const { showPopup } = usePopupManager();

  useEffect(() => {
    // Trigger validation popups based on field value
    if (fieldId === 'tire_tread_depth' && typeof value === 'number' && value <= 2) {
      showPopup('low_tread_warning', {
        triggeredBy: `validation:${fieldId}`,
        fieldId,
        value
      });
    }

    if (fieldId === 'battery_age' && typeof value === 'number' && value > 3) {
      showPopup('battery_test_reminder', {
        triggeredBy: `validation:${fieldId}`,
        fieldId,
        value
      });
    }
  }, [fieldId, value, showPopup]);
}

/**
 * Hook for progress-based popups
 */
export function useProgressPopups(completionPercentage: number, formData: any) {
  const { showPopup } = usePopupManager();

  useEffect(() => {
    // Show progress milestones
    if (completionPercentage >= 25 && completionPercentage < 50) {
      showPopup('progress_25', {
        triggeredBy: 'progress_milestone',
        completion_percentage: completionPercentage
      });
    } else if (completionPercentage >= 50 && completionPercentage < 75) {
      showPopup('progress_50', {
        triggeredBy: 'progress_milestone', 
        completion_percentage: completionPercentage
      });
    } else if (completionPercentage >= 75 && completionPercentage < 100) {
      showPopup('inspection_progress', {
        triggeredBy: 'progress_milestone',
        completion_percentage: completionPercentage
      });
    } else if (completionPercentage >= 100) {
      showPopup('inspection_complete', {
        triggeredBy: 'completion',
        completion_percentage: completionPercentage
      });
    }
  }, [completionPercentage, showPopup]);
}

/**
 * Hook for time-based popups
 */
export function useTimerPopups(tabDuration: number, tabName: string) {
  const { showPopup } = usePopupManager();

  useEffect(() => {
    // Show reminder if user spends too long on a tab
    if (tabDuration > 300000) { // 5 minutes
      const timer = setTimeout(() => {
        showPopup('time_reminder', {
          triggeredBy: 'timer_exceeded',
          tabName,
          duration: tabDuration
        });
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [tabDuration, tabName, showPopup]);
}

/**
 * Hook for error-based popups
 */
export function useErrorPopups(errors: Record<string, string>) {
  const { showPopup } = usePopupManager();

  useEffect(() => {
    Object.entries(errors).forEach(([fieldId, error]) => {
      if (error) {
        // Show field-specific error popup
        showPopup(`${fieldId}_error`, {
          triggeredBy: `field_error:${fieldId}`,
          fieldId,
          error
        });
      }
    });
  }, [errors, showPopup]);
}

/**
 * Hook for vehicle-specific popups
 */
export function useVehiclePopups(vehicleData: any) {
  const { showPopup } = usePopupManager();

  useEffect(() => {
    if (vehicleData?.make?.toLowerCase() === 'tesla') {
      showPopup('tesla_inspection_guide', {
        triggeredBy: 'vehicle_type',
        vehicleData
      });
    }

    if (vehicleData?.year && vehicleData.year < 2010) {
      showPopup('older_vehicle_considerations', {
        triggeredBy: 'vehicle_age',
        vehicleData
      });
    }

    if (vehicleData?.type?.toLowerCase().includes('hybrid')) {
      showPopup('hybrid_safety_warning', {
        triggeredBy: 'vehicle_type',
        vehicleData
      });
    }
  }, [vehicleData, showPopup]);
}

/**
 * Hook for user role-based popups
 */
export function useRoleBasedPopups(userRole: string, isFirstTime: boolean) {
  const { showPopup } = usePopupManager();

  useEffect(() => {
    if (isFirstTime) {
      if (userRole === 'trainee') {
        showPopup('trainee_welcome', {
          triggeredBy: 'user_role',
          userRole
        });
      } else if (userRole === 'technician') {
        showPopup('tech_tips', {
          triggeredBy: 'user_role',
          userRole
        });
      }
    }
  }, [userRole, isFirstTime, showPopup]);
}
