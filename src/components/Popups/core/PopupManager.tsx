/**
 * Popup Manager - Central system for managing dynamic popups
 * 
 * Handles popup lifecycle, trigger evaluation, and state management.
 * Provides context for components to interact with the popup system.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { PopupDefinition, PopupState, PopupManagerContext, PopupTrigger } from '../types/PopupTypes';

const PopupContext = createContext<PopupManagerContext | undefined>(undefined);

interface PopupManagerProps {
  children: React.ReactNode;
  inspectionType?: string;
  userRole?: string;
  formContext?: Record<string, any>;
}

export const PopupManager: React.FC<PopupManagerProps> = ({
  children,
  inspectionType,
  userRole,
  formContext = {}
}) => {
  const [popups, setPopups] = useState<PopupState[]>([]);
  const [registeredPopups, setRegisteredPopups] = useState<Map<string, PopupDefinition>>(new Map());

  // Register a new popup definition
  const registerPopup = useCallback((definition: PopupDefinition) => {
    // Check if popup is allowed for current context
    if (definition.inspectionTypes && inspectionType && !definition.inspectionTypes.includes(inspectionType)) {
      return;
    }
    if (definition.userRoles && userRole && !definition.userRoles.includes(userRole)) {
      return;
    }

    setRegisteredPopups(prev => new Map(prev.set(definition.id, definition)));
  }, [inspectionType, userRole]);

  // Unregister a popup
  const unregisterPopup = useCallback((id: string) => {
    setRegisteredPopups(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
    
    // Also close if currently open
    hidePopup(id);
  }, []);

  // Show a popup
  const showPopup = useCallback((id: string, context?: Record<string, any>) => {
    const definition = registeredPopups.get(id);
    if (!definition) {
      console.warn(`Popup "${id}" not found in registry`);
      return;
    }

    setPopups(prev => {
      // Check if already open
      const existingIndex = prev.findIndex(p => p.id === id);
      const newPopup: PopupState = {
        id,
        definition,
        isOpen: true,
        context: { ...formContext, ...context },
        triggeredBy: context?.triggeredBy,
        openedAt: new Date(),
        viewCount: existingIndex >= 0 ? (prev[existingIndex].viewCount || 0) + 1 : 1
      };

      if (existingIndex >= 0) {
        // Update existing popup
        const newPopups = [...prev];
        newPopups[existingIndex] = newPopup;
        return newPopups;
      } else {
        // Add new popup
        return [...prev, newPopup];
      }
    });

    // Auto-close if specified
    if (definition.autoClose) {
      setTimeout(() => hidePopup(id), definition.autoClose);
    }
  }, [registeredPopups, formContext]);

  // Hide a popup
  const hidePopup = useCallback((id: string) => {
    setPopups(prev => prev.filter(p => p.id !== id));
  }, []);

  // Hide all popups
  const hideAllPopups = useCallback(() => {
    setPopups([]);
  }, []);

  // Get popup state
  const getPopup = useCallback((id: string) => {
    return popups.find(p => p.id === id);
  }, [popups]);

  // Evaluate triggers when form context changes
  useEffect(() => {
    registeredPopups.forEach((definition, id) => {
      definition.triggers.forEach(trigger => {
        if (shouldTriggerPopup(trigger, formContext)) {
          showPopup(id, { triggeredBy: `${trigger.type}:${trigger.targetField || trigger.targetTab || 'general'}` });
        }
      });
    });
  }, [formContext, registeredPopups, showPopup]);

  const contextValue: PopupManagerContext = {
    popups,
    registerPopup,
    unregisterPopup,
    showPopup,
    hidePopup,
    hideAllPopups,
    getPopup
  };

  return (
    <PopupContext.Provider value={contextValue}>
      {children}
    </PopupContext.Provider>
  );
};

// Helper function to evaluate trigger conditions
function shouldTriggerPopup(trigger: PopupTrigger, context: Record<string, any>): boolean {
  if (!trigger.conditions || trigger.conditions.length === 0) {
    return false;
  }

  return trigger.conditions.every(condition => {
    if (condition.field) {
      const fieldValue = context[condition.field];
      
      switch (condition.operator || '=') {
        case '=':
          return fieldValue === condition.value;
        case '!=':
          return fieldValue !== condition.value;
        case '>':
          return Number(fieldValue) > Number(condition.value);
        case '<':
          return Number(fieldValue) < Number(condition.value);
        case '>=':
          return Number(fieldValue) >= Number(condition.value);
        case '<=':
          return Number(fieldValue) <= Number(condition.value);
        case 'contains':
          return String(fieldValue).includes(String(condition.value));
        case 'startsWith':
          return String(fieldValue).startsWith(String(condition.value));
        case 'endsWith':
          return String(fieldValue).endsWith(String(condition.value));
        default:
          return false;
      }
    }

    if (condition.expression) {
      try {
        // Safely evaluate expression with context
        const func = new Function('context', `return ${condition.expression}`);
        return func(context);
      } catch (e) {
        console.warn('Error evaluating popup trigger expression:', e);
        return false;
      }
    }

    return false;
  });
}

// Hook to use popup manager
export function usePopupManager(): PopupManagerContext {
  const context = useContext(PopupContext);
  if (!context) {
    throw new Error('usePopupManager must be used within a PopupManager');
  }
  return context;
}

// Hook for field components to register triggers
export function useFieldPopups(fieldId: string) {
  const { showPopup, hidePopup } = usePopupManager();

  const triggerPopup = useCallback((popupId: string, triggerType: string = 'manual') => {
    showPopup(popupId, { 
      triggeredBy: `field:${fieldId}:${triggerType}`,
      fieldId 
    });
  }, [showPopup, fieldId]);

  const triggerHelp = useCallback(() => {
    triggerPopup(`${fieldId}_help`, 'help');
  }, [triggerPopup, fieldId]);

  const triggerValidation = useCallback(() => {
    triggerPopup(`${fieldId}_validation`, 'validation');
  }, [triggerPopup, fieldId]);

  return {
    triggerPopup,
    triggerHelp,
    triggerValidation,
    hidePopup
  };
}
