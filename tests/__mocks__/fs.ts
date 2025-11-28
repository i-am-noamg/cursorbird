/**
 * File System Mock
 * 
 * Provides mock implementations of Node.js fs module.
 * Uses an in-memory virtual file system for testing.
 * 
 * USAGE:
 * Import and use the helper functions to set up file system state:
 *   import { mockFs, resetMockFs } from './__mocks__/fs';
 *   mockFs.setFile('/path/to/file', 'content');
 */

// Virtual file system state
interface VirtualFS {
  files: Map<string, string>;
  directories: Set<string>;
}

const virtualFs: VirtualFS = {
  files: new Map(),
  directories: new Set(),
};

// Helper to normalize paths (handle Windows backslashes)
function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

// Helper to get parent directory
function getParentDir(filePath: string): string {
  const normalized = normalizePath(filePath);
  const lastSlash = normalized.lastIndexOf('/');
  return lastSlash > 0 ? normalized.substring(0, lastSlash) : '/';
}

/**
 * Reset the virtual file system to empty state.
 * Call this in beforeEach() to ensure clean test isolation.
 */
export function resetMockFs(): void {
  virtualFs.files.clear();
  virtualFs.directories.clear();
  // Always have root directory
  virtualFs.directories.add('/');
}

/**
 * Set a file in the virtual file system.
 * Automatically creates parent directories.
 */
export function setMockFile(filePath: string, content: string): void {
  const normalized = normalizePath(filePath);
  virtualFs.files.set(normalized, content);
  
  // Ensure all parent directories exist
  let dir = getParentDir(normalized);
  while (dir && dir !== '/') {
    virtualFs.directories.add(dir);
    dir = getParentDir(dir);
  }
}

/**
 * Set a directory in the virtual file system.
 */
export function setMockDirectory(dirPath: string): void {
  const normalized = normalizePath(dirPath);
  virtualFs.directories.add(normalized);
  
  // Ensure all parent directories exist
  let dir = getParentDir(normalized);
  while (dir && dir !== '/') {
    virtualFs.directories.add(dir);
    dir = getParentDir(dir);
  }
}

/**
 * Remove a file from the virtual file system.
 */
export function removeMockFile(filePath: string): void {
  virtualFs.files.delete(normalizePath(filePath));
}

/**
 * Get the current content of a file in the virtual file system.
 * Useful for assertions in tests.
 */
export function getMockFile(filePath: string): string | undefined {
  return virtualFs.files.get(normalizePath(filePath));
}

/**
 * Check if a file exists in the virtual file system.
 */
export function mockFileExists(filePath: string): boolean {
  return virtualFs.files.has(normalizePath(filePath));
}

/**
 * Check if a directory exists in the virtual file system.
 */
export function mockDirExists(dirPath: string): boolean {
  const normalized = normalizePath(dirPath);
  return virtualFs.directories.has(normalized) || 
         // Check if any file has this as a prefix (implicit directory)
         Array.from(virtualFs.files.keys()).some(f => f.startsWith(normalized + '/'));
}

/**
 * List files in a directory.
 */
export function listMockDir(dirPath: string): string[] {
  const normalized = normalizePath(dirPath);
  const results: string[] = [];
  
  for (const filePath of virtualFs.files.keys()) {
    if (filePath.startsWith(normalized + '/')) {
      const relative = filePath.substring(normalized.length + 1);
      const firstPart = relative.split('/')[0];
      if (!results.includes(firstPart)) {
        results.push(firstPart);
      }
    }
  }
  
  return results;
}

// Track write operations for assertions
export const writeOperations: { path: string; content: string }[] = [];

/**
 * Clear tracked write operations.
 */
export function clearWriteOperations(): void {
  writeOperations.length = 0;
}

// ============================================
// Mock implementations of fs functions
// ============================================

export const existsSync = jest.fn((filePath: string): boolean => {
  const normalized = normalizePath(filePath);
  return virtualFs.files.has(normalized) || virtualFs.directories.has(normalized);
});

export const readFileSync = jest.fn((filePath: string, encoding?: string): string | Buffer => {
  const normalized = normalizePath(filePath);
  const content = virtualFs.files.get(normalized);
  
  if (content === undefined) {
    const error = new Error(`ENOENT: no such file or directory, open '${filePath}'`) as NodeJS.ErrnoException;
    error.code = 'ENOENT';
    throw error;
  }
  
  if (encoding === 'utf-8' || encoding === 'utf8') {
    return content;
  }
  return Buffer.from(content);
});

