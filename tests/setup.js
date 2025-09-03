// Mock Electron APIs
global.window = global.window || {};
global.window.kokoroAPI = {
  getLastSettings: jest.fn(),
  initializeKokoro: jest.fn(),
  listVoices: jest.fn(),
  resetSettings: jest.fn(),
  readTextFile: jest.fn(),
  speakShortText: jest.fn(),
  speakLongText: jest.fn(),
  speakStreaming: jest.fn(),
  previewVoice: jest.fn(),
  chooseOutputFile: jest.fn(),
  speakTextFile: jest.fn(),
  validateFileForDragDrop: jest.fn(),
  cancelSpeak: jest.fn(),
  cancelStream: jest.fn(),
  onChunkReady: jest.fn(),
  onComplete: jest.fn(),
  onError: jest.fn(),
  onProgressUpdate: jest.fn(),
  onInitProgress: jest.fn(),
  removeInitProgressListener: jest.fn(),
};

// Mock Audio API
global.Audio = jest.fn().mockImplementation(() => ({
  play: jest.fn(),
  pause: jest.fn(),
  load: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  src: '',
  currentTime: 0,
  duration: 100,
  onplay: null,
  onpause: null,
  onended: null,
  ontimeupdate: null,
  onloadedmetadata: null,
}));

// Mock FileReader
global.FileReader = jest.fn().mockImplementation(() => ({
  readAsText: jest.fn(),
  onload: null,
  result: 'mock file content',
}));

// Mock DOM elements commonly used in tests
const createMockElement = tagName => ({
  tagName: tagName.toUpperCase(),
  id: '',
  value: '',
  textContent: '',
  innerHTML: '',
  style: {},
  disabled: false,
  options: [],
  appendChild: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  setAttribute: jest.fn(),
  getAttribute: jest.fn(),
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(),
  getBounds: jest.fn(() => ({ width: 800, height: 600, x: 0, y: 0 })),
  load: jest.fn(),
  play: jest.fn(),
  pause: jest.fn(),
});

// Mock document.getElementById
global.document.getElementById = jest.fn(id => {
  const mockElements = {
    textInput: { ...createMockElement('textarea'), value: 'test text' },
    voiceSelect: { ...createMockElement('select'), value: 'test-voice' },
    outputPath: { ...createMockElement('input'), value: '/test/path.wav' },
    speakButton: { ...createMockElement('button'), disabled: false },
    streamButton: { ...createMockElement('button'), disabled: false },
    previewBtn: { ...createMockElement('button'), disabled: false },
    status: { ...createMockElement('div'), textContent: '' },
    progressBar: { ...createMockElement('div'), style: { width: '0%' } },
    progressText: { ...createMockElement('div'), textContent: '' },
    progressContainer: { ...createMockElement('div'), style: { display: 'none' } },
    durationEstimate: { ...createMockElement('div'), textContent: '' },
    audioPlayer: { ...createMockElement('audio'), src: '', currentTime: 0, duration: 100 },
    audioControls: { ...createMockElement('div'), style: { display: 'none' } },
    cancelStreamButton: { ...createMockElement('button'), style: { display: 'none' } },
    textDropZone: { ...createMockElement('div'), style: { borderColor: '#aaa' } },
  };

  return mockElements[id] || createMockElement('div');
});

// Mock alert for tests that need it
global.alert = jest.fn();

// Mock console methods to avoid noise in tests
global.console.warn = jest.fn();
global.console.error = jest.fn();

// Mock confirm dialog
global.confirm = jest.fn(() => true);
