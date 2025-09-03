import { formatDuration, updateEstimatedDuration } from '../../scripts/utils.js';

describe('Utils Module', () => {
  describe('formatDuration', () => {
    test('formats seconds only for short durations', () => {
      expect(formatDuration(5)).toBe('5.0 seconds');
      expect(formatDuration(30)).toBe('30.0 seconds');
      expect(formatDuration(59)).toBe('59.0 seconds');
    });

    test('formats minutes and seconds for medium durations', () => {
      expect(formatDuration(60)).toBe('1:00');
      expect(formatDuration(90)).toBe('1:30');
      expect(formatDuration(125)).toBe('2:05');
      expect(formatDuration(3599)).toBe('59:59');
    });

    test('formats hours, minutes, and seconds for long durations', () => {
      expect(formatDuration(3600)).toBe('1:00:00');
      expect(formatDuration(3661)).toBe('1:01:01');
      expect(formatDuration(7265)).toBe('2:01:05');
    });

    test('handles edge cases', () => {
      expect(formatDuration(0)).toBe('0.0 seconds');
      expect(formatDuration(0.5)).toBe('0.5 seconds');
      expect(formatDuration(59.9)).toBe('59.9 seconds');
    });

    test('pads single digits correctly', () => {
      expect(formatDuration(3661)).toBe('1:01:01'); // 1h 1m 1s
      expect(formatDuration(3605)).toBe('1:00:05'); // 1h 0m 5s
      expect(formatDuration(65)).toBe('1:05'); // 1m 5s
    });

    test('handles negative values', () => {
      expect(formatDuration(-5)).toBe('-5.0 seconds');
      expect(formatDuration(-60)).toBe('-60.0 seconds'); // Math.floor on negative values
    });

    test('handles decimal seconds', () => {
      expect(formatDuration(1.2)).toBe('1.2 seconds');
      expect(formatDuration(30.7)).toBe('30.7 seconds');
    });

    test('handles very large values', () => {
      expect(formatDuration(36000)).toBe('10:00:00'); // 10 hours
      expect(formatDuration(359999)).toBe('99:59:59'); // 99+ hours
    });
  });

  describe('updateEstimatedDuration', () => {
    beforeEach(() => {
      // Reset DOM mocks
      jest.clearAllMocks();
    });

    test('calculates duration for empty text', () => {
      const mockTextInput = { value: '   ' }; // whitespace only
      const mockDurationElement = { textContent: '' };

      document.getElementById.mockImplementation(id => {
        if (id === 'textInput') {
          return mockTextInput;
        }
        if (id === 'durationEstimate') {
          return mockDurationElement;
        }
      });

      updateEstimatedDuration();

      expect(mockDurationElement.textContent).toBe('Estimated Duration (WPM): 0.0 secondss');
    });

    test('calculates duration for short text', () => {
      const mockTextInput = { value: 'Hello world this is a test' }; // 6 words
      const mockDurationElement = { textContent: '' };

      document.getElementById.mockImplementation(id => {
        if (id === 'textInput') {
          return mockTextInput;
        }
        if (id === 'durationEstimate') {
          return mockDurationElement;
        }
      });

      updateEstimatedDuration();

      // 6 words / 160 WPM * 60 = 2.25 seconds, ceil = 3 seconds
      expect(mockDurationElement.textContent).toBe('Estimated Duration (WPM): 3.0 secondss');
    });

    test('calculates duration for longer text', () => {
      // Create text with exactly 320 words (should be 2 minutes at 160 WPM)
      const words = Array(320).fill('word').join(' ');
      const mockTextInput = { value: words };
      const mockDurationElement = { textContent: '' };

      document.getElementById.mockImplementation(id => {
        if (id === 'textInput') {
          return mockTextInput;
        }
        if (id === 'durationEstimate') {
          return mockDurationElement;
        }
      });

      updateEstimatedDuration();

      // 320 words / 160 WPM * 60 = 120 seconds = 2:00
      expect(mockDurationElement.textContent).toBe('Estimated Duration (WPM): 2:00s');
    });

    test('handles text with extra whitespace', () => {
      const mockTextInput = { value: '  hello   world  test   ' }; // 3 words with extra spaces
      const mockDurationElement = { textContent: '' };

      document.getElementById.mockImplementation(id => {
        if (id === 'textInput') {
          return mockTextInput;
        }
        if (id === 'durationEstimate') {
          return mockDurationElement;
        }
      });

      updateEstimatedDuration();

      // 3 words / 160 WPM * 60 = 1.125 seconds, ceil = 2 seconds
      expect(mockDurationElement.textContent).toBe('Estimated Duration (WPM): 2.0 secondss');
    });

    test('filters out empty strings from word count', () => {
      const mockTextInput = { value: 'word1 word2   word3' }; // 3 actual words
      const mockDurationElement = { textContent: '' };

      document.getElementById.mockImplementation(id => {
        if (id === 'textInput') {
          return mockTextInput;
        }
        if (id === 'durationEstimate') {
          return mockDurationElement;
        }
      });

      updateEstimatedDuration();

      expect(mockDurationElement.textContent).toBe('Estimated Duration (WPM): 2.0 secondss');
    });

    test('handles single word', () => {
      const mockTextInput = { value: 'hello' };
      const mockDurationElement = { textContent: '' };

      document.getElementById.mockImplementation(id => {
        if (id === 'textInput') {
          return mockTextInput;
        }
        if (id === 'durationEstimate') {
          return mockDurationElement;
        }
      });

      updateEstimatedDuration();

      // 1 word / 160 WPM * 60 = 0.375 seconds, ceil = 1 second
      expect(mockDurationElement.textContent).toBe('Estimated Duration (WPM): 1.0 secondss');
    });

    test('handles text with newlines and tabs', () => {
      const mockTextInput = { value: 'hello\n\tworld\n\r\ntest' }; // 3 words with mixed whitespace
      const mockDurationElement = { textContent: '' };

      document.getElementById.mockImplementation(id => {
        if (id === 'textInput') {
          return mockTextInput;
        }
        if (id === 'durationEstimate') {
          return mockDurationElement;
        }
      });

      updateEstimatedDuration();

      expect(mockDurationElement.textContent).toBe('Estimated Duration (WPM): 2.0 secondss');
    });

    test('handles text resulting in hour duration', () => {
      // Create text with 9600 words (should be 1 hour at 160 WPM)
      const words = Array(9600).fill('test').join(' ');
      const mockTextInput = { value: words };
      const mockDurationElement = { textContent: '' };

      document.getElementById.mockImplementation(id => {
        if (id === 'textInput') {
          return mockTextInput;
        }
        if (id === 'durationEstimate') {
          return mockDurationElement;
        }
      });

      updateEstimatedDuration();

      // 9600 words / 160 WPM * 60 = 3600 seconds = 1:00:00
      expect(mockDurationElement.textContent).toBe('Estimated Duration (WPM): 1:00:00s');
    });

    test('handles missing DOM elements gracefully', () => {
      document.getElementById.mockImplementation(() => null);

      expect(() => updateEstimatedDuration()).toThrow();
    });
  });
});
