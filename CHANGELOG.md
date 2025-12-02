# Changelog

All notable changes to the "Cursor Bird" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2025-12-02

### Changed
- Improved agent tracking to be more git-friendly by not leaving empty status files

## [1.0.0] - 2025-11-30

### Changed
- Official release

## [0.0.4] - 2025-11-30

### Fixed
- Fixed broken image in README.md - replaced external image URL with local image file

## [0.0.3] - 2025-11-28

### Added
- `Cursor Bird: Toggle Auto-Show` command - Quickly toggle the auto-show behavior from the command palette

### Fixed
- Frame-rate independence: Game now runs at consistent speed across different display refresh rates (60Hz, 120Hz, etc.)
- Fixed issue where extension would show popup messages when no workspace was open
- Improved uninstall cleanup: Better detection and removal of hook entries from global hooks.json

### Changed
- Improved hook management and error handling
- Enhanced uninstall script to more reliably clean up hook entries

## [0.0.2] - 2025-11-20

### Added
- Max vertical reach calculation for improved pipe spawning logic
- Biased random generation for pipe gap positioning to improve gameplay experience
- Discrete Euler physics for flap distance calculations, improving accuracy in vertical movement dynamics

### Changed
- Pipe spawning now positions pipes closer to the player for better experience on wide screens

## [0.0.1] - 2025-11-15

### 🎉 Initial Release

**⚠️ Cursor Only** - This extension requires [Cursor](https://cursor.com) and uses Cursor Hooks. It will not work in VS Code or other editors.

#### Added
- **Core Game Features**
  - Cursor Bird game automatically opens when Cursor AI agents start
  - Game opens in paused state, press TAB (or configured key) to start
  - Automatically closes when all agents finish
  - Workspace-specific best score tracking
  - Support for multiple parallel agents

- **Cursor Hooks Integration**
  - Automatic global hooks setup during installation
  - Workspace-aware hook scripts that track agents per workspace
  - `beforeSubmitPrompt` hook for detecting agent start
  - `stop` hook for detecting agent completion
  - Automatic cleanup on disable/uninstall

- **Customization & Configuration**
  - Extensive physics customization (gravity, flap velocity, pipe speed)
  - Visual customization (colors, sizes, fonts)
  - Configurable controls (Tab, Space, Enter, or ArrowUp)
  - Configurable webview position
  - Auto-show behavior toggle

- **Commands**
  - `Cursor Bird: Toggle` - Manually toggle the game
  - `Cursor Bird: Start` - Manually start the game
  - `Cursor Bird: Stop` - Manually stop the game
  - `Cursor Bird: Reset Best Score` - Reset workspace best score
  - `Cursor Bird: Setup Hooks` - Manually configure hooks
  - `Cursor Bird: Configure Game Settings` - Open settings

- **Quality of Life**
  - Automatic status file cleanup on disable
  - Complete uninstall cleanup (hooks, scripts, status files)
  - Support for multiple workspaces with independent tracking
  - Fallback to user directory if extension directory is read-only
  - Cross-platform support (Windows, macOS, Linux)

#### Technical Details
- Built with TypeScript
- Uses Cursor Webview API for game rendering
- File system watcher for status file polling
- Atomic file writes for reliable status tracking
- Platform-specific hook scripts (`.sh` for Unix, `.bat` for Windows)

### Known Issues
- Multi-root workspaces only track the first workspace folder
- Multiple windows of the same workspace share agent tracking (Cursor limitation)

---

## Version History Summary

- **1.0.1** (2025-12-02) - Delete status file when done, cleaned up dead code
- **1.0.0** (2025-11-30) - Official release
- **0.0.4** (2025-11-30) - Fixed broken image in README
- **0.0.3** (2025-11-28) - Fixed frame-rate independence, added Toggle Auto-Show command, improved hook management and uninstall cleanup
- **0.0.2** (2025-11-20) - Improved gameplay mechanics, physics accuracy, and pipe spawning logic
- **0.0.1** (2025-11-15) - Initial release with core game and Cursor Hooks integration

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to contribute to this project.

## Support

Found a bug or have a feature request? [Open an issue](https://github.com/i-am-noamg/cursorbird/issues)!

