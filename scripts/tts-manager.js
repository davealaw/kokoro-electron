const { KokoroTTS } = require('kokoro-js');

/**
 * TTS configuration constants
 */
const FIXED_MODEL_ID = 'onnx-community/Kokoro-82M-ONNX';
const FIXED_DTYPE = 'fp16'; // q8 should be avoided on M1/M2 Macs due to timing issues

/**
 * TTS Manager class to handle TTS instance loading, caching, and management
 */
class TTSManager {
  constructor() {
    this.cachedTTS = null;
    this.modelId = FIXED_MODEL_ID;
    this.dtype = FIXED_DTYPE;
  }

  /**
   * Load TTS instance (with caching)
   * @returns {Promise<KokoroTTS>} TTS instance
   */
  async loadTTS() {
    if (!this.cachedTTS) {
      this.cachedTTS = await KokoroTTS.from_pretrained(this.modelId, {
        dtype: this.dtype,
      });
    }
    return this.cachedTTS;
  }

  /**
   * Initialize TTS and return success status
   * @param {Function} onProgress - Optional progress callback for model download
   * @returns {Promise<boolean>} True if initialization successful
   */
  async initialize(onProgress) {
    try {
      if (onProgress) {
        onProgress('Initializing TTS system...');
      }

      await this.loadTTS();

      if (onProgress) {
        onProgress('TTS system ready!');
      }

      return true;
    } catch (err) {
      console.error('Kokoro init failed:', err);
      if (onProgress) {
        onProgress('Failed to initialize TTS system.');
      }
      return false;
    }
  }

  /**
   * Get available voices from TTS instance
   * @returns {Promise<Array>} Array of available voices
   */
  async getVoices() {
    try {
      const tts = await this.loadTTS();
      return tts.voices || [];
    } catch (err) {
      console.error('Voice listing failed:', err);
      return [];
    }
  }

  /**
   * Generate audio for text with specified voice
   * @param {string} text - Text to generate audio for
   * @param {string} voice - Voice to use
   * @returns {Promise<object>} Generated audio object
   */
  async generateAudio(text, voice) {
    const tts = await this.loadTTS();
    return await tts.generate(text, { voice });
  }

  /**
   * Generate audio buffer (WAV format) for text
   * @param {string} text - Text to generate audio for
   * @param {string} voice - Voice to use
   * @returns {Promise<Buffer>} WAV audio buffer
   */
  async generateAudioBuffer(text, voice) {
    const audio = await this.generateAudio(text, voice);
    const wav = await audio.toWav();
    return Buffer.from(wav);
  }

  /**
   * Create a new TTS instance (for parallel processing)
   * @returns {Promise<KokoroTTS>} New TTS instance
   */
  async createNewInstance() {
    return await KokoroTTS.from_pretrained(this.modelId, {
      dtype: this.dtype,
    });
  }

  /**
   * Generate preview audio for a voice
   * @param {string} voice - Voice to preview
   * @param {string} previewText - Text to use for preview (optional)
   * @returns {Promise<object>} Generated preview audio
   */
  async generatePreview(voice, previewText = 'This is a sample of the selected voice.') {
    return await this.generateAudio(previewText, voice);
  }

  /**
   * Clear cached TTS instance (force reload on next use)
   */
  clearCache() {
    this.cachedTTS = null;
  }

  /**
   * Get TTS model configuration
   * @returns {object} Configuration object
   */
  getConfig() {
    return {
      modelId: this.modelId,
      dtype: this.dtype,
    };
  }

  /**
   * Update TTS configuration
   * @param {string} modelId - New model ID (optional)
   * @param {string} dtype - New dtype (optional)
   */
  updateConfig(modelId, dtype) {
    if (modelId) {
      this.modelId = modelId;
    }
    if (dtype) {
      this.dtype = dtype;
    }
    // Clear cache to force reload with new config
    this.clearCache();
  }
}

// Create a singleton instance
const ttsManager = new TTSManager();

module.exports = {
  TTSManager,
  ttsManager, // Singleton instance
  FIXED_MODEL_ID,
  FIXED_DTYPE,
};
