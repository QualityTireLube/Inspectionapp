export type FieldType =
  | 'text' | 'number' | 'date' | 'datetime' | 'time'
  | 'select' | 'multiselect' | 'boolean'
  | 'photo' | 'signature' | 'rating' | 'checklist'
  | 'location' | 'currency' | 'email' | 'phone' | 'url' | 'complex';

export type FieldOption = { id: string; label: string; value: string };

export type UIControl = 'dropdown' | 'chips' | 'radio' | 'switch' | 'upload';

export type Field = {
  id: string;
  name: string;
  type: FieldType;
  required?: boolean;
  options?: FieldOption[];
  placeholder?: string;
  min?: number; max?: number;
  mask?: string;
  helpText?: string;
  sampleAnswer?: string | number | boolean | string[] | null;
  maxRating?: number;
  multiple?: boolean;
  uiControl?: UIControl;
};

export type Tab = { id: string; name: string; fields: Field[] };

export type InspectionSchema = { tabs: Tab[] };

export type SortBy = 'name_asc' | 'name_desc' | 'type_asc' | 'type_desc';

export function toCsv(rows: Array<{ name: string; type: string; answers: string; detail: string }>): string {
  const header = ['Field Name', 'Field Type', 'Field Answers', 'Detail View'];
  const escape = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`;
  const lines = [header.map(escape).join(',')];
  for (const r of rows) {
    lines.push([r.name, r.type, r.answers, r.detail].map(v => escape(v)).join(','));
  }
  return lines.join('\n');
}

export function searchMatches(field: Field, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const inName = field.name.toLowerCase().includes(q);
  const inType = field.type.toLowerCase().includes(q);
  const inOptions = (field.options || []).some(o => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q));
  return inName || inType || inOptions;
}

export function filterByType(field: Field, types: FieldType[] | null): boolean {
  if (!types || types.length === 0) return true;
  return types.includes(field.type);
}

export function sortFields(fields: Field[], sortBy: SortBy): Field[] {
  const arr = [...fields];
  switch (sortBy) {
    case 'name_asc':
      return arr.sort((a, b) => a.name.localeCompare(b.name));
    case 'name_desc':
      return arr.sort((a, b) => b.name.localeCompare(a.name));
    case 'type_asc':
      return arr.sort((a, b) => a.type.localeCompare(b.type));
    case 'type_desc':
      return arr.sort((a, b) => b.type.localeCompare(a.type));
    default:
      return arr;
  }
}

export function getAnswersText(field: Field): string {
  switch (field.type) {
    case 'select':
      return (field.options || []).map(o => o.label).join(', ');
    case 'multiselect':
    case 'checklist':
      return (field.options || []).map(o => o.label).join(', ');
    case 'boolean':
      return 'Yes, No';
    case 'rating':
      return `${field.maxRating || 5} stars`;
    case 'photo':
    case 'signature':
      return 'Thumbnail';
    default:
      return String(field.sampleAnswer ?? field.placeholder ?? '');
  }
}

export function paginate<T>(items: T[], page: number, pageSize: number): { pageItems: T[]; totalPages: number } {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return { pageItems: items.slice(start, start + pageSize), totalPages };
}

export function buildMockSchema(): InspectionSchema {
  const makeOptions = (labels: string[]) => labels.map((label, i) => ({ id: String(i), label, value: label.toLowerCase().replace(/\s+/g, '_') }));
  const common: Field[] = [
    { id: 'vin', name: 'VIN', type: 'text', required: true, placeholder: '17-char VIN', sampleAnswer: '1HGCM82633A004352' },
    { id: 'mileage', name: 'Mileage', type: 'number', placeholder: '000,000', sampleAnswer: 123456 },
    { id: 'date', name: 'Date', type: 'date', sampleAnswer: new Date().toISOString() },
    { id: 'email', name: 'Email', type: 'email', sampleAnswer: 'tech@example.com' },
    { id: 'photo', name: 'Dash Photo', type: 'photo' },
    { id: 'rating', name: 'Overall Rating', type: 'rating', maxRating: 5, sampleAnswer: 4 },
    { id: 'issue', name: 'Issue', type: 'select', options: makeOptions(['Good', 'Warning', 'Bad']), sampleAnswer: 'warning' },
    { id: 'many', name: 'Issues', type: 'multiselect', options: makeOptions(['Left', 'Right', 'Front', 'Rear']), sampleAnswer: ['left', 'rear'] },
    { id: 'ok', name: 'OK?', type: 'boolean', sampleAnswer: true },
  ];
  const tabs: Tab[] = [
    { id: 'info', name: 'Info', fields: common },
    { id: 'underhood', name: 'Underhood', fields: common },
    { id: 'tires', name: 'Tires & Brakes', fields: common },
  ];
  return { tabs };
}


