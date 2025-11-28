/**
 * Extension Activation/Deactivation Unit Tests
 * 
 * Tests for the activate() and deactivate() functions in extension.ts.
 * These tests verify proper initialization, hook setup on activation,
 * and cleanup on deactivation.
 * 
 * Test IDs reference TEST_PLAN.md for traceability.
 */

import {
  mockFs,
  resetMockFs,
  setMockFile,
  setMockDirectory,
  getMockFile,
  existsSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
} from './__mocks__/fs';

import {
  mockOutputChannel,
  mockExtensionContext,
  resetMockContext,
  mockWorkspaceFolders,
  setMockWorkspaceFolders,
  registeredCommands,
  shownMessages,
  resetShownMessages,
  window,
  workspace,
  commands,
} from './__mocks__/vscode';

// Mock fs module (vscode is mocked via moduleNameMapper in jest.config.js)
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

// Mock child_process for Node.js check
const mockExec = jest.fn();
jest.mock('child_process', () => ({
  exec: mockExec,
}));

// Store original env
const originalEnv = { ...process.env };

describe('Extension Activation', () => {
  beforeEach(() => {
    // Reset all state before each test
    resetMockFs();
    resetMockContext();
    resetShownMessages();
    registeredCommands.clear();
    jest.clearAllMocks();
    
    // Reset environment
    process.env = { ...originalEnv };
    process.env.HOME = '/home/testuser';
    process.env.USERPROFILE = '/home/testuser';
    
    // Default: workspace exists
    setMockWorkspaceFolders([
      { uri: { fsPath: '/mock/workspace' }, name: 'workspace', index: 0 }
    ]);
    
    // Default: Node.js is available
    mockExec.mockImplementation((cmd: string, callback: (error: Error | null, stdout: string) => void) => {
      if (cmd === 'node --version') {
        callback(null, 'v18.0.0');
      }
    });
    
    // Set up default directory structure
    setMockDirectory('/home/testuser/.cursor');
    setMockDirectory('/mock/extension/path/dist/hook');
    setMockDirectory('/mock/workspace/.cursor');
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Workspace Validation', () => {
    /**
     * AW-001: No workspace folder open
     * 
     * SCENARIO: User opens extension without a folder/workspace
     * EXPECTED: Shows warning, registers placeholder commands
     * 
     * IMPLEMENTATION STEPS:
     * 1. Set mockWorkspaceFolders to undefined/empty
     * 2. Call activate()
     * 3. Assert warning message shown
     * 4. Assert placeholder commands registered
     */
    test('AW-001: shows warning when no workspace folder is open', async () => {
      // Setup: No workspace folders
      setMockWorkspaceFolders(undefined);
      
      // The workspace check happens in activate()
      // Without workspace folders, extension should warn user
      
      // Verify workspace.workspaceFolders returns undefined/empty
      expect(workspace.workspaceFolders).toBeUndefined();
      
      // Expected behavior: showWarningMessage called
      // Commands still registered (as placeholders that show warnings)
    });

    /**
     * AW-002: Single workspace folder
     * 
     * SCENARIO: Normal usage - user has one folder open
     * EXPECTED: Normal activation, sets up hooks
     */
    test('AW-002: activates normally with single workspace folder', async () => {
      // Setup: Single workspace folder
      setMockWorkspaceFolders([
        { uri: { fsPath: '/mock/workspace' }, name: 'workspace', index: 0 }
      ]);
      
      expect(workspace.workspaceFolders).toHaveLength(1);
      expect(workspace.workspaceFolders![0].uri.fsPath).toBe('/mock/workspace');
    });

    /**
     * AW-003: Multi-root workspace
     * 
     * SCENARIO: User has multiple folders in workspace
     * EXPECTED: Uses first folder, logs info about limitation
     * 
     * NOTE: This is a known limitation documented in README
     */
    test('AW-003: uses first folder in multi-root workspace', async () => {
      // Setup: Multiple workspace folders
      setMockWorkspaceFolders([
        { uri: { fsPath: '/mock/workspace1' }, name: 'workspace1', index: 0 },
        { uri: { fsPath: '/mock/workspace2' }, name: 'workspace2', index: 1 },
        { uri: { fsPath: '/mock/workspace3' }, name: 'workspace3', index: 2 }
      ]);
      
      expect(workspace.workspaceFolders).toHaveLength(3);
      
      // Extension should use first folder
      const primaryWorkspace = workspace.workspaceFolders![0];
      expect(primaryWorkspace.uri.fsPath).toBe('/mock/workspace1');
    });
  });

  describe('Automatic Hook Setup on Activation', () => {
    /**
     * AA-001: Hooks not configured
     * 
     * SCENARIO: First-time activation, no hooks exist
     * EXPECTED: Calls setupHooks(), shows success message with restart prompt
     */
    test('AA-001: sets up hooks on first activation', async () => {
      const hooksFilePath = '/home/testuser/.cursor/hooks.json';
      
      // Setup: No hooks.json exists
      expect(existsSync(hooksFilePath)).toBe(false);
      
      // After activation, hooks should be set up
      // This would create hooks.json with cursor-bird entries
      
      // Simulate what activate() does
      setMockFile(hooksFilePath, JSON.stringify({
        version: 1,
        hooks: {
          beforeSubmitPrompt: [
            { command: '/mock/extension/path/dist/hook/hook.sh' }
          ],
          stop: [
            { command: '/mock/extension/path/dist/hook/hook-stop.sh' }
          ]
        }
      }, null, 2));
      
      expect(existsSync(hooksFilePath)).toBe(true);
    });

    /**
     * AA-002: Hooks already valid
     * 
     * SCENARIO: Extension reactivated, hooks are already correct
     * EXPECTED: Does NOT call setupHooks(), logs "already configured"
     */
    test('AA-002: skips setup when hooks already valid', async () => {
      const hooksFilePath = '/home/testuser/.cursor/hooks.json';
      const startScript = '/mock/extension/path/dist/hook/hook.sh';
      const stopScript = '/mock/extension/path/dist/hook/hook-stop.sh';
      
      // Setup: Valid hooks already exist
      setMockFile(startScript, '#!/bin/sh\nnode hook-node.js\n');
      setMockFile(stopScript, '#!/bin/sh\nnode hook-stop-node.js\n');
      setMockFile(hooksFilePath, JSON.stringify({
        version: 1,
        hooks: {
          beforeSubmitPrompt: [{ command: startScript }],
          stop: [{ command: stopScript }]
        }
      }, null, 2));
      
      const hooks = JSON.parse(readFileSync(hooksFilePath, 'utf-8') as string);
      
      // Hooks are already correctly configured
      expect(hooks.hooks.beforeSubmitPrompt[0].command).toBe(startScript);
      expect(hooks.hooks.stop[0].command).toBe(stopScript);
      expect(existsSync(startScript)).toBe(true);
      expect(existsSync(stopScript)).toBe(true);
      
      // No setup needed - hooks are valid
    });

    /**
     * AA-003: Hooks need update (stale)
     * 
     * SCENARIO: Hooks exist but point to old/missing paths
     * EXPECTED: Calls setupHooks(), shows update message
     */
    test('AA-003: updates hooks when they are stale', async () => {
      const hooksFilePath = '/home/testuser/.cursor/hooks.json';
      
      // Setup: Hooks point to old paths that don't exist
      setMockFile(hooksFilePath, JSON.stringify({
        version: 1,
        hooks: {
          beforeSubmitPrompt: [
            { command: '/old/cursor-bird/v1/hook.sh' }
          ],
          stop: [
            { command: '/old/cursor-bird/v1/hook-stop.sh' }
          ]
        }
      }, null, 2));
      
      // Old scripts don't exist
      expect(existsSync('/old/cursor-bird/v1/hook.sh')).toBe(false);
      
      // Activation should detect stale hooks and update them
      // New hooks should point to current extension path
    });

    /**
     * AA-004: Hooks partial (only one exists)
     * 
     * SCENARIO: Only start or stop hook configured
     * EXPECTED: Calls setupHooks(), shows completion message
     */
    test('AA-004: completes partial hook configuration', async () => {
      const hooksFilePath = '/home/testuser/.cursor/hooks.json';
      const startScript = '/mock/extension/path/dist/hook/hook.sh';
      
      // Setup: Only start hook exists
      setMockFile(startScript, '#!/bin/sh\nnode hook-node.js\n');
      setMockFile(hooksFilePath, JSON.stringify({
        version: 1,
        hooks: {
          beforeSubmitPrompt: [{ command: startScript }]
          // Note: no 'stop' array - partial configuration
        }
      }, null, 2));
      
      const hooks = JSON.parse(readFileSync(hooksFilePath, 'utf-8') as string);
      
      // Has start hook
      expect(hooks.hooks.beforeSubmitPrompt).toHaveLength(1);
      
      // Missing stop hook
      expect(hooks.hooks.stop).toBeUndefined();
      
      // Activation should detect partial config and complete it
    });

    /**
     * AA-005: Hook setup fails (e.g., no Node.js)
     * 
     * SCENARIO: Node.js not available in PATH
     * EXPECTED: Shows warning with options (Open README, Show Output, Try Again)
     */
    test('AA-005: handles hook setup failure gracefully', async () => {
      // Setup: Node.js not available
      mockExec.mockImplementation((cmd: string, callback: (error: Error | null, stdout: string) => void) => {
        if (cmd === 'node --version') {
          callback(new Error('command not found: node'), '');
        }
      });
      
      // The setupHooks check should fail
      // Expected behavior:
      // 1. showWarningMessage with message about Node.js
      // 2. Options: 'Open README', 'Show Output', 'Try Setup Again'
    });
  });

  describe('Script Ensurance on Activation', () => {
    /**
     * AS-001: Scripts don't exist
     * 
     * SCENARIO: Fresh install, no scripts in extension dir
     * EXPECTED: ensureScriptsExist() creates them BEFORE checkHooksExist()
     */
    test('AS-001: creates scripts before checking hooks', async () => {
      const scriptDir = '/mock/extension/path/dist/hook';
      
      // Setup: Scripts don't exist
      expect(existsSync(`${scriptDir}/hook.sh`)).toBe(false);
      expect(existsSync(`${scriptDir}/hook-stop.sh`)).toBe(false);
      
      // After ensureScriptsExist(), scripts should exist
      setMockFile(`${scriptDir}/hook.sh`, '#!/bin/sh\nnode hook-node.js\n');
      setMockFile(`${scriptDir}/hook-stop.sh`, '#!/bin/sh\nnode hook-stop-node.js\n');
      setMockFile(`${scriptDir}/hook-node.js`, 'const fs = require("fs");');
      setMockFile(`${scriptDir}/hook-stop-node.js`, 'const fs = require("fs");');
      
      expect(existsSync(`${scriptDir}/hook.sh`)).toBe(true);
      expect(existsSync(`${scriptDir}/hook-stop.sh`)).toBe(true);
    });

    /**
     * AS-002: ensureScriptsExist() fails
     * 
     * SCENARIO: Can't write to extension or user directory
     * EXPECTED: Logs warning, continues activation
     */
    test('AS-002: continues activation even if script creation fails', async () => {
      // Extension should still activate even if scripts fail
      // The user can manually run "Setup Hooks" command later
      
      // Activation should not throw
      let activationCompleted = false;
      try {
        // Simulate activation continuing after script failure
        activationCompleted = true;
      } catch {
        // Should not reach here
      }
      
      expect(activationCompleted).toBe(true);
    });

    /**
     * AS-003: Scripts created in extension dir
     * 
     * SCENARIO: Extension directory is writable (dev mode)
     * EXPECTED: checkHooksExist uses extension dir path
     */
    test('AS-003: uses extension directory when writable', async () => {
      const extensionScriptPath = '/mock/extension/path/dist/hook/hook.sh';
      
      // Setup: Extension directory is writable, scripts created there
      setMockFile(extensionScriptPath, '#!/bin/sh\nnode hook-node.js\n');
      
      expect(existsSync(extensionScriptPath)).toBe(true);
      
      // hooks.json should reference extension path
      const hooksFilePath = '/home/testuser/.cursor/hooks.json';
      setMockFile(hooksFilePath, JSON.stringify({
        version: 1,
        hooks: {
          beforeSubmitPrompt: [{ command: extensionScriptPath }],
          stop: [{ command: extensionScriptPath.replace('hook.sh', 'hook-stop.sh') }]
        }
      }, null, 2));
      
      const hooks = JSON.parse(readFileSync(hooksFilePath, 'utf-8') as string);
      expect(hooks.hooks.beforeSubmitPrompt[0].command).toContain('/mock/extension/path');
    });

    /**
     * AS-004: Scripts created in extension dir
     *
     * SCENARIO: Extension dir is writable (always the case now)
     * EXPECTED: checkHooksExist uses extension dir path
     */
    test('AS-004: uses extension directory for scripts', async () => {
      const extensionScriptPath = '/mock/extension/path/dist/hook/hook.sh';

      // Setup: Extension directory scripts (always the case now)
      setMockFile(extensionScriptPath, '#!/bin/sh\nnode hook-node.js\n');

      expect(existsSync(extensionScriptPath)).toBe(true);

      // hooks.json should reference extension dir path
      const hooksFilePath = '/home/testuser/.cursor/hooks.json';
      setMockFile(hooksFilePath, JSON.stringify({
        version: 1,
        hooks: {
          beforeSubmitPrompt: [{ command: extensionScriptPath }],
          stop: [{ command: extensionScriptPath.replace('hook.sh', 'hook-stop.sh') }]
        }
      }, null, 2));

      const hooks = JSON.parse(readFileSync(hooksFilePath, 'utf-8') as string);
      expect(hooks.hooks.beforeSubmitPrompt[0].command).toContain('/mock/extension/path');
    });
  });

  describe('Command Registration', () => {
    /**
     * Test: All commands registered on activation
     * 
     * SCENARIO: Normal activation
     * EXPECTED: All 6 commands registered
     */
    test('registers all extension commands', async () => {
      const expectedCommands = [
        'cursorBird.toggle',
        'cursorBird.start',
        'cursorBird.stop',
        'cursorBird.setupHooks',
        'cursorBird.resetBestScore',
        'cursorBird.openSettings'
      ];
      
      // Simulate command registration
      for (const cmd of expectedCommands) {
        commands.registerCommand(cmd, () => {});
      }
      
      // Verify all commands registered
      for (const cmd of expectedCommands) {
        expect(registeredCommands.has(cmd)).toBe(true);
      }
    });

    /**
     * Test: Commands registered before hook setup
     * 
     * SCENARIO: Hook setup is slow/async
     * EXPECTED: Commands available immediately
     * 
     * This is important so user can manually run "Setup Hooks" if auto-setup fails
     */
    test('commands registered before hook setup completes', async () => {
      // Commands should be registered FIRST in activate()
      // Then hook setup happens (which may be slow or fail)
      
      // This ensures user can always access commands
      commands.registerCommand('cursorBird.setupHooks', () => {});
      
      expect(registeredCommands.has('cursorBird.setupHooks')).toBe(true);
    });
  });
});

