const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { spawn } = require('child_process');

// Now safe to import electron and other modules
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const pLimit = require('p-limit').default;
const limit = pLimit(8); // Try 8, increase if stable

// Import kokoro-js AFTER environment variables are set
const { TextSplitterStream } = require('kokoro-js');

// Import extracted utility modules
const { isValidTextFile, getFileSize, readTextFile } = require('./scripts/file-utils');
const {
  splitText,
  tokenizeText,
  estimateProcessingTime,
  normalizeForTTS,
} = require('./scripts/text-utils');
const { mergeWavBuffers } = require('./scripts/audio-utils');
const { ttsManager } = require('./scripts/tts-manager');
const { createSettingsManager } = require('./scripts/settings-manager');

// Initialize settings manager
const settingsManager = createSettingsManager({
  defaults: {
    lastModel: '',
    lastText: '',
    windowBounds: { width: 800, height: 600, x: undefined, y: undefined },
  },
});

function createWindow() {
  const winBounds = settingsManager.getWindowBounds({ width: 500, height: 500 });
  const win = new BrowserWindow({
    ...winBounds,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.loadFile('index.html');

  // DevTools disabled in production

  // Save size and position on close
  win.on('close', () => {
    settingsManager.saveWindowBounds(win.getBounds());
  });
}

app.whenReady().then(createWindow);

ipcMain.handle('choose-output-file', async () => {
  const result = await dialog.showSaveDialog({
    title: 'Save Output Audio',
    defaultPath: 'kokoro-output.wav',
    filters: [{ name: 'WAV files', extensions: ['wav'] }],
  });

  if (!result.canceled && result.filePath) {
    settingsManager.set('lastOutput', result.filePath);
    return result.filePath;
  }
});

ipcMain.handle('initialize-kokoro', async event => {
  const onProgress = message => {
    event.sender.send('kokoro-init-progress', { message });
  };

  return await ttsManager.initialize(onProgress);
});

ipcMain.handle('list-kokoro-voices', async () => {
  return await ttsManager.getVoices();
});

const defaultOutputPath = path.join(app.getPath('documents'), 'kokoro-output.wav');

ipcMain.handle('run-kokoro', async (_event, text, outFile, voice) => {
  try {
    // Use default output path if none is provided
    if (!outFile || outFile.trim() === '') {
      console.warn(`No output path provided. Using default: ${defaultOutputPath}`);
      outFile = defaultOutputPath;
    }

    // Normalize text for TTS compatibility
    const normalizedText = normalizeForTTS(text);

    // Generate audio via TTS manager
    const audio = await ttsManager.generateAudio(normalizedText, voice);
    await audio.save(outFile);

    // Save current state
    settingsManager.saveSessionState(text, voice, outFile);

    return outFile;
  } catch (err) {
    console.error('Kokoro generation failed:', err);
    throw new Error('Kokoro error: ' + err.message);
  }
});

ipcMain.handle('run-kokoro-multi', async (_event, text, outFile, voice) => {
  try {
    const chunks = await splitText(text, 350); // Adjust chunk size as needed
    const audioBuffers = [];

    // Estimate processing time based on text length for progress updates
    const estimatedMs = estimateProcessingTime(text, 50, 1000); // ~50ms per word, minimum 1 second
    let progress = 0;

    // Send progress updates to the renderer
    const sendProgress = () => {
      progress = Math.min(95, progress + Math.random() * 8 + 2); // Increase by 2-10% each time
      _event.sender.send('kokoro-progress-update', {
        progress: Math.floor(progress),
        text: `Processing... ${Math.floor(progress)}%`,
      });
    };
    // Start progress updates
    const progressInterval = setInterval(sendProgress, Math.max(100, estimatedMs / 20));

    const results = await Promise.all(
      chunks.map((chunk, _i) =>
        limit(async () => {
          // Normalize text for TTS compatibility
          const normalizedChunk = normalizeForTTS(chunk);

          // Skip empty chunks after normalization
          if (!normalizedChunk || normalizedChunk.trim().length === 0) {
            console.warn('Skipping empty chunk after normalization');
            return null;
          }

          const ttsInstance = await ttsManager.createNewInstance();
          const audio = await ttsInstance.generate(normalizedChunk, { voice });
          const wav = await audio.toWav();
          return Buffer.from(wav);
        })
      )
    );

    // Filter out null results (empty chunks)
    const validResults = results.filter(result => result !== null);

    audioBuffers.push(...validResults);
    const merged = mergeWavBuffers(audioBuffers);

    // Clear progress interval
    clearInterval(progressInterval);

    // Use default output path if none is provided
    if (!outFile || outFile.trim() === '') {
      console.warn(`No output path provided. Using default: ${defaultOutputPath}`);
      outFile = defaultOutputPath;
    }

    fs.writeFileSync(outFile, merged);

    // Save current state
    settingsManager.saveSessionState(text, voice, outFile);

    return outFile;
  } catch (err) {
    console.error('Kokoro multi-generation failed:', err);
    throw new Error('Kokoro multi-generation error: ' + err.message);
  }
});

ipcMain.handle('preview-voice', async (_event, voice) => {
  const previewText = 'This is a sample of the selected voice.';
  // Use crypto.randomUUID() for secure temporary filename
  const tempId = crypto.randomUUID();
  const outputFile = path.join(app.getPath('temp'), `kokoro-voice-preview-${tempId}.wav`);

  settingsManager.set('lastModel', voice);

  const audio = await ttsManager.generatePreview(voice, previewText);
  await audio.save(outputFile);
  return outputFile;
});

ipcMain.handle('get-last-settings', async () => {
  return settingsManager.getLastSettings();
});

ipcMain.handle('reset-settings', async () => {
  settingsManager.clear();
});

ipcMain.handle('read-text-file', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Select Text File',
    // filters: [{ name: 'Text Files', extensions: ['txt'] }],
    filters: [{ name: 'All Files', extensions: ['*'] }],
    properties: ['openFile'],
  });
  if (canceled || !filePaths[0]) {
    return null;
  }

  const filePath = filePaths[0];

  if (!isValidTextFile(filePath)) {
    return { invalid: true, path: filePath };
  }

  const fileSize = getFileSize(filePath);
  if (!fileSize || fileSize > 1024 * 1024) {
    return { tooLarge: true, path: filePath };
  } // >1MB

  const text = readTextFile(filePath);
  if (!text) {
    return { error: true, path: filePath };
  }

  return { text, path: filePath };
});

