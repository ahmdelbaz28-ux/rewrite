/**
 * SmartLangGuard VS Code Extension
 * 
 * Wraps the SmartLangGuard CLI binary for use inside VS Code.
 * Provides:
 *   - Fix selected text (command + context menu)
 *   - Fix clipboard contents
 *   - License activation UI
 *   - Status bar showing license tier
 *   - **Real-time typing detection** with sound alerts
 *   - **Quick-fix last word** with single keystroke (Ctrl+Shift+Backspace)
 */

import * as vscode from 'vscode';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// Core typing detector (compiled from @smartlangguard/core)
// We can't import ESM directly, so we'll inline the detection logic via the CLI

let statusBar: vscode.StatusBarItem;
let alertStatusBar: vscode.StatusBarItem;
let outputChannel: vscode.OutputChannel;
let cliPath: string | null = null;

// Real-time detection state
let lastDetection: {
  word: string;
  suggestion: string;
  direction: string;
  range: vscode.Range;
  timestamp: number;
} | null = null;

let typingTimer: NodeJS.Timeout | null = null;
let currentWordBuffer = '';
let lastAlertTime = 0;
const ALERT_COOLDOWN_MS = 2000;
const DETECTION_DEBOUNCE_MS = 250;

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

  // Status bar (license tier)
  statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBar.command = 'smartlangguard.showStatus';
  statusBar.text = '$(check) SmartLangGuard';
  statusBar.tooltip = 'SmartLangGuard - Click to view status';
  statusBar.show();
  context.subscriptions.push(statusBar);

  // Alert status bar (shows when wrong layout detected)
  alertStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99);
  alertStatusBar.command = 'smartlangguard.fixLastWord';
  alertStatusBar.text = '$(warning) Wrong layout! [Ctrl+Shift+Backspace to fix]';
  alertStatusBar.tooltip = 'SmartLangGuard detected wrong keyboard layout. Click or press Ctrl+Shift+Backspace to fix.';
  alertStatusBar.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
  // Hidden by default
  context.subscriptions.push(alertStatusBar);

  // Commands
  context.subscriptions.push(
    vscode.commands.registerCommand('smartlangguard.fixSelection', fixSelection),
    vscode.commands.registerCommand('smartlangguard.fixClipboard', fixClipboard),
    vscode.commands.registerCommand('smartlangguard.activateLicense', activateLicense),
    vscode.commands.registerCommand('smartlangguard.showStatus', showStatus),
    vscode.commands.registerCommand('smartlangguard.fixLastWord', fixLastWord),
    vscode.commands.registerCommand('smartlangguard.toggleRealTime', toggleRealTime),
    vscode.commands.registerCommand('smartlangguard.testSound', testSound),
    vscode.commands.registerCommand('smartlangguard.selectSound', selectSound)
  );

  // Watch for config changes
  vscode.workspace.onDidChangeConfiguration(updateConfig);
  
  // Real-time document change listener
  vscode.workspace.onDidChangeTextDocument(handleDocumentChange);
  vscode.window.onDidChangeActiveTextEditor(handleEditorChange);

  updateConfig();
  updateStatusBar();

  outputChannel.appendLine(`SmartLangGuard extension activated (v${context.extension.packageJSON.version})`);
  outputChannel.appendLine(`  Real-time detection: ${isRealTimeEnabled() ? 'ENABLED' : 'disabled'}`);
  outputChannel.appendLine(`  Sound: ${getSelectedSound()}`);
}

// ─── Configuration ────────────────────────────────────────────────────────────

function isRealTimeEnabled(): boolean {
  return vscode.workspace.getConfiguration('smartlangguard').get('realTimeDetection', true);
}

function getSelectedSound(): string {
  return vscode.workspace.getConfiguration('smartlangguard').get('sound', 'ding');
}

function getSoundVolume(): number {
  return vscode.workspace.getConfiguration('smartlangguard').get('soundVolume', 0.5);
}

function getSensitivity(): 'low' | 'medium' | 'high' {
  return vscode.workspace.getConfiguration('smartlangguard').get('sensitivity', 'medium');
}

function updateConfig() {
  // Re-read config; nothing else needed since we read on-demand
  outputChannel.appendLine(`  Config updated: realTime=${isRealTimeEnabled()}, sound=${getSelectedSound()}`);
}

// ─── Real-time Detection ──────────────────────────────────────────────────────

function handleEditorChange(editor: vscode.TextEditor | undefined) {
  // Reset typing state when switching editors
  currentWordBuffer = '';
  lastDetection = null;
  hideAlert();
}

