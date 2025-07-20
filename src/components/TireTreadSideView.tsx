import React from 'react';
import { Box } from '@mui/material';

interface TireTreadSideViewProps {
  innerEdgeCondition: 'green' | 'yellow' | 'red';
  innerCondition: 'green' | 'yellow' | 'red';
  centerCondition: 'green' | 'yellow' | 'red';
  outerCondition: 'green' | 'yellow' | 'red';
  outerEdgeCondition: 'green' | 'yellow' | 'red';
  innerEdgeDepth: number;
  innerDepth: number;
  centerDepth: number;
  outerDepth: number;
  outerEdgeDepth: number;
  width?: number;
  height?: number;
}

const MAX_TREAD = 10; // 10/32nds = full tread
const MIN_TREAD = 0;  // 0/32nds = bald
const SECTION_LABELS = [
  'Outer Edge',
  'Outer',
  'Center',
  'Inner',
  'Inner Edge',
];

const getTireColor = (depths: number[]) => {
  if (depths.some(d => d <= 3)) return '#e53935'; // Red
  if (depths.some(d => d === 4 || d === 5)) return '#ffd600'; // Yellow
  return 'url(#tireGradient)'; // Default black/gray
};

// Helper to get tread bar color based on depth
const getBarColor = (depth: number) => {
  if (depth <= 3) return '#e53935'; // Red
  if (depth === 4 || depth === 5) return '#ffd600'; // Yellow
  return '#4caf50'; // Green
};

const TireTreadSideView: React.FC<TireTreadSideViewProps> = ({
  innerEdgeCondition,
  innerCondition,
  centerCondition,
  outerCondition,
  outerEdgeCondition,
  innerEdgeDepth,
  innerDepth,
  centerDepth,
  outerDepth,
  outerEdgeDepth,
  width = 300,
  height = 120
}) => {
  const getColor = (condition: 'green' | 'yellow' | 'red') => {
    switch (condition) {
      case 'green':
        return 'rgba(76, 175, 80, 0.3)';
      case 'yellow':
        return 'rgba(255, 193, 7, 0.3)';
      case 'red':
        return 'rgba(244, 67, 54, 0.3)';
    }
  };

  // Map tread depth (0-10) to a fill height (max 40px for tread)
  const treadFill = (depth: number) => {
    const clamped = Math.max(MIN_TREAD, Math.min(MAX_TREAD, depth));
    return (clamped / MAX_TREAD) * 40; // 40px is the max tread height
  };

  const sectionW = 60;
  const sections = [
    { x: 0, color: outerEdgeCondition, depth: outerEdgeDepth },
    { x: 60, color: outerCondition, depth: outerDepth },
    { x: 120, color: centerCondition, depth: centerDepth },
    { x: 180, color: innerCondition, depth: innerDepth },
    { x: 240, color: innerEdgeCondition, depth: innerEdgeDepth },
  ];
  const depths = [outerEdgeDepth, outerDepth, centerDepth, innerDepth, innerEdgeDepth];
  const tireColor = getTireColor(depths);

  return (
    <Box sx={{ width, height }}>
      <svg width="100%" height="100%" viewBox="0 0 300 120" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="sidewallGradient" cx="50%" cy="80%" r="80%">
            <stop offset="0%" stopColor="#444" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#181818" stopOpacity="1" />
          </radialGradient>
          <linearGradient id="tireGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#353535" stopOpacity="1" />
            <stop offset="100%" stopColor="#181818" stopOpacity="1" />
          </linearGradient>
          <radialGradient id="tireHighlight" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#000" stopOpacity="0" />
          </radialGradient>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="2" dy="2" stdDeviation="2" floodOpacity="0.3" />
          </filter>
        </defs>

        {/* Tire sidewall (square with rounded top) */}
        <path d="M0,104 L0,75 Q0,60 20,60 L40,60 Q50,60 60,60 L240,60 Q250,60 260,60 L280,60 Q300,60 300,75 L300,104 Z" fill="url(#sidewallGradient)" filter="url(#shadow)" />
        {/* Subtle highlight */}
        <path d="M30,40 Q150,18 270,40" fill="none" stroke="url(#tireHighlight)" strokeWidth="8" />

        {/* Under-tread layer (shows when tread is worn) */}
        {sections.map((sec, i) => (
          <rect
            key={i}
            x={sec.x + 6}
            y={20}
            width={sectionW - 12}
            height={40}
            rx={8}
            fill="#b71c1c"
            opacity={0.18}
          />
        ))}
        {/* Tread blocks (height = tread depth) */}
        {sections.map((sec, i) => {
          const fillH = treadFill(sec.depth);
          const fillY = 60 - fillH;
          return (
            <g key={i}>
              {/* Tread fill (color based on depth) */}
              {i === 0 ? (
                // Outer Edge - rounded on left side
                sec.depth > 0 && (
                  <path
                    d={`M${sec.x + 6},${fillY + 15} Q${sec.x + 6},${fillY} ${sec.x + 6 + 20},${fillY} L${sec.x + sectionW - 6},${fillY} L${sec.x + sectionW - 6},${fillY + fillH} L${sec.x + 6},${fillY + fillH} Z`}
                    fill={getBarColor(sec.depth)}
                    stroke="#444"
                    strokeWidth="1.5"
                    opacity={0.95}
                  />
                )
              ) : i === 4 ? (
                // Inner Edge - rounded on right side
                sec.depth > 0 && (
                  <path
                    d={`M${sec.x + 6},${fillY} L${sec.x + sectionW - 26},${fillY} Q${sec.x + sectionW - 6},${fillY} ${sec.x + sectionW - 6},${fillY + 15} L${sec.x + sectionW - 6},${fillY + fillH} L${sec.x + 6},${fillY + fillH} Z`}
                    fill={getBarColor(sec.depth)}
                    stroke="#444"
                    strokeWidth="1.5"
                    opacity={0.95}
                  />
                )
              ) : (
                // Center sections - keep rectangular
                <rect
                  x={sec.x + 6}
                  y={fillY}
                  width={sectionW - 12}
                  height={fillH}
                  rx={8}
                  fill={getBarColor(sec.depth)}
                  stroke="#444"
                  strokeWidth="1.5"
                  opacity={0.95}
                />
              )}
            </g>
          );
        })}
        {/* Section dividers */}
        <g stroke="#666" strokeWidth="1" strokeDasharray="4,4" opacity="0.5">
          <line x1="60" y1="20" x2="60" y2="60" />
          <line x1="120" y1="20" x2="120" y2="60" />
          <line x1="180" y1="20" x2="180" y2="60" />
          <line x1="240" y1="20" x2="240" y2="60" />
        </g>
        {/* Section labels */}
        <g fill="#000" fontSize="12" textAnchor="middle">
          {SECTION_LABELS.map((label, i) => (
            <text key={label} x={i * 60 + 30} y="15">{label}</text>
          ))}
        </g>
        {/* Depth numbers */}
        <g fill="#fff" fontSize="13" fontWeight="bold" textAnchor="middle">
          {sections.map((sec, i) => (
            <text key={i} x={sec.x + 30} y="38">
              {Number.isFinite(sec.depth) ? Math.round(sec.depth) : 0}
            </text>
          ))}
        </g>
        {/* Tread depth unit label */}
        <text x="150" y="55" fill="#888" fontSize="11" textAnchor="middle">Tread Depth (32nds)</text>
      </svg>
    </Box>
  );
};

export default TireTreadSideView; 