# SmartLangGuard Windows Keyboard Hook

OS-level low-level keyboard hook for real-time auto-correction of keyboard layout mistakes.

## How it works

This package uses `SetWindowsHookEx(WH_KEYBOARD_LL)` to intercept keystrokes globally across all Windows applications. It:

1. **Buffers keystrokes** into words as you type
2. **Detects word boundaries** (space, punctuation, Enter)
3. **Sends completed words** to the SmartLangGuard daemon for analysis
4. **Auto-corrects** by simulating backspace + corrected text when a layout mistake is detected

## Requirements

- Windows 7 or later (x64)
- .NET 8.0 Runtime (or .NET SDK for building)
- SmartLangGuard daemon running on `http://localhost:41783`

## Usage

```bash
# Build
cd KeyHook && dotnet publish -c Release -o ../dist

# Run (requires daemon)
./dist/SmartLangGuard.KeyHook.exe

# Run with verbose logging
./dist/SmartLangGuard.KeyHook.exe --verbose

# Run with custom daemon URL
./dist/SmartLangGuard.KeyHook.exe --daemon-url http://localhost:41783

# Run standalone (self-contained, no .NET runtime needed)
cd KeyHook && dotnet publish -c Release --self-contained true -o ../dist-standalone
```

## Integration with Daemon

The keyboard hook works alongside the SmartLangGuard daemon. Start the daemon first, then the hook:

```bash
# Terminal 1: Start the daemon
npx @smartlangguard/daemon

# Terminal 2: Start the keyboard hook
npx @smartlangguard/windows-hook
```

## Safety Features

- **Re-entrancy protection**: Ignores its own simulated keystrokes to prevent infinite loops
- **Graceful degradation**: Works without the daemon (just no corrections)
- **Minimum word length**: Doesn't correct very short words (default: 2 chars)
- **Max word length**: Skips unreasonably long words (default: 50 chars)
- **Confidence threshold**: Only corrects when daemon confidence is ≥ 50%
