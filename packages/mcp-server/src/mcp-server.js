#!/usr/bin/env node
/**
 * SmartLangGuard MCP Server
 * 
 * Implements the Model Context Protocol (MCP) for integration with
 * Claude Desktop, Cursor, Cline, Continue, and other AI tools.
 * 
 * Transport: stdio
 * Protocol version: 2024-11-05
 * 
 * Tools exposed:
 *   - fix_text       : Fix mistyped text
 *   - fix_clipboard  : Fix current clipboard contents
 *   - register_license: Activate a license token
 *   - license_status : Check current license
 * 
 * @module mcp-server
 */

'use strict';

const core = require('@smartlangguard/core');

const PROTOCOL_VERSION = '2024-11-05';

// ─── JSON-RPC over stdio ──────────────────────────────────────────────────────

const readline = require('readline');

// NOTE: readline interface is created lazily inside startMcpServer() so that
// simply requiring this module (e.g. from tests) does NOT keep the Node.js
// event loop alive via an open stdin handle. Previously this was created at
// module-load time which caused jest to hang indefinitely on this test file.
let rl = null;

let initialized = false;

// ─── Tool Definitions ─────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'fix_text',
    description: 'Fix text that was mistyped due to wrong keyboard layout (Arabic/English mismatch). For example, "high hofhv;" becomes "اهلا اخبارك". Use this whenever the user wrote text that looks like gibberish but is actually a different keyboard layout.',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'The mistyped text to fix'
        },
        direction: {
          type: 'string',
          enum: ['auto', 'en-to-ar', 'ar-to-en'],
          default: 'auto',
          description: 'Force conversion direction. Use "auto" to detect automatically.'
        },
        useAI: {
          type: 'boolean',
          default: true,
          description: 'Enable AI scoring for ambiguous cases (requires Pro license).'
        }
      },
      required: ['text']
    }
  },
  {
    name: 'fix_clipboard',
    description: 'Reads the system clipboard, fixes any keyboard layout mistakes in it, and writes the corrected text back to the clipboard. Useful when the user has copied text from another app.',
    inputSchema: {
      type: 'object',
      properties: {
        direction: {
          type: 'string',
          enum: ['auto', 'en-to-ar', 'ar-to-en'],
          default: 'auto'
        }
      }
    }
  },
  {
    name: 'register_license',
    description: 'Activate a SmartLangGuard license token to enable Pro features (AI scoring, multi-device, cloud sync).',
    inputSchema: {
      type: 'object',
      properties: {
        token: {
          type: 'string',
          description: 'License token (format: slg_xxxxxxxxxxxxxxxxxxxxxxxx)'
        }
      },
      required: ['token']
    }
  },
  {
    name: 'license_status',
    description: 'Check the current SmartLangGuard license status and tier.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
];

// ─── Tool Handlers ────────────────────────────────────────────────────────────

async function handleFixText(args) {
  if (!args?.text) {
    return { content: [{ type: 'text', text: 'Error: text parameter is required' }], isError: true };
  }
  try {
    const result = await core.fixText(args.text, {
      direction: args.direction || 'auto',
      useAI: args.useAI !== false
    });
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          original: result.original,
          corrected: result.corrected,
          direction: result.direction,
          confidence: result.score,
          source: result.source
        }, null, 2)
      }]
    };
  } catch (err) {
    return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
  }
}

async function handleFixClipboard(args) {
  try {
    // Try to read clipboard via system command
    const { readClipboard, writeClipboard } = require('./clipboard');
    const clipboardText = await readClipboard();
    if (!clipboardText) {
      return { content: [{ type: 'text', text: 'Clipboard is empty' }] };
    }

    const result = await core.fixText(clipboardText, {
      direction: args.direction || 'auto'
    });

    await writeClipboard(result.corrected);

    return {
      content: [{
        type: 'text',
        text: `Clipboard updated:\nOriginal: ${clipboardText}\nFixed:    ${result.corrected}\nDirection: ${result.direction} | Confidence: ${result.score}%`
      }]
    };
  } catch (err) {
    return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
  }
}

