import React, { useState } from 'react';
import {
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Tooltip,
  Box,
  Typography
} from '@mui/material';
import {
  NoteAdd as NoteAddIcon,
  Note as NoteIcon,
  Close as CloseIcon
} from '@mui/icons-material';

interface NotesFieldProps {
  fieldName: string;
  fieldLabel: string;
  notes: { [key: string]: string };
  onNotesChange: (fieldName: string, noteText: string) => void;
  tooltipText?: string;
}

export const NotesField: React.FC<NotesFieldProps> = ({
  fieldName,
  fieldLabel,
  notes,
  onNotesChange,
  tooltipText = "Add notes for this field"
}) => {
  const [open, setOpen] = useState(false);
  const [noteText, setNoteText] = useState(notes[fieldName] || '');
  
  const hasNote = notes[fieldName] && notes[fieldName].trim().length > 0;

  const handleOpen = () => {
    setNoteText(notes[fieldName] || '');
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleSave = () => {
    onNotesChange(fieldName, noteText);
    setOpen(false);
  };

  const handleClear = () => {
    setNoteText('');
    onNotesChange(fieldName, '');
    setOpen(false);
  };

  return (
    <>
      <Tooltip title={hasNote ? `View/Edit note for ${fieldLabel}` : tooltipText}>
        <IconButton
          size="small"
          onClick={handleOpen}
          sx={{ 
            ml: 1,
            color: hasNote ? 'primary.main' : 'action.default',
            '&:hover': {
              color: 'primary.main'
            }
          }}
        >
          {hasNote ? <NoteIcon fontSize="small" /> : <NoteAddIcon fontSize="small" />}
        </IconButton>
      </Tooltip>

      <Dialog 
        open={open} 
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          pb: 1
        }}>
          <Typography variant="h6">
            Notes for {fieldLabel}
          </Typography>
          <IconButton
            size="small"
            onClick={handleClose}
            sx={{ color: 'grey.500' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            multiline
            rows={4}
            label={`Notes for ${fieldLabel}`}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder={`Enter any additional notes or observations for ${fieldLabel.toLowerCase()}...`}
            variant="outlined"
            sx={{ mb: 2 }}
          />
          
          {hasNote && (
            <Box sx={{ 
              p: 1, 
              bgcolor: 'info.light', 
              borderRadius: 1,
              mb: 2
            }}>
              <Typography variant="body2" color="info.contrastText">
                💡 This field currently has notes saved
              </Typography>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={handleClose} 
            color="inherit"
          >
            Cancel
          </Button>
          {hasNote && (
            <Button 
              onClick={handleClear} 
              color="error"
              variant="outlined"
            >
              Clear Notes
            </Button>
          )}
          <Button 
            onClick={handleSave} 
            variant="contained"
            color="primary"
          >
            Save Notes
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default NotesField; 