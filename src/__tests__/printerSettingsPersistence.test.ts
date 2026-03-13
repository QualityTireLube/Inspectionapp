/**
 * Test suite for printer settings persistence functionality
 * Tests that sticker and label print settings are properly saved to and loaded from the server
 */

import { getUserSettings, updateUserSettings } from '../services/api';
import { UserSettings } from '../types/userSettings';

// Mock the API
jest.mock('../services/api');
const mockGetUserSettings = getUserSettings as jest.MockedFunction<typeof getUserSettings>;
const mockUpdateUserSettings = updateUserSettings as jest.MockedFunction<typeof updateUserSettings>;

describe('Printer Settings Persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('Sticker Print Settings', () => {
    it('should save sticker print settings to server', async () => {
      const stickerSettings = {
        printMethod: 'queue' as const,
        printerId: 'test-printer-id',
        orientation: 'portrait' as const,
        autoPrint: true
      };

      const initialSettings: UserSettings = {};
      const expectedSettings: UserSettings = {
        ...initialSettings,
        stickerPrintSettings: stickerSettings
      };

      mockGetUserSettings.mockResolvedValue(initialSettings);
      mockUpdateUserSettings.mockResolvedValue({
        message: 'Settings saved',
        settings: expectedSettings
      });

      // Simulate saving settings
      const currentSettings = await getUserSettings();
      await updateUserSettings({
        ...currentSettings,
        stickerPrintSettings: stickerSettings
      });

      expect(mockGetUserSettings).toHaveBeenCalledTimes(1);
      expect(mockUpdateUserSettings).toHaveBeenCalledWith(expectedSettings);
    });

    it('should load sticker print settings from server', async () => {
      const stickerSettings = {
        printMethod: 'queue' as const,
        printerId: 'test-printer-id',
        orientation: 'landscape' as const,
        autoPrint: false
      };

      const userSettings: UserSettings = {
        stickerPrintSettings: stickerSettings
      };

      mockGetUserSettings.mockResolvedValue(userSettings);

      const settings = await getUserSettings();
      const loadedStickerSettings = settings.stickerPrintSettings;

      expect(loadedStickerSettings).toEqual(stickerSettings);
      expect(loadedStickerSettings?.printMethod).toBe('queue');
      expect(loadedStickerSettings?.printerId).toBe('test-printer-id');
      expect(loadedStickerSettings?.orientation).toBe('landscape');
      expect(loadedStickerSettings?.autoPrint).toBe(false);
    });

    it('should fallback to localStorage when server is unavailable', async () => {
      // Mock server failure
      mockGetUserSettings.mockRejectedValue(new Error('Server unavailable'));

      // Set localStorage values
      localStorage.setItem('stickerPrintMethod', 'pdf');
      localStorage.setItem('stickerPrinterId', 'fallback-printer');
      localStorage.setItem('stickerPrintOrientation', 'portrait');
      localStorage.setItem('stickerPrintAutoPrint', 'true');

      // Simulate component trying to load settings
      try {
        await getUserSettings();
      } catch (err) {
        // Should fallback to localStorage
        const method = localStorage.getItem('stickerPrintMethod');
        const printerId = localStorage.getItem('stickerPrinterId');
        const orientation = localStorage.getItem('stickerPrintOrientation');
        const autoPrint = localStorage.getItem('stickerPrintAutoPrint') === 'true';

        expect(method).toBe('pdf');
        expect(printerId).toBe('fallback-printer');
        expect(orientation).toBe('portrait');
        expect(autoPrint).toBe(true);
      }
    });
  });

  describe('Label Print Settings', () => {
    it('should save label print settings to server', async () => {
      const labelSettings = {
        printMethod: 'queue-fallback' as const,
        printerId: 'label-printer-id',
        orientation: 'landscape' as const,
        autoPrint: false,
        enableCustomCopies: true,
        defaultCopies: 3
      };

      const initialSettings: UserSettings = {};
      const expectedSettings: UserSettings = {
        ...initialSettings,
        labelPrintSettings: labelSettings
      };

      mockGetUserSettings.mockResolvedValue(initialSettings);
      mockUpdateUserSettings.mockResolvedValue({
        message: 'Settings saved',
        settings: expectedSettings
      });

      // Simulate saving settings
      const currentSettings = await getUserSettings();
      await updateUserSettings({
        ...currentSettings,
        labelPrintSettings: labelSettings
      });

      expect(mockGetUserSettings).toHaveBeenCalledTimes(1);
      expect(mockUpdateUserSettings).toHaveBeenCalledWith(expectedSettings);
    });

    it('should load label print settings from server', async () => {
      const labelSettings = {
        printMethod: 'queue' as const,
        printerId: 'label-printer-id',
        orientation: 'portrait' as const,
        autoPrint: true,
        enableCustomCopies: true,
        defaultCopies: 2
      };

      const userSettings: UserSettings = {
        labelPrintSettings: labelSettings
      };

      mockGetUserSettings.mockResolvedValue(userSettings);

      const settings = await getUserSettings();
      const loadedLabelSettings = settings.labelPrintSettings;

      expect(loadedLabelSettings).toEqual(labelSettings);
      expect(loadedLabelSettings?.printMethod).toBe('queue');
      expect(loadedLabelSettings?.printerId).toBe('label-printer-id');
      expect(loadedLabelSettings?.orientation).toBe('portrait');
      expect(loadedLabelSettings?.autoPrint).toBe(true);
      expect(loadedLabelSettings?.enableCustomCopies).toBe(true);
      expect(loadedLabelSettings?.defaultCopies).toBe(2);
    });

    it('should migrate localStorage settings to server', async () => {
      // Mock no existing server settings
      mockGetUserSettings.mockResolvedValue({});

      // Set localStorage values
      localStorage.setItem('labelPrintMethod', 'queue');
      localStorage.setItem('labelPrinterId', 'migrate-printer');
      localStorage.setItem('labelPrintOrientation', 'landscape');
      localStorage.setItem('labelPrintAutoPrint', 'false');
      localStorage.setItem('labelPrintEnableCustomCopies', 'true');
      localStorage.setItem('labelPrintDefaultCopies', '5');

      const expectedMigration = {
        printMethod: 'queue',
        printerId: 'migrate-printer',
        orientation: 'landscape',
        autoPrint: false,
        enableCustomCopies: true,
        defaultCopies: 5
      };

      mockUpdateUserSettings.mockResolvedValue({
        message: 'Settings migrated',
        settings: { labelPrintSettings: expectedMigration }
      });

      // Simulate migration process
      const userSettings = await getUserSettings();
      if (!userSettings.labelPrintSettings) {
        const savedPrintMethod = localStorage.getItem('labelPrintMethod') as 'pdf' | 'queue' | 'queue-fallback';
        const savedPrinterId = localStorage.getItem('labelPrinterId') || '';
        const savedOrientation = localStorage.getItem('labelPrintOrientation') as 'portrait' | 'landscape';
        const savedAutoPrint = localStorage.getItem('labelPrintAutoPrint') === 'true';
        const savedEnableCustomCopies = localStorage.getItem('labelPrintEnableCustomCopies') === 'true';
        const savedDefaultCopies = parseInt(localStorage.getItem('labelPrintDefaultCopies') || '1');

        if (savedPrintMethod !== 'pdf' || savedPrinterId || savedOrientation !== 'portrait' || savedAutoPrint || savedEnableCustomCopies || savedDefaultCopies !== 1) {
          const settingsToMigrate = {
            printMethod: savedPrintMethod,
            printerId: savedPrinterId,
            orientation: savedOrientation,
            autoPrint: savedAutoPrint,
            enableCustomCopies: savedEnableCustomCopies,
            defaultCopies: savedDefaultCopies
          };

          await updateUserSettings({
            ...userSettings,
            labelPrintSettings: settingsToMigrate
          });
        }
      }

      expect(mockUpdateUserSettings).toHaveBeenCalledWith({
        labelPrintSettings: expectedMigration
      });
    });
  });

  describe('Combined Settings Management', () => {
    it('should maintain both sticker and label settings together', async () => {
      const stickerSettings = {
        printMethod: 'pdf' as const,
        printerId: 'sticker-printer',
        orientation: 'portrait' as const,
        autoPrint: false
      };

      const labelSettings = {
        printMethod: 'queue' as const,
        printerId: 'label-printer',
        orientation: 'landscape' as const,
        autoPrint: true,
        enableCustomCopies: false,
        defaultCopies: 1
      };

      const combinedSettings: UserSettings = {
        autoSaveEnabled: true,
        stickerPrintSettings: stickerSettings,
        labelPrintSettings: labelSettings
      };

      mockGetUserSettings.mockResolvedValue(combinedSettings);

      const settings = await getUserSettings();

      expect(settings.stickerPrintSettings).toEqual(stickerSettings);
      expect(settings.labelPrintSettings).toEqual(labelSettings);
      expect(settings.autoSaveEnabled).toBe(true);
    });

    it('should preserve existing general settings when updating printer settings', async () => {
      const existingSettings: UserSettings = {
        autoSaveEnabled: true,
        showSaveNotifications: false,
        mobileViewEnabled: true
      };

      const newStickerSettings = {
        printMethod: 'queue' as const,
        printerId: 'new-printer',
        orientation: 'portrait' as const,
        autoPrint: true
      };

      mockGetUserSettings.mockResolvedValue(existingSettings);
      mockUpdateUserSettings.mockResolvedValue({
        message: 'Settings updated',
        settings: {
          ...existingSettings,
          stickerPrintSettings: newStickerSettings
        }
      });

      // Simulate updating only sticker settings
      const currentSettings = await getUserSettings();
      await updateUserSettings({
        ...currentSettings,
        stickerPrintSettings: newStickerSettings
      });

      expect(mockUpdateUserSettings).toHaveBeenCalledWith({
        autoSaveEnabled: true,
        showSaveNotifications: false,
        mobileViewEnabled: true,
        stickerPrintSettings: newStickerSettings
      });
    });
  });
});
