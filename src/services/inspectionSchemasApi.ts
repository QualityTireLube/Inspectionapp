import { mainApi } from './api';

export interface SchemaPayload {
  tabOrder: string[];
  fieldsByTab: Record<string, string[]>;
  title?: string;
  showInBottomNav?: boolean;
  navIcon?: string; // e.g., 'assignment', 'security', 'build', or any MUI icon key
  navOrder?: number;
}

export interface SchemasResponse {
  schemas: Record<string, SchemaPayload & { title: string }>;
}

export async function fetchSchemas(): Promise<SchemasResponse> {
  const { data } = await mainApi.get<SchemasResponse>('/inspection-schemas');
  return data;
}

export async function updateSchema(type: string, payload: Partial<SchemaPayload>): Promise<SchemaPayload> {
  const { data } = await mainApi.put<SchemaPayload>(`/inspection-schemas/${type}`, payload);
  return data;
}

export async function restoreSchemaDefaults(type: string): Promise<SchemaPayload> {
  const { data } = await mainApi.post<SchemaPayload>(`/inspection-schemas/${type}/restore`);
  return data;
}

export async function createInspectionType(type: string, title?: string): Promise<any> {
  const { data } = await mainApi.post('/inspection-schemas', { type, title });
  return data;
}

export async function deleteInspectionType(type: string): Promise<{ success: boolean }> {
  const { data } = await mainApi.delete<{ success: boolean }>(`/inspection-schemas/${type}`);
  return data;
}

export async function renameInspectionType(type: string, newType: string, newTitle?: string): Promise<{ id: string; schema: any }> {
  const { data } = await mainApi.post<{ id: string; schema: any }>(`/inspection-schemas/${type}/rename`, { newType, newTitle });
  return data;
}


