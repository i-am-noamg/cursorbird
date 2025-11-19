# Cursor Bird 🐦

<div align="center">

[![GitHub Release](https://img.shields.io/github/v/release/i-am-noamg/cursorbird?style=for-the-badge&logo=github)](https://github.com/i-am-noamg/cursorbird/releases)
[![Downloads](https://img.shields.io/github/downloads/i-am-noamg/cursorbird/total?style=for-the-badge&logo=github)](https://github.com/i-am-noamg/cursorbird/releases)
[![Stars](https://img.shields.io/github/stars/i-am-noamg/cursorbird?style=for-the-badge&logo=github)](https://github.com/i-am-noamg/cursorbird)
[![License](https://img.shields.io/github/license/i-am-noamg/cursorbird?style=for-the-badge)](LICENSE)

**Play Cursor Bird while Cursor AI agents are working!** 🎮

The ultimate productivity hack: Stay entertained while your AI agents get sh!t done.

[🚀 Download Latest Release](https://github.com/i-am-noamg/cursorbird/releases/latest) • [📖 Documentation](#features) • [🐛 Report Bug](https://github.com/i-am-noamg/cursorbird/issues) • [💡 Request Feature](https://github.com/i-am-noamg/cursorbird/issues)

---

Like, Share & Subscribe -->

<a href="https://www.buymeacoffee.com/noamgal" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&emoji=☕&slug=noamgal&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="Buy Me A Coffee" style="height: 30px !important; width: auto !important; max-width: 150px !important;" /></a>

</div>

---

## 🎬 Demo

![Cursor Bird Demo](https://github.com/i-am-noamg/cursorbird/raw/HEAD/images/demo.gif)

## 🎯 What is This?

Play **Cursor Bird** while Cursor agents are running. The game automatically opens in a paused state when an agent starts and closes when all agents finish. **Tab to flap** and keep yourself entertained instead of doomscrolling on your phone, only to realize your agent finished 30 minutes ago.

## ✨ Features

- 100% vibe coded
- Tab to flap
- Automatically opens when agents start; closes when all agents finish
- Uses Cursor Hooks to automatically detect agent lifecycle
- Workspace-specific best scores

## ⚡ Quick Start

### Installation

**Method 1: From Extensions Panel**
1. Open Cursor
2. Go to Extensions (Cmd/Ctrl+Shift+X)
3. Search for "Cursor Bird"
4. Click Install
5. Restart Cursor

**Method 2: Manual Installation**
1. Download the `.vsix` file from [GitHub Releases](https://github.com/i-am-noamg/cursorbird/releases/latest)
2. In Cursor, press Cmd/Ctrl+Shift+P
3. Type "Install from VSIX"
4. Select the downloaded file
5. Restart Cursor

### Usage

Once installed:
1. **Start an AI agent** – the game opens automatically in a paused state! 🎮
2. **Press Tab** to start playing (or configure a different key in settings)
3. The game closes automatically when your agent finishes

That's it! The extension automatically sets up everything you need.

## Requirements

- **Node.js** must be installed and available in your PATH (required for hook scripts to run)

## Setup

The extension will automatically configure Cursor Hooks globally during installation. **Important: You must restart Cursor after hooks are configured for them to take effect.**

### Automatic Setup (Global Hooks)

The extension automatically:
1. **Generates hook scripts** (stored in extension directory or `~/.cursor/cursor-bird-hooks/` if extension dir is read-only)
2. **Configures hooks globally** in `~/.cursor/hooks.json` (or `%USERPROFILE%\.cursor\hooks.json` on Windows)

The hook scripts are **workspace-aware** - they automatically detect which workspace they're running in and track agents separately for each workspace.

If you prefer workspace-specific hooks instead, see the [Manual Workspace-Specific Setup](#manual-workspace-specific-setup) section below.

### Manual Workspace-Specific Setup

If you prefer to set up hooks on a per-workspace basis instead of globally, follow these steps:

1. **Create or edit `.cursor/hooks.json` in your workspace:**

```json
{
  "version": 1,
  "hooks": {
    "beforeSubmitPrompt": [
      {
        "command": "/path/to/extension/dist/hook/hook.sh"
      }
    ],
    "stop": [
      {
        "command": "/path/to/extension/dist/hook/hook-stop.sh"
      }
    ]
  }
}
```

**On Windows**, use `hook.bat` and `hook-stop.bat` instead of `.sh` files.

2. **Find the extension path:**
   - Open Command Palette (Cmd/Ctrl+Shift+P)
   - Run "Extensions: Show Installed Extensions"
   - Find "Cursor Bird" and note the extension path
   - Or check: `~/.vscode/extensions/` (or `%USERPROFILE%\.vscode\extensions\` on Windows)
   - Hook scripts are typically at: `/path/to/extension/dist/hook/`

3. **Make scripts executable** (Unix/Mac only):
   ```bash
   chmod +x /path/to/extension/dist/hook/hook.sh
   chmod +x /path/to/extension/dist/hook/hook-stop.sh
   ```

4. **Restart Cursor** for hooks to take effect.

**Note:** 
- The hook scripts require **Node.js** to be available in your PATH
- The hook scripts are workspace-aware and will track agents separately for each workspace
- You'll need to repeat this setup for each workspace where you want the game enabled
- Add `.cursor/` to your `.gitignore` to avoid committing these files

## Commands
- **Cursor Bird: Toggle** - Manually toggle the game
- **Cursor Bird: Start** - Manually start the game
- **Cursor Bird: Stop** - Manually stop the game
- **Cursor Bird: Reset Best Score** - Reset the best score for the current workspace
- **Cursor Bird: Setup Hooks** - Manually configure global Cursor Hooks (in `~/.cursor/hooks.json`)
- **Cursor Bird: Configure Game Settings** - Open extension settings

## Configuration

The extension supports extensive customization via Cursor settings:
- **Physics**: Gravity, flap velocity, pipe speed, spawn intervals
- **Visual**: Colors, bird size, pipe dimensions
- **Behavior**: Auto-show on agent start, polling interval, webview position
- **Controls**: Flap key (Tab, Space, Enter, or ArrowUp)

Access settings via the command palette or search for "Cursor Bird" in Cursor settings.

## What the Extension Creates

During installation and use, the extension creates the following files:

### Hook Scripts (Persistent)
Located in either:
- Extension directory: `{extension}/dist/hook/` (preferred)
- OR user directory: `~/.cursor/cursor-bird-hooks/` (fallback if extension dir is read-only)

Files created:
- `hook.sh` / `hook.bat` - Start hook wrapper script
- `hook-stop.sh` / `hook-stop.bat` - Stop hook wrapper script  
- `hook-node.js` - Node.js logic for detecting agent start
- `hook-stop-node.js` - Node.js logic for detecting agent stop

### Hook Configuration (Persistent)
- Global: `~/.cursor/hooks.json` - Hook entries added to this file
- Workspace (optional): `{workspace}/.cursor/hooks.json` - Only if you manually set up workspace-specific hooks

### Status Files (Temporary)
Created during runtime, cleaned up on disable:
- Workspace: `{workspace}/.cursor/cursor-bird-status.json` (+ `.tmp` file)

### Best Scores
- Stored in Cursor's workspace state (one per workspace)
- Can be reset with "Reset Best Score" command

## Disabling vs. Uninstalling

### When You **Disable** the Extension

The extension automatically cleans up runtime state:
- ✅ Removes workspace status tracking files (`{workspace}/.cursor/cursor-bird-status.json`)
- ✅ Removes temporary files (`.tmp` variants)
- ❌ Leaves hook scripts in place (so they work when you re-enable)
- ❌ Leaves hook entries in `hooks.json` (so they work when you re-enable)

**Result:** You can re-enable the extension and it will work immediately without reconfiguration.

### When You **Uninstall** the Extension

The extension performs complete cleanup:
- ✅ Removes all hook scripts from `~/.cursor/cursor-bird-hooks/` (if scripts were stored in user directory)
- ✅ Removes the hook scripts directory itself
- ✅ Removes hook entries from `~/.cursor/hooks.json` (global hooks file)
- ✅ Removes hook entries from `{workspace}/.cursor/hooks.json` (workspace hooks file, if present)
- ✅ Removes any remaining status tracking files (fallback cleanup)
- ✅ Cursor automatically removes:
  - Extension directory (including any hook scripts in `{extension}/dist/hook/`)
  - Best score storage for all workspaces

**Note:** The uninstall cleanup happens automatically via Cursor's `vscode:uninstall` hook. You may need to restart Cursor to see the cleanup complete. This is a Cursor platform requirement.

**Result:** All traces of the extension are completely removed from your system - no manual cleanup needed!

## How It Works

The extension uses Cursor's Hooks system to detect when agents start and stop:
- When an agent is about to start, the `beforeSubmitPrompt` hook triggers and writes to a status file
- The extension watches this status file and opens the game in a paused state (if `autoShow` is enabled)
- When an agent stops, the `stop` hook triggers and decrements the agent count
- The game closes when the agent count reaches zero
- Multiple agents are tracked - the game stays open until all agents finish

**Note:** For multi-root workspaces, only the first workspace folder is tracked. This is a limitation of the current implementation.

## Multiple Windows Behavior

### Different Workspaces
When you have multiple Cursor windows open with **different workspaces**, each workspace maintains:
- Its own **independent best score** (stored per-workspace in Cursor's workspace state)
- Its own **independent agent tracking** (via `.cursor/cursor-bird-status.json` in each workspace)
- **No interference** - agents in workspace A don't affect workspace B

**Hook Setup**: With global hooks (default), all workspaces automatically work with the same hooks while maintaining separate agent tracking for each.

### Same Workspace
When you have multiple Cursor windows open with the **same workspace**:
- **Best score is shared** across all windows (since they're the same workspace)
- **Agent tracking is shared** - when an agent starts in one window, the game will open in all windows of that workspace

This is a limitation of Cursor's Hooks system, which operates at the workspace level rather than the window level. Hooks cannot distinguish which specific window triggered an agent, so all windows react to agent events in the shared workspace.

### Hook Script Behavior

The hook scripts are **workspace-aware** - they automatically detect which workspace they're running in (via current working directory or JSON input) and track agents separately for each workspace. A single set of hook scripts can be used globally and will correctly track agents separately for each workspace.

## Frequently Asked Questions

### Do I need to set up hooks for each workspace?

**No!** The extension automatically configures **global hooks** in `~/.cursor/hooks.json` during installation. These hooks work across all workspaces automatically, while still tracking agents separately for each workspace.

If you prefer workspace-specific hooks instead, you can manually set them up following the [Manual Workspace-Specific Setup](#manual-workspace-specific-setup) instructions. In that case, yes, you'll need to set them up in each workspace where you want the game.

### What files does the extension create in my workspace?

For a complete list of all files created, see the [What the Extension Creates](#what-the-extension-creates) section above.

Within your workspace directory specifically, the extension creates:
- `.cursor/cursor-bird-status.json` - Temporary status file for tracking active agents (automatically cleaned up when you disable the extension)
- `.cursor/cursor-bird-status.json.tmp` - Temporary file used for atomic writes (also cleaned up on disable)
- `.cursor/hooks.json` - Hook configuration (only if you manually set up workspace-specific hooks instead of using global hooks)

**Important**: You should add `.cursor/` to your `.gitignore` to avoid committing these files:

```gitignore
.cursor/
```

All workspace files are automatically cleaned up when you disable or uninstall the extension.

### How do I switch from global hooks to workspace-specific hooks?

1. Remove the global hooks by deleting or editing `~/.cursor/hooks.json`
2. Follow the [Manual Workspace-Specific Setup](#manual-workspace-specific-setup) instructions for each workspace
3. Restart Cursor

### Can I disable the game for specific workspaces?

Yes! You have two options:

1. **Disable auto-show**: Set `cursorBird.behavior.autoShow` to `false` in workspace settings. The game won't automatically open, but you can still start it manually.

2. **Override hooks**: Create an empty `.cursor/hooks.json` in that workspace:
   ```json
   {
     "version": 1,
     "hooks": {}
   }
   ```
   Cursor will use the workspace hooks (empty) instead of the global ones for that workspace.

---

## 🤝 Contributing

Contributions are welcome! Whether it's bug reports, feature requests, or code contributions – all are appreciated.

### How to Contribute

1. **Report bugs or suggest features** via [GitHub Issues](https://github.com/i-am-noamg/cursorbird/issues)
2. **Submit pull requests** – see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines
3. **Star the repo** ⭐ if you find it useful!
4. **Share it** with fellow Cursor users

### Development Setup

```bash
# Clone the repository
git clone https://github.com/i-am-noamg/cursorbird.git
cd cursorbird

# Install dependencies
npm install

# Build and watch for changes
npm run watch

# Package the extension
npm run package
```

For detailed contribution guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md).

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## ☕ Support

If you enjoy this extension, consider:
- ⭐ **Starring the repo** on GitHub
- 💬 **Sharing it** with fellow Cursor users
- ☕ [**Buy Me a Coffee**](https://buymeacoffee.com/noamgal)
- 🐦 **Sharing on social media** with #Cursor #CursorBird

---

<div align="center">

**Made with ❤️ for the Cursor community**

[GitHub](https://github.com/i-am-noamg/cursorbird) • [Download](https://github.com/i-am-noamg/cursorbird/releases) • [Issues](https://github.com/i-am-noamg/cursorbird/issues)

</div>


