# Contributing to Cursor Bird 🐦

First off, thanks for taking the time to contribute! 🎉

This document provides guidelines for contributing to Cursor Bird. Following these guidelines helps maintain code quality and makes the review process smoother.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Features](#suggesting-features)
  - [Contributing Code](#contributing-code)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Style Guidelines](#style-guidelines)
- [Testing](#testing)
- [Community](#community)

## Code of Conduct

Be respectful, inclusive, and considerate. This is a fun project meant to bring joy to developers – let's keep it that way! 🌟

## How Can I Contribute?

### Reporting Bugs

Found a bug? Help us squash it! 🐛

**Before submitting a bug report:**
- Check the [existing issues](https://github.com/i-am-noamg/cursorbird/issues) to avoid duplicates
- Collect information about the bug (see template below)

**How to submit a good bug report:**

1. Use the [GitHub Issues](https://github.com/i-am-noamg/cursorbird/issues) page
2. Use a clear and descriptive title
3. Provide detailed steps to reproduce
4. Include the following information:
   - Cursor version
   - Extension version
   - Operating System
   - Node.js version
   - Relevant logs (from Cursor Developer Console)
   - Screenshots or GIFs if applicable

**Bug Report Template:**
```markdown
**Description**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. ...
2. ...
3. ...

**Expected Behavior**
What you expected to happen.

**Environment**
- Cursor Version: [e.g., 0.42.0]
- Extension Version: [e.g., 0.0.1]
- OS: [e.g., macOS 14.5, Windows 11, Ubuntu 22.04]
- Node.js Version: [e.g., 20.11.0]

**Additional Context**
Any other relevant information.
```

### Suggesting Features

Have an idea to make the extension better? We'd love to hear it! 💡

**Before submitting a feature request:**
- Check if it's already been suggested
- Consider if it aligns with the project's goals

**How to submit a feature request:**

1. Use the [GitHub Issues](https://github.com/i-am-noamg/cursorbird/issues) page
2. Use a clear and descriptive title prefixed with `[Feature Request]`
3. Provide a detailed description of the feature
4. Explain why this feature would be useful
5. Include mockups or examples if applicable

### Contributing Code

Ready to write some code? Awesome! 🚀

**Good first issues:**
Look for issues labeled [`good first issue`](https://github.com/i-am-noamg/cursorbird/labels/good%20first%20issue) – these are great starting points.

**What we're looking for:**
- Bug fixes
- Performance improvements
- New game features
- UI/UX enhancements
- Documentation improvements
- Test coverage improvements

## Development Setup

### Prerequisites

- **Node.js** (v18 or higher recommended)
- **npm** (v9 or higher)
- **Cursor**
- **Git**

### Setup Steps

```bash
# 1. Fork the repository on GitHub
# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/cursorbird.git
cd cursorbird

# 3. Add upstream remote
git remote add upstream https://github.com/i-am-noamg/cursorbird.git

# 4. Install dependencies
npm install

# 5. Build the extension
npm run build

# 6. Watch for changes (recommended during development)
npm run watch
```

### Testing Your Changes

1. **Open the project in Cursor**
2. **Press F5** to launch the Extension Development Host
3. **Test your changes** in the new window
4. **Check for linter errors**: `npm run lint`
5. **Run tests**: `npm test`

### Project Structure

```
cursorbird/
├── src/
│   ├── extension.ts         # Main extension entry point
│   ├── uninstall.ts         # Uninstall cleanup logic
│   └── game/                # Game files (HTML, CSS, JS)
├── dist/                    # Compiled output (auto-generated)
├── test/                    # Test files
├── scripts/                 # Build scripts
├── package.json             # Extension manifest
└── README.md                # Documentation
```

## Pull Request Process

### Before Submitting

1. **Create a new branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/bug-description
   ```

2. **Make your changes** following the [Style Guidelines](#style-guidelines)

3. **Test thoroughly**:
   - Run `npm run build` to ensure it compiles
   - Run `npm run lint` to check for issues
   - Run `npm test` to run tests
   - Test the extension manually in the Extension Development Host

4. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: add amazing new feature"
   ```
   See [Commit Message Guidelines](#commit-message-guidelines) below

5. **Update documentation** if needed (README, CHANGELOG, etc.)

6. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

### Submitting the Pull Request

1. **Go to the [original repository](https://github.com/i-am-noamg/cursorbird)**
2. **Click "New Pull Request"**
3. **Select your branch**
4. **Fill out the PR template**:
   - Clear title describing the change
   - Description of what changed and why
   - Reference any related issues (e.g., "Fixes #123")
   - Screenshots/GIFs if applicable

### PR Review Process

- A maintainer will review your PR
- They may request changes or ask questions
- Once approved, your PR will be merged! 🎉
- Your contribution will be credited in the CHANGELOG

### After Your PR is Merged

1. **Delete your branch** (optional):
   ```bash
   git branch -d feature/your-feature-name
   git push origin --delete feature/your-feature-name
   ```

2. **Update your fork**:
   ```bash
   git checkout main
   git pull upstream main
   git push origin main
   ```

## Style Guidelines

### TypeScript Code Style

- **Use TypeScript** for all new code
- **Follow existing code patterns** in the codebase
- **Use meaningful variable names** (no single-letter variables except loop counters)
- **Add comments** for complex logic
- **Use async/await** instead of raw promises when possible
- **Handle errors gracefully** with try-catch blocks

**Formatting:**
- Indentation: 2 spaces (tabs)
- Max line length: 100 characters (soft limit)
- Use semicolons
- Single quotes for strings (unless template literals are needed)

**Run the linter:**
```bash
npm run lint        # Check for issues
npm run lint:fix    # Auto-fix issues
```

### Commit Message Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) for clear commit history:

**Format:**
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Build process or auxiliary tool changes

**Examples:**
```bash
feat(game): add difficulty levels
fix(hooks): resolve status file race condition
docs(readme): update installation instructions
refactor(extension): simplify hook setup logic
```

### Documentation Style

- Use **Markdown** for all documentation
- Keep line length reasonable (80-100 characters)
- Use **code blocks** with language tags
- Include **examples** where helpful
- Keep it **friendly and accessible**

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run linter
npm run lint

# Build and test
npm run build && npm test
```

### Writing Tests

- Add tests for new features in `test/suite/`
- Follow existing test patterns
- Ensure tests are isolated and repeatable
- Test both success and error cases

## Community

### Getting Help

- **Questions?** Open a [GitHub Discussion](https://github.com/i-am-noamg/cursorbird/discussions) or [Issue](https://github.com/i-am-noamg/cursorbird/issues)
- **Found a bug?** [Report it](#reporting-bugs)
- **Want to chat?** Reach out via GitHub Issues

### Recognition

All contributors will be:
- Listed in the CHANGELOG for their contributions
- Credited in release notes
- Given our eternal gratitude! 🙏

## Thank You! 🎉

Your contributions make this project better for everyone. Whether you're fixing bugs, adding features, or improving documentation – every contribution matters!

**Happy coding, and may your bird fly high!** 🐦🚀

---

<div align="center">

**Questions?** Feel free to open an issue or reach out!

[GitHub](https://github.com/i-am-noamg/cursorbird) • [Download](https://github.com/i-am-noamg/cursorbird/releases) • [Issues](https://github.com/i-am-noamg/cursorbird/issues)

</div>

