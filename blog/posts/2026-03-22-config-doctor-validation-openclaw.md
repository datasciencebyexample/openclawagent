# OpenClaw Config Doctor: Validate Changes Before They Take Down the Gateway

OpenClaw treats configuration as a contract. If the file doesn’t match the schema, the Gateway refuses to start and only diagnostic commands are available. That’s a strong safety choice, but it means a single bad edit can take your agent offline. The fix is to treat config changes like code: make small, validated edits, run a diagnostic check, and have a known-good rollback path.

This post lays out a practical workflow for safe config edits using `openclaw config get/set/unset` and `openclaw doctor`, plus tradeoffs, a failure mode to watch for, and a short verification checklist.

## Why strict validation matters (and how it fails)

OpenClaw enforces strict schema validation on startup. Unknown keys, malformed types, or invalid values prevent the Gateway from booting. When that happens, only diagnostic commands are allowed until the config is repaired. That is great for safety, but it turns “small typos” into “agent is down.” citeturn1search0

A simple example: `gateway.port` expects a number. If it becomes a string (e.g., from a JSON editor), the Gateway will reject the config. Or if you add a typo like `gatway.port`, it becomes an unknown key and fails validation. Both cases leave you in diagnostic-only mode until you fix the file. citeturn1search0

## The safe edit workflow (CLI + doctor)

Here’s a workflow that makes config changes low-risk, even on a busy system.

### 1) Start from a known-good snapshot

Use the CLI to read the config and keep a short-lived backup. The goal is to avoid hand-editing JSON when you don’t have to.

```bash
openclaw config get > /tmp/openclaw-config-backup.json
```

The CLI reads the live config and keeps you aligned with the schema and defaults. citeturn1search0

### 2) Make the smallest change possible

Prefer targeted edits instead of full-file rewrites. The CLI keeps types intact and avoids accidental key removal.

```bash
openclaw config set agents.defaults.heartbeat.every "2h"
openclaw config unset tools.web.search.apiKey
```

Both `set` and `unset` are schema-aware, so you’re less likely to introduce malformed values. citeturn1search0

### 3) Validate immediately with `openclaw doctor`

After any edit, run a diagnostic check. If validation fails, `openclaw doctor` will show exact schema errors. citeturn1search0

```bash
openclaw doctor
```

If you need automatic repair, `openclaw doctor --fix` can apply known fixes (for example, removing invalid keys). That’s useful in outages, but it can drop values you wanted to keep, so treat it as a recovery tool, not a routine editor. citeturn1search0

### 4) Let hot reload do the safe part

The Gateway watches `~/.openclaw/openclaw.json` and hot-applies most config changes automatically in the default `hybrid` mode. Changes that require a restart are handled for you in that mode. citeturn1search0

This means you can safely tweak things like tool settings, heartbeat cadence, or agent defaults without restarting the process. Save the file or run `openclaw config set`, then verify behavior.

### 5) Verify with a small, concrete check

Don’t just rely on “it didn’t crash.” Confirm the specific behavior you changed. For example:

- If you changed a heartbeat interval, wait for the next heartbeat log and confirm the new cadence.
- If you edited tool settings, run a single tool call and verify the expected behavior.

This step keeps you honest about whether your change actually took effect.

## Using the Control UI safely

The Control UI’s Config tab renders a form from the schema, which reduces the odds of invalid fields. It also includes a raw JSON editor as an escape hatch. That’s convenient, but the raw editor is where type mistakes usually slip in. citeturn1search0

If you must use the raw editor, pair it with the same validation flow:

1. Save the change.
2. Run `openclaw doctor`.
3. Confirm the specific behavior you intended to change.

## Failure mode and mitigation

**Failure mode:** A schema mismatch prevents the Gateway from booting. You only have diagnostic commands, and the agent is down. citeturn1search0

**Mitigation:**

- Keep a backup of the last known-good config file.
- Use `openclaw doctor` to pinpoint the exact schema error.
- If time is critical, restore the backup, then re-apply the change using `openclaw config set` instead of editing by hand.
- Use `openclaw doctor --fix` only when you accept that it may remove invalid keys you intended to keep. citeturn1search0

This pattern turns a hard outage into a quick, reversible fix.

## Tradeoffs to acknowledge

- **Strict validation is safe but unforgiving.** It prevents silent misconfigurations, but it also means an invalid key stops the world. citeturn1search0
- **`doctor --fix` trades correctness for speed.** It can restore service quickly, but you might lose changes if they were invalid or incomplete. citeturn1search0
- **Raw JSON editing is flexible but risky.** The schema form and CLI are safer in routine operations. citeturn1search0

## Practical checklist for every config change

1. Read the current config with `openclaw config get` and keep a short-lived backup.
2. Apply a minimal change using `openclaw config set` or `openclaw config unset`.
3. Run `openclaw doctor` immediately after the edit.
4. Verify the exact behavior you changed (one concrete check, not a vague “looks fine”).
5. If something breaks, restore the backup and re-apply the change with the CLI.

## Closing thought

OpenClaw’s schema validation makes config safer for long-term operations, but it pushes more responsibility onto your edit workflow. A few minutes of discipline — targeted edits, `doctor` checks, and a rollback file — keeps your agent online and your changes predictable.
