
import { updateSpeakButtonState } from "./states.js";

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
  voiceSelect.innerHTML = '';

  const initialized = await window.kokoroAPI.initializeKokoro();
  if (!initialized) {
    const opt = document.createElement('option');
    opt.text = 'Model failed to load';
    opt.disabled = true;
    voiceSelect.appendChild(opt);
    return;
  }

  const voices = await window.kokoroAPI.listVoices();

  if (!voices || typeof voices !== 'object') {
    const opt = document.createElement('option');
    opt.text = 'No voices found';
    opt.disabled = true;
    voiceSelect.appendChild(opt);
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
  }
}


