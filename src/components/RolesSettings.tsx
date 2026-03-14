import React, { useEffect, useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, List, ListItem, ListItemText, Paper, TextField, Typography, Checkbox, FormControlLabel, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { getRoles, getRolePages, UserRole } from '../services/firebase/users';

// Roles are now presets — create/update/delete not supported via Firebase
const createRole = async (_r: any) => {};
const updateRole = async (_id: string, _r: any) => {};
const deleteRole = async (_id: string) => {};
import { appPages } from '../pages/pageRegistry';

const RolesSettings: React.FC = () => {
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [pages, setPages] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<UserRole | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [visiblePages, setVisiblePages] = useState<string[]>([]);
  const [homePageId, setHomePageId] = useState<string>('');

  useEffect(() => {
    const load = async () => {
    try {
        const [r, p] = await Promise.all([getRoles(), getRolePages().catch(() => appPages.map(p => p.id))]);
        setRoles(r);
        setPages(p && p.length ? p : appPages.map(p => p.id));
      } catch (e: any) {
        setError(e?.response?.data?.error || 'Failed to load roles');
      }
    };
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setNameInput('');
    setVisiblePages([]);
    setHomePageId('');
    setEditOpen(true);
  };

  const openEdit = (role: UserRole) => {
    setEditing(role);
    setNameInput(role.name);
    setVisiblePages(role.visiblePages || []);
    setHomePageId(role.homePageId || '');
    setEditOpen(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      if (editing) {
        const updated = await updateRole(editing.id, { name: nameInput, visiblePages, homePageId });
        setRoles(prev => prev.map(r => (r.id === updated.id ? updated : r)));
        setSuccess('Role updated');
      } else {
        const created = await createRole(nameInput.trim(), visiblePages);
        setRoles(prev => [...prev, created]);
        setSuccess('Role created');
      }
      setEditOpen(false);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to save role');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (role: UserRole) => {
    if (role.name === 'Admin') return;
    try {
      setSaving(true);
      await deleteRole(role.id);
      setRoles(prev => prev.filter(r => r.id !== role.id));
      setSuccess('Role deleted');
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to delete role');
    } finally {
      setSaving(false);
    }
  };

  const togglePage = (page: string) => {
    setVisiblePages(prev => prev.includes(page) ? prev.filter(p => p !== page) : [...prev, page]);
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Roles</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New Role</Button>
      </Box>

      {error && (
        <Typography color="error" sx={{ mb: 1 }}>{error}</Typography>
      )}
      {success && (
        <Typography color="success.main" sx={{ mb: 1 }}>{success}</Typography>
      )}

      <List>
        {roles.map(role => (
          <ListItem key={role.id} secondaryAction={
            <Box>
              <IconButton aria-label="edit" onClick={() => openEdit(role)} size="small"><EditIcon /></IconButton>
              {role.name !== 'Admin' && (
                <IconButton aria-label="delete" onClick={() => handleDelete(role)} size="small" sx={{ ml: 1 }}><DeleteIcon /></IconButton>
              )}
            </Box>
          }>
            <ListItemText
              primary={role.name}
              secondary={(role.visiblePages || []).join(', ')}
            />
          </ListItem>
        ))}
      </List>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Edit Role' : 'Create Role'}</DialogTitle>
        <DialogContent>
          <Box mt={1}>
            <TextField
              fullWidth
              label="Role name"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
            />
          </Box>
          <Box mt={2}>
            <FormControl fullWidth>
              <InputLabel>Home page</InputLabel>
              <Select value={homePageId} label="Home page" onChange={(e) => setHomePageId(e.target.value)}>
                <MenuItem value="">(default)</MenuItem>
                {pages.map(pid => (
                  <MenuItem key={pid} value={pid}>{appPages.find(p => p.id === pid)?.label || pid}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Box mt={2}>
            <Typography variant="subtitle1" gutterBottom>Visible Pages</Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr 1fr' },
                gap: 1,
              }}
            >
              {pages.map(page => (
                <Box key={page}>
                  <FormControlLabel
                    control={<Checkbox checked={visiblePages.includes(page)} onChange={() => togglePage(page)} />}
                    label={appPages.find(p => p.id === page)?.label || page}
                  />
                </Box>
              ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={!nameInput.trim() || saving}>{editing ? 'Save' : 'Create'}</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default RolesSettings;


