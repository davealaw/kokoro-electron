const {
  TTSManager,
  ttsManager,
  FIXED_MODEL_ID,
  FIXED_DTYPE,
} = require('../../scripts/tts-manager');

// Mock the kokoro-js module
jest.mock('kokoro-js', () => ({
  KokoroTTS: {
    from_pretrained: jest.fn(),
  },
}));

const { KokoroTTS } = require('kokoro-js');

describe('TTS Manager Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear the singleton cache
    if (ttsManager) {
      ttsManager.clearCache();
    }
  });

  describe('Constants', () => {
    test('FIXED_MODEL_ID has expected value', () => {
      expect(FIXED_MODEL_ID).toBe('onnx-community/Kokoro-82M-ONNX');
    });

    test('FIXED_DTYPE has expected value', () => {
      expect(FIXED_DTYPE).toBe('fp16');
    });
  });

  describe('TTSManager Class', () => {
    let manager;

    beforeEach(() => {
      manager = new TTSManager();
    });

    describe('constructor', () => {
      test('initializes with default configuration', () => {
        expect(manager.cachedTTS).toBe(null);
        expect(manager.modelId).toBe(FIXED_MODEL_ID);
        expect(manager.dtype).toBe(FIXED_DTYPE);
      });
    });

    describe('loadTTS', () => {
      test('loads TTS instance on first call', async () => {
        const mockTTS = { voices: ['voice1', 'voice2'], generate: jest.fn() };
        KokoroTTS.from_pretrained.mockResolvedValue(mockTTS);

        const result = await manager.loadTTS();

        expect(KokoroTTS.from_pretrained).toHaveBeenCalledWith(FIXED_MODEL_ID, {
          dtype: FIXED_DTYPE,
        });
        expect(result).toBe(mockTTS);
        expect(manager.cachedTTS).toBe(mockTTS);
      });

      test('returns cached TTS instance on subsequent calls', async () => {
        const mockTTS = { voices: ['voice1', 'voice2'], generate: jest.fn() };
        KokoroTTS.from_pretrained.mockResolvedValue(mockTTS);

        // First call
        const result1 = await manager.loadTTS();
        // Second call
        const result2 = await manager.loadTTS();

        expect(KokoroTTS.from_pretrained).toHaveBeenCalledTimes(1);
        expect(result1).toBe(mockTTS);
        expect(result2).toBe(mockTTS);
      });

      test('throws error when TTS loading fails', async () => {
        const error = new Error('Failed to load TTS');
        KokoroTTS.from_pretrained.mockRejectedValue(error);

        await expect(manager.loadTTS()).rejects.toThrow('Failed to load TTS');
        expect(manager.cachedTTS).toBe(null);
      });
    });

    describe('initialize', () => {
      test('returns true when initialization succeeds', async () => {
        const mockTTS = { voices: ['voice1'], generate: jest.fn() };
        KokoroTTS.from_pretrained.mockResolvedValue(mockTTS);

        const result = await manager.initialize();

        expect(result).toBe(true);
      });

      test('returns false when initialization fails', async () => {
        KokoroTTS.from_pretrained.mockRejectedValue(new Error('Init failed'));
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const result = await manager.initialize();

        expect(result).toBe(false);
        expect(consoleSpy).toHaveBeenCalledWith('Kokoro init failed:', expect.any(Error));

        consoleSpy.mockRestore();
      });
    });

    describe('getVoices', () => {
      test('returns voices from TTS instance', async () => {
        const mockVoices = ['voice1', 'voice2', 'voice3'];
        const mockTTS = { voices: mockVoices, generate: jest.fn() };
        KokoroTTS.from_pretrained.mockResolvedValue(mockTTS);

        const result = await manager.getVoices();

        expect(result).toEqual(mockVoices);
      });

      test('returns empty array when TTS has no voices', async () => {
        const mockTTS = { generate: jest.fn() }; // No voices property
        KokoroTTS.from_pretrained.mockResolvedValue(mockTTS);

        const result = await manager.getVoices();

        expect(result).toEqual([]);
      });

      test('returns empty array when loading fails', async () => {
        KokoroTTS.from_pretrained.mockRejectedValue(new Error('Load failed'));
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const result = await manager.getVoices();

        expect(result).toEqual([]);
        expect(consoleSpy).toHaveBeenCalledWith('Voice listing failed:', expect.any(Error));

        consoleSpy.mockRestore();
      });
    });

    describe('generateAudio', () => {
      test('generates audio using TTS instance', async () => {
        const mockAudio = { save: jest.fn(), toWav: jest.fn() };
        const mockTTS = {
          voices: ['voice1'],
          generate: jest.fn().mockResolvedValue(mockAudio),
        };
        KokoroTTS.from_pretrained.mockResolvedValue(mockTTS);

        const result = await manager.generateAudio('Hello world', 'voice1');

        expect(mockTTS.generate).toHaveBeenCalledWith('Hello world', { voice: 'voice1' });
        expect(result).toBe(mockAudio);
      });

      test('throws error when generation fails', async () => {
        const mockTTS = {
          voices: ['voice1'],
          generate: jest.fn().mockRejectedValue(new Error('Generation failed')),
        };
        KokoroTTS.from_pretrained.mockResolvedValue(mockTTS);

        await expect(manager.generateAudio('Hello', 'voice1')).rejects.toThrow('Generation failed');
      });
    });

    describe('generateAudioBuffer', () => {
      test('generates WAV buffer from audio', async () => {
        const mockWavData = new ArrayBuffer(100);
        const mockAudio = {
          save: jest.fn(),
          toWav: jest.fn().mockResolvedValue(mockWavData),
        };
        const mockTTS = {
          voices: ['voice1'],
          generate: jest.fn().mockResolvedValue(mockAudio),
        };
        KokoroTTS.from_pretrained.mockResolvedValue(mockTTS);

        const result = await manager.generateAudioBuffer('Hello world', 'voice1');

        expect(mockAudio.toWav).toHaveBeenCalled();
        expect(Buffer.isBuffer(result)).toBe(true);
      });
    });

    describe('createNewInstance', () => {
      test('creates new TTS instance with same config', async () => {
        const mockTTS = { voices: ['voice1'], generate: jest.fn() };
        KokoroTTS.from_pretrained.mockResolvedValue(mockTTS);

        const result = await manager.createNewInstance();

        expect(KokoroTTS.from_pretrained).toHaveBeenCalledWith(FIXED_MODEL_ID, {
          dtype: FIXED_DTYPE,
        });
        expect(result).toBe(mockTTS);
      });

      test('creates new instance even when cache exists', async () => {
        const mockTTS1 = { voices: ['voice1'], generate: jest.fn() };
        const mockTTS2 = { voices: ['voice2'], generate: jest.fn() };
        KokoroTTS.from_pretrained.mockResolvedValueOnce(mockTTS1).mockResolvedValueOnce(mockTTS2);

        // Load cached instance
        await manager.loadTTS();
        // Create new instance
        const newInstance = await manager.createNewInstance();

        expect(KokoroTTS.from_pretrained).toHaveBeenCalledTimes(2);
        expect(newInstance).toBe(mockTTS2);
        expect(manager.cachedTTS).toBe(mockTTS1); // Cache unchanged
      });
    });

    describe('generatePreview', () => {
      test('generates preview with default text', async () => {
        const mockAudio = { save: jest.fn(), toWav: jest.fn() };
        const mockTTS = {
          voices: ['voice1'],
          generate: jest.fn().mockResolvedValue(mockAudio),
        };
        KokoroTTS.from_pretrained.mockResolvedValue(mockTTS);

        const result = await manager.generatePreview('voice1');

        expect(mockTTS.generate).toHaveBeenCalledWith('This is a sample of the selected voice.', {
          voice: 'voice1',
        });
        expect(result).toBe(mockAudio);
      });

      test('generates preview with custom text', async () => {
        const mockAudio = { save: jest.fn(), toWav: jest.fn() };
        const mockTTS = {
          voices: ['voice1'],
          generate: jest.fn().mockResolvedValue(mockAudio),
        };
        KokoroTTS.from_pretrained.mockResolvedValue(mockTTS);

        const customText = 'Custom preview text';
        await manager.generatePreview('voice1', customText);

        expect(mockTTS.generate).toHaveBeenCalledWith(customText, { voice: 'voice1' });
      });
    });

    describe('clearCache', () => {
      test('clears cached TTS instance', async () => {
        const mockTTS = { voices: ['voice1'], generate: jest.fn() };
        KokoroTTS.from_pretrained.mockResolvedValue(mockTTS);

        // Load TTS to populate cache
        await manager.loadTTS();
        expect(manager.cachedTTS).toBe(mockTTS);

        // Clear cache
        manager.clearCache();
        expect(manager.cachedTTS).toBe(null);
      });
    });

    describe('getConfig', () => {
      test('returns current configuration', () => {
        const config = manager.getConfig();

        expect(config).toEqual({
          modelId: FIXED_MODEL_ID,
          dtype: FIXED_DTYPE,
        });
      });
    });

    describe('updateConfig', () => {
      test('updates modelId and clears cache', () => {
        const newModelId = 'new-model-id';

        manager.cachedTTS = { voices: [] }; // Set some cache
        manager.updateConfig(newModelId);

        expect(manager.modelId).toBe(newModelId);
        expect(manager.cachedTTS).toBe(null); // Cache cleared
      });

      test('updates dtype and clears cache', () => {
        const newDtype = 'fp32';

        manager.cachedTTS = { voices: [] }; // Set some cache
        manager.updateConfig(null, newDtype);

        expect(manager.dtype).toBe(newDtype);
        expect(manager.cachedTTS).toBe(null); // Cache cleared
      });

      test('updates both modelId and dtype', () => {
        const newModelId = 'new-model';
        const newDtype = 'int8';

        manager.updateConfig(newModelId, newDtype);

        expect(manager.modelId).toBe(newModelId);
        expect(manager.dtype).toBe(newDtype);
      });

      test('ignores falsy values', () => {
        const originalModelId = manager.modelId;
        const originalDtype = manager.dtype;

        manager.updateConfig('', null);

        expect(manager.modelId).toBe(originalModelId);
        expect(manager.dtype).toBe(originalDtype);
      });
    });
  });

  describe('Singleton ttsManager', () => {
    test('exports a singleton instance', () => {
      expect(ttsManager).toBeInstanceOf(TTSManager);
    });

    test('singleton has default configuration', () => {
      expect(ttsManager.modelId).toBe(FIXED_MODEL_ID);
      expect(ttsManager.dtype).toBe(FIXED_DTYPE);
    });

    test('singleton methods work correctly', async () => {
      const mockTTS = { voices: ['voice1'], generate: jest.fn() };
      KokoroTTS.from_pretrained.mockResolvedValue(mockTTS);

      const initialized = await ttsManager.initialize();
      const voices = await ttsManager.getVoices();

      expect(initialized).toBe(true);
      expect(voices).toEqual(['voice1']);
    });
  });
});
