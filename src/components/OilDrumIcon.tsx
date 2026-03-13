import React from 'react';
import { Box, BoxProps } from '@mui/material';

interface OilDrumIconProps extends Omit<BoxProps, 'component'> {
  size?: number;
}

const OilDrumIcon: React.FC<OilDrumIconProps> = ({ size = 20, ...props }) => {
  return (
    <Box
      component="span"
      sx={{
        fontSize: `${size}px`,
        lineHeight: 1,
        display: 'inline-flex',
        alignItems: 'center',
        ...props.sx
      }}
      {...props}
    >
      🛢️
    </Box>
  );
};

export default OilDrumIcon; 