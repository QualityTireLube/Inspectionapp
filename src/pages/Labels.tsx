import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Button,
  Alert,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Switch,
  FormControlLabel,
  TextField,
  InputAdornment,
  Card,
  CardContent,
  Grid,
  Divider,
  Tooltip,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Snackbar,
  Slider
} from '@mui/material';
import {
  Print as PrintIcon,
  Edit as EditIcon,
  Archive as ArchiveIcon,
  Unarchive as UnarchiveIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  LocalOffer as StickerIcon,
  Label as LabelIcon,
  Refresh as RefreshIcon,
  RestoreFromTrash as RestoreIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Add as AddIcon,
  Description as GeneratedLabelIcon,
  ViewInAr as ViewInArIcon,  // This might be the one you're looking for
  // or try these alternatives:
  // Apps as AppsIcon,
  // GridView as GridViewIcon,
  // Dashboard as DashboardIcon
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { LabelTemplate } from '../types/labelTemplates';
import { GeneratedLabel } from '../types/labels';
import { StaticSticker, StickerSettings, OilType } from '../types/stickers';
import { LabelApiService } from '../services/labelApi';
import { GeneratedLabelStorageService } from '../services/generatedLabelStorage';
import { StickerStorageService } from '../services/stickerStorage';
import { PDFGeneratorService } from '../services/pdfGenerator';
import { LabelPdfGenerator } from '../services/labelPdfGenerator';
import { format } from 'date-fns';
import StickerCard from '../components/StickerCard';
import PrintQueueBadge from '../components/PrintQueueBadge';
import { usePrintStore } from '../stores/printStore';
import PrintApiService from '../services/printApi';
import { getUserSettings } from '../services/api';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`labels-tabpanel-${index}`}
      aria-labelledby={`labels-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const Labels: React.FC = () => {
  // Print store for queue functionality
  const { getConfiguration } = usePrintStore();
  
  const [tabValue, setTabValue] = useState(0);
  const [labelTemplates, setLabelTemplates] = useState<LabelTemplate[]>([]);
  const [generatedLabels, setGeneratedLabels] = useState<GeneratedLabel[]>([]);
  const [stickers, setStickers] = useState<StaticSticker[]>([]);
  const [stickerSettings, setStickerSettings] = useState<StickerSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [restockingSearchTerm, setRestockingSearchTerm] = useState('');
  const [archivedLabelsSearchTerm, setArchivedLabelsSearchTerm] = useState('');
  const [templatesSearchTerm, setTemplatesSearchTerm] = useState('');

  // Print settings state
  const [labelPrintMethod, setLabelPrintMethod] = useState<'pdf' | 'queue' | 'queue-fallback'>('pdf');
  const [labelPrinterId, setLabelPrinterId] = useState<string>('');
  const [labelPrintOrientation, setLabelPrintOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [labelAutoCut, setLabelAutoCut] = useState<boolean>(true);
  const [stickerPrintMethod, setStickerPrintMethod] = useState<'pdf' | 'queue' | 'queue-fallback'>('pdf');
  const [stickerPrinterId, setStickerPrinterId] = useState<string>('');
  const [stickerPrintOrientation, setStickerPrintOrientation] = useState<'portrait' | 'landscape'>('portrait');

  // Copies dialog state for generated labels
  const [showCopiesDialog, setShowCopiesDialog] = useState(false);
  const [pendingPrintLabel, setPendingPrintLabel] = useState<GeneratedLabel | null>(null);
  const [selectedCopies, setSelectedCopies] = useState(1);

  // Detail view states
  const [selectedItem, setSelectedItem] = useState<LabelTemplate | GeneratedLabel | StaticSticker | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingSticker, setEditingSticker] = useState<Partial<StaticSticker>>({});
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Snackbar for notifications
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  // Load print settings from server (with localStorage fallback)
  useEffect(() => {
    const loadPrintSettings = async () => {
      try {
        // Try to load from server settings first
        const userSettings = await getUserSettings();
        
        // Label print settings
        const labelSettings = userSettings.labelPrintSettings;
        if (labelSettings) {
          setLabelPrintMethod(labelSettings.printMethod || 'pdf');
          setLabelPrinterId(labelSettings.printerId || '');
          setLabelPrintOrientation(labelSettings.orientation || 'portrait');
          setLabelAutoCut(labelSettings.autoCut !== false); // Default to true
        } else {
          // Fallback to localStorage
          const labelMethod = (localStorage.getItem('labelPrintMethod') as 'pdf' | 'queue' | 'queue-fallback') || 'pdf';
          const labelPrinter = localStorage.getItem('labelPrinterId') || '';
          const labelOrientation = (localStorage.getItem('labelPrintOrientation') as 'portrait' | 'landscape') || 'portrait';
          const labelAutoCutSetting = localStorage.getItem('labelPrintAutoCut') !== 'false'; // Default to true
          
          setLabelPrintMethod(labelMethod);
          setLabelPrinterId(labelPrinter);
          setLabelPrintOrientation(labelOrientation);
          setLabelAutoCut(labelAutoCutSetting);
        }
        
        // Sticker print settings
        const stickerSettings = userSettings.stickerPrintSettings;
        if (stickerSettings) {
          setStickerPrintMethod(stickerSettings.printMethod || 'pdf');
          setStickerPrinterId(stickerSettings.printerId || '');
          setStickerPrintOrientation(stickerSettings.orientation || 'portrait');
        } else {
          // Fallback to localStorage
          const stickerMethod = (localStorage.getItem('stickerPrintMethod') as 'pdf' | 'queue' | 'queue-fallback') || 'pdf';
          const stickerPrinter = localStorage.getItem('stickerPrinterId') || '';
          const stickerOrientation = (localStorage.getItem('stickerPrintOrientation') as 'portrait' | 'landscape') || 'portrait';
          
          setStickerPrintMethod(stickerMethod);
          setStickerPrinterId(stickerPrinter);
          setStickerPrintOrientation(stickerOrientation);
        }
      } catch (err) {
        console.error('Failed to load print settings from server, using localStorage fallback:', err);
        // Fallback to localStorage if server fails
        const labelMethod = (localStorage.getItem('labelPrintMethod') as 'pdf' | 'queue' | 'queue-fallback') || 'pdf';
        const labelPrinter = localStorage.getItem('labelPrinterId') || '';
        const labelOrientation = (localStorage.getItem('labelPrintOrientation') as 'portrait' | 'landscape') || 'portrait';
        const labelAutoCutSetting = localStorage.getItem('labelPrintAutoCut') !== 'false'; // Default to true
        
        setLabelPrintMethod(labelMethod);
        setLabelPrinterId(labelPrinter);
        setLabelPrintOrientation(labelOrientation);
        setLabelAutoCut(labelAutoCutSetting);
        
        const stickerMethod = (localStorage.getItem('stickerPrintMethod') as 'pdf' | 'queue' | 'queue-fallback') || 'pdf';
        const stickerPrinter = localStorage.getItem('stickerPrinterId') || '';
        const stickerOrientation = (localStorage.getItem('stickerPrintOrientation') as 'portrait' | 'landscape') || 'portrait';
        
        setStickerPrintMethod(stickerMethod);
        setStickerPrinterId(stickerPrinter);
        setStickerPrintOrientation(stickerOrientation);
      }
    };
    
    loadPrintSettings();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Load label templates
      const allTemplates = await LabelApiService.getAllTemplates();
      setLabelTemplates(allTemplates);
      
      // Load generated labels
      const allGeneratedLabels = await GeneratedLabelStorageService.getGeneratedLabels();
      setGeneratedLabels(allGeneratedLabels);
      
      // Load stickers from local storage
      const allStickers = StickerStorageService.getAllStickers();
      setStickers(allStickers);
      
      // Load sticker settings
      const settings = StickerStorageService.getSettings();
      setStickerSettings(settings);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Detail view handlers
  const handleRowClick = async (item: LabelTemplate | GeneratedLabel | StaticSticker) => {
    setSelectedItem(item);
    setDetailDialogOpen(true);
    setIsEditing(false);
    setEditingSticker({});
    
    // Generate PDF preview
    await generatePdfPreview(item);
  };

  const generatePdfPreview = async (item: LabelTemplate | GeneratedLabel | StaticSticker) => {
    setGeneratingPdf(true);
    try {
      if ('labelName' in item) {
        // Label template
        const sampleData = {
          'Label Name': item.labelName,
          'Created By': item.createdBy,
          'Created Date': format(new Date(item.createdDate), 'MMM dd, yyyy'),
          'Invoice #': 'INV-001',
          'Tire Size': '205/55R16',
          'Part Number': 'PART-123',
          'Vendor': 'Vendor Name',
          'Bin/Location': 'A1-B2-C3',
          'Copies to be Printed': item.copies.toString()
        };
        
        const pdfBytes = await LabelPdfGenerator.generateLabelPdf(item, sampleData, 1);
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setPdfPreviewUrl(url);
      } else if ('templateId' in item) {
        // Generated label
        if (item.pdfBlob) {
          const url = URL.createObjectURL(item.pdfBlob);
          setPdfPreviewUrl(url);
        } else {
          // Regenerate PDF if blob is missing
          const template = labelTemplates.find(t => t.id === item.templateId);
          if (template) {
            const pdfBytes = await LabelPdfGenerator.generateLabelPdf(template, item.labelData, 1);
            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            setPdfPreviewUrl(url);
          }
        }
      } else {
        // Static sticker
        if (stickerSettings) {
          const blob = await PDFGeneratorService.generateStickerPDFBlob(item, stickerSettings);
          const url = URL.createObjectURL(blob);
          setPdfPreviewUrl(url);
        }
      }
    } catch (err) {
      console.error('Error generating PDF preview:', err);
      setSnackbar({
        open: true,
        message: 'Failed to generate PDF preview',
        severity: 'error'
      });
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleCloseDetail = () => {
    setDetailDialogOpen(false);
    setSelectedItem(null);
    setIsEditing(false);
    setEditingSticker({});
    if (pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl);
      setPdfPreviewUrl(null);
    }
  };

  const handleEdit = () => {
    if (selectedItem && 'vin' in selectedItem) {
      setEditingSticker({ ...selectedItem });
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (selectedItem && 'vin' in selectedItem && editingSticker) {
      try {
        const updatedSticker = { ...selectedItem, ...editingSticker };
        StickerStorageService.saveSticker(updatedSticker);
        setStickers(StickerStorageService.getAllStickers());
        setSelectedItem(updatedSticker);
        setIsEditing(false);
        setEditingSticker({});
        
        // Regenerate PDF preview
        await generatePdfPreview(updatedSticker);
        
        setSnackbar({
          open: true,
          message: 'Sticker updated successfully',
          severity: 'success'
        });
      } catch (err) {
        setSnackbar({
          open: true,
          message: 'Failed to update sticker',
          severity: 'error'
        });
      }
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingSticker({});
  };

  // Generated Label Actions
  const handleArchiveGeneratedLabel = async (label: GeneratedLabel) => {
    try {
      const success = await GeneratedLabelStorageService.archiveGeneratedLabel(label.id, 'User');
      if (success) {
        const latest = await GeneratedLabelStorageService.getGeneratedLabels();
        setGeneratedLabels(latest);
        setSnackbar({
          open: true,
          message: 'Label archived',
          severity: 'success'
        });
      }
    } catch (err) {
      setSnackbar({
        open: true,
        message: 'Failed to archive label',
        severity: 'error'
      });
    }
  };

  const handleRestoreGeneratedLabel = async (label: GeneratedLabel) => {
    try {
      const success = await GeneratedLabelStorageService.restoreGeneratedLabel(label.id);
      if (success) {
        const latest = await GeneratedLabelStorageService.getGeneratedLabels();
        setGeneratedLabels(latest);
        setSnackbar({
          open: true,
          message: 'Label restored',
          severity: 'success'
        });
      }
    } catch (err) {
      setSnackbar({
        open: true,
        message: 'Failed to restore label',
        severity: 'error'
      });
    }
  };

  // NEW: Move archived generated label to restocking (renamed to avoid conflict)
  const handleMoveGeneratedLabelToRestocking = async (label: GeneratedLabel) => {
    try {
      const success = await GeneratedLabelStorageService.setGeneratedLabelRestocking(label.id, true);
      if (success) {
        const latest = await GeneratedLabelStorageService.getGeneratedLabels();
        setGeneratedLabels(latest);
        setSnackbar({
          open: true,
          message: 'Label moved to restocking',
          severity: 'success'
        });
      }
    } catch (err) {
      setSnackbar({
        open: true,
        message: 'Failed to move label to restocking',
        severity: 'error'
      });
    }
  };

  const handleDeleteGeneratedLabel = async (label: GeneratedLabel) => {
    if (window.confirm('Are you sure you want to permanently delete this label?')) {
      try {
        const success = await GeneratedLabelStorageService.deleteGeneratedLabel(label.id);
        if (success) {
          const latest = await GeneratedLabelStorageService.getGeneratedLabels();
          setGeneratedLabels(latest);
          setSnackbar({
            open: true,
            message: 'Label deleted',
            severity: 'success'
          });
        }
      } catch (err) {
        setSnackbar({
          open: true,
          message: 'Failed to delete label',
          severity: 'error'
        });
      }
    }
  };

  const handlePrintGeneratedLabel = async (label: GeneratedLabel) => {
    try {
      // Handle labels without PDF data by generating PDF on-the-fly
      if (!label.pdfBlob) {
        console.warn('PDF data not available for label:', label.id, 'Template:', label.templateName);
        console.log('Generating PDF on-the-fly for imported label...');
        
        try {
          // Fetch the template for this label
          const template = await LabelApiService.getTemplate(label.templateId);
          if (!template) {
            throw new Error(`Template not found: ${label.templateId}`);
          }
          
          // Generate PDF using the template and label data
          const pdfBytes = await LabelPdfGenerator.generateLabelPdf(template, label.labelData, 1);
          const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
          
          console.log('✅ PDF generated successfully, proceeding with print...');
          
          // Create a temporary label object with the generated PDF for printing
          const labelWithPdf = { ...label, pdfBlob };
          
          // Continue with printing using the temporary PDF data
          // Don't save to database, just print directly
          return handlePrintGeneratedLabel(labelWithPdf);
          
        } catch (error) {
          console.error('Failed to generate PDF for label:', error);
          setSnackbar({
            open: true,
            message: `Failed to generate PDF for this label. Please try creating a new label from the "${label.templateName}" template. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            severity: 'error'
          });
          return;
        }
      }

      // Check if custom copies is enabled
      const enableCustomCopies = localStorage.getItem('labelPrintEnableCustomCopies') === 'true';
      
      if (enableCustomCopies) {
        // Show copies dialog
        setPendingPrintLabel(label);
        setSelectedCopies(1);
        setShowCopiesDialog(true);
        return;
      }

      // Check if queue printing is enabled
      if ((labelPrintMethod === 'queue' || labelPrintMethod === 'queue-fallback') && labelPrinterId) {
        // Fetch template to get paper size information
        let template: LabelTemplate | null = null;
        try {
          template = await LabelApiService.getTemplate(label.templateId);
        } catch (error) {
          console.warn('Could not fetch template for paper size:', error);
        }

        // Convert PDF blob to base64 for transmission
        const reader = new FileReader();
        const pdfBase64 = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => {
            const result = reader.result as string;
            // Remove data URL prefix to get just the base64 data
            const base64Data = result.split(',')[1];
            resolve(base64Data);
          };
          reader.onerror = reject;
          reader.readAsDataURL(label.pdfBlob!);
        });

        // Prepare job data with PDF content
        const labelPrintData = {
          type: 'pdf-print',
          pdfData: pdfBase64,
          filename: `label-${label.templateName}-${Date.now()}.pdf`,
          printerId: labelPrinterId,
          paperSize: template?.paperSize || 'Unknown',
          autoCut: labelAutoCut,
          templateInfo: {
            templateId: label.templateId,
            templateName: label.templateName,
            paperSize: template?.paperSize || 'Unknown',
            customWidth: template?.customWidth,
            customHeight: template?.customHeight,
            customUnit: template?.customUnit
          },
          labelInfo: {
            templateName: label.templateName,
            labelData: label.labelData,
            createdBy: label.createdBy,
            createdDate: label.createdDate
          },
          metadata: {
            documentType: 'generated-label',
            generated: new Date().toISOString(),
            source: 'labels-page',
            orientation: labelPrintOrientation,
            autoCut: labelAutoCut
          }
        };

        const attemptQueuePrint = async (retryCount = 0): Promise<void> => {
          const maxRetries = labelPrintMethod === 'queue-fallback' ? 3 : 1;
          
          try {
            console.log(`🖨️ Submitting label PDF to print queue (attempt ${retryCount + 1}/${maxRetries})...`);
            const job = await PrintApiService.submitPrintJob({
              formName: 'labels',
              jobData: labelPrintData,
              options: {
                priority: 'normal',
                copies: 1
              }
            });

            console.log('✅ Label print job queued successfully:', job.id);
            
            // Record the print and update UI
            await GeneratedLabelStorageService.recordPrint(label.id);
            const latestAfterQueue = await GeneratedLabelStorageService.getGeneratedLabels();
            setGeneratedLabels(latestAfterQueue);
            setSnackbar({
              open: true,
              message: `Label PDF queued for printing! Job ID: ${job.id.slice(0, 8)}...`,
              severity: 'success'
            });
            
          } catch (printError) {
            console.error(`Label print queue attempt ${retryCount + 1} failed:`, printError);
            
            if (retryCount < maxRetries - 1) {
              // Retry after a short delay
              setTimeout(() => {
                attemptQueuePrint(retryCount + 1);
              }, 2000);
              
              setSnackbar({
                open: true,
                message: `Print queue attempt ${retryCount + 1} failed. Retrying... (${maxRetries - retryCount - 1} attempts remaining)`,
                severity: 'error'
              });
            } else {
              // All retries exhausted
              if (labelPrintMethod === 'queue-fallback') {
                // Fallback to PDF for queue-fallback mode
                console.log('🔄 All print queue attempts failed. Opening PDF for manual printing...');
                const blobUrl = URL.createObjectURL(label.pdfBlob!);
                window.open(blobUrl, '_blank');
                
                await GeneratedLabelStorageService.recordPrint(label.id);
                const latestAfterFallback = await GeneratedLabelStorageService.getGeneratedLabels();
                setGeneratedLabels(latestAfterFallback);
                setSnackbar({
                  open: true,
                  message: 'Print queue failed. PDF opened for manual printing.',
                  severity: 'info'
                });
              } else {
                setSnackbar({
                  open: true,
                  message: 'Failed to queue label PDF for printing',
                  severity: 'error'
                });
              }
            }
          }
        };

        await attemptQueuePrint();
      } else {
        // Use PDF method - open in new tab
        const blobUrl = URL.createObjectURL(label.pdfBlob);
        window.open(blobUrl, '_blank');
        
        await GeneratedLabelStorageService.recordPrint(label.id);
        const latest = await GeneratedLabelStorageService.getGeneratedLabels();
        setGeneratedLabels(latest);
        setSnackbar({
          open: true,
          message: 'PDF opened in new tab successfully!',
          severity: 'success'
        });
      }
    } catch (err) {
      console.error('Error printing label:', err);
      setSnackbar({
        open: true,
        message: labelPrintMethod === 'queue' ? 'Failed to queue label PDF for printing' : 'Failed to generate PDF',
        severity: 'error'
      });
    }
  };

  // Handle copies dialog confirmation for generated labels
  const handleCopiesConfirm = async (copies: number) => {
    if (!pendingPrintLabel || !pendingPrintLabel.pdfBlob) return;

    try {
      // Get current print settings from localStorage
      const printMethod = (localStorage.getItem('labelPrintMethod') as 'pdf' | 'queue' | 'queue-fallback') || 'pdf';
      const printerId = localStorage.getItem('labelPrinterId') || '';
      const orientation = (localStorage.getItem('labelPrintOrientation') as 'portrait' | 'landscape') || 'portrait';

      // Check if queue printing is enabled
      if ((printMethod === 'queue' || printMethod === 'queue-fallback') && printerId) {
        // Convert PDF blob to base64 for transmission
        const reader = new FileReader();
        const pdfBase64 = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => {
            const result = reader.result as string;
            // Remove data URL prefix to get just the base64 data
            const base64Data = result.split(',')[1];
            resolve(base64Data);
          };
          reader.onerror = reject;
          reader.readAsDataURL(pendingPrintLabel.pdfBlob!);
        });

        // Prepare job data with PDF content
        const labelPrintData = {
          type: 'pdf-print',
          pdfData: pdfBase64,
          filename: `label-${pendingPrintLabel.templateName}-${Date.now()}.pdf`,
          printerId: printerId,
          labelInfo: {
            templateName: pendingPrintLabel.templateName,
            labelData: pendingPrintLabel.labelData,
            createdBy: pendingPrintLabel.createdBy,
            createdDate: pendingPrintLabel.createdDate
          },
          metadata: {
            documentType: 'generated-label',
            generated: new Date().toISOString(),
            source: 'labels-page-with-copies',
            orientation: orientation
          }
        };

        const attemptQueuePrint = async (retryCount = 0): Promise<void> => {
          const maxRetries = printMethod === 'queue-fallback' ? 3 : 1;
          
          try {
            console.log(`🖨️ Submitting label PDF to print queue with ${copies} copies (attempt ${retryCount + 1}/${maxRetries})...`);
            const job = await PrintApiService.submitPrintJob({
              formName: 'labels',
              jobData: labelPrintData,
              options: {
                priority: 'normal',
                copies: copies
              }
            });

            console.log('✅ Label print job queued successfully:', job.id);
            
            // Record the print and update UI
            await GeneratedLabelStorageService.recordPrint(pendingPrintLabel.id);
            const latestAfterQueue = await GeneratedLabelStorageService.getGeneratedLabels();
            setGeneratedLabels(latestAfterQueue);
            setSnackbar({
              open: true,
              message: `Label PDF queued for printing with ${copies} copies! Job ID: ${job.id.slice(0, 8)}...`,
              severity: 'success'
            });
            
          } catch (printError) {
            console.error(`Label print queue attempt ${retryCount + 1} failed:`, printError);
            
            if (retryCount < maxRetries - 1) {
              // Retry after a short delay
              setTimeout(() => {
                attemptQueuePrint(retryCount + 1);
              }, 2000);
              
              setSnackbar({
                open: true,
                message: `Print queue attempt ${retryCount + 1} failed. Retrying... (${maxRetries - retryCount - 1} attempts remaining)`,
                severity: 'error'
              });
            } else {
              // All retries exhausted
              if (printMethod === 'queue-fallback') {
                // Fallback to PDF for queue-fallback mode
                console.log('🔄 All print queue attempts failed. Opening PDF for manual printing...');
                const blobUrl = URL.createObjectURL(pendingPrintLabel.pdfBlob!);
                window.open(blobUrl, '_blank');
                
                await GeneratedLabelStorageService.recordPrint(pendingPrintLabel.id);
                const latestAfterFallback = await GeneratedLabelStorageService.getGeneratedLabels();
                setGeneratedLabels(latestAfterFallback);
                setSnackbar({
                  open: true,
                  message: `Print queue failed after ${maxRetries} attempts. PDF opened for manual printing.`,
                  severity: 'info'
                });
              } else {
                // For regular queue mode, just show error
                setSnackbar({
                  open: true,
                  message: `Failed to queue label for printing after ${maxRetries} attempts. Please try again or use manual printing.`,
                  severity: 'error'
                });
              }
            }
          }
        };

        // Start the print queue attempt process
        await attemptQueuePrint();
        
      } else {
        // Use PDF method - open in new tab
        console.log('📄 Opening label PDF in new tab...');
        const blobUrl = URL.createObjectURL(pendingPrintLabel.pdfBlob);
        window.open(blobUrl, '_blank');
        
        await GeneratedLabelStorageService.recordPrint(pendingPrintLabel.id);
        const latest = await GeneratedLabelStorageService.getGeneratedLabels();
        setGeneratedLabels(latest);
        setSnackbar({
          open: true,
          message: 'PDF opened in new tab successfully!',
          severity: 'success'
        });
      }
    } catch (err) {
      console.error('Error printing label with copies:', err);
      setSnackbar({
        open: true,
        message: 'Failed to print label with copies',
        severity: 'error'
      });
    } finally {
      // Close dialog and reset state
      setShowCopiesDialog(false);
      setPendingPrintLabel(null);
      setSelectedCopies(1);
    }
  };

  // Label Template Actions
  const handleMarkAsRestocking = async (template: LabelTemplate) => {
    try {
      await LabelApiService.updateTemplate(template.id, {
        is_active: true,
        category: 'restocking'
      });
      await loadData();
      setSnackbar({
        open: true,
        message: 'Template marked as restocking',
        severity: 'success'
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: 'Failed to mark template as restocking',
        severity: 'error'
      });
    }
  };

  const handleMoveToRestocking = async (template: LabelTemplate) => {
    try {
      await LabelApiService.updateTemplate(template.id, {
        archived: false,
        is_active: true,
        category: 'restocking'
      });
      await loadData();
      setSnackbar({
        open: true,
        message: 'Template moved to restocking labels',
        severity: 'success'
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: 'Failed to move template to restocking',
        severity: 'error'
      });
    }
  };

  const handlePrintLabel = async (template: LabelTemplate) => {
    try {
      const sampleData = {
        'Label Name': template.labelName,
        'Created By': template.createdBy,
        'Created Date': format(new Date(template.createdDate), 'MMM dd, yyyy'),
        'Invoice #': 'INV-001',
        'Tire Size': '205/55R16',
        'Part Number': 'PART-123',
        'Vendor': 'Vendor Name',
        'Bin/Location': 'A1-B2-C3',
        'Copies to be Printed': template.copies.toString()
      };
      
      const pdfBytes = await LabelPdfGenerator.generateLabelPdf(template, sampleData, template.copies);
      LabelPdfGenerator.openPdfInNewTab(pdfBytes);
    } catch (err) {
      setSnackbar({
        open: true,
        message: 'Failed to print label',
        severity: 'error'
      });
    }
  };

  const handleArchiveTemplate = async (template: LabelTemplate) => {
    try {
      await LabelApiService.archiveTemplate(template.id);
      await loadData();
      setSnackbar({
        open: true,
        message: 'Template archived',
        severity: 'success'
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: 'Failed to archive template',
        severity: 'error'
      });
    }
  };

  const handleRestoreTemplate = async (template: LabelTemplate) => {
    try {
      await LabelApiService.restoreTemplate(template.id);
      await loadData();
      setSnackbar({
        open: true,
        message: 'Template restored',
        severity: 'success'
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: 'Failed to restore template',
        severity: 'error'
      });
    }
  };

  const handleDeleteTemplate = async (template: LabelTemplate) => {
    if (window.confirm('Are you sure you want to permanently delete this template?')) {
      try {
        await LabelApiService.deleteTemplate(template.id);
        await loadData();
        setSnackbar({
          open: true,
          message: 'Template deleted',
          severity: 'success'
        });
      } catch (err) {
        setSnackbar({
          open: true,
          message: 'Failed to delete template',
          severity: 'error'
        });
      }
    }
  };

  // Sticker Actions
  const handlePrintSticker = async (sticker: StaticSticker) => {
    try {
      const settings = StickerStorageService.getSettings();
      
      // Apply orientation setting to paper size
      const orientedSettings = {
        ...settings,
        paperSize: {
          ...settings.paperSize,
          width: stickerPrintOrientation === 'landscape' ? 
            Math.max(settings.paperSize.width, settings.paperSize.height) :
            Math.min(settings.paperSize.width, settings.paperSize.height),
          height: stickerPrintOrientation === 'landscape' ? 
            Math.min(settings.paperSize.width, settings.paperSize.height) :
            Math.max(settings.paperSize.width, settings.paperSize.height)
        }
      };
      
      // Check if queue printing is enabled
      if (stickerPrintMethod === 'queue' && stickerPrinterId) {
        // Generate PDF first, then send to print queue
        console.log('🖨️ Generating PDF for print queue...');
        console.log('🔄 Using orientation:', stickerPrintOrientation);
        
        // Generate the PDF blob
        const pdfBlob = await PDFGeneratorService.generateStickerPDFBlob(sticker, orientedSettings);
        
        // Convert PDF blob to base64 for transmission
        const reader = new FileReader();
        const pdfBase64 = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => {
            const result = reader.result as string;
            // Remove data URL prefix to get just the base64 data
            const base64Data = result.split(',')[1];
            resolve(base64Data);
          };
          reader.onerror = reject;
          reader.readAsDataURL(pdfBlob);
        });

        // Prepare job data with PDF content
        const stickerPrintData = {
          type: 'pdf-print',
          pdfData: pdfBase64,
          filename: `sticker-${sticker.vin}-${Date.now()}.pdf`,
          printerId: stickerPrinterId,
          stickerInfo: {
            vin: sticker.vin,
            vehicleDetails: sticker.decodedDetails,
            oilType: sticker.oilType?.name,
            mileage: sticker.mileage,
            nextServiceDate: sticker.date,
            companyName: sticker.companyName
          },
          metadata: {
            documentType: 'oil-change-sticker',
            generated: new Date().toISOString(),
            source: 'labels-page'
          }
        };

        console.log('🚀 Submitting PDF print job to queue...');
        const job = await PrintApiService.submitPrintJob({
          formName: 'stickers',
          jobData: stickerPrintData,
          options: {
            priority: 'normal',
            copies: 1
          }
        });

        console.log('✅ Print job queued successfully:', job.id);
        StickerStorageService.saveSticker({ ...sticker, printed: true });
        setStickers(StickerStorageService.getAllStickers());
        setSnackbar({
          open: true,
          message: `Sticker PDF queued for printing! Job ID: ${job.id.slice(0, 8)}...`,
          severity: 'success'
        });
      } else {
        // Use PDF method - open in new tab
        console.log('📄 Opening PDF in new tab...');
        console.log('🔄 Using orientation:', stickerPrintOrientation);
        await PDFGeneratorService.openStickerPDF(sticker, orientedSettings);
        
        StickerStorageService.saveSticker({ ...sticker, printed: true });
        setStickers(StickerStorageService.getAllStickers());
        setSnackbar({
          open: true,
          message: 'PDF opened in new tab successfully!',
          severity: 'success'
        });
      }
    } catch (error) {
      console.error('Error printing sticker:', error);
      setSnackbar({
        open: true,
        message: stickerPrintMethod === 'queue' ? 'Failed to queue sticker PDF for printing' : 'Failed to generate PDF',
        severity: 'error'
      });
    }
  };

  const handleToggleStickerArchive = async (sticker: StaticSticker) => {
    try {
      if (sticker.archived) {
        await StickerStorageService.restoreSticker(sticker.id);
      } else {
        await StickerStorageService.archiveSticker(sticker.id);
      }
      setStickers(StickerStorageService.getAllStickers());
      setSnackbar({
        open: true,
        message: sticker.archived ? 'Sticker restored' : 'Sticker archived',
        severity: 'success'
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: 'Failed to update sticker status',
        severity: 'error'
      });
    }
  };

  // Filter functions - Updated to only show generated labels in restocking
  const getActiveLabelTemplates = () => {
    return labelTemplates.filter(template => {
      if (!(template.archived !== true)) return false;
      
      // Apply search filter
      if (templatesSearchTerm === '') return true;
      
      const searchLower = templatesSearchTerm.toLowerCase();
      
      // Search through template fields
      return (
        template.name?.toLowerCase().includes(searchLower) ||
        template.id?.toLowerCase().includes(searchLower) ||
        template.description?.toLowerCase().includes(searchLower) ||
        template.category?.toLowerCase().includes(searchLower)
      );
    });
  };

  const getArchivedLabelTemplates = () => {
    return labelTemplates.filter(template => {
      if (!(template.archived === true)) return false;
      
      // Apply search filter for archived templates (if needed later)
      if (templatesSearchTerm === '') return true;
      
      const searchLower = templatesSearchTerm.toLowerCase();
      
      // Search through template fields
      return (
        template.name?.toLowerCase().includes(searchLower) ||
        template.id?.toLowerCase().includes(searchLower) ||
        template.description?.toLowerCase().includes(searchLower) ||
        template.category?.toLowerCase().includes(searchLower)
      );
    });
  };

  const getRestockingLabels = () => {
    // Only get restocking generated labels (labels moved to restocking)
    return generatedLabels.filter(label => {
      if (!(label.restocking === true && !label.archived)) return false;
      
      // Apply search filter
      if (restockingSearchTerm === '') return true;
      
      const searchLower = restockingSearchTerm.toLowerCase();
      const labelData = label.labelData || {};
      
      // Search through various fields
      return (
        label.templateName?.toLowerCase().includes(searchLower) ||
        label.templateId?.toLowerCase().includes(searchLower) ||
        labelData['Part Number']?.toLowerCase().includes(searchLower) ||
        labelData.partNumber?.toLowerCase().includes(searchLower) ||
        labelData['Tire Size']?.toLowerCase().includes(searchLower) ||
        labelData.tireSize?.toLowerCase().includes(searchLower) ||
        labelData['Vendor']?.toLowerCase().includes(searchLower) ||
        labelData.vendor?.toLowerCase().includes(searchLower) ||
        labelData['Bin/Location']?.toLowerCase().includes(searchLower) ||
        labelData.binLocation?.toLowerCase().includes(searchLower) ||
        labelData.labelType?.toLowerCase().includes(searchLower)
      );
    });
  };

  const getActiveGeneratedLabels = () => {
    return generatedLabels.filter(label => !label.archived && !label.restocking);
  };

  const getArchivedGeneratedLabels = () => {
    return generatedLabels.filter(label => {
      if (!(label.archived === true)) return false;
      
      // Apply search filter
      if (archivedLabelsSearchTerm === '') return true;
      
      const searchLower = archivedLabelsSearchTerm.toLowerCase();
      const labelData = label.labelData || {};
      
      // Search through various fields
      return (
        label.templateName?.toLowerCase().includes(searchLower) ||
        label.templateId?.toLowerCase().includes(searchLower) ||
        label.createdBy?.toLowerCase().includes(searchLower) ||
        labelData['Part Number']?.toLowerCase().includes(searchLower) ||
        labelData.partNumber?.toLowerCase().includes(searchLower) ||
        labelData['Tire Size']?.toLowerCase().includes(searchLower) ||
        labelData.tireSize?.toLowerCase().includes(searchLower) ||
        labelData['Vendor']?.toLowerCase().includes(searchLower) ||
        labelData.vendor?.toLowerCase().includes(searchLower) ||
        labelData['Bin/Location']?.toLowerCase().includes(searchLower) ||
        labelData.binLocation?.toLowerCase().includes(searchLower) ||
        labelData.labelType?.toLowerCase().includes(searchLower)
      );
    });
  };

  const getArchivedStickers = () => {
    return stickers.filter(sticker => {
      const matchesSearch = searchTerm === '' || 
        sticker.vin.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sticker.decodedDetails.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sticker.decodedDetails.model?.toLowerCase().includes(searchTerm.toLowerCase());
      return sticker.archived && matchesSearch;
    });
  };

  const getActiveStickersCount = () => {
    return stickers.filter(sticker => !sticker.archived).length;
  };

  const getArchivedStickersCount = () => {
    return stickers.filter(sticker => sticker.archived).length;
  };

  const getActiveTemplatesCount = () => {
    return getActiveLabelTemplates().length;
  };

  const getArchivedTemplatesCount = () => {
    return getArchivedLabelTemplates().length;
  };

  const getRestockingLabelsCount = () => {
    return getRestockingLabels().length;
  };

  const getActiveGeneratedLabelsCount = () => {
    return getActiveGeneratedLabels().length;
  };

  const getArchivedGeneratedLabelsCount = () => {
    return getArchivedGeneratedLabels().length;
  };

  const getOilTypes = (): OilType[] => {
    return StickerStorageService.getOilTypes();
  };

  // Remove from restocking
  const handleRemoveFromRestocking = async (label: GeneratedLabel) => {
    try {
      const success = await GeneratedLabelStorageService.updateGeneratedLabel(label.id, {
        restocking: false,
        restockingDate: undefined
      });
      if (success) {
        const latest = await GeneratedLabelStorageService.getGeneratedLabels();
        setGeneratedLabels(latest);
        setSnackbar({
          open: true,
          message: 'Label removed from restocking',
          severity: 'success'
        });
      }
    } catch (err) {
      setSnackbar({
        open: true,
        message: 'Failed to remove label from restocking',
        severity: 'error'
      });
    }
  };

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
            Labels & Stickers
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <PrintQueueBadge />
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadData}
              disabled={loading}
            >
              REFRESH
            </Button>
          </Box>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Scrollable Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Box sx={{ 
          overflowX: 'auto', 
          '&::-webkit-scrollbar': {
            height: '6px'
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: '#f1f1f1',
            borderRadius: '3px'
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#c1c1c1',
            borderRadius: '3px',
            '&:hover': {
              backgroundColor: '#a8a8a8'
            }
          }
        }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              minWidth: 'fit-content',
              '& .MuiTab-root': {
                minWidth: 'auto',
                px: 2,
                py: 1.5
              }
            }}
          >
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <StickerIcon />
                  <Typography variant="body2">STATIC STICKERS</Typography>
                  <Badge badgeContent={getArchivedStickersCount()} color="primary" />
                </Box>
              }
              iconPosition="start"
            />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ViewInArIcon />
                  <Typography variant="body2">RESTOCKING LABELS</Typography>
                  <Badge badgeContent={getRestockingLabelsCount()} color="secondary" />
                </Box>
              }
              iconPosition="start"
            />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ArchiveIcon />
                  <Typography variant="body2">ARCHIVED LABELS</Typography>
                  <Badge badgeContent={getArchivedGeneratedLabelsCount()} color="default" />
                </Box>
              }
              iconPosition="start"
            />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LabelIcon />
                  <Typography variant="body2">LABEL TEMPLATES</Typography>
                  <Badge badgeContent={getActiveTemplatesCount()} color="primary" />
                </Box>
              }
              iconPosition="start"
            />
          </Tabs>
        </Box>
      </Box>

      {/* Tab Panels */}
      {/* Static Stickers Tab - Updated with tighter spacing */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ mb: 2 }}> {/* Reduced margin bottom */}
          <Typography variant="h6" gutterBottom>
            Archived Static Stickers
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}> {/* Reduced margin */}
            Archived oil change stickers. Click on any card to view details and preview.
          </Typography>
          <Grid container spacing={1} alignItems="center" sx={{ mb: 1.5 }}> {/* Reduced spacing and margin */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Search stickers by VIN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
          </Grid>
          
          {loading ? (
            <Box display="flex" justifyContent="center" p={2}> {/* Reduced padding */}
              <CircularProgress />
            </Box>
          ) : getArchivedStickers().length === 0 ? (
            <Alert severity="info">No archived stickers found.</Alert>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}> {/* Reduced gap between cards */}
              {getArchivedStickers().map((sticker) => (
                <StickerCard
                  key={sticker.id}
                  sticker={sticker}
                  onClick={() => handleRowClick(sticker)}
                  onPrint={() => handlePrintSticker(sticker)}
                  onToggleArchive={() => handleToggleStickerArchive(sticker)}
                  onEdit={() => handleEditSticker(sticker)}
                  showEditButton={true}
                  variant="compact"
                />
              ))}
            </Box>
          )}
        </Box>
      </TabPanel>

      {/* Restocking Labels Tab - Updated to only show generated labels */}
      <TabPanel value={tabValue} index={1}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Restocking Labels
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Generated labels moved to restocking for easy reprinting. Click on any row to view details.
          </Typography>
          
          {/* Search field for restocking labels */}
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              placeholder="Search by part number, tire size, vendor, bin location, or label type..."
              value={restockingSearchTerm}
              onChange={(e) => setRestockingSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              size="small"
            />
          </Box>
          
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Part Number</TableCell>
                  <TableCell>Tire Size</TableCell>
                  <TableCell>Vendor</TableCell>
                  <TableCell>Bin/Location</TableCell>
                  <TableCell>Label Type</TableCell>
                  <TableCell>Created Date</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {getRestockingLabels().length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No restocking labels found. Move archived labels to restocking to see them here.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  getRestockingLabels().map((label) => {
                    // Extract data from label.labelData
                    const labelData = label.labelData || {};
                    const partNumber = labelData['Part Number'] || labelData.partNumber || 'N/A';
                    const tireSize = labelData['Tire Size'] || labelData.tireSize || 'N/A';
                    const vendor = labelData['Vendor'] || labelData.vendor || 'N/A';
                    const binLocation = labelData['Bin/Location'] || labelData.binLocation || 'N/A';
                    const labelType = labelData.labelType || 'N/A';

                    return (
                      <TableRow 
                        key={label.id}
                        hover
                        onClick={() => handleRowClick(label)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>{partNumber}</TableCell>
                        <TableCell>
                          <Chip size="small" label={tireSize} variant="outlined" />
                        </TableCell>
                        <TableCell>{vendor}</TableCell>
                        <TableCell>{binLocation}</TableCell>
                        <TableCell>
                          <Chip size="small" label={labelType} color="primary" variant="outlined" />
                        </TableCell>
                        <TableCell>
                          {format(new Date(label.createdDate), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                        <Tooltip title="Print Label">
                          <IconButton
                            size="small"
                            onClick={() => handlePrintGeneratedLabel(label)}
                          >
                            <PrintIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Remove from Restocking">
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveFromRestocking(label)}
                          >
                            <FilterIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </TabPanel>

      {/* Archived Generated Labels Tab - Updated with Move to Restocking button */}
      <TabPanel value={tabValue} index={2}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Archived Generated Labels
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Labels that have been archived. Click on any row to view details.
          </Typography>
          
          {/* Search field for archived labels */}
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              placeholder="Search by template name, creator, part number, or label content..."
              value={archivedLabelsSearchTerm}
              onChange={(e) => setArchivedLabelsSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              size="small"
            />
          </Box>
          
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Template Name</TableCell>
                  <TableCell>Created By</TableCell>
                  <TableCell>Created Date</TableCell>
                  <TableCell>Print Count</TableCell>
                  <TableCell>Archived Date</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {getArchivedGeneratedLabels().length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No archived labels found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  getArchivedGeneratedLabels().map((label) => (
                    <TableRow 
                      key={label.id}
                      hover
                      onClick={() => handleRowClick(label)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>{label.templateName}</TableCell>
                      <TableCell>{label.createdBy}</TableCell>
                      <TableCell>
                        {format(new Date(label.createdDate), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>{label.printCount}</TableCell>
                      <TableCell>
                        {label.archivedDate ? format(new Date(label.archivedDate), 'MMM dd, yyyy') : 'N/A'}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Tooltip title="Move to Restocking">
                          <IconButton
                            size="small"
                            onClick={() => handleMoveGeneratedLabelToRestocking(label)}
                          >
                            <AddIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Print Label">
                          <IconButton
                            size="small"
                            onClick={() => handlePrintGeneratedLabel(label)}
                          >
                            <PrintIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Restore Label">
                          <IconButton
                            size="small"
                            onClick={() => handleRestoreGeneratedLabel(label)}
                          >
                            <RestoreIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Permanently Delete">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteGeneratedLabel(label)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </TabPanel>

      {/* Label Templates Tab */}
      <TabPanel value={tabValue} index={3}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Active Label Templates
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Click on any row to view details and preview
          </Typography>
          
          {/* Search field for templates */}
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              placeholder="Search by template name, category, or description..."
              value={templatesSearchTerm}
              onChange={(e) => setTemplatesSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              size="small"
            />
          </Box>
          
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Template Name</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Version</TableCell>
                  <TableCell>Created By</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created At</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {getActiveLabelTemplates().length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No active label templates found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  getActiveLabelTemplates().map((template) => (
                    <TableRow 
                      key={template.id}
                      hover
                      onClick={() => handleRowClick(template)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>{template.labelName}</TableCell>
                      <TableCell>
                        <Chip 
                          label={template.category || 'General'} 
                          size="small" 
                          color={template.category === 'restocking' ? 'primary' : 'default'}
                        />
                      </TableCell>
                      <TableCell>{template.version || '1.0'}</TableCell>
                      <TableCell>{template.createdBy}</TableCell>
                      <TableCell>
                        <Chip 
                          label={template.is_active ? 'Active' : 'Inactive'} 
                          size="small" 
                          color={template.is_active ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        {template.createdDate ? format(new Date(template.createdDate), 'MMM dd, yyyy') : 'N/A'}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Tooltip title="Mark as Restocking Label">
                          <IconButton
                            size="small"
                            onClick={() => handleMarkAsRestocking(template)}
                            disabled={template.category === 'restocking'}
                          >
                            <FilterIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Print Label">
                          <IconButton
                            size="small"
                            onClick={() => handlePrintLabel(template)}
                          >
                            <PrintIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Archive Template">
                          <IconButton
                            size="small"
                            onClick={() => handleArchiveTemplate(template)}
                          >
                            <ArchiveIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </TabPanel>

      {/* Detail Dialog */}
      <Dialog 
        open={detailDialogOpen} 
        onClose={handleCloseDetail}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              {selectedItem && 'labelName' in selectedItem 
                ? `Label Template: ${selectedItem.labelName}`
                : selectedItem && 'templateId' in selectedItem
                ? `Generated Label: ${selectedItem.templateName}`
                : 'Static Sticker Details'
              }
            </Typography>
            <Box>
              {selectedItem && 'vin' in selectedItem && (
                <>
                  {isEditing ? (
                    <>
                      <IconButton onClick={handleSave} color="primary">
                        <SaveIcon />
                      </IconButton>
                      <IconButton onClick={handleCancel}>
                        <CancelIcon />
                      </IconButton>
                    </>
                  ) : (
                    <IconButton onClick={handleEdit}>
                      <EditIcon />
                    </IconButton>
                  )}
                </>
              )}
              <IconButton onClick={handleCloseDetail}>
                <CancelIcon />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedItem && (
            <Grid container spacing={3}>
              {/* Details Section */}
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Details
                </Typography>
                {selectedItem && 'labelName' in selectedItem ? (
                  // Label Template Details
                  <Box>
                    <Typography variant="body2" gutterBottom>
                      <strong>Name:</strong> {selectedItem.labelName}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Category:</strong> {selectedItem.category || 'General'}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Version:</strong> {selectedItem.version || '1.0'}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Created By:</strong> {selectedItem.createdBy}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Created Date:</strong> {format(new Date(selectedItem.createdDate), 'MMM dd, yyyy')}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Paper Size:</strong> {selectedItem.paperSize}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Copies:</strong> {selectedItem.copies}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Status:</strong> 
                      <Chip 
                        label={selectedItem.is_active ? 'Active' : 'Inactive'} 
                        size="small" 
                        color={selectedItem.is_active ? 'success' : 'default'}
                        sx={{ ml: 1 }}
                      />
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Archived:</strong> 
                      <Chip 
                        label={selectedItem.archived ? 'Yes' : 'No'} 
                        size="small" 
                        color={selectedItem.archived ? 'default' : 'success'}
                        sx={{ ml: 1 }}
                      />
                    </Typography>
                  </Box>
                ) : selectedItem && 'templateId' in selectedItem ? (
                  // Generated Label Details
                  <Box>
                    <Typography variant="body2" gutterBottom>
                      <strong>Template:</strong> {selectedItem.templateName}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Created By:</strong> {selectedItem.createdBy}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Created Date:</strong> {format(new Date(selectedItem.createdDate), 'MMM dd, yyyy')}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Print Count:</strong> {selectedItem.printCount}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Last Printed:</strong> {selectedItem.lastPrintedDate ? format(new Date(selectedItem.lastPrintedDate), 'MMM dd, yyyy') : 'Never'}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Status:</strong> 
                      <Chip 
                        label={selectedItem.archived ? 'Archived' : 'Active'} 
                        size="small" 
                        color={selectedItem.archived ? 'default' : 'success'}
                        sx={{ ml: 1 }}
                      />
                    </Typography>
                    {selectedItem.archived && (
                      <>
                        <Typography variant="body2" gutterBottom>
                          <strong>Archived By:</strong> {selectedItem.archivedBy || 'Unknown'}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Archived Date:</strong> {selectedItem.archivedDate ? format(new Date(selectedItem.archivedDate), 'MMM dd, yyyy') : 'N/A'}
                        </Typography>
                      </>
                    )}
                  </Box>
                ) : (
                  // Static Sticker Details
                  <Box>
                    {isEditing ? (
                      // Edit Form
                      <Box>
                        <TextField
                          fullWidth
                          label="VIN"
                          value={editingSticker.vin || ''}
                          onChange={(e) => setEditingSticker({...editingSticker, vin: e.target.value})}
                          margin="normal"
                        />
                        <TextField
                          fullWidth
                          label="Mileage"
                          type="number"
                          value={editingSticker.mileage || ''}
                          onChange={(e) => setEditingSticker({...editingSticker, mileage: parseInt(e.target.value) || 0})}
                          margin="normal"
                        />
                        <FormControl fullWidth margin="normal">
                          <InputLabel>Oil Type</InputLabel>
                          <Select
                            value={editingSticker.oilType?.id || ''}
                            onChange={(e: SelectChangeEvent) => {
                              const oilType = getOilTypes().find(ot => ot.id === e.target.value);
                              setEditingSticker({...editingSticker, oilType: oilType || selectedItem.oilType});
                            }}
                          >
                            {getOilTypes().map((oilType) => (
                              <MenuItem key={oilType.id} value={oilType.id}>
                                {oilType.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <TextField
                          fullWidth
                          label="Service Date"
                          type="date"
                          value={editingSticker.date || ''}
                          onChange={(e) => setEditingSticker({...editingSticker, date: e.target.value})}
                          margin="normal"
                          InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                          fullWidth
                          label="Company Name"
                          value={editingSticker.companyName || ''}
                          onChange={(e) => setEditingSticker({...editingSticker, companyName: e.target.value})}
                          margin="normal"
                        />
                        <TextField
                          fullWidth
                          label="Address"
                          value={editingSticker.address || ''}
                          onChange={(e) => setEditingSticker({...editingSticker, address: e.target.value})}
                          margin="normal"
                        />
                      </Box>
                    ) : (
                      // Display Details
                      <Box>
                        <Typography variant="body2" gutterBottom>
                          <strong>VIN:</strong> {selectedItem.vin}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Vehicle:</strong> {selectedItem.decodedDetails.make} {selectedItem.decodedDetails.model}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Service Date:</strong> {format(new Date(selectedItem.date), 'MMM dd, yyyy')}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Mileage:</strong> {selectedItem.mileage.toLocaleString()}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Oil Type:</strong> {selectedItem.oilType.name}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Company:</strong> {selectedItem.companyName}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Address:</strong> {selectedItem.address}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          <strong>Status:</strong> 
                          <Chip 
                            label={selectedItem.archived ? 'Archived' : 'Active'} 
                            size="small" 
                            color={selectedItem.archived ? 'default' : 'success'}
                            sx={{ ml: 1 }}
                          />
                        </Typography>
                      </Box>
                    )}
                  </Box>
                )}
              </Grid>

              {/* PDF Preview Section */}
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  PDF Preview
                </Typography>
                {generatingPdf ? (
                  <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                    <CircularProgress />
                  </Box>
                ) : pdfPreviewUrl ? (
                  <Box
                    component="iframe"
                    src={pdfPreviewUrl}
                    sx={{
                      width: '100%',
                      height: '500px',
                      border: '1px solid #ddd',
                      borderRadius: 1
                    }}
                  />
                ) : (
                  <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                    <Typography variant="body2" color="text.secondary">
                      PDF preview not available
                    </Typography>
                  </Box>
                )}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          {selectedItem && 'vin' in selectedItem && (
            <Button
              onClick={() => handlePrintSticker(selectedItem)}
              startIcon={<PrintIcon />}
              variant="contained"
            >
              Print Sticker
            </Button>
          )}
          {selectedItem && 'labelName' in selectedItem && (
            <Button
              onClick={() => handlePrintLabel(selectedItem)}
              startIcon={<PrintIcon />}
              variant="contained"
            >
              Print Label
            </Button>
          )}
          {selectedItem && 'templateId' in selectedItem && (
            <Button
              onClick={() => handlePrintGeneratedLabel(selectedItem)}
              startIcon={<PrintIcon />}
              variant="contained"
            >
              Print Label
            </Button>
          )}
          <Button onClick={handleCloseDetail}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Copies Selection Dialog for Generated Labels */}
      <Dialog open={showCopiesDialog} onClose={() => setShowCopiesDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CopyIcon />
            <Typography variant="h6">Set Copies for {pendingPrintLabel?.templateName || 'Label'}</Typography>
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
                {selectedCopies}
              </Typography>
              <Typography variant="body2" align="center" color="text.secondary" gutterBottom>
                {selectedCopies === 1 ? 'copy' : 'copies'}
              </Typography>
              
              <Slider
                value={selectedCopies}
                onChange={(_, value) => setSelectedCopies(value as number)}
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
                  onClick={() => setSelectedCopies(num)}
                  color={selectedCopies === num ? 'primary' : 'default'}
                  variant={selectedCopies === num ? 'filled' : 'outlined'}
                  sx={{ cursor: 'pointer' }}
                />
              ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setShowCopiesDialog(false);
            setPendingPrintLabel(null);
            setSelectedCopies(1);
          }}>
            Cancel
          </Button>
          <Button onClick={() => handleCopiesConfirm(selectedCopies)} variant="contained">
            Print {selectedCopies} {selectedCopies === 1 ? 'Copy' : 'Copies'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Labels; 