ipcMain.handle('speak-text-file', async (_, filePath, modelPath, outputPath) => {
  return new Promise((resolve, reject) => {
    const piperPath = settingsManager.get('piperPath');

    const child = spawn(piperPath, ['--model', modelPath, '--output_file', outputPath]);

    fs.createReadStream(filePath).pipe(child.stdin);

    child.on('exit', code => {
      if (code === 0) {
        resolve(outputPath);
      } else {
        reject(new Error(`Piper exited with code ${code}`));
      }
    });
  });
});

ipcMain.handle('validate-file-for-drag-drop', async (_, file) => {
  // Use the same validation logic as read-text-file
  if (!isValidTextFile(file)) {
    return { valid: false, reason: 'Invalid file type' };
  }

  // You could also check size here if needed
  return { valid: true };
});

let currentAbortController = null;

ipcMain.handle('start-kokoro-stream', async (event, text, voice, outputPath) => {
  try {
    const tts = await ttsManager.loadTTS();
    const splitter = new TextSplitterStream();
    const stream = tts.stream(splitter, { voice });

    const tmpdir = os.tmpdir();
    const chunkPaths = [];
    const audioBuffers = [];
    let index = 0;

    let streamCancelled = false;
    let streamPaused = false;

    // Setup cancellation
    ipcMain.once('cancel-kokoro-stream', () => {
      streamCancelled = true;
      splitter.close();
    });

    ipcMain.once('pause-kokoro-stream', () => {
      streamPaused = true;
    });

    ipcMain.once('resume-kokoro-stream', () => {
      streamPaused = false;
    });

    // ✅ Create and store the controller
    currentAbortController = new AbortController();
    const { signal } = currentAbortController;

    // Tokenize text for streaming
    const tokens = tokenizeText(text);

    // Stream processor
    (async () => {
      try {
        for await (const { audio } of stream) {
          if (streamCancelled) {
            return;
          }

          if (signal.aborted) {
            return;
          }

          // Convert audio to buffer
          const wavBuffer = Buffer.from(await audio.toWav());
          // Use crypto.randomUUID() for secure temporary filename
          const chunkId = crypto.randomUUID();
          const chunkPath = path.join(tmpdir, `kokoro-chunk-${chunkId}-${index++}.wav`);
          fs.writeFileSync(chunkPath, wavBuffer);

          // Emit chunk path to renderer
          event.sender.send('kokoro-chunk-ready', chunkPath);

          chunkPaths.push(chunkPath);
          audioBuffers.push(wavBuffer);

          // Pause if needed
          while (streamPaused && !streamCancelled) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      } catch (err) {
        console.error('Streaming error:', err);
        event.sender.send('kokoro-error', 'Streaming error: ' + err.message);
      } finally {
        currentAbortController = null;
      }

      // Final merge
      if (!streamCancelled) {
        const finalWavBuffer = mergeWavBuffers(audioBuffers);
        // Use crypto.randomUUID() for secure temporary filename if no output path provided
        const finalPath =
          outputPath || path.join(tmpdir, `kokoro-final-${crypto.randomUUID()}.wav`);
        fs.writeFileSync(finalPath, finalWavBuffer);
        event.sender.send('kokoro-complete', finalPath);
      }
    })();

    // Feed tokens into the stream with pacing
    for (const token of tokens) {
      if (streamCancelled) {
        break;
      }
      if (signal.aborted) {
        break;
      }
      splitter.push(token);
      await new Promise(resolve => setTimeout(resolve, 10)); // pacing delay
    }
    splitter.close(); // close after last token
  } catch (err) {
    console.error('Kokoro streaming failed:', err);
    event.sender.send('kokoro-error', 'Kokoro error: ' + err.message);
  }
});
