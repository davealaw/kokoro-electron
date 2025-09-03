export async function updateSpeakButtonState() {
  const speakButton = document.getElementById('speakButton');
  const streamButton = document.getElementById('streamButton');
  const previewBtn = document.getElementById('previewBtn');
  const voiceSelect = document.getElementById('voiceSelect');
  const textArea = document.getElementById('textInput');

  const modelPath = voiceSelect ? voiceSelect.value : null;
  const isModelValid = modelPath;
  const hasText = textArea && textArea.value.trim().length > 0;

  if (previewBtn) {
    previewBtn.disabled = !isModelValid;
  }
  if (speakButton) {
    speakButton.disabled = !(isModelValid && hasText);
  }
  if (streamButton) {
    streamButton.disabled = !(isModelValid && hasText);
  }
}

export async function resetToDefaults() {
  const confirmed = confirm('Are you sure you want to reset all settings to defaults?');
  if (!confirmed) {
    return;
  }

  const durationEstimate = document.getElementById('durationEstimate');
  if (durationEstimate) {
    durationEstimate.textContent = 'Estimated Duration: —';
  }

  await window.kokoroAPI.resetSettings();
  location.reload(); // reloads the app with default state
}

// Not called as it is not currently working as intended
export async function cancelSpeak() {
  const status = document.getElementById('status');
  const speakButton = document.getElementById('speakButton');
  const streamButton = document.getElementById('streamButton');
  const cancelButton = document.getElementById('cancelButton');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  const progressContainer = document.getElementById('progressContainer');
  const durationEstimate = document.getElementById('durationEstimate');

  if (status) {
    status.textContent = 'Cancelled.';
  }
  if (speakButton) {
    speakButton.disabled = false;
  }
  if (streamButton) {
    streamButton.disabled = false;
  }
  if (cancelButton) {
    cancelButton.disabled = true;
  }
  if (progressBar && progressBar.style) {
    progressBar.style.width = '0%';
  }
  if (progressText) {
    progressText.textContent = '';
  }
  if (progressContainer && progressContainer.style) {
    progressContainer.style.display = 'none';
  }
  if (durationEstimate) {
    durationEstimate.textContent = '';
  }
}
