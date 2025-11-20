# Changelog

All notable changes to the "Cursor Bird" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned Features
- Leaderboard system for high scores
- Additional game themes and visual customization
- Sound effects and music (optional, with volume control)
- Multiplayer mode for comparing scores with teammates
- Achievement system

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

- **0.0.2** (2025-11-20) - Improved gameplay mechanics, physics accuracy, and pipe spawning logic
- **0.0.1** (2025-11-15) - Initial release with core game and Cursor Hooks integration

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to contribute to this project.

## Support

Found a bug or have a feature request? [Open an issue](https://github.com/i-am-noamg/cursorbird/issues)!

