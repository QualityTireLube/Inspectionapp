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
          setSchema({
            title: live.title || 'Quick Check',
            tabOrder: live.tabOrder || [],
            fieldsByTab: live.fieldsByTab || {},
            draftKeyPrefix: INSPECTION_SCHEMAS.quick_check.draftKeyPrefix,
            submitType: INSPECTION_SCHEMAS.quick_check.submitType
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
