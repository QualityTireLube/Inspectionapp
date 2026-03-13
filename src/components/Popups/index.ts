/**
 * Dynamic Popup System - Main Exports
 * 
 * Comprehensive popup system for dynamic image prompts, help content,
 * tutorials, and guided workflows that can be triggered by any field
 * or navigation event.
 */

// Core system
export * from './types/PopupTypes';
export * from './core/PopupManager';
export * from './components/PopupRenderer';
export * from './components/PopupOverlay';

// Hooks
export * from './hooks/usePopupTriggers';

// Presets
export * from './presets/InspectionPopups';

// Main components for easy import
export { PopupManager, usePopupManager, useFieldPopups } from './core/PopupManager';
export { PopupOverlay } from './components/PopupOverlay';
export { PopupRenderer } from './components/PopupRenderer';

// Convenience re-exports
export type {
  PopupDefinition,
  PopupContent,
  PopupTrigger,
  PopupState,
  PopupTriggerType,
  PopupContentType
} from './types/PopupTypes';
