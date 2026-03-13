import React from 'react';
import { Paper, BottomNavigation, BottomNavigationAction } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssignmentIcon from '@mui/icons-material/Assignment';
import SettingsIcon from '@mui/icons-material/Settings';

interface InspectionBottomNavProps {
  value: number;
  onChange: (e: React.SyntheticEvent, v: number) => void;
}

const InspectionBottomNav: React.FC<InspectionBottomNavProps> = ({ value, onChange }) => {
  return (
    <Paper 
      sx={{ 
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000,
        borderTop: 1, borderColor: 'divider', backgroundColor: '#024FFF'
      }} elevation={3}
    >
      <BottomNavigation value={value} onChange={onChange} showLabels sx={{ height: 70, backgroundColor: '#024FFF' }}>
        <BottomNavigationAction label="Dashboard" icon={<DashboardIcon />} />
        <BottomNavigationAction label="Quick Check" icon={<AssignmentIcon />} />
        <BottomNavigationAction label="No Check" icon={<AssignmentIcon />} />
        <BottomNavigationAction label="Settings" icon={<SettingsIcon />} />
      </BottomNavigation>
    </Paper>
  );
};

export default InspectionBottomNav;


