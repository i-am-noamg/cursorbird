import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { TextDecoder } from 'util';

// Constants
const PANEL_REVEAL_DELAY_MS = 100;
const STATUS_FILE_READ_DELAY_MS = 100;
const NONCE_BYTES = 16;

// Type definitions for messages and data structures
interface StatusFileData {
    activeCount: number;
    lastUpdate: number;
}

interface WebviewMessage {
    type: 'tabPressedToStart' | 'updateBestScore';
    bestScore?: number;
}

interface HooksJson {
    version: number;
    hooks: {
        beforeSubmitPrompt?: Array<{ command: string }>;
        stop?: Array<{ command: string }>;
    };
}

interface HookCheckResult {
    exists: boolean;
    location?: 'workspace' | 'global';
    hookPaths?: {
        start?: string;
        stop?: string;
    };
}

interface HookSetupResult {
    success: boolean;
    message: string;
    hookScriptPath?: string;
}

interface ScriptEnsureResult {
    success: boolean;
    scriptPath?: string;
}

// Helper function to format log messages with timestamps
function formatLogMessage(message: string): string {
    const now = new Date();
    const timestamp = now.toISOString();
    return `[${timestamp}] ${message}`;
}

// Wrapper for output channel that adds timestamps
function log(outputChannel: vscode.OutputChannel, message: string): void {
    outputChannel.appendLine(formatLogMessage(message));
}

// Type definitions for configuration
interface GameConfig {
    // Physics
    gravity: number;
    flapVelocity: number;
    pipeSpeed: number;
    pipeSpawnInterval: number;
    // Pipes
    pipeGap: number;
    pipeWidth: number;
    pipeMargin: number;
    // Bird
    birdRadius: number;
    birdStartXRatio: number;
    // Visual
    skyColor: string;
    groundColor: string;
    groundHeight: number;
    birdColor: string;
    pipeColor: string;
    scoreFont: string;
    // Controls
    flapKey: string;
}

type ViewColumnName = 'One' | 'Two' | 'Three' | 'Four' | 'Five' | 'Six' | 'Seven' | 'Eight' | 'Nine' | 'Active' | 'Beside';

interface BehaviorConfig {
    webviewColumn: string; // Note: Cursor returns string, not the union type
    pollingInterval: number;
    staleThreshold: number;
    autoShow: boolean;
}

// Helper function to get game configuration from Cursor settings
function getGameConfig(): GameConfig {
    const config = vscode.workspace.getConfiguration('cursorBird');
    return {
        // Physics
        gravity: config.get('physics.gravity', 0.5),
        flapVelocity: config.get('physics.flapVelocity', -8),
        pipeSpeed: config.get('physics.pipeSpeed', 3),
        pipeSpawnInterval: config.get('physics.pipeSpawnInterval', 90),
        
        // Pipes
        pipeGap: config.get('pipes.gap', 120),
        pipeWidth: config.get('pipes.width', 60),
        pipeMargin: config.get('pipes.margin', 40),
        
        // Bird
        birdRadius: config.get('bird.radius', 12),
        birdStartXRatio: config.get('bird.startPosition', 0.25),
        
        // Visual
        skyColor: config.get('visual.skyColor', '#87CEEB'),
        groundColor: config.get('visual.groundColor', '#7ec850'),
        groundHeight: config.get('visual.groundHeight', 40),
        birdColor: config.get('visual.birdColor', '#FFD93D'),
        pipeColor: config.get('visual.pipeColor', '#2ecc71'),
        scoreFont: config.get('visual.scoreFont', 'bold 24px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif'),
        
        // Controls
        flapKey: config.get('controls.flapKey', 'Tab')
    };
}

// Helper function to get behavior configuration
function getBehaviorConfig(): BehaviorConfig {
    const config = vscode.workspace.getConfiguration('cursorBird');
    return {
        webviewColumn: config.get('behavior.webviewColumn', 'Beside'),
        pollingInterval: config.get('behavior.pollingInterval', 2000),
        staleThreshold: config.get('behavior.staleThreshold', 30000),
        autoShow: config.get('behavior.autoShow', true)
    };
}

class AgentTracker {
    private activeAgentCount = 0;
    private readonly onChange: (hasActiveAgents: boolean) => void;
    private statusFileWatcher: vscode.FileSystemWatcher | undefined;
    private pollingInterval: NodeJS.Timeout | undefined;
    private outputChannel: vscode.OutputChannel;

    constructor(
        private readonly context: vscode.ExtensionContext,
        outputChannel: vscode.OutputChannel,
        onChange: (hasActiveAgents: boolean) => void
    ) {
        this.onChange = onChange;
        this.outputChannel = outputChannel;
        this.startWatching();
    }

    private startWatching(): void {
        const statusFile = this.getStatusFile();
        if (!statusFile) {
            log(this.outputChannel, 'ERROR: Could not determine status file path');
            return;
        }

        log(this.outputChannel, `Watching status file: ${statusFile}`);

        // Ensure directory exists
        const statusDir = path.dirname(statusFile);
        if (!fs.existsSync(statusDir)) {
            fs.mkdirSync(statusDir, { recursive: true });
            log(this.outputChannel, `Created status directory: ${statusDir}`);
        }

        // Watch for file changes
        this.statusFileWatcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(path.dirname(statusFile), path.basename(statusFile))
        );

        this.statusFileWatcher.onDidChange(() => {
            log(this.outputChannel, 'Status file changed (onDidChange)');
            this.readStatusFile();
        });
        this.statusFileWatcher.onDidCreate(() => {
            log(this.outputChannel, 'Status file created (onDidCreate)');
            this.readStatusFile();
        });

