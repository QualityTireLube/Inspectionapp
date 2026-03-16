import React from 'react';
import InspectionPage from './InspectionPage';
import { INSPECTION_SCHEMAS } from '../config/inspectionSchemas';
import { fetchSchemas } from '../services/inspectionSchemasApi';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';

const QuickCheck: React.FC = () => {
  const [schema, setSchema] = React.useState(INSPECTION_SCHEMAS.quick_check);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await fetchSchemas();
        if (!mounted) return;
        const live = data.schemas?.quick_check;
        if (live) {
          const staticSchema = INSPECTION_SCHEMAS.quick_check;
          setSchema({
            title: live.title || staticSchema.title,
            // Only use Firestore tabOrder/fieldsByTab if they are actually populated;
            // otherwise keep the static definition which has the real form tabs.
            tabOrder: (live.tabOrder && live.tabOrder.length > 0)
              ? live.tabOrder
              : staticSchema.tabOrder,
            fieldsByTab: (live.fieldsByTab && Object.keys(live.fieldsByTab).length > 0)
              ? live.fieldsByTab
              : staticSchema.fieldsByTab,
            draftKeyPrefix: staticSchema.draftKeyPrefix,
            submitType: staticSchema.submitType,
            showBottomNav: live.showBottomNav ?? staticSchema.showBottomNav,
          });
        }
      } catch {
        // fallback silently to static
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (loading) return (
    <Box sx={{ p: 2 }}>
      <CircularProgress size={20} />
    </Box>
  );

  return <InspectionPage schema={schema} />;
};

export default QuickCheck; 
