import React from 'react';
import { Grid as MuiGrid, GridProps } from '@mui/material';

interface CustomGridProps extends GridProps {
  // Explicitly include all the props we need
  item?: boolean;
  container?: boolean;
  xs?: number | boolean;
  sm?: number | boolean;
  md?: number | boolean;
  lg?: number | boolean;
  xl?: number | boolean;
}

const Grid: React.FC<CustomGridProps> = (props) => {
  return <MuiGrid {...props} />;
};

export default Grid; 