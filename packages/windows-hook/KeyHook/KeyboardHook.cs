/**
 * SmartLangGuard.KeyHook - Low-Level Windows Keyboard Hook
 *
 * Uses SetWindowsHookEx(WH_KEYBOARD_LL) to intercept keystrokes globally,
 * buffers them into words, and sends completed words to the SmartLangGuard
 * daemon for layout-mistake correction. If a mistake is detected, it
 * simulates backspace + corrected text via SendInput.
 *
 * Features:
 *   - Real-time keystroke capture across all applications
 *   - Word boundary detection (space, punctuation, Enter)
 *   - Re-entrancy protection (ignores own simulated keystrokes)
 *   - HTTP communication with local daemon for text analysis
 *   - Graceful degradation when daemon is unreachable
 *
 * @module SmartLangGuard.KeyHook
 */

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Net.Http;
using System.Net.Http.Json;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;

namespace SmartLangGuard.KeyHook
{
    // ─── Win32 API Declarations ──────────────────────────────────────────────

    internal static class NativeMethods
    {
        public const int WH_KEYBOARD_LL = 13;
        public const int WM_KEYDOWN = 0x0100;
        public const int WM_KEYUP = 0x0101;
        public const int WM_SYSKEYDOWN = 0x0104;

        public const uint KEYEVENTF_KEYUP = 0x0002;
        public const uint KEYEVENTF_UNICODE = 0x0004;

        public const int INPUT_KEYBOARD = 1;

        public const int VK_SHIFT = 0x10;
        public const int VK_CAPITAL = 0x14;

        public delegate IntPtr LowLevelKeyboardProc(int nCode, IntPtr wParam, IntPtr lParam);

        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        public static extern IntPtr SetWindowsHookEx(int idHook, LowLevelKeyboardProc lpfn, IntPtr hMod, uint dwThreadId);

        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        public static extern bool UnhookWindowsHookEx(IntPtr hhk);

        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        public static extern IntPtr CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);

