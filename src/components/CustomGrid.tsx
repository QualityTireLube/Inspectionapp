import React from 'react';
import { Grid as MuiGrid, GridProps } from '@mui/material';

interface CustomGridProps extends Omit<GridProps, 'item'> {
  item?: boolean;
  xs?: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
}

const Grid: React.FC<CustomGridProps> = (props) => {
  return <MuiGrid {...props} />;
};

export default Grid; 