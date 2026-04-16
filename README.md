# 🎯 Emoji List Generator

An AI-powered CLI that turns plain bullet lists into emoji-prefixed markdown lists and copies the result to your clipboard.

Built on:

🖥️ [`@opentui/core`](https://opentui.com) for the terminal UI

:octocat: [`@github/copilot-sdk`](https://www.npmjs.com/package/@github/copilot-sdk) for the AI brain

📋 [`clipboardy`](https://www.npmjs.com/package/clipboardy) for clipboard access

## ✨ Demo

```
Before                        After
- Ship onboarding             🚀 Ship onboarding
- Investigate flaky test  ->  🐛 Investigate flaky test
- Take a break                ☕ Take a break
```

UI:

<img width="1869" height="1944" alt="image" src="https://github.com/user-attachments/assets/ce89f2bd-90c2-4548-b572-a5fe9ec1eed2" />

## 📋 Prerequisites

🥟 **[Bun](https://bun.sh)** ≥ 1.3 — OpenTUI is Bun-exclusive.

:octocat: **GitHub Copilot CLI** installed and authenticated (`copilot` on your `PATH`, signed in with a Copilot-enabled account).

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
5. Press **Ctrl+L** to clear and start over, or **Ctrl+C** to quit.

## 🌍 Install globally (run `emoji-list` from anywhere)

The `package.json` declares a `bin` named `emoji-list`. Register it globally with Bun:

```bash
# From inside this repo
bun link

# Then, from any directory
emoji-list
```

To unregister later: `bun unlink` (from this repo) or `bun remove -g emoji-list-generator`.

### Alternative: publish or install by path

```bash
# Install straight from a local folder as a global package
bun install -g /absolute/path/to/emoji-list-generator
```

### Windows PATH note

`bun link` places a shim in `%USERPROFILE%\.bun\bin` (added to your PATH by the Bun installer). If `emoji-list` isn't found after linking, open a **new** terminal window — PATH changes don't apply to already-open shells.
