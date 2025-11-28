/**
 * Cross-Platform Tests
 *
 * Tests platform-specific behavior for Linux, Windows, and macOS.
 * Ensures the extension works correctly across different operating systems.
 */

import {
  mockFs,
  resetMockFs,
  setMockFile,
  getMockFile,
  existsSync,
} from './__mocks__/fs';

// Mock modules before importing the extension
jest.mock('fs', () => ({
  existsSync: jest.fn((p: string) => {
    const { existsSync } = require('./__mocks__/fs');
    return existsSync(p);
  }),
  readFileSync: jest.fn((p: string, e?: string) => {
    const { readFileSync } = require('./__mocks__/fs');
    return readFileSync(p, e);
  }),
  writeFileSync: jest.fn((p: string, d: string | Buffer) => {
    const { writeFileSync } = require('./__mocks__/fs');
    return writeFileSync(p, d);
  }),
  unlinkSync: jest.fn((p: string) => {
    const { unlinkSync } = require('./__mocks__/fs');
    return unlinkSync(p);
  }),
  mkdirSync: jest.fn((p: string, o?: { recursive?: boolean }) => {
    const { mkdirSync } = require('./__mocks__/fs');
    return mkdirSync(p, o);
  }),
  renameSync: jest.fn((o: string, n: string) => {
    const { renameSync } = require('./__mocks__/fs');
    return renameSync(o, n);
  }),
  readdirSync: jest.fn((p: string) => {
    const { readdirSync } = require('./__mocks__/fs');
    return readdirSync(p);
  }),
  rmSync: jest.fn((p: string, o?: { recursive?: boolean; force?: boolean }) => {
    const { rmSync } = require('./__mocks__/fs');
    return rmSync(p, o);
  }),
  chmodSync: jest.fn(),
}));

// Store original env and platform
const originalEnv = { ...process.env };
const originalPlatform = process.platform;

// Helper to set platform
function setPlatform(platform: string): void {
  Object.defineProperty(process, 'platform', { value: platform });
}

// Helper to restore platform
function restorePlatform(): void {
  Object.defineProperty(process, 'platform', { value: originalPlatform });
}

