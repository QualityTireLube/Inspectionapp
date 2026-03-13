import { useState, useEffect } from 'react';
import { usePrintStore } from '../stores/printStore';
import PrintApiService from '../services/printApi';
import { useNotification } from './useNotification';

interface PrintConfig {
  formName: string;
  isConfigured: boolean;
  printerName?: string;
  printerId?: string;
}

export function usePrintConfiguration() {
  const { configurations, getConfiguration } = usePrintStore();
  const { showNotification } = useNotification();
  const [printConfigs, setPrintConfigs] = useState<PrintConfig[]>([]);

  useEffect(() => {
    // Define all possible form types and their display names
    const formTypes = [
      { formName: 'labels', displayName: 'Labels' },
      { formName: 'stickers', displayName: 'Stickers' },
      { formName: 'receipts', displayName: 'Receipts' },
      { formName: 'reports', displayName: 'Reports' },
      { formName: 'invoices', displayName: 'Invoices' },
      { formName: 'inspection-forms', displayName: 'Inspection Forms' },
      { formName: 'test-print', displayName: 'Test Print' }
    ];

    const configs = formTypes.map(({ formName }) => {
      const config = getConfiguration(formName);
      return {
        formName,
        isConfigured: !!config,
        printerName: config ? `Printer: ${config.printerId}` : undefined,
        printerId: config?.printerId
      };
    });

    setPrintConfigs(configs);
  }, [configurations, getConfiguration]);

  // Check if a specific form type has printer configuration
  const isFormConfigured = (formName: string): boolean => {
    return !!getConfiguration(formName);
  };

  // Get printer configuration for a form
  const getFormConfiguration = (formName: string) => {
    return getConfiguration(formName);
  };

  // Print function for any configured form
  const printForForm = async (formName: string, data: any, options?: any) => {
    const config = getConfiguration(formName);
    
    if (!config) {
      showNotification(`No printer configured for ${formName}. Please configure a printer in Settings.`, 'warning');
      return false;
    }

    try {
      const printJob = {
        formName,
        jobData: {
          ...data,
          timestamp: new Date().toISOString(),
          formType: formName
        },
        options: {
          priority: 'normal',
          copies: 1,
          ...options
        }
      };

      const job = await PrintApiService.submitPrintJob(printJob);
      showNotification(`Print job submitted successfully for ${formName}`, 'success');
      return true;
    } catch (error) {
      console.error('Print job failed:', error);
      showNotification(`Failed to submit print job for ${formName}`, 'error');
      return false;
    }
  };

  return {
    printConfigs,
    isFormConfigured,
    getFormConfiguration,
    printForForm
  };
} 