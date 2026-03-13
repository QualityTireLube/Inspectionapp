import React from 'react';
import { SvgIcon, SvgIconProps } from '@mui/material';

const OilBottleIcon: React.FC<SvgIconProps> = (props) => {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      {/* Main bottle body */}
      <path d="M8 4h8v12H8V4z" fill="currentColor"/>
      {/* Bottle neck */}
      <path d="M10 16h4v2H10v-2z" fill="currentColor"/>
      {/* Bottle cap */}
      <path d="M9 18h6v1H9v-1z" fill="currentColor"/>
      {/* Oil drop coming from spout */}
      <path d="M11 19c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2z" fill="currentColor"/>
      {/* Bottle label/design lines */}
      <path d="M9 6h6v1H9V6z" fill="currentColor" opacity="0.3"/>
      <path d="M9 9h6v1H9V9z" fill="currentColor" opacity="0.3"/>
    </SvgIcon>
  );
};

export default OilBottleIcon; 