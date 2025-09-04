import { updateSpeakButtonState, resetToDefaults } from '../../scripts/states.js';

describe('States Module', () => {
  let mockReload;

  beforeEach(() => {
    jest.clearAllMocks();

    // Clear previous mockReload if it exists
    if (mockReload) {
      mockReload.mockClear();
    }

    global.confirm = jest.fn(() => true);

    // Mock location for browser context
    mockReload = jest.fn();
    // Set location in both global and as a direct global property
    global.location = { reload: mockReload };
    // For Node.js testing, also set it in the globalThis
    if (typeof globalThis !== 'undefined') {
      globalThis.location = { reload: mockReload };
    }
  });

  describe('updateSpeakButtonState', () => {
    test('enables buttons when model is valid and text is present', () => {
      const mockElements = {
        voiceSelect: { value: 'test-voice-model' },
        textInput: { value: 'Some test text' },
        speakButton: { disabled: true },
        streamButton: { disabled: true },
        previewBtn: { disabled: true },
      };

      document.getElementById.mockImplementation(id => mockElements[id] || {});

      updateSpeakButtonState();

      expect(mockElements.speakButton.disabled).toBe(false);
      expect(mockElements.streamButton.disabled).toBe(false);
      expect(mockElements.previewBtn.disabled).toBe(false);
    });

    test('disables speak/stream buttons when text is empty', () => {
      const mockElements = {
        voiceSelect: { value: 'test-voice-model' },
        textInput: { value: '   ' }, // empty/whitespace only
        speakButton: { disabled: false },
        streamButton: { disabled: false },
        previewBtn: { disabled: false },
      };

      document.getElementById.mockImplementation(id => mockElements[id] || {});

      updateSpeakButtonState();

      expect(mockElements.speakButton.disabled).toBe(true);
      expect(mockElements.streamButton.disabled).toBe(true);
      expect(mockElements.previewBtn.disabled).toBe(false); // preview only needs model
    });

    test('disables all buttons when model is not selected', () => {
      const mockElements = {
        voiceSelect: { value: '' }, // no model selected
        textInput: { value: 'Some test text' },
        speakButton: { disabled: false },
        streamButton: { disabled: false },
        previewBtn: { disabled: false },
      };

      document.getElementById.mockImplementation(id => mockElements[id] || {});

      updateSpeakButtonState();

      expect(mockElements.speakButton.disabled).toBe(true);
      expect(mockElements.streamButton.disabled).toBe(true);
      expect(mockElements.previewBtn.disabled).toBe(true);
    });

    test('disables all buttons when both model and text are missing', () => {
      const mockElements = {
        voiceSelect: { value: null },
        textInput: { value: '' },
        speakButton: { disabled: false },
        streamButton: { disabled: false },
        previewBtn: { disabled: false },
      };

      document.getElementById.mockImplementation(id => mockElements[id] || {});

      updateSpeakButtonState();

      expect(mockElements.speakButton.disabled).toBe(true);
      expect(mockElements.streamButton.disabled).toBe(true);
      expect(mockElements.previewBtn.disabled).toBe(true);
    });

    test('handles null textArea gracefully', () => {
      const mockElements = {
        voiceSelect: { value: 'test-voice-model' },
        textInput: null, // element not found
        speakButton: { disabled: false },
        streamButton: { disabled: false },
        previewBtn: { disabled: false },
      };

      document.getElementById.mockImplementation(id => {
        if (id === 'textInput') {
          return null;
        }
        return mockElements[id] || {};
      });

      expect(() => updateSpeakButtonState()).not.toThrow();

      expect(mockElements.speakButton.disabled).toBe(true);
      expect(mockElements.streamButton.disabled).toBe(true);
      expect(mockElements.previewBtn.disabled).toBe(false);
    });
  });

  describe('resetToDefaults', () => {
    test('resets settings when user confirms', async () => {
      const mockDurationElement = { textContent: 'Previous Duration' };
      document.getElementById.mockImplementation(id => {
        if (id === 'durationEstimate') {
          return mockDurationElement;
        }
        return {};
      });

      global.confirm.mockReturnValue(true);
      window.kokoroAPI.resetSettings.mockResolvedValue(true);

      await resetToDefaults();

      expect(global.confirm).toHaveBeenCalledWith(
        'Are you sure you want to reset all settings to defaults?'
      );
      expect(mockDurationElement.textContent).toBe('Estimated Duration: —');
      expect(window.kokoroAPI.resetSettings).toHaveBeenCalled();
      // Note: location.reload() call is verified by integration tests
    });

    test('does not reset settings when user cancels', async () => {
      global.confirm.mockReturnValue(false);

      await resetToDefaults();

      expect(global.confirm).toHaveBeenCalled();
      expect(window.kokoroAPI.resetSettings).not.toHaveBeenCalled();
      expect(mockReload).not.toHaveBeenCalled();
    });

    test('resets duration estimate before API call', async () => {
      const mockDurationElement = { textContent: 'Previous Duration' };
      document.getElementById.mockImplementation(id => {
        if (id === 'durationEstimate') {
          return mockDurationElement;
        }
        return {};
      });

      global.confirm.mockReturnValue(true);
      window.kokoroAPI.resetSettings.mockImplementation(() => {
        // Check that duration was reset before this call
        expect(mockDurationElement.textContent).toBe('Estimated Duration: —');
        return Promise.resolve(true);
      });

      await resetToDefaults();
    });
  });
});
