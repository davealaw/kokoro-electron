import { formatDuration } from './utils.js';

let outputFilePath = null;
let currentAudio = null;
const chunkQueue = [];
let isPlaying = false;
let playedChunks = 0;
let totalEstimatedChunks = 0;

export async function chooseOutput() {
  const selected = await window.kokoroAPI.chooseOutputFile();
  if (selected) {
    outputFilePath = selected;
    document.getElementById('outputPath').value = outputFilePath;
  }
}

export async function speakText() {
  const text = document.getElementById('textInput').value;
  const voice = document.getElementById('voiceSelect').value;
  const outputPath = document.getElementById('outputPath').value;

  const status = document.getElementById('status');
  const speakBtn = document.getElementById('speakButton');
  const streamBtn = document.getElementById('streamButton');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  const progressContainer = document.getElementById('progressContainer');

  speakBtn.disabled = true;
  streamBtn.disabled = true;
  status.textContent = 'Processing...';
  progressContainer.style.display = 'block';
  progressBar.style.width = '0%';
  progressText.textContent = '0%';

  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const estimatedSeconds = Math.ceil((words / 160) * 60);
  const durationFormatted = formatDuration(estimatedSeconds);
  document.getElementById('durationEstimate').textContent =
    `Estimated Duration: ~${durationFormatted}`;

  // Estimate duration based on text length
  const charsPerSecond = 15; // tweak this if needed
  const estimatedDuration = (text.length / charsPerSecond) * 1000;
  const startTime = Date.now();

  const timer = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const percent = Math.min(100, Math.floor((elapsed / estimatedDuration) * 100));
    progressBar.style.width = percent + '%';
    progressText.textContent = percent + '% (estimated)';
  }, 100);

  try {
    const start = Date.now();
    let resolvedOutputPath = null;
    if (text.length > 600) {
      resolvedOutputPath = await window.kokoroAPI.speakLongText(text, outputPath, voice);
    } else {
      resolvedOutputPath = await window.kokoroAPI.speakShortText(text, outputPath, voice);
    }
    const end = Date.now();
    console.log(`TTS took ${end - start} ms`);

    const audio = document.getElementById('audioPlayer');

    audio.src = `${resolvedOutputPath}?t=${Date.now()}`;
    audio.load();
    audio.play();

    clearInterval(timer);
    status.textContent = 'Playing...';
    document.getElementById('audioControls').style.display = 'block';
  } catch (err) {
    clearInterval(timer);
    status.textContent = 'Error: ' + err.message;
  }

  speakBtn.disabled = false;
  streamBtn.disabled = false;
}

function playNextChunk() {
  if (isPlaying || chunkQueue.length === 0) {
    return;
  }

  isPlaying = true;
  const chunkPath = chunkQueue.shift();
  currentAudio = new Audio(`file://${chunkPath}?t=${Date.now()}`);

  currentAudio.addEventListener('ended', () => {
    playedChunks++;
    updateStreamingProgressBar(); // <-- update progress here
    isPlaying = false;
    currentAudio = null;
    playNextChunk();
  });

  currentAudio.play();
}

function updateStreamingProgressBar() {
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');

  if (totalEstimatedChunks === 0) {
    return;
  }

  const percent = Math.min((playedChunks / totalEstimatedChunks) * 100, 100);
  progressBar.style.width = `${percent}%`;
  progressText.textContent = `Playing... ${playedChunks} / ${totalEstimatedChunks}`;
}

export async function speakStreamingText() {
  const text = document.getElementById('textInput').value;
  const voice = document.getElementById('voiceSelect').value;
  const outputFilePath = document.getElementById('outputPath').value;

  const status = document.getElementById('status');
  const speakBtn = document.getElementById('speakButton');
  const streamBtn = document.getElementById('streamButton');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  const progressContainer = document.getElementById('progressContainer');
  const cancelStreamButton = document.getElementById('cancelStreamButton');

  cancelStreamButton.style.display = 'inline-block';

  speakBtn.disabled = true;
  streamBtn.disabled = true;
  status.textContent = 'Processing...';
  progressContainer.style.display = 'block';
  progressBar.style.width = '0%';
  progressText.textContent = 'Streaming...';

  // Clear old audio
  const audio = document.getElementById('audioPlayer');
  audio.src = '';
  document.getElementById('audioControls').style.display = 'none';
  status.textContent = 'Streaming...';

  const totalChars = text.length;

  console.log(`Total characters: ${totalChars}`);

  const estimatedCharsPerChunk = 80;
  totalEstimatedChunks = Math.ceil(totalChars / estimatedCharsPerChunk);
  const estimatedSeconds = totalEstimatedChunks * 6.5; // in seconds

  const durationFormatted = formatDuration(estimatedSeconds);
  document.getElementById('durationEstimate').textContent =
    `Estimated Duration: ~${durationFormatted}`;

  playedChunks = 0;

  // Register chunk handler
  window.kokoroAPI.onChunkReady(chunkPath => {
    chunkQueue.push(chunkPath);
    playNextChunk();
  });

  window.kokoroAPI.onComplete(finalPath => {
    const audio = document.getElementById('audioPlayer');
    audio.src = `file://${finalPath}?t=${Date.now()}`;
    audio.load();

    // Enable the controls
    document.getElementById('audioControls').style.display = 'block';
    // status.textContent = 'Done.';
    cancelStreamButton.style.display = 'none';
  });

  // Register error handler
  window.kokoroAPI.onError(errMsg => {
    status.textContent = 'Error: ' + errMsg;
    speakBtn.disabled = false;
    streamBtn.disabled = false;
    cancelStreamButton.style.display = 'none';
  });

  // Start streaming
  try {
    await window.kokoroAPI.speakStreaming(text, voice, outputFilePath || null);
  } catch (err) {
    status.textContent = 'Error: ' + err.message;
    speakBtn.disabled = false;
    streamBtn.disabled = false;
    cancelStreamButton.style.display = 'none';
  }
}

export function cancelStream() {
  playedChunks = 0;
  totalEstimatedChunks = 0;
  chunkQueue.length = 0;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = '';
  }
  isPlaying = false;
}