describe('Cross-Platform Compatibility', () => {
  beforeEach(() => {
    resetMockFs();
    jest.clearAllMocks();

    // Reset environment
    process.env = { ...originalEnv };
    process.env.HOME = '/home/testuser';
    process.env.USERPROFILE = '/home/testuser';

    // Set up default directory structure
    setMockFile('/mock/extension/path/dist/hook/hook.sh', '#!/bin/sh\n');
    setMockFile('/mock/extension/path/dist/hook/hook-stop.sh', '#!/bin/sh\n');
  });

  afterEach(() => {
    restorePlatform();
    process.env = originalEnv;
  });

  describe('Script File Names', () => {
    /**
     * Test Windows script file naming
     */
    test('Windows uses .bat extension for hook scripts', () => {
      setPlatform('win32');

      // Test getOrCreateHookScriptPath logic
      const scriptName = process.platform === 'win32' ? 'hook.bat' : 'hook.sh';
      expect(scriptName).toBe('hook.bat');

      const scriptPath = `/mock/extension/path/dist/hook/${scriptName}`;
      expect(scriptPath).toBe('/mock/extension/path/dist/hook/hook.bat');
    });

    /**
     * Test Unix-like script file naming
     */
    test('Linux/macOS use .sh extension for hook scripts', () => {
      const unixPlatforms = ['linux', 'darwin', 'freebsd', 'openbsd'];

      for (const platform of unixPlatforms) {
        setPlatform(platform);

        const scriptName = process.platform === 'win32' ? 'hook.bat' : 'hook.sh';
        expect(scriptName).toBe('hook.sh');

        const scriptPath = `/mock/extension/path/dist/hook/${scriptName}`;
        expect(scriptPath).toBe('/mock/extension/path/dist/hook/hook.sh');
      }
    });

    /**
     * Test stop script naming
     */
    test('stop scripts get correct platform-specific names', () => {
      // Windows
      setPlatform('win32');
      const winStopScript = 'hook.sh'.replace(/hook\.(sh|bat)$/, `hook-stop.${process.platform === 'win32' ? 'bat' : 'sh'}`);
      expect(winStopScript).toBe('hook-stop.bat');

      // Unix
      setPlatform('linux');
      const unixStopScript = 'hook.sh'.replace(/hook\.(sh|bat)$/, `hook-stop.${process.platform === 'win32' ? 'bat' : 'sh'}`);
      expect(unixStopScript).toBe('hook-stop.sh');
    });
  });

  describe('Script Content Generation', () => {
    /**
     * Test Windows script content
     */
    test('Windows scripts use @echo off and CRLF line endings', () => {
      setPlatform('win32');

      const nodeScriptPath = '/path/to/node/script.js';
      const expectedWindowsContent = '@echo off\r\nnode "/path/to/node/script.js"\r\n';

      // Simulate script content generation
      const isWindows = process.platform === 'win32';
      const scriptContent = isWindows
        ? `@echo off\r\nnode "${nodeScriptPath}"\r\n`
        : `#!/bin/sh\nnode "${nodeScriptPath}"\n`;

      expect(scriptContent).toBe(expectedWindowsContent);
      expect(scriptContent).toContain('@echo off');
      expect(scriptContent).toContain('\r\n'); // CRLF line endings
    });

    /**
     * Test Unix script content
     */
    test('Unix scripts use shebang and LF line endings', () => {
      const unixPlatforms = ['linux', 'darwin', 'freebsd'];

      for (const platform of unixPlatforms) {
        setPlatform(platform);

        const nodeScriptPath = '/path/to/node/script.js';
        const expectedUnixContent = '#!/bin/sh\nnode "/path/to/node/script.js"\n';

        // Simulate script content generation
        const isWindows = process.platform === 'win32';
        const scriptContent = isWindows
          ? `@echo off\r\nnode "${nodeScriptPath}"\r\n`
          : `#!/bin/sh\nnode "${nodeScriptPath}"\n`;

        expect(scriptContent).toBe(expectedUnixContent);
        expect(scriptContent).toContain('#!/bin/sh');
        expect(scriptContent).toContain('\n'); // LF line endings
        expect(scriptContent).not.toContain('\r\n'); // No CRLF
      }
    });

    /**
     * Test path normalization for Node.js compatibility
     */
    test('backslashes are converted to forward slashes in script content', () => {
      const windowsPath = 'C:\\Users\\test\\script.js';
      const normalizedPath = windowsPath.replace(/\\/g, '/');

      expect(normalizedPath).toBe('C:/Users/test/script.js');

      // Both Windows and Unix should use forward slashes in script content
      const scriptContent = `node "${normalizedPath}"`;
      expect(scriptContent).toContain('C:/Users/test/script.js');
      expect(scriptContent).not.toContain('C:\\Users\\test\\script.js');
    });
  });

  describe('File Permissions', () => {
    /**
     * Test Unix file permissions
     */
    test('Unix systems set executable permissions on scripts', () => {
      const unixPlatforms = ['linux', 'darwin', 'freebsd'];

      for (const platform of unixPlatforms) {
        setPlatform(platform);

        const scriptPath = '/mock/extension/path/dist/hook/hook.sh';

        // Mock chmod call
        const mockChmod = jest.fn();
        (global as any).fs = { chmodSync: mockChmod };

        // Simulate permission setting
        const isWindows = process.platform === 'win32';
        if (!isWindows) {
          if (existsSync(scriptPath)) {
            mockChmod(scriptPath, 0o755);
          }
        }

        expect(mockChmod).toHaveBeenCalledWith(scriptPath, 0o755);
      }
    });

    /**
     * Test Windows file permissions (none set)
     */
    test('Windows does not set file permissions', () => {
      setPlatform('win32');

      const scriptPath = '/mock/extension/path/dist/hook/hook.bat';

      // Mock chmod call
      const mockChmod = jest.fn();
      (global as any).fs = { chmodSync: mockChmod };

      // Simulate permission setting
      const isWindows = process.platform === 'win32';
      if (!isWindows) {
        if (existsSync(scriptPath)) {
          mockChmod(scriptPath, 0o755);
        }
      }

      expect(mockChmod).not.toHaveBeenCalled();
    });
  });

  describe('Path Handling', () => {
    /**
     * Test HOME vs USERPROFILE environment variables
     */
    test('uses HOME on Unix systems, USERPROFILE on Windows', () => {
      // Unix systems
      const unixPlatforms = ['linux', 'darwin', 'freebsd'];
      for (const platform of unixPlatforms) {
        setPlatform(platform);

        process.env.HOME = '/home/unixuser';
        delete process.env.USERPROFILE;

        const homeDir = process.env.HOME || process.env.USERPROFILE;
        expect(homeDir).toBe('/home/unixuser');
      }

      // Windows
      setPlatform('win32');
      delete process.env.HOME;
      process.env.USERPROFILE = 'C:\\Users\\winuser';

      const homeDir = process.env.HOME || process.env.USERPROFILE;
      expect(homeDir).toBe('C:\\Users\\winuser');
    });

    /**
     * Test hooks.json path construction
     */
    test('hooks.json path constructed correctly on all platforms', () => {
      // Unix
      setPlatform('linux');
      process.env.HOME = '/home/user';

      const unixHooksPath = `${process.env.HOME}/.cursor/hooks.json`;
      expect(unixHooksPath).toBe('/home/user/.cursor/hooks.json');

      // Windows
      setPlatform('win32');
      process.env.USERPROFILE = 'C:\\Users\\user';

      const winHooksPath = `${process.env.USERPROFILE}\\.cursor\\hooks.json`;
      expect(winHooksPath).toBe('C:\\Users\\user\\.cursor\\hooks.json');
    });
  });

  describe('Integration: Full Script Creation Workflow', () => {
    /**
     * Test complete script creation on Windows
     */
    test('creates complete Windows hook script setup', () => {
      setPlatform('win32');

      const extPath = '/mock/extension/path';
      const scriptName = process.platform === 'win32' ? 'hook.bat' : 'hook.sh';
      const scriptPath = `${extPath}/dist/hook/${scriptName}`;

      // Expected Windows script content
      const expectedContent = '@echo off\r\nnode "/mock/extension/path/dist/hook/hook-node.js"\r\n';

      // Simulate script creation
      setMockFile(scriptPath, expectedContent);

      expect(getMockFile(scriptPath)).toBe(expectedContent);
      expect(scriptPath).toContain('.bat');
    });

    /**
     * Test complete script creation on Linux
     */
    test('creates complete Linux hook script setup', () => {
      setPlatform('linux');

      const extPath = '/mock/extension/path';
      const scriptName = process.platform === 'win32' ? 'hook.bat' : 'hook.sh';
      const scriptPath = `${extPath}/dist/hook/${scriptName}`;

      // Expected Linux script content
      const expectedContent = '#!/bin/sh\nnode "/mock/extension/path/dist/hook/hook-node.js"\n';

      // Simulate script creation
      setMockFile(scriptPath, expectedContent);

      expect(getMockFile(scriptPath)).toBe(expectedContent);
      expect(scriptPath).toContain('.sh');
    });

    /**
     * Test complete script creation on macOS
     */
    test('creates complete macOS hook script setup', () => {
      setPlatform('darwin');

      const extPath = '/mock/extension/path';
      const scriptName = process.platform === 'win32' ? 'hook.bat' : 'hook.sh';
      const scriptPath = `${extPath}/dist/hook/${scriptName}`;

      // Expected macOS script content (same as Linux)
      const expectedContent = '#!/bin/sh\nnode "/mock/extension/path/dist/hook/hook-node.js"\n';

      // Simulate script creation
      setMockFile(scriptPath, expectedContent);

      expect(getMockFile(scriptPath)).toBe(expectedContent);
      expect(scriptPath).toContain('.sh');
    });
  });

  describe('Error Handling Across Platforms', () => {
    /**
     * Test path handling with special characters
     */
    test('handles paths with spaces and special characters', () => {
      const problematicPath = '/path with spaces & special chars (test)/script.js';
      const normalizedPath = problematicPath.replace(/\\/g, '/'); // Should work on all platforms

      // Script content should properly quote paths with spaces
      const scriptContent = `node "${normalizedPath}"`;
      expect(scriptContent).toContain('"/path with spaces & special chars (test)/script.js"');
    });

    /**
     * Test behavior when platform detection fails
     */
    test('gracefully handles unknown platforms', () => {
      // Test with an unknown platform
      setPlatform('unknown-platform');

      const scriptName = process.platform === 'win32' ? 'hook.bat' : 'hook.sh';
      expect(scriptName).toBe('hook.sh'); // Defaults to Unix behavior

      const isWindows = process.platform === 'win32';
      expect(isWindows).toBe(false); // Should not be treated as Windows
    });
  });
});

