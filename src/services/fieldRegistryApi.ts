/**
 * fieldRegistryApi.ts — re-exports from firebase/fieldRegistry.ts for backwards compatibility.
 */
export {
  fetchFieldRegistry,
  upsertFieldRegistryItem,
} from './firebase/fieldRegistry';
export type { FieldRegistryItem, FieldRegistryResponse } from './firebase/fieldRegistry';
