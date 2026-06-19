/**
 * SmartLangGuard VS Code Extension
 * 
 * Wraps the SmartLangGuard CLI binary for use inside VS Code.
 * Provides:
 *   - Fix selected text (command + context menu)
 *   - Fix on type (optional, real-time)
 *   - Status bar showing license tier
 *   - License activation UI
 */

import * as vscode from 'vscode';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

let statusBar: vscode.StatusBarItem;
let outputChannel: vscode.OutputChannel;
let cliPath: string | null = null;

// ─── Activation ───────────────────────────────────────────────────────────────

export function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel('SmartLangGuard');
  context.subscriptions.push(outputChannel);

  // Find CLI binary
  cliPath = findCliBinary();
  if (!cliPath) {
    outputChannel.appendLine('⚠ SmartLangGuard CLI binary not found. Install it first:');
    outputChannel.appendLine('  npm install -g @smartlangguard/cli');
    vscode.window.showWarningMessage(
      'SmartLangGuard CLI not found. Run "npm install -g @smartlangguard/cli" then reload.'
    );
  } else {
    outputChannel.appendLine(`✓ Using CLI: ${cliPath}`);
  }

  // Status bar
  statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBar.command = 'smartlangguard.showStatus';
  statusBar.text = '$(check) SmartLangGuard';
  statusBar.tooltip = 'SmartLangGuard - Click to view status';
  statusBar.show();
  context.subscriptions.push(statusBar);

  // Commands
  context.subscriptions.push(
    vscode.commands.registerCommand('smartlangguard.fixSelection', fixSelection),
    vscode.commands.registerCommand('smartlangguard.fixClipboard', fixClipboard),
    vscode.commands.registerCommand('smartlangguard.activateLicense', activateLicense),
    vscode.commands.registerCommand('smartlangguard.showStatus', showStatus),
    vscode.commands.registerCommand('smartlangguard.fixOnType', fixOnType)
  );

  // Watch for config changes
  vscode.workspace.onDidChangeConfiguration(updateStatusBar);
  updateStatusBar();

  outputChannel.appendLine(`SmartLangGuard extension activated (v${context.extension.packageJSON.version})`);
}

// ─── CLI Binary Discovery ─────────────────────────────────────────────────────

function findCliBinary(): string | null {
  // 1. Check configured path
  const config = vscode.workspace.getConfiguration('smartlangguard');
  const configuredPath = config.get<string>('cliPath');
  if (configuredPath && fs.existsSync(configuredPath)) {
    return configuredPath;
  }

  // 2. Check bundled binary (in extension folder)
  const platform = os.platform();
  const arch = os.arch();
  const binaryName = platform === 'win32' ? 'smartlangguard.exe' : 'smartlangguard';
  const platformFolder = `${platform}-${arch}`;
  
  const bundledPath = path.join(__dirname, '..', 'bin', platformFolder, binaryName);
  if (fs.existsSync(bundledPath)) {
    return bundledPath;
  }

  // 3. Check global npm install
  const npmGlobalPath = path.join(os.homedir(), '.npm-global', 'bin', binaryName);
  if (fs.existsSync(npmGlobalPath)) return npmGlobalPath;

  // 4. Check PATH (fallback to command name)
  return binaryName; // let OS resolve it
}

async function runCli(args: string[], input?: string): Promise<string> {
  if (!cliPath) {
    throw new Error('SmartLangGuard CLI not found. Install it with: npm install -g @smartlangguard/cli');
  }

  return new Promise<string>((resolve, reject) => {
    const child = spawn(cliPath!, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: os.homedir()
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => { stdout += data.toString('utf8'); });
    child.stderr.on('data', (data) => { stderr += data.toString('utf8'); });

    if (input) {
      child.stdin.write(input, 'utf8');
      child.stdin.end();
    } else {
      child.stdin.end();
    }

    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error('SmartLangGuard CLI timed out (30s)'));
    }, 30000);

    child.on('error', (err) => {
      clearTimeout(timeout);
      reject(new Error(`Failed to start CLI: ${err.message}`));
    });

    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`CLI exited with code ${code}: ${stderr.trim()}`));
      }
    });
  });
}

// ─── Commands ─────────────────────────────────────────────────────────────────