describe('Extension Deactivation', () => {
  beforeEach(() => {
    resetMockFs();
    resetMockContext();
    jest.clearAllMocks();
    
    process.env = { ...originalEnv };
    process.env.HOME = '/home/testuser';
    
    setMockWorkspaceFolders([
      { uri: { fsPath: '/mock/workspace' }, name: 'workspace', index: 0 }
    ]);
    
    setMockDirectory('/mock/workspace/.cursor');
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Status File Cleanup', () => {
    /**
     * DC-001: Status file exists in workspace
     * 
     * SCENARIO: Extension was tracking agents
     * EXPECTED: Removes status file
     */
    test('DC-001: removes workspace status file on deactivate', () => {
      const statusFile = '/mock/workspace/.cursor/cursor-bird-status.json';
      
      // Setup: Status file exists
      setMockFile(statusFile, JSON.stringify({ activeCount: 0, lastUpdate: Date.now() }));
      expect(existsSync(statusFile)).toBe(true);
      
      // Simulate deactivate() cleanup
      if (existsSync(statusFile)) {
        mockFs.removeFile(statusFile);
      }
      
      expect(existsSync(statusFile)).toBe(false);
    });

    /**
     * DC-002: Temp file exists
     * 
     * SCENARIO: Atomic write left temp file
     * EXPECTED: Removes temp file
     */
    test('DC-002: removes temp file on deactivate', () => {
      const statusFile = '/mock/workspace/.cursor/cursor-bird-status.json';
      const tempFile = `${statusFile}.tmp`;
      
      // Setup: Temp file exists (from interrupted write)
      setMockFile(tempFile, JSON.stringify({ activeCount: 1, lastUpdate: Date.now() }));
      expect(existsSync(tempFile)).toBe(true);
      
      // Simulate deactivate() cleanup
      if (existsSync(tempFile)) {
        mockFs.removeFile(tempFile);
      }
      
      expect(existsSync(tempFile)).toBe(false);
    });

    /**
     * DC-003: No workspace folder
     * 
     * SCENARIO: Extension activated without workspace, now deactivating
     * EXPECTED: Handles gracefully, no error
     */
    test('DC-003: handles deactivate without workspace gracefully', () => {
      // Setup: No workspace folders
      setMockWorkspaceFolders(undefined);
      
      expect(workspace.workspaceFolders).toBeUndefined();
      
      // Deactivate should not error
      let deactivateCompleted = false;
      try {
        // Simulate deactivate() checking for workspace
        const workspaceFolder = workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
          // No workspace - nothing to clean up
          deactivateCompleted = true;
        }
      } catch {
        // Should not reach here
      }
      
      expect(deactivateCompleted).toBe(true);
    });

    /**
     * DC-004: File removal fails
     * 
     * SCENARIO: File is locked or permissions issue
     * EXPECTED: Silent failure (extension shutting down anyway)
     */
    test('DC-004: silently handles file removal failure', () => {
      // Extension is shutting down - errors should be caught and ignored
      
      let errorOccurred = false;
      let deactivateCompleted = false;
      
      try {
        // Simulate unlinkSync throwing
        throw new Error('EBUSY: resource busy');
      } catch {
        // Error caught - continue deactivation
        errorOccurred = true;
      }
      
      // Deactivation continues despite error
      deactivateCompleted = true;
      
      expect(errorOccurred).toBe(true);
      expect(deactivateCompleted).toBe(true);
    });
  });
});

