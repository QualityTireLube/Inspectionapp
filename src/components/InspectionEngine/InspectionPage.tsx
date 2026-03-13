/**
 * Schema-Driven Inspection Page
 * 
 * Renders inspection forms dynamically based on UI schemas,
 * with automatic field registration, rule evaluation, and timer integration.
 */

import * as React from 'react';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Box, 
  Tab, 
  Tabs, 
  Paper, 
  Typography, 
  Alert, 
  Grid, 
  Button,
  CircularProgress
} from '@mui/material';

import { InspectionTypeSchema, getResolvedUISchema } from '../../config/uiSchemas';
import { getFieldDef, getFieldDefaultValue, validateField, FIELD_REGISTRY } from '../../config/fieldRegistry';
import { evaluateRule, evaluateFieldStates, createRuleContext } from './ruleEvaluator';
import { SafeFieldRenderer } from './widgetRegistry';
import { loadTestDataIntoForm, logTestDataStatus } from '../../utils/testDataLoader';

// Import existing components we'll reuse
import VirtualTabTimer, { VirtualTabTimerAPI } from '../VirtualTabTimer';
// import InspectionLayout from '../InspectionLayout'; // TODO: Fix import
import { useDraftForm } from '../../hooks/useDraftForm';
import { useNotification } from '../../hooks/useNotification';
// import { useUser } from '../../contexts/UserContext'; // TODO: Fix import

export interface SchemaInspectionPageProps {
  schema: InspectionTypeSchema;
}

