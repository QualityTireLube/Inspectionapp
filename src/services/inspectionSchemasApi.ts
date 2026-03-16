/**
 * inspectionSchemasApi.ts — re-exports from firebase/schemas.ts for backwards compatibility.
 */
export {
  fetchSchemas,
  getSchema,
  updateSchema,
  createInspectionType,
  deleteInspectionType,
  renameInspectionType,
  restoreSchemaDefaults,
  seedDefaultSchemasIfEmpty,
  DEFAULT_SCHEMAS,
} from './firebase/schemas';
export type { InspectionSchema, SchemasResponse } from './firebase/schemas';
