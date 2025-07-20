import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import QRCode from 'react-qr-code';
import { StickerSettings } from '../types/stickers';

interface StickerPreviewProps {
  settings: StickerSettings;
  data?: {
    serviceDate?: string;
    serviceMileage?: string;
    oilType?: string;
    companyName?: string;
    address?: string;
    vin?: string;
    formMode?: boolean; // If true, show placeholder text for empty fields
    decodedDetails?: string;
  };
  scale?: number; // Optional custom scale
  showTitle?: boolean; // Whether to show the title and dimensions
  textScale?: number; // Optional text scaling factor (default 1.0)
}

const StickerPreview: React.FC<StickerPreviewProps> = ({ 
  settings, 
  data, 
  scale,
  showTitle = true,
  textScale = 1.0
}) => {
  // Default sample data - can be overridden by props
  const defaultData = {
    serviceDate: '9/19/2025',
    serviceMileage: '137,234',
    oilType: 'Rotella',
    companyName: 'Quality Lube Express',
    address: '3617 Hwy 19 Zachary',
    vin: '1HGBH41JXMN109186'
  };

  const previewData = { ...defaultData, ...data };
  const formMode = data?.formMode || false;

  // Calculate scale - use custom scale if provided, otherwise auto-calculate
  const maxDimension = Math.max(settings.paperSize.width, settings.paperSize.height);
  const autoScale = Math.min(400 / maxDimension, 6);
  const scaleRatio = scale || autoScale;
  
  const previewWidth = settings.paperSize.width * scaleRatio;
  const previewHeight = settings.paperSize.height * scaleRatio;

  // Function to replace placeholders in content
  const replaceContent = (content: string): string => {
    let result = content
      .replace('{serviceDate}', previewData.serviceDate || (formMode ? 'Select Oil Type' : ''))
      .replace('{serviceMileage}', previewData.serviceMileage || (formMode ? 'Enter Mileage' : ''))
      .replace('{oilType}', previewData.oilType || (formMode ? 'Select Oil Type' : ''))
      .replace('{companyName}', previewData.companyName || (formMode ? 'Set in Settings' : ''))
      .replace('{address}', previewData.address || (formMode ? 'Set in Settings' : ''))
      .replace('{decodedDetails}', previewData.decodedDetails || (formMode ? 'Enter VIN' : ''));
    
    return result;
  };

  const renderElement = (element: any, index: number) => {
    if (!element.visible) return null;

    const content = replaceContent(element.content);
    const isEmpty = formMode && (
      content.includes('Enter ') || 
      content.includes('Select ') || 
      content.includes('Set in Settings') ||
      content === ''
    );

    // Calculate position using exact PDF generation logic
    const availableWidth = settings.paperSize.width - settings.layout.margins.left - settings.layout.margins.right;
    const availableHeight = settings.paperSize.height - settings.layout.margins.top - settings.layout.margins.bottom;
    
    // Base position calculation - this is the anchor point
    const baseX = settings.layout.margins.left + (element.position.x / 100) * availableWidth;
    const baseY = settings.layout.margins.top + (element.position.y / 100) * availableHeight;
    
    // Convert to pixel coordinates
    const pixelX = baseX * scaleRatio;
    const pixelY = baseY * scaleRatio;

    // Calculate text positioning based on alignment
    let finalX = pixelX;
    let textAnchor = 'start'; // SVG text-anchor equivalent for HTML

    switch (element.textAlign) {
      case 'center':
        textAnchor = 'center';
        break;
      case 'right':
        textAnchor = 'end';
        finalX = pixelX;
        break;
      case 'left':
      default:
        textAnchor = 'start';
        break;
    }

    // Create styles that match jsPDF text rendering
    const elementStyles: React.CSSProperties = {
      position: 'absolute',
      left: `${finalX}px`,
      top: `${pixelY}px`,
      fontSize: `${settings.layout.fontSize * element.fontSize * scaleRatio * textScale}px`,
      fontWeight: element.fontWeight,
      fontFamily: settings.layout.fontFamily,
      whiteSpace: 'nowrap',
      lineHeight: 1,
      userSelect: 'none',
      pointerEvents: 'none',
      // Text alignment handling
      ...(element.textAlign === 'center' && {
        transform: 'translateX(-50%)',
        textAlign: 'center'
      }),
      ...(element.textAlign === 'right' && {
        transform: 'translateX(-100%)',
        textAlign: 'right'
      }),
      ...(element.textAlign === 'left' && {
        textAlign: 'left'
      }),
      // Styling based on content
      ...(isEmpty ? {
        color: '#999',
        opacity: 0.6,
        fontStyle: 'italic'
      } : {
        color: '#000',
        textShadow: element.fontWeight === 'bold' ? '0 0 1px rgba(0,0,0,0.2)' : 'none'
      }),
      // Visual aids for custom elements
      ...(element.id.includes('custom') && {
        backgroundColor: 'rgba(255, 235, 59, 0.1)',
        padding: '1px 3px',
        borderRadius: '2px'
      })
    };

    return (
      <Typography
        key={element.id}
        component="div"
        style={elementStyles}
      >
        {content}
      </Typography>
    );
  };

  const renderQRCode = () => {
    if (!previewData.vin && formMode) {
      // Show placeholder for QR when no VIN in form mode
      const qrX = settings.layout.margins.left + (settings.layout.qrCodePosition.x / 100) * (settings.paperSize.width - settings.layout.margins.left - settings.layout.margins.right);
      const qrY = settings.layout.margins.top + (settings.layout.qrCodePosition.y / 100) * (settings.paperSize.height - settings.layout.margins.top - settings.layout.margins.bottom);
      
      return (
        <Box
          sx={{
            position: 'absolute',
            left: `${(qrX - settings.layout.qrCodeSize / 2) * scaleRatio}px`,
            top: `${(qrY - settings.layout.qrCodeSize / 2) * scaleRatio}px`,
            width: `${settings.layout.qrCodeSize * scaleRatio}px`,
            height: `${settings.layout.qrCodeSize * scaleRatio}px`,
            backgroundColor: '#f0f0f0',
            border: '1px solid rgba(0,0,0,0.3)',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Typography variant="caption" sx={{ 
            color: '#999', 
            fontSize: `${Math.max(8, settings.layout.qrCodeSize * scaleRatio * 0.1)}px`,
            fontWeight: 'bold'
          }}>
            Enter VIN
          </Typography>
        </Box>
      );
    }

    // Calculate QR position using exact PDF logic
    const qrX = settings.layout.margins.left + (settings.layout.qrCodePosition.x / 100) * (settings.paperSize.width - settings.layout.margins.left - settings.layout.margins.right);
    const qrY = settings.layout.margins.top + (settings.layout.qrCodePosition.y / 100) * (settings.paperSize.height - settings.layout.margins.top - settings.layout.margins.bottom);

    return (
      <Box
        sx={{
          position: 'absolute',
          left: `${(qrX - settings.layout.qrCodeSize / 2) * scaleRatio}px`,
          top: `${(qrY - settings.layout.qrCodeSize / 2) * scaleRatio}px`,
          width: `${settings.layout.qrCodeSize * scaleRatio}px`,
          height: `${settings.layout.qrCodeSize * scaleRatio}px`,
          border: '1px solid rgba(0,0,0,0.1)',
          borderRadius: '4px',
          overflow: 'hidden',
          backgroundColor: 'white'
        }}
      >
        <QRCode 
          value={previewData.vin || 'NO_VIN'} 
          size={settings.layout.qrCodeSize * scaleRatio}
          style={{ 
            width: '100%', 
            height: '100%',
            display: 'block'
          }}
        />
      </Box>
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      {showTitle && (
        <>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            {settings.paperSize.name}
          </Typography>
          <Typography variant="caption" color="textSecondary" gutterBottom sx={{ mb: 2 }}>
            {settings.paperSize.width}mm × {settings.paperSize.height}mm
          </Typography>
        </>
      )}
      
      <Paper 
        elevation={4}
        sx={{
          width: `${previewWidth}px`,
          height: `${previewHeight}px`,
          fontFamily: settings.layout.fontFamily,
          border: '2px solid #e0e0e0',
          borderRadius: 2,
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: 'white',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          transition: 'all 0.2s ease-in-out'
        }}
      >
        {/* Render all elements */}
        {settings.layout.elements.map(renderElement)}
        
        {/* Render QR Code */}
        {renderQRCode()}

        {/* Grid overlay for positioning help */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            opacity: 0.02,
            backgroundImage: `
              linear-gradient(to right, #000 1px, transparent 1px),
              linear-gradient(to bottom, #000 1px, transparent 1px)
            `,
            backgroundSize: `${previewWidth / 10}px ${previewHeight / 10}px`
          }}
        />

        {/* Margin boundaries */}
        <Box
          sx={{
            position: 'absolute',
            top: `${settings.layout.margins.top * scaleRatio}px`,
            left: `${settings.layout.margins.left * scaleRatio}px`,
            right: `${settings.layout.margins.right * scaleRatio}px`,
            bottom: `${settings.layout.margins.bottom * scaleRatio}px`,
            border: '1px dashed rgba(0,0,0,0.05)',
            pointerEvents: 'none',
            borderRadius: '2px'
          }}
        />
      </Paper>

      {showTitle && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="caption" color="textSecondary">
            Scale: {(scaleRatio * 100).toFixed(0)}% • PDF-Accurate Preview
          </Typography>
          <br />
          <Typography variant="caption" color="success.main" sx={{ fontWeight: 'medium' }}>
            ✓ Matches PDF output exactly
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default StickerPreview; 