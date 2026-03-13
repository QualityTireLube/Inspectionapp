// Migration service to transition from localStorage to database storage
import { createStaticSticker, createGeneratedLabel } from './api-stickers-labels';
import { StaticSticker } from '../types/stickers';
import { GeneratedLabel } from '../types/labels';

const STICKERS_STORAGE_KEY = 'oil_change_stickers';
const LABELS_STORAGE_KEY = 'quickcheck_generated_labels';

export class MigrationService {
  // Migrate existing stickers from localStorage to database
  static async migrateStickersToDatabase(): Promise<{ success: boolean; migrated: number; errors: number }> {
    let migrated = 0;
    let errors = 0;

    try {
      const storedStickers = localStorage.getItem(STICKERS_STORAGE_KEY);
      if (!storedStickers) {
        console.log('No stickers found in localStorage to migrate');
        return { success: true, migrated: 0, errors: 0 };
      }

      const stickers: StaticSticker[] = JSON.parse(storedStickers);
      console.log(`Found ${stickers.length} stickers to migrate`);

      for (const sticker of stickers) {
        try {
          await createStaticSticker(sticker);
          migrated++;
          console.log(`✅ Migrated sticker: ${sticker.id}`);
        } catch (error) {
          console.error(`❌ Failed to migrate sticker ${sticker.id}:`, error);
          errors++;
        }
      }

      // After successful migration, optionally clear localStorage
      if (errors === 0) {
        localStorage.removeItem(STICKERS_STORAGE_KEY);
        console.log('🧹 Cleared localStorage stickers after successful migration');
      }

      return { success: errors === 0, migrated, errors };
    } catch (error) {
      console.error('Migration failed:', error);
      return { success: false, migrated, errors: errors + 1 };
    }
  }

  // Migrate existing labels from localStorage to database
  static async migrateLabelsToDatabase(): Promise<{ success: boolean; migrated: number; errors: number }> {
    let migrated = 0;
    let errors = 0;

    try {
      const storedLabels = localStorage.getItem(LABELS_STORAGE_KEY);
      if (!storedLabels) {
        console.log('No labels found in localStorage to migrate');
        return { success: true, migrated: 0, errors: 0 };
      }

      const labelsData = JSON.parse(storedLabels);
      console.log(`Found ${labelsData.length} labels to migrate`);

      for (const labelData of labelsData) {
        try {
          // Convert base64 back to Blob if present
          if (labelData.pdfBase64) {
            const byteCharacters = atob(labelData.pdfBase64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            labelData.pdfBlob = new Blob([byteArray], { type: 'application/pdf' });
            delete labelData.pdfBase64;
          }

          await createGeneratedLabel(labelData);
          migrated++;
          console.log(`✅ Migrated label: ${labelData.id}`);
        } catch (error) {
          console.error(`❌ Failed to migrate label ${labelData.id}:`, error);
          errors++;
        }
      }

      // After successful migration, optionally clear localStorage
      if (errors === 0) {
        localStorage.removeItem(LABELS_STORAGE_KEY);
        console.log('🧹 Cleared localStorage labels after successful migration');
      }

      return { success: errors === 0, migrated, errors };
    } catch (error) {
      console.error('Migration failed:', error);
      return { success: false, migrated, errors: errors + 1 };
    }
  }

  // Run full migration
  static async runFullMigration(): Promise<void> {
    console.log('🚀 Starting migration from localStorage to database...');
    
    const stickerResult = await this.migrateStickersToDatabase();
    console.log(`📊 Sticker Migration: ${stickerResult.migrated} success, ${stickerResult.errors} errors`);
    
    const labelResult = await this.migrateLabelsToDatabase();
    console.log(`📊 Label Migration: ${labelResult.migrated} success, ${labelResult.errors} errors`);
    
    if (stickerResult.success && labelResult.success) {
      console.log('✅ Migration completed successfully!');
    } else {
      console.log('⚠️ Migration completed with some errors. Check console for details.');
    }
  }

  // Check if migration is needed
  static migrationNeeded(): boolean {
    const hasStickers = localStorage.getItem(STICKERS_STORAGE_KEY) !== null;
    const hasLabels = localStorage.getItem(LABELS_STORAGE_KEY) !== null;
    return hasStickers || hasLabels;
  }
}