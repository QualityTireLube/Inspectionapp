import React from 'react';
import { Box } from '@mui/material';

export type RotorCondition = 'good' | 'grooves' | 'overheated' | 'scared';

interface BrakePadSideViewProps {
  innerPad: number;
  outerPad: number;
  rotorCondition?: RotorCondition;
  width?: number;
  height?: number;
}

const getPadColor = (mm: number) => {
  if (mm <= 2) return '#e53935'; // Red
  if (mm === 3) return 'url(#yellowRed)'; // Yellow/Red
  if (mm === 4) return '#ffd600'; // Yellow
  return '#4caf50'; // Green
};

const MAX_PAD = 10; // 10mm = full pad
const MIN_PAD = 0;  // 0mm = worn out

// Pad width (thickness) is now proportional to pad value
const MAX_PAD_W = 40; // Maximum pad width in pixels
const MIN_PAD_W = 8;  // Minimum pad width in pixels

const getPadWidth = (mm: number) => {
  // Convert mm to pixel width, clamped between MIN_PAD_W and MAX_PAD_W
  const clamped = Math.max(MIN_PAD, Math.min(MAX_PAD, mm));
  return MIN_PAD_W + (clamped / MAX_PAD) * (MAX_PAD_W - MIN_PAD_W);
};

const BrakePadSideView: React.FC<BrakePadSideViewProps> = ({
  innerPad,
  outerPad,
  rotorCondition = 'good',
  width = 400,  // Increased from 220
  height = 300  // Increased from 180
}) => {
  // SVG layout constants
  const svgW = 400;  // Increased from 220
  const svgH = 300;  // Increased from 180
  const rotorW = 40; // Increased from 24
  const rotorH = 180; // Increased from 140
  const padH = 100; // Fixed pad height
  const rotorX = svgW / 2 - rotorW / 2;
  const rotorY = svgH / 2 - rotorH / 2;
  const padY = svgH / 2 - padH / 2; // Center pads independently

  // Calculate pad widths based on values
  const innerPadW = getPadWidth(innerPad);
  const outerPadW = getPadWidth(outerPad);

  // Pad X positions (outer face always touches rotor on left, inner face touches rotor on right)
  const outerX = rotorX - outerPadW;
  const innerX = rotorX + rotorW;

  // Caliper positions (move with pads)
  const outerCaliperX = outerX - 40; // Increased from 24
  const innerCaliperX = innerX + innerPadW;

  return (
    <Box sx={{ width, height }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="rotorGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#eee" />
            <stop offset="100%" stopColor="#bbb" />
          </linearGradient>
          <linearGradient id="yellowRed" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffd600" />
            <stop offset="100%" stopColor="#e53935" />
          </linearGradient>
          <pattern id="grooves" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect x="0" y="0" width="8" height="8" fill="#bbb" />
            <line x1="0" y1="0" x2="8" y2="8" stroke="#888" strokeWidth="2" />
          </pattern>
          <linearGradient id="overheat" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ff9800" />
            <stop offset="100%" stopColor="#bbb" />
          </linearGradient>
          <pattern id="scared" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect x="0" y="0" width="8" height="8" fill="#bbb" />
            <polyline points="0,8 4,0 8,8" fill="none" stroke="#e53935" strokeWidth="2" />
          </pattern>
          <radialGradient id="caliperGray" cx="50%" cy="50%" r="80%">
            <stop offset="0%" stopColor="#eee" />
            <stop offset="100%" stopColor="#888" />
          </radialGradient>
          <pattern id="ventHoles" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="10" r="3" fill="#666" />
          </pattern>
        </defs>

        {/* Title */}
        <text x={svgW / 2} y="25" fontSize="14" fill="#222" textAnchor="middle" fontWeight="bold">Disc Brake Assembly</text>

        {/* Rotor label */}
        <text x={rotorX + rotorW / 2} y={rotorY - 20} fontSize="11" fill="#222" textAnchor="middle" fontWeight="bold">Brake Rotor</text>

        {/* Caliper labels */}
        <text x={outerCaliperX + 20} y={rotorY - 20} fontSize="10" fill="#666" textAnchor="middle">Outer Caliper</text>
        <text x={innerCaliperX + 15} y={rotorY - 20} fontSize="10" fill="#666" textAnchor="middle">Inner Caliper</text>

        {/* Rotor (condition-based) */}
        {rotorCondition === 'good' && (
          <g>
            <rect x={rotorX} y={rotorY} width={rotorW} height={rotorH} rx={8} fill="url(#rotorGradient)" stroke="#888" strokeWidth="2" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 15} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 30} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 45} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 60} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 75} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 90} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 105} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 120} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 135} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 150} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 165} width={12} height={8} fill="#666" />
          </g>
        )}
        {rotorCondition === 'grooves' && (
          <g>
            <rect x={rotorX} y={rotorY} width={rotorW} height={rotorH} rx={8} fill="url(#grooves)" stroke="#888" strokeWidth="2" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 15} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 30} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 45} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 60} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 75} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 90} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 105} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 120} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 135} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 150} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 165} width={12} height={8} fill="#666" />
          </g>
        )}
        {rotorCondition === 'overheated' && (
          <g>
            <rect x={rotorX} y={rotorY} width={rotorW} height={rotorH} rx={8} fill="url(#overheat)" stroke="#ff9800" strokeWidth="2" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 15} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 30} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 45} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 60} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 75} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 90} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 105} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 120} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 135} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 150} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 165} width={12} height={8} fill="#666" />
          </g>
        )}
        {rotorCondition === 'scared' && (
          <g>
            <rect x={rotorX} y={rotorY} width={rotorW} height={rotorH} rx={8} fill="url(#scared)" stroke="#e53935" strokeWidth="2" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 15} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 30} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 45} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 60} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 75} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 90} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 105} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 120} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 135} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 150} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 165} width={12} height={8} fill="#666" />
          </g>
        )}

        <g style={{ isolation: 'isolate' }}>
          {/* Caliper (left, stylized) */}
          <path 
            d={`M ${outerX - 64} ${padY - 15} 
                L ${outerX - 24} ${padY - 15} 
                Q ${outerX - 24} ${padY} ${outerX - 24} ${padY + 15}
                L ${outerX - 24} ${padY + padH - 15}
                Q ${outerX - 24} ${padY + padH} ${outerX - 24} ${padY + padH + 15}
                L ${outerX - 64} ${padY + padH + 15}
                Z`}
            fill="url(#caliperGray)" 
            stroke="#888" 
            strokeWidth="2"
          />
          {/* Caliper (right, stylized) */}
          <path 
            d={`M ${innerX + innerPadW + 24} ${padY - 15} 
                L ${innerX + innerPadW + 54} ${padY - 15} 
                Q ${innerX + innerPadW + 54} ${padY} ${innerX + innerPadW + 54} ${padY + 15}
                L ${innerX + innerPadW + 54} ${padY + padH - 15}
                Q ${innerX + innerPadW + 54} ${padY + padH} ${innerX + innerPadW + 54} ${padY + padH + 15}
                L ${innerX + innerPadW + 24} ${padY + padH + 15}
                Z`}
            fill="url(#caliperGray)" 
            stroke="#888" 
            strokeWidth="2"
          />
        </g>

        <g style={{ isolation: 'isolate' }}>
          {/* Backing Plates */}
          <rect x={outerX - 24} y={padY - 8} width={24} height={padH + 16} fill="#000" stroke="#333" strokeWidth="1" />
          <rect x={innerX + innerPadW} y={padY - 8} width={24} height={padH + 16} fill="#000" stroke="#333" strokeWidth="1" />

          {/* Inner Pad (left) */}
          <rect x={outerX} y={padY} width={outerPadW} height={padH} rx={6} fill={getPadColor(outerPad)} stroke="#333" strokeWidth="2" />
          {/* Outer Pad (right) */}
          <rect x={innerX} y={padY} width={innerPadW} height={padH} rx={6} fill={getPadColor(innerPad)} stroke="#333" strokeWidth="2" />
        </g>

        {/* Pad thickness numbers with units */}
        <text x={outerX + outerPadW / 2} y={padY - 12} fontSize="12" fill="#222" textAnchor="middle" fontWeight="bold">
          {Number.isFinite(outerPad) ? Math.round(outerPad) : 0}mm
        </text>
        <text x={innerX + innerPadW / 2} y={padY - 12} fontSize="12" fill="#222" textAnchor="middle" fontWeight="bold">
          {Number.isFinite(innerPad) ? Math.round(innerPad) : 0}mm
        </text>

        {/* Pad labels */}
        <text x={outerX + outerPadW / 2} y={padY + padH + 25} fontSize="11" fill="#222" textAnchor="middle" fontWeight="bold">Outer Pad</text>
        <text x={innerX + innerPadW / 2} y={padY + padH + 25} fontSize="11" fill="#222" textAnchor="middle" fontWeight="bold">Inner Pad</text>

        {/* Legend */}
        <g transform={`translate(0, ${svgH - 45})`}>
          <rect x="20" y="0" width="12" height="12" fill="#4caf50" rx="2" />
          <text x="36" y="10" fontSize="10" fill="#666">Good (≥5mm)</text>
          
          <rect x="100" y="0" width="12" height="12" fill="#ffd600" rx="2" />
          <text x="116" y="10" fontSize="10" fill="#666">Warning (4mm)</text>
          
          <rect x="180" y="0" width="12" height="12" fill="url(#yellowRed)" rx="2" />
          <text x="196" y="10" fontSize="10" fill="#666">Critical (3mm)</text>
          
          <rect x="260" y="0" width="12" height="12" fill="#e53935" rx="2" />
          <text x="276" y="10" fontSize="10" fill="#666">Replace (≤2mm)</text>
        </g>
      </svg>
    </Box>
  );
};

export default BrakePadSideView; 