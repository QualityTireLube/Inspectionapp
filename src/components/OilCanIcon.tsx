import React from 'react';
import { SvgIcon, SvgIconProps } from '@mui/material';

const OilCanIcon: React.FC<SvgIconProps> = (props) => {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      {/* Oil can body */}
      <path d="M6 8h10v8H6V8z" fill="currentColor"/>
      {/* Spout */}
      <path d="M16 10l3 2-3 2v-4z" fill="currentColor"/>
      {/* Handle */}
      <path d="M8 6h4v2H8V6z" fill="currentColor"/>
      {/* Oil drop */}
      <path d="M19 12c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2z" fill="currentColor"/>
    </SvgIcon>
  );
};

export default OilCanIcon; 