function handleDocumentChange(event: vscode.TextDocumentChangeEvent) {
  if (!isRealTimeEnabled()) return;
  if (!event.contentChanges.length) return;
  
  // Skip if not the active editor's document
  const activeEditor = vscode.window.activeTextEditor;
  if (!activeEditor || event.document !== activeEditor.document) return;
  
  // Get the inserted text
  const change = event.contentChanges[0];
  const insertedText = change.text;
  
  // Only process actual typing (not large paste operations)
  if (insertedText.length > 10) {
    currentWordBuffer = '';
    return;
  }
  
  // Update word buffer
  for (const ch of insertedText) {
    if (/\s/.test(ch)) {
      currentWordBuffer = '';
    } else if (ch === '\n' || ch === '\r') {
      currentWordBuffer = '';
    } else {
      currentWordBuffer += ch;
    }
  }
  
  // Debounce
  if (typingTimer) clearTimeout(typingTimer);
  typingTimer = setTimeout(() => analyzeCurrentWord(activeEditor, change), DETECTION_DEBOUNCE_MS);
}

async function analyzeCurrentWord(editor: vscode.TextEditor, lastChange: vscode.TextDocumentContentChangeEvent) {
  if (currentWordBuffer.length < 2) {
    hideAlert();
    return;
  }
  
  // Use the CLI to analyze the current word
  try {
    const result = await runCli(['fix', currentWordBuffer, '--format', 'json', '--no-ai']);
    const data = JSON.parse(result);
    
    // Check if it looks like a wrong-layout mistake
    // (the CLI returns the conversion - if score is high, it's likely a mistake)
    if (data.score >= 50 && data.corrected !== currentWordBuffer) {
      // Calculate the range of the typed word
      const cursorPos = lastChange.range.start.translate(0, lastChange.text.length);
      const wordStart = cursorPos.translate(0, -currentWordBuffer.length);
      const range = new vscode.Range(wordStart, cursorPos);
      
      // Cooldown check
      const now = Date.now();
      const shouldAlert = (now - lastAlertTime) > ALERT_COOLDOWN_MS;
      
      lastDetection = {
        word: currentWordBuffer,
        suggestion: data.corrected,
        direction: data.direction,
        range,
        timestamp: now
      };
      
      showAlert();
      
      if (shouldAlert) {
        lastAlertTime = now;
        playAlertSound();
        outputChannel.appendLine(`  [Alert] "${currentWordBuffer}" → "${data.corrected}" (${data.direction}, ${data.score}%)`);
      }
    } else {
      hideAlert();
    }
  } catch (err: any) {
    // Silently fail - don't disrupt typing
  }
}

function showAlert() {
  alertStatusBar.show();
}

function hideAlert() {
  alertStatusBar.hide();
  lastDetection = null;
}

function playAlertSound() {
  const sound = getSelectedSound();
  if (sound === 'off') return;
  
  // Play via CLI: smartlangguard sound play <sound>
  // The CLI handles cross-platform playback
  try {
    const child = spawn(cliPath || 'smartlangguard', ['sound', 'play', sound], {
      stdio: 'ignore',
      detached: true
    });
    child.unref();
  } catch (err) {
    // Silently fail
  }
}

// ─── Quick Fix Last Word ──────────────────────────────────────────────────────

async function fixLastWord() {
  const editor = vscode.window.activeTextEditor;
  if (!editor || !lastDetection) {
    // Fallback: detect from current cursor position
    await fixLastWordFallback(editor);
    return;
  }
  
  // Check if detection is recent (within 10 seconds)
  if (Date.now() - lastDetection.timestamp > 10000) {
    await fixLastWordFallback(editor);
    return;
  }
  
  try {
    await editor.edit(editBuilder => {
      editBuilder.replace(lastDetection!.range, lastDetection!.suggestion);
    });
    
    outputChannel.appendLine(`  [Quick Fix] "${lastDetection.word}" → "${lastDetection.suggestion}"`);
    vscode.window.showInformationMessage(`✓ Fixed: ${lastDetection.word} → ${lastDetection.suggestion}`);
    
    hideAlert();
  } catch (err: any) {
    vscode.window.showErrorMessage(`Quick fix failed: ${err.message}`);
  }
}

