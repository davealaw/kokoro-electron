import { formatDuration } from "./utils.js";

let outputFilePath = null;
  
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
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  const progressContainer = document.getElementById('progressContainer');

  speakBtn.disabled = true;
  status.textContent = 'Processing...';
  progressContainer.style.display = 'block';
  progressBar.style.width = '0%';
  progressText.textContent = '0%';

  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const estimatedSeconds = Math.ceil((words / 160) * 60);
  const durationFormatted = formatDuration(estimatedSeconds);
  document.getElementById('durationEstimate').textContent = `Estimated Duration: ~${durationFormatted}`;

  // Estimate duration based on text length
  const charsPerSecond = 15; // tweak this if needed
  const estimatedDuration = (text.length / charsPerSecond) * 1000;
  const startTime = Date.now();

  let timer = setInterval(() => {
    const elapsed = Date.now() - startTime;
    let percent = Math.min(100, Math.floor((elapsed / estimatedDuration) * 100));
    progressBar.style.width = percent + '%';
    progressText.textContent = percent + '% (estimated)';
  }, 100);

  try {
    let resolvedOutputPath = null;
    if (text.length > 600) {
      resolvedOutputPath = await window.kokoroAPI.speakLongText(text, outputPath, voice);
    }
    else {
      resolvedOutputPath = await window.kokoroAPI.speakShortText(text, outputPath, voice);  
    }

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
}

/*
export async function speakStreamingText() {
  const text = document.getElementById('textInput').value;
  const voice = document.getElementById('voiceSelect').value;
  let outputFilePath = document.getElementById('outputPath').value;

  const status = document.getElementById('status');
  const speakBtn = document.getElementById('speakButton');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  const progressContainer = document.getElementById('progressContainer');

  speakBtn.disabled = true;
  status.textContent = 'Processing...';
  progressContainer.style.display = 'block';
  progressBar.style.width = '0%';
  progressText.textContent = 'Streaming...';

  const chunkPaths = [];

  // ✅ Move this into the function (not top-level)
  window.piperAPI.onChunkReady((chunkPath) => {
    const audio = new Audio(`file://${chunkPath}`);
    audio.play();
    chunkPaths.push(chunkPath);
  });

  try {
    const resolvedPath = await window.piperAPI.speakStreaming(text, voice, outputFilePath);

    const audio = document.getElementById('audioPlayer');
    audio.src = `file://${resolvedPath}?t=${Date.now()}`;
    audio.load();
    audio.play();

    status.textContent = 'Done.';
    document.getElementById('audioControls').style.display = 'block';
  } catch (err) {
    status.textContent = 'Error: ' + err.message;
  }

  speakBtn.disabled = false;
}
*/

/* // Version - using run-kokoro-streaming
const chunkQueue = [];
let isPlaying = false;

function playNextChunk() {
  if (isPlaying || chunkQueue.length === 0) return;

  isPlaying = true;
  const chunkPath = chunkQueue.shift();
  const audio = new Audio(`file://${chunkPath}?t=${Date.now()}`);

  audio.addEventListener('ended', () => {
    isPlaying = false;
    playNextChunk(); // Play the next chunk in queue
  });

  audio.play();
}

export async function speakStreamingText() {
  const text = document.getElementById('textInput').value;
  const voice = document.getElementById('voiceSelect').value;
  let outputFilePath = document.getElementById('outputPath').value;

  const status = document.getElementById('status');
  const speakBtn = document.getElementById('speakButton');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  const progressContainer = document.getElementById('progressContainer');

  speakBtn.disabled = true;
  status.textContent = 'Processing...';
  progressContainer.style.display = 'block';
  progressBar.style.width = '0%';
  progressText.textContent = 'Streaming...';

  let chunkCount = 0;

  // Clear old audio
  const audio = document.getElementById('audioPlayer');
  audio.src = '';
  document.getElementById('audioControls').style.display = 'none';

  // Set up progress update listener for the fallback streaming
  const progressUpdateListener = (data) => {
    progressBar.style.width = data.progress + '%';
    progressText.textContent = data.text;
  };
  
  window.kokoroAPI.onProgressUpdate(progressUpdateListener);

  // Register chunk handler
  window.kokoroAPI.onChunkReady((chunkPath) => {
    chunkCount++;
    chunkQueue.push(chunkPath);
    playNextChunk();

    // Optional: show crude progress
//    const percent = Math.min(100, chunkCount * 5); // assume ~20 chunks
//     progressBar.style.width = `${percent}%`;
//    progressText.textContent = `Streaming... ${chunkCount} chunk(s)`; 
  });

  // Register completion handler
  window.kokoroAPI.onComplete((finalPath) => {
    audio.src = `file://${finalPath}?t=${Date.now()}`;
    audio.load();
    audio.play();

    status.textContent = 'Done.';
    progressBar.style.width = '100%';
    progressText.textContent = 'Complete.';
    document.getElementById('audioControls').style.display = 'block';
    speakBtn.disabled = false;
  });

  // Register error handler
  window.kokoroAPI.onError((errMsg) => {
    status.textContent = 'Error: ' + errMsg;
    speakBtn.disabled = false;
  });

  // Start streaming
  try {
    await window.kokoroAPI.speakStreaming(text, voice, outputFilePath || null);
  } catch (err) {
    status.textContent = 'Error: ' + err.message;
    speakBtn.disabled = false;
  }
}
*/


/* Version - using start-kokoro-streaming
export async function speakStreamingText() {
  const text = document.getElementById('textInput').value;
  const voice = document.getElementById('voiceSelect').value;
  const outputPath = document.getElementById('outputPath').value || null;

  const status = document.getElementById('status');
  const speakBtn = document.getElementById('speakButton');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  const progressContainer = document.getElementById('progressContainer');

  speakBtn.disabled = true;
  status.textContent = 'Processing...';
  progressContainer.style.display = 'block';
  progressBar.style.width = '0%';
  progressText.textContent = 'Streaming...';

  // Hide audio controls until final file is ready
  const audio = document.getElementById('audioPlayer');
  audio.src = '';
  document.getElementById('audioControls').style.display = 'none';

  // Setup handlers
  window.kokoroAPI.onProgressUpdate((data) => {
    progressBar.style.width = data.progress + '%';
    progressText.textContent = data.text;
  });

  window.kokoroAPI.onComplete((finalPath) => {
    audio.src = `file://${finalPath}?t=${Date.now()}`;
    audio.load();
    audio.play();

    status.textContent = 'Done.';
    document.getElementById('audioControls').style.display = 'block';
    progressBar.style.width = '100%';
    progressText.textContent = 'Complete';
    speakBtn.disabled = false;
  });

  window.kokoroAPI.onError((msg) => {
    status.textContent = 'Error: ' + msg;
    speakBtn.disabled = false;
  });

  // Start streaming
  try {
    await window.kokoroAPI.speakStreaming(text, voice, outputPath);
  } catch (err) {
    status.textContent = 'Error: ' + err.message;
    speakBtn.disabled = false;
  }
}
*/
