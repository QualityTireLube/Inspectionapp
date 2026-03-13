import React, { useEffect, useState, useCallback } from 'react';
import {
  Badge,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  CircularProgress
} from '@mui/material';
import { Queue as QueueIcon, Refresh as RefreshIcon, Clear as ClearIcon, Delete as DeleteIcon } from '@mui/icons-material';
import PrintApiService from '../services/printApi';
import { useNotification } from '../hooks/useNotification';

// Small queue badge with popup dialog to manage queued print jobs
const POLL_INTERVAL_MS = 5000;

const PrintQueueBadge: React.FC = () => {
  const { showNotification } = useNotification();
  const [queueCount, setQueueCount] = useState<number>(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);
  const [queueData, setQueueData] = useState<any[]>([]);

  const filterPending = (jobs: any[] = []) => jobs.filter(j => (j?.status || 'pending') === 'pending');

  const loadQueue = useCallback(async () => {
    try {
      const queue = await PrintApiService.getPrintQueue();
      const pending = filterPending(queue.jobs || []);
      setQueueCount(pending.length);
      if (open) {
        setQueueData(pending);
      }
    } catch {
      setQueueCount(0);
      if (open) setQueueData([]);
    }
  }, [open]);

  useEffect(() => {
    // Initial fetch
    loadQueue();
    // Poll for updates
    const id = setInterval(loadQueue, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [loadQueue]);

  const handleOpen = async () => {
    setOpen(true);
    setLoading(true);
    try {
      const queue = await PrintApiService.getPrintQueue();
      setQueueData(filterPending(queue.jobs || []));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => setOpen(false);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const queue = await PrintApiService.getPrintQueue();
      const pending = filterPending(queue.jobs || []);
      setQueueData(pending);
      setQueueCount(pending.length);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelJob = async (jobId: string) => {
    try {
      await PrintApiService.cancelPrintJob(jobId);
      showNotification('Print job cancelled', 'success');
      await handleRefresh();
    } catch {
      showNotification('Failed to cancel print job', 'error');
    }
  };

  const handleClearAll = async () => {
    try {
      setClearingAll(true);
      await PrintApiService.clearPrintQueue();
      showNotification('All print jobs cancelled', 'success');
      await handleRefresh();
    } catch {
      showNotification('Failed to clear print queue', 'error');
    } finally {
      setClearingAll(false);
    }
  };

  return (
    <>
      <Tooltip title={`Print Queue (${queueCount})`}>
        <IconButton size="small" onClick={handleOpen} sx={{ mr: 0.5 }}>
          <Badge badgeContent={queueCount} color="warning" overlap="circular">
            <QueueIcon fontSize="small" />
          </Badge>
        </IconButton>
      </Tooltip>

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <QueueIcon />
              <Typography variant="h6">Print Queue ({queueData.length})</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton onClick={handleRefresh} size="small" title="Refresh Queue">
                <RefreshIcon />
              </IconButton>
              {queueData.length > 0 && (
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  startIcon={<ClearIcon />}
                  onClick={handleClearAll}
                  disabled={clearingAll}
                >
                  Clear All
                </Button>
              )}
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : queueData.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <QueueIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No items in queue
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Print jobs will appear here when they are queued
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Job ID</TableCell>
                    <TableCell>Form Name</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {queueData.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {job.id?.slice(0, 8) || '—'}...
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={job.formName || 'Unknown'} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={job.status || 'pending'}
                          size="small"
                          color={
                            job.status === 'pending'
                              ? 'warning'
                              : job.status === 'printing'
                              ? 'info'
                              : job.status === 'completed'
                              ? 'success'
                              : job.status === 'failed'
                              ? 'error'
                              : 'default'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {job.createdAt ? new Date(job.createdAt).toLocaleString() : 'Unknown'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{job.priority || 'Normal'}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Cancel Job">
                          <span>
                            <IconButton size="small" color="error" onClick={() => handleCancelJob(job.id)}>
                              <DeleteIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PrintQueueBadge;


