import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Box,
  Tooltip,
  Paper
} from '@mui/material';
import {
  Print as PrintIcon,
  Archive as ArchiveIcon,
  Unarchive as UnarchiveIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { StaticSticker } from '../types/stickers';

interface StickerCardProps {
  sticker: StaticSticker;
  onClick: () => void;
  onPrint: () => void;
  onToggleArchive: () => void;
  onEdit?: () => void;
  showEditButton?: boolean;
  variant?: 'compact' | 'expanded';
}

const StickerCard: React.FC<StickerCardProps> = ({
  sticker,
  onClick,
  onPrint,
  onToggleArchive,
  onEdit,
  showEditButton = false,
  variant = 'compact'
}) => {
  return (
    <Card
      onClick={onClick}
      sx={{
        width: '99.5%', // Increased to 99.5% for maximum width usage
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 3
        },
        border: '1px solid #e0e0e0',
        borderRadius: 2, // Restored the original rounded corners
        mx: 'auto', // Center the card
        mb: 1 // Reduced bottom margin for less spacing between cards
      }}
    >
      <CardContent sx={{ p: 1.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {/* Left side - Main content */}
          <Box sx={{ flex: 1 }}>
            {/* Top section */}
            <Box sx={{ mb: 0.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.25 }}>
                {sticker.decodedDetails.make} {sticker.decodedDetails.model}
              </Typography>
              <Chip 
                label={sticker.oilType.name} 
                size="small" 
                color="primary" 
                sx={{ mb: 0.25 }}
              />
              <Typography variant="body2" color="text.secondary">
                Current Mileage: {sticker.mileage?.toLocaleString() || 'N/A'}
              </Typography>
            </Box>
            
            {/* Bottom section */}
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              VIN: {sticker.vin}
            </Typography>
          </Box>
          
          {/* Right side - Icons */}
          <Box sx={{ display: 'flex', gap: 0.25, alignItems: 'center' }}>
            <Tooltip title="Print Sticker">
              <IconButton 
                size="small" 
                onClick={(e) => {
                  e.stopPropagation();
                  onPrint();
                }}
                sx={{ color: 'primary.main' }}
              >
                <PrintIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            
            <Tooltip title={sticker.archived ? "Unarchive" : "Archive"}>
              <IconButton 
                size="small" 
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleArchive();
                }}
                sx={{ color: sticker.archived ? 'success.main' : 'warning.main' }}
              >
                {sticker.archived ? <UnarchiveIcon fontSize="small" /> : <ArchiveIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
            
            {showEditButton && onEdit && (
              <Tooltip title="Edit">
                <IconButton 
                  size="small" 
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  sx={{ color: 'info.main' }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default StickerCard; 