interface TabPanelProps {
  children?: React.ReactNode;
  value: number;
  index: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div role="tabpanel" hidden={value !== index}>
    {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
  </div>
);

/**
 * Schema-driven inspection page component
 */
export const SchemaInspectionPage: React.FC<SchemaInspectionPageProps> = ({ schema: inputSchema }) => {
  const navigate = useNavigate();
  const location = useLocation();
  // const { userLocation } = useUser(); // TODO: Fix import
  const userLocation = { name: '', id: '' }; // Temporary placeholder
  // const { showSuccess, showError } = useNotification(); // TODO: Fix import
  const showSuccess = (msg: string) => console.log('Success:', msg);
  const showError = (msg: string) => console.error('Error:', msg);

  // Resolve schema inheritance
  const schema = useMemo(() => getResolvedUISchema(inputSchema.id) || inputSchema, [inputSchema]);

  // Basic state
  const [tabValue, setTabValue] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Timer and debug
  const timerAPI = useRef<VirtualTabTimerAPI | null>(null);
  const [showDebugPanel, setShowDebugPanel] = useState<boolean>(false);
  const [isPageVisible, setIsPageVisible] = useState<boolean>(true);

  // User info
  const userName = localStorage.getItem('userName') || '';
  const userId = localStorage.getItem('userId') || '';

  // URL params
  const urlParams = new URLSearchParams(location.search);
  const vinFromUrl = (urlParams.get('vin') || '').toUpperCase();
  const mileageFromUrl = urlParams.get('mileage') || '';

  // Track if form has been initialized to prevent multiple initializations
  const isInitializedRef = useRef(false);

  // Initialize form values once on mount
  useEffect(() => {
    if (isInitializedRef.current) return; // Prevent multiple initializations
    
    // Log test data status for debugging
    logTestDataStatus(schema.submitType, vinFromUrl);

    const initialValues: Record<string, unknown> = {};

    // Set default values for all fields in schema
    schema.fields.forEach(fieldId => {
      const defaultValue = getFieldDefaultValue(fieldId);
      if (defaultValue !== undefined) {
        initialValues[fieldId] = defaultValue;
      }
    });

    // Override with system values
    initialValues.user = userName;
    initialValues.date = new Date().toISOString().split('T')[0];
    initialValues.location = userLocation?.name || '';
    initialValues.location_id = userLocation?.id || '';
    initialValues.inspection_type = schema.submitType;

    // Override with URL params
    if (vinFromUrl) initialValues.vin = vinFromUrl;
    if (mileageFromUrl) initialValues.mileage = mileageFromUrl;

    // Try to load test data if available
    try {
      const testData = loadTestDataIntoForm({
        inspectionType: schema.submitType,
        vin: vinFromUrl,
        fallbackToMinimal: true
      });

      if (testData) {
        console.log('🧪 Loading test data into schema-driven form');
        // Merge test data with initial values, keeping system values priority
        Object.entries(testData).forEach(([key, value]) => {
          // Don't override system fields
          if (!['user', 'date', 'location', 'location_id', 'inspection_type'].includes(key)) {
            initialValues[key] = value;
          }
        });
      }
    } catch (error) {
      console.error('❌ Error loading test data:', error);
    }

    console.log('Initializing form with values:', initialValues);
    setFormValues(initialValues);
    isInitializedRef.current = true;
  }, []); // Empty dependency array - only run once on mount

  // Draft management (temporarily disabled)
  // const draft = useDraftForm({
  //   userId,
  //   userName,
  //   initialForm: formValues as any,
  //   onFormLoad: (loadedForm) => setFormValues(loadedForm as Record<string, unknown>),
  //   autoSaveDelay: 1000,
  //   namespace: schema.submitType,
  //   inspectionType: schema.submitType
  // });
  const draft = { 
    status: 'idle' as const, 
    lastSave: null, 
    error: null,
    scheduleAutoSave: () => {}
  };

  // Schedule autosave on form changes (disabled)
  // useEffect(() => {
  //   if (Object.keys(formValues).length > 0) {
  //     draft.scheduleAutoSave(formValues as any);
  //   }
  // }, [formValues, draft.scheduleAutoSave]);

  // Create rule evaluation context (stable reference)
  const ruleContext = useMemo(() => {
    return createRuleContext(
      formValues,
      { 
        role: 'technician',
        location: userLocation?.name,
        userId 
      },
      schema.submitType
    );
  }, [formValues, userLocation?.name, userId, schema.submitType]);

  // Evaluate field states (stable reference)
  const fieldStates = useMemo(() => {
    return evaluateFieldStates(
      schema.fields,
      FIELD_REGISTRY,
      ruleContext
    );
  }, [schema.fields, ruleContext]);

  // Get visible fields (for timer tab names)
  const visibleTabs = useMemo(() => {
    return schema.tabs.filter(tab => 
      !tab.showIf || evaluateRule(tab.showIf, ruleContext)
    );
  }, [schema.tabs, ruleContext]);

  const tabNames = useMemo(() => {
    return visibleTabs.map(tab => tab.id);
  }, [visibleTabs]);

  // Handle field value changes (stable reference)
  const handleFieldChange = useCallback((fieldId: string, value: unknown) => {
    setFormValues(prev => ({
      ...prev,
      [fieldId]: value
    }));

    // Clear field error if it exists
    setFieldErrors(prev => {
      if (prev[fieldId]) {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      }
      return prev;
    });
  }, []); // Empty deps - this function is stable

  // Validate form
  const validateForm = useCallback(() => {
    const errors: Record<string, string> = {};

    schema.fields.forEach(fieldId => {
      const fieldState = fieldStates[fieldId];
      if (!fieldState?.visible) return; // Skip hidden fields

      const value = formValues[fieldId];
      const error = validateField(fieldId, value, ruleContext);
      
      if (error) {
        errors[fieldId] = error;
      }
    });

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [schema.fields, fieldStates, formValues, ruleContext]);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      showError('Please fix validation errors before submitting');
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement submission logic
      // Should include schema metadata in payload
      const payload = {
        schemaId: schema.id,
        schemaVersion: schema.version,
        submitType: schema.submitType,
        data: formValues,
        timing: timerAPI.current?.getCurrentTimingData() || {}
      };

      console.log('Submitting form:', payload);
      
      // Simulate submission
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      showSuccess('Inspection submitted successfully');
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Submission error:', err);
      showError(err.message || 'Failed to submit inspection');
    } finally {
      setLoading(false);
    }
  }, [validateForm, schema, formValues, timerAPI, showSuccess, showError, navigate]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    // TODO: Implement cancel logic with draft cleanup
    navigate('/dashboard');
  }, [navigate]);

  // Render a field (memoized to prevent unnecessary re-renders)
  const renderField = useCallback((fieldId: string, colSpan?: number) => {
    const fieldDef = getFieldDef(fieldId);
    const fieldState = fieldStates[fieldId];
    
    if (!fieldDef || !fieldState?.visible) {
      return null;
    }

    const value = formValues[fieldId];
    const error = fieldErrors[fieldId];

    return (
      <Grid item xs={12} md={colSpan ? 12 / colSpan : 6} key={fieldId}>
        <SafeFieldRenderer
          fieldId={fieldId}
          field={fieldDef}
          value={value}
          onChange={(newValue) => handleFieldChange(fieldId, newValue)}
          error={error}
          disabled={fieldState.readOnly || loading}
          required={fieldState.required}
          context={ruleContext}
        />
      </Grid>
    );
  }, [fieldStates, formValues, fieldErrors, handleFieldChange, ruleContext, loading]);

  // Render a section
  const renderSection = useCallback((section: any) => {
    if (section.showIf && !evaluateRule(section.showIf, ruleContext)) {
      return null;
    }

    return (
      <Paper key={section.id} sx={{ p: 2, mb: 2 }}>
        {section.title && (
          <Typography variant="h6" sx={{ mb: 2 }}>
            {section.title}
          </Typography>
        )}
        <Grid container spacing={2}>
          {section.rows.map((row: any[], rowIndex: number) => (
            <React.Fragment key={rowIndex}>
              {row.map((layoutField: any) => {
                if (layoutField.showIf && !evaluateRule(layoutField.showIf, ruleContext)) {
                  return null;
                }
                return renderField(layoutField.field, layoutField.colSpan);
              })}
            </React.Fragment>
          ))}
        </Grid>
      </Paper>
    );
  }, [ruleContext, renderField]);

  // Check if it's the last tab
  const isLastTab = tabValue === visibleTabs.length - 1;

  return (
    <Box sx={{ p: 2 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {/* Simplified layout for now */}
      <Typography variant="h4" sx={{ mb: 2 }}>
        {schema.title}
      </Typography>
      
      {/* Tab navigation */}
      <Paper sx={{ mb: 2 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          {visibleTabs.map((tab, index) => (
            <Tab key={tab.id} label={tab.title} />
          ))}
        </Tabs>
      </Paper>

      {/* Navigation buttons */}
      <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
        <Button 
          variant="outlined" 
          onClick={() => setTabValue(Math.max(0, tabValue - 1))}
          disabled={tabValue === 0}
        >
          Previous
        </Button>
        <Button 
          variant="outlined" 
          onClick={() => setTabValue(Math.min(visibleTabs.length - 1, tabValue + 1))}
          disabled={isLastTab}
        >
          Next
        </Button>
        <Button 
          variant="contained" 
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? <CircularProgress size={20} /> : 'Submit'}
        </Button>
        <Button 
          variant="outlined" 
          onClick={handleCancel}
        >
          Cancel
        </Button>
      </Box>
      {/* Virtual timer for tab timing */}
      <VirtualTabTimer
        tabNames={tabNames}
        currentTabIndex={tabValue}
        initialTimings={formValues.tab_timings as Record<string, number>}
        onTabTimingUpdate={(timings) => handleFieldChange('tab_timings', timings)}
        onTabChange={(newIndex) => setTabValue(newIndex)}
        showDebugPanel={showDebugPanel}
        isPageVisible={isPageVisible}
      >
        {(api) => {
          timerAPI.current = api;
          return null;
        }}
      </VirtualTabTimer>

      {/* Render tabs dynamically */}
      {visibleTabs.map((tab, idx) => (
        <TabPanel key={tab.id} value={tabValue} index={idx}>
          {tab.sections.map(section => renderSection(section))}
        </TabPanel>
      ))}

      {/* Debug panel toggle */}
      {process.env.NODE_ENV === 'development' && (
        <Box sx={{ position: 'fixed', bottom: 10, right: 10 }}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => setShowDebugPanel(!showDebugPanel)}
          >
            Debug: {showDebugPanel ? 'Hide' : 'Show'}
          </Button>
        </Box>
      )}

      {/* Schema info for debugging */}
      {showDebugPanel && (
        <Paper sx={{ p: 2, mt: 2, bgcolor: 'grey.100' }}>
          <Typography variant="caption" component="div">
            <strong>Schema Debug Info:</strong>
          </Typography>
          <Typography variant="caption" component="div">
            Schema ID: {schema.id} v{schema.version}
          </Typography>
          <Typography variant="caption" component="div">
            Submit Type: {schema.submitType}
          </Typography>
          <Typography variant="caption" component="div">
            Total Fields: {schema.fields.length}
          </Typography>
          <Typography variant="caption" component="div">
            Visible Fields: {Object.values(fieldStates).filter(s => s.visible).length}
          </Typography>
          <Typography variant="caption" component="div">
            Field Errors: {Object.keys(fieldErrors).length}
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default SchemaInspectionPage;
