const fs = require('fs');
const {
  knownTextExtensions,
  isKnownTextExtension,
  isProbablyTextContent,
  isValidTextFile,
  getFileSize,
  isFileSizeAcceptable,
  readTextFile,
} = require('../../scripts/file-utils');

// Mock fs module
jest.mock('fs');

describe('File Utils Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('knownTextExtensions', () => {
    test('contains expected text extensions', () => {
      expect(knownTextExtensions).toContain('.txt');
      expect(knownTextExtensions).toContain('.js');
      expect(knownTextExtensions).toContain('.json');
      expect(knownTextExtensions).toContain('.md');
      expect(knownTextExtensions).toContain('.html');
    });

    test('has reasonable number of extensions', () => {
      expect(knownTextExtensions.length).toBeGreaterThan(10);
      expect(knownTextExtensions.length).toBeLessThan(50);
    });
  });

  describe('isKnownTextExtension', () => {
    test('returns true for known text extensions', () => {
      expect(isKnownTextExtension('test.txt')).toBe(true);
      expect(isKnownTextExtension('script.js')).toBe(true);
      expect(isKnownTextExtension('data.json')).toBe(true);
      expect(isKnownTextExtension('README.md')).toBe(true);
    });

    test('returns false for unknown extensions', () => {
      expect(isKnownTextExtension('image.png')).toBe(false);
      expect(isKnownTextExtension('video.mp4')).toBe(false);
      expect(isKnownTextExtension('app.exe')).toBe(false);
    });

    test('handles case insensitive extensions', () => {
      expect(isKnownTextExtension('TEST.TXT')).toBe(true);
      expect(isKnownTextExtension('Script.JS')).toBe(true);
    });

    test('handles files without extensions', () => {
      expect(isKnownTextExtension('README')).toBe(false);
      expect(isKnownTextExtension('no-extension')).toBe(false);
    });

    test('handles complex file paths', () => {
      expect(isKnownTextExtension('/path/to/file.txt')).toBe(true);
      expect(isKnownTextExtension('C:\\Windows\\file.log')).toBe(true);
      expect(isKnownTextExtension('file.with.multiple.dots.js')).toBe(true);
    });
  });

  describe('isProbablyTextContent', () => {
    test('returns true for text content', () => {
      const textBuffer = Buffer.from('Hello world! This is text content.');
      fs.readFileSync.mockReturnValue(textBuffer);

      expect(isProbablyTextContent('/path/to/text.txt')).toBe(true);
    });

    test('returns false for binary content', () => {
      const binaryBuffer = Buffer.from([0x00, 0x01, 0xff, 0xfe]);
      fs.readFileSync.mockReturnValue(binaryBuffer);

      expect(isProbablyTextContent('/path/to/binary.bin')).toBe(false);
    });

    test('allows common control characters', () => {
      const textWithControlChars = Buffer.from('Line 1\\nLine 2\\tTabbed\\rReturn');
      fs.readFileSync.mockReturnValue(textWithControlChars);

      expect(isProbablyTextContent('/path/to/text.txt')).toBe(true);
    });

    test('returns false on file read error', () => {
      fs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      expect(isProbablyTextContent('/nonexistent/file.txt')).toBe(false);
    });

    test('respects maxBytes parameter', () => {
      const longBuffer = Buffer.alloc(1000, 65); // Fill with 'A' character
      fs.readFileSync.mockReturnValue(longBuffer);

      isProbablyTextContent('/path/to/file.txt', 100);

      expect(fs.readFileSync).toHaveBeenCalledWith('/path/to/file.txt', {
        encoding: null,
        flag: 'r',
      });
    });

    test('handles empty files', () => {
      fs.readFileSync.mockReturnValue(Buffer.alloc(0));

      expect(isProbablyTextContent('/path/to/empty.txt')).toBe(true);
    });
  });

  describe('isValidTextFile', () => {
    test('returns true for known text extension files', () => {
      // Mock isProbablyTextContent to return false to ensure it's using extension check
      const textBuffer = Buffer.from([0x00, 0x01]);
      fs.readFileSync.mockReturnValue(textBuffer);

      expect(isValidTextFile('document.txt')).toBe(true);
      expect(isValidTextFile('script.js')).toBe(true);
    });

    test('returns true for files with probable text content', () => {
      const textBuffer = Buffer.from('This is text content');
      fs.readFileSync.mockReturnValue(textBuffer);

      expect(isValidTextFile('unknown.extension')).toBe(true);
    });

    test('returns false for non-text files', () => {
      const binaryBuffer = Buffer.from([0x00, 0x01, 0xff]);
      fs.readFileSync.mockReturnValue(binaryBuffer);

      expect(isValidTextFile('image.png')).toBe(false);
    });
  });

  describe('getFileSize', () => {
    test('returns file size for existing files', () => {
      fs.statSync.mockReturnValue({ size: 1024 });

      expect(getFileSize('/path/to/file.txt')).toBe(1024);
    });

    test('returns null for non-existent files', () => {
      fs.statSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      expect(getFileSize('/nonexistent/file.txt')).toBe(null);
    });

    test('handles zero-size files', () => {
      fs.statSync.mockReturnValue({ size: 0 });

      expect(getFileSize('/path/to/empty.txt')).toBe(0);
    });

    test('handles large files', () => {
      fs.statSync.mockReturnValue({ size: 1073741824 }); // 1GB

      expect(getFileSize('/path/to/large.txt')).toBe(1073741824);
    });
  });

  describe('isFileSizeAcceptable', () => {
    test('returns true for files within size limit', () => {
      fs.statSync.mockReturnValue({ size: 500000 }); // 500KB

      expect(isFileSizeAcceptable('/path/to/file.txt')).toBe(true);
    });

    test('returns false for files exceeding size limit', () => {
      fs.statSync.mockReturnValue({ size: 2 * 1024 * 1024 }); // 2MB

      expect(isFileSizeAcceptable('/path/to/large.txt')).toBe(false);
    });

    test('returns false for non-existent files', () => {
      fs.statSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      expect(isFileSizeAcceptable('/nonexistent/file.txt')).toBe(false);
    });

    test('respects custom size limit', () => {
      fs.statSync.mockReturnValue({ size: 500000 }); // 500KB

      expect(isFileSizeAcceptable('/path/to/file.txt', 1000000)).toBe(true); // 1MB limit
      expect(isFileSizeAcceptable('/path/to/file.txt', 100000)).toBe(false); // 100KB limit
    });

    test('handles files at exact size limit', () => {
      fs.statSync.mockReturnValue({ size: 1024 * 1024 }); // Exactly 1MB

      expect(isFileSizeAcceptable('/path/to/file.txt', 1024 * 1024)).toBe(true);
    });
  });

  describe('readTextFile', () => {
    test('returns file content for existing files', () => {
      fs.readFileSync.mockReturnValue('Hello, world!');

      expect(readTextFile('/path/to/file.txt')).toBe('Hello, world!');
      expect(fs.readFileSync).toHaveBeenCalledWith('/path/to/file.txt', 'utf-8');
    });

    test('returns null for non-existent files', () => {
      fs.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });

      expect(readTextFile('/nonexistent/file.txt')).toBe(null);
    });

    test('respects custom encoding', () => {
      fs.readFileSync.mockReturnValue('Content');

      readTextFile('/path/to/file.txt', 'latin1');

      expect(fs.readFileSync).toHaveBeenCalledWith('/path/to/file.txt', 'latin1');
    });

    test('handles empty files', () => {
      fs.readFileSync.mockReturnValue('');

      expect(readTextFile('/path/to/empty.txt')).toBe('');
    });

    test('handles files with special characters', () => {
      const content = 'Content with émojis 🎉 and spëcial chars';
      fs.readFileSync.mockReturnValue(content);

      expect(readTextFile('/path/to/special.txt')).toBe(content);
    });
  });
});
