import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Typography, Box, FormControl,
  InputLabel, Select, MenuItem, Alert, CircularProgress,
  Avatar, Divider,
} from '@mui/material';
import { AccountCircle as AccountIcon } from '@mui/icons-material';
import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../services/firebase/config';
import { useUser } from '../contexts/UserContext';

const ROLES = [
  { value: 'technician',      label: 'Technician' },
  { value: 'service_advisor', label: 'Service Advisor' },
  { value: 'manager',         label: 'Manager' },
  { value: 'Admin',           label: 'Admin' },
];

const ProfileSetupModal: React.FC = () => {
  const { needsProfileSetup, user, firebaseUid, refreshUser } = useUser();

  const [name,  setName]  = useState(user?.name  || '');
  const [role,  setRole]  = useState('technician');
  const [pin,   setPin]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  if (!needsProfileSetup) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) { setError('Full name is required'); return; }
    if (pin && !/^\d{4}$/.test(pin)) { setError('PIN must be exactly 4 digits'); return; }

    const uid = firebaseUid || auth.currentUser?.uid;
    if (!uid) { setError('Not authenticated — please refresh and try again'); return; }

    setLoading(true);
    try {
      await setDoc(doc(db, 'users', uid), {
        uid,
        name:      name.trim(),
        email:     user?.email || auth.currentUser?.email || '',
        role,
        pin:       pin || null,
        location:  null,
        enabled:   true,
        createdAt: new Date().toISOString(),
      });
      await refreshUser();
    } catch (err: any) {
      setError(err?.message || 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open maxWidth="sm" fullWidth disableEscapeKeyDown>
      <DialogTitle sx={{ pb: 0 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 2, gap: 1 }}>
          <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main' }}>
            <AccountIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Typography variant="h5" fontWeight={700}>Welcome! Set up your profile</Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Your account was created directly in Firebase. Please fill in your profile details to continue.
          </Typography>
        </Box>
      </DialogTitle>

      <Divider sx={{ mt: 2 }} />

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ pt: 2 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <TextField
            label="Full Name"
            value={name}
            onChange={e => setName(e.target.value)}
            fullWidth
            required
            margin="normal"
            autoFocus
          />

          <FormControl fullWidth margin="normal" required>
            <InputLabel>Role</InputLabel>
            <Select value={role} onChange={e => setRole(e.target.value)} label="Role">
              {ROLES.map(r => (
                <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="4-Digit PIN (optional)"
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            fullWidth
            margin="normal"
            type="password"
            inputProps={{
              maxLength: 4,
              pattern: '[0-9]*',
              inputMode: 'numeric',
              style: { textAlign: 'center', fontSize: '1.4em', letterSpacing: '0.4em' },
            }}
            helperText="Used for quick identification on shared computers. You can set this later."
          />

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Logged in as: <strong>{user?.email}</strong>
          </Typography>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={18} /> : undefined}
          >
            {loading ? 'Saving…' : 'Complete Setup'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ProfileSetupModal;
