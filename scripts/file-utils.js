const fs = require('fs');
const path = require('path');

/**
 * Known text file extensions that we can safely process
 */
const knownTextExtensions = [
  '.txt',
  '.md',
  '.html',
  '.htm',
  '.js',
  '.ts',
  '.json',
  '.css',
  '.csv',
  '.xml',
  '.ini',
  '.log',
  '.yml',
  '.yaml',
  '.py',
  '.java',
  '.c',
  '.cpp',
  '.rb',
  '.go',
];

/**
 * Check if a file has a known text extension
 * @param {string} filePath - Path to the file
 * @returns {boolean} True if the file has a known text extension
 */
function isKnownTextExtension(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return knownTextExtensions.includes(ext);
}

/**
 * Analyze file content to determine if it's probably text
 * @param {string} filePath - Path to the file
 * @param {number} maxBytes - Maximum bytes to sample (default: 512)
 * @returns {boolean} True if the content appears to be text
 */
function isProbablyTextContent(filePath, maxBytes = 512) {
  try {
    const buffer = fs.readFileSync(filePath, { encoding: null, flag: 'r' });
    const sample = buffer.slice(0, maxBytes);

    for (let i = 0; i < sample.length; i++) {
      const code = sample[i];
      if (code === 9 || code === 10 || code === 13) {
        continue;
      } // tab, CR, LF
      if (code < 32 || code > 126) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate if a file is a valid text file for processing
 * @param {string} filePath - Path to the file
 * @returns {boolean} True if the file is valid for text processing
 */
function isValidTextFile(filePath) {
  return isKnownTextExtension(filePath) || isProbablyTextContent(filePath);
}

/**
 * Get file size in bytes
 * @param {string} filePath - Path to the file
 * @returns {number|null} File size in bytes, or null if error
 */
function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch {
    return null;
  }
}

/**
 * Check if file size is within acceptable limits
 * @param {string} filePath - Path to the file
 * @param {number} maxSize - Maximum size in bytes (default: 1MB)
 * @returns {boolean} True if file size is acceptable
 */
function isFileSizeAcceptable(filePath, maxSize = 1024 * 1024) {
  const size = getFileSize(filePath);
  return size !== null && size <= maxSize;
}

/**
 * Read text file content safely
 * @param {string} filePath - Path to the file
 * @param {string} encoding - File encoding (default: 'utf-8')
 * @returns {string|null} File content or null if error
 */
function readTextFile(filePath, encoding = 'utf-8') {
  try {
    return fs.readFileSync(filePath, encoding);
  } catch {
    return null;
  }
}

module.exports = {
  knownTextExtensions,
  isKnownTextExtension,
  isProbablyTextContent,
  isValidTextFile,
  getFileSize,
  isFileSizeAcceptable,
  readTextFile,
};
