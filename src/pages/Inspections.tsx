import React, { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

import { InspectionsTab } from '../components/Inspections/InspectionsTab';
import InspectionTypesView from '../components/Inspections/InspectionTypesView';
import { InspectionSchema as UIInspectionSchema, Tab as UITab, Field as UIField, FieldType as UIFldType, UIControl } from '../components/Inspections/utils';
import { INSPECTION_SCHEMAS, InspectionSchema as AppSchema } from '../config/inspectionSchemas';
import { FIELD_REGISTRY, FieldDef } from '../config/fieldRegistry';
import { fetchFieldRegistry, upsertFieldRegistryItem } from '../services/fieldRegistryApi';
import { fetchSchemas } from '../services/inspectionSchemasApi';

const MULTI_FIELD_IDS = new Set<string>([
  'engine_mounts',
  'cooling_hoses'
]);

function mapType(t: string, id: string): UIFldType {
  if (MULTI_FIELD_IDS.has(id)) return 'multiselect';
  switch (t) {
    case 'text':
    case 'number':
    case 'select':
    case 'photo':
    case 'date':
      return t as UIFldType;
    case 'checkbox':
      return 'boolean';
    case 'textarea':
      return 'text';
    default:
      return 'complex';
  }
}

function toUIField(def: FieldDef): UIField {
  const options = (def.options || []).map((o, idx) => ({ id: String(idx), label: o.label, value: o.value }));
  const type = mapType(def.type as string, def.id);
  const sampleAnswer = (() => {
    if (type === 'multiselect') {
      const v = (def as any).defaultValue as any;
      if (typeof v === 'string' && v.trim().length > 0) return v.split(',').map((s: string) => s.trim());
      if (Array.isArray(v)) return v;
      return [] as string[];
    }
    return (def as any).defaultValue as any;
  })();
  return {
    id: def.id,
    name: def.label,
    type,
    required: typeof def.required === 'boolean' ? def.required : false,
    options,
    placeholder: def.placeholder,
    min: (def as any).min,
    max: (def as any).max,
    helpText: def.description,
    sampleAnswer,
    multiple: (def as any).multiple,
    uiControl: (() => {
      // default control selection; can be overridden later if we add registry ui metadata
      if (type === 'photo' || type === 'signature') return 'upload' as UIControl;
      if (type === 'boolean') return 'switch' as UIControl;
      if (type === 'select' && (def as any).multiple) return 'chips' as UIControl;
      if (type === 'select') return 'dropdown' as UIControl;
      return undefined;
    })()
  };
}

function buildUISchema(appSchema: AppSchema): UIInspectionSchema {
  const tabs: UITab[] = appSchema.tabOrder.map((tabKey) => {
    const fieldIds = appSchema.fieldsByTab[tabKey] || [];
    const fields: UIField[] = fieldIds
      .map(fid => FIELD_REGISTRY[fid])
      .filter(Boolean)
      .map(toUIField);
    const name = tabKey.charAt(0).toUpperCase() + tabKey.slice(1);
    return { id: tabKey, name, fields };
  });
  return { tabs };
}

const InspectionsPage: React.FC = () => {
  // Choose VSI (largest) to showcase; could be made selectable later
  const appSchema = INSPECTION_SCHEMAS.vsi;

  const [liveRegistry, setLiveRegistry] = useState<Record<string, Partial<FieldDef>>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveSchemas, setLiveSchemas] = useState<Record<string, any> | null>(null);
  const [selectedType, setSelectedType] = useState<string>('vsi');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [fieldsRes, schemasRes] = await Promise.all([
          fetchFieldRegistry(),
          fetchSchemas().catch(() => null)
        ]);
        if (!mounted) return;
        const map: Record<string, Partial<FieldDef>> = {};
        for (const f of fieldsRes.fields) {
          map[f.id] = {
            id: f.id,
            label: f.label,
            type: f.type as any,
            multiple: f.multiple,
            options: f.options?.map(o => ({ value: o.value, label: o.label })),
            description: f.description,
            placeholder: f.placeholder,
            min: f.min,
            max: f.max,
            // Note: uiControl is used only by UI components; we forward it via toUIField
            uiControl: (f as any).uiControl
          } as any;
        }
        setLiveRegistry(map);
        if (schemasRes) {
          setLiveSchemas(schemasRes.schemas || null);
          const first = Object.keys(schemasRes.schemas || {})[0];
          setSelectedType(first || 'vsi');
        }
        setError(null);
      } catch (e: any) {
        console.error('Failed to fetch field registry', e);
        setError(e?.message || 'Failed to load field registry');
      } finally {
        setLoading(false);
      }
    })();
    const onSchemasUpdated = () => {
      // Refresh field registry merge and trigger InspectionsTab to rebuild view if needed
      (async () => {
        try {
          const [fieldsRes, schemasRes] = await Promise.all([
            fetchFieldRegistry(),
            fetchSchemas().catch(() => null)
          ]);
          if (!mounted) return;
          const map: Record<string, Partial<FieldDef>> = {};
          for (const f of fieldsRes.fields) {
            map[f.id] = {
              id: f.id,
              label: f.label,
              type: f.type as any,
              multiple: f.multiple,
              options: f.options?.map(o => ({ value: o.value, label: o.label })),
              description: f.description,
              placeholder: f.placeholder,
              min: f.min,
              max: f.max,
              uiControl: (f as any).uiControl
            } as any;
          }
          setLiveRegistry(map);
          if (schemasRes) setLiveSchemas(schemasRes.schemas || null);
        } catch {}
      })();
    };
    window.addEventListener('schemas:updated', onSchemasUpdated as any);
    return () => { mounted = false; window.removeEventListener('schemas:updated', onSchemasUpdated as any); };
  }, []);

  const uiSchema = useMemo(() => {
    try {
      // Merge live registry overrides into FIELD_REGISTRY snapshot for rendering
      const merged: any = { ...FIELD_REGISTRY };
      Object.entries(liveRegistry).forEach(([id, overrides]) => {
        if (merged[id]) merged[id] = { ...merged[id], ...overrides };
        else merged[id] = overrides;
      });
      // Prefer live schema (current implementation uses VSI by default)
      const schema = liveSchemas?.['vsi'] ?? appSchema;
      const tabs: UITab[] = (schema.tabOrder || []).map((tabKey: string) => {
        const fieldIds = schema.fieldsByTab?.[tabKey] || [];
        const fields: UIField[] = fieldIds
          .map(fid => merged[fid])
          .filter(Boolean)
          .map(toUIField);
        const name = tabKey.charAt(0).toUpperCase() + tabKey.slice(1);
        return { id: tabKey, name, fields };
      });
      return { tabs } as UIInspectionSchema;
    } catch (e) {
      console.error('Failed to build UI schema', e);
      return null;
    }
  }, [appSchema, liveRegistry, liveSchemas]);

  if (loading && !uiSchema) {
    return (
      <Box sx={{ p: 2 }}>
        <CircularProgress size={20} />
      </Box>
    );
  }
  if (!uiSchema) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">Failed to load Inspections schema.</Alert>
      </Box>
    );
  }

  const [activeView, setActiveView] = useState<'fields' | 'types'>('fields');

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ p: 2, pb: 0, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="h5" component="h1" sx={{ flex: 1 }}>Inspections</Typography>
        <Select size="small" value={selectedType} onChange={(e) => setSelectedType(e.target.value)} sx={{ minWidth: 180 }}>
          {Object.keys(liveSchemas || { vsi: {} }).map((key) => (
            <MenuItem key={key} value={key}>{liveSchemas?.[key]?.title || key}</MenuItem>
          ))}
        </Select>
        <Button size="small" variant={activeView === 'fields' ? 'contained' : 'outlined'} onClick={() => setActiveView('fields')}>Fields</Button>
        <Button size="small" variant={activeView === 'types' ? 'contained' : 'outlined'} onClick={() => setActiveView('types')}>Inspection Types</Button>
      </Box>
      {activeView === 'fields' ? (
        <InspectionsTab schema={uiSchema} inspectionType={selectedType} />
      ) : (
        <Box sx={{ p: 2 }}>
          <InspectionTypesView />
        </Box>
      )}
    </Box>
  );
};

export default InspectionsPage;


