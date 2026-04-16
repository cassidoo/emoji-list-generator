#!/usr/bin/env bun
import {
  createCliRenderer,
  BoxRenderable,
  TextRenderable,
  TextareaRenderable,
} from "@opentui/core";
import { CopilotClient, approveAll } from "@github/copilot-sdk";
import clipboard from "clipboardy";

// Silence noisy stderr from the Copilot CLI subprocess (e.g. Node's
// "ExperimentalWarning: SQLite is an experimental feature") so it doesn't
// bleed into the TUI's alternate-screen render.
const originalStderrWrite = process.stderr.write.bind(process.stderr);
process.stderr.write = ((chunk: string | Uint8Array, ...rest: unknown[]) => {
  const text = typeof chunk === "string" ? chunk : Buffer.from(chunk).toString();
  if (
    text.includes("[CLI subprocess]") ||
    text.includes("ExperimentalWarning") ||
    text.includes("Use `node --trace-warnings")
  ) {
    return true;
  }
  return (originalStderrWrite as (c: unknown, ...r: unknown[]) => boolean)(chunk, ...rest);
}) as typeof process.stderr.write;

const SYSTEM_PROMPT = `You are a markdown formatting assistant. The user will give you a bulleted list. For each bullet point, replace the leading "- ", "* ", or "+ " marker with a single relevant emoji followed by a single space. Preserve the original wording of each bullet exactly. If a bullet already starts with an emoji, replace it with a better-fitting one. Return ONLY the transformed list with no commentary, no code fences, and no blank lines between items.`;

const MODEL = "claude-sonnet-4.6";

type AppState =
  | { kind: "editing" }
  | { kind: "generating" }
  | { kind: "done"; output: string }
  | { kind: "error"; message: string };

async function main() {
  const renderer = await createCliRenderer({
    exitOnCtrlC: true,
    targetFps: 30,
  });

  const ctx = renderer as unknown as ConstructorParameters<typeof BoxRenderable>[0];

  const root = new BoxRenderable(ctx, {
    id: "root",
    flexDirection: "column",
    padding: 1,
    gap: 1,
    width: "100%",
    height: "100%",
  });

  const header = new BoxRenderable(ctx, {
    id: "header",
    borderStyle: "rounded",
    borderColor: "#8B5CF6",
    padding: 1,
    flexDirection: "column",
    title: "🎯 Emoji List Generator",
    titleAlignment: "center",
    flexShrink: 0,
  });
  header.add(
    new TextRenderable(ctx, {
      id: "header-sub",
      content:
        "Paste or type your bullet points below. Press Ctrl+S to generate, Ctrl+L to clear, Ctrl+C to quit.",
      fg: "#CBD5E1",
    }),
  );

  const inputBox = new BoxRenderable(ctx, {
    id: "input-box",
    borderStyle: "rounded",
    borderColor: "#475569",
    focusedBorderColor: "#22D3EE",
    title: " Your bullet points ",
    titleAlignment: "left",
    padding: 1,
    flexGrow: 1,
    minHeight: 6,
  });

  const textarea = new TextareaRenderable(ctx, {
    id: "textarea",
    placeholder:
      "- Ship the new onboarding flow\n- Investigate the flaky test\n- Take a break",
    placeholderColor: "#64748B",
    textColor: "#F8FAFC",
    width: "100%",
    height: "100%",
    keyBindings: [{ name: "s", ctrl: true, action: "submit" }],
    onSubmit: () => {
      void handleSubmit();
    },
  });
  inputBox.add(textarea);

  const statusText = new TextRenderable(ctx, {
    id: "status",
    content: "✍️  Ready — type or paste your list, then Ctrl+S to generate.",
    fg: "#94A3B8",
    flexShrink: 0,
  });

  const resultBox = new BoxRenderable(ctx, {
    id: "result-box",
    borderStyle: "rounded",
    borderColor: "#10B981",
    title: " ✨ Result ",
    titleAlignment: "left",
    padding: 1,
    flexShrink: 0,
    minHeight: 3,
  });
  const resultText = new TextRenderable(ctx, {
    id: "result",
    content: "",
    fg: "#F0FDF4",
  });
  resultBox.add(resultText);
  resultBox.visible = false;

  root.add(header);
  root.add(inputBox);
  root.add(statusText);
  root.add(resultBox);
  renderer.root.add(root);

  renderer.focusRenderable(textarea);

  renderer.keyInput.on("keypress", (key) => {
    if (key.ctrl && key.name === "l") {
      textarea.setText("");
      renderer.focusRenderable(textarea);
      setState({ kind: "editing" });
      key.preventDefault();
      key.stopPropagation();
    }
  });

  let state: AppState = { kind: "editing" };

  const setState = (next: AppState) => {
    state = next;
    switch (next.kind) {
      case "editing":
        statusText.content =
          "✍️  Ready — type or paste your list, then Ctrl+S to generate.";
        statusText.fg = "#94A3B8";
        resultBox.visible = false;
        break;
      case "generating":
        statusText.content = "⏳ Asking Copilot for the perfect emojis…";
        statusText.fg = "#FBBF24";
        resultBox.visible = false;
        break;
      case "done":
        statusText.content =
          "✅ Copied to clipboard! Press Ctrl+L to clear, Ctrl+S to regenerate, or Ctrl+C to quit.";
        statusText.fg = "#22C55E";
        resultText.content = next.output;
        resultBox.visible = true;
        break;
      case "error":
        statusText.content = `❌ ${next.message}`;
        statusText.fg = "#F87171";
        resultBox.visible = false;
        break;
    }
  };

  let client: CopilotClient | null = null;

  const handleSubmit = async () => {
    if (state.kind === "generating") return;
    const input = textarea.plainText ?? "";
    const trimmed = input.trim();
    if (!trimmed) {
      setState({ kind: "error", message: "Please enter at least one bullet point." });
      return;
    }

    setState({ kind: "generating" });

    try {
      if (!client) {
        client = new CopilotClient();
        await client.start();
      }

      const session = await client.createSession({
        model: MODEL,
        onPermissionRequest: approveAll,
        systemMessage: { mode: "append", content: SYSTEM_PROMPT },
      });

      let reply = "";
      try {
        const done = new Promise<void>((resolve, reject) => {
          session.on("assistant.message", (event) => {
            reply = event.data.content ?? reply;
          });
          session.on("session.idle", () => resolve());
        });

        await session.send({ prompt: trimmed });
        await done;
      } finally {
        await session.disconnect().catch(() => {});
      }

      const output = stripCodeFences(reply).trim();
      if (!output) {
        throw new Error("Copilot returned an empty response.");
      }

      await clipboard.write(output);
      setState({ kind: "done", output });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setState({ kind: "error", message });
    }
  };

  const cleanup = async () => {
    try {
      await client?.stop();
    } catch {
      // ignore
    }
  };

  process.on("SIGINT", async () => {
    await cleanup();
    process.exit(0);
  });
  process.on("exit", () => {
    void cleanup();
  });
}

function stripCodeFences(text: string): string {
  const fenceMatch = text.match(/```[a-zA-Z]*\n?([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();
  return text;
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