        // Initial read
        this.readStatusFile();

        // Also poll periodically as backup (configurable interval)
        const behaviorConfig = getBehaviorConfig();
        this.pollingInterval = setInterval(() => this.readStatusFile(), behaviorConfig.pollingInterval);
    }

    private getStatusFile(): string | undefined {
        // Note: For multi-root workspaces, we use the first workspace folder
        // This is a known limitation - hooks will only track in the primary workspace
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
            return path.join(workspaceFolder.uri.fsPath, '.cursor', 'cursor-bird-status.json');
        }
        // No workspace = no status file (extension requires workspace context)
        return undefined;
    }

    private readStatusFile(): void {
        const statusFile = this.getStatusFile();
        if (!statusFile) return;

        if (!fs.existsSync(statusFile)) {
            if (this.activeAgentCount > 0) {
                log(this.outputChannel, `Status file not found, resetting count from ${this.activeAgentCount} to 0`);
                this.activeAgentCount = 0;
                this.onChange(false);
            }
            return;
        }

        try {
            const content = fs.readFileSync(statusFile, 'utf-8');
            const data = JSON.parse(content) as StatusFileData;
            const count = typeof data.activeCount === 'number' ? data.activeCount : 0;
            
            if (count !== this.activeAgentCount) {
                log(this.outputChannel, `Agent count changed: ${this.activeAgentCount} → ${count}`);
                this.activeAgentCount = count;
                this.onChange(this.activeAgentCount > 0);
            }
        } catch (err) {
            const error = err as Error;
            log(this.outputChannel, `Error reading status file: ${error?.message || String(err)}`);
        }
    }

    public agentStarted(): void {
        this.updateStatusFile(1);
    }

    public agentStopped(): void {
        this.updateStatusFile(-1);
    }

    private updateStatusFile(delta: number): void {
        const statusFile = this.getStatusFile();
        if (!statusFile) return;

        const statusDir = path.dirname(statusFile);
        if (!fs.existsSync(statusDir)) {
            fs.mkdirSync(statusDir, { recursive: true });
        }

        let currentCount = 0;
        if (fs.existsSync(statusFile)) {
            try {
                const content = fs.readFileSync(statusFile, 'utf-8');
                const data = JSON.parse(content) as StatusFileData;
                currentCount = typeof data.activeCount === 'number' ? data.activeCount : 0;
            } catch {
                // Invalid JSON, start fresh
            }
        }

        const newCount = Math.max(0, currentCount + delta);
        // Atomic write: write to temp file, then rename
        const tempFile = statusFile + '.tmp';
        try {
            const statusData: StatusFileData = { activeCount: newCount, lastUpdate: Date.now() };
            fs.writeFileSync(tempFile, JSON.stringify(statusData, null, 2));
            fs.renameSync(tempFile, statusFile);
        } catch (err) {
            const error = err as Error;
            log(this.outputChannel, `Error writing status file: ${error.message}`);
            // Cleanup temp file if it exists
            if (fs.existsSync(tempFile)) {
                try { fs.unlinkSync(tempFile); } catch {
                    // Ignore cleanup errors
                }
            }
        }
        
        // Trigger read to update UI
        setTimeout(() => this.readStatusFile(), STATUS_FILE_READ_DELAY_MS);
    }

    public dispose(): void {
        if (this.statusFileWatcher) {
            this.statusFileWatcher.dispose();
        }
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
    }
}

class WebviewManager {
    private panel: vscode.WebviewPanel | undefined;
    private isPaused = true;
    private bestScore = 0;
    private outputChannel: vscode.OutputChannel;
    private readonly storageKey: string;
    private readonly storage: vscode.Memento;
    private configChangeListener: vscode.Disposable | undefined;

    constructor(private readonly context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) {
        this.outputChannel = outputChannel;
        
        // Use workspace-specific storage for best score (workspace-isolated)
        // Falls back to global storage if no workspace folder exists
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
            this.storage = context.workspaceState;
            this.storageKey = 'cursorBirdBestScore';
            log(this.outputChannel, `Using workspace-specific storage for: ${workspaceFolder.uri.fsPath}`);
        } else {
            this.storage = context.globalState;
            this.storageKey = 'cursorBirdBestScore';
            log(this.outputChannel, `Using global storage (no workspace folder)`);
        }
        
        // Load best score from storage
        this.bestScore = this.storage.get<number>(this.storageKey, 0);
        log(this.outputChannel, `Best score loaded from storage: ${this.bestScore}`);
        
