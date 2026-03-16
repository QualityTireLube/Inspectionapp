import React, { useEffect, useState } from 'react';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton,
  List, ListItem, ListItemText, Paper, TextField, Typography, Checkbox,
  FormControlLabel, FormControl, InputLabel, Select, MenuItem, Alert
} from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';
import { getRoles, updateRole, UserRole } from '../services/firebase/users';
import { appPages } from '../pages/pageRegistry';

const RolesSettings: React.FC = () => {
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<UserRole | null>(null);
  const [visiblePages, setVisiblePages] = useState<string[]>([]);
  const [homePageId, setHomePageId] = useState<string>('');

  useEffect(() => {
    setLoading(true);
    getRoles()
      .then(r => setRoles(r))
      .catch(e => setError(e?.message || 'Failed to load roles'))
      .finally(() => setLoading(false));
  }, []);

  const openEdit = (role: UserRole) => {
    setEditing(role);
    setVisiblePages(role.visiblePages ?? []);
    setHomePageId(role.homePageId ?? '');
    setError('');
    setSuccess('');
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!editing) return;
    try {
      setSaving(true);
      setError('');
      await updateRole(editing.id, { visiblePages, homePageId });
      setRoles(prev =>
        prev.map(r => r.id === editing.id ? { ...r, visiblePages, homePageId } : r)
      );
      setSuccess(`"${editing.name}" role updated. Users will see the new pages on their next login.`);
      setEditOpen(false);
    } catch (e: any) {
      setError(e?.message || 'Failed to save role');
    } finally {
      setSaving(false);
    }
  };

  const togglePage = (page: string) => {
    setVisiblePages(prev =>
      prev.includes(page) ? prev.filter(p => p !== page) : [...prev, page]
    );
  };

  const pageLabel = (id: string) => appPages.find(p => p.id === id)?.label ?? id;

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h5" mb={2}>Role Page Access</Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Control which pages each role can access. Leave all pages unchecked to grant full access.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {loading ? (
        <Typography>Loading…</Typography>
      ) : (
        <List>
          {roles.map(role => (
            <ListItem
              key={role.id}
              secondaryAction={
                <IconButton aria-label="edit" onClick={() => openEdit(role)} size="small">
                  <EditIcon />
                </IconButton>
              }
            >
              <ListItemText
                primary={role.name}
                secondary={
                  (role.visiblePages ?? []).length === 0
                    ? 'All pages visible'
                    : (role.visiblePages ?? []).map(pageLabel).join(', ')
                }
              />
            </ListItem>
          ))}
        </List>
      )}

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit "{editing?.name}" Role</DialogTitle>
        <DialogContent>
          <Box mt={1}>
            <FormControl fullWidth>
              <InputLabel>Home page (after login)</InputLabel>
              <Select
                value={homePageId}
                label="Home page (after login)"
                onChange={e => setHomePageId(e.target.value)}
              >
                <MenuItem value="">(default — /)</MenuItem>
                {appPages.map(p => (
                  <MenuItem key={p.id} value={p.id}>{p.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Box mt={3}>
            <Typography variant="subtitle1" gutterBottom>
              Visible Pages{' '}
              <Typography component="span" variant="caption" color="text.secondary">
                (uncheck all = no restriction)
              </Typography>
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 0.5 }}>
              {appPages.map(page => (
                <FormControlLabel
                  key={page.id}
                  control={
                    <Checkbox
                      checked={visiblePages.includes(page.id)}
                      onChange={() => togglePage(page.id)}
                      size="small"
                    />
                  }
                  label={page.label}
                />
              ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default RolesSettings;
