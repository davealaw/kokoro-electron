const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('kokoroAPI', {
  getLastSettings: () => ipcRenderer.invoke('get-last-settings'),
  initializeKokoro: () => ipcRenderer.invoke('initialize-kokoro'),
  listVoices: () => ipcRenderer.invoke('list-kokoro-voices'),
  resetSettings: () => ipcRenderer.invoke('reset-settings'),
  readTextFile: () => ipcRenderer.invoke('read-text-file'),
  speakShortText: (text, outputPath, voice) => ipcRenderer.invoke('run-kokoro', text, outputPath, voice),
  // speakStreaming: (text, voice, outputPath) => ipcRenderer.invoke('run-kokoro-streaming', text, voice, outputPath),
  speakStreaming: (text, voice, outputPath) => ipcRenderer.invoke('start-kokoro-stream', text, voice, outputPath),
  previewVoice: (voice) => ipcRenderer.invoke('preview-voice', voice),
  chooseOutputFile: () => ipcRenderer.invoke('choose-output-file'),
  speakTextFile: (filePath, modelPath, outputPath) => ipcRenderer.invoke('speak-text-file', filePath, modelPath, outputPath),
  validateFileForDragDrop: (filePath) => ipcRenderer.invoke('validate-file-for-drag-drop', filePath),
  cancelSpeak: () => ipcRenderer.invoke('cancel-speak'),
  onChunkReady: (callback) => ipcRenderer.on('kokoro-chunk-ready', (_event, chunkPath) => callback(chunkPath)),
  onComplete: (callback) => ipcRenderer.on('kokoro-complete', (_event, filePath) => callback(filePath)),
  onError: (callback) => ipcRenderer.on('kokoro-error', (_event, errorMsg) => callback(errorMsg)),
  onProgressUpdate: (callback) => ipcRenderer.on('kokoro-progress-update', (_event, data) => callback(data)),
  speakLongText: (text, outputPath, voice) => ipcRenderer.invoke('run-kokoro-multi', text, outputPath, voice),
 });



