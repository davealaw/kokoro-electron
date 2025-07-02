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

    console.log(`Splitting text into ${chunks.length} chunks for multi-generation`);

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
          console.log(`Processing chunk ${i + 1} of ${chunks.length}: ${chunk.length} characters`);
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


// Alternative approach 2: Using stream events instead of for-await
ipcMain.handle('run-kokoro-streaming-events', async (event, text, voice, outputPath) => {
  try {
    const tts = await loadTTS();
    const stream = await tts.stream(text, { voice: String(voice) });
    const chunks = [];
    let index = 0;

    console.log('Starting event-based streaming TTS for text length:', text.length);

    return new Promise((resolve, reject) => {
      let completed = false;
      let errorOccurred = false;
      
      // Set up timeout
      const timeout = setTimeout(() => {
        if (!completed && !errorOccurred) {
          console.log('Stream timeout, completing with available chunks:', chunks.length);
          completed = true;
          finishProcessing();
        }
      }, 30000);

      const finishProcessing = async () => {
        if (completed || errorOccurred) return;
        completed = true;
        clearTimeout(timeout);

        try {
          if (chunks.length === 0) {
            reject(new Error('No audio chunks were generated'));
            return;
          }

          console.log('Merging', chunks.length, 'chunks');
          const merged = await KokoroTTS.concat(chunks);

          if (!outputPath || outputPath.trim() === '') {
            outputPath = path.join(app.getPath('documents'), 'kokoro-output.wav');
          }

          console.log('Saving final audio to:', outputPath);
          await merged.save(outputPath);
          resolve(outputPath);
        } catch (mergeError) {
          reject(mergeError);
        }
      };

      // Handle stream events if the stream is an EventEmitter
      if (typeof stream.on === 'function') {
        stream.on('data', async (chunk) => {
          if (completed || errorOccurred) return;
          
          try {
            console.log("Processing chunk via event", index, "at", new Date().toISOString());
            
            if (!chunk || !chunk.audio) {
              console.warn("Received invalid chunk:", chunk);
              return;
            }

            const rawAudio = chunk.audio;
            chunks.push(rawAudio);
            index++;
          } catch (chunkError) {
            console.error('Error processing chunk:', chunkError);
          }
        });

        stream.on('end', () => {
          console.log('Stream ended event received');
          finishProcessing();
        });

        stream.on('error', (error) => {
          if (!completed) {
            errorOccurred = true;
            clearTimeout(timeout);
            console.error('Stream error event:', error);
            
            // Try to salvage what we have
            if (chunks.length > 0) {
              finishProcessing();
            } else {
              reject(error);
            }
          }
        });
      } else {
        // Fallback to iterator approach with better error handling
        (async () => {
          try {
            for await (const chunk of stream) {
              if (completed || errorOccurred) break;
              
              console.log("Processing chunk via iterator", index, "at", new Date().toISOString());
              
              if (!chunk || !chunk.audio) {
                console.warn("Received invalid chunk:", chunk);
                continue;
              }

              const rawAudio = chunk.audio;
              chunks.push(rawAudio);
              index++;
            }
            
            console.log('Iterator completed with', chunks.length, 'chunks');
            finishProcessing();
          } catch (iterError) {
            if (!completed) {
              errorOccurred = true;
              clearTimeout(timeout);
              console.error('Iterator error:', iterError);
              
              if (chunks.length > 0) {
                finishProcessing();
              } else {
                reject(iterError);
              }
            }
          }
        })();
      }
    });
  } catch (err) {
    console.error("Kokoro streaming setup failed:", err);
    throw new Error("Kokoro streaming setup error: " + err.message);
  }
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

ipcMain.handle("run-kokoro-streaming", async (event, text, voice, outputPath) => {
  try {
    const tts = await loadTTS();
    const splitter = new TextSplitterStream();
    const stream = tts.stream(splitter, { voice });

    const tmpdir = os.tmpdir();
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
      event.sender.send('kokoro-progress-update', {
        progress: Math.floor(progress),
        text: `Processing... ${Math.floor(progress)}%`
      });
    };
    
    // Start progress updates
    progressInterval = setInterval(sendProgress, Math.max(100, estimatedMs / 20));

    // Start consuming stream
    const consume = (async () => {
      try {
        for await (const { audio } of stream) {
          const wav = await audio.toWav(); // returns ArrayBuffer
          const buffer = Buffer.from(wav); // convert to Buffer for Node

          const chunkPath = path.join(tmpdir, `kokoro-chunk-${Date.now()}-${index++}.wav`);
          fs.writeFileSync(chunkPath, buffer);
          event.sender.send("kokoro-chunk-ready", chunkPath);

          audioBuffers.push(buffer);
        }

        // Merge WAVs manually: naïve header+data concat
        const merged = mergeWavBuffers(audioBuffers);

        const finalPath = outputPath || path.join(tmpdir, `kokoro-final-${Date.now()}.wav`);
        fs.writeFileSync(finalPath, merged);
        event.sender.send("kokoro-complete", finalPath);

        // Clear progress updates
        clearInterval(progressInterval);
        
        // Send completion progress
        event.sender.send('kokoro-progress-update', {
          progress: 100,
          text: 'Saving audio file...'
        });        

      } catch (err) {
        console.error("Stream loop error:", err);
        event.sender.send("kokoro-error", "Stream error: " + err.message);
      }
    })();

    // Push text into the stream
    const tokens = text.match(/\s*\S+/g) || [];
    for (const token of tokens) {
      splitter.push(token);
      await new Promise((r) => setTimeout(r, 10));
    }
    splitter.close();

  } catch (err) {
    console.error("Kokoro generation failed:", err);
    event.sender.send("kokoro-error", "Kokoro error: " + err.message);
  }
});

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

ipcMain.handle("start-kokoro-stream", async (event, text, voice, outputPath) => {
  try {
    const tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", {
      dtype: "q8",
    });

    const splitter = new TextSplitterStream();
    const stream = tts.stream(splitter, { voice });
    const tmpdir = os.tmpdir();
    const chunkPaths = [];
    let index = 0;

    activeStream = stream;
    activeSplitter = splitter;
    activeChunks = [];
    streamPaused = false;
    streamCancelled = false;

    // Consume audio stream
    ;(async () => {
      for await (const { audio } of stream) {
        if (streamCancelled) return;

        const wavBuffer = Buffer.from(await audio.toWav());
        const chunkPath = path.join(tmpdir, `kokoro-chunk-${Date.now()}-${index++}.wav`);
        fs.writeFileSync(chunkPath, wavBuffer);

        activeChunks.push(audio);
        chunkPaths.push(chunkPath);

        event.sender.send("kokoro-chunk-ready", chunkPath);

        while (streamPaused && !streamCancelled) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      if (!streamCancelled) {
        const merged = RawAudio.concat(activeChunks);
        const finalPath = outputPath || path.join(tmpdir, `kokoro-final-${Date.now()}.wav`);
        await merged.save(finalPath);
        event.sender.send("kokoro-complete", finalPath);
      }
    })();

    // Push text tokens into stream
    const tokens = text.match(/\s*\S+/g) || [];
    for (const token of tokens) {
      if (streamCancelled) break;
      while (streamPaused && !streamCancelled) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      splitter.push(token);
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    splitter.close();
  } catch (err) {
    console.error("Kokoro generation failed:", err);
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
});