        // Listen for configuration changes
        this.configChangeListener = vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('cursorBird')) {
                log(this.outputChannel, 'Configuration changed, updating game');
                this.sendConfigToGame();
            }
        });
    }
    
    private getViewColumn(): vscode.ViewColumn {
        const behaviorConfig = getBehaviorConfig();
        const columnName = behaviorConfig.webviewColumn;
        
        // Map string name to ViewColumn enum, with type safety
        const columnMap: Record<ViewColumnName, vscode.ViewColumn> = {
            'One': vscode.ViewColumn.One,
            'Two': vscode.ViewColumn.Two,
            'Three': vscode.ViewColumn.Three,
            'Four': vscode.ViewColumn.Four,
            'Five': vscode.ViewColumn.Five,
            'Six': vscode.ViewColumn.Six,
            'Seven': vscode.ViewColumn.Seven,
            'Eight': vscode.ViewColumn.Eight,
            'Nine': vscode.ViewColumn.Nine,
            'Active': vscode.ViewColumn.Active,
            'Beside': vscode.ViewColumn.Beside
        };
        
        // Check if column name is valid
        if (columnName in columnMap) {
            return columnMap[columnName as ViewColumnName];
        }
        
        // Fallback to Beside with warning for invalid values
        log(this.outputChannel, `WARNING: Invalid webview column name "${columnName}", falling back to "Beside"`);
        return vscode.ViewColumn.Beside;
    }
    
    private sendConfigToGame(): void {
        if (this.panel) {
            const gameConfig = getGameConfig();
            log(this.outputChannel, `Sending game config to webview`);
            this.postMessage({ type: 'updateConfig', config: gameConfig });
        }
    }

    public showPaused(): void {
        const viewColumn = this.getViewColumn();
        
        if (!this.panel) {
            this.createPanel();
            // Ensure panel gets focus after creation
            setTimeout(() => {
                this.panel?.reveal(viewColumn, false); // false = take focus
            }, PANEL_REVEAL_DELAY_MS);
        } else {
            this.panel.reveal(viewColumn, false); // false = take focus
        }
        this.isPaused = true;
        this.postMessage({ type: 'pause' });
    }

    public startRunning(): void {
        const viewColumn = this.getViewColumn();
        
        if (!this.panel) {
            this.createPanel();
        }
        this.isPaused = false;
        this.postMessage({ type: 'start' });
        this.panel?.reveal(viewColumn, false); // false = take focus
    }
    
    public dispose(): void {
        if (this.configChangeListener) {
            this.configChangeListener.dispose();
        }
        this.stopAndDispose();
    }

    public async resetBestScore(): Promise<void> {
        const currentBest = this.bestScore;
        const action = await vscode.window.showWarningMessage(
            `Reset best score? Current best: ${currentBest}`,
            { modal: true },
            'Reset'
        );
        
        if (action === 'Reset') {
            this.bestScore = 0;
            await this.storage.update(this.storageKey, 0);
            log(this.outputChannel, `Best score reset from ${currentBest} to 0`);
            
            // Update the game if it's running
            if (this.panel) {
                this.postMessage({ type: 'resetBestScore' });
            }
            
            vscode.window.showInformationMessage('Best score has been reset to 0');
        }
    }

    public stopAndDispose(): void {
        if (this.panel) {
            this.panel.dispose();
            this.panel = undefined;
        }
        this.isPaused = true;
    }

    public toggle(): void {
        if (this.panel && this.panel.visible) {
            // Panel is open, close it
            this.stopAndDispose();
        } else {
            // Panel is closed or not visible, show it
            this.showPaused();
        }
    }

    private createPanel(): void {
        const viewColumn = this.getViewColumn();
        
        const panel = vscode.window.createWebviewPanel(
            'cursorBird',
            'Cursor Bird',
            viewColumn,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );
        this.panel = panel;
        
        // Set bootstrap HTML immediately, then load full HTML asynchronously
        panel.webview.html = this.getBootstrapHtml(panel.webview);
        this.loadFullHtml(panel.webview);

        // Reveal immediately to ensure focus
        panel.reveal(viewColumn, false); // false = take focus

        panel.webview.onDidReceiveMessage((msg: WebviewMessage) => {
            if (msg?.type === 'tabPressedToStart') {
                this.isPaused = false;
            } else if (msg?.type === 'updateBestScore' && typeof msg.bestScore === 'number') {
                log(this.outputChannel, `Best score updated: ${this.bestScore} → ${msg.bestScore}`);
                this.bestScore = msg.bestScore;
                this.storage.update(this.storageKey, this.bestScore);
            }
        });

        panel.onDidDispose(() => {
            this.panel = undefined;
            this.isPaused = true;
        });
    }

    private getBootstrapHtml(webview: vscode.Webview): string {
        const nonce = crypto.randomBytes(NONCE_BYTES).toString('base64');
        return `<!DOCTYPE html><html><head><meta charset="UTF-8" /><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Cursor Bird</title></head><body style="font-family: system-ui; padding: 16px;">Loading game...</body></html>`;
    }

    private async loadFullHtml(webview: vscode.Webview): Promise<void> {
        const uri = (p: string) => webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'game', p));
        const cssUri = uri('game.css').toString();
        const jsUri = uri('game.js').toString();
        const nonce = crypto.randomBytes(NONCE_BYTES).toString('base64');

        const distHtml = vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'game', 'game.html');
        const srcHtml = vscode.Uri.joinPath(this.context.extensionUri, 'src', 'game', 'game.html');
        const decoder = new TextDecoder('utf-8');

        const tryRead = async (u: vscode.Uri): Promise<string | undefined> => {
            try {
                const data = await vscode.workspace.fs.readFile(u);
                return decoder.decode(data);
            } catch {
                return undefined;
            }
        };

        try {
            let template = await tryRead(distHtml);
            if (!template) {
                template = await tryRead(srcHtml);
            }
            
            if (template && this.panel) {
                const filled = template
                    .replace(/\{\{cssUri\}\}/g, cssUri)
                    .replace(/\{\{jsUri\}\}/g, jsUri)
                    .replace(/\{\{nonce\}\}/g, nonce)
                    .replace(/\{\{cspSource\}\}/g, webview.cspSource);
                this.panel.webview.html = filled;
                // Send best score to webview immediately
                log(this.outputChannel, `Sending best score to webview: ${this.bestScore}`);
                this.postMessage({ type: 'setBestScore', bestScore: this.bestScore });
                
                // Send game configuration to webview
                this.sendConfigToGame();
            }
        } catch (err) {
            const error = err as Error;
            log(this.outputChannel, `Failed to load game HTML template: ${error?.message || String(err)}`);
        }
    }

    private postMessage(message: unknown): void {
        this.panel?.webview.postMessage(message);
    }
}

