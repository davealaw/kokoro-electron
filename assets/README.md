# Assets Directory

This directory contains static assets for the Kokoro TTS GUI project.

## Structure

- **`screenshots/`** - Application screenshots for documentation
  - `main-interface.png` - Main application interface screenshot used in README.md
- **`icon.icns`** - macOS application icon
- **`icon.ico`** - Windows application icon
- **`icon.png`** - Linux application icon / source icon

## Screenshot Guidelines

When adding new screenshots:

1. **Resolution**: Use consistent resolution (recommended: 1200x800 or higher)
2. **Format**: Use PNG format for crisp UI screenshots
3. **Content**: Show representative app functionality
4. **Size**: Keep file sizes reasonable (<1MB when possible)
5. **Naming**: Use descriptive filenames (e.g., `voice-selection.png`, `settings-dialog.png`)

## Icon Guidelines

- **Format**: Maintain all three formats for cross-platform compatibility
- **Resolution**: Icons should be high-resolution (512x512 minimum for source)
- **Style**: Consistent with application branding and platform guidelines

## Usage in Documentation

Reference screenshots in markdown using relative paths:

```markdown
![Description](assets/screenshots/filename.png)
```

## File Optimization

- Optimize PNG files for web display while maintaining quality
- Consider using tools like `imageoptim` or `tinypng` for size reduction
- Ensure screenshots show the application in its best light
