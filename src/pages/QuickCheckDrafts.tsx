import React, { useEffect, useState } from 'react';
import { getDraftQuickChecks, deleteQuickCheck, deleteAllDrafts } from '../services/api';
import { 
  Box, 
  Typography, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  CircularProgress, 
  Alert,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface QuickCheckDraft {
  id: number;
  user_email: string;
  user_name: string;
  title: string;
  created_at: string;
}

const QuickCheckDrafts: React.FC = () => {
  const [drafts, setDrafts] = useState<QuickCheckDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteDialog, setConfirmDeleteDialog] = useState<{ open: boolean; draftId: number | null }>({ open: false, draftId: null });
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [confirmBulkDeleteDialog, setConfirmBulkDeleteDialog] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDrafts = async () => {
      setLoading(true);
      try {
        // Debug: Check if token exists
        const token = localStorage.getItem('token');
        console.log('Token exists:', !!token);
        console.log('Token value:', token ? token.substring(0, 20) + '...' : 'none');
        
        const data = await getDraftQuickChecks();
        setDrafts(data);
      } catch (err: any) {
        console.error('Full error:', err);
        console.error('Error response:', err.response);
        setError('Failed to fetch drafts');
      } finally {
        setLoading(false);
      }
    };
    fetchDrafts();
  }, []);

  const handleDelete = async (id: number) => {
    try {
      setDeletingId(id);
      await deleteQuickCheck(id);
      // Remove the deleted draft from the local state
      setDrafts(drafts.filter(draft => draft.id !== id));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete draft');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteClick = (draftId: number) => {
    setConfirmDeleteDialog({ open: true, draftId });
  };

  const handleConfirmDelete = async () => {
    if (confirmDeleteDialog.draftId) {
      await handleDelete(confirmDeleteDialog.draftId);
      setConfirmDeleteDialog({ open: false, draftId: null });
    }
  };

  const handleCancelDelete = () => {
    setConfirmDeleteDialog({ open: false, draftId: null });
  };

  const handleBulkDelete = async () => {
    try {
      setBulkDeleting(true);
      const result = await deleteAllDrafts();
      // Refresh the drafts list
      const data = await getDraftQuickChecks();
      setDrafts(data);
      setConfirmBulkDeleteDialog(false);
      // Show success message (you could add a snackbar here)
      alert(`Successfully deleted ${result.deletedCount} drafts`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete all drafts');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleBulkDeleteClick = () => {
    setConfirmBulkDeleteDialog(true);
  };

  const handleCancelBulkDelete = () => {
    setConfirmBulkDeleteDialog(false);
  };

  // Handler to continue a draft
  const handleContinueDraft = async (draftId: number) => {
    try {
      // Navigate to QuickCheck page with draftId URL parameter
      // This will trigger the URL parameter loading logic in QuickCheck form
      navigate(`/quick-check?draftId=${draftId}`);
    } catch (err) {
      alert('Failed to load draft data.');
    }
  };

  return (
    <Box p={3}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>Quick Check Drafts</Typography>
        {drafts.length > 0 && (
          <Button
            variant="contained"
            color="error"
            onClick={handleBulkDeleteClick}
            disabled={bulkDeleting}
            startIcon={bulkDeleting ? <CircularProgress size={16} /> : <DeleteIcon />}
          >
            {bulkDeleting ? 'Deleting...' : `Delete All (${drafts.length})`}
          </Button>
        )}
      </Box>
      {loading ? (
        <CircularProgress />
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Created At</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {drafts.map((draft) => (
                <TableRow 
                  key={draft.id}
                  hover
                  style={{ cursor: 'pointer' }}
                  onClick={e => {
                    // Prevent row click if delete button is clicked
                    if ((e.target as HTMLElement).closest('button')) return;
                    handleContinueDraft(draft.id);
                  }}
                >
                  <TableCell>{draft.id}</TableCell>
                  <TableCell>{draft.title}</TableCell>
                  <TableCell>{draft.user_name} ({draft.user_email})</TableCell>
                  <TableCell>{draft.created_at}</TableCell>
                  <TableCell>
                    <Tooltip title="Delete Draft">
                      <IconButton 
                        onClick={event => {
                          event.stopPropagation();
                          handleDeleteClick(draft.id);
                        }}
                        disabled={deletingId === draft.id}
                        color="error"
                        size="small"
                      >
                        {deletingId === draft.id ? (
                          <CircularProgress size={20} />
                        ) : (
                          <DeleteIcon />
                        )}
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={confirmDeleteDialog.open}
        onClose={handleCancelDelete}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Confirm Delete
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this draft? This action cannot be undone and all progress will be lost.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete} color="primary">
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmDelete}
            variant="contained" 
            color="error"
            disabled={deletingId === confirmDeleteDialog.draftId}
            startIcon={deletingId === confirmDeleteDialog.draftId ? <CircularProgress size={16} /> : <DeleteIcon />}
          >
            {deletingId === confirmDeleteDialog.draftId ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog
        open={confirmBulkDeleteDialog}
        onClose={handleCancelBulkDelete}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Confirm Bulk Delete
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete ALL {drafts.length} drafts? This action cannot be undone and all progress will be lost.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelBulkDelete} color="primary">
            Cancel
          </Button>
          <Button 
            onClick={handleBulkDelete}
            variant="contained" 
            color="error"
            disabled={bulkDeleting}
            startIcon={bulkDeleting ? <CircularProgress size={16} /> : <DeleteIcon />}
          >
            {bulkDeleting ? 'Deleting...' : 'Delete All'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QuickCheckDrafts; 