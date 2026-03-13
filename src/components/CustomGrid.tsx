import React from 'react';
import Grid from '@mui/material/Grid';
import type { GridProps } from '@mui/material/Grid';

// This component provides backward compatibility for Grid v1 props
// while using the new Grid v2 component under the hood (MUI v7)
interface CustomGridProps extends Omit<GridProps, 'size'> {
  // Legacy v1 props that we'll convert to v2 'size' prop
  item?: boolean; // No longer needed in v2, will be ignored
  xs?: number | 'auto' | boolean;
  sm?: number | 'auto' | boolean;
  md?: number | 'auto' | boolean;
  lg?: number | 'auto' | boolean;
  xl?: number | 'auto' | boolean;
  // Allow size prop for direct v2 usage
  size?: GridProps['size'];
}

const CustomGrid: React.FC<CustomGridProps> = ({
  item, // Ignored - not needed in Grid v2
  xs,
  sm,
  md,
  lg,
  xl,
  size,
  ...rest
}) => {
  // If size prop is provided directly, use it (v2 style)
  // Otherwise, convert legacy breakpoint props to size object
  const computedSize = size ?? (
    (xs !== undefined || sm !== undefined || md !== undefined || lg !== undefined || xl !== undefined)
      ? {
          ...(xs !== undefined && { xs }),
          ...(sm !== undefined && { sm }),
          ...(md !== undefined && { md }),
          ...(lg !== undefined && { lg }),
          ...(xl !== undefined && { xl }),
        }
      : undefined
  );

  return <Grid size={computedSize} {...rest} />;
};

export default CustomGrid;
