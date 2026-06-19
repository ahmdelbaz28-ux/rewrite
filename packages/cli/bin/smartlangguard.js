#!/usr/bin/env node
/**
 * SmartLangGuard CLI
 * 
 * Cross-platform command-line tool for fixing keyboard layout mistakes.
 * 
 * Usage:
 *   smartlangguard fix "high hofhv;"           # fix a string
 *   echo "high" | smartlangguard fix            # fix from stdin (pipe)
 *   smartlangguard fix file.txt -o output.txt   # fix file contents
 *   smartlangguard interactive                  # interactive REPL
 *   smartlangguard license activate <token>     # activate license
 *   smartlangguard license status                # check current license
 *   smartlangguard update check                  # check for updates
 *   smartlangguard update apply                  # apply update
 *   smartlangguard config set telemetry false    # disable telemetry
 * 
 * @license PROPRIETARY
 */

'use strict';

const core = require('@smartlangguard/core');
const { Command } = require('commander');
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const os = require('os');
const pkg = require('../package.json');

const CONFIG_FILE = path.join(os.homedir(), '.smartlangguard', 'cli-config.json');

// ─── Config ───────────────────────────────────────────────────────────────────

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
  } catch {}
  return {};
}

function saveConfig(config) {
  const dir = path.dirname(CONFIG_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), { mode: 0o600 });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function initCore() {
  const config = loadConfig();
  await core.init({
    endpoint: config.endpoint || process.env.SMARTLANGGUARD_API,
    telemetryEnabled: config.telemetry !== false,
    autoUpdate: config.autoUpdate !== false,
    licenseToken: config.licenseToken
  });
}

function formatResult(result, format = 'text') {
  if (format === 'json') {
    return JSON.stringify(result, null, 2);
  }
  if (format === 'text-with-meta') {
    return `${result.corrected}\n\n[direction: ${result.direction} | confidence: ${result.score}% | source: ${result.source}]`;
  }
  return result.corrected;
}

// ─── Commands ─────────────────────────────────────────────────────────────────

const program = new Command();

program
  .name('smartlangguard')
  .description('Fix keyboard layout mistakes (Arabic ↔ English)')
  .version(pkg.version);

// ── fix ───────────────────────────────────────────────────────────────────────

program
  .command('fix [text]')
  .description('Fix mistyped text. If no text or file is given, reads from stdin.')
  .option('-f, --file <path>', 'read text from file')
  .option('-o, --output <path>', 'write result to file')
  .option('-d, --direction <dir>', 'force direction (auto, en-to-ar, ar-to-en)', 'auto')
  .option('--no-ai', 'disable AI scoring')
  .option('--format <fmt>', 'output format (text, json, text-with-meta)', 'text')
  .action(async (text, opts) => {
    await initCore();

    let input = text;
    if (!input && opts.file) {
      input = fs.readFileSync(opts.file, 'utf8');
    } else if (!input && !process.stdin.isTTY) {
      // Read from pipe
      input = await new Promise((resolve) => {
        let data = '';
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', chunk => data += chunk);
        process.stdin.on('end', () => resolve(data.trim()));
        process.stdin.on('error', () => resolve(''));
      });
    }

    if (!input) {
      console.error('Error: No input provided. Pass text, use --file, or pipe via stdin.');
      process.exit(1);
    }

    try {
      const result = await core.fixText(input, {
        direction: opts.direction,
        useAI: opts.ai
      });

      const output = formatResult(result, opts.format);

      if (opts.output) {
        fs.writeFileSync(opts.output, output, 'utf8');
        console.log(`✓ Result written to ${opts.output}`);
      } else {
        console.log(output);
      }
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    } finally {
      core.shutdown();
    }
  });

// ── interactive ───────────────────────────────────────────────────────────────

