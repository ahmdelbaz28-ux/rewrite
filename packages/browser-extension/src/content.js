/**
 * SmartLangGuard Content Script
 * 
 * Runs on every page. Provides:
 *   - getSelection() → returns current text selection
 *   - replaceSelection(text) → replaces selection with corrected text
 *   - autoFixPage() → scans input fields and fixes mistyped content
 *   - **Real-time typing detection** with sound alerts
 *   - **Quick-fix last word** via keyboard shortcut (Ctrl+Shift+Backspace)
 *   - monitor inputs (if auto-fix enabled) for paste events
 */

'use strict';

(function () {
  // ─── State for real-time detection ─────────────────────────────────────────
  
  let realTimeEnabled = true;
  let selectedSound = 'ding';
  let soundVolume = 0.5;
  let sensitivity = 'medium';
  let typingTimer = null;
  let currentWord = '';
  let lastDetection = null;
  let lastAlertTime = 0;
  let alertBadge = null;
  let audioContext = null;
  let cachedAudioBuffers = {};
  
  const ALERT_COOLDOWN_MS = 2000;
  const DETECTION_DEBOUNCE_MS = 250;
  
  // Arabic 101 → English mapping (for browser-side detection)
  const EN_TO_AR = {
    q:'ض',w:'ص',e:'ث',r:'ق',t:'ف',y:'غ',u:'ع',i:'ه',o:'خ',p:'ح',
    a:'ش',s:'س',d:'ي',f:'ب',g:'ل',h:'ا',j:'ت',k:'ن',l:'م',
    z:'ئ',x:'ء',c:'ؤ',v:'ر',b:'لا',n:'ى',m:'ة',
    ';':'ك','\'':'ط','.':'ز',',':'و','/':'ظ','[':'ج',']':'د'
  };
  
  // Load config
  chrome.storage.local.get('config', ({ config }) => {
    realTimeEnabled = config?.realTimeDetection !== false;
    selectedSound = config?.sound || 'ding';
    soundVolume = config?.soundVolume ?? 0.5;
    sensitivity = config?.sensitivity || 'medium';
  });
  
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.config?.newValue) {
      const c = changes.config.newValue;
      realTimeEnabled = c.realTimeDetection !== false;
      selectedSound = c.sound || 'ding';
      soundVolume = c.soundVolume ?? 0.5;
      sensitivity = c.sensitivity || 'medium';
    }
  });
  
  // ─── Real-time typing detection ────────────────────────────────────────────
  
  const inputFields = new Set();
  
  // Track typing on all input/textarea elements
  document.addEventListener('input', (event) => {
    if (!realTimeEnabled) return;
    
    const target = event.target;
    if (!isEditable(target)) return;
    
    const insertedText = event.data || '';
    if (!insertedText || insertedText.length > 10) {
      currentWord = '';
      return;
    }
    
    // Update word buffer
    for (const ch of insertedText) {
      if (/\s/.test(ch)) {
        currentWord = '';
      } else {
        currentWord += ch;
      }
    }
    
    // Debounce analysis
    if (typingTimer) clearTimeout(typingTimer);
    typingTimer = setTimeout(() => analyzeCurrentWord(target), DETECTION_DEBOUNCE_MS);
  }, true); // capture phase to catch all inputs
  
  // Quick-fix shortcut: Ctrl+Shift+Backspace
  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'Backspace') {
      event.preventDefault();
      quickFixLastWord(event.target);
    }
  }, true);
  
  async function analyzeCurrentWord(element) {
    if (currentWord.length < 2) {
      hideAlertBadge();
      return;
    }
    
    // Get the converted Arabic text (browser-side, fast)
    const converted = convertToArabic(currentWord);
    
    // Quick check: if the converted text contains Arabic chars AND the original is all Latin
    const isAllLatin = /^[a-zA-Z;'\.,\[\]/]+$/.test(currentWord);
    const hasArabic = /[\u0600-\u06FF]/.test(converted);
    
    if (!isAllLatin || !hasArabic) {
      // Also check reverse: Arabic text that should be English
      const isAllArabic = /^[\u0600-\u06FF\s]+$/.test(currentWord);
      if (!isAllArabic) {
        hideAlertBadge();
        return;
      }
    }
    
    // Confidence: if converted text differs from original, it's likely a mistake
    if (converted !== currentWord) {
      const now = Date.now();
      const shouldAlert = (now - lastAlertTime) > ALERT_COOLDOWN_MS;
      
      lastDetection = {
        word: currentWord,
        suggestion: converted,
        element,
        timestamp: now
      };
      
      showAlertBadge(element);
      
      if (shouldAlert && selectedSound !== 'off') {
        lastAlertTime = now;
        await playAlertSound();
      }
    } else {
      hideAlertBadge();
    }
  }
  
  function convertToArabic(text) {
    return text.split('').map(ch => EN_TO_AR[ch.toLowerCase()] || ch).join('');
  }
  
  async function quickFixLastWord(element) {
    if (!lastDetection || Date.now() - lastDetection.timestamp > 10000) {
      // Fallback: get word before cursor
      if (isEditable(element) && element.value) {
        const cursorPos = element.selectionStart;
        const textBefore = element.value.substring(0, cursorPos);
        const match = textBefore.match(/(\S+)\s*$/);
        if (match) {
          const word = match[1];
          const converted = convertToArabic(word);
          if (converted !== word) {
            const start = cursorPos - word.length;
            element.value = element.value.substring(0, start) + converted + element.value.substring(cursorPos);
            element.setSelectionRange(start + converted.length, start + converted.length);
            element.dispatchEvent(new Event('input', { bubbles: true }));
            hideAlertBadge();
            return;
          }
        }
      }
      return;
    }
    
    // Replace the last typed word with the suggestion
    if (isEditable(lastDetection.element) && lastDetection.element.value) {
      const el = lastDetection.element;
      const cursorPos = el.selectionStart;
      const word = lastDetection.word;
      const suggestion = lastDetection.suggestion;
      const start = cursorPos - word.length;
      
      if (start >= 0 && el.value.substring(start, cursorPos) === word) {
        el.value = el.value.substring(0, start) + suggestion + el.value.substring(cursorPos);
        el.setSelectionRange(start + suggestion.length, start + suggestion.length);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        hideAlertBadge();
      }
    } else if (lastDetection.element?.isContentEditable) {
      // For contenteditable, use execCommand
      const sel = window.getSelection();
      if (sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        // Try to select the last word
        document.execCommand('delete');
        document.execCommand('insertText', false, lastDetection.suggestion);
        hideAlertBadge();
      }
    }
  }
  
  // ─── Sound playback via Web Audio API ──────────────────────────────────────
  
  async function playAlertSound() {
    try {
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      // Resume context if suspended (browser autoplay policy)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      // Generate and play sound based on selectedSound
      await playGeneratedSound(selectedSound);
    } catch (err) {
      console.warn('[SmartLangGuard] Sound playback failed:', err);
    }
  }
  
  async function playGeneratedSound(name) {
    const ctx = audioContext;
    const now = ctx.currentTime;
    const volume = soundVolume;
    
    const playTone = (freq, start, duration, type = 'sine', vol = 1) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + start);
      gain.gain.linearRampToValueAtTime(vol * volume, now + start + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + duration);
    };
    
    switch (name) {
      case 'beep':
        playTone(880, 0, 0.15, 'square', 0.4);
        break;
      case 'ding':
        playTone(880, 0, 0.3, 'sine', 0.4);
        playTone(1320, 0, 0.3, 'sine', 0.15);
        break;
      case 'chime':
        playTone(523.25, 0, 0.15, 'sine', 0.35);    // C5
        playTone(659.25, 0.15, 0.15, 'sine', 0.35); // E5
        playTone(783.99, 0.3, 0.2, 'sine', 0.35);   // G5
        break;
      case 'soft-pop':
        playTone(660, 0, 0.08, 'sine', 0.3);
        break;
      case 'click':
        playTone(2000, 0, 0.04, 'sine', 0.2);
        break;
      case 'double-beep':
        playTone(880, 0, 0.08, 'square', 0.4);
        playTone(880, 0.13, 0.08, 'square', 0.4);
        break;
    }
  }
  
  // ─── Alert badge ────────────────────────────────────────────────────────────
  
  function showAlertBadge(element) {
    if (!alertBadge) {
      alertBadge = document.createElement('div');
      alertBadge.id = 'smartlangguard-alert';
      alertBadge.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #f59e0b;
        color: white;
        padding: 10px 16px;
        border-radius: 8px;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 13px;
        font-weight: 600;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 2147483647;
        cursor: pointer;
        transition: opacity 0.2s;
      `;
      alertBadge.innerHTML = '⚠ Wrong layout! <span style="opacity:0.8;font-weight:400">[Ctrl+Shift+Backspace]</span>';
      alertBadge.addEventListener('click', () => {
        quickFixLastWord(document.activeElement);
      });
      document.body.appendChild(alertBadge);
    }
    alertBadge.style.display = 'block';
    alertBadge.style.opacity = '1';
  }
  
  function hideAlertBadge() {
    if (alertBadge) {
      alertBadge.style.opacity = '0';
      setTimeout(() => {
        if (alertBadge) alertBadge.style.display = 'none';
      }, 200);
    }
  }
  
  // ─── Listen for messages from background ───────────────────────────────────
  
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
        
      case 'quickFixLastWord':
        return quickFixLastWord(document.activeElement);
        
      case 'testSound':
        if (selectedSound !== 'off') {
          await playAlertSound();
        }
        return { played: true };

      default:
        throw new Error(`Unknown action: ${message.action}`);
    }
  }

  // ─── Selection ──────────────────────────────────────────────────────────────

  function getSelectionInfo() {
    const active = document.activeElement;
    
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
      
      const newPos = start + newText.length;
      active.setSelectionRange(newPos, newPos);
      
      active.dispatchEvent(new Event('input', { bubbles: true }));
      return { replaced: true, method: 'input' };
    }

    if (active?.isContentEditable) {
      document.execCommand('insertText', false, newText);
      return { replaced: true, method: 'contentEditable' };
    }

    const sel = window.getSelection();
    if (sel.rangeCount > 0 && sel.toString()) {
      const success = document.execCommand('insertText', false, newText);
      if (success) return { replaced: true, method: 'execCommand' };
    }

    navigator.clipboard.writeText(newText);
    return { replaced: false, method: 'clipboard', message: 'Text copied to clipboard' };
  }

  // ─── Auto-Fix Page ──────────────────────────────────────────────────────────

  async function autoFixPage() {
    const results = { scanned: 0, fixed: 0, errors: 0 };

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
    if (/[a-zA-Z]{3,}/.test(text) && /[\u0600-\u06FF]/.test(text)) return true;
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
      // Silently fail
    }
  });
})();
