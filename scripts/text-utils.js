/**
 * Split text into smaller chunks based on simple length limits
 * @param {string} text - The text to split
 * @param {number} maxLength - Maximum length per chunk (default: 350)
 * @returns {Promise<string[]>} Array of text chunks
 */
async function splitText(text, maxLength = 350) {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const chunks = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    let endIndex = startIndex + maxLength;

    // If we're not at the end of the text, try to break at a sentence or word boundary
    if (endIndex < text.length) {
      // First try to find a sentence ending
      let sentenceEnd = text.lastIndexOf('.', endIndex);
      if (sentenceEnd === -1) {
        sentenceEnd = text.lastIndexOf('!', endIndex);
      }
      if (sentenceEnd === -1) {
        sentenceEnd = text.lastIndexOf('?', endIndex);
      }

      // If we found a sentence ending and it's not too close to the start
      if (sentenceEnd > startIndex + 50) {
        endIndex = sentenceEnd + 1;
      } else {
        // Otherwise, try to break at a word boundary
        const spaceIndex = text.lastIndexOf(' ', endIndex);
        if (spaceIndex > startIndex + 50) {
          endIndex = spaceIndex;
        }
        // If no good break point, just use the max length
      }
    }

    const chunk = text.slice(startIndex, endIndex).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    startIndex = endIndex;

    // Skip any whitespace at the beginning of the next chunk
    while (startIndex < text.length && text[startIndex] === ' ') {
      startIndex++;
    }
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

/**
 * Normalize text for TTS engines by replacing problematic Unicode punctuation and spaces
 * - Converts smart quotes/dashes to ASCII
 * - Replaces non-breaking and Unicode spaces with normal spaces
 * - Removes zero-width and control characters
 */
function normalizeForTTS(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return (
    text
      // Replace smart quotes
      .replace(/[\u2018\u2019\u02BC]/g, "'") // left/right single quotes, modifier letter apostrophe
      .replace(/[\u201C\u201D]/g, '"') // left/right double quotes
      // Replace dashes and ellipsis
      .replace(/[\u2014\u2013]/g, '-') // em-dash/en-dash to hyphen
      .replace(/[\u2026]/g, '...') // ellipsis
      // Replace non-breaking and special spaces with normal space
      .replace(/[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
      // Remove zero-width characters
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      // Handle semicolons that might cause TTS issues
      .replace(/;/g, ',')
      // Collapse whitespace
      .replace(/[\t\r\n]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

module.exports = {
  splitText,
  tokenizeText,
  estimateProcessingTime,
  cleanTextForTTS,
  validateTextForTTS,
  getTextStats,
  normalizeForTTS,
};
