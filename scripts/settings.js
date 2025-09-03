export async function loadSettings() {
  const settings = await window.kokoroAPI.getLastSettings();

  if (settings.lastText) {
    document.getElementById('textInput').value = settings.lastText;
  }

  if (settings.lastOutput) {
    document.getElementById('outputPath').value = settings.lastOutput;
  }

  document.getElementById('status').textContent = '';

  await populateVoices();

  // Load last settings like text/model/output
  if (settings.lastModel) {
    const voiceSelect = document.getElementById('voiceSelect');
    const option = Array.from(voiceSelect.options).find(opt => opt.value === settings.lastModel);
    if (option) {
      voiceSelect.value = settings.lastModel;
    }
  }
}

export async function populateVoices() {
  const voiceSelect = document.getElementById('voiceSelect');
  const status = document.getElementById('status');

  voiceSelect.innerHTML = '';

  // Add loading option
  const loadingOpt = document.createElement('option');
  loadingOpt.text = 'Loading TTS system...';
  loadingOpt.disabled = true;
  voiceSelect.appendChild(loadingOpt);

  // Show initial status
  status.textContent = 'Initializing TTS system...';

  // Listen for progress updates
  const progressHandler = (event, data) => {
    status.textContent = data.message;
  };

  window.kokoroAPI.onInitProgress(progressHandler);

  try {
    const initialized = await window.kokoroAPI.initializeKokoro();

    // Remove progress handler
    window.kokoroAPI.removeInitProgressListener(progressHandler);

    if (!initialized) {
      voiceSelect.innerHTML = '';
      const opt = document.createElement('option');
      opt.text = 'Model failed to load';
      opt.disabled = true;
      voiceSelect.appendChild(opt);
      status.textContent = 'Failed to load TTS model';
      return;
    }
  } catch (err) {
    // Remove progress handler
    window.kokoroAPI.removeInitProgressListener(progressHandler);

    voiceSelect.innerHTML = '';
    const opt = document.createElement('option');
    opt.text = 'Initialization error';
    opt.disabled = true;
    voiceSelect.appendChild(opt);
    status.textContent = 'Error initializing TTS system';
    console.error('TTS initialization error:', err);
    return;
  }

  // Clear the loading option
  voiceSelect.innerHTML = '';

  const voices = await window.kokoroAPI.listVoices();

  if (!voices || typeof voices !== 'object') {
    const opt = document.createElement('option');
    opt.text = 'No voices found';
    opt.disabled = true;
    voiceSelect.appendChild(opt);
    status.textContent = 'No voices available';
    return;
  }

  // If voices is an object with keys as voice IDs
  Object.entries(voices).forEach(([id, meta]) => {
    const opt = document.createElement('option');
    opt.value = id;
    // │ (index)     │ name       │ language │ gender   │ traits │ targetQuality │ overallGrade │
    const name = (meta.name || '').padEnd(10);
    const gender = (meta.gender || '').padEnd(6);
    const language = (meta.language || '').padEnd(6);
    const traits = (meta.traits || '').padEnd(3);
    const grade = (meta.overallGrade || '').padEnd(3);

    opt.text = `${name} ${gender} ${language} ${grade} ${traits}`;
    voiceSelect.appendChild(opt);
  });

  if (voiceSelect.options.length > 0) {
    voiceSelect.value = voiceSelect.options[0].value;
    status.textContent = 'TTS system ready';
  }
}
