  export async function updateSpeakButtonState() {
    const speakButton = document.getElementById('speakButton');
    const streamButton = document.getElementById('streamButton');
    const previewBtn = document.getElementById('previewBtn');
    const voiceSelect = document.getElementById('voiceSelect');
    const textArea = document.getElementById('textInput');
    
    const modelPath = voiceSelect.value;
    const isModelValid = modelPath;
    const hasText = textArea && textArea.value.trim().length > 0;

    previewBtn.disabled = !isModelValid;
    speakButton.disabled = !(isModelValid && hasText);
    streamButton.disabled = !(isModelValid && hasText);
  }
    
  export async function resetToDefaults() {
    const confirmed = confirm('Are you sure you want to reset all settings to defaults?');
    if (!confirmed) return;

    document.getElementById('durationEstimate').textContent = 'Estimated Duration: —';

    await window.kokoroAPI.resetSettings();
    location.reload(); // reloads the app with default state
  }

  // Not called as it is not currently working as intended
  export async function cancelSpeak() {
    const status = document.getElementById('status');
    status.textContent = 'Cancelled.';
    document.getElementById('speakButton').disabled = false;
    document.getElementById('streamButton').disabled = false;
    document.getElementById('cancelButton').disabled = true;
    document.getElementById('progressBar').style.width = '0%';
    document.getElementById('progressText').textContent = '';
    document.getElementById('progressContainer').style.display = 'none';
    document.getElementById('durationEstimate').textContent = '';
  }
