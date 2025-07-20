import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  IconButton,
  Box,
  Chip,
  Menu,
  MenuItem,
  Divider,
  Tooltip
} from '@mui/material';
import {
  Edit as EditIcon,
  MoreVert as MoreVertIcon,
  Archive as ArchiveIcon,
  Unarchive as UnarchiveIcon,
  Delete as DeleteIcon,
  FileCopy as DuplicateIcon,
  GetApp as DownloadIcon,
  Visibility as PreviewIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { LabelTemplate, PAPER_SIZES } from '../types/labelTemplates';
import { LabelPdfGenerator, LabelData } from '../services/labelPdfGenerator';

interface LabelTemplateCardProps {
  template: LabelTemplate;
  onEdit: (template: LabelTemplate) => void;
  onArchive?: (template: LabelTemplate) => void;
  onRestore?: (template: LabelTemplate) => void;
  onDelete?: (template: LabelTemplate) => void;
  onDuplicate?: (template: LabelTemplate) => void;
  showArchiveButton?: boolean;
  showRestoreButton?: boolean;
  showDeleteButton?: boolean;
}

const LabelTemplateCard: React.FC<LabelTemplateCardProps> = ({
  template,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
  onDuplicate,
  showArchiveButton = false,
  showRestoreButton = false,
  showDeleteButton = false,
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handlePreview = async () => {
    handleMenuClose();
    try {
      setIsGeneratingPdf(true);
      
      // Generate sample data for preview
      const sampleData: LabelData = {};
      template.fields.forEach(field => {
        sampleData[field.name] = field.value || field.name;
      });

      const pdfBytes = await LabelPdfGenerator.generateLabelPdf(template, sampleData, 1);
      LabelPdfGenerator.openPdfInNewTab(pdfBytes);
    } catch (error) {
      console.error('Error generating preview:', error);
      alert('Failed to generate preview');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownload = async () => {
    handleMenuClose();
    try {
      setIsGeneratingPdf(true);
      
      // Generate sample data for download
      const sampleData: LabelData = {};
      template.fields.forEach(field => {
        sampleData[field.name] = field.value || field.name;
      });

      const pdfBytes = await LabelPdfGenerator.generateLabelPdf(template, sampleData, template.copies);
      LabelPdfGenerator.downloadPdf(pdfBytes, `${template.labelName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const paperConfig = PAPER_SIZES[template.paperSize];
  const formattedDate = format(new Date(template.createdDate), 'MMM dd, yyyy');
  const formattedUpdateDate = template.updatedDate 
    ? format(new Date(template.updatedDate), 'MMM dd, yyyy')
    : null;

  return (
    <Card 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        opacity: template.archived ? 0.7 : 1,
        border: template.archived ? '1px dashed #ccc' : '1px solid #e0e0e0'
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Typography variant="h6" component="h3" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
            {template.labelName}
          </Typography>
          <IconButton
            size="small"
            onClick={handleMenuOpen}
            disabled={isGeneratingPdf}
          >
            <MoreVertIcon />
          </IconButton>
        </Box>

        {/* Status */}
        {template.archived && (
          <Box sx={{ mb: 2 }}>
            <Chip
              label="Archived"
              size="small"
              color="default"
              variant="outlined"
            />
          </Box>
        )}

        {/* Template Info */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            <strong>Paper Size:</strong> {paperConfig?.name || template.paperSize}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            <strong>Fields:</strong> {template.fields.length}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            <strong>Copies:</strong> {template.copies}
          </Typography>
        </Box>

        {/* Creator Info */}
        <Box sx={{ mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            <strong>Created by:</strong> {template.createdBy}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>Created:</strong> {formattedDate}
          </Typography>
          {formattedUpdateDate && (
            <Typography variant="body2" color="text.secondary">
              <strong>Updated:</strong> {formattedUpdateDate}
            </Typography>
          )}
        </Box>

        {/* Field Preview */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            <strong>Fields:</strong>
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {template.fields.slice(0, 6).map((field) => (
              <Chip
                key={field.id}
                label={field.name}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem' }}
              />
            ))}
            {template.fields.length > 6 && (
              <Chip
                label={`+${template.fields.length - 6} more`}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem' }}
              />
            )}
          </Box>
        </Box>
      </CardContent>

      {/* Actions */}
      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
        <Button
          size="small"
          startIcon={<EditIcon />}
          onClick={() => onEdit(template)}
        >
          Edit
        </Button>
        
        <Box>
          {showArchiveButton && onArchive && (
            <Tooltip title="Archive template">
              <IconButton size="small" onClick={() => onArchive(template)}>
                <ArchiveIcon />
              </IconButton>
            </Tooltip>
          )}
          
          {showRestoreButton && onRestore && (
            <Tooltip title="Restore template">
              <IconButton size="small" onClick={() => onRestore(template)}>
                <UnarchiveIcon />
              </IconButton>
            </Tooltip>
          )}
          
          {showDeleteButton && onDelete && (
            <Tooltip title="Delete permanently">
              <IconButton size="small" onClick={() => onDelete(template)} color="error">
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </CardActions>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handlePreview} disabled={isGeneratingPdf}>
          <PreviewIcon sx={{ mr: 1 }} />
          Preview PDF
        </MenuItem>
        <MenuItem onClick={handleDownload} disabled={isGeneratingPdf}>
          <DownloadIcon sx={{ mr: 1 }} />
          Download PDF
        </MenuItem>
        <Divider />
        {onDuplicate && (
          <MenuItem onClick={() => { handleMenuClose(); onDuplicate(template); }}>
            <DuplicateIcon sx={{ mr: 1 }} />
            Duplicate
          </MenuItem>
        )}
        <MenuItem onClick={() => { handleMenuClose(); onEdit(template); }}>
          <EditIcon sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <Divider />
        {showArchiveButton && onArchive && (
          <MenuItem onClick={() => { handleMenuClose(); onArchive(template); }}>
            <ArchiveIcon sx={{ mr: 1 }} />
            Archive
          </MenuItem>
        )}
        {showRestoreButton && onRestore && (
          <MenuItem onClick={() => { handleMenuClose(); onRestore(template); }}>
            <UnarchiveIcon sx={{ mr: 1 }} />
            Restore
          </MenuItem>
        )}
        {showDeleteButton && onDelete && (
          <MenuItem 
            onClick={() => { handleMenuClose(); onDelete(template); }}
            sx={{ color: 'error.main' }}
          >
            <DeleteIcon sx={{ mr: 1 }} />
            Delete Permanently
          </MenuItem>
        )}
      </Menu>
    </Card>
  );
};

export default LabelTemplateCard; 