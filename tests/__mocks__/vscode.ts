/**
 * VS Code API Mock
 * 
 * Provides mock implementations of vscode module APIs used by the extension.
 * This allows testing extension logic without a running VS Code instance.
 * 
 * USAGE:
 * Import at the top of test files:
 *   jest.mock('vscode', () => require('./__mocks__/vscode'));
 */

// Mock workspace folder
export interface MockWorkspaceFolder {
  uri: { fsPath: string };
  name: string;
  index: number;
}

// Mock configuration values - can be modified per test
export const mockConfigValues: Record<string, unknown> = {
  'behavior.webviewColumn': 'Beside',
  'behavior.pollingInterval': 2000,
  'behavior.staleThreshold': 30000,
  'behavior.autoShow': true,
};

// Mock workspace folders - can be modified per test
export let mockWorkspaceFolders: MockWorkspaceFolder[] | undefined = [
  { uri: { fsPath: '/mock/workspace' }, name: 'workspace', index: 0 }
];

// Function to set workspace folders in tests
export function setMockWorkspaceFolders(folders: MockWorkspaceFolder[] | undefined): void {
  mockWorkspaceFolders = folders;
}

// Function to set mock config values in tests
export function setMockConfigValue(key: string, value: unknown): void {
  mockConfigValues[key] = value;
}

// Mock output channel
export const mockOutputChannel = {
  appendLine: jest.fn(),
  append: jest.fn(),
  clear: jest.fn(),
  show: jest.fn(),
  hide: jest.fn(),
  dispose: jest.fn(),
  name: 'Cursor Bird',
};

// Mock memento (for storage)
export const mockMemento = {
  get: jest.fn((key: string, defaultValue?: unknown) => defaultValue),
  update: jest.fn(),
  keys: jest.fn(() => []),
};

// Mock extension context
export const mockExtensionContext = {
  extensionPath: '/mock/extension/path',
  extensionUri: { fsPath: '/mock/extension/path' },
  globalState: mockMemento,
  workspaceState: mockMemento,
  subscriptions: [] as { dispose: () => void }[],
};

// Function to reset context between tests
export function resetMockContext(): void {
  mockExtensionContext.subscriptions = [];
  mockMemento.get.mockImplementation((_key: string, defaultValue?: unknown) => defaultValue);
  mockMemento.update.mockClear();
}

// Mock webview panel
export const mockWebviewPanel = {
  webview: {
    html: '',
    cspSource: 'mock-csp-source',
    asWebviewUri: jest.fn((uri: { fsPath: string }) => ({ toString: () => `vscode-webview://mock/${uri.fsPath}` })),
    postMessage: jest.fn(),
    onDidReceiveMessage: jest.fn(),
  },
  reveal: jest.fn(),
  dispose: jest.fn(),
  onDidDispose: jest.fn(),
  visible: true,
};

// Mock file system watcher
export const mockFileSystemWatcher = {
  onDidChange: jest.fn(() => ({ dispose: jest.fn() })),
  onDidCreate: jest.fn(() => ({ dispose: jest.fn() })),
  onDidDelete: jest.fn(() => ({ dispose: jest.fn() })),
  dispose: jest.fn(),
};

// Track registered commands
export const registeredCommands: Map<string, (...args: unknown[]) => unknown> = new Map();

// Track shown messages
export const shownMessages = {
  info: [] as string[],
  warning: [] as string[],
  error: [] as string[],
};

// Function to reset messages
export function resetShownMessages(): void {
  shownMessages.info = [];
  shownMessages.warning = [];
  shownMessages.error = [];
}

// VS Code module mock
export const window = {
  createOutputChannel: jest.fn(() => mockOutputChannel),
  createWebviewPanel: jest.fn(() => mockWebviewPanel),
  showInformationMessage: jest.fn((message: string) => {
    shownMessages.info.push(message);
    return Promise.resolve(undefined);
  }),
  showWarningMessage: jest.fn((message: string) => {
    shownMessages.warning.push(message);
    return Promise.resolve(undefined);
  }),
  showErrorMessage: jest.fn((message: string) => {
    shownMessages.error.push(message);
    return Promise.resolve(undefined);
  }),
};

export const workspace = {
  workspaceFolders: mockWorkspaceFolders,
  getConfiguration: jest.fn(() => ({
    get: jest.fn((key: string, defaultValue?: unknown) => {
      return mockConfigValues[key] ?? defaultValue;
    }),
  })),
  createFileSystemWatcher: jest.fn(() => mockFileSystemWatcher),
  onDidChangeConfiguration: jest.fn(() => ({ dispose: jest.fn() })),
  fs: {
    readFile: jest.fn(),
  },
};

// Override the getter to return current mockWorkspaceFolders
Object.defineProperty(workspace, 'workspaceFolders', {
  get: () => mockWorkspaceFolders,
});

export const commands = {
  registerCommand: jest.fn((command: string, callback: (...args: unknown[]) => unknown) => {
    registeredCommands.set(command, callback);
    return { dispose: jest.fn() };
  }),
  executeCommand: jest.fn(),
};

export const Uri = {
  file: jest.fn((path: string) => ({ fsPath: path })),
  joinPath: jest.fn((base: { fsPath: string }, ...pathSegments: string[]) => ({
    fsPath: [base.fsPath, ...pathSegments].join('/'),
  })),
};

export const RelativePattern = jest.fn();

export enum ViewColumn {
  Active = -1,
  Beside = -2,
  One = 1,
  Two = 2,
  Three = 3,
  Four = 4,
  Five = 5,
  Six = 6,
  Seven = 7,
  Eight = 8,
  Nine = 9,
}

// Default export for jest.mock('vscode')
export default {
  window,
  workspace,
  commands,
  Uri,
  RelativePattern,
  ViewColumn,
};

