const {
  splitText,
  tokenizeText,
  estimateProcessingTime,
  cleanTextForTTS,
  validateTextForTTS,
  getTextStats,
} = require('../../scripts/text-utils');

describe('Text Utils Module', () => {
  describe('splitText', () => {
    test('splits text into chunks within maxLength', async () => {
      const text = 'This is sentence one. This is sentence two. This is sentence three.';
      const chunks = await splitText(text, 50);

      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach(chunk => {
        expect(chunk.length).toBeLessThanOrEqual(50);
      });
    });

    test('handles short text that fits in one chunk', async () => {
      const text = 'Short text.';
      const chunks = await splitText(text, 350);

      expect(chunks).toEqual([text]);
    });

    test('preserves sentence boundaries', async () => {
      const text = 'First sentence. Second sentence? Third sentence!';
      const chunks = await splitText(text, 30);

      chunks.forEach(chunk => {
        // Each chunk should end with proper punctuation or be a complete sentence
        const trimmed = chunk.trim();
        if (trimmed.length > 0) {
          expect(trimmed).toMatch(/[.!?]$|^[^.!?]*$/);
        }
      });
    });

    test('handles text without sentence punctuation', async () => {
      const text = 'This text has no proper sentence endings and goes on';
      const chunks = await splitText(text, 20);

      expect(chunks.length).toBeGreaterThanOrEqual(1);
    });

    test('handles empty text', async () => {
      const chunks = await splitText('', 350);
      expect(chunks).toEqual([]);
    });

    test('handles text with only whitespace', async () => {
      const chunks = await splitText('   \n\t  ', 350);
      expect(chunks).toEqual(['   \n\t  ']);
    });

    test('respects custom maxLength parameter', async () => {
      const text = 'This is a longer sentence that should be split appropriately.';
      const chunks100 = await splitText(text, 100);
      const chunks30 = await splitText(text, 30);

      expect(chunks30.length).toBeGreaterThanOrEqual(chunks100.length);
    });

    test('handles very long sentences', async () => {
      const longSentence =
        'This is a very long sentence that goes on and on without any proper punctuation marks to break it up naturally and should be handled gracefully by the splitting function.';
      const chunks = await splitText(longSentence, 50);

      expect(chunks.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('tokenizeText', () => {
    test('tokenizes simple text into words', () => {
      const text = 'Hello world test';
      const tokens = tokenizeText(text);

      expect(tokens).toEqual(['Hello', ' world', ' test']);
    });

    test('handles punctuation correctly', () => {
      const text = 'Hello, world! How are you?';
      const tokens = tokenizeText(text);

      expect(tokens.length).toBeGreaterThan(0);
      expect(tokens.join('')).toBe(text);
    });

    test('handles empty text', () => {
      const tokens = tokenizeText('');
      expect(tokens).toEqual([]);
    });

    test('handles text with multiple whitespaces', () => {
      const text = 'Word1    Word2     Word3';
      const tokens = tokenizeText(text);

      expect(tokens.length).toBeGreaterThan(0);
      expect(tokens.join('')).toBe(text);
    });

    test('handles newlines and tabs', () => {
      const text = 'Line1\nLine2\tTabbed';
      const tokens = tokenizeText(text);

      expect(tokens.join('')).toBe(text);
    });
  });

  describe('estimateProcessingTime', () => {
    test('calculates time based on word count', () => {
      const text = 'This has five words total';
      const time = estimateProcessingTime(text, 100, 0); // 100ms per word, no minimum

      expect(time).toBe(500); // 5 words * 100ms
    });

    test('respects minimum processing time', () => {
      const text = 'Short';
      const time = estimateProcessingTime(text, 50, 2000);

      expect(time).toBe(2000); // Should use minimum time
    });

    test('uses default values correctly', () => {
      const text = 'This text has exactly five words';
      const time = estimateProcessingTime(text);

      expect(time).toBeGreaterThanOrEqual(1000); // At least minimum
      expect(time).toBe(Math.max(1000, 5 * 50)); // 5 words * 50ms per word, min 1000
    });

    test('handles empty text', () => {
      const time = estimateProcessingTime('', 50, 100);
      expect(time).toBe(100); // Should return minimum time
    });

    test('handles text with extra whitespace', () => {
      const text = '  word1   word2   ';
      const cleanTime = estimateProcessingTime(text.trim().replace(/\s+/g, ' '));
      const messyTime = estimateProcessingTime(text);

      expect(cleanTime).toBeLessThanOrEqual(messyTime);
    });
  });

  describe('cleanTextForTTS', () => {
    test('normalizes whitespace', () => {
      const text = 'Word1    Word2     Word3';
      const cleaned = cleanTextForTTS(text);

      expect(cleaned).toBe('Word1 Word2 Word3');
    });

    test('converts line breaks to spaces', () => {
      const text = 'Line1\nLine2\rLine3\r\nLine4';
      const cleaned = cleanTextForTTS(text);

      expect(cleaned).toBe('Line1 Line2 Line3 Line4');
    });

    test('normalizes punctuation spacing', () => {
      const text = 'Sentence1.Sentence2 ?Sentence3 !';
      const cleaned = cleanTextForTTS(text);

      expect(cleaned).toBe('Sentence1. Sentence2? Sentence3!');
    });

    test('trims leading and trailing whitespace', () => {
      const text = '   Content with spaces   ';
      const cleaned = cleanTextForTTS(text);

      expect(cleaned).toBe('Content with spaces');
    });

    test('handles empty text', () => {
      const cleaned = cleanTextForTTS('');
      expect(cleaned).toBe('');
    });

    test('handles text with tabs', () => {
      const text = 'Word1\tWord2\tWord3';
      const cleaned = cleanTextForTTS(text);

      expect(cleaned).toBe('Word1 Word2 Word3');
    });

    test('preserves single spaces between words', () => {
      const text = 'Normal text with spaces.';
      const cleaned = cleanTextForTTS(text);

      expect(cleaned).toBe('Normal text with spaces.');
    });
  });

  describe('validateTextForTTS', () => {
    test('accepts valid text', () => {
      const result = validateTextForTTS('This is valid text for TTS processing.');

      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    test('rejects null or undefined text', () => {
      expect(validateTextForTTS(null).valid).toBe(false);
      expect(validateTextForTTS(undefined).valid).toBe(false);
      expect(validateTextForTTS(null).reason).toBe('Text must be a non-empty string');
    });

    test('rejects non-string input', () => {
      expect(validateTextForTTS(123).valid).toBe(false);
      expect(validateTextForTTS([]).valid).toBe(false);
      expect(validateTextForTTS({}).valid).toBe(false);
    });

    test('rejects empty or whitespace-only text', () => {
      expect(validateTextForTTS('').valid).toBe(false);
      expect(validateTextForTTS('   ').valid).toBe(false);
      expect(validateTextForTTS('\t\n').valid).toBe(false);

      // Empty string is handled first by the null check
      expect(validateTextForTTS('').reason).toBe('Text must be a non-empty string');
      // Whitespace-only is handled by the trim check
      expect(validateTextForTTS('   ').reason).toBe('Text cannot be empty');
    });

    test('rejects text that is too long', () => {
      const longText = 'a'.repeat(100001); // Over 100k characters
      const result = validateTextForTTS(longText);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Text is too long (max 100,000 characters)');
    });

    test('accepts text at the character limit', () => {
      const maxText = 'a'.repeat(100000); // Exactly 100k characters
      const result = validateTextForTTS(maxText);

      expect(result.valid).toBe(true);
    });

    test('handles text with special characters', () => {
      const specialText = 'Text with émojis 🎉 and spëcial characters!';
      const result = validateTextForTTS(specialText);

      expect(result.valid).toBe(true);
    });
  });

  describe('getTextStats', () => {
    test('calculates basic statistics correctly', () => {
      const text = 'This is a test sentence. This is another sentence!';
      const stats = getTextStats(text);

      expect(stats.characters).toBe(text.length);
      expect(stats.words).toBe(9); // "This is a test sentence This is another sentence"
      expect(stats.sentences).toBe(2);
      expect(stats.estimatedChunks).toBe(Math.ceil(text.length / 350));
    });

    test('handles empty text', () => {
      const stats = getTextStats('');

      expect(stats.characters).toBe(0);
      expect(stats.words).toBe(0);
      expect(stats.sentences).toBe(0);
      expect(stats.estimatedChunks).toBe(0);
    });

    test('handles text with only whitespace', () => {
      const text = '   \n\t  ';
      const stats = getTextStats(text);

      expect(stats.words).toBe(0); // No actual words
    });

    test('counts sentences correctly', () => {
      const text = 'Sentence one. Sentence two? Sentence three! No ending';
      const stats = getTextStats(text);

      // The split on [.!?]+ creates empty parts, so filter removes empty strings
      // "Sentence one" "" "Sentence two" "" "Sentence three" "" "No ending"
      expect(stats.sentences).toBe(4); // Four non-empty parts
    });

    test('counts words correctly with extra whitespace', () => {
      const text = '  word1   word2  word3   ';
      const stats = getTextStats(text);

      expect(stats.words).toBe(3);
    });

    test('calculates estimated chunks', () => {
      const shortText = 'Short text.';
      const longText = 'a'.repeat(1000);

      const shortStats = getTextStats(shortText);
      const longStats = getTextStats(longText);

      expect(shortStats.estimatedChunks).toBe(1);
      expect(longStats.estimatedChunks).toBe(Math.ceil(1000 / 350));
    });

    test('handles text with no sentence punctuation', () => {
      const text = 'This text has no proper sentence endings';
      const stats = getTextStats(text);

      // Text with no [.!?] creates one part when split
      expect(stats.sentences).toBe(1);
      expect(stats.words).toBeGreaterThan(0);
    });
  });
});