async function handleRegisterLicense(args) {
  if (!args?.token) {
    return { content: [{ type: 'text', text: 'Error: token parameter is required' }], isError: true };
  }
  const result = await core.activateLicense(args.token);
  if (result.success) {
    return {
      content: [{
        type: 'text',
        text: `License activated!\nTier: ${result.license.tier}\nFeatures: ${result.license.features?.join(', ')}\nExpires: ${new Date(result.license.expires_at).toLocaleString()}`
      }]
    };
  }
  return { content: [{ type: 'text', text: `Failed: ${result.error}` }], isError: true };
}

async function handleLicenseStatus() {
  const status = core.getLicenseStatus();
  return {
    content: [{
      type: 'text',
      text: JSON.stringify(status, null, 2)
    }]
  };
}

const HANDLERS = {
  fix_text: handleFixText,
  fix_clipboard: handleFixClipboard,
  register_license: handleRegisterLicense,
  license_status: handleLicenseStatus
};

// ─── JSON-RPC Dispatch ────────────────────────────────────────────────────────

async function handleMessage(message) {
  const { jsonrpc, id, method, params } = message;

  // Notification (no id) - ignore responses
  if (id === undefined || id === null) {
    return;
  }

  try {
    let result;

    switch (method) {
      case 'initialize':
        initialized = true;
        result = {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: {
            tools: { listChanged: false },
            resources: {},
            prompts: {}
          },
          serverInfo: {
            name: 'smartlangguard',
            version: core.VERSION
          }
        };
        break;

      case 'initialized':
        // Acknowledgment notification - no response needed
        return;

      case 'tools/list':
        result = { tools: TOOLS };
        break;

      case 'tools/call':
        if (!initialized) {
          throw new Error('Server not initialized. Call initialize first.');
        }
        const toolName = params?.name;
        const toolArgs = params?.arguments || {};
        const handler = HANDLERS[toolName];
        if (!handler) {
          throw new Error(`Unknown tool: ${toolName}`);
        }
        result = await handler(toolArgs);
        break;

      case 'ping':
        result = {};
        break;

      case 'shutdown':
        result = null;
        setTimeout(() => process.exit(0), 100);
        break;

      default:
        sendError(id, -32601, `Method not found: ${method}`);
        return;
    }

    sendResponse(id, result);
  } catch (err) {
    sendError(id, -32603, err.message);
  }
}

function sendResponse(id, result) {
  const message = JSON.stringify({ jsonrpc: '2.0', id, result });
  process.stdout.write(message + '\n');
}

function sendError(id, code, message) {
  const response = JSON.stringify({
    jsonrpc: '2.0',
    id,
    error: { code, message }
  });
  process.stdout.write(response + '\n');
}

// ─── Server Lifecycle ─────────────────────────────────────────────────────────

async function startMcpServer(options = {}) {
  await core.init({
    endpoint: options.endpoint,
    telemetryEnabled: true
  });

  process.stderr.write(`SmartLangGuard MCP Server v${core.VERSION} starting...\n`);

  // Create the readline interface lazily here so that requiring the module
  // (e.g. from tests) does not keep the event loop alive.
  rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  rl.on('line', (line) => {
    if (!line.trim()) return;
    try {
      const message = JSON.parse(line);
      handleMessage(message);
    } catch (err) {
      process.stderr.write(`Parse error: ${err.message}\n`);
    }
  });

  rl.on('close', () => {
    core.shutdown();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    core.shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    core.shutdown();
    process.exit(0);
  });
}

module.exports = { startMcpServer, TOOLS, PROTOCOL_VERSION };

// ─── Auto-start when run directly (not when imported) ─────────────────────────

if (require.main === module) {
  startMcpServer({
    endpoint: process.env.SMARTLANGGUARD_API || 'http://localhost:4000'
  }).catch(err => {
    process.stderr.write(`Fatal: ${err.message}\n`);
    process.exit(1);
  });
}
