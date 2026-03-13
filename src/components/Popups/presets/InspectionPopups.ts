/**
 * Inspection Popup Presets
 * 
 * Pre-defined popup configurations for common inspection scenarios.
 * These can be easily reused across different inspection types.
 */

import { PopupDefinition } from '../types/PopupTypes';

export const INSPECTION_POPUP_PRESETS: Record<string, PopupDefinition> = {
  // Field help popups
  vin_decoder_help: {
    id: 'vin_decoder_help',
    title: 'VIN Decoder Help',
    content: {
      type: 'image_gallery',
      images: [
        {
          url: '/images/help/vin-location-dashboard.jpg',
          alt: 'VIN location on dashboard',
          caption: 'VIN can be found on the dashboard near the windshield'
        },
        {
          url: '/images/help/vin-location-door.jpg',
          alt: 'VIN location on door frame',
          caption: 'VIN is also located on the driver side door frame'
        },
        {
          url: '/images/help/vin-format.jpg',
          alt: 'VIN format example',
          caption: 'VIN is always 17 characters long with no I, O, or Q letters'
        }
      ]
    },
    size: 'medium',
    triggers: [
      {
        id: 'vin_focus_trigger',
        type: 'field_focus',
        targetField: 'vin'
      }
    ]
  },

  tire_tread_measurement: {
    id: 'tire_tread_measurement',
    title: 'How to Measure Tire Tread',
    content: {
      type: 'tutorial',
      steps: [
        {
          title: 'Step 1: Use Tread Depth Gauge',
          content: 'Insert the tread depth gauge into the tire groove at the deepest point.',
          image: '/images/tutorial/tread-gauge-insert.jpg'
        },
        {
          title: 'Step 2: Read Measurement',
          content: 'Read the measurement in 32nds of an inch. New tires typically have 10/32" or more.',
          image: '/images/tutorial/tread-gauge-read.jpg'
        },
        {
          title: 'Step 3: Check Multiple Points',
          content: 'Measure at least 3 points across the tire width: inner, center, and outer edges.',
          image: '/images/tutorial/tread-multiple-points.jpg'
        },
        {
          title: 'Step 4: Record Findings',
          content: 'Enter measurements and select condition: Green (good), Yellow (caution), Red (replace).',
          image: '/images/tutorial/tread-record-findings.jpg'
        }
      ]
    },
    size: 'large',
    triggers: [
      {
        id: 'tire_tread_help_trigger',
        type: 'field_focus',
        targetField: 'tire_tread'
      }
    ]
  },

  photo_upload_guide: {
    id: 'photo_upload_guide',
    title: 'Photo Upload Guide',
    content: {
      type: 'video',
      videoUrl: '/videos/photo-upload-guide.mp4',
      videoType: 'mp4',
      caption: 'Learn how to take clear, well-lit photos for inspections'
    },
    size: 'medium',
    triggers: [
      {
        id: 'photo_field_help',
        type: 'field_focus',
        targetField: 'photos'
      }
    ]
  },

  // Tab navigation popups
  tires_tab_welcome: {
    id: 'tires_tab_welcome',
    title: 'Tires & Brakes Inspection',
    content: {
      type: 'image',
      imageUrl: '/images/welcome/tires-overview.jpg',
      imageAlt: 'Tires and brakes inspection overview',
      title: 'Tires & Brakes Section',
      message: 'In this section, you\'ll inspect tire condition, tread depth, brake pads, and related components. Take your time to ensure accurate measurements.'
    },
    size: 'medium',
    autoClose: 5000,
    triggers: [
      {
        id: 'tires_tab_enter',
        type: 'tab_enter',
        targetTab: 'tires',
        once: true
      }
    ]
  },

  underhood_safety_warning: {
    id: 'underhood_safety_warning',
    title: 'Safety Warning',
    content: {
      type: 'warning',
      title: 'Engine Safety Precautions',
      message: 'Ensure engine is cool before inspection. Wear safety glasses and be aware of hot surfaces, moving parts, and electrical components.'
    },
    size: 'medium',
    modal: true,
    triggers: [
      {
        id: 'underhood_tab_enter',
        type: 'tab_enter',
        targetTab: 'underhood'
      }
    ]
  },

  // Conditional popups
  low_tread_warning: {
    id: 'low_tread_warning',
    title: 'Low Tread Depth Warning',
    content: {
      type: 'warning',
      title: 'Tread Depth Below Safe Limit',
      message: 'Tread depth of 2/32" or less requires immediate tire replacement. Document this finding and recommend replacement to customer.',
      actions: [
        {
          label: 'Understood',
          action: 'close',
          variant: 'primary'
        },
        {
          label: 'View Replacement Guide',
          action: 'custom',
          variant: 'secondary',
          handler: () => {
            // Show tire replacement guide
          }
        }
      ]
    },
    size: 'medium',
    modal: true,
    triggers: [
      {
        id: 'low_tread_condition',
        type: 'condition_met',
        conditions: [
          {
            field: 'tire_tread_depth',
            operator: '<=',
            value: 2
          }
        ]
      }
    ]
  },

  battery_test_reminder: {
    id: 'battery_test_reminder',
    title: 'Battery Test Reminder',
    content: {
      type: 'help',
      title: 'Don\'t Forget Battery Test',
      message: 'Consider testing battery voltage and load capacity, especially for vehicles over 3 years old.'
    },
    size: 'small',
    autoClose: 3000,
    triggers: [
      {
        id: 'battery_age_reminder',
        type: 'condition_met',
        conditions: [
          {
            expression: 'context.vehicle_year && (new Date().getFullYear() - context.vehicle_year) > 3'
          }
        ]
      }
    ]
  },

  // Progress and completion popups
  inspection_progress: {
    id: 'inspection_progress',
    title: 'Inspection Progress',
    content: {
      type: 'html',
      html: `
        <div style="text-align: center;">
          <h3>Great Progress!</h3>
          <p>You've completed <strong>75%</strong> of the inspection.</p>
          <div style="background: #e0e0e0; border-radius: 10px; height: 10px; margin: 16px 0;">
            <div style="background: #4caf50; height: 100%; width: 75%; border-radius: 10px;"></div>
          </div>
          <p>Keep up the excellent work!</p>
        </div>
      `
    },
    size: 'small',
    autoClose: 3000,
    triggers: [
      {
        id: 'progress_milestone',
        type: 'condition_met',
        conditions: [
          {
            expression: 'context.completion_percentage >= 75'
          }
        ]
      }
    ]
  },

  // Guided visual prompts
  tire_photo_guide: {
    id: 'tire_photo_guide',
    title: 'Tire Photo Guidelines',
    content: {
      type: 'image_gallery',
      images: [
        {
          url: '/images/guides/tire-photo-good.jpg',
          alt: 'Good tire photo example',
          caption: '✅ Good: Clear view of tread pattern, well-lit, focused'
        },
        {
          url: '/images/guides/tire-photo-bad.jpg',
          alt: 'Bad tire photo example', 
          caption: '❌ Bad: Blurry, poor lighting, obstructed view'
        },
        {
          url: '/images/guides/tire-photo-angle.jpg',
          alt: 'Tire photo angle guide',
          caption: 'Capture at slight angle to show tread depth clearly'
        }
      ]
    },
    size: 'large',
    triggers: [
      {
        id: 'tire_photo_upload',
        type: 'field_focus',
        targetField: 'tire_photos'
      }
    ]
  }
};

// Function to register all inspection popups
export function registerInspectionPopups(registerPopup: (definition: PopupDefinition) => void) {
  Object.values(INSPECTION_POPUP_PRESETS).forEach(popup => {
    registerPopup(popup);
  });
}
