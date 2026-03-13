import React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';

import { fetchSchemas, updateSchema, restoreSchemaDefaults, createInspectionType, deleteInspectionType, renameInspectionType } from '../../services/inspectionSchemasApi';
import { FIELD_REGISTRY, FieldDef } from '../../config/fieldRegistry';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Switch from '@mui/material/Switch';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  useDroppable
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type RegistryMap = Record<string, Partial<FieldDef>>;

interface InspectionTypesViewProps {
  registryOverrides?: RegistryMap;
}

const InspectionTypesView: React.FC<InspectionTypesViewProps> = ({ registryOverrides }) => {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [schemas, setSchemas] = React.useState<Record<string, any>>({});
  const [activeType, setActiveType] = React.useState<string>('');
  const [reorderMode, setReorderMode] = React.useState(false);
  const [reorderTypesMode, setReorderTypesMode] = React.useState(false);
  const [localFieldsByTab, setLocalFieldsByTab] = React.useState<Record<string, string[]>>({});
  const [draggingId, setDraggingId] = React.useState<string | null>(null);
  const [attachTabs, setAttachTabs] = React.useState<string[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await fetchSchemas();
        if (!mounted) return;
        setSchemas(data.schemas || {});
        const first = Object.keys(data.schemas || {})[0] || '';
        setActiveType(first);
        setError(null);
      } catch (e: any) {
        setError(e?.message || 'Failed to load inspection types');
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const mergedRegistry = React.useMemo(() => {
    const merged: Record<string, FieldDef> = { ...(FIELD_REGISTRY as any) };
    if (registryOverrides) {
      Object.entries(registryOverrides).forEach(([id, ov]) => {
        merged[id] = { ...(merged[id] as any), ...(ov as any) } as any;
      });
    }
    return merged;
  }, [registryOverrides]);

  const typeKeys = Object.keys(schemas || {});
  const active = activeType ? schemas[activeType] : null;

  React.useEffect(() => {
    if (active && active.fieldsByTab) {
      setLocalFieldsByTab(active.fieldsByTab);
    } else {
      setLocalFieldsByTab({});
    }
  }, [activeType, schemas]);

  const findContainer = (id: string | null | undefined): string | null => {
    if (!id) return null;
    if (localFieldsByTab[id]) return id; // it's a container id
    const entry = Object.entries(localFieldsByTab).find(([, items]) => items.includes(id));
    return entry ? entry[0] : null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setDraggingId(String(event.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active: a, over } = event;
    setDraggingId(null);
    if (!over || !a) return;
    const activeId = String(a.id);
    const overId = String(over.id);
    const fromContainer = findContainer(activeId);
    const toContainer = findContainer(overId);
    if (!fromContainer || !toContainer) return;
    if (fromContainer === toContainer) {
      const oldIndex = localFieldsByTab[fromContainer].indexOf(activeId);
      const newIndex = localFieldsByTab[toContainer].indexOf(overId);
      if (oldIndex !== newIndex && newIndex !== -1) {
        const newItems = arrayMove(localFieldsByTab[toContainer], oldIndex, newIndex);
        const next = { ...localFieldsByTab, [toContainer]: newItems };
        setLocalFieldsByTab(next);
        if (activeType) {
          await updateSchema(activeType, { fieldsByTab: next });
          window.dispatchEvent(new CustomEvent('schemas:updated'));
        }
      }
    } else {
      // move across containers
      const fromItems = localFieldsByTab[fromContainer].filter((id) => id !== activeId);
      const toItems = localFieldsByTab[toContainer];
      const overIndex = toItems.indexOf(overId);
      const insertAt = overIndex === -1 ? toItems.length : overIndex;
      const newTo = [...toItems.slice(0, insertAt), activeId, ...toItems.slice(insertAt)];
      const next = { ...localFieldsByTab, [fromContainer]: fromItems, [toContainer]: newTo };
      setLocalFieldsByTab(next);
      if (activeType) {
        await updateSchema(activeType, { fieldsByTab: next });
        window.dispatchEvent(new CustomEvent('schemas:updated'));
      }
    }
  };

  const SortableRow: React.FC<{ tabId: string; fieldId: string }> = ({ tabId, fieldId }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: fieldId, disabled: !reorderMode });
    const style: React.CSSProperties = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : undefined,
      cursor: reorderMode ? 'grab' : 'default'
    };
    const def = mergedRegistry[fieldId] as any;
    return (
      <TableRow ref={setNodeRef} style={style} {...attributes}>
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {reorderMode && (
              <span {...listeners} aria-label="Drag handle" style={{ display: 'inline-flex' }}>
                <DragIndicatorIcon fontSize="small" />
              </span>
            )}
            {def?.label || fieldId}
          </Box>
        </TableCell>
        <TableCell>{fieldId}</TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span>{def?.type || '-'}</span>
            {!reorderMode && (
              <IconButton size="small" aria-label="Remove field from tab" onClick={async () => {
                const next = { ...localFieldsByTab, [tabId]: (localFieldsByTab[tabId] || []).filter(id => id !== fieldId) };
                setLocalFieldsByTab(next);
                if (activeType) { await updateSchema(activeType, { fieldsByTab: next }); window.dispatchEvent(new CustomEvent('schemas:updated')); }
              }}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        </TableCell>
      </TableRow>
    );
  };

  // Droppable row for appending to container; helps cross-tab drops
  const DropZoneRow: React.FC<{ tabId: string }> = ({ tabId }) => {
    const { isOver, setNodeRef } = useDroppable({ id: tabId });
    return (
      <TableRow ref={setNodeRef}>
        <TableCell colSpan={3}>
          <Box sx={{
            border: '1px dashed',
            borderColor: isOver ? 'primary.main' : 'divider',
            borderRadius: 1,
            py: 0.5,
            textAlign: 'center',
            color: 'text.secondary',
            fontSize: 12
          }}>
            Drop here to add to end
          </Box>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <Box sx={{ display: 'flex', gap: 2, height: '100%' }}>
      <Paper variant="outlined" sx={{ width: 320, flexShrink: 0 }}>
        <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ flex: 1 }}>Inspection Types</Typography>
          <Tooltip title={reorderTypesMode ? 'Reorder enabled' : 'Enable drag to reorder types'}>
            <IconButton size="small" onClick={() => setReorderTypesMode(v => !v)} aria-pressed={reorderTypesMode} aria-label="Toggle reorder types" sx={{ mr: 0.5 }}>
              <DragIndicatorIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Create inspection type">
            <IconButton size="small" onClick={async () => {
              const name = window.prompt('New inspection type id (letters/numbers/underscore):');
              if (!name) return;
              const id = name.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
              if (!id) return;
              await createInspectionType(id, name);
              const data = await fetchSchemas(); setSchemas(data.schemas || {});
            }} aria-label="Create type">
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        <Divider />
        {loading && <Box sx={{ p: 2 }}><CircularProgress size={20} /></Box>}
        {error && <Box sx={{ p: 2 }}><Alert severity="error">{error}</Alert></Box>}
        {!loading && !error && (
          <>
            {(() => {
              const orderedTypeKeys = typeKeys
                .slice()
                .sort((a, b) => {
                  const A = typeof schemas[a]?.navOrder === 'number' ? schemas[a].navOrder : Number.MAX_SAFE_INTEGER;
                  const B = typeof schemas[b]?.navOrder === 'number' ? schemas[b].navOrder : Number.MAX_SAFE_INTEGER;
                  if (A !== B) return A - B;
                  return (schemas[a]?.title || a).localeCompare(schemas[b]?.title || b);
                });

              const handleTypesDragEnd = async (event: DragEndEvent) => {
                const { active, over } = event;
                if (!over || !active) return;
                const from = String(active.id);
                const to = String(over.id);
                if (from === to) return;
                const oldIndex = orderedTypeKeys.indexOf(from);
                const newIndex = orderedTypeKeys.indexOf(to);
                if (oldIndex === -1 || newIndex === -1) return;
                const newOrder = arrayMove(orderedTypeKeys, oldIndex, newIndex);
                await Promise.all(newOrder.map((t, idx) => updateSchema(t, { navOrder: idx })));
                const data = await fetchSchemas(); setSchemas(data.schemas || {});
              };

              const SortableTypeItem: React.FC<{ id: string }> = ({ id }) => {
                const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: !reorderTypesMode });
                const style: React.CSSProperties = {
                  transform: CSS.Transform.toString(transform),
                  transition,
                  opacity: isDragging ? 0.6 : 1,
                  cursor: reorderTypesMode ? 'grab' : 'pointer'
                };
                return (
                  <ListItemButton ref={setNodeRef} style={style} selected={activeType === id} onClick={() => setActiveType(id)} {...attributes}>
                    {reorderTypesMode && (
                      <span {...listeners} aria-label="Drag handle" style={{ display: 'inline-flex', marginRight: 6 }}>
                        <DragIndicatorIcon fontSize="small" />
                      </span>
                    )}
                    <ListItemText primary={schemas[id]?.title || id} secondary={id} />
                    <Tooltip title={schemas[id]?.showInBottomNav ? 'Shown in bottom nav' : 'Hidden from bottom nav'}>
                      <Switch size="small" edge="end" checked={!!schemas[id]?.showInBottomNav} onClick={(e) => e.stopPropagation()} onChange={async (e) => {
                        const next = e.target.checked;
                        await updateSchema(id, { showInBottomNav: next });
                        const data = await fetchSchemas(); setSchemas(data.schemas || {});
                      }} />
                    </Tooltip>
                    <Tooltip title="Rename type">
                      <IconButton size="small" edge="end" onClick={async (e) => {
                        e.stopPropagation();
                        const name = window.prompt('Rename type id:', id);
                        if (!name || name === id) return;
                        const newId = name.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
                        if (!newId) return;
                        await renameInspectionType(id, newId, name);
                        const data = await fetchSchemas(); setSchemas(data.schemas || {}); setActiveType(newId);
                      }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete type">
                      <IconButton size="small" edge="end" onClick={async (e) => {
                        e.stopPropagation();
                        if (!confirm(`Delete inspection type "${id}"?`)) return;
                        await deleteInspectionType(id);
                        const data = await fetchSchemas(); setSchemas(data.schemas || {}); setActiveType(Object.keys(data.schemas || {})[0] || '');
                      }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </ListItemButton>
                );
              };

              return (
                <>
                  {reorderTypesMode ? (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleTypesDragEnd}>
                      <SortableContext items={orderedTypeKeys} strategy={verticalListSortingStrategy}>
                        <List dense>
                          {orderedTypeKeys.map((key) => (
                            <SortableTypeItem key={key} id={key} />
                          ))}
                        </List>
                      </SortableContext>
                    </DndContext>
                  ) : (
                    <List dense>
                      {orderedTypeKeys.map((key) => (
                        <SortableTypeItem key={key} id={key} />
                      ))}
                    </List>
                  )}
                </>
              );
            })()}
          </>
        )}
      </Paper>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        {!active && !loading && !error && (
          <Alert severity="info" sx={{ mt: 2 }}>No inspection types found.</Alert>
        )}
        {active && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h6" sx={{ mb: 1, flex: 1 }}>{active.title || activeType}</Typography>
                <Tooltip title={reorderMode ? 'Reorder enabled' : 'Enable drag to reorder and move across tabs'}>
                  <IconButton size="small" onClick={() => setReorderMode(v => !v)} aria-pressed={reorderMode} aria-label="Toggle reorder">
                    <DragIndicatorIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Restore defaults for this inspection type">
                  <IconButton size="small" onClick={async () => { if (activeType) { await restoreSchemaDefaults(activeType); const data = await fetchSchemas(); setSchemas(data.schemas || {}); window.dispatchEvent(new CustomEvent('schemas:updated')); } }} aria-label="Restore defaults">
                    <span className="material-icons" style={{ fontSize: 18 }}>restore</span>
                  </IconButton>
                </Tooltip>
                <Tooltip title="Pick nav icon">
                  <Select size="small" value={active.navIcon || ''} displayEmpty onChange={async (e) => {
                    const val = e.target.value as string;
                    await updateSchema(activeType, { navIcon: val });
                    const data = await fetchSchemas(); setSchemas(data.schemas || {});
                  }} sx={{ ml: 1, minWidth: 160 }}>
                    <MenuItem value=""><em>Default</em></MenuItem>
                    <MenuItem value="assignment">Assignment</MenuItem>
                    <MenuItem value="security">Security</MenuItem>
                    <MenuItem value="build">Build</MenuItem>
                    <MenuItem value="construction">Construction</MenuItem>
                    <MenuItem value="task">Task</MenuItem>
                    <MenuItem value="car_repair">Car Repair</MenuItem>
                  </Select>
                </Tooltip>
                {/* Tab add/edit/delete moved to Fields section Tabs Manager */}
              </Box>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                {(active.tabOrder || []).map((tabId: string) => (
                  <Chip key={tabId} label={tabId.charAt(0).toUpperCase() + tabId.slice(1)} />
                ))}
              </Stack>

              {/* Attach existing tabs from other types */}
              {(() => {
                const allTabIds = Array.from(new Set(Object.values(schemas || {}).flatMap((s: any) => s?.tabOrder || [])));
                const available = allTabIds.filter(id => !(active.tabOrder || []).includes(id));
                if (available.length === 0) return null;
                return (
                  <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FormControl size="small" sx={{ minWidth: 260 }}>
                      <InputLabel id="attach-tabs-label">Attach tabs</InputLabel>
                      <Select
                        labelId="attach-tabs-label"
                        multiple
                        value={attachTabs}
                        label="Attach tabs"
                        onChange={(e) => setAttachTabs(typeof e.target.value === 'string' ? (e.target.value as string).split(',') : (e.target.value as string[]))}
                        renderValue={(vals) => (vals as string[]).map(v => v.charAt(0).toUpperCase() + v.slice(1)).join(', ')}
                      >
                        {available.map(id => (
                          <MenuItem key={id} value={id}>{id}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <Button
                      variant="outlined"
                      size="small"
                      disabled={attachTabs.length === 0}
                      onClick={async () => {
                        const newOrder = [ ...(active.tabOrder || []), ...attachTabs ];
                        const nextMap: Record<string, string[]> = { ...localFieldsByTab };
                        attachTabs.forEach(t => { if (!nextMap[t]) nextMap[t] = []; });
                        await updateSchema(activeType, { tabOrder: newOrder, fieldsByTab: nextMap });
                        const data = await fetchSchemas(); setSchemas(data.schemas || {});
                        setAttachTabs([]);
                        window.dispatchEvent(new CustomEvent('schemas:updated'));
                      }}
                    >Attach</Button>
                  </Box>
                );
              })()}
            </Box>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            {(active.tabOrder || []).map((tabId: string) => {
              const fieldIds: string[] = localFieldsByTab?.[tabId] || [];
              return (
                <Paper key={tabId} variant="outlined">
                  <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600} sx={{ flex: 1 }}>{tabId.charAt(0).toUpperCase() + tabId.slice(1)}</Typography>
                    {!reorderMode && (
                      <Tooltip title="Remove tab from this inspection type">
                        <IconButton size="small" onClick={async () => {
                          if (!confirm(`Remove tab "${tabId}" from ${activeType}?`)) return;
                          const newOrder = (active.tabOrder || []).filter((t: string) => t !== tabId);
                          const nextMap: Record<string, string[]> = { ...localFieldsByTab };
                          delete nextMap[tabId];
                          await updateSchema(activeType, { tabOrder: newOrder, fieldsByTab: nextMap });
                          const data = await fetchSchemas(); setSchemas(data.schemas || {});
                          window.dispatchEvent(new CustomEvent('schemas:updated'));
                        }} aria-label="Detach tab">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                  <Divider />
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell style={{ width: '40%' }}>Field Label</TableCell>
                          <TableCell>Field ID</TableCell>
                          <TableCell>Type</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {fieldIds.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={3}><Typography variant="body2" color="text.secondary">No fields</Typography></TableCell>
                          </TableRow>
                        )}
                        <SortableContext items={fieldIds} strategy={verticalListSortingStrategy} disabled={!reorderMode}>
                          {fieldIds.map((fid: string) => (
                            <SortableRow key={fid} tabId={tabId} fieldId={fid} />
                          ))}
                        </SortableContext>
                        <DropZoneRow tabId={tabId} />
                      </TableBody>
                    </Table>
                  </TableContainer>
                  {!reorderMode && (
                    <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TextField size="small" select label="Add field" value="" onChange={async (e) => {
                        const val = e.target.value as string;
                        if (!val) return;
                        if (localFieldsByTab[tabId]?.includes(val)) return;
                        const next = { ...localFieldsByTab, [tabId]: [...(localFieldsByTab[tabId] || []), val] };
                        setLocalFieldsByTab(next);
                        if (activeType) { await updateSchema(activeType, { fieldsByTab: next }); const data = await fetchSchemas(); setSchemas(data.schemas || {}); window.dispatchEvent(new CustomEvent('schemas:updated')); }
                      }} sx={{ minWidth: 260 }}>
                        {Object.keys(mergedRegistry).map(fid => (
                          <MenuItem key={fid} value={fid}>{(mergedRegistry[fid] as any)?.label || fid}</MenuItem>
                        ))}
                      </TextField>
                    </Box>
                  )}
                </Paper>
              );
            })}
            </DndContext>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default InspectionTypesView;


