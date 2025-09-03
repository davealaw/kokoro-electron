import { speakText, speakStreamingText, chooseOutput, cancelStream } from './tss.js';
import { updateEstimatedDuration } from './utils.js';
import { loadSettings } from './settings.js';
import { updateSpeakButtonState, resetToDefaults, cancelSpeak } from './states.js';
import {
  playAudio,
  pauseAudio,
  resumeAudio,
  stopAudio,
  initializeAudioPlayerEvents,
} from './audio.js';
import { initializeDragDropEvents } from './dragdrop.js';

window.addEventListener('DOMContentLoaded', async () => {
  initializeAudioPlayerEvents();
  initializeDragDropEvents();

  await loadSettings();

  document.getElementById('previewBtn').addEventListener('click', async () => {
    const voice = document.getElementById('voiceSelect').value;
    if (!voice) {
      return;
    }

    try {
      const audioPath = await window.kokoroAPI.previewVoice(voice);

      // Bust the cache by appending a timestamp
      const audio = new Audio(`${audioPath}?t=${Date.now()}`);
      audio.play();
    } catch (err) {
      console.error('Voice preview failed:', err);
      alert('Voice preview failed. Check the console for details.');
    }
  });

  document.getElementById('loadTextFileBtn').addEventListener('click', async () => {
    const result = await window.kokoroAPI.readTextFile();

    if (!result) {
      return;
    }

    if (result.tooLarge) {
      if (confirm('File is large. Speak directly without preview?')) {
        const voiceSelect = document.getElementById('voiceSelect').value;
        const outputPath = 'large-output.wav'; // or generate name
        await window.kokoroAPI.speakTextFile(result.path, voiceSelect, outputPath);
        new Audio(`${outputPath}?t=${Date.now()}`).play();
      }
    } else {
      document.getElementById('textInput').value = result.text;
      updateEstimatedDuration();
      updateSpeakButtonState();
    }
  });

  document.getElementById('clearTextBtn').addEventListener('click', () => {
    document.getElementById('textInput').value = '';
    updateSpeakButtonState();
  });

  document.getElementById('cancelStreamButton').addEventListener('click', async () => {
    cancelStream();
    await window.kokoroAPI.cancelStream();
    document.getElementById('status').textContent = 'Streaming cancelled.';
    document.getElementById('cancelStreamButton').style.display = 'none';
    cancelSpeak();
    updateSpeakButtonState();
  });

  document.getElementById('textInput').addEventListener('input', updateSpeakButtonState);
  document.getElementById('speakButton').addEventListener('click', speakText);
  document.getElementById('streamButton').addEventListener('click', speakStreamingText);
  document.getElementById('resetToDefaultsButton').addEventListener('click', resetToDefaults);
  document.getElementById('chooseOutputButton').addEventListener('click', chooseOutput);
  document.getElementById('playAudioButton').addEventListener('click', playAudio);
  document.getElementById('pauseAudioButton').addEventListener('click', pauseAudio);
  document.getElementById('resumeAudioButton').addEventListener('click', resumeAudio);
  document.getElementById('stopAudioButton').addEventListener('click', stopAudio);

  updateSpeakButtonState();
});
