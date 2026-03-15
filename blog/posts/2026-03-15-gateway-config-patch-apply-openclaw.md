# OpenClaw Gateway Config Changes: Safe `config.patch` and `config.apply` Rollouts

Configuration changes in OpenClaw are operational changes. They can alter tool access, agent behavior, plugin settings, and even whether restarts are allowed. If you treat them like casual edits, you get the same risks as hot-patching production code: unexplained regressions, accidental permission changes, and painful rollbacks.

This guide shows a practical, low-drama way to roll out Gateway config updates using the `gateway` tool APIs: `config.patch`, `config.apply`, and `restart`. The focus is on safe rollouts, predictable behavior, and fast recovery when something goes wrong.

## Why config changes need the same rigor as code

OpenClaw loads configuration into a running Gateway that controls:

- What tools are allowed and denied.
- How agents are scheduled (heartbeats, cron, and wakeups).
- Plugin configs and capabilities.
- Critical control-plane behaviors like restarts and auth settings.

A single config change can effectively expand permissions or shrink capabilities without any code change. Treating config edits as a formal rollout makes the system predictable under pressure.

## The three operations you should know

OpenClaw exposes three distinct Gateway operations for config management:

- `gateway.config.patch`: Merge a partial update into the running config, then restart and wake. This is best for small, targeted changes where you want minimal surface area.
- `gateway.config.apply`: Validate and apply a full config snapshot, then restart and wake. This is best for precise, audited rollouts where you want full-file control.
- `gateway.restart`: Restart the Gateway in place, with an optional `delayMs` to avoid interrupting in-flight replies.

There is also `gateway.config.schema.lookup`, which lets you inspect a single config path without pulling the whole schema into context. Use it as a quick safety check when you are not sure about a path’s structure.

## Picking patch vs apply: the decision table

Use this quick table to choose the right operation:

- Use `config.patch` when you are changing one or two focused keys and want minimal churn.
- Use `config.apply` when you want an explicit full snapshot with exact, reviewable state.
- Use `restart` alone when you only changed external dependencies (like secrets) and need a clean restart without config changes.

Tradeoff summary:

- `config.patch` is faster and lower effort, but can mask unintended defaults if you do not read the existing config.
- `config.apply` is more work but gives you deterministic, audited state.
- `restart` is the least risky operation but does not solve config drift by itself.

## A safe rollout workflow

This workflow keeps changes small, reversible, and observable.

### 1) Inventory current state

Before you change anything, capture what you are about to change.

- Use `gateway.config.get` to view the current config and capture `baseHash` if you plan to call `config.apply` or `config.patch`.
- Use `gateway.config.schema.lookup` to confirm the exact shape of the paths you plan to modify.
- Record which agents and tools are affected.

This is your rollback anchor. Without it, you are relying on memory when something breaks.

### 2) Draft the smallest possible change

Avoid “cleanup” or unrelated tweaks in the same patch. If your goal is to adjust one tool policy, keep the patch to just that key.

Example: deny a single tool globally (useful if you are responding to an incident).

```bash
# capture the hash so patch/apply can be applied safely
openclaw gateway call config.get --params '{}'

# merge a partial update (arrays replace)
openclaw gateway call config.patch --params '{
  "raw": "{ tools: { deny: [\"browser\"] } }",
  "baseHash": "<hash>",
  "restartDelayMs": 5000
}'
```

Even if you plan to later re-allow the tool, a clean single-key patch makes rollback and review trivial.

### 3) Pre-flight checks

Before you apply changes, answer these questions:

- Does the config path exist and accept the values you are setting?
- Are any secrets referenced (for example, plugin configs) still valid and loaded?
- Will a restart interrupt a critical flow right now?

If you have a canary Gateway or a low-risk environment, apply the change there first.

### 4) Apply with a safe restart

The `gateway` tool handles validation and restart on your behalf, but you still control timing. A small `delayMs` (or `restartDelayMs` when using the CLI/RPC) prevents the restart from cutting off an active reply.

If you are making a large change or multiple related changes, prefer `config.apply` with a complete snapshot rather than a patch. That gives you a single source of truth and a stable rollback target.

### 5) Verify behavior, not just health

A healthy process is not the same as correct behavior. Always validate the actual outcome:

- Confirm the tool policy is enforced (denied tools should not be callable).
- Confirm expected tools still work.
- Confirm the agent continues to respond within expected latency.

If you can only do one check, do the behavior check. It is the fastest signal that the change is safe.

## Concrete implementation patterns

Here are three practical patterns that show how to use config changes safely.

### Pattern A: Emergency tool shutdown

When a tool becomes risky (for example, a browser exploit or a runaway automation), you can deny it globally with a patch, then revisit later.

- Use `config.patch` to add the tool to `tools.deny`.
- Verify a blocked tool call returns a denial error.
- Create a follow-up change to either re-enable or replace it with a safer workflow.

Tradeoff: this is fast and low-risk, but it is a blunt instrument. Expect some user-visible breakage, and communicate it clearly.

### Pattern B: Controlled plugin config updates

Plugin configs live under `plugins.entries.<id>.config`. These are powerful and can quietly change behavior.

Recommended approach:

- Use `config.schema.lookup` on the exact plugin config path to avoid guessing field names.
- Apply a single change with `config.patch`.
- Verify the plugin’s behavior with a deterministic smoke test.

Tradeoff: if the plugin config includes arrays, a patch may replace the entire array. If that is risky, prefer a full `config.apply` so you can see the whole config snapshot before and after.

### Pattern C: Safer restarts during high-traffic windows

When you must restart during active usage, use `delayMs` to reduce mid-reply interruptions.

- Schedule a brief delay (2–5 seconds works for many cases).
- Announce the restart to users if you run a chat-facing gateway.
- Verify the first post-restart reply is coherent (no cold-start errors).

Tradeoff: delays reduce disruption but extend the time you are running in a known-risk state. Keep them short.

## Failure mode: “patch overwrote more than expected”

A common failure mode is assuming a patch will merge an array or nested object the way you intended. For many configs, a patch replaces an array in full.

Example failure:

- You patch `tools.deny` to add one item.
- The patch replaces the entire array, removing other existing denied tools.
- A previously blocked tool becomes available without review.

### Mitigation

- Always read the current config before patching an array.
- If the array is large or critical, prefer `config.apply` with a full snapshot so you can see exactly what will be in production.
- Add a verification check that specifically validates the denied list after the change.

## Rollback strategy that works every time

Treat rollback as a standard operation, not an emergency improvisation.

- Keep the previous config snapshot or a precise diff.
- Roll back using `config.apply` so you restore the exact known-good state.
- Restart and re-run the same verification checks you used during rollout.

If you only have time to build one safety habit, make it the snapshot. It is the difference between a 2-minute rollback and a 2-hour incident.

## Lightweight verification checklist

Use this after every config change:

- Confirm the target path exists and has the intended value.
- Confirm key tools are allowed/denied as expected.
- Confirm at least one end-to-end agent interaction works.
- Confirm error messages are clear and actionable.
- Log the change with a short reason and a rollback note.

## Final guidance

OpenClaw config changes are most reliable when they are deliberate, minimal, and easy to reverse. Use `config.patch` for small, focused updates; use `config.apply` for full, audited snapshots; and always verify real behavior after the restart.

If you adopt only one habit, make it this: read the current config before you patch it, and keep a snapshot you can reapply in under a minute. That single step prevents most configuration-driven incidents.
