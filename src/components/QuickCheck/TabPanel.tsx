import React from 'react';
import { Box } from '@mui/material';
import { TabPanelProps } from '../../types/quickCheck';

export const TabPanel: React.FC<TabPanelProps> = (props) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`quick-check-tabpanel-${index}`}
      aria-labelledby={`quick-check-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}; 