async function fixSelection() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('No active editor');
    return;
  }

  const selection = editor.selection;
  if (selection.isEmpty) {
    vscode.window.showWarningMessage('Select some text to fix');
    return;
  }

  const text = editor.document.getText(selection);
  if (!text) return;

  try {
    const config = vscode.workspace.getConfiguration('smartlangguard');
    const direction = config.get<'auto' | 'en-to-ar' | 'ar-to-en'>('direction', 'auto');
    const useAI = config.get<boolean>('useAI', true);

    const args = ['fix', '--format', 'json', '--direction', direction];
    if (!useAI) args.push('--no-ai');

    const stdout = await runCli(args, text);
    const result = JSON.parse(stdout);

    await editor.edit(editBuilder => {
      editBuilder.replace(selection, result.corrected);
    });

    outputChannel.appendLine(
      `[Fix] "${text.substring(0, 50)}..." → "${result.corrected.substring(0, 50)}..." ` +
      `(${result.direction}, ${result.score}% confidence, ${result.source})`
    );

    if (result.score < 70) {
      const choice = await vscode.window.showInformationMessage(
        `SmartLangGuard: Low confidence (${result.score}%). Original was: "${text.substring(0, 30)}..."`,
        'Undo',
        'Keep'
      );
      if (choice === 'Undo') {
        await editor.edit(editBuilder => {
          editBuilder.replace(editor.selection, text);
        });
      }
    }
  } catch (err: any) {
    vscode.window.showErrorMessage(`SmartLangGuard error: ${err.message}`);
    outputChannel.appendLine(`[Error] ${err.message}`);
  }
}

async function fixClipboard() {
  try {
    const stdout = await runCli(['fix', '--format', 'json']);
    const result = JSON.parse(stdout);
    vscode.window.showInformationMessage(
      `SmartLangGuard: Clipboard fixed → "${result.corrected.substring(0, 40)}"`
    );
  } catch (err: any) {
    vscode.window.showErrorMessage(`SmartLangGuard: ${err.message}`);
  }
}

async function activateLicense() {
  const token = await vscode.window.showInputBox({
    prompt: 'Enter your SmartLangGuard license token',
    placeHolder: 'slg_xxxxxxxxxxxxxxxxxxxxxxxx',
    ignoreFocusOut: true,
    password: true
  });

  if (!token) return;

  try {
    const stdout = await runCli(['license', 'activate', token]);
    vscode.window.showInformationMessage('SmartLangGuard: License activated successfully!');
    updateStatusBar();
  } catch (err: any) {
    vscode.window.showErrorMessage(`License activation failed: ${err.message}`);
  }
}

async function showStatus() {
  try {
    const stdout = await runCli(['license', 'status']);
    const status = JSON.parse(stdout);
    
    const message = `Tier: ${status.tier}\nValid: ${status.valid}\nFeatures: ${status.features?.join(', ')}`;
    const choice = await vscode.window.showInformationMessage(
      `SmartLangGuard - ${status.tier.toUpperCase()}`,
      'Activate License',
      'Close'
    );
    if (choice === 'Activate License') {
      activateLicense();
    }
  } catch (err: any) {
    vscode.window.showErrorMessage(`Status check failed: ${err.message}`);
  }
}

async function fixOnType(event: vscode.TextDocumentChangeEvent) {
  // Optional: real-time fixing as user types
  // Disabled by default to avoid performance issues
  // TODO: implement debounced fixing
}

// ─── Status Bar ───────────────────────────────────────────────────────────────

async function updateStatusBar() {
  try {
    if (!cliPath) {
      statusBar.text = '$(warning) SmartLangGuard: CLI not found';
      statusBar.tooltip = 'CLI binary not installed';
      return;
    }
    
    const stdout = await runCli(['license', 'status']);
    const status = JSON.parse(stdout);
    
    const icon = status.valid ? '$(check)' : '$(circle-slash)';
    statusBar.text = `${icon} SmartLangGuard: ${status.tier}`;
    statusBar.tooltip = `Tier: ${status.tier}\nFeatures: ${status.features?.join(', ')}`;
  } catch {
    statusBar.text = '$(circle-slash) SmartLangGuard';
  }
}

// ─── Deactivation ─────────────────────────────────────────────────────────────

export function deactivate() {
  // Cleanup
}