class HookManager {
    private outputChannel: vscode.OutputChannel;

    constructor(private readonly context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) {
        this.outputChannel = outputChannel;
    }

    public showOutput(): void {
        this.outputChannel.show();
    }

    private async checkNodeJs(): Promise<boolean> {
        try {
            // Dynamic import to avoid top-level require
            const childProcess = await import('child_process');
            const { exec } = childProcess;
            return new Promise<boolean>((resolve) => {
                exec('node --version', (error: Error | null, stdout: string) => {
                    if (error) {
                        resolve(false);
                    } else {
                        const version = stdout.trim();
                        log(this.outputChannel, `Node.js found: ${version}`);
                        resolve(true);
                    }
                });
            });
        } catch {
            return false;
        }
    }

    public async ensureScriptsExist(): Promise<ScriptEnsureResult> {
        try {
            const hookScriptPath = await this.getOrCreateHookScriptPath();
            if (!hookScriptPath) {
                return { success: false };
            }
            await this.ensureHookScript(hookScriptPath);
            return { success: true, scriptPath: hookScriptPath };
        } catch (err) {
            const error = err as Error;
            log(this.outputChannel, `Failed to ensure scripts: ${error?.message || String(err)}`);
            return { success: false };
        }
    }

    public async checkHooksExist(): Promise<HookCheckResult> {
        try {
            const hookScriptPath = await this.getOrCreateHookScriptPath();
            if (!hookScriptPath) {
                log(this.outputChannel, 'checkHooksExist: Could not determine hook script path');
                return { exists: false };
            }

            const extensionName = 'cursor-bird';
            const { startScript, stopScript } = this.getHookScriptPaths(hookScriptPath);
            log(this.outputChannel, `checkHooksExist: Looking for hooks matching extensionName="${extensionName}" or paths: start="${startScript}", stop="${stopScript}"`);
            const hookPaths: { start?: string; stop?: string } = {};
            
            // Check global hooks first (since auto-install now uses global)
            const homeDir = process.env.HOME || process.env.USERPROFILE;
            if (homeDir) {
                const globalHooksFile = path.join(homeDir, '.cursor', 'hooks.json');
                log(this.outputChannel, `checkHooksExist: Checking global hooks file: ${globalHooksFile}`);
                if (fs.existsSync(globalHooksFile)) {
                    try {
                        const content = fs.readFileSync(globalHooksFile, 'utf-8');
                        log(this.outputChannel, `checkHooksExist: Raw file content length: ${content.length} bytes`);
                        const hooks = JSON.parse(content) as HooksJson;
                        log(this.outputChannel, `checkHooksExist: Parsed JSON: ${JSON.stringify(hooks)}`);
                        log(this.outputChannel, `checkHooksExist: hooks.hooks exists: ${!!hooks.hooks}, type: ${typeof hooks.hooks}`);
                        log(this.outputChannel, `checkHooksExist: Found ${hooks.hooks?.beforeSubmitPrompt?.length || 0} beforeSubmitPrompt hooks, ${hooks.hooks?.stop?.length || 0} stop hooks`);
                        
                        const startHook = hooks.hooks?.beforeSubmitPrompt?.find(h => 
                            h.command && (h.command.includes(extensionName) || h.command === startScript)
                        );
                        const stopHook = hooks.hooks?.stop?.find(h => 
                            h.command && (h.command.includes(extensionName) || h.command === stopScript)
                        );
                        
                        log(this.outputChannel, `checkHooksExist: startHook found=${!!startHook}, stopHook found=${!!stopHook}`);
                        if (startHook) {
                            log(this.outputChannel, `checkHooksExist: startHook command="${startHook.command}"`);
                        }
                        if (stopHook) {
                            log(this.outputChannel, `checkHooksExist: stopHook command="${stopHook.command}"`);
                        }
                        
                        if (startHook && stopHook) {
                            hookPaths.start = startHook.command;
                            hookPaths.stop = stopHook.command;
                            log(this.outputChannel, `Found hooks in global: start=${startHook.command}, stop=${stopHook.command}`);
                            return { exists: true, location: 'global', hookPaths };
                        }
                    } catch (err) {
                        const error = err as Error;
                        log(this.outputChannel, `checkHooksExist: Error reading global hooks: ${error?.message || String(err)}`);
                    }
                } else {
                    log(this.outputChannel, `checkHooksExist: Global hooks file does not exist`);
                }
            }
            
            // Check workspace hooks (for users who manually set up workspace-specific hooks)
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (workspaceFolder) {
                const cursorDir = vscode.Uri.joinPath(workspaceFolder.uri, '.cursor');
                const hooksFile = vscode.Uri.joinPath(cursorDir, 'hooks.json');
                try {
                    const decoder = new TextDecoder('utf-8');
                    const data = await vscode.workspace.fs.readFile(hooksFile);
                    const content = decoder.decode(data);
                    const hooks = JSON.parse(content) as HooksJson;
                    const startHook = hooks.hooks?.beforeSubmitPrompt?.find(h => 
                        h.command && (h.command.includes(extensionName) || h.command === startScript)
                    );
                    const stopHook = hooks.hooks?.stop?.find(h => 
                        h.command && (h.command.includes(extensionName) || h.command === stopScript)
                    );
                    if (startHook && stopHook) {
                        hookPaths.start = startHook.command;
                        hookPaths.stop = stopHook.command;
                        log(this.outputChannel, `Found hooks in workspace: start=${startHook.command}, stop=${stopHook.command}`);
                        return { exists: true, location: 'workspace', hookPaths };
                    }
                } catch {
                    // File doesn't exist or invalid
                }
            }

            return { exists: false };
        } catch {
            return { exists: false };
        }
    }

