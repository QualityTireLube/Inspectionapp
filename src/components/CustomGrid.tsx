import React from 'react';
import Grid from '@mui/material/Grid';
import type { GridProps } from '@mui/material/Grid';

// This component provides backward compatibility for Grid v1 props
// while using the new Grid v2 component under the hood (MUI v7)
interface CustomGridProps extends Omit<GridProps, 'size'> {
  item?: boolean;
  xs?: number | 'auto';
  sm?: number | 'auto';
  md?: number | 'auto';
  lg?: number | 'auto';
  xl?: number | 'auto';
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
