import React, { useEffect, useState } from 'react';
import { Box, Tabs, Tab, CircularProgress, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, Button, Fab, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Tooltip } from '@mui/material';
import { Upload as UploadIcon, Edit as EditIcon, Delete as DeleteIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { databaseApi } from '../services/databaseApi';
import RestockLabelsCsvUpload from '../components/RestockLabelsCsvUpload';

const Databases: React.FC = () => {
  const [tables, setTables] = useState<string[]>([]);
  const [currentTab, setCurrentTab] = useState(0);
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [csvUploadOpen, setCsvUploadOpen] = useState(false);
  
  // Edit/Delete state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<any>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingRow, setDeletingRow] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadTable = async (tableName: string) => {
    try {
      setLoading(true);
      const data = await databaseApi.getTableData(tableName);
      setColumns(data.columns);
      setRows(data.rows);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Error loading table');
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const tbls = await databaseApi.getTables();
        setTables(tbls);
        if (tbls.length > 0) {
          loadTable(tbls[0]);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load tables');
      }
    })();
  }, []);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
    const tableName = tables[newValue];
    if (tableName) {
      loadTable(tableName);
    }
  };

  const handleCsvUploadComplete = () => {
    // Refresh the current table if it's related to labels
    const currentTableName = tables[currentTab];
    if (currentTableName && currentTableName.includes('label')) {
      loadTable(currentTableName);
    }
  };

  const isLabelsTable = () => {
    const currentTableName = tables[currentTab];
    return currentTableName && (currentTableName.includes('label') || currentTableName.includes('generated_labels'));
  };

  // Get the primary key column (usually 'id')
  const getPrimaryKey = (row: any): string | null => {
    if (row.id !== undefined) return row.id;
    if (row.ID !== undefined) return row.ID;
    // Try to find any column that looks like an ID
    const idCol = columns.find(col => col.toLowerCase() === 'id' || col.toLowerCase().endsWith('_id'));
    return idCol ? row[idCol] : null;
  };

  // Handle Edit
  const handleEditClick = (row: any) => {
    setEditingRow(row);
    setEditFormData({ ...row });
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    const tableName = tables[currentTab];
    const id = getPrimaryKey(editingRow);
    
    if (!id) {
      setError('Cannot edit: No ID found for this row');
      return;
    }

    try {
      setActionLoading(true);
      await databaseApi.updateRecord(tableName, String(id), editFormData);
      setEditDialogOpen(false);
      setEditingRow(null);
      // Refresh the table
      await loadTable(tableName);
    } catch (err: any) {
      setError(err.message || 'Failed to update record');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Delete
  const handleDeleteClick = (row: any) => {
    setDeletingRow(row);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    const tableName = tables[currentTab];
    const id = getPrimaryKey(deletingRow);
    
    if (!id) {
      setError('Cannot delete: No ID found for this row');
      return;
    }

    try {
      setActionLoading(true);
      await databaseApi.deleteRecord(tableName, String(id));
      setDeleteDialogOpen(false);
      setDeletingRow(null);
      // Refresh the table
      await loadTable(tableName);
    } catch (err: any) {
      setError(err.message || 'Failed to delete record');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle form field change
  const handleEditFieldChange = (column: string, value: string) => {
    setEditFormData((prev: any) => ({
      ...prev,
      [column]: value
    }));
  };

  return (
    <Box sx={{ p: 2, position: 'relative' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">
          Database Viewer
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh Table">
            <IconButton 
              onClick={() => tables[currentTab] && loadTable(tables[currentTab])}
              color="primary"
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          {isLabelsTable() && (
            <Button
              variant="contained"
              startIcon={<UploadIcon />}
              onClick={() => setCsvUploadOpen(true)}
            >
              Upload Restock Labels CSV
            </Button>
          )}
        </Box>
      </Box>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      <Tabs
        value={currentTab}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{ mb: 2 }}
      >
        {tables.map((t) => (
          <Tab key={t} label={t} />
        ))}
      </Tabs>

      {/* === Field chips === */}
      {columns.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 1 }}>
          <Chip label="Fields" variant="outlined" size="small" />
          {columns.map((col) => (
            <Chip key={col} label={col} color="primary" variant="outlined" size="small" />
          ))}
        </Box>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ maxHeight: '70vh' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', width: 100, position: 'sticky', left: 0, backgroundColor: 'background.paper', zIndex: 3 }}>
                  Actions
                </TableCell>
                {columns.map((col) => (
                  <TableCell key={col} sx={{ fontWeight: 'bold' }}>
                    {col}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, idx) => (
                <TableRow key={idx} hover>
                  <TableCell sx={{ position: 'sticky', left: 0, backgroundColor: 'background.paper', zIndex: 1 }}>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="Edit">
                        <IconButton 
                          size="small" 
                          color="primary"
                          onClick={() => handleEditClick(row)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => handleDeleteClick(row)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                  {columns.map((col) => (
                    <TableCell key={col}>{String(row[col] ?? '')}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* CSV Upload Dialog */}
      <RestockLabelsCsvUpload
        open={csvUploadOpen}
        onClose={() => setCsvUploadOpen(false)}
        onUploadComplete={handleCsvUploadComplete}
      />

      {/* Floating Action Button for CSV Upload (alternative placement) */}
      {isLabelsTable() && (
        <Fab
          color="primary"
          aria-label="upload csv"
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            display: { xs: 'flex', sm: 'none' } // Only show on mobile when button might be hidden
          }}
          onClick={() => setCsvUploadOpen(true)}
        >
          <UploadIcon />
        </Fab>
      )}

      {/* Edit Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Record</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {columns.map((col) => (
              <TextField
                key={col}
                label={col}
                value={editFormData[col] ?? ''}
                onChange={(e) => handleEditFieldChange(col, e.target.value)}
                fullWidth
                size="small"
                disabled={col.toLowerCase() === 'id' || col.toLowerCase().endsWith('_id')}
                helperText={col.toLowerCase() === 'id' || col.toLowerCase().endsWith('_id') ? 'ID fields cannot be edited' : ''}
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleEditSave} 
            variant="contained" 
            color="primary"
            disabled={actionLoading}
          >
            {actionLoading ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteDialogOpen} 
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this record?
          </Typography>
          {deletingRow && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                ID: {getPrimaryKey(deletingRow)}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            variant="contained" 
            color="error"
            disabled={actionLoading}
          >
            {actionLoading ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Databases; 