    public async setupHooks(): Promise<HookSetupResult> {
        try {
            // Check if Node.js is available in PATH
            const hasNodeJs = await this.checkNodeJs();
            if (!hasNodeJs) {
                log(this.outputChannel, 'WARNING: Node.js not found in PATH - hooks require Node.js to work');
                return { 
                    success: false, 
                    message: 'Node.js is required for hooks but was not found in PATH. Please install Node.js and ensure it is in your system PATH, then try again.' 
                };
            }
            
            // Try to write scripts to extension directory first, fallback to user directory
            const hookScriptPath = await this.getOrCreateHookScriptPath();
            if (!hookScriptPath) {
                return { success: false, message: 'Could not determine where to write hook scripts' };
            }

            log(this.outputChannel, `Hook script path: ${hookScriptPath}`);
            this.outputChannel.show(true); // Ensure visible

            // Ensure hook script exists and is executable
            await this.ensureHookScript(hookScriptPath);
            log(this.outputChannel, 'Hook scripts created/verified');

            // Always use global hooks
            const homeDir = process.env.HOME || process.env.USERPROFILE;
            if (homeDir) {
                const globalCursorDir = path.join(homeDir, '.cursor');
                const globalHooksFile = path.join(globalCursorDir, 'hooks.json');
                await this.setupHooksFileGlobal(globalHooksFile, hookScriptPath);
                return { 
                    success: true, 
                    message: `Hooks configured globally: ${globalHooksFile}`,
                    hookScriptPath 
                };
            }

            return { success: false, message: 'Home directory not found' };
        } catch (err) {
            const error = err as Error;
            const errorMsg = error?.message || String(err);
            log(this.outputChannel, `Failed to set up hooks: ${errorMsg}`);
            return { success: false, message: `Error: ${errorMsg}` };
        }
    }

    private async getOrCreateHookScriptPath(): Promise<string | undefined> {
        const extPath = this.context.extensionPath;
        const scriptName = process.platform === 'win32' ? 'hook.bat' : 'hook.sh';
        const extScriptPath = path.join(extPath, 'dist', 'hook', scriptName);

        // Try extension directory first (works in dev, might be read-only in VSIX)
        try {
            const scriptDir = path.dirname(extScriptPath);
            if (!fs.existsSync(scriptDir)) {
                fs.mkdirSync(scriptDir, { recursive: true });
            }
            // Test write
            const testFile = path.join(scriptDir, '.test-write');
            fs.writeFileSync(testFile, 'test');
            fs.unlinkSync(testFile);
            return extScriptPath;
        } catch {
            // Extension dir is read-only, use user directory
            log(this.outputChannel, 'Extension directory is read-only, using user directory for scripts');
            const homeDir = process.env.HOME || process.env.USERPROFILE;
            if (homeDir) {
                const userScriptDir = path.join(homeDir, '.cursor', 'cursor-bird-hooks');
                if (!fs.existsSync(userScriptDir)) {
                    fs.mkdirSync(userScriptDir, { recursive: true });
                }
                return path.join(userScriptDir, scriptName);
            }
        }

        return undefined;
    }

    private generateNodeHookScript(delta: number): string {
        const deltaStr = delta > 0 ? `+ ${delta}` : `- ${Math.abs(delta)}`;
        return `const fs = require('fs');
const path = require('path');

// Read input from stdin to get workspace_roots
let inputData = '';
try {
  // Try to read from stdin (non-blocking)
  const fd = 0; // stdin
  const buffer = Buffer.alloc(1024 * 1024); // 1MB buffer
  const bytesRead = fs.readSync(fd, buffer, 0, buffer.length, null);
  if (bytesRead > 0) {
    inputData = buffer.toString('utf8', 0, bytesRead);
  }
} catch (err) {
  // stdin not available or empty, that's ok
}

// Parse workspace from input JSON or fallback to cwd
let workspacePath = process.cwd();
if (inputData) {
  try {
    const input = JSON.parse(inputData);
    if (input.workspace_roots && input.workspace_roots.length > 0) {
      workspacePath = input.workspace_roots[0];
    }
  } catch (err) {
    // Invalid JSON, use cwd
  }
}

// Sanity check: ensure we're in a workspace (not home directory, not root)
const homeDir = process.env.HOME || process.env.USERPROFILE || '';
// Check for root paths: Unix '/', Windows drive roots like 'C:\\' or 'C:/', UNC paths '\\\\'
const isRootPath = workspacePath === '/' || /^[A-Za-z]:[\\/]?$/.test(workspacePath) || workspacePath === '\\\\';
const isInWorkspace = workspacePath && workspacePath !== homeDir && !isRootPath;

if (!isInWorkspace) {
  // Not in a workspace context - nothing to do
  process.exit(0);
}

// Use workspace-specific status file
const statusFile = path.join(workspacePath, '.cursor', 'cursor-bird-status.json');

try {
  let data = { activeCount: 0, lastUpdate: Date.now() };
  
  // Ensure directory exists
  const dir = path.dirname(statusFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Read existing status if available
  if (fs.existsSync(statusFile)) {
    try {
      const content = fs.readFileSync(statusFile, 'utf-8');
      data = JSON.parse(content);
    } catch (err) {
      // Invalid JSON, start fresh
      console.error('Cursor Bird: Failed to parse status file:', err.message);
    }
  }
  
  // Update count
  data.activeCount = Math.max(0, (data.activeCount || 0) ${deltaStr});
  data.lastUpdate = Date.now();
  
  // Atomic write
  const tempFile = statusFile + '.tmp';
  fs.writeFileSync(tempFile, JSON.stringify(data, null, 2));
  fs.renameSync(tempFile, statusFile);
} catch (err) {
  console.error('Cursor Bird hook error:', err.message);
  process.exit(0); // Don't fail the parent process
}
`;
    }