async function fixLastWordFallback(editor: vscode.TextEditor | undefined) {
  if (!editor) {
    vscode.window.showWarningMessage('No active editor');
    return;
  }
  
  // Get the word before the cursor
  const document = editor.document;
  const cursor = editor.selection.active;
  const lineText = document.lineAt(cursor.line).text;
  const textBeforeCursor = lineText.substring(0, cursor.character);
  
  // Find the last word
  const match = textBeforeCursor.match(/(\S+)\s*$/);
  if (!match) {
    vscode.window.showInformationMessage('No word found before cursor');
    return;
  }
  
  const word = match[1];
  const wordStart = new vscode.Position(cursor.line, cursor.character - word.length);
  const wordEnd = new vscode.Position(cursor.line, cursor.character);
  const range = new vscode.Range(wordStart, wordEnd);
  
  try {
    const result = await runCli(['fix', word, '--format', 'json', '--no-ai']);
    const data = JSON.parse(result);
    
    if (data.corrected === word) {
      vscode.window.showInformationMessage('No fix needed for current word');
      return;
    }
    
    await editor.edit(editBuilder => {
      editBuilder.replace(range, data.corrected);
    });
    
    outputChannel.appendLine(`  [Quick Fix Fallback] "${word}" → "${data.corrected}"`);
    vscode.window.showInformationMessage(`✓ Fixed: ${word} → ${data.corrected}`);
  } catch (err: any) {
    vscode.window.showErrorMessage(`Quick fix failed: ${err.message}`);
  }
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

async function toggleRealTime() {
  const config = vscode.workspace.getConfiguration('smartlangguard');
  const current = config.get('realTimeDetection', true);
  await config.update('realTimeDetection', !current, vscode.ConfigurationTarget.Global);
  
  vscode.window.showInformationMessage(
    `SmartLangGuard: Real-time detection ${!current ? 'ENABLED' : 'DISABLED'}`
  );
  
  if (current) {
    hideAlert();
  }
}

async function testSound() {
  const sound = getSelectedSound();
  if (sound === 'off') {
    vscode.window.showInformationMessage('Sound is currently set to "off"');
    return;
  }
  
  playAlertSound();
  vscode.window.showInformationMessage(`Playing test sound: ${sound}`);
}

async function selectSound() {
  const sounds = ['off', 'beep', 'ding', 'chime', 'soft-pop', 'click', 'double-beep'];
  const descriptions: Record<string, string> = {
    'off': 'No sound (silent)',
    'beep': 'Short square-wave beep (~150ms) - attention-grabbing',
    'ding': 'Soft sine-wave ding (~300ms) - pleasant, recommended',
    'chime': 'Ascending 3-note chime (~500ms) - musical',
    'soft-pop': 'Very soft damped pop (~200ms) - least intrusive',
    'click': 'Short click (~80ms) - very subtle',
    'double-beep': 'Double beep (~250ms) - more urgent'
  };
  
  const items = sounds.map(s => ({
    label: s,
    description: descriptions[s],
    picked: s === getSelectedSound()
  }));
  
  const choice = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select alert sound',
    title: 'SmartLangGuard: Sound Selection'
  });
  
  if (choice) {
    const config = vscode.workspace.getConfiguration('smartlangguard');
    await config.update('sound', choice.label, vscode.ConfigurationTarget.Global);
    
    if (choice.label !== 'off') {
      // Play a preview
      const oldSound = getSelectedSound();
      // Temporarily set to chosen sound for preview
      // Actually, playAlertSound already reads from config, so this works
      playAlertSound();
    }
    
    vscode.window.showInformationMessage(`Sound set to: ${choice.label}`);
  }
}

// ─── CLI Binary Discovery ─────────────────────────────────────────────────────

function findCliBinary(): string | null {
  const config = vscode.workspace.getConfiguration('smartlangguard');
  const configuredPath = config.get<string>('cliPath');
  if (configuredPath && fs.existsSync(configuredPath)) {
    return configuredPath;
  }

  const platform = os.platform();
  const arch = os.arch();
  const binaryName = platform === 'win32' ? 'smartlangguard.exe' : 'smartlangguard';
  const platformFolder = `${platform}-${arch}`;
  
  const bundledPath = path.join(__dirname, '..', 'bin', platformFolder, binaryName);
  if (fs.existsSync(bundledPath)) {
    return bundledPath;
  }

  const npmGlobalPath = path.join(os.homedir(), '.npm-global', 'bin', binaryName);
  if (fs.existsSync(npmGlobalPath)) return npmGlobalPath;

  return binaryName;
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
    
    const realTimeIcon = isRealTimeEnabled() ? '🔊' : '🔇';
    const icon = status.valid ? '$(check)' : '$(circle-slash)';
    statusBar.text = `${icon} SmartLangGuard: ${status.tier} ${realTimeIcon}`;
    statusBar.tooltip = `Tier: ${status.tier}\nFeatures: ${status.features?.join(', ')}\nReal-time: ${isRealTimeEnabled() ? 'ON' : 'OFF'}\nSound: ${getSelectedSound()}`;
  } catch {
    statusBar.text = '$(circle-slash) SmartLangGuard';
  }
}

// ─── Deactivation ─────────────────────────────────────────────────────────────

export function deactivate() {
  if (typingTimer) clearTimeout(typingTimer);
}
