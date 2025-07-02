const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { KokoroTTS, TextSplitterStream, RawAudio } = require("kokoro-js");

const pLimit = require('p-limit').default;
const limit = pLimit(8); // Try 8, increase if stable

const os = require('os');
const tmpdir = os.tmpdir();

const Store = require('electron-store').default;
const store = new Store({
  defaults: {
    lastModel: '',
    lastText: '',
    windowBounds: { width: 800, height: 600, x: undefined, y: undefined },
  }
});

let currentProcess = null;

function createWindow() {
  const winBounds = store.get('windowBounds', { width: 500, height: 500 });
  const win = new BrowserWindow({
    ...winBounds,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.loadFile('index.html');

  // Save size and position on close
  win.on('close', () => {
    store.set('windowBounds', win.getBounds());
  });
}

const knownTextExtensions = [
  '.txt', '.md', '.html', '.htm', '.js', '.ts', '.json',
  '.css', '.csv', '.xml', '.ini', '.log', '.yml', '.yaml',
  '.py', '.java', '.c', '.cpp', '.rb', '.go'
];

function isKnownTextExtension(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return knownTextExtensions.includes(ext);
}

function isProbablyTextContent(filePath, maxBytes = 512) {
  try {
    const buffer = fs.readFileSync(filePath, { encoding: null, flag: 'r' });
    const sample = buffer.slice(0, maxBytes);
    for (let i = 0; i < sample.length; i++) {
      const code = sample[i];
      if (code === 9 || code === 10 || code === 13) continue; // tab, CR, LF
      if (code < 32 || code > 126) return false;
    }
    return true;
  } catch {
    return false;
  }
}

function isValidTextFile(filePath) {
  return isKnownTextExtension(filePath) || isProbablyTextContent(filePath);
}

app.whenReady().then(createWindow);

ipcMain.handle('choose-output-file', async () => {
  const result = await dialog.showSaveDialog({
    title: 'Save Output Audio',
    defaultPath: 'kokoro-output.wav',
    filters: [{ name: 'WAV files', extensions: ['wav'] }]
  });

  if (!result.canceled && result.filePath) {
    store.set('lastOutput', result.filePath);
    return result.filePath;
  }
});


const FIXED_MODEL_ID = "onnx-community/Kokoro-82M-ONNX";
let cachedTTS = null;

const loadTTS = async () => {
  if (!cachedTTS) {
    cachedTTS = await KokoroTTS.from_pretrained(FIXED_MODEL_ID, {
      dtype: "q8"
    });
  }
  return cachedTTS;
};

ipcMain.handle('initialize-kokoro', async () => {
  try {
    await loadTTS();
    return true;
  } catch (err) {
    console.error("Kokoro init failed:", err);
    return false;
  }
});

ipcMain.handle('list-kokoro-voices', async () => {
  try {
    const tts = await loadTTS();
    return tts.voices; 
  } catch (err) {
    console.error("Voice listing failed:", err);
    return [];
  }
});

const defaultOutputPath = path.join(app.getPath('documents'), 'kokoro-output.wav');

ipcMain.handle('run-kokoro', async (_event, text, outFile, voice) => {
  try {
    const tts = await loadTTS();

    // Use default output path if none is provided
    if (!outFile || outFile.trim() === '') {
      console.warn(`No output path provided. Using default: ${defaultOutputPath}`);
      outFile = defaultOutputPath;
    }

    // ✅ Save current state to store
    store.set('lastText', text);
    store.set('lastModel', voice);
    store.set('lastOutput', outFile);

    const audio = await tts.generate(text, { voice });
     await audio.save(outFile);
    return outFile;
  } catch (err) {
    console.error("Kokoro generation failed:", err);
    throw new Error("Kokoro error: " + err.message);
  }
});

async function splitText(text, maxLength = 350) {
  const sentences = text.split(/(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?)\s/);
  let chunks = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length + 1 <= maxLength) {
      currentChunk += (currentChunk ? " " : "") + sentence;
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

ipcMain.handle('run-kokoro-multi', async (_event, text, outFile, voice) => {
  try {
    const tts = await loadTTS();
    const chunks = await splitText(text, 350); // Adjust chunk size as needed
    const audioBuffers = [];
    let index = 0;

    // Estimate processing time based on text length for progress updates
    const wordsEstimate = text.trim().split(/\s+/).length;
    const estimatedMs = Math.max(1000, wordsEstimate * 50); // ~50ms per word, minimum 1 second
    let progressInterval;
    let progress = 0;   

    // Send progress updates to the renderer
    const sendProgress = () => {
      progress = Math.min(95, progress + Math.random() * 8 + 2); // Increase by 2-10% each time
      _event.sender.send('kokoro-progress-update', {
        progress: Math.floor(progress),
        text: `Processing... ${Math.floor(progress)}%`
      });
    }
    // Start progress updates
    progressInterval = setInterval(sendProgress, Math.max(100, estimatedMs / 20));

    const results = await Promise.all(
      chunks.map((chunk, i) =>
        limit(async () => {
          const ttsInstance = await KokoroTTS.from_pretrained(FIXED_MODEL_ID, { dtype: "q8" });
          const audio = await ttsInstance.generate(chunk, { voice });
          const wav = await audio.toWav();
          return Buffer.from(wav);
        })
      )
    );

    audioBuffers.push(...results);    
    const merged = mergeWavBuffers(audioBuffers);
    
    // Use default output path if none is provided
    if (!outFile || outFile.trim() === '') {
      console.warn(`No output path provided. Using default: ${defaultOutputPath}`);
      outFile = defaultOutputPath;
    }

    fs.writeFileSync(outFile, merged);

    // ✅ Save current state to store
    store.set('lastText', text);
    store.set('lastModel', voice);
    store.set('lastOutput', outFile);

    return outFile;
  } catch (err) {
    console.error("Kokoro multi-generation failed:", err);
    throw new Error("Kokoro multi-generation error: " + err.message);
  }
});

ipcMain.handle('preview-voice', async (_event, voice) => {
  const previewText = "This is a sample of the selected voice.";
  const outputFile = path.join(app.getPath('temp'), 'kokoro-voice-preview.wav');

  store.set('lastModel', voice);

  const tts = await loadTTS();
  const audio = await tts.generate(previewText, { voice });
    await audio.save(outputFile);
  return outputFile;
});

function mergeWavBuffers(buffers) {
  if (!buffers || buffers.length === 0) return Buffer.alloc(0);
  if (buffers.length === 1) return buffers[0];

  // WAV header is 44 bytes
  const HEADER_SIZE = 44;

  // Get the header from the first buffer
  const header = buffers[0].slice(0, HEADER_SIZE);

  // Concatenate all PCM data (strip headers from all but the first)
  const dataBuffers = [buffers[0].slice(HEADER_SIZE)];
  let totalDataLength = buffers[0].length - HEADER_SIZE;

  for (let i = 1; i < buffers.length; i++) {
    const buf = buffers[i];
    dataBuffers.push(buf.slice(HEADER_SIZE));
    totalDataLength += buf.length - HEADER_SIZE;
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

ipcMain.handle('cancel-speak', async () => {
  if (currentProcess) {
    try {
      currentProcess.kill();
      currentProcess = null;
      return true;
    } catch (err) {
      console.error('Failed to cancel process:', err);
    }
  }
  return false;
});

ipcMain.handle('get-last-settings', async () => {
  return {
    lastModel: store.get('lastModel', null),
    lastOutput: store.get('lastOutput', null),
    lastText: store.get('lastText', '')
  };
});

ipcMain.handle('reset-settings', async () => {
  store.clear();
});

ipcMain.handle('read-text-file', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Select Text File',
    // filters: [{ name: 'Text Files', extensions: ['txt'] }],
    filters: [{ name: 'All Files', extensions: ['*'] }],
    properties: ['openFile']
  });
  if (canceled || !filePaths[0]) return null;

  const filePath = filePaths[0];

  if (!isValidTextFile(filePath)) {
    return { invalid: true, path: filePath };
  }

  const stats = fs.statSync(filePath);
  if (stats.size > 1024 * 1024) return { tooLarge: true, path: filePath }; // >1MB

  const text = fs.readFileSync(filePath, 'utf-8');
  return { text, path: filePath };
});

ipcMain.handle('speak-text-file', async (_, filePath, modelPath, outputPath) => {
  
  return new Promise((resolve, reject) => {
    const piperPath = store.get('piperPath');

    const child = spawn(piperPath, [
      '--model', modelPath,
      '--output_file', outputPath
    ]);

    fs.createReadStream(filePath).pipe(child.stdin);

    child.on('exit', code => {
      if (code === 0) resolve(outputPath);
      else reject(new Error(`Piper exited with code ${code}`));
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

let activeStream = null;
let activeSplitter = null;
let activeChunks = [];
let streamPaused = false;
let streamCancelled = false;

let currentAbortController = null;

ipcMain.handle("start-kokoro-stream", async (event, text, voice, outputPath) => {
  try {
    const tts = await loadTTS();
    const splitter = new TextSplitterStream();
    const stream = tts.stream(splitter, { voice });

    const tmpdir = os.tmpdir();
    const chunkPaths = [];
    const audioBuffers = [];
    let index = 0;

    let streamCancelled = false;
    let streamPaused = false;

    // Setup cancellation
    ipcMain.once("cancel-kokoro-stream", () => {
      streamCancelled = true;
      splitter.close();
    });

    ipcMain.once("pause-kokoro-stream", () => {
      streamPaused = true;
    });

    ipcMain.once("resume-kokoro-stream", () => {
      streamPaused = false;
    });

    // ✅ Create and store the controller
    currentAbortController = new AbortController();
    const { signal } = currentAbortController;

    // Estimate token count for progress
    const tokens = text.match(/\s*\S+/g) || [];
    const totalTokens = tokens.length;
    let tokensProcessed = 0;

    // Stream processor
    (async () => {
      try {
        for await (const { audio } of stream) {
          if (streamCancelled) return;

          if (signal.aborted) {
            return;
          }

          // Convert audio to buffer
          const wavBuffer = Buffer.from(await audio.toWav());
          const chunkPath = path.join(tmpdir, `kokoro-chunk-${Date.now()}-${index++}.wav`);
          fs.writeFileSync(chunkPath, wavBuffer);

          // Emit chunk path to renderer
          event.sender.send("kokoro-chunk-ready", chunkPath);

          chunkPaths.push(chunkPath);
          audioBuffers.push(wavBuffer);

          tokensProcessed++;
          const progress = Math.min(100, Math.round((tokensProcessed / totalTokens) * 100));
          event.sender.send("kokoro-progress-update", progress);

          // Pause if needed
          while (streamPaused && !streamCancelled) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      }
      catch (err) {
        console.error("Streaming error:", err);
        event.sender.send("kokoro-error", "Streaming error: " + err.message);
      } finally {
        currentAbortController = null;
      }      
      
      // Final merge
      if (!streamCancelled) {
        const finalWavBuffer = mergeWavBuffers(audioBuffers);
        const finalPath = outputPath || path.join(tmpdir, `kokoro-final-${Date.now()}.wav`);
        fs.writeFileSync(finalPath, finalWavBuffer);
        event.sender.send("kokoro-complete", finalPath);
      }
    })();

    // Feed tokens into the stream with pacing
    for (const token of tokens) {
      if (streamCancelled) break;
      if (signal.aborted) break;
      splitter.push(token);
      await new Promise(resolve => setTimeout(resolve, 10)); // pacing delay
    }
    splitter.close(); // close after last token

  } catch (err) {
    console.error("Kokoro streaming failed:", err);
    event.sender.send("kokoro-error", "Kokoro error: " + err.message);
  }
});

ipcMain.handle("pause-kokoro-stream", () => {
  streamPaused = true;
});

ipcMain.handle("resume-kokoro-stream", () => {
  streamPaused = false;
});

ipcMain.handle("cancel-kokoro-stream", () => {
  streamCancelled = true;
  if (activeSplitter) activeSplitter.close();
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }
});
