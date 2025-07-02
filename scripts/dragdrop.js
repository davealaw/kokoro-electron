import { updateSpeakButtonState } from "./states.js";

export function initializeDragDropEvents() {
    const dropZone = document.getElementById('textDropZone');
    const textArea = document.getElementById('textInput');

    dropZone.addEventListener('dragover', (event) => {
      event.preventDefault();
      dropZone.style.borderColor = 'blue';  // Optional visual feedback
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.style.borderColor = '#aaa';
    });

    dropZone.addEventListener('drop', async (event) => {
      event.preventDefault();
      dropZone.style.borderColor = '#aaa';

      const file = event.dataTransfer.files[0];

      if (!file) return;

      // Use backend validation instead of hardcoded .txt check
      const validation = await window.kokoroAPI.validateFileForDragDrop(file.name);
      if (!validation.valid) {
        alert(`File not supported: ${validation.reason}`);
        return;
      }      

      if (file.size > 1024 * 1024) { // >1MB
        alert('File too large to load into the editor. Please use "Load Text File..." instead.');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        textArea.value = reader.result;
      };
      reader.readAsText(file);
      updateSpeakButtonState();
    });
}