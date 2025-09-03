import { updateSpeakButtonState, cancelSpeak } from '../../scripts/states.js';

describe('States Module (Core Functions)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

    test('handles null voiceSelect gracefully', () => {
      const mockElements = {
        voiceSelect: null, // element not found
        textInput: { value: 'Some text' },
        speakButton: { disabled: false },
        streamButton: { disabled: false },
        previewBtn: { disabled: false },
      };

      document.getElementById.mockImplementation(id => {
        if (id === 'voiceSelect') {
          return null;
        }
        return mockElements[id] || {};
      });

      expect(() => updateSpeakButtonState()).not.toThrow();

      expect(mockElements.speakButton.disabled).toBe(true);
      expect(mockElements.streamButton.disabled).toBe(true);
      expect(mockElements.previewBtn.disabled).toBe(true);
    });

    test('validates text content properly', () => {
      const testCases = [
        { text: 'valid text', expectEnabled: true },
        { text: '   ', expectEnabled: false }, // whitespace only
        { text: '', expectEnabled: false }, // empty
        { text: 'a', expectEnabled: true }, // single character
        { text: '  valid  ', expectEnabled: true }, // text with surrounding whitespace
      ];

      testCases.forEach(({ text, expectEnabled }) => {
        const mockElements = {
          voiceSelect: { value: 'test-voice' },
          textInput: { value: text },
          speakButton: { disabled: !expectEnabled },
          streamButton: { disabled: !expectEnabled },
          previewBtn: { disabled: true },
        };

        document.getElementById.mockImplementation(id => mockElements[id] || {});
        updateSpeakButtonState();

        expect(mockElements.speakButton.disabled).toBe(!expectEnabled);
        expect(mockElements.streamButton.disabled).toBe(!expectEnabled);
        expect(mockElements.previewBtn.disabled).toBe(false); // preview always enabled with voice
      });
    });
  });

  describe('cancelSpeak', () => {
    test('resets UI state when canceling', async () => {
      const mockElements = {
        status: { textContent: 'Processing...' },
        speakButton: { disabled: true },
        streamButton: { disabled: true },
        cancelButton: { disabled: false },
        progressBar: { style: { width: '50%' } },
        progressText: { textContent: '50%' },
        progressContainer: { style: { display: 'block' } },
        durationEstimate: { textContent: 'Duration: 2:00' },
      };

      document.getElementById.mockImplementation(id => mockElements[id] || null);

      await cancelSpeak();

      expect(mockElements.status.textContent).toBe('Cancelled.');
      expect(mockElements.speakButton.disabled).toBe(false);
      expect(mockElements.streamButton.disabled).toBe(false);
      expect(mockElements.cancelButton.disabled).toBe(true);
      expect(mockElements.progressBar.style.width).toBe('0%');
      expect(mockElements.progressText.textContent).toBe('');
      expect(mockElements.progressContainer.style.display).toBe('none');
      expect(mockElements.durationEstimate.textContent).toBe('');
    });

    test('handles missing DOM elements gracefully', async () => {
      document.getElementById.mockImplementation(() => null);

      expect(() => cancelSpeak()).not.toThrow();

      // Should complete without errors even when elements don't exist
      await expect(cancelSpeak()).resolves.not.toThrow();
    });

    test('works with partial DOM elements', async () => {
      const mockStatus = { textContent: 'Processing...' };
      const mockButtons = {
        speakButton: { disabled: true },
        streamButton: { disabled: true },
      };

      document.getElementById.mockImplementation(id => {
        if (id === 'status') {
          return mockStatus;
        }
        if (id in mockButtons) {
          return mockButtons[id];
        }
        return null; // other elements missing
      });

      await cancelSpeak();

      expect(mockStatus.textContent).toBe('Cancelled.');
      expect(mockButtons.speakButton.disabled).toBe(false);
      expect(mockButtons.streamButton.disabled).toBe(false);
    });

    test('resets all progress-related UI elements', async () => {
      const mockElements = {
        progressBar: { style: { width: '75%' } },
        progressText: { textContent: 'Processing 75%...' },
        progressContainer: { style: { display: 'block' } },
        durationEstimate: { textContent: 'Estimated: 3:45' },
      };

      document.getElementById.mockImplementation(id => mockElements[id] || null);

      await cancelSpeak();

      expect(mockElements.progressBar.style.width).toBe('0%');
      expect(mockElements.progressText.textContent).toBe('');
      expect(mockElements.progressContainer.style.display).toBe('none');
      expect(mockElements.durationEstimate.textContent).toBe('');
    });

    test('handles elements with no style property', async () => {
      const mockElements = {
        progressBar: { style: null }, // Simulate missing style
        progressContainer: { style: undefined },
        status: { textContent: 'Processing...' },
      };

      document.getElementById.mockImplementation(id => mockElements[id] || null);

      // Should not throw even with missing style properties
      await expect(cancelSpeak()).resolves.not.toThrow();
    });
  });
});
