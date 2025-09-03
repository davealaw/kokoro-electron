/**
 * Split text into smaller chunks based on sentence boundaries
 * @param {string} text - The text to split
 * @param {number} maxLength - Maximum length per chunk (default: 350)
 * @returns {Promise<string[]>} Array of text chunks
 */
async function splitText(text, maxLength = 350) {
  // Split on sentence boundaries while preserving abbreviations
  const sentences = text.split(/(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?)(\s+)/);
  const chunks = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length + 1 <= maxLength) {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
      }
      currentChunk = sentence;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * Tokenize text into words/tokens for streaming processing
 * @param {string} text - Text to tokenize
 * @returns {string[]} Array of tokens
 */
function tokenizeText(text) {
  return text.match(/\s*\S+/g) || [];
}

/**
 * Estimate processing time based on text length
 * @param {string} text - Text to analyze
 * @param {number} msPerWord - Milliseconds per word estimate (default: 50)
 * @param {number} minimumMs - Minimum processing time (default: 1000)
 * @returns {number} Estimated processing time in milliseconds
 */
function estimateProcessingTime(text, msPerWord = 50, minimumMs = 1000) {
  const wordsEstimate = text.trim().split(/\s+/).length;
  return Math.max(minimumMs, wordsEstimate * msPerWord);
}

/**
 * Clean and normalize text for TTS processing
 * @param {string} text - Text to clean
 * @returns {string} Cleaned text
 */
function cleanTextForTTS(text) {
  return text
    .trim()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[\r\n\t]+/g, ' ') // Convert line breaks to spaces
    .replace(/\s*([.!?])\s*/g, '$1 ') // Normalize punctuation spacing
    .trim();
}

/**
 * Validate text content for TTS processing
 * @param {string} text - Text to validate
 * @returns {{valid: boolean, reason?: string}} Validation result
 */
function validateTextForTTS(text) {
  if (!text || typeof text !== 'string') {
    return { valid: false, reason: 'Text must be a non-empty string' };
  }

  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { valid: false, reason: 'Text cannot be empty' };
  }

  if (trimmed.length > 100000) {
    // 100k character limit
    return { valid: false, reason: 'Text is too long (max 100,000 characters)' };
  }

  return { valid: true };
}

/**
 * Get text statistics for processing estimation
 * @param {string} text - Text to analyze
 * @returns {object} Statistics object with word count, character count, etc.
 */
function getTextStats(text) {
  const trimmed = text.trim();
  const words = trimmed.split(/\s+/).filter(word => word.length > 0);
  const sentences = trimmed.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0);

  return {
    characters: trimmed.length,
    words: words.length,
    sentences: sentences.length,
    estimatedChunks: Math.ceil(trimmed.length / 350),
  };
}

module.exports = {
  splitText,
  tokenizeText,
  estimateProcessingTime,
  cleanTextForTTS,
  validateTextForTTS,
  getTextStats,
};
