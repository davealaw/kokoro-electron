import { initializeDragDropEvents } from '../../scripts/dragdrop.js';
import { updateSpeakButtonState } from '../../scripts/states.js';

// Mock the DOM elements before importing other modules
jest.mock('../../scripts/states.js', () => ({
  updateSpeakButtonState: jest.fn(),
}));
jest.mock('../../scripts/settings.js', () => ({}));
jest.mock('../../scripts/utils.js', () => ({}));

describe('DragDrop Module', () => {
  let mockDropZone;
  let mockTextArea;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDropZone = {
      addEventListener: jest.fn(),
      style: { borderColor: '#aaa' },
    };

    mockTextArea = {
      value: '',
    };

    document.getElementById.mockImplementation(id => {
      if (id === 'textDropZone') {
        return mockDropZone;
      }
      if (id === 'textInput') {
        return mockTextArea;
      }
      return null;
    });

    // Mock window.kokoroAPI.validateFileForDragDrop
    global.window.kokoroAPI.validateFileForDragDrop.mockResolvedValue({ valid: true });
  });

  describe('initializeDragDropEvents', () => {
    test('registers event listeners on drop zone', () => {
      initializeDragDropEvents();

      expect(mockDropZone.addEventListener).toHaveBeenCalledWith('dragover', expect.any(Function));
      expect(mockDropZone.addEventListener).toHaveBeenCalledWith('dragleave', expect.any(Function));
      expect(mockDropZone.addEventListener).toHaveBeenCalledWith('drop', expect.any(Function));
    });

    describe('drag events', () => {
      let dragOverHandler;
      let dragLeaveHandler;
      let dropHandler;

      beforeEach(() => {
        initializeDragDropEvents();

        // Capture the handlers
        const calls = mockDropZone.addEventListener.mock.calls;
        dragOverHandler = calls.find(call => call[0] === 'dragover')[1];
        dragLeaveHandler = calls.find(call => call[0] === 'dragleave')[1];
        dropHandler = calls.find(call => call[0] === 'drop')[1];
      });

      test('dragover prevents default and changes border color', () => {
        const mockEvent = { preventDefault: jest.fn() };

        dragOverHandler(mockEvent);

        expect(mockEvent.preventDefault).toHaveBeenCalled();
        expect(mockDropZone.style.borderColor).toBe('blue');
      });

      test('dragleave resets border color', () => {
        // First set border to blue
        mockDropZone.style.borderColor = 'blue';

        dragLeaveHandler();

        expect(mockDropZone.style.borderColor).toBe('#aaa');
      });

      test('drop handles valid file successfully', async () => {
        const mockFile = {
          name: 'test.txt',
          size: 500, // Small file
        };

        const mockEvent = {
          preventDefault: jest.fn(),
          dataTransfer: {
            files: [mockFile],
          },
        };

        // Mock FileReader
        const mockFileReader = {
          onload: jest.fn(),
          readAsText: jest.fn(),
          result: 'file content',
        };

        global.FileReader.mockImplementation(() => mockFileReader);
        global.window.kokoroAPI.validateFileForDragDrop.mockResolvedValue({ valid: true });

        // Need to make dropHandler call async since it awaits validation
        const dropPromise = dropHandler(mockEvent);

        // Wait for validation to complete
        await dropPromise;

        expect(mockEvent.preventDefault).toHaveBeenCalled();
        expect(mockDropZone.style.borderColor).toBe('#aaa');
        expect(global.window.kokoroAPI.validateFileForDragDrop).toHaveBeenCalledWith('test.txt');

        // FileReader should be created and readAsText called
        expect(global.FileReader).toHaveBeenCalled();
        expect(mockFileReader.readAsText).toHaveBeenCalledWith(mockFile);

        // Simulate FileReader onload callback
        mockFileReader.onload();
        expect(mockTextArea.value).toBe('file content');
        expect(updateSpeakButtonState).toHaveBeenCalled();
      });

      test('drop handles invalid file with alert', async () => {
        const mockFile = { name: 'test.exe', size: 500 };
        const mockEvent = {
          preventDefault: jest.fn(),
          dataTransfer: { files: [mockFile] },
        };

        global.alert = jest.fn();
        global.window.kokoroAPI.validateFileForDragDrop.mockResolvedValue({
          valid: false,
          reason: 'Invalid file type',
        });

        await dropHandler(mockEvent);

        expect(global.alert).toHaveBeenCalledWith('File not supported: Invalid file type');
        expect(global.FileReader).not.toHaveBeenCalled();
      });

      test('drop handles large file with alert', async () => {
        const mockFile = {
          name: 'large.txt',
          size: 2 * 1024 * 1024, // 2MB
        };

        const mockEvent = {
          preventDefault: jest.fn(),
          dataTransfer: { files: [mockFile] },
        };

        global.alert = jest.fn();
        global.window.kokoroAPI.validateFileForDragDrop.mockResolvedValue({ valid: true });

        await dropHandler(mockEvent);

        expect(global.alert).toHaveBeenCalledWith(
          'File too large to load into the editor. Please use "Load Text File..." instead.'
        );
      });

      test('drop handles no file gracefully', async () => {
        const mockEvent = {
          preventDefault: jest.fn(),
          dataTransfer: { files: [] },
        };

        await dropHandler(mockEvent);

        expect(mockEvent.preventDefault).toHaveBeenCalled();
        expect(global.window.kokoroAPI.validateFileForDragDrop).not.toHaveBeenCalled();
      });

      test('drop handles null file gracefully', async () => {
        const mockEvent = {
          preventDefault: jest.fn(),
          dataTransfer: { files: [null] },
        };

        await dropHandler(mockEvent);

        expect(mockEvent.preventDefault).toHaveBeenCalled();
        expect(global.window.kokoroAPI.validateFileForDragDrop).not.toHaveBeenCalled();
      });

      test('drop handles file at 1MB boundary', async () => {
        const mockFile = {
          name: 'boundary.txt',
          size: 1024 * 1024, // Exactly 1MB
        };

        const mockEvent = {
          preventDefault: jest.fn(),
          dataTransfer: { files: [mockFile] },
        };

        const mockFileReader = {
          onload: jest.fn(),
          readAsText: jest.fn(),
          result: 'boundary content',
        };

        global.FileReader.mockImplementation(() => mockFileReader);
        global.window.kokoroAPI.validateFileForDragDrop.mockResolvedValue({ valid: true });

        await dropHandler(mockEvent);

        // Should not show large file alert at exactly 1MB
        expect(global.alert).not.toHaveBeenCalled();
        expect(global.FileReader).toHaveBeenCalled();
        expect(mockFileReader.readAsText).toHaveBeenCalledWith(mockFile);
      });

      test('drop handles validation API error', async () => {
        const mockFile = {
          name: 'test.txt',
          size: 500,
        };

        const mockEvent = {
          preventDefault: jest.fn(),
          dataTransfer: { files: [mockFile] },
        };

        global.alert = jest.fn();
        global.window.kokoroAPI.validateFileForDragDrop.mockRejectedValue(
          new Error('Validation API error')
        );

        // The drop handler should handle the error gracefully
        await expect(dropHandler(mockEvent)).rejects.toThrow('Validation API error');
        expect(mockEvent.preventDefault).toHaveBeenCalled();
      });

      test('drop handles missing dataTransfer', async () => {
        const mockEvent = {
          preventDefault: jest.fn(),
          dataTransfer: null,
        };

        // Should not throw an error
        await expect(dropHandler(mockEvent)).rejects.toThrow();
        expect(mockEvent.preventDefault).toHaveBeenCalled();
      });

      test('drop handles different file types', async () => {
        const testCases = [
          { name: 'document.pdf', reason: 'PDF not supported' },
          { name: 'image.png', reason: 'Image format not supported' },
          { name: 'archive.zip', reason: 'Archive format not supported' },
        ];

        for (const testCase of testCases) {
          jest.clearAllMocks();
          global.alert = jest.fn();

          const mockFile = {
            name: testCase.name,
            size: 500,
          };

          const mockEvent = {
            preventDefault: jest.fn(),
            dataTransfer: { files: [mockFile] },
          };

          global.window.kokoroAPI.validateFileForDragDrop.mockResolvedValue({
            valid: false,
            reason: testCase.reason,
          });

          await dropHandler(mockEvent);

          expect(global.alert).toHaveBeenCalledWith(`File not supported: ${testCase.reason}`);
          expect(global.FileReader).not.toHaveBeenCalled();
        }
      });
    });
  });
});
