#!/usr/bin/env node
/**
 * Uninstall cleanup script for Cursor Bird extension
 * 
 * This script is called when the extension is UNINSTALLED (not just disabled).
 * It cleans up files and configurations that persist outside the extension directory.
 * 
 * CLEANUP RESPONSIBILITIES:
 * 
 * This script (uninstall.ts):
 * - Hook scripts in user directory (~/.cursor/cursor-bird-hooks/)
 * - Hook entries in global hooks.json (~/.cursor/hooks.json)
 * - Hook entries in workspace hooks.json (.cursor/hooks.json)
 * - Workspace status files (as fallback if deactivate() didn't run)
 * - Temp files (as fallback if deactivate() didn't run)
 * 
 * The deactivate() function in extension.ts (runs on disable/uninstall/shutdown):
 * - Workspace status files ({workspace}/.cursor/cursor-bird-status.json)
 * - Temp files (.tmp variants)
 * 
 * Cursor automatically removes:
 * - Extension directory (including extension's dist/hook/ scripts)
 * - Extension state storage (best scores)
 * 
 * PATHS HANDLED:
 * - Global: ~/.cursor/ (HOME or USERPROFILE) - for hooks configuration only
 * - Workspace: {workspace}/.cursor/ (current working directory) - for status files
 * 
 * NOTE: All status files are workspace-only. No global status files are used.
 */
import * as fs from 'fs';
import * as path from 'path';

interface HooksJson {
    version: number;
    hooks: {
        beforeSubmitPrompt?: Array<{ command: string }>;
        stop?: Array<{ command: string }>;
    };
}

console.warn('Cursor Bird: Running uninstall cleanup...');

const extensionName = 'cursor-bird';
let cleanupCount = 0;

// 1. Remove hook scripts from user directory
try {
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    if (homeDir) {
        const userScriptDir = path.join(homeDir, '.cursor', 'cursor-bird-hooks');
        if (fs.existsSync(userScriptDir)) {
            try {
                fs.rmSync(userScriptDir, { recursive: true, force: true });
                console.warn(`✓ Removed hook script directory and all contents: ${userScriptDir}`);
                cleanupCount++;
            } catch (dirErr) {
                console.error(`  ✗ Failed to remove directory ${userScriptDir}:`, dirErr);
            }
        } else {
            console.warn('  No hook scripts directory found (may have been cleaned already)');
        }
    }
} catch (err) {
    console.error('✗ Error cleaning up hook scripts:', err);
}

// 2. Remove hooks from global hooks.json
try {
    const homeDir = process.env.HOME || process.env.USERPROFILE;
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
                    const originalLength = hooks.hooks.beforeSubmitPrompt.length;
                    hooks.hooks.beforeSubmitPrompt = hooks.hooks.beforeSubmitPrompt.filter(h => 
                        !(h.command && h.command.includes(extensionName))
                    );
                    const removed = originalLength - hooks.hooks.beforeSubmitPrompt.length;
                    if (removed > 0) {
                        modified = true;
                        removedCount += removed;
                        console.warn(`✓ Removed ${removed} beforeSubmitPrompt hook(s) from global hooks.json`);
                    }
                }
                
                // Remove stop hooks
                if (hooks.hooks?.stop) {
                    const originalLength = hooks.hooks.stop.length;
                    hooks.hooks.stop = hooks.hooks.stop.filter(h => 
                        !(h.command && h.command.includes(extensionName))
                    );
                    const removed = originalLength - hooks.hooks.stop.length;
                    if (removed > 0) {
                        modified = true;
                        removedCount += removed;
                        console.warn(`✓ Removed ${removed} stop hook(s) from global hooks.json`);
                    }
                }
                
                if (modified) {
                    fs.writeFileSync(globalHooksFile, JSON.stringify(hooks, null, 2));
                    console.warn(`✓ Updated global hooks.json: ${globalHooksFile}`);
                    cleanupCount += removedCount;
                } else {
                    console.warn('  No hooks found in global hooks.json (may have been cleaned already)');
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

// 3. Remove hooks from workspace hooks.json (current working directory)
try {
    const workspaceFolder = process.cwd();
    const hooksFile = path.join(workspaceFolder, '.cursor', 'hooks.json');
    if (fs.existsSync(hooksFile)) {
        try {
            const content = fs.readFileSync(hooksFile, 'utf-8');
            const hooks = JSON.parse(content) as HooksJson;
            
            let modified = false;
            let removedCount = 0;
            
            // Remove beforeSubmitPrompt hooks
            if (hooks.hooks?.beforeSubmitPrompt) {
                const originalLength = hooks.hooks.beforeSubmitPrompt.length;
                hooks.hooks.beforeSubmitPrompt = hooks.hooks.beforeSubmitPrompt.filter(h => 
                    !(h.command && h.command.includes(extensionName))
                );
                const removed = originalLength - hooks.hooks.beforeSubmitPrompt.length;
                if (removed > 0) {
                    modified = true;
                    removedCount += removed;
                    console.warn(`✓ Removed ${removed} beforeSubmitPrompt hook(s) from workspace hooks.json`);
                }
            }
            
            // Remove stop hooks
            if (hooks.hooks?.stop) {
                const originalLength = hooks.hooks.stop.length;
                hooks.hooks.stop = hooks.hooks.stop.filter(h => 
                    !(h.command && h.command.includes(extensionName))
                );
                const removed = originalLength - hooks.hooks.stop.length;
                if (removed > 0) {
                    modified = true;
                    removedCount += removed;
                    console.warn(`✓ Removed ${removed} stop hook(s) from workspace hooks.json`);
                }
            }
            
            if (modified) {
                fs.writeFileSync(hooksFile, JSON.stringify(hooks, null, 2));
                console.warn(`✓ Updated workspace hooks.json: ${hooksFile}`);
                cleanupCount += removedCount;
            }
        } catch (parseErr) {
            console.error(`  ✗ Failed to parse workspace hooks.json:`, parseErr);
        }
    } else {
        console.warn('  No workspace hooks.json found');
    }
    } catch (err) {
    // Workspace hooks might not exist, that's fine
    console.warn('  No workspace hooks to clean up');
}

// 4. Clean up workspace status files (fallback - deactivate() should have handled this)
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

