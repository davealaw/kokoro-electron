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