export const writeFileSync = jest.fn((filePath: string, data: string | Buffer): void => {
  const normalized = normalizePath(filePath);
  const content = typeof data === 'string' ? data : data.toString();
  virtualFs.files.set(normalized, content);
  writeOperations.push({ path: normalized, content });
  
  // Ensure parent directory exists
  let dir = getParentDir(normalized);
  while (dir && dir !== '/') {
    virtualFs.directories.add(dir);
    dir = getParentDir(dir);
  }
});

export const unlinkSync = jest.fn((filePath: string): void => {
  const normalized = normalizePath(filePath);
  if (!virtualFs.files.has(normalized)) {
    const error = new Error(`ENOENT: no such file or directory, unlink '${filePath}'`) as NodeJS.ErrnoException;
    error.code = 'ENOENT';
    throw error;
  }
  virtualFs.files.delete(normalized);
});

export const mkdirSync = jest.fn((dirPath: string, options?: { recursive?: boolean }): void => {
  const normalized = normalizePath(dirPath);
  
  if (options?.recursive) {
    // Create all directories in path
    const parts = normalized.split('/').filter(Boolean);
    let current = '';
    for (const part of parts) {
      current += '/' + part;
      virtualFs.directories.add(current);
    }
  } else {
    // Check if parent exists
    const parent = getParentDir(normalized);
    if (parent !== '/' && !virtualFs.directories.has(parent)) {
      const error = new Error(`ENOENT: no such file or directory, mkdir '${dirPath}'`) as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      throw error;
    }
    virtualFs.directories.add(normalized);
  }
});

export const renameSync = jest.fn((oldPath: string, newPath: string): void => {
  const normalizedOld = normalizePath(oldPath);
  const normalizedNew = normalizePath(newPath);
  
  const content = virtualFs.files.get(normalizedOld);
  if (content === undefined) {
    const error = new Error(`ENOENT: no such file or directory, rename '${oldPath}' -> '${newPath}'`) as NodeJS.ErrnoException;
    error.code = 'ENOENT';
    throw error;
  }
  
  virtualFs.files.delete(normalizedOld);
  virtualFs.files.set(normalizedNew, content);
});

export const readdirSync = jest.fn((dirPath: string): string[] => {
  const normalized = normalizePath(dirPath);
  
  if (!virtualFs.directories.has(normalized)) {
    // Check if it's an implicit directory
    const hasFiles = Array.from(virtualFs.files.keys()).some(f => f.startsWith(normalized + '/'));
    if (!hasFiles) {
      const error = new Error(`ENOENT: no such file or directory, scandir '${dirPath}'`) as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      throw error;
    }
  }
  
  return listMockDir(dirPath);
});

export const rmSync = jest.fn((dirPath: string, options?: { recursive?: boolean; force?: boolean }): void => {
  const normalized = normalizePath(dirPath);
  
  if (options?.recursive) {
    // Remove all files under this directory
    for (const filePath of Array.from(virtualFs.files.keys())) {
      if (filePath === normalized || filePath.startsWith(normalized + '/')) {
        virtualFs.files.delete(filePath);
      }
    }
    // Remove all subdirectories
    for (const dir of Array.from(virtualFs.directories)) {
      if (dir === normalized || dir.startsWith(normalized + '/')) {
        virtualFs.directories.delete(dir);
      }
    }
  } else {
    // Just remove the directory if empty
    const isEmpty = !Array.from(virtualFs.files.keys()).some(f => f.startsWith(normalized + '/'));
    if (!isEmpty && !options?.force) {
      const error = new Error(`ENOTEMPTY: directory not empty, rmdir '${dirPath}'`) as NodeJS.ErrnoException;
      error.code = 'ENOTEMPTY';
      throw error;
    }
    virtualFs.directories.delete(normalized);
  }
});

export const chmodSync = jest.fn((_path: string, _mode: number): void => {
  // No-op in mock - we don't track permissions
});

// Default export for jest.mock('fs')
export default {
  existsSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  mkdirSync,
  renameSync,
  readdirSync,
  rmSync,
  chmodSync,
};

// Export helper object for test setup
export const mockFs = {
  reset: resetMockFs,
  setFile: setMockFile,
  setDirectory: setMockDirectory,
  removeFile: removeMockFile,
  getFile: getMockFile,
  fileExists: mockFileExists,
  dirExists: mockDirExists,
  listDir: listMockDir,
  clearWriteOps: clearWriteOperations,
  getWriteOps: () => [...writeOperations],
};

