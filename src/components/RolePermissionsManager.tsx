import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  Tooltip,
  IconButton,
} from '@mui/material';
import { RestartAlt as ResetIcon, Save as SaveIcon } from '@mui/icons-material';
import { appPages, DEFAULT_ROLE_PAGES, AppPage } from '../pages/pageRegistry';
import { getRoles, getAllRoleConfigs, saveRoleConfig, UserRole } from '../services/firebase/users';
import { useUser } from '../contexts/UserContext';

type RoleConfigMap = Record<string, string[]>;

const ALWAYS_ACCESSIBLE_PAGE_IDS = new Set(['profile', 'quickCheckDetail']);

const visiblePages = appPages.filter(p => !ALWAYS_ACCESSIBLE_PAGE_IDS.has(p.id));

export default function RolePermissionsManager() {
  const { user, refreshUser } = useUser();
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [configs, setConfigs] = useState<RoleConfigMap>({});
  const [saved, setSaved] = useState<RoleConfigMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isDirty = JSON.stringify(configs) !== JSON.stringify(saved);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fetchedRoles, fetchedConfigs] = await Promise.all([
        getRoles(),
        getAllRoleConfigs(),
      ]);
      setRoles(fetchedRoles);
      setConfigs(fetchedConfigs);
      setSaved(fetchedConfigs);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load role configs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggle = (roleId: string, pageId: string, checked: boolean) => {
    setConfigs(prev => {
      const current = prev[roleId] ?? [];
      const next = checked
        ? [...current, pageId]
        : current.filter(id => id !== pageId);
      return { ...prev, [roleId]: next };
    });
    setSuccessMsg(null);
  };

  const handleSelectAll = (roleId: string) => {
    setConfigs(prev => ({ ...prev, [roleId]: visiblePages.map(p => p.id) }));
    setSuccessMsg(null);
  };

  const handleDeselectAll = (roleId: string) => {
    setConfigs(prev => ({ ...prev, [roleId]: [] }));
    setSuccessMsg(null);
  };

  const handleReset = (roleId: string) => {
    setConfigs(prev => ({ ...prev, [roleId]: DEFAULT_ROLE_PAGES[roleId] ?? [] }));
    setSuccessMsg(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await Promise.all(
        roles.map(role => saveRoleConfig(role.id, configs[role.id] ?? []))
      );
      setSaved({ ...configs });
      setSuccessMsg('Role permissions saved. Changes take effect on next login.');
      // Refresh the current user's permissions in context
      await refreshUser();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to save role configs');
    } finally {
      setSaving(false);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">You do not have permission to view this page.</Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const nonAdminRoles = roles.filter(r => r.id !== 'admin');

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Role Permissions</Typography>
          <Typography variant="body2" color="text.secondary">
            Control which pages each role can access. Admins always have full access.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
          onClick={handleSave}
          disabled={!isDirty || saving}
        >
          Save Changes
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {successMsg && <Alert severity="success" sx={{ mb: 2 }}>{successMsg}</Alert>}
      {isDirty && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          You have unsaved changes.
        </Alert>
      )}

      <TableContainer component={Paper} variant="outlined">
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, minWidth: 200, bgcolor: 'grey.50' }}>Page</TableCell>
              {nonAdminRoles.map(role => (
                <TableCell key={role.id} align="center" sx={{ fontWeight: 700, bgcolor: 'grey.50', minWidth: 130 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                    <span>{role.name}</span>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="Select all">
                        <Button size="small" sx={{ fontSize: '0.65rem', minWidth: 0, px: 0.5 }} onClick={() => handleSelectAll(role.id)}>All</Button>
                      </Tooltip>
                      <Tooltip title="Deselect all">
                        <Button size="small" sx={{ fontSize: '0.65rem', minWidth: 0, px: 0.5 }} onClick={() => handleDeselectAll(role.id)}>None</Button>
                      </Tooltip>
                      <Tooltip title="Reset to defaults">
                        <IconButton size="small" onClick={() => handleReset(role.id)}>
                          <ResetIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {/* Group pages: regular then admin-only */}
            {[false, true].map(isAdminGroup => {
              const groupPages = visiblePages.filter(p => !!p.adminOnly === isAdminGroup);
              if (groupPages.length === 0) return null;
              return (
                <React.Fragment key={String(isAdminGroup)}>
                  <TableRow>
                    <TableCell
                      colSpan={nonAdminRoles.length + 1}
                      sx={{ bgcolor: isAdminGroup ? 'warning.50' : 'primary.50', py: 0.5, px: 2 }}
                    >
                      <Typography variant="caption" fontWeight={700} color={isAdminGroup ? 'warning.dark' : 'primary.dark'}>
                        {isAdminGroup ? 'Admin / Management Pages' : 'General Pages'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                  {groupPages.map(page => (
                    <PageRow
                      key={page.id}
                      page={page}
                      roles={nonAdminRoles}
                      configs={configs}
                      saved={saved}
                      onToggle={handleToggle}
                    />
                  ))}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ mt: 2 }}>
        <Typography variant="caption" color="text.secondary">
          * Profile and detail-view pages are always accessible to any logged-in user and are not listed here.
        </Typography>
      </Box>
    </Box>
  );
}

interface PageRowProps {
  page: AppPage;
  roles: UserRole[];
  configs: RoleConfigMap;
  saved: RoleConfigMap;
  onToggle: (roleId: string, pageId: string, checked: boolean) => void;
}

function PageRow({ page, roles, configs, saved, onToggle }: PageRowProps) {
  return (
    <TableRow hover>
      <TableCell>
        <Typography variant="body2" fontWeight={500}>{page.label}</Typography>
        <Typography variant="caption" color="text.disabled">{page.path}</Typography>
      </TableCell>
      {roles.map(role => {
        const isChecked = (configs[role.id] ?? []).includes(page.id);
        const wasSaved = (saved[role.id] ?? []).includes(page.id);
        const changed = isChecked !== wasSaved;
        return (
          <TableCell key={role.id} align="center">
            <Tooltip title={isChecked ? 'Click to revoke access' : 'Click to grant access'}>
              <Checkbox
                checked={isChecked}
                onChange={e => onToggle(role.id, page.id, e.target.checked)}
                size="small"
                color={changed ? 'warning' : 'primary'}
                sx={changed ? { color: 'warning.main', '&.Mui-checked': { color: 'warning.main' } } : {}}
              />
            </Tooltip>
          </TableCell>
        );
      })}
    </TableRow>
  );
}