    private async ensureHookScript(scriptPath: string): Promise<void> {
        const scriptDir = path.dirname(scriptPath);
        if (!fs.existsSync(scriptDir)) {
            fs.mkdirSync(scriptDir, { recursive: true });
        }

        const isWindows = process.platform === 'win32';

        // Generate hook scripts using shared function
        const nodeScriptPath = path.join(path.dirname(scriptPath), 'hook-node.js');
        const stopNodeScriptPath = path.join(path.dirname(scriptPath), 'hook-stop-node.js');
        
        const nodeScriptContent = this.generateNodeHookScript(1);  // +1 for start
        const stopNodeScriptContent = this.generateNodeHookScript(-1);  // -1 for stop

        // Helper function to write file only if content changed
        const writeFileIfChanged = (filePath: string, newContent: string): boolean => {
            if (fs.existsSync(filePath)) {
                try {
                    const existingContent = fs.readFileSync(filePath, 'utf-8');
                    if (existingContent === newContent) {
                        return false; // No change needed
                    }
                } catch {
                    // If we can't read it, we'll overwrite it
                }
            }
            fs.writeFileSync(filePath, newContent);
            return true; // File was written
        };

        // Write Node.js scripts only if changed
        writeFileIfChanged(nodeScriptPath, nodeScriptContent);
        writeFileIfChanged(stopNodeScriptPath, stopNodeScriptContent);

        // Create wrapper scripts that call Node.js
        // Convert backslashes to forward slashes (Node.js accepts forward slashes on all platforms)
        const nodeScriptPathEscaped = nodeScriptPath.replace(/\\/g, '/');
        const stopNodeScriptPathEscaped = stopNodeScriptPath.replace(/\\/g, '/');
        
        const scriptContent = isWindows
            ? `@echo off\r\nnode "${nodeScriptPathEscaped}"\r\n`
            : `#!/bin/sh\nnode "${nodeScriptPathEscaped}"\n`;

        // Stop script that decrements active count
        const stopScriptPath = scriptPath.replace(/hook\.(sh|bat)$/, `hook-stop.${isWindows ? 'bat' : 'sh'}`);
        const stopScriptContent = isWindows
            ? `@echo off\r\nnode "${stopNodeScriptPathEscaped}"\r\n`
            : `#!/bin/sh\nnode "${stopNodeScriptPathEscaped}"\n`;

        writeFileIfChanged(scriptPath, scriptContent);
        writeFileIfChanged(stopScriptPath, stopScriptContent);

        if (!isWindows) {
            if (fs.existsSync(scriptPath)) {
                fs.chmodSync(scriptPath, 0o755);
            }
            if (fs.existsSync(stopScriptPath)) {
                fs.chmodSync(stopScriptPath, 0o755);
            }
        }
    }

