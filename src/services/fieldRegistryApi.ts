import { mainApi } from './api';

export interface FieldRegistryItem {
  id: string;
  label: string;
  type: string;
  multiple?: boolean;
  options?: { label: string; value: string }[];
  uiControl?: 'dropdown' | 'chips' | 'radio' | 'switch' | 'upload';
  placeholder?: string;
  min?: number;
  max?: number;
  description?: string;
}

export interface FieldRegistryResponse {
  fields: FieldRegistryItem[];
}

export async function fetchFieldRegistry(): Promise<FieldRegistryResponse> {
  const { data } = await mainApi.get<FieldRegistryResponse>('/fields');
  return data;
}

export async function upsertFieldRegistryItem(item: Partial<FieldRegistryItem> & { id: string }): Promise<FieldRegistryItem> {
  const { data } = await mainApi.put<FieldRegistryItem>(`/fields/${item.id}`, item);
  return data;
}


