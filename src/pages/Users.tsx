import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Box,
  TextField,
  Grid,
  Divider
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { getUsers, deleteUser, enableUser, disableUser, updateUserRole, updateUserLocation, updateUserDetails, getRoles, UserRole } from '../services/firebase/users';

interface User {
  email: string;
  name: string;
  enabled: boolean;
  role: string;
  pin?: string;
  location?: string;
}

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    role: '',
    location: '',
    pin: ''
  });

  useEffect(() => {
    fetchUsers();
    getRoles().then(setRoles).catch(() => {
      setRoles([
        { id: 'technician', name: 'Technician', visiblePages: [] },
        { id: 'service_advisor', name: 'Service advisor', visiblePages: [] },
        { id: 'admin', name: 'Admin', visiblePages: [] },
      ]);
    });
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await getUsers();
      setUsers(data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    try {
      await deleteUser(selectedUser.email);
      setUsers(users.filter(user => user.email !== selectedUser.email));
      setSuccess('User deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedUser(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete user');
    }
  };

  const handleToggleUserStatus = async (user: User) => {
    try {
      if (user.enabled) {
        await disableUser(user.email);
        setUsers(users.map(u => 
          u.email === user.email ? { ...u, enabled: false } : u
        ));
        setSuccess('User disabled successfully');
      } else {
        await enableUser(user.email);
        setUsers(users.map(u => 
          u.email === user.email ? { ...u, enabled: true } : u
        ));
        setSuccess('User enabled successfully');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update user status');
    }
  };

  const handleUpdateRole = async (user: User, newRole: string) => {
    try {
      await updateUserRole(user.email, newRole);
      setUsers(users.map(u => 
        u.email === user.email ? { ...u, role: newRole } : u
      ));
      setSuccess('User role updated successfully');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update user role');
    }
  };

  const handleUpdateLocation = async (user: User, newLocation: string) => {
    try {
      await updateUserLocation(user.email, newLocation);
      setUsers(users.map(u => 
        u.email === user.email ? { ...u, location: newLocation } : u
      ));
      setSuccess('User location updated successfully');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update user location');
    }
  };

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const openUserDetails = (user: User) => {
    setEditingUser(user);
    setUserForm({
      name: user.name,
      email: user.email,
      role: user.role,
      location: user.location || '',
      pin: user.pin || ''
    });
    setUserDetailsOpen(true);
  };

  const handleUserFormChange = (field: string, value: string) => {
    setUserForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveUserDetails = async () => {
    if (!editingUser) return;
    
    try {
      // Use the new comprehensive user update endpoint
      await updateUserDetails(editingUser.email, {
        name: userForm.name,
        newEmail: userForm.email,
        role: userForm.role,
        location: userForm.location,
        pin: userForm.pin || undefined // Don't send empty string
      });

      // Update the local state
      setUsers(users.map(u => 
        u.email === editingUser.email ? {
          ...u,
          name: userForm.name,
          email: userForm.email,
          role: userForm.role,
          location: userForm.location,
          pin: userForm.pin
        } : u
      ));

      setSuccess('User details updated successfully');
      setUserDetailsOpen(false);
      setEditingUser(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update user details');
    }
  };

  const handleCancelUserDetails = () => {
    setUserDetailsOpen(false);
    setEditingUser(null);
    setUserForm({
      name: '',
      email: '',
      role: '',
      location: '',
      pin: ''
    });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Admin':
        return 'error';
      case 'Service advisor':
        return 'warning';
      case 'Technician':
        return 'info';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          User Management
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>PIN</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow 
                  key={user.email}
                  onClick={() => openUserDetails(user)}
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: 'action.hover'
                    }
                  }}
                >
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <FormControl size="small" sx={{ minWidth: 120 }} onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={user.role}
                        onChange={(e) => handleUpdateRole(user, e.target.value)}
                        sx={{ 
                          '& .MuiSelect-select': { 
                            py: 0.5,
                            px: 1
                          }
                        }}
                      >
                        {roles.map(r => (
                          <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell>
                    <FormControl size="small" sx={{ minWidth: 150 }} onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={user.location || ''}
                        onChange={(e) => handleUpdateLocation(user, e.target.value)}
                        sx={{ 
                          '& .MuiSelect-select': { 
                            py: 0.5,
                            px: 1
                          }
                        }}
                        displayEmpty
                      >
                        <MenuItem value="">Not Set</MenuItem>
                        <MenuItem value="Quality Lube Express">Quality Lube Express</MenuItem>
                        <MenuItem value="Simple Simon">Simple Simon</MenuItem>
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontFamily: 'monospace',
                        fontSize: '1rem',
                        color: user.pin ? 'text.primary' : 'text.disabled'
                      }}
                    >
                      {user.pin || 'Not Set'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={user.enabled ? 'Active' : 'Inactive'} 
                      color={user.enabled ? 'success' : 'default'}
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleUserStatus(user);
                      }}
                      sx={{ 
                        cursor: 'pointer',
                        '&:hover': {
                          opacity: 0.8
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeleteDialog(user);
                      }}
                      size="small"
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* User Details Dialog */}
      <Dialog 
        open={userDetailsOpen} 
        onClose={handleCancelUserDetails}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6">
            Edit User Details
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid size={12}>
              <TextField
                fullWidth
                label="Full Name"
                value={userForm.name}
                onChange={(e) => handleUserFormChange('name', e.target.value)}
                variant="outlined"
              />
            </Grid>
            
            <Grid size={12}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={userForm.email}
                onChange={(e) => handleUserFormChange('email', e.target.value)}
                variant="outlined"
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  value={userForm.role}
                  onChange={(e) => handleUserFormChange('role', e.target.value)}
                  label="Role"
                >
                  {roles.map(r => (
                    <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Location</InputLabel>
                <Select
                  value={userForm.location}
                  onChange={(e) => handleUserFormChange('location', e.target.value)}
                  label="Location"
                  displayEmpty
                >
                  <MenuItem value="">Not Set</MenuItem>
                  <MenuItem value="Quality Lube Express">Quality Lube Express</MenuItem>
                  <MenuItem value="Simple Simon">Simple Simon</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={12}>
              <TextField
                fullWidth
                label="4-Digit PIN"
                value={userForm.pin}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                  handleUserFormChange('pin', value);
                }}
                variant="outlined"
                inputProps={{
                  maxLength: 4,
                  pattern: '[0-9]*',
                  inputMode: 'numeric',
                  style: { textAlign: 'center', fontSize: '1.2em', letterSpacing: '0.5em' }
                }}
                helperText="Leave blank to keep current PIN"
              />
            </Grid>

            <Grid size={12}>
              <Divider />
            </Grid>

            <Grid size={12}>
              <Typography variant="body2" color="text.secondary">
                Current Status: {editingUser?.enabled ? 'Active' : 'Inactive'}
              </Typography>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelUserDetails}>
            Cancel
          </Button>
          <Button 
            onClick={handleSaveUserDetails} 
            variant="contained"
            color="primary"
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete {selectedUser?.name} ({selectedUser?.email})?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteUser} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Users; 