        [DllImport("user32.dll", SetLastError = true)]
        public static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);

        [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        public static extern IntPtr GetModuleHandle(string? lpModuleName);

        [DllImport("user32.dll")]
        public static extern int ToUnicode(uint wVirtKey, uint wScanCode, byte[]? lpKeyState,
            [Out] StringBuilder pwszBuff, int cchBuff, uint wFlags);

        [DllImport("user32.dll")]
        public static extern short GetKeyState(int nVirtKey);

        [DllImport("user32.dll", SetLastError = true)]
        public static extern int GetMessage(out MSG lpMsg, IntPtr hWnd, uint wMsgFilterMin, uint wMsgFilterMax);

        [DllImport("user32.dll")]
        public static extern IntPtr GetKeyboardLayout(uint idThread);

        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        public static extern bool GetKeyboardLayoutName([Out] StringBuilder pwszKLID);
    }

    // ─── INPUT Structures ────────────────────────────────────────────────────

    [StructLayout(LayoutKind.Sequential)]
    internal struct INPUT
    {
        public int type;
        public InputUnion u;
    }

    [StructLayout(LayoutKind.Explicit)]
    internal struct InputUnion
    {
        [FieldOffset(0)] public MOUSEINPUT mi;
        [FieldOffset(0)] public KEYBDINPUT ki;
        [FieldOffset(0)] public HARDWAREINPUT hi;
    }

    [StructLayout(LayoutKind.Sequential)]
    internal struct KEYBDINPUT
    {
        public ushort wVk;
        public ushort wScan;
        public uint dwFlags;
        public uint time;
        public IntPtr dwExtraInfo;
    }

    [StructLayout(LayoutKind.Sequential)]
    internal struct MOUSEINPUT
    {
        public int dx;
        public int dy;
        public uint mouseData;
        public uint dwFlags;
        public uint time;
        public IntPtr dwExtraInfo;
    }

    [StructLayout(LayoutKind.Sequential)]
    internal struct HARDWAREINPUT
    {
        public uint uMsg;
        public ushort wParamL;
        public ushort wParamH;
    }

    // ─── KBDLLHOOKSTRUCT and MSG ────────────────────────────────────────────

    [StructLayout(LayoutKind.Sequential)]
    internal struct KBDLLHOOKSTRUCT
    {
        public uint vkCode;
        public uint scanCode;
        public uint flags;
        public uint time;
        public IntPtr dwExtraInfo;
    }

    [StructLayout(LayoutKind.Sequential)]
    internal struct MSG
    {
        public IntPtr hWnd;
        public uint message;
        public IntPtr wParam;
        public IntPtr lParam;
        public uint time;
        public int pt_x;
        public int pt_y;
    }

    // ─── Daemon API Models ───────────────────────────────────────────────────

    internal class FixRequest
    {
        [JsonPropertyName("text")]
        public string Text { get; set; } = "";

        [JsonPropertyName("options")]
        public FixOptions? Options { get; set; }
    }

    internal class FixOptions
    {
        [JsonPropertyName("layout")]
        public string Layout { get; set; } = "qwerty";
    }

    internal class FixResponse
    {
        [JsonPropertyName("original")]
        public string Original { get; set; } = "";

        [JsonPropertyName("corrected")]
        public string Corrected { get; set; } = "";

        [JsonPropertyName("direction")]
        public string Direction { get; set; } = "";

        [JsonPropertyName("score")]
        public int Score { get; set; }

        [JsonPropertyName("source")]
        public string Source { get; set; } = "";
    }

    // ─── Keyboard Hook ───────────────────────────────────────────────────────

    /// <summary>
    /// Manages a low-level keyboard hook (WH_KEYBOARD_LL) for real-time
    /// detection and correction of keyboard layout mistakes.
    /// </summary>
    public class KeyboardHook : IDisposable
    {
        private readonly int _minWordLength;
        private readonly int _maxWordLength;
        private readonly HttpClient _httpClient;
        private readonly string _daemonUrl;
        private readonly StringBuilder _wordBuffer = new();
        private IntPtr _hookId = IntPtr.Zero;
        private NativeMethods.LowLevelKeyboardProc? _hookProc;
        private volatile bool _isSimulating;
        private bool _disposed;

        // Track modifier keys to ignore them in word building
        private static readonly HashSet<uint> ModifierKeys = new()
        {
            0x11, // VK_CONTROL
            0x12, // VK_MENU (ALT)
            0x5B, // VK_LWIN
            0x5C, // VK_RWIN
            0x1B, // VK_ESCAPE
            0x2D, // VK_INSERT
            0x24, // VK_HOME
            0x23, // VK_END
            0x21, // VK_PRIOR (Page Up)
            0x22, // VK_NEXT (Page Down)
            0x26, // VK_UP
            0x28, // VK_DOWN
            0x25, // VK_LEFT
            0x27, // VK_RIGHT
            0x2E, // VK_DELETE
            0x2C, // VK_SNAPSHOT (Print Screen)
            0x13, // VK_PAUSE
            0x91, // VK_SCROLL
            0x90, // VK_NUMLOCK
        };

        // VK codes that represent word boundaries
        private static readonly HashSet<uint> WordBoundaryKeys = new()
        {
            0x20, // VK_SPACE
            0x0D, // VK_RETURN
            0x09, // VK_TAB
        };

        // VK codes for navigation that should reset the buffer
        private static readonly HashSet<uint> ResetKeys = new()
        {
            0x1B, // VK_ESCAPE
            0x24, // VK_HOME
            0x23, // VK_END
            0x21, // VK_PRIOR
            0x22, // VK_NEXT
            0x26, // VK_UP
            0x28, // VK_DOWN
            0x25, // VK_LEFT
            0x27, // VK_RIGHT
        };

        // Cached keyboard layout name (e.g., "qwerty", "azerty", "qwertz")
        private string _detectedLayout = "qwerty";
        private long _lastLayoutCheck = 0;
        private const long LAYOUT_CHECK_INTERVAL_TICKS = TimeSpan.TicksPerSecond * 5; // re-check every 5s

        /// <summary>
        /// Creates a new keyboard hook instance.
        /// </summary>
        /// <param name="daemonUrl">URL of the SmartLangGuard daemon (e.g., http://localhost:41783)</param>
        /// <param name="minWordLength">Minimum word length to analyze (default: 2)</param>
        /// <param name="maxWordLength">Maximum word length to analyze (default: 50)</param>
        public KeyboardHook(string? daemonUrl = null, int minWordLength = 2, int maxWordLength = 50)
        {
            _daemonUrl = daemonUrl ?? "http://localhost:41783";
            _minWordLength = Math.Max(1, minWordLength);
            _maxWordLength = Math.Clamp(maxWordLength, _minWordLength, 200);
            _httpClient = new HttpClient
            {
                Timeout = TimeSpan.FromSeconds(2)
            };

            // Detect layout on startup
            _detectedLayout = DetectKeyboardLayout();
        }

        /// <summary>
        /// Starts the low-level keyboard hook.
        /// </summary>
        public void Start()
        {
            if (_hookId != IntPtr.Zero)
                return; // Already running

            _hookProc = HookCallback;
            using var curProcess = Process.GetCurrentProcess();
            using var mainModule = curProcess.MainModule;
            var moduleHandle = NativeMethods.GetModuleHandle(mainModule?.ModuleName);

            _hookId = NativeMethods.SetWindowsHookEx(
                NativeMethods.WH_KEYBOARD_LL,
                _hookProc,
                moduleHandle,
                0
            );

            if (_hookId == IntPtr.Zero)
            {
                int errorCode = Marshal.GetLastWin32Error();
                throw new InvalidOperationException(
                    $"Failed to set keyboard hook. Error code: {errorCode}");
            }
        }

        /// <summary>
        /// Stops the low-level keyboard hook.
        /// </summary>
        public void Stop()
        {
            if (_hookId != IntPtr.Zero)
            {
                NativeMethods.UnhookWindowsHookEx(_hookId);
                _hookId = IntPtr.Zero;
            }
        }

        /// <summary>
        /// Disposes the hook (stops it if running).
        /// </summary>
        public void Dispose()
        {
            if (!_disposed)
            {
                Stop();
                _httpClient.Dispose();
                _disposed = true;
            }
        }

        // ─── Hook Callback ───────────────────────────────────────────────────

        private IntPtr HookCallback(int nCode, IntPtr wParam, IntPtr lParam)
        {
            if (nCode < 0)
                return NativeMethods.CallNextHookEx(_hookId, nCode, wParam, lParam);

            // Ignore our own simulated keystrokes (volatile read ensures thread safety)
            if (_isSimulating)
                return NativeMethods.CallNextHookEx(_hookId, nCode, wParam, lParam);

            var hookStruct = Marshal.PtrToStructure<KBDLLHOOKSTRUCT>(lParam);

            if (wParam == (IntPtr)NativeMethods.WM_KEYDOWN || wParam == (IntPtr)NativeMethods.WM_SYSKEYDOWN)
            {
                ProcessKeyDown(hookStruct);
            }
            // WM_KEYUP is intentionally ignored - we use native GetKeyState for modifier state

            return NativeMethods.CallNextHookEx(_hookId, nCode, wParam, lParam);
        }

        // ─── Key Processing ──────────────────────────────────────────────────

        private void ProcessKeyDown(KBDLLHOOKSTRUCT key)
        {
            uint vkCode = key.vkCode;
            uint scanCode = key.scanCode;

            // Check for Shift - track it via native GetKeyState for accuracy
            if (vkCode == NativeMethods.VK_SHIFT)
                return;

            // Handle Caps Lock toggle
            if (vkCode == NativeMethods.VK_CAPITAL)
            {
                // Don't toggle here - GetKeyState will reflect the actual state
                return;
            }

            // Check for reset keys (navigation)
            if (ResetKeys.Contains(vkCode))
            {
                ResetBuffer();
                return;
            }

            // Check for backspace
            if (vkCode == 0x08) // VK_BACK
            {
                if (_wordBuffer.Length > 0)
                {
                    _wordBuffer.Length -= 1;
                }
                return;
            }

            // Check for word boundaries
            if (WordBoundaryKeys.Contains(vkCode))
            {
                FlushBuffer();
                return;
            }

            // Punctuation that can end a word
            if (IsPunctuation(vkCode))
            {
                AppendToBuffer(vkCode, scanCode);
                FlushBuffer();
                return;
            }

            // Skip modifier keys and other non-character keys
            if (ModifierKeys.Contains(vkCode))
                return;

            // VK codes 0x30-0x5A are alphanumeric (0-9, A-Z)
            // Also handle numpad and punctuation keys
            if ((vkCode >= 0x30 && vkCode <= 0x5A) || // Alphanumeric
                (vkCode >= 0x60 && vkCode <= 0x69) || // Numpad 0-9
                vkCode == 0x6A || // Numpad *
                vkCode == 0x6B || // Numpad +
                vkCode == 0x6D || // Numpad -
                vkCode == 0x6E || // Numpad .
                vkCode == 0x6F || // Numpad /
                vkCode == 0xBA || // ;:
                vkCode == 0xBB || // =+
                vkCode == 0xBC || // ,<
                vkCode == 0xBD || // -_
                vkCode == 0xBE || // .>
                vkCode == 0xBF || // /?
                vkCode == 0xC0 || // `~
                vkCode == 0xDB || // [{
                vkCode == 0xDC || // \|
                vkCode == 0xDD || // ]}
                vkCode == 0xDE)   // '"
            {
                AppendToBuffer(vkCode, scanCode);
            }
        }

        // ─── Buffer Management ───────────────────────────────────────────────

        /// <summary>
        /// Appends a character to the word buffer using native ToUnicode conversion.
        /// Uses a reusable key state buffer to avoid per-stroke allocations.
        /// </summary>
        private readonly byte[] _keyStateBuffer = new byte[256];

        private void AppendToBuffer(uint vkCode, uint scanCode)
        {
            // Clear the reusable key state buffer
            Array.Clear(_keyStateBuffer, 0, _keyStateBuffer.Length);

            // Get actual key states from the native API (more reliable than manual tracking)
            _keyStateBuffer[0x10] = (byte)((NativeMethods.GetKeyState(NativeMethods.VK_SHIFT) & 0x80) != 0 ? 0x80 : 0);
            _keyStateBuffer[0x14] = (byte)((NativeMethods.GetKeyState(NativeMethods.VK_CAPITAL) & 0x01) != 0 ? 0x01 : 0);

            var sb = new StringBuilder(5);
            int result = NativeMethods.ToUnicode(vkCode, scanCode, _keyStateBuffer, sb, 5, 0);

            if (result > 0 && sb.Length > 0)
            {
                char ch = sb[0];
                // Only add printable characters to the buffer
                if (!char.IsControl(ch))
                {
                    if (_wordBuffer.Length < _maxWordLength)
                    {
                        _wordBuffer.Append(ch);
                    }
                }
            }
        }

        private void ResetBuffer()
        {
            _wordBuffer.Clear();
        }

        private void FlushBuffer()
        {
            if (_wordBuffer.Length < _minWordLength)
            {
                _wordBuffer.Clear();
                return;
            }

            string word = _wordBuffer.ToString();
            _wordBuffer.Clear();

            // Fire and forget the analysis
            _ = AnalyzeWordAsync(word);
        }

        // ─── Word Analysis ────────────────────────────────────────────────────

        /// <summary>
        /// Detects the current active keyboard layout using Win32 GetKeyboardLayout API.
        /// Maps the language ID to a layout name understood by the SmartLangGuard engine.
        /// </summary>
        /// <returns>"qwerty", "azerty", "qwertz", or "qwerty" as fallback</returns>
        private static string DetectKeyboardLayout()
        {
            try
            {
                // Method 1: Use GetKeyboardLayoutName (returns string like "00000409")
                var sb = new StringBuilder(9);
                if (NativeMethods.GetKeyboardLayoutName(sb))
                {
                    string klid = sb.ToString();
                    return MapKlidToLayout(klid);
                }

                // Method 2: Fallback to GetKeyboardLayout (extract LANGID from low word)
                IntPtr hkl = NativeMethods.GetKeyboardLayout(0);
                int langId = (int)((uint)hkl & 0xFFFF);
                return MapLangIdToLayout(langId);
            }
            catch
            {
                return "qwerty";
            }
        }

        /// <summary>
        /// Maps a KLID string (e.g., "00000409") to a layout name.
        /// Extracts the language ID from the last 4 hex digits and maps it.
        /// </summary>
        private static string MapKlidToLayout(string klid)
        {
            if (string.IsNullOrEmpty(klid) || klid.Length < 4)
                return "qwerty";

            // KLID is like "00000409" - extract the language ID (last 4+ chars)
            string langPart = klid.TrimStart('0');
            if (langPart.Length == 0) return "qwerty";

            // Parse the language ID
            if (int.TryParse(langPart, System.Globalization.NumberStyles.HexNumber,
                System.Globalization.CultureInfo.InvariantCulture, out int langId))
            {
                return MapLangIdToLayout(langId);
            }

            return "qwerty";
        }

        /// <summary>
        /// Maps a Windows language ID to a layout name.
        /// 
        /// Key insight: We only need to detect layouts where Latin letters are NOT
        /// in QWERTY positions. The two main non-QWERTY Latin layouts are:
        ///   - AZERTY (French): LANGID 0x040C — used in France, Belgium, Switzerland
        ///   - QWERTZ (German): LANGID 0x0407 — used in Germany, Austria, Switzerland
        /// 
        /// All other layouts (including Arabic 101, which uses QWERTY positions for
        /// Latin letters) should be treated as QWERTY. North African Arabic users
        /// who use French AZERTY will have LANGID 0x040C when that layout is active.
        /// </summary>
        private static string MapLangIdToLayout(int langId)
        {
            // Extract the primary language ID (low 10 bits of LANGID per PRIMARYLANGID macro)
            // This handles all sublanguage variants automatically
            int primaryLang = langId & 0x3FF;

            return primaryLang switch
            {
                // French (all sublanguages: France, Belgium, Switzerland, Canada, Luxembourg)
                0x0C => "azerty",
                // German (all sublanguages: Germany, Austria, Switzerland, Luxembourg)
                0x07 => "qwertz",
                // Everything else uses QWERTY for Latin letters
                _ => "qwerty"
            };
        }

        /// <summary>
        /// Gets the current keyboard layout, with caching to avoid excessive API calls.
        /// Re-checks every 5 seconds since users can switch layouts dynamically.
        /// </summary>
        private string GetCurrentLayout()
        {
            long now = DateTime.UtcNow.Ticks;
            if (now - _lastLayoutCheck > LAYOUT_CHECK_INTERVAL_TICKS)
            {
                _detectedLayout = DetectKeyboardLayout();
                _lastLayoutCheck = now;
            }
            return _detectedLayout;
        }

        private async Task AnalyzeWordAsync(string word)
        {
            try
            {
                string layout = GetCurrentLayout();
                var request = new FixRequest
                {
                    Text = word,
                    Options = new FixOptions { Layout = layout }
                };
                var response = await _httpClient.PostAsJsonAsync($"{_daemonUrl}/fix", request);

                if (!response.IsSuccessStatusCode)
                    return;

                var json = await response.Content.ReadAsStringAsync();
                var result = JsonSerializer.Deserialize<FixResponse>(json, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                if (result == null || string.IsNullOrEmpty(result.Corrected))
                    return;

                // Only correct when confidence is high enough and text actually changed
                if (result.Corrected != word && result.Score >= 50)
                {
                    CorrectWord(word, result.Corrected);
                }
            }
            catch (HttpRequestException)
            {
                // Daemon not running - silently ignore
            }
            catch (TaskCanceledException)
            {
                // Timeout - silently ignore
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"[SmartLangGuard] Analysis error: {ex.Message}");
            }
        }

        // ─── Keystroke Simulation ─────────────────────────────────────────────

        /// <summary>
        /// Corrects a mistyped word by simulating backspaces + corrected text.
        /// Uses a volatile flag to prevent re-entrancy (the hook ignores its own input).
        /// </summary>
        private void CorrectWord(string original, string corrected)
        {
            _isSimulating = true;

            try
            {
                // Step 1: Send backspaces to delete the original word
                for (int i = 0; i < original.Length; i++)
                {
                    SendKeyPress(0x08, 0x0E, 0); // VK_BACK
                }

                // Step 2: Send the corrected text using Unicode input
                foreach (char ch in corrected)
                {
                    SendUnicodeChar(ch);
                }

                // Small delay to ensure keystrokes are processed before releasing the flag
                Thread.Sleep(10);
            }
            finally
            {
                _isSimulating = false;
            }
        }

        private static void SendKeyPress(ushort vkCode, ushort scanCode, uint flags)
        {
            var inputs = new INPUT[2];

            inputs[0] = new INPUT
            {
                type = NativeMethods.INPUT_KEYBOARD,
                u = new InputUnion
                {
                    ki = new KEYBDINPUT
                    {
                        wVk = vkCode,
                        wScan = scanCode,
                        dwFlags = flags,
                        time = 0,
                        dwExtraInfo = IntPtr.Zero
                    }
                }
            };

            inputs[1] = new INPUT
            {
                type = NativeMethods.INPUT_KEYBOARD,
                u = new InputUnion
                {
                    ki = new KEYBDINPUT
                    {
                        wVk = vkCode,
                        wScan = scanCode,
                        dwFlags = flags | NativeMethods.KEYEVENTF_KEYUP,
                        time = 0,
                        dwExtraInfo = IntPtr.Zero
                    }
                }
            };

            NativeMethods.SendInput(2, inputs, Marshal.SizeOf<INPUT>());
        }

        private static void SendUnicodeChar(char ch)
        {
            var inputs = new INPUT[2];

            inputs[0] = new INPUT
            {
                type = NativeMethods.INPUT_KEYBOARD,
                u = new InputUnion
                {
                    ki = new KEYBDINPUT
                    {
                        wVk = 0,
                        wScan = ch,
                        dwFlags = NativeMethods.KEYEVENTF_UNICODE,
                        time = 0,
                        dwExtraInfo = IntPtr.Zero
                    }
                }
            };

            inputs[1] = new INPUT
            {
                type = NativeMethods.INPUT_KEYBOARD,
                u = new InputUnion
                {
                    ki = new KEYBDINPUT
                    {
                        wVk = 0,
                        wScan = ch,
                        dwFlags = NativeMethods.KEYEVENTF_UNICODE | NativeMethods.KEYEVENTF_KEYUP,
                        time = 0,
                        dwExtraInfo = IntPtr.Zero
                    }
                }
            };

            NativeMethods.SendInput(2, inputs, Marshal.SizeOf<INPUT>());
        }

        // ─── Helpers ─────────────────────────────────────────────────────────

        private static bool IsPunctuation(uint vkCode)
        {
            return vkCode == 0xBE || // .>
                   vkCode == 0xBF || // /?
                   vkCode == 0xBA || // ;:
                   vkCode == 0xDE || // '"
                   vkCode == 0xBC;   // ,<
        }
    }
}
