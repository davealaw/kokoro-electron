# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.2] - 2025-09-04

### 🔐 Security Fixes

#### Insecure Temporary File Creation
- **Fixed**: Replaced predictable temporary file names with cryptographically secure UUIDs
- **Impact**: Prevents race conditions, symlink attacks, and information disclosure
- **Files**: `main.js` - All temporary file creation now uses `crypto.randomUUID()`
- **Scope**: Voice preview files, streaming chunks, and final audio merge operations

#### XSS Vulnerability in Debug Interface
- **Fixed**: Replaced unsafe `innerHTML` with secure DOM manipulation methods
- **Impact**: Prevents script injection in debug logging interface
- **Files**: `scripts/debug.js` - Uses `textContent` and `createElement()` instead of `innerHTML`
- **Details**: DOM-based XSS prevention in development debug tools

#### Dead Code Removal
- **Fixed**: Removed unused `cancelSpeak` functionality and `currentProcess` variable
- **Impact**: Eliminates "useless conditional" security warning and reduces attack surface
- **Files**: `main.js`, `preload.js`, `scripts/dom.js`, `scripts/states.js`
- **Details**: Cleaned up legacy code from previous TTS implementation

### 🐛 Bug Fixes

#### Critical TTS Audio Dropping Issue
- **Fixed**: Semicolons in text were causing TTS engine to drop entire paragraphs
- **Root Cause**: TTS engine fails to process text chunks containing semicolons
- **Solution**: Added text normalization to convert semicolons (`;`) to commas (`,`)
- **Impact**: Fixes missing audio segments in long text processing
- **Example**: "Tom Sawyer; but that ain't no matter" now processes correctly
- **Files**: `scripts/text-utils.js` - New `normalizeForTTS()` function

#### Text Processing Improvements
- **Enhanced**: Text splitting algorithm to prevent empty chunk generation
- **Fixed**: Unicode character handling for smart quotes, em-dashes, and special spaces
- **Improved**: Error handling for edge cases in multi-chunk processing
- **Added**: Comprehensive input validation and sanitization

### 🧹 Code Quality

#### Test Coverage Improvements
- **Added**: 5 new tests specifically for bug fix coverage
- **Added**: Regression test for semicolon handling ("Tom Sawyer bug")
- **Added**: Complete `normalizeForTTS` function test suite
- **Coverage**: Increased from 250 to 255 total tests
- **Focus**: Prevents future regression of critical TTS processing bugs

#### Code Cleanup
- **Removed**: All dead code and unused imports
- **Fixed**: All ESLint violations and code style issues
- **Improved**: Code documentation and inline comments
- **Standardized**: Function naming and error handling patterns

### 🔧 Technical Details

#### Text Normalization Pipeline
```javascript
// New normalization prevents TTS engine failures
function normalizeForTTS(text) {
  return text
    .replace(/[\u2018\u2019\u02BC]/g, "'")  // Smart quotes → regular quotes
    .replace(/[\u2014\u2013]/g, '-')        // Em/en-dashes → hyphens
    .replace(/;/g, ',')                    // Semicolons → commas (key fix)
    .replace(/\s+/g, ' ')                  // Normalize whitespace
    .trim();
}
```

#### Security Enhancements
- **Crypto-secure UUIDs**: All temporary files now use `crypto.randomUUID()`
- **Safe DOM manipulation**: XSS-safe methods throughout debug interface  
- **Input sanitization**: Text normalization prevents processing failures
- **Dead code elimination**: Reduced attack surface and complexity

### ⚠️ Breaking Changes

**None** - This is a patch release with backward-compatible fixes only.

### 🧪 Validation

- **✅ All 255 tests passing**
- **✅ All ESLint rules satisfied** 
- **✅ Security issues resolved**
- **✅ Original bug scenario fixed**
- **✅ No functional regressions**

---

## [1.0.0] - 2025-09-03

### 🎉 Initial Release

This is the first stable release of Kokoro TTS GUI - a user-friendly Electron-based interface for local neural text-to-speech synthesis.

### ✨ Added

