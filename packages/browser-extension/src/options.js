/**
 * SmartLangGuard Options Page
 */

'use strict';

document.addEventListener('DOMContentLoaded', async () => {
  const config = await getConfig();
  document.getElementById('daemonEndpoint').value = config.daemonEndpoint || 'http://localhost:41783';
  document.getElementById('apiEndpoint').value = config.apiEndpoint || 'http://localhost:4000';
  document.getElementById('licenseToken').value = config.licenseToken || '';
  document.getElementById('telemetry').checked = config.telemetry !== false;

  document.getElementById('save').addEventListener('click', saveSettings);
  document.getElementById('activate').addEventListener('click', activateLicense);
});

async function getConfig() {
  const response = await chrome.runtime.sendMessage({ action: 'getConfig' });
  return response?.success ? response.data : {};
}

async function saveSettings() {
  const config = {
    daemonEndpoint: document.getElementById('daemonEndpoint').value.trim(),
    apiEndpoint: document.getElementById('apiEndpoint').value.trim(),
    licenseToken: document.getElementById('licenseToken').value.trim(),
    telemetry: document.getElementById('telemetry').checked
  };
  const response = await chrome.runtime.sendMessage({ action: 'setConfig', config });
  if (response?.success) {
    showStatus('Settings saved', 'success');
  } else {
    showStatus(response?.error || 'Save failed', 'error');
  }
}

async function activateLicense() {
  const token = document.getElementById('licenseToken').value.trim();
  if (!token) {
    showStatus('Enter a license token first', 'error');
    return;
  }

  const btn = document.getElementById('activate');
  const original = btn.textContent;
  btn.textContent = 'Activating...';
  btn.disabled = true;

  try {
    const response = await chrome.runtime.sendMessage({ action: 'activateLicense', token });
    if (response?.success && response.data?.valid) {
      showStatus(`License activated! Tier: ${response.data.tier}`, 'success');
    } else {
      throw new Error(response?.data?.reason || 'Invalid license');
    }
  } catch (err) {
    showStatus(`Activation failed: ${err.message}`, 'error');
  } finally {
    btn.textContent = original;
    btn.disabled = false;
  }
}

function showStatus(message, type) {
  const el = document.getElementById('status');
  el.textContent = message;
  el.className = `status-msg ${type}`;
  setTimeout(() => { el.className = 'status-msg'; }, 5000);
}
