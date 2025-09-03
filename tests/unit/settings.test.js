import { loadSettings, populateVoices } from '../../scripts/settings.js';

describe('Settings Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset the API mocks
    window.kokoroAPI.getLastSettings.mockResolvedValue({
      lastText: 'previous text',
      lastOutput: '/previous/output.wav',
      lastModel: 'previous-voice',
    });

    window.kokoroAPI.initializeKokoro.mockResolvedValue(true);
    window.kokoroAPI.listVoices.mockResolvedValue({
      voice1: { name: 'Voice One', gender: 'female', language: 'en' },
      voice2: { name: 'Voice Two', gender: 'male', language: 'en' },
    });
  });

  describe('loadSettings', () => {
    test('loads and applies last text setting', async () => {
      const mockTextInput = { value: '' };
      const mockOutputPath = { value: '' };
      const mockStatus = { textContent: 'loading...' };
      const mockVoiceSelect = {
        innerHTML: '',
        value: '',
        options: [{ value: 'previous-voice', text: 'Previous Voice' }],
        appendChild: jest.fn(),
      };

      document.getElementById.mockImplementation(id => {
        if (id === 'textInput') {
          return mockTextInput;
        }
        if (id === 'outputPath') {
          return mockOutputPath;
        }
        if (id === 'status') {
          return mockStatus;
        }
        if (id === 'voiceSelect') {
          return mockVoiceSelect;
        }
        return null;
      });

      await loadSettings();

      expect(mockTextInput.value).toBe('previous text');
      expect(mockOutputPath.value).toBe('/previous/output.wav');
      expect(mockStatus.textContent).toBe('');
      expect(mockVoiceSelect.value).toBe('previous-voice');
    });

    test('handles empty settings gracefully', async () => {
      const mockTextInput = { value: 'initial' };
      const mockOutputPath = { value: 'initial' };
      const mockVoiceSelect = {
        innerHTML: '',
        value: '',
        options: [],
        appendChild: jest.fn(),
      };

      window.kokoroAPI.getLastSettings.mockResolvedValue({
        lastText: '',
        lastOutput: '',
        lastModel: '',
      });

      document.getElementById.mockImplementation(id => {
        if (id === 'textInput') {
          return mockTextInput;
        }
        if (id === 'outputPath') {
          return mockOutputPath;
        }
        if (id === 'voiceSelect') {
          return mockVoiceSelect;
        }
        if (id === 'status') {
          return { textContent: '' };
        }
        return null;
      });

      await loadSettings();

      expect(mockTextInput.value).toBe('initial'); // unchanged
      expect(mockOutputPath.value).toBe('initial'); // unchanged
    });

    test('loads voice selection when model exists in options', async () => {
      const mockVoiceSelect = {
        innerHTML: '',
        value: '',
        options: [
          { value: 'voice1', text: 'Voice One' },
          { value: 'voice2', text: 'Voice Two' },
        ],
        appendChild: jest.fn(),
      };

      Array.from = jest.fn().mockReturnValue(mockVoiceSelect.options);

      document.getElementById.mockImplementation(id => {
        if (id === 'voiceSelect') {
          return mockVoiceSelect;
        }
        if (id === 'textInput') {
          return { value: '' };
        }
        if (id === 'outputPath') {
          return { value: '' };
        }
        if (id === 'status') {
          return { textContent: '' };
        }
        return null;
      });

      window.kokoroAPI.getLastSettings.mockResolvedValue({
        lastModel: 'voice2',
      });

      await loadSettings();

      expect(mockVoiceSelect.value).toBe('voice2');
    });
  });

  describe('populateVoices', () => {
    test('populates voice options successfully', async () => {
      const mockVoiceSelect = {
        innerHTML: '',
        value: '',
        options: [],
        appendChild: jest.fn(),
      };

      document.getElementById.mockImplementation(id => {
        if (id === 'voiceSelect') {
          return mockVoiceSelect;
        }
        return null;
      });

      document.createElement = jest.fn(tag => {
        if (tag === 'option') {
          return { value: '', text: '', disabled: false };
        }
        return {};
      });

      await populateVoices();

      expect(mockVoiceSelect.innerHTML).toBe('');
      expect(window.kokoroAPI.initializeKokoro).toHaveBeenCalled();
      expect(window.kokoroAPI.listVoices).toHaveBeenCalled();
      expect(mockVoiceSelect.appendChild).toHaveBeenCalledTimes(2); // two voices
    });

    test('handles TTS initialization failure', async () => {
      const mockVoiceSelect = {
        innerHTML: '',
        appendChild: jest.fn(),
      };

      document.getElementById.mockImplementation(id => {
        if (id === 'voiceSelect') {
          return mockVoiceSelect;
        }
        return null;
      });

      let createdOption = null;
      document.createElement = jest.fn(tag => {
        if (tag === 'option') {
          createdOption = { text: '', disabled: false };
          return createdOption;
        }
        return {};
      });

      window.kokoroAPI.initializeKokoro.mockResolvedValue(false);

      await populateVoices();

      expect(createdOption.text).toBe('Model failed to load');
      expect(createdOption.disabled).toBe(true);
      expect(mockVoiceSelect.appendChild).toHaveBeenCalledWith(createdOption);
    });

    test('handles no voices found', async () => {
      const mockVoiceSelect = {
        innerHTML: '',
        appendChild: jest.fn(),
      };

      document.getElementById.mockImplementation(id => {
        if (id === 'voiceSelect') {
          return mockVoiceSelect;
        }
        return null;
      });

      let createdOption = null;
      document.createElement = jest.fn(tag => {
        if (tag === 'option') {
          createdOption = { text: '', disabled: false };
          return createdOption;
        }
        return {};
      });

      window.kokoroAPI.listVoices.mockResolvedValue(null);

      await populateVoices();

      expect(createdOption.text).toBe('No voices found');
      expect(createdOption.disabled).toBe(true);
      expect(mockVoiceSelect.appendChild).toHaveBeenCalledWith(createdOption);
    });

    test('handles invalid voices response', async () => {
      const mockVoiceSelect = {
        innerHTML: '',
        appendChild: jest.fn(),
      };

      document.getElementById.mockImplementation(id => {
        if (id === 'voiceSelect') {
          return mockVoiceSelect;
        }
        return null;
      });

      let createdOption = null;
      document.createElement = jest.fn(tag => {
        if (tag === 'option') {
          createdOption = { text: '', disabled: false };
          return createdOption;
        }
        return {};
      });

      window.kokoroAPI.listVoices.mockResolvedValue('invalid response');

      await populateVoices();

      expect(createdOption.text).toBe('No voices found');
      expect(createdOption.disabled).toBe(true);
      expect(mockVoiceSelect.appendChild).toHaveBeenCalledWith(createdOption);
    });

    test('sets first voice as default selection', async () => {
      const mockVoiceSelect = {
        innerHTML: '',
        value: '',
        options: [{ value: 'voice1' }, { value: 'voice2' }],
        appendChild: jest.fn(),
      };

      Object.defineProperty(mockVoiceSelect, 'options', {
        get: jest.fn(() => [{ value: 'voice1' }, { value: 'voice2' }]),
        configurable: true,
      });

      document.getElementById.mockImplementation(id => {
        if (id === 'voiceSelect') {
          return mockVoiceSelect;
        }
        return null;
      });

      document.createElement = jest.fn(tag => {
        if (tag === 'option') {
          return { value: '', text: '', disabled: false };
        }
        return {};
      });

      await populateVoices();

      expect(mockVoiceSelect.value).toBe('voice1');
    });

    test('formats voice option text correctly', async () => {
      const mockVoiceSelect = {
        innerHTML: '',
        appendChild: jest.fn(),
        options: [{ value: 'voice1' }], // Add options array
        value: '',
      };

      // Mock options.length property
      Object.defineProperty(mockVoiceSelect, 'options', {
        value: [{ value: 'voice1' }],
        writable: true,
      });

      document.getElementById.mockImplementation(id => {
        if (id === 'voiceSelect') {
          return mockVoiceSelect;
        }
        return null;
      });

      let createdOption = null;
      document.createElement = jest.fn(tag => {
        if (tag === 'option') {
          createdOption = { value: '', text: '', disabled: false };
          return createdOption;
        }
        return {};
      });

      // Mock Object.entries to control iteration
      const originalEntries = Object.entries;
      Object.entries = jest.fn(() => [
        [
          'voice1',
          {
            name: 'TestVoice',
            gender: 'female',
            language: 'en',
            traits: 'calm',
            overallGrade: 'A',
          },
        ],
      ]);

      await populateVoices();

      // Restore original Object.entries
      Object.entries = originalEntries;

      expect(createdOption.value).toBe('voice1');
      expect(createdOption.text).toContain('TestVoice');
      expect(createdOption.text).toContain('female');
      expect(createdOption.text).toContain('en');
      expect(mockVoiceSelect.value).toBe('voice1'); // Should set first option as default
    });
  });
});