program
  .command('interactive')
  .alias('repl')
  .description('Start interactive REPL mode')
  .option('-d, --direction <dir>', 'force direction', 'auto')
  .action(async (opts) => {
    await initCore();

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'smartlangguard> '
    });

    console.log('SmartLangGuard Interactive Mode');
    console.log('Type text and press Enter to fix. Type "exit" or Ctrl+D to quit.\n');

    rl.prompt();

    rl.on('line', async (line) => {
      const input = line.trim();
      if (input === 'exit' || input === 'quit') {
        rl.close();
        return;
      }
      if (!input) {
        rl.prompt();
        return;
      }
      try {
        const result = await core.fixText(input, {
          direction: opts.direction
        });
        console.log(`→ ${result.corrected}`);
        console.log(`  [${result.direction} | ${result.score}% confidence | ${result.source}]`);
      } catch (err) {
        console.error(`  Error: ${err.message}`);
      }
      rl.prompt();
    });

    rl.on('close', () => {
      core.shutdown();
      console.log('\nGoodbye!');
      process.exit(0);
    });
  });

// ── license ───────────────────────────────────────────────────────────────────

const licenseCmd = program
  .command('license')
  .description('Manage license');

licenseCmd
  .command('activate <token>')
  .description('Activate a license token')
  .action(async (token) => {
    await initCore();
    const result = await core.activateLicense(token);
    if (result.success) {
      const config = loadConfig();
      config.licenseToken = token;
      saveConfig(config);
      console.log('✓ License activated successfully');
      console.log(`  Tier: ${result.license.tier}`);
      console.log(`  Features: ${result.license.features?.join(', ')}`);
      console.log(`  Expires: ${new Date(result.license.expires_at).toLocaleString()}`);
    } else {
      console.error(`✗ ${result.error}`);
      process.exit(1);
    }
    core.shutdown();
  });

licenseCmd
  .command('status')
  .description('Show current license status')
  .action(async () => {
    await initCore();
    const status = core.getLicenseStatus();
    console.log(JSON.stringify(status, null, 2));
    core.shutdown();
  });

licenseCmd
  .command('revoke')
  .description('Revoke current license')
  .action(async () => {
    const config = loadConfig();
    delete config.licenseToken;
    saveConfig(config);
    console.log('✓ License revoked (local only). Contact support to fully deactivate.)');
  });

// ── update ────────────────────────────────────────────────────────────────────

const updateCmd = program
  .command('update')
  .description('Manage updates');

updateCmd
  .command('check')
  .description('Check for available updates')
  .action(async () => {
    await initCore();
    try {
      const result = await core.checkForUpdate();
      if (result.updateAvailable) {
        console.log(`Update available: ${result.currentVersion} → ${result.latestVersion}`);
        if (result.forcedUpdate) {
          console.log('⚠ This update is required. Run `smartlangguard update apply`.');
        }
      } else {
        console.log(`You're on the latest version (${result.currentVersion}).`);
      }
    } catch (err) {
      console.error(`Error checking for updates: ${err.message}`);
    }
    core.shutdown();
  });

updateCmd
  .command('apply')
  .description('Apply available update')
  .action(async () => {
    await initCore();
    try {
      const result = await core.performUpdate({
        onProgress: (stage) => {
          const messages = {
            checking: 'Checking for updates...',
            downloading: 'Downloading update...',
            applying: 'Applying update...'
          };
          console.log(messages[stage] || stage);
        }
      });
      if (result.updated) {
        console.log(`✓ Updated to version ${result.version}`);
        if (result.requiresRestart) {
          console.log('Please restart SmartLangGuard to complete the update.');
        }
      } else {
        console.log('No update needed.');
      }
    } catch (err) {
      console.error(`✗ Update failed: ${err.message}`);
      process.exit(1);
    }
    core.shutdown();
  });

// ── config ────────────────────────────────────────────────────────────────────

const configCmd = program
  .command('config')
  .description('Manage CLI configuration');

configCmd
  .command('set <key> <value>')
  .description('Set a config value (endpoint, telemetry, autoUpdate)')
  .action(async (key, value) => {
    const config = loadConfig();
    const parsed = value === 'true' ? true : value === 'false' ? false : value;
    config[key] = parsed;
    saveConfig(config);
    console.log(`✓ ${key} = ${parsed}`);
  });

configCmd
  .command('get <key>')
  .description('Get a config value')
  .action((key) => {
    const config = loadConfig();
    console.log(config[key] ?? '');
  });

configCmd
  .command('list')
  .description('List all configuration')
  .action(() => {
    const config = loadConfig();
    console.log(JSON.stringify(config, null, 2));
  });

