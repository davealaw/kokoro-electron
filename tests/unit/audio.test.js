import {
  playAudio,
  pauseAudio,
  resumeAudio,
  stopAudio,
  initializeAudioPlayerEvents,
} from '../../scripts/audio.js';

describe('Audio Module', () => {
  let mockAudioElement;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAudioElement = {
      play: jest.fn(),
      pause: jest.fn(),
      load: jest.fn(),
      currentTime: 0,
      duration: 100,
      onloadedmetadata: null,
      onplay: null,
      onpause: null,
      onended: null,
      ontimeupdate: null,
    };

    document.getElementById.mockImplementation(id => {
      if (id === 'audioPlayer') {
        return mockAudioElement;
      }
      if (id === 'status') {
        return { textContent: '' };
      }
      if (id === 'durationEstimate') {
        return { textContent: '' };
      }
      if (id === 'audioControls') {
        return { style: { display: 'none' } };
      }
      if (id === 'progressContainer') {
        return { style: { display: 'none' } };
      }
      if (id === 'speakButton') {
        return { disabled: false };
      }
      if (id === 'streamButton') {
        return { disabled: false };
      }
      if (id === 'progressBar') {
        return { style: { width: '0%' } };
      }
      if (id === 'progressText') {
        return { textContent: '' };
      }
      return { textContent: '', style: {} };
    });
  });

  describe('playAudio', () => {
    test('calls play on audio element', () => {
      playAudio();
      expect(mockAudioElement.play).toHaveBeenCalledTimes(1);
    });
  });

  describe('pauseAudio', () => {
    test('calls pause on audio element', () => {
      pauseAudio();
      expect(mockAudioElement.pause).toHaveBeenCalledTimes(1);
    });
  });

  describe('resumeAudio', () => {
    test('calls play on audio element (resume is same as play)', () => {
      resumeAudio();
      expect(mockAudioElement.play).toHaveBeenCalledTimes(1);
    });
  });

  describe('stopAudio', () => {
    test('pauses audio and resets currentTime', () => {
      mockAudioElement.currentTime = 50;

      stopAudio();

      expect(mockAudioElement.pause).toHaveBeenCalledTimes(1);
      expect(mockAudioElement.currentTime).toBe(0);
    });
  });

  describe('initializeAudioPlayerEvents', () => {
    test('sets up all event handlers', () => {
      initializeAudioPlayerEvents();

      expect(mockAudioElement.onloadedmetadata).toBeDefined();
      expect(mockAudioElement.onplay).toBeDefined();
      expect(mockAudioElement.onpause).toBeDefined();
      expect(mockAudioElement.onended).toBeDefined();
      expect(mockAudioElement.ontimeupdate).toBeDefined();
    });

    describe('event handlers behavior', () => {
      beforeEach(() => {
        initializeAudioPlayerEvents();
      });

      test('onloadedmetadata updates duration display', () => {
        const mockDurationElement = { textContent: '' };
        document.getElementById.mockImplementation(id => {
          if (id === 'audioPlayer') {
            return mockAudioElement;
          }
          if (id === 'durationEstimate') {
            return mockDurationElement;
          }
          return { textContent: '', style: {} };
        });

        mockAudioElement.duration = 123;
        mockAudioElement.onloadedmetadata();

        expect(mockDurationElement.textContent).toBe('Duration: 2:03');
      });

      test('onplay updates status and shows controls', () => {
        const mockStatus = { textContent: '' };
        const mockControls = { style: { display: 'none' } };

        document.getElementById.mockImplementation(id => {
          if (id === 'audioPlayer') {
            return mockAudioElement;
          }
          if (id === 'status') {
            return mockStatus;
          }
          if (id === 'audioControls') {
            return mockControls;
          }
          return { textContent: '', style: {} };
        });

        mockAudioElement.onplay();

        expect(mockStatus.textContent).toBe('Playing...');
        expect(mockControls.style.display).toBe('block');
      });

      test('onpause updates status', () => {
        const mockStatus = { textContent: '' };

        document.getElementById.mockImplementation(id => {
          if (id === 'audioPlayer') {
            return mockAudioElement;
          }
          if (id === 'status') {
            return mockStatus;
          }
          return { textContent: '', style: {} };
        });

        mockAudioElement.onpause();

        expect(mockStatus.textContent).toBe('Paused');
      });

      test('onended updates status and hides controls', () => {
        const mockStatus = { textContent: '' };
        const mockControls = { style: { display: 'block' } };
        const mockProgressContainer = { style: { display: 'block' } };
        const mockSpeakButton = { disabled: true };
        const mockStreamButton = { disabled: true };

        document.getElementById.mockImplementation(id => {
          if (id === 'audioPlayer') {
            return mockAudioElement;
          }
          if (id === 'status') {
            return mockStatus;
          }
          if (id === 'audioControls') {
            return mockControls;
          }
          if (id === 'progressContainer') {
            return mockProgressContainer;
          }
          if (id === 'speakButton') {
            return mockSpeakButton;
          }
          if (id === 'streamButton') {
            return mockStreamButton;
          }
          return { textContent: '', style: {} };
        });

        mockAudioElement.onended();

        expect(mockStatus.textContent).toBe('Done.');
        expect(mockControls.style.display).toBe('none');
        expect(mockProgressContainer.style.display).toBe('none');
        expect(mockSpeakButton.disabled).toBe(false);
        expect(mockStreamButton.disabled).toBe(false);
      });

      test('ontimeupdate updates progress bar', () => {
        const mockProgressBar = { style: { width: '0%' } };
        const mockProgressText = { textContent: '' };

        document.getElementById.mockImplementation(id => {
          if (id === 'audioPlayer') {
            return mockAudioElement;
          }
          if (id === 'progressBar') {
            return mockProgressBar;
          }
          if (id === 'progressText') {
            return mockProgressText;
          }
          return { textContent: '', style: {} };
        });

        mockAudioElement.currentTime = 25;
        mockAudioElement.duration = 100;
        mockAudioElement.ontimeupdate();

        expect(mockProgressBar.style.width).toBe('25%');
        expect(mockProgressText.textContent).toBe('25%');
      });

      test('ontimeupdate handles edge cases', () => {
        const mockProgressBar = { style: { width: '0%' } };
        const mockProgressText = { textContent: '' };

        document.getElementById.mockImplementation(id => {
          if (id === 'audioPlayer') {
            return mockAudioElement;
          }
          if (id === 'progressBar') {
            return mockProgressBar;
          }
          if (id === 'progressText') {
            return mockProgressText;
          }
          return { textContent: '', style: {} };
        });

        // Test with 0 duration (should not cause division by zero)
        mockAudioElement.currentTime = 10;
        mockAudioElement.duration = 0;
        mockAudioElement.ontimeupdate();

        expect(mockProgressBar.style.width).toBe('Infinity%');
        expect(mockProgressText.textContent).toBe('Infinity%');

        // Test with fractional percentage
        mockAudioElement.currentTime = 33.333;
        mockAudioElement.duration = 100;
        mockAudioElement.ontimeupdate();

        expect(mockProgressBar.style.width).toBe('33%');
        expect(mockProgressText.textContent).toBe('33%');
      });
    });
  });
});
