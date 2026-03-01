# Why I Recommend openclaw-mini for a Clean, Local Discord Agent

If you want to build an AI Discord assistant without a heavy framework, `openclaw-mini` is an excellent starting point. It keeps the architecture small, uses Python end to end, and runs through local Codex CLI sessions instead of wiring directly to an OpenAI API client in the app.

## What openclaw-mini Is

`openclaw-mini` is a minimal OpenClaw-style agent focused on one integration path:

- Discord for chat input/output
- Local Codex CLI for model execution
- `SOUL.md` and `skills/*.md` for behavior and lightweight workflow guidance

This narrow scope is exactly why it is easy to reason about.

## How It Works Internally

From reading the codebase, the runtime loop is straightforward:

1. `main.py` loads settings and starts a Discord client.
2. `bot.py` receives each user message, filters bot/self traffic, and supports built-in commands like `/help`, `/skills`, and `/soul`.
3. Non-command messages are wrapped into a single instruction payload containing:
   - the `SOUL.md` content
   - concatenated skill card content from `skills/*.md`
   - the user’s raw message
4. `llm.py` calls local `codex exec` with JSON mode and captures the final assistant reply from `--output-last-message`.

That gives you one clear control path from Discord message to Codex response.

## Local Codex Sessions Instead of Direct API Calls

One of the best design choices here is session reuse:

- Each Discord conversation maps to a persistent Codex thread ID.
- Thread state is stored in `.codex-discord-sessions.json`.
- Idle sessions expire by TTL (`CODEX_SESSION_TTL_SEC`) and are recreated when needed.

This approach avoids hand-rolling OpenAI chat session persistence logic in your Python code while still keeping conversational continuity.

## Why This Design Is Practical

For solo builders and small teams, this architecture has real advantages:

- Less surface area to debug
- Faster local iteration
- Clear operational knobs via env vars (`CODEX_SANDBOX`, approvals, timeout, model)
- Easy deployment with included launchd/systemd templates

In short: it is minimal without being toy-level.

## Who Should Use It

`openclaw-mini` is a strong fit if you want:

- A Discord-first assistant
- Local tooling control through Codex CLI
- A codebase small enough to fully understand in one sitting

If that is your goal, I recommend starting here and expanding only when your workflow demands it.

## Repo

Source code: [openclaw-mini](https://github.com/robotlearner001/openclaw-mini)