// ── mcp ───────────────────────────────────────────────────────────────────────

program
  .command('mcp')
  .description('Start MCP server (stdio transport) for AI tools integration')
  .option('--endpoint <url>', 'SaaS backend endpoint')
  .action(async (opts) => {
    process.env.SMARTLANGGUARD_MCP_MODE = 'true';
    const { startMcpServer } = require('@smartlangguard/mcp-server');
    await startMcpServer({ endpoint: opts.endpoint });
  });

// ── daemon ────────────────────────────────────────────────────────────────────

program
  .command('daemon')
  .description('Start background daemon (clipboard monitor + hotkey)')
  .option('--no-clipboard', 'disable clipboard monitoring')
  .option('--no-hotkey', 'disable global hotkey')
  .option('--enable-typing-monitor', 'enable system-wide typing monitor (requires permissions)')
  .action(async (opts) => {
    const { startDaemon } = require('@smartlangguard/daemon');
    await startDaemon({
      monitorClipboard: opts.clipboard,
      enableHotkey: opts.hotkey,
      enableTypingMonitor: opts.enableTypingMonitor || false
    });
  });

// ── sound ─────────────────────────────────────────────────────────────────────

const soundCmd = program
  .command('sound')
  .description('Manage alert sounds');

soundCmd
  .command('play [name]')
  .description('Play a sound (default: ding). Available: beep, ding, chime, soft-pop, click, double-beep, off')
  .option('--volume <n>', 'volume 0.0-1.0', '0.5')
  .action(async (name, opts) => {
    const { SoundPlayer } = require('@smartlangguard/core/src/sound-player');
    const player = new SoundPlayer({
      sound: name || 'ding',
      volume: parseFloat(opts.volume)
    });
    if (!name) {
      await player.play();
    } else if (name === 'off') {
      console.log('Sound is off');
    } else {
      await player.play(name);
    }
    // Give the OS a moment to start playback before exit
    setTimeout(() => process.exit(0), 300);
  });

soundCmd
  .command('list')
  .description('List all available sounds')
  .action(() => {
    const { SoundPlayer } = require('@smartlangguard/core/src/sound-player');
    const sounds = SoundPlayer.getAvailableSounds();
    console.log('Available sounds:');
    sounds.forEach(s => console.log(`  - ${s}`));
  });

soundCmd
  .command('export <name> <output>')
  .description('Export a sound as a WAV file')
  .action((name, output) => {
    const { SoundPlayer } = require('@smartlangguard/core/src/sound-player');
    const buffer = SoundPlayer.getSoundBuffer(name);
    if (!buffer) {
      console.error(`Unknown sound: ${name}`);
      process.exit(1);
    }
    require('fs').writeFileSync(output, buffer);
    console.log(`✓ ${name} exported to ${output} (${buffer.length} bytes)`);
  });

// ── typing ────────────────────────────────────────────────────────────────────

program
  .command('detect [text]')
  .description('Detect if text was typed in wrong keyboard layout')
  .option('--format <fmt>', 'output format (text, json)', 'text')
  .action((text, opts) => {
    const { detectWrongLayout, findAllMistakes } = require('@smartlangguard/core/src/typing-detector');
    
    if (!text) {
      // Read from stdin
      const data = require('fs').readFileSync(0, 'utf8').trim();
      text = data;
    }
    
    if (!text) {
      console.error('No text provided');
      process.exit(1);
    }
    
    const mistakes = findAllMistakes(text);
    
    if (opts.format === 'json') {
      console.log(JSON.stringify({
        text,
        mistakes_found: mistakes.length,
        mistakes
      }, null, 2));
    } else {
      if (mistakes.length === 0) {
        console.log('No layout mistakes detected.');
      } else {
        console.log(`Found ${mistakes.length} mistake(s):\n`);
        mistakes.forEach((m, i) => {
          console.log(`  ${i + 1}. "${m.word}" → "${m.suggestion}" (${m.direction}) [pos ${m.range[0]}-${m.range[1]}]`);
        });
      }
    }
  });


// ── Parse ─────────────────────────────────────────────────────────────────────

program.parseAsync(process.argv).catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
