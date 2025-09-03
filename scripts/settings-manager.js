/**
 * Settings Manager - Handles application settings and persistent storage
 * Note: This module is designed to work with or without electron-store
 */

/**
 * Default application settings
 */
const DEFAULT_SETTINGS = {
  lastModel: '',
  lastText: '',
  lastOutput: '',
  windowBounds: {
    width: 800,
    height: 600,
    x: undefined,
    y: undefined,
  },
};

/**
 * Settings Manager class to handle application settings
 */
class SettingsManager {
  constructor(store = null) {
    this.store = store;
    this.memoryStorage = new Map(); // Fallback storage
  }

  /**
   * Get a setting value
   * @param {string} key - Setting key
   * @param {*} defaultValue - Default value if key not found
   * @returns {*} Setting value
   */
  get(key, defaultValue = null) {
    if (this.store) {
      return this.store.get(key, defaultValue);
    }

    // Fallback to memory storage
    return this.memoryStorage.has(key) ? this.memoryStorage.get(key) : defaultValue;
  }

  /**
   * Set a setting value
   * @param {string} key - Setting key
   * @param {*} value - Value to set
   */
  set(key, value) {
    if (this.store) {
      this.store.set(key, value);
    } else {
      // Fallback to memory storage
      this.memoryStorage.set(key, value);
    }
  }

  /**
   * Clear all settings
   */
  clear() {
    if (this.store) {
      this.store.clear();
    } else {
      this.memoryStorage.clear();
    }
  }

  /**
   * Get last used settings
   * @returns {object} Object containing last used settings
   */
  getLastSettings() {
    return {
      lastModel: this.get('lastModel', null),
      lastOutput: this.get('lastOutput', null),
      lastText: this.get('lastText', ''),
    };
  }

  /**
   * Save current session state
   * @param {string} text - Current text
   * @param {string} model - Current model/voice
   * @param {string} output - Current output path
   */
  saveSessionState(text, model, output) {
    if (text !== undefined) {
      this.set('lastText', text);
    }
    if (model !== undefined) {
      this.set('lastModel', model);
    }
    if (output !== undefined) {
      this.set('lastOutput', output);
    }
  }

  /**
   * Get window bounds
   * @param {object} defaultBounds - Default bounds if none saved
   * @returns {object} Window bounds object
   */
  getWindowBounds(defaultBounds = DEFAULT_SETTINGS.windowBounds) {
    return this.get('windowBounds', defaultBounds);
  }

  /**
   * Save window bounds
   * @param {object} bounds - Window bounds object
   */
  saveWindowBounds(bounds) {
    this.set('windowBounds', bounds);
  }

  /**
   * Reset settings to defaults
   * @param {boolean} keepWindowBounds - Whether to preserve window bounds
   */
  resetToDefaults(keepWindowBounds = false) {
    const currentBounds = keepWindowBounds ? this.getWindowBounds() : null;

    this.clear();

    // Restore window bounds if requested
    if (keepWindowBounds && currentBounds) {
      this.saveWindowBounds(currentBounds);
    }
  }

  /**
   * Export all settings as an object
   * @returns {object} All current settings
   */
  exportSettings() {
    const settings = {};

    if (this.store) {
      // If using electron-store, get all data
      return this.store.store || {};
    } else {
      // Convert memory storage to object
      for (const [key, value] of this.memoryStorage.entries()) {
        settings[key] = value;
      }
      return settings;
    }
  }

  /**
   * Import settings from an object
   * @param {object} settings - Settings object to import
   * @param {boolean} merge - Whether to merge with existing settings
   */
  importSettings(settings, merge = false) {
    if (!merge) {
      this.clear();
    }

    for (const [key, value] of Object.entries(settings)) {
      this.set(key, value);
    }
  }

  /**
   * Get setting with validation
   * @param {string} key - Setting key
   * @param {*} defaultValue - Default value
   * @param {function} validator - Validation function
   * @returns {*} Validated setting value
   */
  getSafe(key, defaultValue, validator = null) {
    const value = this.get(key, defaultValue);

    if (validator && !validator(value)) {
      return defaultValue;
    }

    return value;
  }

  /**
   * Check if settings store is available
   * @returns {boolean} True if store is available
   */
  isStoreAvailable() {
    return this.store !== null;
  }
}

/**
 * Create settings manager with electron-store if available
 * @param {object} storeConfig - Configuration for electron-store
 * @returns {SettingsManager} Settings manager instance
 */
function createSettingsManager(storeConfig = null) {
  let store = null;

  try {
    // Try to create electron-store instance if in Electron environment
    if (storeConfig) {
      const Store = require('electron-store').default;
      store = new Store({
        defaults: DEFAULT_SETTINGS,
        ...storeConfig,
      });
    }
  } catch {
    // electron-store not available (e.g., in tests)
    console.warn('Electron store not available, using memory storage');
  }

  return new SettingsManager(store);
}

module.exports = {
  SettingsManager,
  createSettingsManager,
  DEFAULT_SETTINGS,
};
