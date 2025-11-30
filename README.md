# Cursor Bird 🐦

<div align="center">

[![GitHub Release](https://img.shields.io/github/v/release/i-am-noamg/cursorbird?style=for-the-badge&logo=github)](https://github.com/i-am-noamg/cursorbird/releases)
[![Stars](https://img.shields.io/github/stars/i-am-noamg/cursorbird?style=for-the-badge&logo=github)](https://github.com/i-am-noamg/cursorbird)
[![License](https://img.shields.io/github/license/i-am-noamg/cursorbird?style=for-the-badge)](LICENSE)

**Play Cursor Bird while Cursor AI agents are working!** 🎮

The ultimate productivity hack: Stay entertained while your AI agents get sh!t done.

[📖 Documentation](#features) • [🐛 Report Bug](https://github.com/i-am-noamg/cursorbird/issues) • [💡 Request Feature](https://github.com/i-am-noamg/cursorbird/issues)

<a href="https://www.buymeacoffee.com/noamgal" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&emoji=☕&slug=noamgal&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="Buy Me A Coffee" style="height: 30px !important; width: auto !important; max-width: 150px !important;" /></a>

---

Available in Cursor's built-in Extension search!

![Cursor Extension Search](https://github.com/i-am-noamg/cursorbird/raw/HEAD/images/search.png)

</div>

---

## 🎬 Demo

![Cursor Bird Demo](https://github.com/i-am-noamg/cursorbird/raw/HEAD/images/demo.gif)

## 🎯 What is This?

Play **Cursor Bird** while Cursor agents are running. The game automatically opens when an agent starts and closes when all agents finish. **Tab to flap** and keep yourself entertained instead of doomscrolling on your phone, only to realize your agent finished 30 minutes ago.

## ✨ Features

- 100% vibe coded
- Tab to flap
- Open source
- Automatically opens when agents start; closes when all agents finish
- Uses Cursor Hooks to automatically detect agent lifecycle
- Workspace-specific best scores
- Much better than doomscrolling
- 100% not YC funded

## ⚡ Quick Start

### Installation

**From Cursor's Extension Search** (Recommended)
1. Open Cursor
2. Go to Extensions (Cmd/Ctrl+Shift+X)
3. Search for "Cursor Bird"
4. Click Install
5. Restart Cursor

**Manual Installation**
1. Download the `.vsix` file from [GitHub Releases](https://github.com/i-am-noamg/cursorbird/releases/latest)
2. In Cursor, press Cmd/Ctrl+Shift+P → "Install from VSIX" → Select the file
3. Restart Cursor

**Note:** Add `.cursor/` to your `.gitignore` to avoid committing status files.

### Usage

Once installed:
1. **Start an AI agent** – the game opens automatically in a paused state! 🎮
2. **Press Tab** to start playing (or configure a different key in settings)
3. The game closes automatically when your agent finishes

That's it! The extension automatically sets up everything you need.

## ⚠️ Requirements

**Node.js** must be installed and available in your PATH. Verify with `node --version`. If missing, the game won't auto-open (manual commands still work).

## Commands & Configuration

**Commands:**
- **Cursor Bird: Toggle** - Manually toggle the game
- **Cursor Bird: Start** - Manually start the game
- **Cursor Bird: Stop** - Manually stop the game
- **Cursor Bird: Toggle Auto-Show** - Toggle automatic game opening when agents start
- **Cursor Bird: Reset Best Score** - Reset the best score for the current workspace
- **Cursor Bird: Setup Hooks** - Manually configure global Cursor Hooks (in `~/.cursor/hooks.json`)
- **Cursor Bird: Configure Game Settings** - Open extension settings

**Settings:** Customize physics, visuals, behavior, and controls via Cursor settings. Search for "Cursor Bird" in settings or use the command palette.

## Frequently Asked Questions

### Do I need to set up hooks for each workspace?

No! The extension automatically configures global hooks during installation. They work across all workspaces automatically.

### What files does the extension create?

The extension creates temporary status files in `.cursor/` within your workspace. These are automatically cleaned up when you disable or uninstall the extension. Add `.cursor/` to your `.gitignore` to avoid committing them.

---

## 🤝 Contributing

Contributions are welcome! Report bugs, suggest features, or submit pull requests via [GitHub Issues](https://github.com/i-am-noamg/cursorbird/issues). See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

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


