import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  TextField,
  Paper,
  Alert,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Slider,
} from '@mui/material';
import Grid from '../components/CustomGrid';
import {
  Print as PrintIcon,
  Close as CloseIcon,
  Label as LabelIcon,
  Save as SaveIcon,
  Settings as SettingsIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { LabelTemplate, LabelField } from '../types/labelTemplates';
import { LabelPdfGenerator, LabelData } from '../services/labelPdfGenerator';
import { LabelApiService } from '../services/labelApi';
import { GeneratedLabelStorageService } from '../services/generatedLabelStorage';
import { usePrintStore } from '../stores/printStore';
import PrintApiService from '../services/printApi';
import { PrinterConfig } from '../types/print';
import { usePrintConfiguration } from '../hooks/usePrintConfiguration';
import { getUserSettings } from '../services/api';

interface LabelCreatorProps {
  open: boolean;
  onClose: () => void;
  onLabelCreated?: () => void; // Callback to refresh labels in parent component
}

interface LabelPrintSettingsProps {
  open: boolean;
  onClose: () => void;
  onSettingsChange?: (printMethod: 'pdf' | 'queue', printerId?: string, orientation?: string, autoPrint?: boolean) => void;
}

// Copies Selection Dialog Component for LabelCreator
const LabelCopiesDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onConfirm: (copies: number) => void;
  templateName: string;
}> = ({ open, onClose, onConfirm, templateName }) => {
  const [copies, setCopies] = useState(1);

  const handleConfirm = () => {
    onConfirm(copies);
    onClose();
  };

  const handleClose = () => {
    setCopies(1); // Reset to default
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CopyIcon />
          <Typography variant="h6">Set Copies for {templateName}</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ py: 2 }}>
          <Typography variant="body1" gutterBottom>
            How many copies would you like to print?
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 3, display: 'block' }}>
            This will print the specified number of copies of your label.
          </Typography>
          
          <Box sx={{ px: 2, py: 3 }}>
            <Typography variant="h4" align="center" color="primary" gutterBottom>
              {copies}
            </Typography>
            <Typography variant="body2" align="center" color="text.secondary" gutterBottom>
              {copies === 1 ? 'copy' : 'copies'}
            </Typography>
            
            <Slider
              value={copies}
              onChange={(_, value) => setCopies(value as number)}
              min={1}
              max={10}
              step={1}
              marks={[
                { value: 1, label: '1' },
                { value: 5, label: '5' },
                { value: 10, label: '10' }
              ]}
              valueLabelDisplay="auto"
              sx={{ mt: 3 }}
            />
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
            {[1, 2, 3, 4, 5].map((num) => (
              <Chip
                key={num}
                label={`${num} ${num === 1 ? 'copy' : 'copies'}`}
                onClick={() => setCopies(num)}
                color={copies === num ? 'primary' : 'default'}
                variant={copies === num ? 'filled' : 'outlined'}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>
          Cancel
        </Button>
        <Button onClick={handleConfirm} variant="contained">
          Print {copies} {copies === 1 ? 'Copy' : 'Copies'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const LabelCreator: React.FC<LabelCreatorProps> = ({ open, onClose, onLabelCreated }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<LabelTemplate | null>(null);
  const [labelData, setLabelData] = useState<LabelData>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [step, setStep] = useState<'select' | 'fill'>('select');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  
  // Add state for templates from API
  const [templates, setTemplates] = useState<LabelTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  
  // Print store for printer selection
  const { printers, setPrinters } = usePrintStore();
  
  // Print configuration hook for proper print functionality
  const { printForForm, isFormConfigured } = usePrintConfiguration();
  
  // Add state for tire size format selection
  const [tireSizeFormat, setTireSizeFormat] = useState<'metric' | 'standard'>('metric');
  
  // Add copies dialog state
  const [showCopiesDialog, setShowCopiesDialog] = useState(false);
  const [pendingPrintData, setPendingPrintData] = useState<{
    pdfBytes: Uint8Array;
    pdfBlob: Blob;
    labelPrintData: any;
    printMethod: string;
    maxRetries: number;
  } | null>(null);


  // Get current user name (not email)
  const userName = localStorage.getItem('userName') || 'Unknown User';
  const { userLocation } = useUser();

  // Load templates from API when dialog opens
  useEffect(() => {
    if (open) {
      loadTemplates();
      loadPrinters();
      setStep('select');
      setSelectedTemplate(null);
      setLabelData({});
      setError('');
      setPreviewUrl('');
      

    }
  }, [open]);

  // Load templates from API
  const loadTemplates = async () => {
    try {
      setTemplatesLoading(true);
      const allTemplates = await LabelApiService.getActiveTemplates();
      setTemplates(allTemplates);
    } catch (err) {
      console.error('Failed to load templates:', err);
      setError('Failed to load templates. Please try again.');
    } finally {
      setTemplatesLoading(false);
    }
  };

  // Load printers for selection
  const loadPrinters = async () => {
    try {
      const printersData = await PrintApiService.getPrinters();
      setPrinters(printersData);
    } catch (err) {
      console.error('Failed to load printers:', err);
    }
  };

  // Auto-populate common fields when template is selected
 useEffect(() => {
  if (selectedTemplate) {
    const now = new Date();
    const defaultData: LabelData = {};

    selectedTemplate.fields.forEach(field => {
      switch (field.name.toLowerCase()) {
        case 'created by':
          defaultData[field.name] = userName;
          break;
        case 'created date':
          defaultData[field.name] = now.toLocaleDateString();
          break;
        case 'copies to be printed':
          defaultData[field.name] = '1';
          break;
        default:
          defaultData[field.name] = '';
      }
      });

      setLabelData(defaultData);
      generatePreview(selectedTemplate, defaultData);
    }
  }, [selectedTemplate, userName]);

  const generatePreview = async (template: LabelTemplate, data: LabelData) => {
    try {
      const url = await LabelPdfGenerator.generatePreviewImage(template, data);
      setPreviewUrl(url);
    } catch (err) {
      console.error('Preview generation failed:', err);
    }
  };

  const handleTemplateSelect = (template: LabelTemplate) => {
    setSelectedTemplate(template);
    setStep('fill');
  };

  const formatTireSize = (value: string, format: 'metric' | 'standard' = tireSizeFormat): string => {
    if (format === 'metric') {
      // Metric format: XXX/XXRXX (e.g., 225/65R17)
      // Remove all non-alphanumeric characters first
      const cleaned = value.replace(/[^0-9R]/g, '');
      
      // Apply tire size formatting: XXX/XXRXX
      let formatted = '';
      let pos = 0;
      
      // Width (first 3 digits)
      if (pos < cleaned.length) {
        const width = cleaned.substring(pos, Math.min(pos + 3, cleaned.length));
        formatted += width;
        pos += width.length;
        
        if (pos < cleaned.length && width.length === 3) {
          formatted += '/';
        }
      }
      
      // Aspect ratio (next 2 digits)
      if (pos < cleaned.length && formatted.includes('/')) {
        const aspectRatio = cleaned.substring(pos, Math.min(pos + 2, cleaned.length));
        formatted += aspectRatio;
        pos += aspectRatio.length;
        
        if (pos < cleaned.length && aspectRatio.length === 2) {
          // Look for R in the remaining string
          const remaining = cleaned.substring(pos);
          if (remaining.includes('R') || pos < cleaned.length) {
            formatted += 'R';
            // Skip the R if it exists
            if (remaining.startsWith('R')) {
              pos += 1;
            }
          }
        }
      }
      
      // Wheel diameter (final 2 digits)
      if (pos < cleaned.length && formatted.includes('R')) {
        const wheelDiameter = cleaned.substring(pos, Math.min(pos + 2, cleaned.length));
        formatted += wheelDiameter;
      }
      
      return formatted;
    } else {
      // Standard format: XXX.XX-XX (e.g., 35X12.50R20)
      // Remove all non-alphanumeric characters first, keep digits, X, R, and decimal
      const cleaned = value.replace(/[^0-9XR.]/g, '').toUpperCase();
      
      let formatted = '';
      let pos = 0;
      
      // Diameter (first 2-3 digits)
      if (pos < cleaned.length) {
        const diameterMatch = cleaned.substring(pos).match(/^\d{2,3}/);
        if (diameterMatch) {
          const diameter = diameterMatch[0];
          formatted += diameter;
          pos += diameter.length;
          
          if (pos < cleaned.length) {
            formatted += 'X';
          }
        }
      }
      
      // Width with decimal (after X)
      if (pos < cleaned.length && formatted.includes('X')) {
        // Skip X if present
        if (cleaned[pos] === 'X') {
          pos++;
        }
        
        // Extract width with decimal
        const remainingAfterX = cleaned.substring(pos);
        const widthMatch = remainingAfterX.match(/^\d+\.?\d*/);
        if (widthMatch) {
          let width = widthMatch[0];
          // Ensure width has decimal format (e.g., 12.50)
          if (!width.includes('.') && width.length >= 2) {
            width = width.substring(0, 2) + '.' + (width.substring(2, 4) || '50');
          } else if (width.includes('.')) {
            const parts = width.split('.');
            if (parts[1] && parts[1].length === 1) {
              width = parts[0] + '.' + parts[1] + '0'; // 12.5 becomes 12.50
            }
          }
          formatted += width;
          pos += widthMatch[0].length;
          
          if (pos < cleaned.length) {
            formatted += 'R';
            // Skip R if present
            if (cleaned[pos] === 'R') {
              pos++;
            }
          }
        }
      }
      
      // Rim diameter (after R)
      if (pos < cleaned.length && formatted.includes('R')) {
        const rimMatch = cleaned.substring(pos).match(/^\d{2,3}/);
        if (rimMatch) {
          formatted += rimMatch[0];
        }
      }
      
      return formatted;
    }
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    let processedValue = value;
    
    // Apply tire size formatting for Tire Size fields
    if (fieldName.toLowerCase().includes('tire size')) {
      processedValue = formatTireSize(value, tireSizeFormat);
    }
    
    const newData = { ...labelData, [fieldName]: processedValue };
    setLabelData(newData);
    
    // Update preview in real-time
    if (selectedTemplate) {
      generatePreview(selectedTemplate, newData);
    }
  };

  const handlePrintLabel = async () => {
    if (!selectedTemplate) return;

    try {
      setLoading(true);
      setError('');

      const copies = parseInt(labelData['Copies to be Printed'] || '1');
      
      // Generate PDF and get bytes
      const pdfBytes = await LabelPdfGenerator.generateLabelPdf(selectedTemplate, labelData, copies);
      
      // Create blob from PDF bytes
      const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
      
      // Save the generated label to storage with location
      const savedLabel = await GeneratedLabelStorageService.saveGeneratedLabel({
        templateId: selectedTemplate.id,
        templateName: selectedTemplate.labelName,
        labelData: labelData,
        createdBy: userName,
        pdfBlob: pdfBlob,
        locationId: userLocation?.id // Add user's location for filtering
      });

      // Check print settings from localStorage (with server settings fallback)
      let printMethod: 'pdf' | 'queue' | 'queue-fallback' = 'pdf';
      let printerId = '';
      let autoPrint = false;
      let enableCustomCopies = false;
      let autoCut = true; // Default to true for auto-cut
      let orientation = 'portrait';

      // Try to load from server settings first
      try {
        const userSettings = await getUserSettings();
        const labelSettings = userSettings.labelPrintSettings;
        if (labelSettings) {
          printMethod = labelSettings.printMethod || 'pdf';
          printerId = labelSettings.printerId || '';
          autoPrint = labelSettings.autoPrint || false;
          enableCustomCopies = labelSettings.enableCustomCopies || false;
          autoCut = labelSettings.autoCut !== false; // Default to true if not set
          orientation = labelSettings.orientation || 'portrait';
        } else {
          // Fallback to localStorage
          printMethod = (localStorage.getItem('labelPrintMethod') as 'pdf' | 'queue' | 'queue-fallback') || 'pdf';
          printerId = localStorage.getItem('labelPrinterId') || '';
          autoPrint = localStorage.getItem('labelPrintAutoPrint') === 'true';
          enableCustomCopies = localStorage.getItem('labelPrintEnableCustomCopies') === 'true';
          autoCut = localStorage.getItem('labelPrintAutoCut') !== 'false'; // Default to true
          orientation = localStorage.getItem('labelPrintOrientation') || 'portrait';
        }
      } catch (err) {
        // Fallback to localStorage if server settings fail
        console.warn('Failed to load user settings, falling back to localStorage:', err);
        printMethod = (localStorage.getItem('labelPrintMethod') as 'pdf' | 'queue' | 'queue-fallback') || 'pdf';
        printerId = localStorage.getItem('labelPrinterId') || '';
        autoPrint = localStorage.getItem('labelPrintAutoPrint') === 'true';
        enableCustomCopies = localStorage.getItem('labelPrintEnableCustomCopies') === 'true';
        autoCut = localStorage.getItem('labelPrintAutoCut') !== 'false'; // Default to true
        orientation = localStorage.getItem('labelPrintOrientation') || 'portrait';
      }

      // Handle printing based on settings
      if (autoPrint && (printMethod === 'queue' || printMethod === 'queue-fallback') && printerId) {
        // Check if custom copies is enabled
        if (enableCustomCopies) {
          // Show copies dialog first
          setPendingPrintData({
            pdfBytes,
            pdfBlob,
            labelPrintData: {
              type: 'pdf-print',
              filename: `label-${selectedTemplate.labelName}-${Date.now()}.pdf`,
              printerId: printerId,
              autoCut: autoCut,
              labelInfo: {
                templateName: selectedTemplate.labelName,
                labelData: labelData,
                createdBy: userName,
                createdDate: new Date().toISOString()
              },
              metadata: {
                documentType: 'generated-label',
                generated: new Date().toISOString(),
                source: 'auto-print-on-save',
                orientation: orientation,
                autoCut: autoCut
              }
            },
            printMethod,
            maxRetries: printMethod === 'queue-fallback' ? 3 : 1
          });
          setShowCopiesDialog(true);
          return; // Don't proceed with printing yet
        } else {
          // Use default copies (1) and proceed with printing
          await executePrint(pdfBytes, pdfBlob, {
            type: 'pdf-print',
            filename: `label-${selectedTemplate.labelName}-${Date.now()}.pdf`,
            printerId: printerId,
            autoCut: autoCut,
            labelInfo: {
              templateName: selectedTemplate.labelName,
              labelData: labelData,
              createdBy: userName,
              createdDate: new Date().toISOString()
            },
            metadata: {
              documentType: 'generated-label',
              generated: new Date().toISOString(),
              source: 'auto-print-on-save',
              orientation: orientation,
              autoCut: autoCut
            }
          }, printMethod, printMethod === 'queue-fallback' ? 3 : 1, 1);
        }
      } else {
        // Open PDF in new tab for printing (default behavior)
        LabelPdfGenerator.openPdfInNewTab(pdfBytes);
      }

      // Notify parent component that a label was created (same pattern as static stickers)
      if (onLabelCreated) {
        onLabelCreated();
      }

      // Clear form and close dialog (same pattern as static stickers)
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate label');
    } finally {
      setLoading(false);
    }
  };

  // Execute the actual print job
  const executePrint = async (
    pdfBytes: Uint8Array,
    pdfBlob: Blob,
    labelPrintData: any,
    printMethod: string,
    maxRetries: number,
    copies: number
  ) => {
    try {
      // Convert PDF blob to base64 for transmission
      const reader = new FileReader();
      const pdfBase64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(pdfBlob);
      });

      // Add PDF data to the print data
      const finalPrintData = {
        ...labelPrintData,
        pdfData: pdfBase64
      };

      const attemptQueuePrint = async (retryCount = 0): Promise<void> => {
        try {
          console.log(`🖨️ Auto-printing label to print queue (attempt ${retryCount + 1}/${maxRetries})...`);
          const job = await PrintApiService.submitPrintJob({
            formName: 'labels',
            jobData: finalPrintData,
            options: {
              priority: 'normal',
              copies: copies
            }
          });

          console.log('✅ Label auto-print job queued successfully:', job.id);
          setError(''); // Clear any previous errors
          
        } catch (printError) {
          console.error(`Auto-print queue attempt ${retryCount + 1} failed:`, printError);
          
          if (retryCount < maxRetries - 1) {
            // Retry after a short delay
            setTimeout(() => {
              attemptQueuePrint(retryCount + 1);
            }, 2000);
            
            setError(`Auto-print attempt ${retryCount + 1} failed. Retrying... (${maxRetries - retryCount - 1} attempts remaining)`);
          } else {
            // All retries exhausted
            if (printMethod === 'queue-fallback') {
              // Fallback to PDF for queue-fallback mode
              console.log('🔄 All auto-print attempts failed. Opening PDF for manual printing...');
              LabelPdfGenerator.openPdfInNewTab(pdfBytes);
              setError(`Auto-print failed after ${maxRetries} attempts. PDF opened for manual printing.`);
            } else {
              // For regular queue mode, just show error
              setError(`Auto-print failed after ${maxRetries} attempts. Please try again or use manual printing.`);
            }
          }
        }
      };

      // Start the auto-print attempt process
      await attemptQueuePrint();
      
    } catch (error) {
      console.error('Error in auto-print:', error);
      setError('Failed to auto-print label. Please try manual printing.');
    }
  };

  // Handle copies dialog confirmation
  const handleCopiesConfirm = async (selectedCopies: number) => {
    if (!pendingPrintData) return;

    try {
      await executePrint(
        pendingPrintData.pdfBytes,
        pendingPrintData.pdfBlob,
        pendingPrintData.labelPrintData,
        pendingPrintData.printMethod,
        pendingPrintData.maxRetries,
        selectedCopies
      );

      // Check if this was triggered by print icon or save button
      const isPrintIconClick = pendingPrintData.labelPrintData.metadata?.source === 'print-icon-click';
      
      if (!isPrintIconClick) {
        // Only notify parent and close dialog for save button (auto-print)
        if (onLabelCreated) {
          onLabelCreated();
        }
        handleClose();
      }
      // For print icon click, just close the copies dialog and keep the form open
      
    } catch (error) {
      console.error('Error executing print after copies selection:', error);
      setError('Failed to print label after copies selection.');
    } finally {
      setPendingPrintData(null);
    }
  };

  // Handle copies dialog close
  const handleCopiesDialogClose = () => {
    setShowCopiesDialog(false);
    setPendingPrintData(null);
  };

  // Handle print icon click
  const handlePrintIconClick = async () => {
    if (!selectedTemplate) return;

    try {
      setLoading(true);
      setError('');

      // Load print settings (server settings first, then localStorage fallback)
      let printerId = '';
      let printMethod: 'pdf' | 'queue' | 'queue-fallback' = 'pdf';
      let autoCut = true;
      let orientation = 'portrait';

      try {
        const userSettings = await getUserSettings();
        const labelSettings = userSettings.labelPrintSettings;
        if (labelSettings) {
          printerId = labelSettings.printerId || '';
          printMethod = labelSettings.printMethod || 'pdf';
          autoCut = labelSettings.autoCut !== false;
          orientation = labelSettings.orientation || 'portrait';
        } else {
          printerId = localStorage.getItem('labelPrinterId') || '';
          printMethod = (localStorage.getItem('labelPrintMethod') as 'pdf' | 'queue' | 'queue-fallback') || 'pdf';
          autoCut = localStorage.getItem('labelPrintAutoCut') !== 'false';
          orientation = localStorage.getItem('labelPrintOrientation') || 'portrait';
        }
      } catch (err) {
        console.warn('Failed to load user settings, falling back to localStorage:', err);
        printerId = localStorage.getItem('labelPrinterId') || '';
        printMethod = (localStorage.getItem('labelPrintMethod') as 'pdf' | 'queue' | 'queue-fallback') || 'pdf';
        autoCut = localStorage.getItem('labelPrintAutoCut') !== 'false';
        orientation = localStorage.getItem('labelPrintOrientation') || 'portrait';
      }

      // Always show copies dialog for print icon click (as requested)
      // Generate PDF and get bytes first
      const copies = parseInt(labelData['Copies to be Printed'] || '1');
      const pdfBytes = await LabelPdfGenerator.generateLabelPdf(selectedTemplate as LabelTemplate, labelData, copies);
      const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
      
      // Show copies dialog
      setPendingPrintData({
        pdfBytes,
        pdfBlob,
        labelPrintData: {
          type: 'pdf-print',
          filename: `label-${(selectedTemplate as LabelTemplate).labelName}-${Date.now()}.pdf`,
          printerId: printerId,
          autoCut: autoCut,
          labelInfo: {
            templateName: (selectedTemplate as LabelTemplate).labelName,
            labelData: labelData,
            createdBy: userName,
            createdDate: new Date().toISOString()
          },
          metadata: {
            documentType: 'generated-label',
            generated: new Date().toISOString(),
            source: 'print-icon-click',
            orientation: orientation,
            autoCut: autoCut
          }
        },
        printMethod: printMethod,
        maxRetries: 3
      });
      setShowCopiesDialog(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to print label');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('select');
    setSelectedTemplate(null);
    setLabelData({});
    setPreviewUrl('');
    setTireSizeFormat('metric');
  };

  const handleClose = () => {
    setStep('select');
    setSelectedTemplate(null);
    setLabelData({});
    setError('');
    setPreviewUrl('');
    setTireSizeFormat('metric');
    onClose();
  };

  const isFormValid = () => {
    if (!selectedTemplate) return false;
    
    // Check if required fields are filled (exclude auto-filled fields, Label Name, Copies to be Printed, and fields not shown in form)
    return selectedTemplate.fields
      .filter(field => 
        field.name !== 'Copies to be Printed' && 
        field.name !== 'Created By' && 
        field.name !== 'Created Date' &&
        !field.name.toLowerCase().includes('label name') &&
        field.showInForm !== false // Only validate fields that show in form
      )
      .every(field => labelData[field.name]?.trim());
  };

  // Filter templates by category
  const tireTemplates = templates.filter(template => 
    template.labelName.toLowerCase().includes('tire')
  );
  const partsTemplates = templates.filter(template => 
    template.labelName.toLowerCase().includes('part')
  );

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { minHeight: '80vh' }
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LabelIcon />
          {step === 'select' ? 'Create New Label' : `Create ${selectedTemplate?.labelName} Label`}
        </DialogTitle>

        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {step === 'select' && (
            <Box>
              <Typography variant="h6" gutterBottom>
                
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                
              </Typography>

              {templatesLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : templates.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body1" color="text.secondary" gutterBottom>
                    No templates found
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    You need to create or import templates first
                  </Typography>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      onClose();
                      window.open('/label-manager', '_blank');
                    }}
                  >
                    Go to Label Manager
                  </Button>
                </Box>
              ) : (
                <>
                  {/* Tire Templates */}
                  {tireTemplates.length > 0 && (
                    <Box sx={{ mb: 4 }}>
                      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                        🛞 Tire Templates ({tireTemplates.length})
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {tireTemplates.map((template) => (
                          <Chip
                            key={template.id}
                            label={template.labelName}
                            onClick={() => handleTemplateSelect(template)}
                            color="primary"
                            variant="outlined"
                            clickable
                            sx={{ 
                              px: 2, 
                              py: 1,
                              fontSize: '0.9rem',
                              '&:hover': {
                                backgroundColor: 'primary.light',
                                color: 'white'
                              }
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* Parts Templates */}
                  {partsTemplates.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                        🔧 Parts Templates ({partsTemplates.length})
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {partsTemplates.map((template) => (
                          <Chip
                            key={template.id}
                            label={template.labelName}
                            onClick={() => handleTemplateSelect(template)}
                            color="secondary"
                            variant="outlined"
                            clickable
                            sx={{ 
                              px: 2, 
                              py: 1,
                              fontSize: '0.9rem',
                              '&:hover': {
                                backgroundColor: 'secondary.light',
                                color: 'white'
                              }
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* Other Templates (not tire or parts) */}
                  {templates.filter(t => !tireTemplates.includes(t) && !partsTemplates.includes(t)).length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                        📋 Other Templates ({templates.filter(t => !tireTemplates.includes(t) && !partsTemplates.includes(t)).length})
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {templates.filter(t => !tireTemplates.includes(t) && !partsTemplates.includes(t)).map((template) => (
                          <Chip
                            key={template.id}
                            label={template.labelName}
                            onClick={() => handleTemplateSelect(template)}
                            color="default"
                            variant="outlined"
                            clickable
                            sx={{ 
                              px: 2, 
                              py: 1,
                              fontSize: '0.9rem',
                              '&:hover': {
                                backgroundColor: 'grey.200'
                              }
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  )}
                </>
              )}
            </Box>
          )}

          {step === 'fill' && selectedTemplate && (
            <Grid container spacing={3}>
              {/* Form Section */}
              <Grid item xs={12} md={7}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    
                  </Typography>

                  {/* Auto-filled Information as Chips */}
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    {selectedTemplate.fields.filter(field => field.name === 'Created By' || field.name === 'Created Date').map((field) => (
                      <Chip
                        key={field.id}
                        label={labelData[field.name] || ''}
                        color="primary"
                        variant="outlined"
                        size="medium"
                        sx={{ 
                          fontSize: '0.875rem',
                          '& .MuiChip-label': {
                            paddingLeft: 1,
                            paddingRight: 1
                          }
                        }}
                      />
                    ))}
                  </Box>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {selectedTemplate.fields.map((field) => {
                      const isTireSize = field.name.toLowerCase().includes('tire size');
                      const isCopies = field.name === 'Copies to be Printed';
                      const isAutoFilled = field.name === 'Created By' || field.name === 'Created Date';
                      const isLabelName = field.name.toLowerCase().includes('label name');
                      
                      // Skip auto-filled fields (now shown as chips) and Label Name field
                      if (isAutoFilled || isLabelName) {
                        return null;
                      }
                      
                      // Skip fields that are set to not show in form
                      if (field.showInForm === false) {
                        return null;
                      }
                      
                      return (
                        <Box key={field.id}>
                          {/* Tire Size Format Chips */}
                          {isTireSize && (
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                Tire Size Format:
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Chip
                                  label="Metric"
                                  onClick={() => {
                                    setTireSizeFormat('metric');
                                    // Reformat existing value with new format
                                    if (labelData[field.name]) {
                                      handleFieldChange(field.name, labelData[field.name]);
                                    }
                                  }}
                                  color={tireSizeFormat === 'metric' ? 'primary' : 'default'}
                                  variant={tireSizeFormat === 'metric' ? 'filled' : 'outlined'}
                                  size="small"
                                  sx={{ 
                                    cursor: 'pointer',
                                    '&:hover': {
                                      backgroundColor: tireSizeFormat === 'metric' ? 'primary.dark' : 'grey.100'
                                    }
                                  }}
                                />
                                <Chip
                                  label="Standard"
                                  onClick={() => {
                                    setTireSizeFormat('standard');
                                    // Reformat existing value with new format
                                    if (labelData[field.name]) {
                                      handleFieldChange(field.name, labelData[field.name]);
                                    }
                                  }}
                                  color={tireSizeFormat === 'standard' ? 'primary' : 'default'}
                                  variant={tireSizeFormat === 'standard' ? 'filled' : 'outlined'}
                                  size="small"
                                  sx={{ 
                                    cursor: 'pointer',
                                    '&:hover': {
                                      backgroundColor: tireSizeFormat === 'standard' ? 'primary.dark' : 'grey.100'
                                    }
                                  }}
                                />
                              </Box>
                            </Box>
                          )}
                          
                          <TextField
                            label={field.name}
                            value={labelData[field.name] || ''}
                            onChange={(e) => handleFieldChange(field.name, e.target.value)}
                            fullWidth
                            variant="outlined"
                            type={isCopies ? 'number' : 'text'}
                            placeholder={
                              isTireSize ? (tireSizeFormat === 'metric' ? '225/65R17' : '35X12.50R20') :
                              field.name === 'Invoice #' ? 'INV-2024-001' :
                              field.name === 'Part Number' ? 'PN-123456' :
                              field.name === 'Vendor Part Number' ? 'VPN-789' :
                              field.name === 'Vendor' ? 'ABC Supply Co.' :
                              field.name === 'Bin/Location' ? 'A1-B2' :
                              undefined
                            }
                            inputProps={
                              isCopies ? { min: 1, max: 10 } :
                              isTireSize ? { maxLength: tireSizeFormat === 'metric' ? 11 : 12 } : // XXX/XXRXX = 11 chars, XXX.XXRxx = 12 chars
                              {}
                            }
                            helperText={
                              isCopies ? 'Number of label copies to print (1-10)' :
                              isTireSize ? (tireSizeFormat === 'metric' ? 'Width/Aspect Ratio + R + Wheel Diameter (e.g., 225/65R17)' : 'Diameter X Width R Rim (e.g., 35X12.50R20)') :
                              field.name === 'Invoice #' ? 'Invoice or work order number' :
                              field.name === 'Bin/Location' ? 'Storage location (e.g., A1-B2, Shelf-3)' :
                              undefined
                            }
                            sx={isTireSize ? {
                              '& input': {
                                fontFamily: 'monospace',
                                fontSize: '1.1rem',
                                fontWeight: 600
                              }
                            } : {}}
                          />
                        </Box>
                      );
                    })}
                  </Box>
                </Paper>
              </Grid>

              {/* Preview Section */}
              <Grid item xs={12} md={5}>
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="h6" gutterBottom>
                    Label Preview
                  </Typography>
                  
                  {previewUrl ? (
                    <Box sx={{ 
                      border: '2px dashed #ccc',
                      borderRadius: 2,
                      p: 2,
                      backgroundColor: '#fafafa'
                    }}>
                      <img
                        src={previewUrl}
                        alt="Label Preview"
                        style={{
                          maxWidth: '100%',
                          height: 'auto',
                          border: '1px solid #ddd',
                          borderRadius: 4
                        }}
                      />
                    </Box>
                  ) : (
                    <Box sx={{ 
                      border: '2px dashed #ccc',
                      borderRadius: 2,
                      p: 4,
                      backgroundColor: '#fafafa'
                    }}>
                      <Typography variant="body2" color="text.secondary">
                        Label preview will appear here
                      </Typography>
                    </Box>
                  )}

                  <Typography variant="caption" display="block" sx={{ mt: 2, color: 'text.secondary' }}>
                    Size: {selectedTemplate.width} x {selectedTemplate.height} pixels<br/>
                    This preview updates in real-time as you fill the form
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 3, borderTop: '1px solid #eee' }}>
          {step === 'select' && (
            <Button
              onClick={handleClose}
              startIcon={<CloseIcon />}
            >
              Cancel
            </Button>
          )}

          {step === 'fill' && (
            <>
              <Button
                onClick={handleBack}
                color="inherit"
              >
                Back to Templates
              </Button>
              <Box sx={{ flexGrow: 1 }} />
              
              {/* Print Icon Button */}
              <Button
                onClick={handlePrintIconClick}
                variant="outlined"
                startIcon={loading ? <CircularProgress size={20} /> : <PrintIcon />}
                disabled={!isFormValid() || loading}
                sx={{ mr: 1 }}
              >
                {loading ? 'Printing...' : 'Print'}
              </Button>
              
              <Button
                onClick={handlePrintLabel}
                variant="contained"
                startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
                disabled={!isFormValid() || loading}
              >
                {loading ? 'Generating...' : 'Save'}
              </Button>
            </>
          )}
        </DialogActions>


      </Dialog>

      {/* Copies Selection Dialog */}
      <LabelCopiesDialog
        open={showCopiesDialog}
        onClose={handleCopiesDialogClose}
        onConfirm={handleCopiesConfirm}
        templateName={selectedTemplate?.labelName || 'Label'}
      />
    </>
  );
};

export default LabelCreator; 