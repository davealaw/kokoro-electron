const {
  SettingsManager,
  createSettingsManager,
  DEFAULT_SETTINGS,
} = require('../../scripts/settings-manager');

// Mock electron-store
jest.mock('electron-store', () => ({
  default: jest.fn(),
}));

describe('Settings Manager Module', () => {
  describe('DEFAULT_SETTINGS constant', () => {
    test('has expected structure', () => {
      expect(DEFAULT_SETTINGS).toEqual({
        lastModel: '',
        lastText: '',
        lastOutput: '',
        windowBounds: {
          width: 800,
          height: 600,
          x: undefined,
          y: undefined,
        },
      });
    });
  });

  describe('SettingsManager Class', () => {
    describe('with memory storage (no electron-store)', () => {
      let manager;

      beforeEach(() => {
        manager = new SettingsManager(); // No store provided
      });

      describe('constructor', () => {
        test('initializes with memory storage when no store provided', () => {
          expect(manager.store).toBe(null);
          expect(manager.memoryStorage).toBeInstanceOf(Map);
        });
      });

      describe('get/set operations', () => {
        test('sets and gets values from memory storage', () => {
          manager.set('testKey', 'testValue');
          expect(manager.get('testKey')).toBe('testValue');
        });

        test('returns default value for non-existent keys', () => {
          expect(manager.get('nonExistent', 'defaultValue')).toBe('defaultValue');
        });

        test('returns null by default for non-existent keys', () => {
          expect(manager.get('nonExistent')).toBe(null);
        });

        test('handles different data types', () => {
          manager.set('string', 'text');
          manager.set('number', 42);
          manager.set('boolean', true);
          manager.set('object', { key: 'value' });
          manager.set('array', [1, 2, 3]);

          expect(manager.get('string')).toBe('text');
          expect(manager.get('number')).toBe(42);
          expect(manager.get('boolean')).toBe(true);
          expect(manager.get('object')).toEqual({ key: 'value' });
          expect(manager.get('array')).toEqual([1, 2, 3]);
        });
      });

      describe('clear', () => {
        test('clears all memory storage', () => {
          manager.set('key1', 'value1');
          manager.set('key2', 'value2');

          manager.clear();

          expect(manager.get('key1')).toBe(null);
          expect(manager.get('key2')).toBe(null);
          expect(manager.memoryStorage.size).toBe(0);
        });
      });

      describe('getLastSettings', () => {
        test('returns last settings with defaults', () => {
          const settings = manager.getLastSettings();

          expect(settings).toEqual({
            lastModel: null,
            lastOutput: null,
            lastText: '',
          });
        });

        test('returns saved settings', () => {
          manager.set('lastModel', 'voice1');
          manager.set('lastOutput', '/path/to/output.wav');
          manager.set('lastText', 'Hello world');

          const settings = manager.getLastSettings();

          expect(settings).toEqual({
            lastModel: 'voice1',
            lastOutput: '/path/to/output.wav',
            lastText: 'Hello world',
          });
        });
      });

      describe('saveSessionState', () => {
        test('saves all provided session data', () => {
          manager.saveSessionState('test text', 'voice1', '/output.wav');

          expect(manager.get('lastText')).toBe('test text');
          expect(manager.get('lastModel')).toBe('voice1');
          expect(manager.get('lastOutput')).toBe('/output.wav');
        });

        test('only saves defined values', () => {
          manager.set('lastText', 'existing');
          manager.set('lastModel', 'existing');

          manager.saveSessionState(undefined, 'newVoice', undefined);

          expect(manager.get('lastText')).toBe('existing'); // Unchanged
          expect(manager.get('lastModel')).toBe('newVoice');
          expect(manager.get('lastOutput')).toBe(null); // Unchanged
        });
      });

      describe('window bounds', () => {
        test('getWindowBounds returns default bounds when none saved', () => {
          const bounds = manager.getWindowBounds();

          expect(bounds).toEqual(DEFAULT_SETTINGS.windowBounds);
        });

        test('getWindowBounds uses custom defaults', () => {
          const customDefaults = { width: 1200, height: 800 };
          const bounds = manager.getWindowBounds(customDefaults);

          expect(bounds).toEqual(customDefaults);
        });

        test('saveWindowBounds stores bounds correctly', () => {
          const bounds = { width: 1024, height: 768, x: 100, y: 200 };
          manager.saveWindowBounds(bounds);

          expect(manager.getWindowBounds()).toEqual(bounds);
        });
      });

      describe('resetToDefaults', () => {
        test('clears all settings', () => {
          manager.set('lastText', 'some text');
          manager.set('lastModel', 'some voice');
          manager.set('customSetting', 'custom value');

          manager.resetToDefaults();

          expect(manager.get('lastText')).toBe(null);
          expect(manager.get('lastModel')).toBe(null);
          expect(manager.get('customSetting')).toBe(null);
        });

        test('preserves window bounds when requested', () => {
          const bounds = { width: 1024, height: 768, x: 100, y: 200 };
          manager.saveWindowBounds(bounds);
          manager.set('lastText', 'some text');

          manager.resetToDefaults(true);

          expect(manager.getWindowBounds()).toEqual(bounds);
          expect(manager.get('lastText')).toBe(null);
        });
      });

      describe('exportSettings', () => {
        test('exports all settings from memory storage', () => {
          manager.set('setting1', 'value1');
          manager.set('setting2', { nested: 'object' });
          manager.set('setting3', [1, 2, 3]);

          const exported = manager.exportSettings();

          expect(exported).toEqual({
            setting1: 'value1',
            setting2: { nested: 'object' },
            setting3: [1, 2, 3],
          });
        });

        test('returns empty object when no settings', () => {
          const exported = manager.exportSettings();
          expect(exported).toEqual({});
        });
      });

      describe('importSettings', () => {
        test('imports settings and replaces existing by default', () => {
          manager.set('existing', 'value');

          const toImport = {
            setting1: 'imported1',
            setting2: 'imported2',
          };

          manager.importSettings(toImport);

          expect(manager.get('setting1')).toBe('imported1');
          expect(manager.get('setting2')).toBe('imported2');
          expect(manager.get('existing')).toBe(null); // Cleared
        });

        test('merges settings when merge=true', () => {
          manager.set('existing', 'value');

          const toImport = {
            setting1: 'imported1',
            setting2: 'imported2',
          };

          manager.importSettings(toImport, true);

          expect(manager.get('setting1')).toBe('imported1');
          expect(manager.get('setting2')).toBe('imported2');
          expect(manager.get('existing')).toBe('value'); // Preserved
        });
      });

      describe('getSafe', () => {
        test('returns value when validation passes', () => {
          manager.set('number', 42);

          const validator = value => typeof value === 'number';
          const result = manager.getSafe('number', 0, validator);

          expect(result).toBe(42);
        });

        test('returns default when validation fails', () => {
          manager.set('string', 'not a number');

          const validator = value => typeof value === 'number';
          const result = manager.getSafe('string', 0, validator);

          expect(result).toBe(0);
        });

        test('works without validator', () => {
          manager.set('value', 'test');
          const result = manager.getSafe('value', 'default');

          expect(result).toBe('test');
        });
      });

      describe('isStoreAvailable', () => {
        test('returns false when no electron-store', () => {
          expect(manager.isStoreAvailable()).toBe(false);
        });
      });
    });

    describe('with electron-store', () => {
      let mockStore;
      let manager;

      beforeEach(() => {
        mockStore = {
          get: jest.fn(),
          set: jest.fn(),
          clear: jest.fn(),
          store: {},
        };
        manager = new SettingsManager(mockStore);
      });

      test('uses electron-store for operations', () => {
        mockStore.get.mockReturnValue('stored value');

        manager.set('key', 'value');
        const result = manager.get('key', 'default');
        manager.clear();

        expect(mockStore.set).toHaveBeenCalledWith('key', 'value');
        expect(mockStore.get).toHaveBeenCalledWith('key', 'default');
        expect(mockStore.clear).toHaveBeenCalled();
        expect(result).toBe('stored value');
      });

      test('isStoreAvailable returns true', () => {
        expect(manager.isStoreAvailable()).toBe(true);
      });

      test('exportSettings uses store.store property', () => {
        mockStore.store = { setting1: 'value1', setting2: 'value2' };

        const exported = manager.exportSettings();

        expect(exported).toEqual({ setting1: 'value1', setting2: 'value2' });
      });
    });
  });

  describe('createSettingsManager factory function', () => {
    const ElectronStore = require('electron-store').default;

    beforeEach(() => {
      ElectronStore.mockClear();
    });

    test('creates manager with electron-store when config provided', () => {
      const mockStoreInstance = {
        get: jest.fn(),
        set: jest.fn(),
        clear: jest.fn(),
      };
      ElectronStore.mockReturnValue(mockStoreInstance);

      const config = { defaults: { test: 'value' } };
      const manager = createSettingsManager(config);

      expect(ElectronStore).toHaveBeenCalledWith({
        defaults: DEFAULT_SETTINGS,
        ...config,
      });
      expect(manager).toBeInstanceOf(SettingsManager);
      expect(manager.isStoreAvailable()).toBe(true);
    });

    test('creates manager without electron-store when no config', () => {
      const manager = createSettingsManager();

      expect(ElectronStore).not.toHaveBeenCalled();
      expect(manager).toBeInstanceOf(SettingsManager);
      expect(manager.isStoreAvailable()).toBe(false);
    });

    test('handles electron-store import error gracefully', () => {
      // Mock electron-store to throw on require
      ElectronStore.mockImplementation(() => {
        throw new Error('Module not found');
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const manager = createSettingsManager({ defaults: {} });

      expect(manager).toBeInstanceOf(SettingsManager);
      expect(manager.isStoreAvailable()).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Electron store not available, using memory storage');

      consoleSpy.mockRestore();
    });

    test('merges default settings correctly', () => {
      const mockStoreInstance = {
        get: jest.fn(),
        set: jest.fn(),
        clear: jest.fn(),
      };
      ElectronStore.mockReturnValue(mockStoreInstance);

      const customDefaults = {
        customSetting: 'custom value',
        windowBounds: { width: 1200, height: 900 },
      };

      createSettingsManager({ defaults: customDefaults });

      expect(ElectronStore).toHaveBeenCalledWith({
        defaults: DEFAULT_SETTINGS,
        ...{ defaults: customDefaults },
      });
    });
  });
});
