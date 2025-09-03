import { formatDuration } from './utils.js';

export function playAudio() {
  const audio = document.getElementById('audioPlayer');
  audio.play();
}

export function pauseAudio() {
  const audio = document.getElementById('audioPlayer');
  audio.pause();
}

export function resumeAudio() {
  const audio = document.getElementById('audioPlayer');
  audio.play(); // resume is same as play in HTML5
}

export function stopAudio() {
  const audio = document.getElementById('audioPlayer');
  audio.pause();
  audio.currentTime = 0;
}

export function initializeAudioPlayerEvents() {
  const audio = document.getElementById('audioPlayer');

  audio.onloadedmetadata = () => {
    const durationFormatted = formatDuration(audio.duration);
    document.getElementById('durationEstimate').textContent = `Duration: ${durationFormatted}`;
  };

  audio.onplay = () => {
    document.getElementById('status').textContent = 'Playing...';
    document.getElementById('audioControls').style.display = 'block';
  };

  audio.onpause = () => {
    document.getElementById('status').textContent = 'Paused';
  };

  audio.onended = () => {
    document.getElementById('status').textContent = 'Done.';
    document.getElementById('audioControls').style.display = 'none';
    document.getElementById('progressContainer').style.display = 'none';
    document.getElementById('speakButton').disabled = false;
    document.getElementById('streamButton').disabled = false;
  };

  audio.ontimeupdate = () => {
    const progress = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const percent = (audio.currentTime / audio.duration) * 100;
    progress.style.width = `${percent.toFixed(0)}%`;
    progressText.textContent = `${percent.toFixed(0)}%`;
  };
}
