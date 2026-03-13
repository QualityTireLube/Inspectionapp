import React from 'react';
import { useParams } from 'react-router-dom';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import InspectionPage from './InspectionPage';
import type { InspectionSchema } from '../config/inspectionSchemas';
import { fetchSchemas } from '../services/inspectionSchemasApi';

const DynamicInspection: React.FC = () => {
  const { inspectionType } = useParams();
  const [schema, setSchema] = React.useState<InspectionSchema | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchSchemas();
        if (!mounted) return;
        const type = (inspectionType || '').toLowerCase();
        const live: any = (data as any)?.schemas?.[type];
        if (!live) {
          setError(`Inspection type "${inspectionType}" not found`);
          setSchema(null);
          return;
        }
        const built: InspectionSchema = {
          title: live.title || type,
          tabOrder: Array.isArray(live.tabOrder) ? live.tabOrder : [],
          fieldsByTab: typeof live.fieldsByTab === 'object' && live.fieldsByTab ? live.fieldsByTab : {},
          draftKeyPrefix: `${type}Draft:`,
          submitType: type
        };
        setSchema(built);
      } catch (e: any) {
        setError(e?.message || 'Failed to load schema');
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [inspectionType]);

  if (loading) return (
    <Box sx={{ p: 2 }}>
      <CircularProgress size={20} />
    </Box>
  );

  if (error) return (
    <Box sx={{ p: 2 }}>
      <Alert severity="error">{error}</Alert>
    </Box>
  );

  if (!schema) return null;
  return <InspectionPage schema={schema} />;
};

export default DynamicInspection;


