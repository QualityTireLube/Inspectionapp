import React, { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Pagination from '@mui/material/Pagination';
import Chip from '@mui/material/Chip';

import { FieldPreview, getDetailPreviewText } from './FieldPreview';
import FieldEditor from './FieldEditor';
import FieldDetailDialog from './FieldDetailDialog';
import { upsertFieldRegistryItem } from '../../services/fieldRegistryApi';
import { fetchSchemas, updateSchema } from '../../services/inspectionSchemasApi';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import IconButton from '@mui/material/IconButton';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { v4 as uuidv4 } from 'uuid';
import { Field, FieldType, InspectionSchema, SortBy, Tab, buildMockSchema, filterByType, getAnswersText, paginate, searchMatches, sortFields } from './utils';

export interface InspectionsTabProps {
  schema?: InspectionSchema;
  inspectionType?: string; // which schema to edit (default 'vsi')
}

const ALL_TYPES: FieldType[] = ['text', 'number', 'date', 'datetime', 'time', 'select', 'multiselect', 'boolean', 'photo', 'signature', 'rating', 'checklist', 'location', 'currency', 'email', 'phone', 'url', 'complex'];

const PAGE_SIZE = 50; // pagination for large field sets

export const InspectionsTab: React.FC<InspectionsTabProps> = ({ schema, inspectionType = 'vsi' }) => {
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [query, setQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<FieldType[]>([]);
  const [requiredOnly, setRequiredOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>('name_asc');
  const [page, setPage] = useState(1);
  const [draftValues, setDraftValues] = useState<Record<string, any>>({});
  const [fieldEdits, setFieldEdits] = useState<Record<string, Partial<Field>>>({});
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [schemas, setSchemas] = useState<any | null>(null);

  const effectiveSchema = schema ?? buildMockSchema();
  const tabs = effectiveSchema.tabs;
  const activeTab: Tab | undefined = useMemo(() => {
    if (!activeTabId && tabs.length) return tabs[0];
    return tabs.find(t => t.id === activeTabId) || tabs[0];
  }, [activeTabId, tabs]);

  const filteredSorted = useMemo(() => {
    const fields = (activeTab?.fields || [])
      .filter(f => searchMatches(f, query))
      .filter(f => filterByType(f, selectedTypes))
      .filter(f => (requiredOnly ? !!f.required : true));
    return sortFields(fields, sortBy);
  }, [activeTab, query, selectedTypes, requiredOnly, sortBy]);

  const { pageItems, totalPages } = useMemo(() => paginate(filteredSorted, page, PAGE_SIZE), [filteredSorted, page]);
  // Load schemas to support drag/drop or buttons to add/remove fields from active tab
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await fetchSchemas();
        if (mounted) setSchemas(data.schemas);
      } catch (e) {
        console.warn('Failed to load schemas for editing');
      }
    })();
    return () => { mounted = false; };
  }, []);

  const addNewFieldToRegistry = async () => {
    const id = `field_${uuidv4().slice(0, 8)}`;
    const newField = {
      id,
      label: 'New Field',
      type: 'text',
      multiple: false,
      options: [],
    } as any;
    try {
      await upsertFieldRegistryItem({ id, label: newField.label, type: newField.type, multiple: false, options: [] });
      // Optimistic add to local view under current tab at top
      if (activeTab) {
        // We only update the local edits map; reload page to fully reflect from server if needed
        setFieldEdits(prev => ({ ...prev, [id]: { id, name: 'New Field', type: 'text' } as any }));
        setSelectedFieldId(id);
        setDetailOpen(true);
      }
    } catch (e) {
      console.error('Failed to create field:', e);
    }
  };

  const removeFieldFromCurrentTab = async (fieldId: string) => {
    try {
      if (!schemas || !activeTab) return;
      // Update VSI schema only for now; can extend to all types
      const type = 'vsi';
      const current = schemas[type];
      const newFieldsByTab = { ...current.fieldsByTab };
      newFieldsByTab[activeTab.id] = (newFieldsByTab[activeTab.id] || []).filter((id: string) => id !== fieldId);
      await updateSchema(type, { fieldsByTab: newFieldsByTab });
      // Remove locally from the view
      setSelectedFieldId(null);
    } catch (e) {
      console.error('Failed to remove field from tab:', e);
    }
  };

  const exportCsv = () => {
    const rows = filteredSorted.map((f) => ({
      name: f.name,
      type: (fieldEdits[f.id]?.type ?? f.type) as string,
      answers: getAnswersText({ ...f, ...(fieldEdits[f.id] || {}) } as Field),
      detail: getDetailPreviewText({ ...f, ...(fieldEdits[f.id] || {}), sampleAnswer: draftValues[f.id] ?? f.sampleAnswer } as any)
    }));
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'inspections.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getFieldValue = (f: Field) => draftValues[f.id] ?? f.sampleAnswer ?? f.placeholder ?? '';
  const setFieldValue = (id: string, val: any) => setDraftValues(prev => ({ ...prev, [id]: val }));

  const resolveField = (f: Field): Field => ({ ...f, ...(fieldEdits[f.id] || {}) });
  const openDetails = (id: string) => { setSelectedFieldId(id); setDetailOpen(true); };
  const closeDetails = () => setDetailOpen(false);
  const saveDetails = async (updates: { id: string; type: FieldType; options?: any; uiControl?: any; tabs?: string[] }) => {
    // Persist to server registry so all inspection types pick it up
    try {
      await upsertFieldRegistryItem({
        id: updates.id,
        type: updates.type,
        options: updates.options,
        multiple: (updates.type === 'multiselect' || updates.type === 'checklist') ? true : undefined,
        uiControl: updates.uiControl,
      });
      // If tabs were provided, update VSI schema membership
      if (updates.tabs && schemas) {
        const type = 'vsi';
        const current = schemas[type];
        const allTabs = Object.keys(current.fieldsByTab);
        const newFieldsByTab: Record<string, string[]> = {} as any;
        for (const tabId of allTabs) {
          const arr = current.fieldsByTab[tabId] || [];
          const has = arr.includes(updates.id);
          const shouldHave = updates.tabs.includes(tabId);
          if (shouldHave && !has) newFieldsByTab[tabId] = [...arr, updates.id];
          else if (!shouldHave && has) newFieldsByTab[tabId] = arr.filter((x: string) => x !== updates.id);
          else newFieldsByTab[tabId] = arr;
        }
        await updateSchema(type, { fieldsByTab: newFieldsByTab });
        setSchemas((prev: any) => ({ ...prev, [type]: { ...current, fieldsByTab: newFieldsByTab } }));
      }
    } catch (e) {
      console.error('Failed to save field updates:', e);
    }
    setFieldEdits(prev => ({ ...prev, [updates.id]: { type: updates.type, options: updates.options } }));
    setDetailOpen(false);
  };

  return (
    <Box sx={{ display: 'flex', gap: 2, height: '100%', p: 2 }}>
      {/* Sidebar */}
      <Paper variant="outlined" sx={{ width: 320, flexShrink: 0 }} role="navigation" aria-label="Tabs list">
        <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ flex: 1 }}>Tabs</Typography>
          <Tooltip title="Add tab">
            <IconButton size="small" onClick={async () => {
              const label = window.prompt('New tab name (letters/numbers/spaces):');
              if (!label) return;
              const id = label.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
              if (!id) return;
              const existingOrder = tabs.map(t => t.id);
              if (existingOrder.includes(id)) { alert('Tab id already exists'); return; }
              const newOrder = [...existingOrder, id];
              const fieldsByTab: Record<string, string[]> = {};
              tabs.forEach(t => { fieldsByTab[t.id] = t.fields.map(f => f.id); });
              fieldsByTab[id] = [];
              try {
                await updateSchema(inspectionType, { tabOrder: newOrder, fieldsByTab });
                window.dispatchEvent(new CustomEvent('schemas:updated'));
                setActiveTabId(id);
              } catch (e) { console.error('Failed to add tab', e); }
            }}>
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        <Divider />
        <List dense>
          {tabs.map(t => (
            <ListItemButton
              key={t.id}
              selected={(activeTab?.id || '') === t.id}
              onClick={() => { setActiveTabId(t.id); setPage(1); }}
            >
              <ListItemText primary={t.name} secondary={t.id} />
              <Chip size="small" label={t.fields.length} sx={{ mr: 1 }} />
              <Tooltip title="Rename tab id">
                <IconButton size="small" edge="end" onClick={async (e) => {
                  e.stopPropagation();
                  const label = window.prompt('Rename tab id:', t.id);
                  if (!label || label === t.id) return;
                  const newId = label.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
                  if (!newId) return;
                  const order = tabs.map(x => x.id);
                  if (order.includes(newId)) { alert('Tab id already exists'); return; }
                  const newOrder = order.map(x => x === t.id ? newId : x);
                  const fieldsByTab: Record<string, string[]> = {};
                  tabs.forEach(x => { fieldsByTab[x.id === t.id ? newId : x.id] = x.fields.map(f => f.id); });
                  try {
                    await updateSchema(inspectionType, { tabOrder: newOrder, fieldsByTab });
                    window.dispatchEvent(new CustomEvent('schemas:updated'));
                    setActiveTabId(newId);
                  } catch (err) { console.error('Failed to rename tab', err); }
                }}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete tab">
                <IconButton size="small" edge="end" onClick={async (e) => {
                  e.stopPropagation();
                  if (!confirm(`Delete tab "${t.id}"?`)) return;
                  const newOrder = tabs.map(x => x.id).filter(id => id !== t.id);
                  const fieldsByTab: Record<string, string[]> = {};
                  tabs.forEach(x => { if (x.id !== t.id) fieldsByTab[x.id] = x.fields.map(f => f.id); });
                  try {
                    await updateSchema(inspectionType, { tabOrder: newOrder, fieldsByTab });
                    window.dispatchEvent(new CustomEvent('schemas:updated'));
                    setActiveTabId(newOrder[0] || '');
                  } catch (err) { console.error('Failed to delete tab', err); }
                }}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </ListItemButton>
          ))}
        </List>
      </Paper>

      {/* Main */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {/* Controls */}
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
            <TextField
              label="Search"
              size="small"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              placeholder="Search by name, type, option label"
              inputProps={{ 'aria-label': 'Search fields' }}
              sx={{ minWidth: 260 }}
            />
            <TextField
              select
              label="Type Filter"
              size="small"
              SelectProps={{ multiple: true, renderValue: (s) => (s as string[]).join(', ') }}
              value={selectedTypes}
              onChange={(e) => setSelectedTypes(typeof e.target.value === 'string' ? (e.target.value.split(',') as FieldType[]) : (e.target.value as FieldType[]))}
              sx={{ minWidth: 260 }}
            >
              {ALL_TYPES.map(t => (
                <MenuItem key={t} value={t}>{t}</MenuItem>
              ))}
            </TextField>
            <FormControlLabel
              control={<Checkbox checked={requiredOnly} onChange={(e) => setRequiredOnly(e.target.checked)} />}
              label="Required only"
            />
            <TextField
              select
              label="Sort By"
              size="small"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
            >
              <MenuItem value="name_asc">Name A–Z</MenuItem>
              <MenuItem value="name_desc">Name Z–A</MenuItem>
              <MenuItem value="type_asc">Type A–Z</MenuItem>
              <MenuItem value="type_desc">Type Z–A</MenuItem>
            </TextField>
            <Box sx={{ flex: 1 }} />
            <Button onClick={exportCsv} variant="contained" size="small" aria-label="Export CSV">Export CSV</Button>
            <Button onClick={addNewFieldToRegistry} variant="outlined" size="small" startIcon={<AddIcon />} aria-label="Add Field">Add Field</Button>
          </Box>
        </Paper>

        {/* Table */}
        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: '70vh' }}>
          <Table stickyHeader size="small" aria-label="Fields table">
            <TableHead>
              <TableRow>
                <TableCell>Field Name</TableCell>
                <TableCell>Field Type</TableCell>
                <TableCell>Field Answers</TableCell>
                <TableCell>Detail View</TableCell>
                <TableCell>Value</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pageItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Typography variant="body2" color="text.secondary">No fields found.</Typography>
                  </TableCell>
                </TableRow>
              )}
              {pageItems.map((f) => (
                <TableRow key={f.id} hover tabIndex={0} role="row" onClick={() => openDetails(f.id)} sx={{ cursor: 'pointer' }}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" fontWeight={600}>{resolveField(f).name}</Typography>
                      {f.required && <Chip size="small" color="primary" variant="outlined" label="Required" />}
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); removeFieldFromCurrentTab(f.id); }} aria-label="Remove field from tab">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                  <TableCell>{resolveField(f).type}</TableCell>
                  <TableCell>{getAnswersText(resolveField(f))}</TableCell>
                  <TableCell>
                    <FieldPreview field={{ ...resolveField(f), sampleAnswer: getFieldValue(f) }} />
                  </TableCell>
                  <TableCell sx={{ minWidth: 260 }}>
                    <FieldEditor field={resolveField(f)} value={getFieldValue(f)} onChange={(v) => setFieldValue(f.id, v)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, p) => setPage(p)}
            color="primary"
            size="small"
            showFirstButton
            showLastButton
            aria-label="Fields pagination"
          />
        </Box>
      </Box>
      <FieldDetailDialog
        open={detailOpen}
        field={selectedFieldId ? (() => {
          const foundField = (activeTab?.fields || []).find(f => f.id === selectedFieldId);
          return foundField ? resolveField(foundField) : null;
        })() : null}
        allTypes={ALL_TYPES}
        onClose={closeDetails}
        onSave={saveDetails}
        tabs={(tabs || []).map(t => ({ id: t.id, name: t.name }))}
        tabMembership={(tabs || []).filter(t => (activeTab?.fields || filteredSorted).some(f => f.id === selectedFieldId ? true : false)) ? [] : []}
      />
    </Box>
  );
};

// Internal CSV util import to avoid circular import in tests (simple re-export)
import { toCsv } from './utils';
export { toCsv };

export default InspectionsTab;


