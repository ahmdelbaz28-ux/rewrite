/**
 * SmartLangGuard Content Script
 * 
 * Runs on every page. Provides:
 *   - getSelection() → returns current text selection
 *   - replaceSelection(text) → replaces selection with corrected text
 *   - autoFixPage() → scans input fields and fixes mistyped content
 *   - monitor inputs (if auto-fix enabled) for paste events
 */

'use strict';

(function () {
  // Listen for messages from background
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    (async () => {
      try {
        const result = await handleMessage(message);
        sendResponse({ success: true, data: result });
      } catch (err) {
        console.error('[SmartLangGuard cs] error:', err);
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  });

  async function handleMessage(message) {
    switch (message.action) {
      case 'getSelection':
        return getSelectionInfo();

      case 'replaceSelection':
        return replaceSelection(message.text);

      case 'autoFixPage':
        return autoFixPage();

      case 'fixInput':
        return fixInputElement(message.elementId);

      default:
        throw new Error(`Unknown action: ${message.action}`);
    }
  }

  // ─── Selection ──────────────────────────────────────────────────────────────

  function getSelectionInfo() {
    const active = document.activeElement;
    
    // Check if focused on an input/textarea
    if (isEditable(active)) {
      const sel = getEditableSelection(active);
      if (sel && sel.text) {
        return {
          text: sel.text,
          elementId: active.id || null,
          elementType: active.tagName.toLowerCase(),
          start: sel.start,
          end: sel.end
        };
      }
    }

    // Otherwise, use window selection
    const selection = window.getSelection();
    const text = selection.toString();
    return text ? { text, elementId: null } : { text: '' };
  }

  function isEditable(el) {
    if (!el) return false;
    const tag = el.tagName.toLowerCase();
    return tag === 'textarea' || tag === 'input' || el.isContentEditable;
  }

  function getEditableSelection(el) {
    if (el.isContentEditable) {
      const sel = window.getSelection();
      if (sel.rangeCount > 0) {
        return { text: sel.toString(), start: 0, end: 0 };
      }
      return null;
    }
    return {
      text: el.value.substring(el.selectionStart, el.selectionEnd),
      start: el.selectionStart,
      end: el.selectionEnd
    };
  }

  // ─── Replace Selection ──────────────────────────────────────────────────────

  function replaceSelection(newText) {
    const active = document.activeElement;

    if (isEditable(active) && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
      const start = active.selectionStart;
      const end = active.selectionEnd;
      const before = active.value.substring(0, start);
      const after = active.value.substring(end);
      active.value = before + newText + after;
      
      // Set cursor position after the inserted text
      const newPos = start + newText.length;
      active.setSelectionRange(newPos, newPos);
      
      // Dispatch input event so frameworks (React, Vue) pick up the change
      active.dispatchEvent(new Event('input', { bubbles: true }));
      return { replaced: true, method: 'input' };
    }

    if (active?.isContentEditable) {
      document.execCommand('insertText', false, newText);
      return { replaced: true, method: 'contentEditable' };
    }

    // Fallback: try execCommand on window selection
    const sel = window.getSelection();
    if (sel.rangeCount > 0 && sel.toString()) {
      const success = document.execCommand('insertText', false, newText);
      if (success) return { replaced: true, method: 'execCommand' };
    }

    // Last resort: copy to clipboard and notify user
    navigator.clipboard.writeText(newText);
    return { replaced: false, method: 'clipboard', message: 'Text copied to clipboard' };
  }

  // ─── Auto-Fix Page ──────────────────────────────────────────────────────────

  async function autoFixPage() {
    const results = { scanned: 0, fixed: 0, errors: 0 };

    // Find all input/textarea elements with text that looks like a layout mistake
    const inputs = document.querySelectorAll('input[type="text"], input[type="search"], textarea, [contenteditable="true"]');
    
    for (const input of inputs) {
      results.scanned++;
      const text = input.value || input.textContent;
      if (!text || text.length < 3) continue;

      if (looksLikeMistake(text)) {
        try {
          const response = await chrome.runtime.sendMessage({
            action: 'fixText',
            text
          });
          
          if (response?.success && response.data?.corrected && response.data.corrected !== text) {
            // Apply the fix
            if (input.tagName === 'INPUT' || input.tagName === 'TEXTAREA') {
              input.value = response.data.corrected;
              input.dispatchEvent(new Event('input', { bubbles: true }));
            } else if (input.isContentEditable) {
              input.textContent = response.data.corrected;
            }
            results.fixed++;
          }
        } catch (err) {
          results.errors++;
        }
      }
    }

    return results;
  }

  function looksLikeMistake(text) {
    if (!text || text.length > 500) return false;
    // 3+ consecutive English letters in a mostly-Arabic text, or vice versa
    if (/[a-zA-Z]{3,}/.test(text) && /[\u0600-\u06FF]/.test(text)) return true;
    // All-Arabic text shorter than 100 chars
    if (/^[\u0600-\u06FF\s]+$/.test(text) && text.length < 100) return true;
    return false;
  }

  // ─── Auto-fix on Paste (if enabled) ─────────────────────────────────────────

  let autoFixEnabled = false;
  chrome.storage.local.get('config', ({ config }) => {
    autoFixEnabled = config?.autoFix || false;
  });

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.config?.newValue) {
      autoFixEnabled = changes.config.newValue.autoFix || false;
    }
  });

  document.addEventListener('paste', async (event) => {
    if (!autoFixEnabled) return;
    
    const pasted = event.clipboardData?.getData('text');
    if (!pasted || !looksLikeMistake(pasted)) return;

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'fixText',
        text: pasted
      });
      
      if (response?.success && response.data?.corrected && response.data.corrected !== pasted) {
        event.preventDefault();
        document.execCommand('insertText', false, response.data.corrected);
      }
    } catch (err) {
      // Silently fail; don't block the paste
    }
  });
})();
