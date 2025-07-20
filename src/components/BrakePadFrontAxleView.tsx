import React from 'react';
import { Box } from '@mui/material';
import { BrakePadCondition } from '../types/quickCheck';

export type RotorCondition = 'good' | 'grooves' | 'overheated' | 'scared';

interface BrakePadFrontAxleViewProps {
  driverInnerPad: BrakePadCondition;
  driverOuterPad: BrakePadCondition;
  driverRotorCondition?: RotorCondition;
  passengerInnerPad: BrakePadCondition;
  passengerOuterPad: BrakePadCondition;
  passengerRotorCondition?: RotorCondition;
  width?: number;
  height?: number;
  title?: string;
  isRearAxle?: boolean;
}

const getPadColor = (condition: BrakePadCondition) => {
  switch (condition) {
    case 'good': return '#4caf50'; // Green
    case 'warning': return '#ffd600'; // Yellow
    case 'bad': return '#e53935'; // Red
    case 'critical': return '#d32f2f'; // Dark Red
    case 'metal_to_metal': return '#b71c1c'; // Very Dark Red
    case 'off': return '#9e9e9e'; // Gray
    case 'drums_not_checked': return '#607d8b'; // Blue Gray
    default: return '#4caf50'; // Default to green
  }
};

const MAX_PAD_W = 40; // Maximum pad width in pixels (twice original size)
const MIN_PAD_W = 8;  // Minimum pad width in pixels (twice original size)

const getPadWidth = (condition: BrakePadCondition) => {
  switch (condition) {
    case 'good': return MAX_PAD_W; // Full width
    case 'warning': return MAX_PAD_W * 0.7; // 70% width
    case 'bad': return MAX_PAD_W * 0.4; // 40% width
    case 'critical': return MAX_PAD_W * 0.2; // 20% width
    case 'metal_to_metal': return MIN_PAD_W; // Minimum width
    case 'off': return MAX_PAD_W * 0.8; // 80% width (assumed good condition when off)
    case 'drums_not_checked': return MAX_PAD_W * 0.9; // 90% width (neutral condition)
    default: return MAX_PAD_W; // Default to full width
  }
};

