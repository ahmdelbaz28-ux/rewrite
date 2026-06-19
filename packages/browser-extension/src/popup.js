/**
 * SmartLangGuard Popup Script
 */

'use strict';

document.addEventListener('DOMContentLoaded', async () => {
  // Set version
  document.getElementById('version').textContent = `v${chrome.runtime.getManifest().version}`;

  // Check daemon status
  await checkStatus();

  // Load auto-fix toggle state
  await loadAutoFixToggle();

  // Setup event listeners
  document.getElementById('fix-btn').addEventListener('click', fixText);
  document.getElementById('copy-btn').addEventListener('click', copyResult);
  document.getElementById('autofix-toggle').addEventListener('click', toggleAutoFix);
  document.getElementById('options-btn').addEventListener('click', openOptions);

  // Auto-fix on Ctrl+Enter in textarea
  document.getElementById('input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      fixText();
    }
  });
});

async function checkStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getStatus' });
    if (response?.success) {
      const status = response.data;
      document.getElementById('status-dot').classList.add('online');
      document.getElementById('status-text').textContent = 'Daemon running';
      document.getElementById('status-tier').textContent = status.license?.tier?.toUpperCase() || 'FREE';
    } else {
      throw new Error('Daemon not reachable');
    }
  } catch (err) {
    document.getElementById('status-dot').classList.add('offline');
    document.getElementById('status-text').textContent = 'Daemon offline - run: smartlangguard daemon';
  }
}

async function loadAutoFixToggle() {
  const response = await chrome.runtime.sendMessage({ action: 'getConfig' });
  if (response?.success) {
    document.getElementById('autofix-toggle').classList.toggle('on', response.data?.autoFix);
  }
}

async function toggleAutoFix() {
  const response = await chrome.runtime.sendMessage({ action: 'toggleAutoFix' });
  if (response?.success) {
    document.getElementById('autofix-toggle').classList.toggle('on', response.data?.autofix);
  }
}

async function fixText() {
  const input = document.getElementById('input').value;
  if (!input) return;

  const btn = document.getElementById('fix-btn');
  btn.textContent = 'Fixing...';
  btn.disabled = true;

  try {
    const response = await chrome.runtime.sendMessage({ action: 'fixText', text: input });
    if (response?.success) {
      const data = response.data;
      document.getElementById('result-text').textContent = data.corrected;
      document.getElementById('result-meta').textContent = 
        `${data.direction} | ${data.score}% confidence | ${data.source}`;
      document.getElementById('result').classList.add('visible');
    } else {
      throw new Error(response?.error || 'Fix failed');
    }
  } catch (err) {
    document.getElementById('result-text').textContent = `Error: ${err.message}`;
    document.getElementById('result').classList.add('visible');
    document.getElementById('result').style.background = '#fef2f2';
    document.getElementById('result').style.borderColor = '#ef4444';
  } finally {
    btn.textContent = 'Fix';
    btn.disabled = false;
  }
}

async function copyResult() {
  const text = document.getElementById('result-text').textContent;
  if (!text) return;
  await navigator.clipboard.writeText(text);
  const btn = document.getElementById('copy-btn');
  const original = btn.textContent;
  btn.textContent = 'Copied!';
  setTimeout(() => { btn.textContent = original; }, 1500);
}

function openOptions() {
  chrome.runtime.openOptionsPage();
}
