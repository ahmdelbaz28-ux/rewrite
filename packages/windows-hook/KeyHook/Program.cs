/**
 * SmartLangGuard.KeyHook - Main Entry Point
 *
 * A Windows low-level keyboard hook that monitors keystrokes globally,
 * detects keyboard layout mistakes, and auto-corrects them in real time.
 *
 * Usage:
 *   SmartLangGuard.KeyHook.exe [--daemon-url http://localhost:41783]
 *
 * Arguments:
 *   --daemon-url   URL of the SmartLangGuard daemon (default: http://localhost:41783)
 *   --min-word     Minimum word length to analyze (default: 2)
 *   --max-word     Maximum word length to analyze (default: 50)
 *   --debounce     Debounce time in ms (default: 200)
 *   --verbose      Enable verbose logging
 *
 * Exit codes:
 *   0 - Normal exit (Ctrl+C)
 *   1 - Error during startup
 *   2 - Hook registration failed
 *   3 - Daemon unreachable
 */

using System;
using System.Diagnostics;
using System.Net.Http;
using System.Runtime.InteropServices;
using System.Threading;
using System.Threading.Tasks;

namespace SmartLangGuard.KeyHook
{
    class Program
    {
        private static bool _verbose = false;

        static async Task<int> Main(string[] args)
        {
            // ─── Parse arguments ─────────────────────────────────────────────
            string daemonUrl = "http://localhost:41783";
            int minWordLength = 2;
            int maxWordLength = 50;
            _verbose = false;

            for (int i = 0; i < args.Length; i++)
            {
                switch (args[i].ToLowerInvariant())
                {
                    case "--daemon-url":
                        if (++i < args.Length) daemonUrl = args[i];
                        break;
                    case "--min-word":
                        if (++i < args.Length) int.TryParse(args[i], out minWordLength);
                        break;
                    case "--max-word":
                        if (++i < args.Length) int.TryParse(args[i], out maxWordLength);
                        break;
                    case "--verbose":
                        _verbose = true;
                        break;
                    case "--help":
                    case "-h":
                    case "/?":
                        ShowHelp();
                        return 0;
                }
            }

            // ─── Validate daemon connectivity ────────────────────────────────
            Log($"SmartLangGuard Keyboard Hook v{GetVersion()}");
            Log($"Daemon URL: {daemonUrl}");
            Log($"Waiting for daemon...");

            bool daemonReachable = await WaitForDaemonAsync(daemonUrl, TimeSpan.FromSeconds(10));
            if (!daemonReachable)
            {
                Log("Daemon not reachable. The hook will start but corrections will not work.", true);
                // Still start the hook - the daemon might come online later
            }
            else
            {
                Log($"Daemon reachable! Starting keyboard hook...");
            }

            // ─── Start the keyboard hook ─────────────────────────────────────
            try
            {
                using var hook = new KeyboardHook(daemonUrl, minWordLength, maxWordLength);
                hook.Start();
                Log("✓ Keyboard hook active. Press Ctrl+C to stop.");
                Log("  The hook monitors keystrokes and auto-corrects layout mistakes.");
                Log("");

                // Handle Ctrl+C gracefully
                Console.CancelKeyPress += (sender, e) =>
                {
                    e.Cancel = true;
                    Log("\nShutting down keyboard hook...");
                    hook.Stop();
                    Environment.Exit(0);
                };

                // Run the Windows message loop (required for WH_KEYBOARD_LL)
                // This blocks until the hook is stopped
                RunMessageLoop();

                return 0;
            }
            catch (Exception ex)
            {
                Log($"FATAL: Failed to start keyboard hook: {ex.Message}", true);
                Log($"        Error details: {ex.InnerException?.Message ?? "None"}");
                Log($"        Make sure the application is running on Windows.");

                if (_verbose)
                {
                    Log($"        Stack trace: {ex.StackTrace}");
                }

                return 2;
            }
        }

        // ─── Daemon Connectivity Check ────────────────────────────────────────

        private static async Task<bool> WaitForDaemonAsync(string url, TimeSpan timeout)
        {
            var stopwatch = Stopwatch.StartNew();
            int attempt = 0;

            using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(1) };

            while (stopwatch.Elapsed < timeout)
            {
                attempt++;
                try
                {
                    var status = await client.GetAsync($"{url}/status");
                    if (status.IsSuccessStatusCode)
                    {
                        Log($"(Daemon found on attempt {attempt})");
                        return true;
                    }
                }
                catch
                {
                    // Not ready yet
                }

                // Wait before retrying (increasing backoff)
                int delayMs = Math.Min(200 * attempt, 1000);
                await Task.Delay(delayMs);
            }

            return false;
        }

        // ─── Windows Message Loop ────────────────────────────────────────────

        private static void RunMessageLoop()
        {
            // Windows message loop for the hook to work
            MSG msg;
            while (GetMessage(out msg, IntPtr.Zero, 0, 0) != 0)
            {
                TranslateMessage(ref msg);
                DispatchMessage(ref msg);
            }
        }

        // ─── Win32 Imports for Message Loop ──────────────────────────────────

        [DllImport("user32.dll", SetLastError = true)]
        private static extern int GetMessage(out MSG lpMsg, IntPtr hWnd, uint wMsgFilterMin, uint wMsgFilterMax);

        [DllImport("user32.dll")]
        private static extern bool TranslateMessage(ref MSG lpMsg);

        [DllImport("user32.dll")]
        private static extern IntPtr DispatchMessage(ref MSG lpMsg);

        [StructLayout(LayoutKind.Sequential)]
        private struct MSG
        {
            public IntPtr hWnd;
            public uint message;
            public IntPtr wParam;
            public IntPtr lParam;
            public uint time;
            public int pt_x;
            public int pt_y;
        }

        // ─── Logging ─────────────────────────────────────────────────────────

        private static void Log(string message, bool isError = false)
        {
            string timestamp = DateTime.Now.ToString("HH:mm:ss.fff");
            string prefix = isError ? "[ERR]" : " [OK]";

            if (isError)
            {
                Console.Error.WriteLine($"{timestamp} {prefix} {message}");
            }
            else
            {
                if (_verbose || !message.StartsWith("("))
                {
                    Console.WriteLine($"{timestamp} {prefix} {message}");
                }
            }
        }

        private static string GetVersion()
        {
            var assembly = typeof(Program).Assembly;
            var version = assembly.GetName().Version;
            return version?.ToString() ?? "0.2.0";
        }

        private static void ShowHelp()
        {
            Console.WriteLine(@"
SmartLangGuard Keyboard Hook - Auto-correct keyboard layout mistakes in real time

USAGE:
  SmartLangGuard.KeyHook.exe [OPTIONS]

OPTIONS:
  --daemon-url <url>   Daemon HTTP URL (default: http://localhost:41783)
  --min-word <n>       Minimum word length to analyze (default: 2)
  --max-word <n>       Maximum word length to analyze (default: 50)
  --verbose            Enable verbose logging
  --help               Show this help message

EXAMPLES:
  SmartLangGuard.KeyHook.exe
  SmartLangGuard.KeyHook.exe --daemon-url http://localhost:41783 --verbose
  SmartLangGuard.KeyHook.exe --min-word 3 --max-word 30

NOTES:
  - Requires Windows Vista or later
  - The SmartLangGuard daemon must be running on the same machine
  - The hook works in ALL applications (Word, Chrome, VS Code, Telegram, etc.)
  - Press Ctrl+C to stop the hook
");
        }
    }
}
