#!/usr/bin/env node
/**
 * Uninstall cleanup script for Cursor Bird extension
 *
 * This script is called when the extension is UNINSTALLED (not just disabled).
 * It cleans up files and configurations that persist outside the extension directory.
 *
 * CLEANUP RESPONSIBILITIES:
 *
 * This script (uninstall.ts) cleans up:
 * - Hook entries in global hooks.json (~/.cursor/hooks.json)
 * - Workspace status files (as fallback if deactivate() didn't run)
 * - Temp files (as fallback if deactivate() didn't run)
 *
 * The deactivate() function in extension.ts (runs on disable/uninstall/shutdown):
 * - Workspace status files ({workspace}/.cursor/cursor-bird-status.json)
 * - Temp files (.tmp variants)
 *
 * Cursor automatically removes:
 * - Extension directory (including extension's dist/hook/ scripts:
 *   hook.sh, hook-stop.sh, hook-node.js, hook-stop-node.js)
 * - Extension state storage (best scores)
 *
 * PATHS HANDLED:
 * - Global: ~/.cursor/ (HOME or USERPROFILE) - hooks config
 * - Workspace: {workspace}/.cursor/ (current working directory) - for status files
 *
 * NOTE: All status files are workspace-only. No global status files are used.
 * NOTE: Hook scripts are stored in the extension directory.
 */
import * as fs from 'fs';
import * as path from 'path';

// Helper function to get home directory
function getHomeDirectory(): string | undefined {
    return process.env.HOME || process.env.USERPROFILE;
}

interface HooksJson {
    version: number;
    hooks: {
        beforeSubmitPrompt?: Array<{ command: string; [key: string]: unknown }>;
        stop?: Array<{ command: string; [key: string]: unknown }>;
        [key: string]: unknown;  // Preserve other hook types
    };
    [key: string]: unknown;  // Preserve other top-level fields
}

console.warn('Cursor Bird: Running uninstall cleanup...');

const EXTENSION_NAME = 'cursor-bird';
let cleanupCount = 0;

// Hook scripts in extension directory are removed by Cursor automatically

// 2. Remove hooks from global hooks.json
// Removes any hook entries containing "cursor-bird" in the command path (handles all versions)
try {
    const homeDir = getHomeDirectory();
    if (homeDir) {
        const globalHooksFile = path.join(homeDir, '.cursor', 'hooks.json');
        if (fs.existsSync(globalHooksFile)) {
            try {
                const content = fs.readFileSync(globalHooksFile, 'utf-8');
                const hooks = JSON.parse(content) as HooksJson;
                
                let modified = false;
                let removedCount = 0;
                
                // Remove beforeSubmitPrompt hooks
                if (hooks.hooks?.beforeSubmitPrompt) {
                    const toRemove = hooks.hooks.beforeSubmitPrompt.filter(h => 
                        h.command && h.command.includes(EXTENSION_NAME)
                    );
                    if (toRemove.length > 0) {
                        toRemove.forEach(h => console.warn(`  Removing start hook: ${h.command}`));
                        hooks.hooks.beforeSubmitPrompt = hooks.hooks.beforeSubmitPrompt.filter(h => 
                            !(h.command && h.command.includes(EXTENSION_NAME))
                        );
                        modified = true;
                        removedCount += toRemove.length;
                        console.warn(`✓ Removed ${toRemove.length} beforeSubmitPrompt hook(s) from global hooks.json`);
                    }
                }
                
                // Remove stop hooks
                if (hooks.hooks?.stop) {
                    const toRemove = hooks.hooks.stop.filter(h => 
                        h.command && h.command.includes(EXTENSION_NAME)
                    );
                    if (toRemove.length > 0) {
                        toRemove.forEach(h => console.warn(`  Removing stop hook: ${h.command}`));
                        hooks.hooks.stop = hooks.hooks.stop.filter(h => 
                            !(h.command && h.command.includes(EXTENSION_NAME))
                        );
                        modified = true;
                        removedCount += toRemove.length;
                        console.warn(`✓ Removed ${toRemove.length} stop hook(s) from global hooks.json`);
                    }
                }
                
                if (modified) {
                    fs.writeFileSync(globalHooksFile, JSON.stringify(hooks, null, 2));
                    console.warn(`✓ Updated global hooks.json: ${globalHooksFile}`);
                    cleanupCount += removedCount;
                } else {
                    console.warn('  No cursor-bird hooks found in global hooks.json');
                }
            } catch (parseErr) {
                console.error(`  ✗ Failed to parse global hooks.json:`, parseErr);
            }
        } else {
            console.warn('  No global hooks.json found');
        }
    }
} catch (err) {
    console.error('✗ Error cleaning up global hooks.json:', err);
}

// 3. Clean up workspace status files (BEST EFFORT)
// NOTE: process.cwd() may not be the user's workspace during uninstall.
// This cleanup will work if the uninstall runs from the workspace directory,
// but may miss files if run from elsewhere. This is acceptable - the deactivate()
// function handles cleanup in normal cases, and status files are harmless if orphaned.
try {
    const workspaceFolder = process.cwd();
    const workspaceStatusFile = path.join(workspaceFolder, '.cursor', 'cursor-bird-status.json');
    const workspaceTempFile = workspaceStatusFile + '.tmp';
    
    if (fs.existsSync(workspaceStatusFile)) {
        try {
            fs.unlinkSync(workspaceStatusFile);
            console.warn(`✓ Removed workspace status file: ${workspaceStatusFile}`);
            cleanupCount++;
        } catch (fileErr) {
            console.error(`  ✗ Failed to remove workspace status file:`, fileErr);
            }
        }
        
    if (fs.existsSync(workspaceTempFile)) {
        try {
            fs.unlinkSync(workspaceTempFile);
            console.warn(`✓ Removed workspace temp file: ${workspaceTempFile}`);
            cleanupCount++;
        } catch (fileErr) {
            console.error(`  ✗ Failed to remove workspace temp file:`, fileErr);
        }
    }
} catch (err) {
    // Workspace might not exist, that's fine
    console.warn('  No workspace status files to clean up');
}

console.warn('');
console.warn(`Cursor Bird: Uninstall cleanup complete (${cleanupCount} items cleaned)`);
console.warn('Note: The extension directory itself will be removed by Cursor.');