    private getStatusFilePath(): string {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
            return path.join(workspaceFolder.uri.fsPath, '.cursor', 'cursor-bird-status.json');
        }
        const homeDir = process.env.HOME || process.env.USERPROFILE || '';
        return path.join(homeDir, '.cursor', 'cursor-bird-status.json');
    }

    private getHookScriptPaths(hookScriptPath: string): { startScript: string; stopScript: string } {
        const isWindows = process.platform === 'win32';
        const startScript = hookScriptPath;
        const stopScript = hookScriptPath.replace(/hook\.(sh|bat)$/, `hook-stop.${isWindows ? 'bat' : 'sh'}`);
        return { startScript, stopScript };
    }

    private checkHooksExistInConfig(hooks: HooksJson, extensionName: string, startScript: string, stopScript: string): boolean {
        const startExists = hooks.hooks?.beforeSubmitPrompt?.some(h => 
            h.command && (h.command.includes(extensionName) || h.command === startScript)
        );
        const stopExists = hooks.hooks?.stop?.some(h => 
            h.command && (h.command.includes(extensionName) || h.command === stopScript)
        );
        return Boolean(startExists && stopExists);
    }

    private addMissingHooks(hooks: HooksJson, extensionName: string, startScript: string, stopScript: string): boolean {
        if (!hooks.hooks.beforeSubmitPrompt) {
            hooks.hooks.beforeSubmitPrompt = [];
        }
        if (!hooks.hooks.stop) {
            hooks.hooks.stop = [];
        }

        const startExists = hooks.hooks.beforeSubmitPrompt?.some(h => 
            h.command && (h.command.includes(extensionName) || h.command === startScript)
        );
        const stopExists = hooks.hooks.stop?.some(h => 
            h.command && (h.command.includes(extensionName) || h.command === stopScript)
        );

        let modified = false;
        if (!startExists) {
            hooks.hooks.beforeSubmitPrompt.push({ command: startScript });
            modified = true;
        }
        if (!stopExists) {
            hooks.hooks.stop.push({ command: stopScript });
            modified = true;
        }

        return modified;
    }

    private async setupHooksFile(hooksFile: vscode.Uri, hookScriptPath: string): Promise<void> {
        const decoder = new TextDecoder('utf-8');
        let hooks: HooksJson = { version: 1, hooks: {} };

        try {
            const data = await vscode.workspace.fs.readFile(hooksFile);
            const content = decoder.decode(data);
            hooks = JSON.parse(content) as HooksJson;
            if (!hooks.hooks) {
                hooks.hooks = {};
            }
        } catch {
            // File doesn't exist, create directory
            const cursorDir = vscode.Uri.joinPath(hooksFile, '..');
            try {
                await vscode.workspace.fs.createDirectory(cursorDir);
            } catch {
                // Directory might already exist
            }
        }

        const { startScript, stopScript } = this.getHookScriptPaths(hookScriptPath);
        const extensionName = 'cursor-bird';
        
        // Add missing hooks
        const modified = this.addMissingHooks(hooks, extensionName, startScript, stopScript);

        if (modified) {
            const encoder = new TextEncoder();
            await vscode.workspace.fs.writeFile(hooksFile, encoder.encode(JSON.stringify(hooks, null, 2)));
            log(this.outputChannel, `Updated hooks.json: added missing hooks`);
        } else {
            log(this.outputChannel, `Hooks already correctly configured, skipping update`);
        }
    }

    private async setupHooksFileGlobal(hooksFilePath: string, hookScriptPath: string): Promise<void> {
        let hooks: HooksJson = { version: 1, hooks: {} };

        if (fs.existsSync(hooksFilePath)) {
            try {
                const content = fs.readFileSync(hooksFilePath, 'utf-8');
                hooks = JSON.parse(content) as HooksJson;
                if (!hooks.hooks) {
                    hooks.hooks = {};
                }
            } catch {
                // Invalid JSON, start fresh
            }
        } else {
            // Ensure .cursor directory exists
            const cursorDir = path.dirname(hooksFilePath);
            if (!fs.existsSync(cursorDir)) {
                fs.mkdirSync(cursorDir, { recursive: true });
            }
        }

        const { startScript, stopScript } = this.getHookScriptPaths(hookScriptPath);
        const extensionName = 'cursor-bird';
        
        // Add missing hooks
        const modified = this.addMissingHooks(hooks, extensionName, startScript, stopScript);

        if (modified) {
            fs.writeFileSync(hooksFilePath, JSON.stringify(hooks, null, 2));
            log(this.outputChannel, `Updated hooks.json: added missing hooks`);
        } else {
            log(this.outputChannel, `Hooks already correctly configured, skipping update`);
        }
    }
}

