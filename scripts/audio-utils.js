/**
 * WAV file format constants
 */
const WAV_HEADER_SIZE = 44;

/**
 * Merge multiple WAV buffers into a single WAV file
 * @param {Buffer[]} buffers - Array of WAV buffers to merge
 * @returns {Buffer} Merged WAV buffer
 */
function mergeWavBuffers(buffers) {
  if (!buffers || buffers.length === 0) {
    return Buffer.alloc(0);
  }

  if (buffers.length === 1) {
    return buffers[0];
  }

  // Get the header from the first buffer
  const header = buffers[0].slice(0, WAV_HEADER_SIZE);

  // Concatenate all PCM data (strip headers from all but the first)
  const dataBuffers = [buffers[0].slice(WAV_HEADER_SIZE)];
  let totalDataLength = buffers[0].length - WAV_HEADER_SIZE;

  for (let i = 1; i < buffers.length; i++) {
    const buf = buffers[i];
    dataBuffers.push(buf.slice(WAV_HEADER_SIZE));
    totalDataLength += buf.length - WAV_HEADER_SIZE;
  }

  // Update the header with the new file size and data chunk size
  const mergedHeader = Buffer.from(header); // copy
  // ChunkSize (file size - 8) at offset 4, little endian
  mergedHeader.writeUInt32LE(36 + totalDataLength, 4);
  // Subchunk2Size (data size) at offset 40, little endian
  mergedHeader.writeUInt32LE(totalDataLength, 40);

  // Combine header and data
  return Buffer.concat([mergedHeader, ...dataBuffers]);
}

/**
 * Validate that a buffer appears to be a valid WAV file
 * @param {Buffer} buffer - Buffer to validate
 * @returns {boolean} True if buffer appears to be a valid WAV
 */
function isValidWavBuffer(buffer) {
  if (!buffer || buffer.length < WAV_HEADER_SIZE) {
    return false;
  }

  // Check for RIFF header
  const riffHeader = buffer.slice(0, 4).toString('ascii');
  if (riffHeader !== 'RIFF') {
    return false;
  }

  // Check for WAVE format
  const waveHeader = buffer.slice(8, 12).toString('ascii');
  if (waveHeader !== 'WAVE') {
    return false;
  }

  return true;
}

/**
 * Extract WAV file information from buffer
 * @param {Buffer} buffer - WAV buffer to analyze
 * @returns {object|null} WAV file info or null if invalid
 */
function getWavInfo(buffer) {
  if (!isValidWavBuffer(buffer)) {
    return null;
  }

  try {
    // Read basic WAV information
    const fileSize = buffer.readUInt32LE(4) + 8;
    const audioFormat = buffer.readUInt16LE(20);
    const numChannels = buffer.readUInt16LE(22);
    const sampleRate = buffer.readUInt32LE(24);
    const byteRate = buffer.readUInt32LE(28);
    const blockAlign = buffer.readUInt16LE(32);
    const bitsPerSample = buffer.readUInt16LE(34);
    const dataSize = buffer.readUInt32LE(40);

    return {
      fileSize,
      audioFormat,
      numChannels,
      sampleRate,
      byteRate,
      blockAlign,
      bitsPerSample,
      dataSize,
      duration: dataSize / byteRate, // Duration in seconds
    };
  } catch {
    return null;
  }
}

/**
 * Create a silent WAV buffer of specified duration
 * @param {number} durationSeconds - Duration of silence in seconds
 * @param {number} sampleRate - Sample rate (default: 44100)
 * @param {number} channels - Number of channels (default: 1)
 * @param {number} bitsPerSample - Bits per sample (default: 16)
 * @returns {Buffer} WAV buffer containing silence
 */
function createSilentWavBuffer(
  durationSeconds,
  sampleRate = 44100,
  channels = 1,
  bitsPerSample = 16
) {
  const bytesPerSample = bitsPerSample / 8;
  const dataSize = Math.floor(durationSeconds * sampleRate * channels * bytesPerSample);
  const fileSize = 36 + dataSize;

  const buffer = Buffer.alloc(WAV_HEADER_SIZE + dataSize);

  // WAV header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(fileSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size
  buffer.writeUInt16LE(1, 20); // AudioFormat (PCM)
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * bytesPerSample, 28); // ByteRate
  buffer.writeUInt16LE(channels * bytesPerSample, 32); // BlockAlign
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Data section is already filled with zeros (silence)

  return buffer;
}

/**
 * Estimate the duration of a WAV buffer in seconds
 * @param {Buffer} buffer - WAV buffer to analyze
 * @returns {number|null} Duration in seconds, or null if invalid
 */
function estimateWavDuration(buffer) {
  const info = getWavInfo(buffer);
  return info ? info.duration : null;
}

module.exports = {
  WAV_HEADER_SIZE,
  mergeWavBuffers,
  isValidWavBuffer,
  getWavInfo,
  createSilentWavBuffer,
  estimateWavDuration,
};
