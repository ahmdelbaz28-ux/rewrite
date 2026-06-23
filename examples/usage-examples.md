# Example: Using SmartLangGuard MCP from Cursor/Claude

After installing the MCP server, you can ask the AI things like:

## Basic fixes

> "I typed 'high hofhv;' but I meant to type in Arabic. Use smartlangguard to fix it."

The AI will call the `fix_text` tool and respond:
> "The corrected text is: اهلا اخبارك"

(Note: "اهلا اخبارك" on the QWERTY layout is "high hofhv;")

## Fixing clipboard contents

> "I just copied some text that looks like keyboard layout mistake. Fix my clipboard."

The AI will call `fix_clipboard`, which reads your clipboard, fixes it, and writes back.

## License management

> "Activate my SmartLangGuard Pro license. Token: slg_abc123..."

The AI calls `register_license` and confirms activation.

> "What's my current SmartLangGuard license tier?"

The AI calls `license_status` and reports the tier + features.

## Real-world example (in Cursor chat)

```
User: I'm writing an email to my Egyptian client but I keep typing 
      English letters when I mean Arabic. Here's what I wrote:
      
      "high bk ya ahmed, ana mish fahm el mawdoo3"
      
      Can you fix this?

Cursor (calling fix_text tool):
  → اهلا بك يا احمد، انا مش فاهم الموضوع

Cursor: Here's the corrected Arabic version of your email:
        "اهلا بك يا احمد، انا مش فاهم الموضوع"
        
        The fix was 95% confident (rules-based). Want me to send 
        this to your clipboard so you can paste it into your email app?
```

## Tips for best results

1. **Be specific about what's wrong**: "I typed this in English layout but meant Arabic" works better than "fix this".
2. **Longer context = better AI scoring**: paste a paragraph, not a single word.
3. **Mixed text works**: "I typed 'hello high' - the second word is wrong" → AI will fix only the wrong part.
4. **Clipboard is fastest**: use `fix_clipboard` for one-tap fixes from any app.