export async function activate(context: vscode.ExtensionContext) {
    // Create shared output channel - do this FIRST
    const outputChannel = vscode.window.createOutputChannel('Cursor Bird');
    outputChannel.clear(); // Clear any old logs
    log(outputChannel, '=== Extension activated ===');
    log(outputChannel, `Extension path: ${context.extensionPath}`);
    log(outputChannel, `Node version: ${process.version}`);
    log(outputChannel, `Platform: ${process.platform}`);
    
    try {
        log(outputChannel, 'Checking for workspace folders...');
        // Validate that a workspace folder exists
        if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
            log(outputChannel, 'No workspace folder found - extension requires a workspace');
            vscode.window.showWarningMessage(
                'Cursor Bird requires an open workspace folder to function. Please open a folder and reload the extension.',
                'Open Folder'
            ).then((action) => {
                if (action === 'Open Folder') {
                    vscode.commands.executeCommand('vscode.openFolder');
                }
            });
            // Still register commands so they don't fail if invoked
            context.subscriptions.push(
                vscode.commands.registerCommand('cursorBird.toggle', () => {
                    vscode.window.showWarningMessage('Cursor Bird requires an open workspace folder.');
                }),
                vscode.commands.registerCommand('cursorBird.start', () => {
                    vscode.window.showWarningMessage('Cursor Bird requires an open workspace folder.');
                }),
                vscode.commands.registerCommand('cursorBird.stop', () => {}),
                vscode.commands.registerCommand('cursorBird.setupHooks', () => {
                    vscode.window.showWarningMessage('Cursor Bird requires an open workspace folder.');
                }),
                vscode.commands.registerCommand('cursorBird.resetBestScore', () => {
                    vscode.window.showWarningMessage('Cursor Bird requires an open workspace folder.');
                }),
                vscode.commands.registerCommand('cursorBird.openSettings', () => {
                    vscode.commands.executeCommand('workbench.action.openSettings', '@ext:cursorbird.cursor-bird');
                })
            );
            return;
        }

        log(outputChannel, `Found ${vscode.workspace.workspaceFolders.length} workspace folder(s)`);
        log(outputChannel, `Primary workspace: ${vscode.workspace.workspaceFolders[0].uri.fsPath}`);

        const webviews = new WebviewManager(context, outputChannel);
        log(outputChannel, 'WebviewManager created');
        
        const hookManager = new HookManager(context, outputChannel);
        log(outputChannel, 'HookManager created');
        
        log(outputChannel, 'Creating AgentTracker...');
        const tracker = new AgentTracker(context, outputChannel, (hasActiveAgents) => {
            log(outputChannel, `onChange called: hasActiveAgents=${hasActiveAgents}`);
            const behaviorConfig = getBehaviorConfig();
            if (hasActiveAgents) {
                // Show paused on first detection if autoShow is enabled
                if (behaviorConfig.autoShow) {
                    webviews.showPaused();
                }
            } else {
                webviews.stopAndDispose();
            }
        });
        log(outputChannel, 'AgentTracker created');

        // Register commands FIRST so they're available immediately
        context.subscriptions.push(
            vscode.commands.registerCommand('cursorBird.toggle', () => {
                webviews.toggle();
            }),
            vscode.commands.registerCommand('cursorBird.start', () => {
                webviews.startRunning();
            }),
            vscode.commands.registerCommand('cursorBird.stop', () => {
                webviews.stopAndDispose();
            }),
            vscode.commands.registerCommand('cursorBird.setupHooks', async () => {
                const setupResult = await hookManager.setupHooks();
                if (setupResult.success) {
                    vscode.window.showInformationMessage(`✓ ${setupResult.message}`);
                } else {
                    vscode.window.showErrorMessage(`✗ ${setupResult.message}`);
                    hookManager.showOutput();
                }
            }),
            vscode.commands.registerCommand('cursorBird.resetBestScore', async () => {
                await webviews.resetBestScore();
            }),
            vscode.commands.registerCommand('cursorBird.openSettings', () => {
                vscode.commands.executeCommand('workbench.action.openSettings', '@ext:cursorbird.cursor-bird');
            }),
            { dispose: () => tracker.dispose() },
            { dispose: () => webviews.dispose() }
        );

        // Always ensure hook scripts exist (even if hooks.json is already configured)
        log(outputChannel, 'Ensuring hook scripts exist...');
        const scriptsResult = await hookManager.ensureScriptsExist();
        if (!scriptsResult.success) {
            log(outputChannel, 'WARNING: Failed to ensure hook scripts exist');
        } else if (scriptsResult.scriptPath) {
            log(outputChannel, `Hook scripts ensured at: ${scriptsResult.scriptPath}`);
        }

        // Try to set up hooks automatically (after commands are registered)
        // Only set up hooks.json if hooks don't already exist - check first before calling setupHooks
        log(outputChannel, 'Checking hooks configuration...');
        const hooksCheckResult = await hookManager.checkHooksExist();
        if (!hooksCheckResult.exists) {
            log(outputChannel, 'Hooks not found, setting up...');
            const setupResult = await hookManager.setupHooks();
            log(outputChannel, `Hook setup result: success=${setupResult.success}, message=${setupResult.message}`);

            if (!setupResult.success) {
            // Show notification with instructions
            const action = await vscode.window.showWarningMessage(
                `Cursor Bird: ${setupResult.message}. Would you like to set up hooks manually?`,
                'Open README',
                'Show Output',
                'Try Setup Again'
            );
            
            if (action === 'Open README') {
                vscode.commands.executeCommand('markdown.showPreview', vscode.Uri.joinPath(context.extensionUri, 'README.md'));
            } else if (action === 'Show Output') {
                hookManager.showOutput();
            } else if (action === 'Try Setup Again') {
                vscode.commands.executeCommand('cursorBird.setupHooks');
            }
        } else {
            vscode.window.showInformationMessage(
                `Cursor Bird: ${setupResult.message}. Please restart Cursor for hooks to take effect.`,
                'Restart Now'
            ).then((action) => {
                if (action === 'Restart Now') {
                    vscode.commands.executeCommand('workbench.action.reloadWindow');
                }
            });
        }
        } else {
            log(outputChannel, `Hooks already exist (${hooksCheckResult.location}), skipping hooks.json update`);
            if (hooksCheckResult.hookPaths) {
                log(outputChannel, `  Hook paths: start=${hooksCheckResult.hookPaths.start}, stop=${hooksCheckResult.hookPaths.stop}`);
                // Verify the scripts exist at those paths
                if (hooksCheckResult.hookPaths.start && !fs.existsSync(hooksCheckResult.hookPaths.start)) {
                    log(outputChannel, `  WARNING: Start hook script not found at: ${hooksCheckResult.hookPaths.start}`);
                }
                if (hooksCheckResult.hookPaths.stop && !fs.existsSync(hooksCheckResult.hookPaths.stop)) {
                    log(outputChannel, `  WARNING: Stop hook script not found at: ${hooksCheckResult.hookPaths.stop}`);
                }
            }
        }
        
        log(outputChannel, '=== Extension activation complete ===');
    } catch (err) {
        const error = err as Error;
        log(outputChannel, `ERROR during activation: ${error?.message || String(err)}`);
        log(outputChannel, error?.stack || '');
        outputChannel.show();
    }
}

/**
 * Deactivate function - called on extension disable, uninstall, or Cursor shutdown
 * 
 * This function cleans up runtime state files that should not persist after
 * the extension stops running. The uninstall.ts script handles permanent cleanup
 * of hooks and user directory files.
 * 
 * This function cleans:
 * - Workspace status files ({workspace}/.cursor/cursor-bird-status.json)
 * - Temp files (.tmp variants)
 * 
 * Note: No global status files are used - everything is workspace-specific.
 * 
 * See uninstall.ts for additional cleanup that happens only on uninstall.
 */
export function deactivate() {
    // Clean up status files and temp files (workspace only)
    try {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
            const statusFile = path.join(workspaceFolder.uri.fsPath, '.cursor', 'cursor-bird-status.json');
            const tempFile = statusFile + '.tmp';
            
            if (fs.existsSync(statusFile)) {
                fs.unlinkSync(statusFile);
            }
            if (fs.existsSync(tempFile)) {
                fs.unlinkSync(tempFile);
            }
        }
    } catch (err) {
        // Silent fail on deactivate - extension is shutting down anyway
    }
}



