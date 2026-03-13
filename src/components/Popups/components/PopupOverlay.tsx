/**
 * Popup Overlay - Main component that renders all active popups
 * 
 * Handles multiple popup display, z-index management, and
 * ensures popups are rendered in the correct order.
 */

import React from 'react';
import { Portal } from '@mui/material';
import { usePopupManager } from '../core/PopupManager';
import { PopupRenderer } from './PopupRenderer';

export const PopupOverlay: React.FC = () => {
  const { popups, hidePopup } = usePopupManager();

  // Filter only open popups and sort by priority
  const openPopups = popups
    .filter(popup => popup.isOpen)
    .sort((a, b) => {
      const priorityA = a.definition.triggers[0]?.priority || 0;
      const priorityB = b.definition.triggers[0]?.priority || 0;
      return priorityB - priorityA; // Higher priority first
    });

  if (openPopups.length === 0) {
    return null;
  }

  return (
    <Portal>
      {openPopups.map((popup, index) => (
        <div
          key={popup.id}
          style={{
            zIndex: 9000 + index, // Ensure proper stacking
          }}
        >
          <PopupRenderer
            definition={popup.definition}
            isOpen={popup.isOpen}
            onClose={() => hidePopup(popup.id)}
            context={popup.context}
          />
        </div>
      ))}
    </Portal>
  );
};
