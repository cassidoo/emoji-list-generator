# 🎯 Emoji List Generator

An AI-powered CLI that turns plain bullet lists into emoji-prefixed markdown lists — and copies the result to your clipboard.

Built on:

- [`@opentui/core`](https://opentui.com) for the terminal UI
- [`@github/copilot-sdk`](https://www.npmjs.com/package/@github/copilot-sdk) for the AI brain
- [`clipboardy`](https://www.npmjs.com/package/clipboardy) for clipboard access

## ✨ Demo

```
Before                        After
- Ship onboarding             🚀 Ship onboarding
- Investigate flaky test  ->  🐛 Investigate flaky test
- Take a break                ☕ Take a break
```

## 📋 Prerequisites

1. **[Bun](https://bun.sh)** ≥ 1.3 — OpenTUI is Bun-exclusive.
2. **GitHub Copilot CLI** installed and authenticated (`copilot` on your `PATH`, signed in with a Copilot-enabled account).

## 🚀 Install

```bash
git clone <this-repo>
cd emoji-list-generator
bun install
```

## 🛠 Usage

```bash
bun start
```

1. The TUI opens with a text area focused.
2. Type or paste your bullet points (one per line, `-`, `*`, or `+` markers).
3. Press **Ctrl+S** to generate.
4. The result appears in the panel below **and is copied to your clipboard**.
5. Edit your input and press Ctrl+S again to regenerate, or **Ctrl+C** to quit.

## ⚙️ How it works

On submit, the app opens a [`CopilotSession`](https://www.npmjs.com/package/@github/copilot-sdk) with a system prompt instructing the model to:

- Replace each `-`/`*`/`+` marker with a single contextually relevant emoji
- Preserve the original wording
- Return only the transformed list

The streamed `assistant.message` is captured, cleaned of any code fences, written to the clipboard, and displayed in the result panel.

## 📝 License

MIT
