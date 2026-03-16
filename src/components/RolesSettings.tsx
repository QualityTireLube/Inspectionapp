import React, { useEffect, useState } from 'react';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton,
  List, ListItem, ListItemText, Paper, TextField, Typography, Checkbox,
  FormControlLabel, FormControl, InputLabel, Select, MenuItem, Alert
} from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';
import { getRoles, saveRoleConfig, getAllRoleConfigs, UserRole } from '../services/firebase/users';
import { appPages, DEFAULT_ROLE_PAGES } from '../pages/pageRegistry';

const RolesSettings: React.FC = () => {
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [roleConfigs, setRoleConfigs] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<UserRole | null>(null);
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [homePageId, setHomePageId] = useState<string>('');

  useEffect(() => {
    setLoading(true);
    Promise.all([getRoles(), getAllRoleConfigs()])
      .then(([r, configs]) => {
        setRoles(r);
        setRoleConfigs(configs);
      })
      .catch(e => setError(e?.message || 'Failed to load roles'))
      .finally(() => setLoading(false));
  }, []);

  const openEdit = (role: UserRole) => {
    setEditing(role);
    // Use Firestore config if available, otherwise fall back to defaults
    const pages = roleConfigs[role.id] ?? DEFAULT_ROLE_PAGES[role.id] ?? [];
    setSelectedPages(pages);
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
      await saveRoleConfig(editing.id, selectedPages);
      setRoleConfigs(prev => ({ ...prev, [editing.id]: selectedPages }));
      setSuccess(`"${editing.name}" permissions saved. Users will see updated pages on next login.`);
      setEditOpen(false);
    } catch (e: any) {
      setError(e?.message || 'Failed to save role');
    } finally {
      setSaving(false);
    }
  };

  const togglePage = (pageId: string) => {
    setSelectedPages(prev =>
      prev.includes(pageId) ? prev.filter(p => p !== pageId) : [...prev, pageId]
    );
  };

  const selectAll = () => setSelectedPages(appPages.map(p => p.id));
  const clearAll = () => setSelectedPages([]);

  const pageLabel = (id: string) => appPages.find(p => p.id === id)?.label ?? id;

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h5" mb={1}>Role Page Permissions</Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Control which pages each role can access. Changes take effect on the user's next login.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {loading ? (
        <Typography>Loading…</Typography>
      ) : (
        <List>
          {roles.map(role => {
            const pages = roleConfigs[role.id] ?? DEFAULT_ROLE_PAGES[role.id] ?? [];
            return (
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
                    pages.length === 0
                      ? 'No pages assigned'
                      : `${pages.length} pages: ${pages.slice(0, 4).map(pageLabel).join(', ')}${pages.length > 4 ? '…' : ''}`
                  }
                />
              </ListItem>
            );
          })}
        </List>
      )}

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit "{editing?.name}" Permissions</DialogTitle>
        <DialogContent>
          <Box mt={1} display="flex" gap={1}>
            <Button size="small" variant="outlined" onClick={selectAll}>Select All</Button>
            <Button size="small" variant="outlined" onClick={clearAll}>Clear All</Button>
          </Box>
          <Box mt={2} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 0.5 }}>
            {appPages.map(page => (
              <FormControlLabel
                key={page.id}
                control={
                  <Checkbox
                    checked={selectedPages.includes(page.id)}
                    onChange={() => togglePage(page.id)}
                    size="small"
                  />
                }
                label={
                  <Typography variant="body2">
                    {page.label}
                    {page.adminOnly && (
                      <Typography component="span" variant="caption" color="text.secondary"> (admin)</Typography>
                    )}
                  </Typography>
                }
              />
            ))}
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