const BrakePadFrontAxleView: React.FC<BrakePadFrontAxleViewProps> = ({
  driverInnerPad,
  driverOuterPad,
  driverRotorCondition = 'good',
  passengerInnerPad,
  passengerOuterPad,
  passengerRotorCondition = 'good',
  width = 650,
  height = 350,
  title = 'Front Brakes',
  isRearAxle = false
}) => {
  const svgW = 650;
  const svgH = 350;
  
  // Enlarged component dimensions (twice as big)
  const rotorW = 40; // Twice the original size (was 20)
  const rotorH = 180; // Twice the original size (was 90)
  const padH = 100; // Twice the original size (was 50)
  
  // Left side (Passenger) positioning
  const leftCenterX = svgW * 0.25; // 25% from left
  const leftRotorX = leftCenterX - rotorW / 2;
  const leftRotorY = 45; // Raised more for larger component
  const leftPadY = leftRotorY + (rotorH - padH) / 2; // Center pads within rotor
  
  // Right side (Driver) positioning
  const rightCenterX = svgW * 0.75; // 75% from left
  const rightRotorX = rightCenterX - rotorW / 2;
  const rightRotorY = 45; // Raised more for larger component
  const rightPadY = rightRotorY + (rotorH - padH) / 2; // Center pads within rotor
  
  // Calculate pad widths
  const driverInnerPadW = getPadWidth(driverInnerPad);
  const driverOuterPadW = getPadWidth(driverOuterPad);
  const passengerInnerPadW = getPadWidth(passengerInnerPad);
  const passengerOuterPadW = getPadWidth(passengerOuterPad);
  
  // For rear axle, swap the sides: Driver on left, Passenger on right
  // For front axle, keep original: Passenger on left, Driver on right
  let leftSideData, rightSideData, leftLabel, rightLabel;
  let leftOuterPadW, leftInnerPadW, rightOuterPadW, rightInnerPadW;
  
  if (isRearAxle) {
    // Rear axle: Driver on left, Passenger on right
    // For passenger side (right), swap inner/outer to match vehicle perspective
    leftSideData = { inner: driverInnerPad, outer: driverOuterPad, condition: driverRotorCondition };
    rightSideData = { inner: passengerOuterPad, outer: passengerInnerPad, condition: passengerRotorCondition };
    leftLabel = "Driver";
    rightLabel = "Passenger";
    leftOuterPadW = driverOuterPadW;
    leftInnerPadW = driverInnerPadW;
    rightOuterPadW = passengerInnerPadW; // Swapped for passenger rear
    rightInnerPadW = passengerOuterPadW; // Swapped for passenger rear
  } else {
    // Front axle: Passenger on left, Driver on right
    // For driver side (right), swap inner/outer to match vehicle perspective
    leftSideData = { inner: passengerInnerPad, outer: passengerOuterPad, condition: passengerRotorCondition };
    rightSideData = { inner: driverOuterPad, outer: driverInnerPad, condition: driverRotorCondition };
    leftLabel = "Passenger";
    rightLabel = "Driver";
    leftOuterPadW = passengerOuterPadW;
    leftInnerPadW = passengerInnerPadW;
    rightOuterPadW = driverInnerPadW; // Swapped for driver front
    rightInnerPadW = driverOuterPadW; // Swapped for driver front
  }
  
  // Left side positions
  const leftOuterX = leftRotorX - leftOuterPadW;
  const leftInnerX = leftRotorX + rotorW;
  
  // Right side positions
  const rightOuterX = rightRotorX - rightOuterPadW;
  const rightInnerX = rightRotorX + rotorW;

  const renderBrakeAssembly = (
    rotorX: number,
    rotorY: number,
    padY: number,
    outerPadW: number,
    innerPadW: number,
    outerPad: BrakePadCondition,
    innerPad: BrakePadCondition,
    rotorCondition: RotorCondition,
    outerX: number,
    innerX: number,
    sideLabel: string
  ) => {
    // Check if both pads are set to drums not checked
    const isDrumBrake = outerPad === 'drums_not_checked' && innerPad === 'drums_not_checked';
    
    return (
      <g>
        {/* Side Label */}
        <text x={rotorX + rotorW / 2} y={rotorY - 5} fontSize="16" fill="#222" textAnchor="middle" fontWeight="bold">
          {sideLabel}
        </text>

        {isDrumBrake ? (
          /* Drum Brake Assembly */
          <g>
            {/* Embed the drum brake SVG illustration */}
            <g transform={`translate(${rotorX - 45}, ${rotorY - 10}) scale(0.6)`}>
              {/* Drum housing (transparent) */}
              <circle cx="100" cy="100" r="85" 
                      fill="rgba(120, 120, 120, 0.3)" 
                      stroke="#666" 
                      strokeWidth="3"/>
              
              {/* Brake shoes (curved segments) */}
              <path d="M 100 35 A 65 65 0 0 1 155 85 L 145 95 A 55 55 0 0 0 100 45 Z" 
                    fill="#8B4513" 
                    stroke="#654321" 
                    strokeWidth="2"/>
              
              <path d="M 155 85 A 65 65 0 0 1 155 115 L 145 105 A 55 55 0 0 0 145 95 Z" 
                    fill="#8B4513" 
                    stroke="#654321" 
                    strokeWidth="2"/>
              
              <path d="M 155 115 A 65 65 0 0 1 45 115 L 55 105 A 55 55 0 0 0 145 105 Z" 
                    fill="#8B4513" 
                    stroke="#654321" 
                    strokeWidth="2"/>
              
              <path d="M 45 115 A 65 65 0 0 1 45 85 L 55 95 A 55 55 0 0 0 55 105 Z" 
                    fill="#8B4513" 
                    stroke="#654321" 
                    strokeWidth="2"/>
              
              <path d="M 45 85 A 65 65 0 0 1 100 35 L 100 45 A 55 55 0 0 0 55 95 Z" 
                    fill="#8B4513" 
                    stroke="#654321" 
                    strokeWidth="2"/>
              
              {/* Central hub/wheel cylinder area */}
              <circle cx="100" cy="100" r="25" 
                      fill="#444" 
                      stroke="#333" 
                      strokeWidth="2"/>
              
              {/* Wheel cylinder (top) */}
              <rect x="95" y="75" width="10" height="15" 
                    fill="#666" 
                    stroke="#333" 
                    strokeWidth="1"/>
              
              {/* Adjuster mechanism (bottom) */}
              <rect x="95" y="110" width="10" height="15" 
                    fill="#666" 
                    stroke="#333" 
                    strokeWidth="1"/>
              
              {/* Return springs */}
              <line x1="70" y1="70" x2="130" y2="130" 
                    stroke="#FF6B6B" 
                    strokeWidth="2"/>
              <line x1="130" y1="70" x2="70" y2="130" 
                    stroke="#FF6B6B" 
                    strokeWidth="2"/>
              
              {/* Spring coils */}
              <circle cx="85" cy="85" r="3" 
                      fill="none" 
                      stroke="#FF6B6B" 
                      strokeWidth="2"/>
              <circle cx="115" cy="85" r="3" 
                      fill="none" 
                      stroke="#FF6B6B" 
                      strokeWidth="2"/>
              <circle cx="85" cy="115" r="3" 
                      fill="none" 
                      stroke="#FF6B6B" 
                      strokeWidth="2"/>
              <circle cx="115" cy="115" r="3" 
                      fill="none" 
                      stroke="#FF6B6B" 
                      strokeWidth="2"/>
              
              {/* Brake lining (friction material) on shoes */}
              <path d="M 100 40 A 60 60 0 0 1 150 90 L 145 90 A 55 55 0 0 0 100 45 Z" 
                    fill="#A0522D" 
                    opacity="0.8"/>
              <path d="M 150 90 A 60 60 0 0 1 150 110 L 145 105 A 55 55 0 0 0 145 95 Z" 
                    fill="#A0522D" 
                    opacity="0.8"/>
              <path d="M 150 110 A 60 60 0 0 1 50 110 L 55 105 A 55 55 0 0 0 145 105 Z" 
                    fill="#A0522D" 
                    opacity="0.8"/>
              <path d="M 50 110 A 60 60 0 0 1 50 90 L 55 95 A 55 55 0 0 0 55 105 Z" 
                    fill="#A0522D" 
                    opacity="0.8"/>
              <path d="M 50 90 A 60 60 0 0 1 100 40 L 100 45 A 55 55 0 0 0 55 95 Z" 
                    fill="#A0522D" 
                    opacity="0.8"/>
              
              {/* Drum edge highlight */}
              <circle cx="100" cy="100" r="85" 
                      fill="none" 
                      stroke="rgba(200, 200, 200, 0.6)" 
                      strokeWidth="1"/>
            </g>
            
            {/* Drum brake label */}
            <text x={rotorX + rotorW / 2} y={rotorY + rotorH + 40} fontSize="18" fill="#222" textAnchor="middle" fontWeight="bold">
              🥁 Drums not checked
            </text>
          </g>
        ) : (
          /* Disc Brake Assembly */
          <g>
        
        {/* Rotor (condition-based) */}
        {rotorCondition === 'good' && (
          <g>
            <rect x={rotorX} y={rotorY} width={rotorW} height={rotorH} rx={8} fill="url(#rotorGradient)" stroke="#888" strokeWidth="2" />
            {/* Ventilation holes (twice as big) */}
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 16} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 30} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 44} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 58} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 72} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 86} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 100} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 114} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 128} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 142} width={12} height={8} fill="#666" />
          </g>
        )}
        {rotorCondition === 'grooves' && (
          <g>
            <rect x={rotorX} y={rotorY} width={rotorW} height={rotorH} rx={8} fill="url(#grooves)" stroke="#888" strokeWidth="2" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 16} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 30} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 44} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 58} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 72} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 86} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 100} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 114} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 128} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 142} width={12} height={8} fill="#666" />
          </g>
        )}
        {rotorCondition === 'overheated' && (
          <g>
            <rect x={rotorX} y={rotorY} width={rotorW} height={rotorH} rx={8} fill="url(#overheat)" stroke="#ff9800" strokeWidth="2" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 16} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 30} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 44} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 58} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 72} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 86} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 100} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 114} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 128} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 142} width={12} height={8} fill="#666" />
          </g>
        )}
        {rotorCondition === 'scared' && (
          <g>
            <rect x={rotorX} y={rotorY} width={rotorW} height={rotorH} rx={8} fill="url(#scared)" stroke="#e53935" strokeWidth="2" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 16} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 30} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 44} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 58} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 72} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 86} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 100} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 114} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 128} width={12} height={8} fill="#666" />
            <rect x={rotorX + rotorW/2 - 6} y={rotorY + 142} width={12} height={8} fill="#666" />
          </g>
        )}

        {/* Calipers (twice as big) */}
        <g style={{ isolation: 'isolate' }}>
          {/* Caliper (left, stylized) */}
          <path 
            d={`M ${outerX - 40} ${padY - 16} 
                L ${outerX - 16} ${padY - 16} 
                Q ${outerX - 16} ${padY} ${outerX - 16} ${padY + 16}
                L ${outerX - 16} ${padY + padH - 16}
                Q ${outerX - 16} ${padY + padH} ${outerX - 16} ${padY + padH + 16}
                L ${outerX - 40} ${padY + padH + 16}
                Z`}
            fill="url(#caliperGray)" 
            stroke="#888" 
            strokeWidth="2"
          />
          {/* Caliper (right, stylized) */}
          <path 
            d={`M ${innerX + innerPadW + 16} ${padY - 16} 
                L ${innerX + innerPadW + 40} ${padY - 16} 
                Q ${innerX + innerPadW + 40} ${padY} ${innerX + innerPadW + 40} ${padY + 16}
                L ${innerX + innerPadW + 40} ${padY + padH - 16}
                Q ${innerX + innerPadW + 40} ${padY + padH} ${innerX + innerPadW + 40} ${padY + padH + 16}
                L ${innerX + innerPadW + 16} ${padY + padH + 16}
                Z`}
            fill="url(#caliperGray)" 
            stroke="#888" 
            strokeWidth="2"
          />
        </g>

        {/* Backing Plates */}
        <g style={{ isolation: 'isolate' }}>
          <rect x={outerX - 16} y={padY - 8} width={16} height={padH + 16} fill="#000" stroke="#333" strokeWidth="2" />
          <rect x={innerX + innerPadW} y={padY - 8} width={16} height={padH + 16} fill="#000" stroke="#333" strokeWidth="2" />

          {/* Outer Pad (left) */}
          <rect x={outerX} y={padY} width={outerPadW} height={padH} rx={6} fill={getPadColor(outerPad)} stroke="#333" strokeWidth="2" />
          {/* Inner Pad (right) */}
          <rect x={innerX} y={padY} width={innerPadW} height={padH} rx={6} fill={getPadColor(innerPad)} stroke="#333" strokeWidth="2" />
        </g>

        {/* Pad condition labels */}
        <text x={outerX + outerPadW / 2} y={padY - 16} fontSize="16" fill="#222" textAnchor="middle" fontWeight="bold">
          {outerPad === 'good' ? '✅' : outerPad === 'warning' ? '⚠️' : outerPad === 'bad' ? '❌' : 
           outerPad === 'critical' ? '🚨' : outerPad === 'metal_to_metal' ? 'M2M' : outerPad === 'off' ? '🛞' : 
           outerPad === 'drums_not_checked' ? '🥁' : outerPad}
        </text>
        <text x={innerX + innerPadW / 2} y={padY - 16} fontSize="16" fill="#222" textAnchor="middle" fontWeight="bold">
          {innerPad === 'good' ? '✅' : innerPad === 'warning' ? '⚠️' : innerPad === 'bad' ? '❌' : 
           innerPad === 'critical' ? '🚨' : innerPad === 'metal_to_metal' ? 'M2M' : innerPad === 'off' ? '🛞' : 
           innerPad === 'drums_not_checked' ? '🥁' : innerPad}
        </text>

        {/* Pad labels */}
        <text x={outerX + outerPadW / 2} y={padY + padH + 30} fontSize="18" fill="#222" textAnchor="middle" fontWeight="bold">Outer</text>
        <text x={innerX + innerPadW / 2} y={padY + padH + 30} fontSize="18" fill="#222" textAnchor="middle" fontWeight="bold">Inner</text>
          </g>
        )}
      </g>
    );
  };

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
          <pattern id="grooves" width="4" height="4" patternUnits="userSpaceOnUse">
            <rect x="0" y="0" width="4" height="4" fill="#bbb" />
            <line x1="0" y1="0" x2="4" y2="4" stroke="#888" strokeWidth="1" />
          </pattern>
          <linearGradient id="overheat" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ff9800" />
            <stop offset="100%" stopColor="#bbb" />
          </linearGradient>
          <pattern id="scared" width="4" height="4" patternUnits="userSpaceOnUse">
            <rect x="0" y="0" width="4" height="4" fill="#bbb" />
            <polyline points="0,4 2,0 4,4" fill="none" stroke="#e53935" strokeWidth="1" />
          </pattern>
          <radialGradient id="caliperGray" cx="50%" cy="50%" r="80%">
            <stop offset="0%" stopColor="#eee" />
            <stop offset="100%" stopColor="#888" />
          </radialGradient>
        </defs>

        {/* Title */}
        <text x={svgW / 2} y="20" fontSize="26" fill="#222" textAnchor="middle" fontWeight="bold">{title}</text>

        {/* Left Side */}
        {renderBrakeAssembly(
          leftRotorX,
          leftRotorY,
          leftPadY,
          leftOuterPadW,
          leftInnerPadW,
          leftSideData.outer,
          leftSideData.inner,
          leftSideData.condition,
          leftOuterX,
          leftInnerX,
          leftLabel
        )}

        {/* Right Side */}
        {renderBrakeAssembly(
          rightRotorX,
          rightRotorY,
          rightPadY,
          rightOuterPadW,
          rightInnerPadW,
          rightSideData.outer,
          rightSideData.inner,
          rightSideData.condition,
          rightOuterX,
          rightInnerX,
          rightLabel
        )}

        {/* Connecting axle line */}
        <line 
          x1={leftRotorX + rotorW} 
          y1={leftRotorY + rotorH / 2} 
          x2={rightRotorX} 
          y2={rightRotorY + rotorH / 2} 
          stroke="#333" 
          strokeWidth="6"
          strokeDasharray="10,10"
        />

        {/* Legend */}
        <g transform={`translate(${svgW / 2 - 150}, ${svgH - 85})`}>
          <rect x="0" y="0" width="12" height="12" fill="#4caf50" rx="2" />
          <text x="16" y="10" fontSize="12" fill="#666">✅ Good</text>
          
          <rect x="80" y="0" width="12" height="12" fill="#ffd600" rx="2" />
          <text x="96" y="10" fontSize="12" fill="#666">⚠️ Warning</text>
          
          <rect x="170" y="0" width="12" height="12" fill="#e53935" rx="2" />
          <text x="186" y="10" fontSize="12" fill="#666">❌ Bad</text>
          
          <rect x="0" y="15" width="12" height="12" fill="#d32f2f" rx="2" />
          <text x="16" y="25" fontSize="12" fill="#666">🚨 Critical</text>
          
          <rect x="80" y="15" width="12" height="12" fill="#b71c1c" rx="2" />
          <text x="96" y="25" fontSize="12" fill="#666">Metal to Metal</text>
          
          <rect x="170" y="15" width="12" height="12" fill="#9e9e9e" rx="2" />
          <text x="186" y="25" fontSize="12" fill="#666">🛞 Off</text>
          
          <rect x="0" y="30" width="12" height="12" fill="#607d8b" rx="2" />
          <text x="16" y="40" fontSize="12" fill="#666">🥁 Drums not checked</text>
        </g>
      </svg>
    </Box>
  );
};

export default BrakePadFrontAxleView; 