#### Core Features
- **Neural TTS Integration**: High-quality text-to-speech using [kokoro-js](https://github.com/davealaw/kokoro-js) engine
- **Multiple Voice Models**: Access to various neural voice models with different characteristics
- **Real-time Voice Preview**: Preview voices before synthesis with sample text
- **Dual Synthesis Modes**: 
  - Standard mode for complete text processing
  - Streaming mode for real-time chunk-by-chunk synthesis
- **Built-in Audio Player**: Play/pause/stop/resume controls with seek functionality

#### Text Input & File Handling
- **Rich Text Input**: Large text area with real-time word/character counting
- **File Loading Support**: Load text from multiple formats (.txt, .md, .html, .js, .json, .xml, .csv, .log)
- **Drag & Drop**: Intuitive file dropping directly onto text area
- **File Validation**: Automatic content validation and size checking
- **Smart File Detection**: Content-based text file recognition

#### User Experience
- **Persistent Settings**: Auto-save text content, voice selection, and output paths
- **Progress Tracking**: Real-time progress bars with duration estimates
- **Cancellation Support**: Cancel synthesis or streaming operations mid-process
- **Keyboard Shortcuts**: Power user shortcuts for common operations
- **Reset Functionality**: One-click restore to default settings
- **Error Recovery**: Comprehensive error handling with user-friendly messages

#### Output & Audio Management
- **Custom Output Paths**: Choose any location and filename for WAV output
- **Default Smart Naming**: Automatic output to Documents folder with sensible defaults
- **Audio Format**: High-quality WAV format output
- **Path Persistence**: Remember output locations between sessions

#### Technical Features
- **External Model Caching**: Models stored in system cache directory (~/.cache/kokoro-electron/)
- **First-run Setup**: Automatic model download with progress feedback
- **Cross-platform Support**: macOS, Windows, and Linux compatibility
- **Modular Architecture**: ES6 module-based frontend architecture
- **IPC Security**: Secure communication between main and renderer processes

### 🏗️ Architecture

#### Frontend Architecture (Renderer Process)
- **`scripts/dom.js`**: Main DOM controller and event orchestration
- **`scripts/tts.js`**: TTS operations and UI state management
- **`scripts/audio.js`**: Audio player controls and media handling
- **`scripts/settings.js`**: Voice loading and settings UI management
- **`scripts/states.js`**: Application state management and persistence
- **`scripts/dragdrop.js`**: File drag-and-drop handling
- **`scripts/utils.js`**: Common utility functions
- **`scripts/debug.js`**: Development debugging tools

#### Extracted Utility Modules
- **`scripts/file-utils.js`**: File validation and text processing utilities
- **`scripts/text-utils.js`**: Text chunking and manipulation functions
- **`scripts/audio-utils.js`**: WAV buffer operations and audio processing
- **`scripts/tts-manager.js`**: TTS engine lifecycle and model management
- **`scripts/settings-manager.js`**: Settings persistence and configuration

#### Backend (Main Process)
- **`main.js`**: Electron main process with IPC handlers and system integration
- **`preload.js`**: Secure IPC bridge with contextIsolation
- **Model Management**: External cache directory handling
- **File System**: Secure file I/O operations

### 🛠️ Development Infrastructure

#### Testing Suite
- **258+ Unit Tests**: Comprehensive test coverage across all modules
- **Integration Tests**: End-to-end functionality testing
- **64%+ Code Coverage**: High-quality code coverage with detailed reporting
- **Mock Systems**: Comprehensive Electron API and DOM mocking
- **Test Categories**: Unit tests, integration tests, and module-specific testing

#### Code Quality Tools
- **ESLint**: Modern ES6+ linting with Jest and Node.js plugins
- **Prettier**: Consistent code formatting across all file types
- **Husky**: Git hooks for quality assurance
- **Lint-staged**: Efficient pre-commit checks on changed files only
- **Babel**: Modern JavaScript transformation for testing

#### Build System
- **electron-builder**: Multi-platform application packaging
- **Platform Targets**:
  - **macOS**: DMG and ZIP distributions (Intel + Apple Silicon)
  - **Windows**: NSIS installer and ZIP archives (x64 + x86)
  - **Linux**: AppImage and DEB packages (x64)
- **Asset Management**: Platform-specific icons and resources
- **Distribution Ready**: Code signing configuration and auto-updater support

### 🐛 Fixed

#### Packaging Issues
- **ASAR Archive Problems**: Resolved TTS model loading failures in packaged applications
- **Cache Directory Access**: Fixed model caching in read-only archive environments
- **Environment Variables**: Proper transformers cache configuration
- **Model Persistence**: Reliable external cache directory usage

#### Testing Stability
- **Mock Consistency**: Fixed DOM element mocking across test suites
- **IPC Mocking**: Complete Electron API mock coverage
- **Test Isolation**: Proper test state cleanup and module isolation
- **Coverage Accuracy**: Reliable test coverage reporting

### 🔧 Technical Details

#### Dependencies
- **Core Runtime**:
  - `electron`: ^36.4.0 - Desktop application framework
  - `kokoro-js`: ^1.2.1 - Neural TTS engine
  - `electron-store`: ^10.1.0 - Settings persistence
  - `p-limit`: ^6.2.0 - Concurrency control
  
- **Development & Testing**:
  - `jest`: ^30.1.3 - Testing framework
  - `eslint`: ^9.34.0 - Code quality linting
  - `prettier`: ^3.6.2 - Code formatting
  - `electron-builder`: ^26.0.12 - Application packaging
  - `husky`: ^9.1.7 - Git hooks

#### System Requirements
- **Node.js**: 18.0.0 or higher
- **RAM**: 2GB minimum, 4GB recommended
- **Storage**: 500MB free space (including model cache)
- **OS**: macOS 10.14+, Windows 10+, or modern Linux distribution

#### Performance Optimizations
- **Concurrent Processing**: Parallel TTS operations with configurable limits
- **Streaming Architecture**: Real-time audio chunk processing
- **Memory Management**: Efficient buffer handling and cleanup
- **Cache Strategy**: Persistent model storage with smart invalidation

### 🔐 Security

#### Process Isolation
- **Context Isolation**: Secure renderer process with limited Node.js access
- **Preload Security**: Minimal API surface exposed to frontend
- **IPC Validation**: Input validation on all inter-process communication
- **File System**: Restricted file access with user permission prompts

#### Data Privacy
- **Local Processing**: All TTS operations happen locally
- **No Network Calls**: No data sent to external services after model download
- **User Data**: Settings stored locally with user control
- **Model Caching**: External cache directory with user-accessible location

### 📚 Documentation

- **README.md**: Comprehensive user and developer documentation
- **Code Comments**: Extensive inline documentation
- **API Documentation**: IPC interface and module documentation
- **Architecture Guide**: Detailed system design and component interaction
- **Development Setup**: Complete development environment instructions

### 🌟 Highlights

This initial release represents a complete, production-ready text-to-speech application with:

- **Professional Quality**: Comprehensive testing, code quality tools, and documentation
- **User-Friendly Design**: Intuitive interface with drag-and-drop, progress tracking, and error recovery
- **Developer-Friendly**: Clean architecture, extensive testing, and contribution guidelines
- **Cross-Platform**: Native builds for macOS, Windows, and Linux
- **Performance**: Optimized for both small snippets and large document processing
- **Privacy**: Completely local processing with no external dependencies after setup

---

## Release Notes

### 🎯 What's Next

Future releases may include:
- Additional voice model support
- Internationalization (i18n) for multiple languages
- Plugin system for custom TTS engines
- Advanced audio processing features
- Batch processing capabilities
- Cloud model synchronization options

### 🤝 Contributing

This project welcomes contributions! See [README.md](README.md#contributing) for development setup and contribution guidelines.

### 🔗 Links

- **Repository**: https://github.com/davealaw/kokoro-electron
- **Issues**: https://github.com/davealaw/kokoro-electron/issues
- **Releases**: https://github.com/davealaw/kokoro-electron/releases
- **kokoro-js**: https://github.com/davealaw/kokoro-js

---

*This changelog follows the [Keep a Changelog](https://keepachangelog.com/) format.*
