/**
 * Dynamic Popup System Types
 * 
 * Defines interfaces for the reusable popup/prompt system that can be
 * triggered by any field, tab navigation, or custom events.
 */

export type PopupTriggerType = 
  | 'field_focus'           // When field receives focus
  | 'field_change'          // When field value changes
  | 'field_error'           // When field has validation error
  | 'tab_enter'             // When tab is entered
  | 'tab_exit'              // When tab is exited
  | 'button_click'          // When specific button is clicked
  | 'timer'                 // After specific time elapsed
  | 'condition_met'         // When custom condition is satisfied
  | 'manual';               // Manually triggered

export type PopupContentType = 
  | 'image'                 // Single image with optional caption
  | 'image_gallery'         // Multiple images with navigation
  | 'video'                 // Video content
  | 'html'                  // Custom HTML content
  | 'markdown'              // Markdown content
  | 'component'             // Custom React component
  | 'tutorial'              // Step-by-step tutorial
  | 'help'                  // Help/documentation content
  | 'warning'               // Warning/alert message
  | 'confirmation';         // Confirmation dialog

export type PopupPosition = 
  | 'center'                // Center of screen
  | 'top'                   // Top of screen
  | 'bottom'                // Bottom of screen
  | 'left'                  // Left side
  | 'right'                 // Right side
  | 'relative'              // Relative to trigger element
  | 'fullscreen';           // Full screen overlay

export type PopupSize = 
  | 'small'                 // 300x200
  | 'medium'                // 500x400
  | 'large'                 // 700x500
  | 'xlarge'                // 900x600
  | 'auto'                  // Auto-size to content
  | 'custom';               // Custom dimensions

export interface PopupTriggerCondition {
  field?: string;           // Field ID to watch
  value?: any;              // Specific value to match
  operator?: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'startsWith' | 'endsWith';
  expression?: string;      // Custom JavaScript expression
}

export interface PopupContent {
  type: PopupContentType;
  
  // Image content
  imageUrl?: string;
  imageAlt?: string;
  caption?: string;
  
  // Gallery content
  images?: {
    url: string;
    alt?: string;
    caption?: string;
  }[];
  
  // Video content
  videoUrl?: string;
  videoType?: 'mp4' | 'webm' | 'youtube' | 'vimeo';
  
  // Text content
  title?: string;
  message?: string;
  html?: string;
  markdown?: string;
  
  // Component content
  component?: React.ComponentType<any>;
  componentProps?: Record<string, any>;
  
  // Tutorial content
  steps?: {
    title: string;
    content: string;
    image?: string;
    action?: string;
  }[];
  
  // Action buttons
  actions?: {
    label: string;
    action: 'close' | 'next' | 'previous' | 'custom';
    variant?: 'primary' | 'secondary' | 'danger';
    handler?: () => void;
  }[];
}

export interface PopupTrigger {
  id: string;
  type: PopupTriggerType;
  targetField?: string;     // Field ID to attach to
  targetTab?: string;       // Tab ID to attach to
  conditions?: PopupTriggerCondition[];
  delay?: number;           // Delay in milliseconds
  once?: boolean;           // Show only once per session
  priority?: number;        // Higher numbers take precedence
}

export interface PopupDefinition {
  id: string;
  title?: string;
  content: PopupContent;
  
  // Display options
  position?: PopupPosition;
  size?: PopupSize;
  width?: number;
  height?: number;
  
  // Behavior options
  modal?: boolean;          // Block interaction with background
  closable?: boolean;       // Can be closed by user
  autoClose?: number;       // Auto-close after milliseconds
  backdrop?: boolean;       // Show backdrop overlay
  
  // Styling
  className?: string;
  style?: React.CSSProperties;
  
  // Triggers
  triggers: PopupTrigger[];
  
  // Context restrictions
  inspectionTypes?: string[];  // Only show for specific inspection types
  userRoles?: string[];        // Only show for specific user roles
  
  // Analytics
  trackViews?: boolean;
  trackInteractions?: boolean;
}

export interface PopupState {
  id: string;
  definition: PopupDefinition;
  isOpen: boolean;
  currentStep?: number;     // For tutorials
  context?: Record<string, any>;
  triggeredBy?: string;     // What triggered this popup
  openedAt?: Date;
  viewCount?: number;
}

export interface PopupManagerContext {
  popups: PopupState[];
  registerPopup: (definition: PopupDefinition) => void;
  unregisterPopup: (id: string) => void;
  showPopup: (id: string, context?: Record<string, any>) => void;
  hidePopup: (id: string) => void;
  hideAllPopups: () => void;
  getPopup: (id: string) => PopupState | undefined;
}