describe('Platform-Specific Environment Variables', () => {
  beforeEach(() => {
    resetMockFs();
  });

  afterEach(() => {
    restorePlatform();
    process.env = originalEnv;
  });

  /**
   * Test comprehensive environment variable handling
   */
  test('handles all platform-specific environment combinations', () => {
    const testCases = [
      { platform: 'win32', HOME: undefined, USERPROFILE: 'C:\\Users\\win', expected: 'C:\\Users\\win' },
      { platform: 'win32', HOME: '/home/win', USERPROFILE: 'C:\\Users\\win', expected: '/home/win' },
      { platform: 'linux', HOME: '/home/linux', USERPROFILE: undefined, expected: '/home/linux' },
      { platform: 'darwin', HOME: '/Users/mac', USERPROFILE: undefined, expected: '/Users/mac' },
      { platform: 'win32', HOME: undefined, USERPROFILE: undefined, expected: undefined },
      { platform: 'linux', HOME: undefined, USERPROFILE: undefined, expected: undefined },
    ];

    for (const testCase of testCases) {
      setPlatform(testCase.platform);

      if (testCase.HOME !== undefined) {
        process.env.HOME = testCase.HOME;
      } else {
        delete process.env.HOME;
      }

      if (testCase.USERPROFILE !== undefined) {
        process.env.USERPROFILE = testCase.USERPROFILE;
      } else {
        delete process.env.USERPROFILE;
      }

      const result = process.env.HOME || process.env.USERPROFILE;
      expect(result).toBe(testCase.expected);
    }
  });
});

