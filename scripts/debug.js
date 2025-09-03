// Debug utility for testing streaming TTS methods
// Add this to the main page to help debug streaming issues

export function addDebugControls() {
  // Create debug section
  const debugSection = document.createElement('div');
  debugSection.id = 'debugSection';
  debugSection.style.cssText = `
    border: 2px solid #ff9800;
    padding: 10px;
    margin: 10px 0;
    background-color: #fff3e0;
    border-radius: 4px;
  `;

  debugSection.innerHTML = `
    <h3 style="margin-top: 0;">Debug Controls</h3>
    <div style="display: flex; gap: 10px; margin-bottom: 10px;">
      <button id="testStreamMethod">Test Stream Method</button>
      <button id="testOriginalStreaming">Test Original Streaming</button>
      <button id="testEventStreaming">Test Event Streaming</button>
    </div>
    <div style="display: flex; gap: 10px; margin-bottom: 10px;">
      <button id="testQuickGenerate">Test Quick Generate</button>
      <button id="testFallbackStreaming">Test Fallback Streaming</button>
      <button id="compareGenerateStream">Compare Generate vs Stream</button>
    </div>
    <div style="display: flex; gap: 10px; margin-bottom: 10px;">
      <button id="clearDebugLogs">Clear Console</button>
    </div>
    <div id="debugOutput" style="background: #f5f5f5; padding: 8px; border-radius: 4px; font-family: monospace; font-size: 0.9em; max-height: 200px; overflow-y: auto;"></div>
  `;

  // Insert after the title
  const title = document.querySelector('h2');
  title.parentNode.insertBefore(debugSection, title.nextSibling);

  const debugOutput = document.getElementById('debugOutput');

  function log(message) {
    const timestamp = new Date().toISOString().slice(11, 23);
    debugOutput.innerHTML += `[${timestamp}] ${message}<br>`;
    debugOutput.scrollTop = debugOutput.scrollHeight;
    console.log(`[DEBUG] ${message}`);
  }

  // Test stream method basic functionality
  document.getElementById('testStreamMethod').addEventListener('click', async () => {
    const voice = document.getElementById('voiceSelect').value;
    if (!voice) {
      log('ERROR: No voice selected');
      return;
    }

    const testText = 'Test';
    log(`Testing basic stream method with voice: ${voice}`);

    try {
      const result = await window.kokoroAPI.testStreamMethod(testText, voice);
      if (result.success) {
        log(`SUCCESS: ${result.message}`);
        if (result.hasChunks) {
          log('✅ Stream can produce chunks');
        } else if (result.isEmpty) {
          log('⚠️ Stream completed immediately (no chunks)');
        }
      } else {
        log(`ERROR: ${result.error}`);
      }
    } catch (error) {
      log(`ERROR: Stream method test failed: ${error.message}`);
    }
  });

  // Test original streaming method
  document.getElementById('testOriginalStreaming').addEventListener('click', async () => {
    const voice = document.getElementById('voiceSelect').value;
    if (!voice) {
      log('ERROR: No voice selected');
      return;
    }

    const testText = 'This is a test of the original streaming method.';
    log(`Testing original streaming with voice: ${voice}`);

    try {
      const result = await window.kokoroAPI.speakStreaming(testText, voice, '');
      log(`SUCCESS: Original streaming completed: ${result}`);
    } catch (error) {
      log(`ERROR: Original streaming failed: ${error.message}`);
    }
  });

  // Test event-based streaming method
  document.getElementById('testEventStreaming').addEventListener('click', async () => {
    const voice = document.getElementById('voiceSelect').value;
    if (!voice) {
      log('ERROR: No voice selected');
      return;
    }

    const testText = 'This is a test of the event-based streaming method.';
    log(`Testing event streaming with voice: ${voice}`);

    try {
      const result = await window.kokoroAPI.speakStreamingEvents(testText, voice, '');
      log(`SUCCESS: Event streaming completed: ${result}`);
    } catch (error) {
      log(`ERROR: Event streaming failed: ${error.message}`);
    }
  });

  // Test quick generate (non-streaming)
  document.getElementById('testQuickGenerate').addEventListener('click', async () => {
    const voice = document.getElementById('voiceSelect').value;
    if (!voice) {
      log('ERROR: No voice selected');
      return;
    }

    const testText = 'This is a test of the quick generate method.';
    log(`Testing quick generate with voice: ${voice}`);

    try {
      const result = await window.kokoroAPI.speak(testText, '', voice);
      log(`SUCCESS: Quick generate completed: ${result}`);
    } catch (error) {
      log(`ERROR: Quick generate failed: ${error.message}`);
    }
  });

  // Test fallback streaming (generate with progress simulation)
  document.getElementById('testFallbackStreaming').addEventListener('click', async () => {
    const voice = document.getElementById('voiceSelect').value;
    if (!voice) {
      log('ERROR: No voice selected');
      return;
    }

    const testText =
      'This is a test of the fallback streaming method which uses generate internally.';
    log(`Testing fallback streaming with voice: ${voice}`);

    // Listen for progress updates
    window.kokoroAPI.onProgressUpdate(data => {
      log(`Progress: ${data.progress}% - ${data.text}`);
    });

    try {
      const result = await window.kokoroAPI.speakFallbackStreaming(testText, voice, '');
      log(`SUCCESS: Fallback streaming completed: ${result}`);
    } catch (error) {
      log(`ERROR: Fallback streaming failed: ${error.message}`);
    }
  });

  // Compare generate vs stream methods
  document.getElementById('compareGenerateStream').addEventListener('click', async () => {
    const voice = document.getElementById('voiceSelect').value;
    if (!voice) {
      log('ERROR: No voice selected');
      return;
    }

    const testText = 'Hello world';
    log(`Comparing generate vs stream with voice: ${voice}`);

    try {
      const result = await window.kokoroAPI.compareGenerateVsStream(testText, voice);
      if (result.success) {
        log(`SUCCESS: Generate took ${result.generateTime}ms`);
        log(`Stream creation took ${result.streamCreateTime}ms`);
        log(`First iteration took ${result.firstIterationTime}ms`);
        log(`Stream produces chunks: ${result.streamWorks ? 'YES' : 'NO'}`);
      } else {
        log(`ERROR: ${result.error}`);
      }
    } catch (error) {
      log(`ERROR: Comparison test failed: ${error.message}`);
    }
  });

  // Inspect stream object (requires backend support)
  document.getElementById('inspectStream').addEventListener('click', async () => {
    log('Stream inspection would require backend modifications...');
    log('Check the main process console for detailed stream information');
  });

  // Clear console
  document.getElementById('clearDebugLogs').addEventListener('click', () => {
    debugOutput.innerHTML = '';
    console.clear();
    log('Console cleared');
  });

  log('Debug controls initialized');
}

// Simple test function that can be called from console
window.debugKokoro = {
  async testStreamCompletion(text = 'Test text for stream completion detection.') {
    const voice = document.getElementById('voiceSelect').value;
    if (!voice) {
      console.error('No voice selected');
      return;
    }

    console.log('=== Stream Completion Test ===');
    console.log('Text length:', text.length);
    console.log('Voice:', voice);

    // Test with detailed timing
    const startTime = Date.now();

    try {
      console.log('Starting stream...');
      const result = await window.kokoroAPI.speakStreamingEvents(text, voice, '');
      const endTime = Date.now();

      console.log('✅ Stream completed successfully');
      console.log('Duration:', endTime - startTime + 'ms');
      console.log('Result:', result);

      return result;
    } catch (error) {
      const endTime = Date.now();
      console.error('❌ Stream failed');
      console.error('Duration before failure:', endTime - startTime + 'ms');
      console.error('Error:', error);

      throw error;
    }
  },
};
