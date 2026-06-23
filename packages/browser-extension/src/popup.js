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
  
  // Load real-time detection toggle state
  await loadRealTimeToggle();
  
  // Load sound selection
  await loadSoundSelection();

  // Setup event listeners
  document.getElementById('fix-btn').addEventListener('click', fixText);
  document.getElementById('copy-btn').addEventListener('click', copyResult);
  document.getElementById('autofix-toggle').addEventListener('click', toggleAutoFix);
  document.getElementById('realtime-toggle').addEventListener('click', toggleRealTime);
  document.getElementById('sound-select').addEventListener('change', changeSound);
  document.getElementById('test-sound-btn').addEventListener('click', testSound);
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

// ─── Real-time detection toggle ────────────────────────────────────────────

async function loadRealTimeToggle() {
  const response = await chrome.runtime.sendMessage({ action: 'getConfig' });
  if (response?.success) {
    document.getElementById('realtime-toggle').classList.toggle('on', response.data?.realTimeDetection !== false);
  }
}

async function toggleRealTime() {
  const response = await chrome.runtime.sendMessage({ action: 'getConfig' });
  if (response?.success) {
    const currentConfig = response.data || {};
    const newRealTime = !(currentConfig.realTimeDetection !== false);
    await chrome.runtime.sendMessage({ 
      action: 'setConfig', 
      config: { ...currentConfig, realTimeDetection: newRealTime }
    });
    document.getElementById('realtime-toggle').classList.toggle('on', newRealTime);
  }
}

// ─── Sound selection ────────────────────────────────────────────────────────

async function loadSoundSelection() {
  const response = await chrome.runtime.sendMessage({ action: 'getConfig' });
  if (response?.success) {
    const sound = response.data?.sound || 'ding';
    document.getElementById('sound-select').value = sound;
  }
}

async function changeSound() {
  const sound = document.getElementById('sound-select').value;
  const response = await chrome.runtime.sendMessage({ action: 'getConfig' });
  if (response?.success) {
    const currentConfig = response.data || {};
    await chrome.runtime.sendMessage({ 
      action: 'setConfig', 
      config: { ...currentConfig, sound }
    });
  }
}

async function testSound() {
  // Send test sound command to content script of active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    try {
      await chrome.tabs.sendMessage(tab.id, { action: 'testSound' });
    } catch (err) {
      // If we can't message content script, try playing sound directly here
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } catch (e) {
        alert('Could not play sound. Make sure you are on a web page.');
      }
    }
  }
}
