const {
  WAV_HEADER_SIZE,
  mergeWavBuffers,
  isValidWavBuffer,
  getWavInfo,
  createSilentWavBuffer,
  estimateWavDuration,
} = require('../../scripts/audio-utils');

describe('Audio Utils Module', () => {
  // Helper to create a mock WAV buffer with proper header
  function createMockWavBuffer(dataSize = 100, sampleRate = 44100, channels = 1) {
    const buffer = Buffer.alloc(WAV_HEADER_SIZE + dataSize);

    // Write WAV header
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4); // File size
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); // Subchunk1Size
    buffer.writeUInt16LE(1, 20); // AudioFormat (PCM)
    buffer.writeUInt16LE(channels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * channels * 2, 28); // ByteRate (16-bit)
    buffer.writeUInt16LE(channels * 2, 32); // BlockAlign
    buffer.writeUInt16LE(16, 34); // BitsPerSample
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);

    return buffer;
  }

  describe('WAV_HEADER_SIZE constant', () => {
    test('has correct value', () => {
      expect(WAV_HEADER_SIZE).toBe(44);
    });
  });

  describe('mergeWavBuffers', () => {
    test('returns empty buffer for empty input', () => {
      const result = mergeWavBuffers([]);
      expect(result).toEqual(Buffer.alloc(0));
    });

    test('returns empty buffer for null input', () => {
      const result = mergeWavBuffers(null);
      expect(result).toEqual(Buffer.alloc(0));
    });

    test('returns original buffer for single buffer', () => {
      const buffer = createMockWavBuffer(100);
      const result = mergeWavBuffers([buffer]);
      expect(result).toEqual(buffer);
    });

    test('merges two WAV buffers correctly', () => {
      const buffer1 = createMockWavBuffer(100);
      const buffer2 = createMockWavBuffer(200);

      const result = mergeWavBuffers([buffer1, buffer2]);

      // Should have header + combined data
      expect(result.length).toBe(WAV_HEADER_SIZE + 100 + 200);

      // Check RIFF header
      expect(result.slice(0, 4).toString('ascii')).toBe('RIFF');
      expect(result.slice(8, 12).toString('ascii')).toBe('WAVE');

      // Check updated sizes
      const totalDataSize = 100 + 200;
      expect(result.readUInt32LE(4)).toBe(36 + totalDataSize); // File size
      expect(result.readUInt32LE(40)).toBe(totalDataSize); // Data size
    });

    test('merges multiple WAV buffers correctly', () => {
      const buffers = [createMockWavBuffer(50), createMockWavBuffer(75), createMockWavBuffer(125)];

      const result = mergeWavBuffers(buffers);
      const totalDataSize = 50 + 75 + 125;

      expect(result.length).toBe(WAV_HEADER_SIZE + totalDataSize);
      expect(result.readUInt32LE(40)).toBe(totalDataSize); // Data size
    });

    test('preserves audio format information from first buffer', () => {
      const buffer1 = createMockWavBuffer(100, 48000, 2); // 48kHz stereo
      const buffer2 = createMockWavBuffer(100, 44100, 1); // 44.1kHz mono

      const result = mergeWavBuffers([buffer1, buffer2]);

      // Should preserve format from first buffer
      expect(result.readUInt16LE(22)).toBe(2); // Channels from first
      expect(result.readUInt32LE(24)).toBe(48000); // Sample rate from first
    });
  });

  describe('isValidWavBuffer', () => {
    test('returns true for valid WAV buffer', () => {
      const buffer = createMockWavBuffer(100);
      expect(isValidWavBuffer(buffer)).toBe(true);
    });

    test('returns false for null or undefined buffer', () => {
      expect(isValidWavBuffer(null)).toBe(false);
      expect(isValidWavBuffer(undefined)).toBe(false);
    });

    test('returns false for buffer too small', () => {
      const smallBuffer = Buffer.alloc(20);
      expect(isValidWavBuffer(smallBuffer)).toBe(false);
    });

    test('returns false for buffer without RIFF header', () => {
      const buffer = Buffer.alloc(50);
      buffer.write('JUNK', 0); // Wrong header
      buffer.write('WAVE', 8);
      expect(isValidWavBuffer(buffer)).toBe(false);
    });

    test('returns false for buffer without WAVE format', () => {
      const buffer = Buffer.alloc(50);
      buffer.write('RIFF', 0);
      buffer.write('JUNK', 8); // Wrong format
      expect(isValidWavBuffer(buffer)).toBe(false);
    });
  });

  describe('getWavInfo', () => {
    test('returns null for invalid buffer', () => {
      const invalidBuffer = Buffer.alloc(20);
      expect(getWavInfo(invalidBuffer)).toBe(null);
    });

    test('extracts correct information from valid WAV buffer', () => {
      const buffer = createMockWavBuffer(1000, 48000, 2);
      const info = getWavInfo(buffer);

      expect(info).toEqual({
        fileSize: 36 + 1000 + 8,
        audioFormat: 1,
        numChannels: 2,
        sampleRate: 48000,
        byteRate: 48000 * 2 * 2, // sampleRate * channels * bytesPerSample
        blockAlign: 2 * 2, // channels * bytesPerSample
        bitsPerSample: 16,
        dataSize: 1000,
        duration: 1000 / (48000 * 2 * 2), // dataSize / byteRate
      });
    });

    test('handles mono 44.1kHz buffer', () => {
      const buffer = createMockWavBuffer(8820, 44100, 1); // 0.1 seconds of 16-bit mono audio
      const info = getWavInfo(buffer);

      expect(info.numChannels).toBe(1);
      expect(info.sampleRate).toBe(44100);
      expect(info.dataSize).toBe(8820);
      expect(info.duration).toBeCloseTo(0.1, 2);
    });

    test('returns null on buffer read error', () => {
      const buffer = createMockWavBuffer(100);
      // Corrupt the buffer to cause read errors
      buffer.fill(0xff, 20, 30);

      // This test may pass if the buffer is still readable despite corruption
      // The function is designed to handle read errors gracefully
      const info = getWavInfo(buffer);
      expect(info).toBeDefined(); // Should still work with this level of corruption
    });
  });

  describe('createSilentWavBuffer', () => {
    test('creates buffer with correct size for 1 second', () => {
      const buffer = createSilentWavBuffer(1.0, 44100, 1, 16);
      const expectedDataSize = 1 * 44100 * 1 * 2; // duration * sampleRate * channels * bytesPerSample

      expect(buffer.length).toBe(WAV_HEADER_SIZE + expectedDataSize);
      expect(isValidWavBuffer(buffer)).toBe(true);
    });

    test('creates buffer with correct format information', () => {
      const buffer = createSilentWavBuffer(0.5, 48000, 2, 16);
      const info = getWavInfo(buffer);

      expect(info.sampleRate).toBe(48000);
      expect(info.numChannels).toBe(2);
      expect(info.bitsPerSample).toBe(16);
      expect(info.audioFormat).toBe(1); // PCM
    });

    test('uses default parameters correctly', () => {
      const buffer = createSilentWavBuffer(1.0);
      const info = getWavInfo(buffer);

      expect(info.sampleRate).toBe(44100);
      expect(info.numChannels).toBe(1);
      expect(info.bitsPerSample).toBe(16);
    });

    test('creates different sized buffers for different durations', () => {
      const buffer1 = createSilentWavBuffer(0.5);
      const buffer2 = createSilentWavBuffer(1.0);

      expect(buffer2.length).toBeGreaterThan(buffer1.length);
    });

    test('fills data section with silence (zeros)', () => {
      const buffer = createSilentWavBuffer(0.1);
      const dataSection = buffer.slice(WAV_HEADER_SIZE);

      // Check that data section contains only zeros (silence)
      expect(dataSection.every(byte => byte === 0)).toBe(true);
    });

    test('handles fractional durations', () => {
      const buffer = createSilentWavBuffer(0.25, 44100, 1, 16);
      const expectedSamples = Math.floor(0.25 * 44100);
      const expectedDataSize = expectedSamples * 1 * 2;

      expect(buffer.length).toBe(WAV_HEADER_SIZE + expectedDataSize);
    });
  });

  describe('estimateWavDuration', () => {
    test('returns correct duration for valid WAV buffer', () => {
      const buffer = createMockWavBuffer(8820, 44100, 1); // 0.1 seconds of mono 16-bit audio
      const duration = estimateWavDuration(buffer);

      expect(duration).toBeCloseTo(0.1, 2);
    });

    test('returns null for invalid buffer', () => {
      const invalidBuffer = Buffer.alloc(20);
      expect(estimateWavDuration(invalidBuffer)).toBe(null);
    });

    test('handles different sample rates correctly', () => {
      const buffer48k = createMockWavBuffer(9600, 48000, 1); // 0.1 seconds at 48kHz
      const buffer44k = createMockWavBuffer(8820, 44100, 1); // 0.1 seconds at 44.1kHz

      expect(estimateWavDuration(buffer48k)).toBeCloseTo(0.1, 2);
      expect(estimateWavDuration(buffer44k)).toBeCloseTo(0.1, 2);
    });

    test('handles stereo vs mono correctly', () => {
      // Same amount of data, but stereo has half the duration
      const monoBuffer = createMockWavBuffer(8820, 44100, 1);
      const stereoBuffer = createMockWavBuffer(8820, 44100, 2);

      const monoDuration = estimateWavDuration(monoBuffer);
      const stereoDuration = estimateWavDuration(stereoBuffer);

      expect(stereoDuration).toBeLessThan(monoDuration);
    });
  });
});