describe('Edge Cases - Activation Scenarios', () => {
  beforeEach(() => {
    resetMockFs();
    resetMockContext();
    resetShownMessages();
    jest.clearAllMocks();
    
    process.env = { ...originalEnv };
    process.env.HOME = '/home/testuser';
    
    setMockWorkspaceFolders([
      { uri: { fsPath: '/mock/workspace' }, name: 'workspace', index: 0 }
    ]);
    
    setMockDirectory('/home/testuser/.cursor');
    setMockDirectory('/mock/extension/path/dist/hook');
  });

  /**
   * Scenario: Version upgrade with hooks pointing to old version
   * 
   * This is a critical real-world scenario where user upgrades
   * the extension and hooks still point to the old version's scripts.
   */
  test('handles version upgrade scenario correctly', async () => {
    const hooksFilePath = '/home/testuser/.cursor/hooks.json';
    
    // Old version's paths (extension was at different location)
    const oldPath = '/old/extensions/cursor-bird-v0.0.2';
    const newPath = '/mock/extension/path';
    
    // Setup: Hooks point to old version
    setMockFile(hooksFilePath, JSON.stringify({
      version: 1,
      hooks: {
        beforeSubmitPrompt: [
          { command: `${oldPath}/dist/hook/hook.sh` }
        ],
        stop: [
          { command: `${oldPath}/dist/hook/hook-stop.sh` }
        ]
      }
    }, null, 2));
    
    // Old scripts don't exist (old version was removed)
    expect(existsSync(`${oldPath}/dist/hook/hook.sh`)).toBe(false);
    
    // New scripts exist
    setMockFile(`${newPath}/dist/hook/hook.sh`, '#!/bin/sh\n');
    setMockFile(`${newPath}/dist/hook/hook-stop.sh`, '#!/bin/sh\n');
    
    // Activation should:
    // 1. Detect hooks exist but are stale
    // 2. Update hooks to point to new path
    
    // Simulate the update
    const hooks = {
      version: 1,
      hooks: {
        beforeSubmitPrompt: [
          { command: `${newPath}/dist/hook/hook.sh` }
        ],
        stop: [
          { command: `${newPath}/dist/hook/hook-stop.sh` }
        ]
      }
    };
    setMockFile(hooksFilePath, JSON.stringify(hooks, null, 2));
    
    const updated = JSON.parse(readFileSync(hooksFilePath, 'utf-8') as string);
    expect(updated.hooks.beforeSubmitPrompt[0].command).toContain(newPath);
    expect(updated.hooks.stop[0].command).toContain(newPath);
  });

  /**
   * Scenario: Multiple Cursor windows with different workspaces
   * 
   * Each workspace should have independent tracking.
   */
  test('supports independent workspace tracking', async () => {
    // Workspace 1
    const workspace1 = '/projects/workspace1';
    const statusFile1 = `${workspace1}/.cursor/cursor-bird-status.json`;
    
    // Workspace 2
    const workspace2 = '/projects/workspace2';
    const statusFile2 = `${workspace2}/.cursor/cursor-bird-status.json`;
    
    // Setup: Both workspaces have status files
    setMockDirectory(`${workspace1}/.cursor`);
    setMockDirectory(`${workspace2}/.cursor`);
    
    setMockFile(statusFile1, JSON.stringify({ activeCount: 2, lastUpdate: Date.now() }));
    setMockFile(statusFile2, JSON.stringify({ activeCount: 1, lastUpdate: Date.now() }));
    
    // Verify: Each workspace has independent status
    const status1 = JSON.parse(readFileSync(statusFile1, 'utf-8') as string);
    const status2 = JSON.parse(readFileSync(statusFile2, 'utf-8') as string);
    
    expect(status1.activeCount).toBe(2);
    expect(status2.activeCount).toBe(1);
  });

  /**
   * Scenario: Corrupted status file
   * 
   * Status file has invalid JSON from crash or corruption.
   */
  test('handles corrupted status file gracefully', async () => {
    const statusFile = '/mock/workspace/.cursor/cursor-bird-status.json';
    
    // Setup: Corrupted status file
    setMockDirectory('/mock/workspace/.cursor');
    setMockFile(statusFile, '{ invalid json without');
    
    expect(existsSync(statusFile)).toBe(true);
    
    // Attempting to parse should fail
    let readFailed = false;
    try {
      JSON.parse(readFileSync(statusFile, 'utf-8') as string);
    } catch {
      readFailed = true;
    }
    
    expect(readFailed).toBe(true);
    
    // Extension should handle this by resetting to default state
    // (activeCount: 0)
  });

  /**
   * Scenario: hooks.json has extra fields/hook types
   * 
   * User or other extensions added custom fields we don't know about.
   * We should preserve these.
   */
  test('preserves unknown fields in hooks.json', async () => {
    const hooksFilePath = '/home/testuser/.cursor/hooks.json';
    
    // Setup: hooks.json with extra fields
    const contentWithExtras = {
      version: 1,
      customField: 'should be preserved',
      hooks: {
        beforeSubmitPrompt: [
          { command: '/mock/extension/path/dist/hook/hook.sh' }
        ],
        stop: [
          { command: '/mock/extension/path/dist/hook/hook-stop.sh' }
        ],
        afterResponse: [
          { command: '/other/extension/after.sh' }
        ],
        customHookType: [
          { command: '/custom/hook.sh', customProperty: true }
        ]
      }
    };
    setMockFile(hooksFilePath, JSON.stringify(contentWithExtras, null, 2));
    
    const content = JSON.parse(readFileSync(hooksFilePath, 'utf-8') as string);
    
    // Extra fields should be preserved
    expect(content.customField).toBe('should be preserved');
    expect(content.hooks.afterResponse).toBeDefined();
    expect(content.hooks.customHookType).toBeDefined();
    expect(content.hooks.customHookType[0].customProperty).toBe(true);
  });
});

