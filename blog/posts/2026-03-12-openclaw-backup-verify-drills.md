# OpenClaw Backups You Can Trust: `backup create`, `verify`, and Restore Drills

If you run an OpenClaw agent you actually rely on, a backup is only useful when you can *prove* it will restore. Recent OpenClaw releases added a real backup workflow (`openclaw backup create`) plus a built-in verifier (`openclaw backup verify`). That changes the backup story from “tar it and hope” to “capture, validate, drill.” This post shows a practical, concrete path for implementing backups that survive the day you need them.

We’ll cover what the backup command includes, how to store and verify archives, and how to run low-friction restore drills without breaking production. I’ll also call out failure modes you’ll hit in the real world and how to avoid them.

## What `openclaw backup create` actually captures

OpenClaw builds a backup archive based on the current install and active config. By default, `openclaw backup create` gathers:

- The OpenClaw state directory (usually `~/.openclaw`).
- The active config file path.
- The credentials directory.
- Session logs.
- Workspaces discovered from your config.

It also generates a `manifest.json` inside the archive, which lists exactly which sources were used and how they were packed. That manifest is the backbone of the verifier.

This is important because a backup without context is a liability. If you can’t answer “what is inside this archive?” you can’t plan a restore.

## The minimum viable backup flow

If you only do one thing after reading this post, do this:

```bash
openclaw backup create --verify --output ~/OpenClawBackups
```

That single command does three valuable things:

- Writes a timestamped `.tar.gz` archive to a known location.
- Embeds a manifest of the sources OpenClaw used.
- Verifies the archive immediately after creation.

The verification step ensures the archive is internally consistent (single manifest root, no traversal paths, all payloads present). That doesn’t guarantee a perfect restore, but it eliminates the most painful class of “backup looks fine, is actually corrupt” failures.

## Decide your backup policy first

Backups aren’t a single command; they’re a policy. Pick these knobs explicitly so future-you doesn’t have to reverse engineer why your agent is missing data.

1. **What’s in scope?**
   - Default: state + config + credentials + workspaces.
   - If you want a tiny archive for CI or quick migration, use `--only-config`.
   - If workspaces are huge or disposable, use `--no-include-workspace`.

2. **Where are archives stored?**
   - Default output is a timestamped `.tar.gz` in your current working directory. If that directory lives inside a backed-up source tree, OpenClaw falls back to your home directory for safety.
   - Store outside any backed-up directory to avoid self-inclusion. OpenClaw prevents output paths inside the source trees (default output falls back to home, and explicit in-source paths are rejected), but you should still use a dedicated backup directory.

3. **How often?**
   - Daily if your agent runs continuously or holds operational memory.
   - Weekly if it’s a side project.

4. **How many to keep?**
   - Keep at least 3 rolling archives (last known good, previous, and older).
   - If storage is cheap, keep 14–30 for real history.

5. **Where is the offsite copy?**
   - Local backups are necessary but not sufficient. If the machine dies, the backup dies with it.

## A practical, repeatable backup script

Here’s a simple pattern you can adapt. It favors safety and observability over cleverness.

```bash
BACKUP_DIR="$HOME/OpenClawBackups"
mkdir -p "$BACKUP_DIR"

openclaw backup create \
  --output "$BACKUP_DIR" \
  --verify \
  --json
```

Why `--json`? It makes the output easy to parse for success/failure and to pipe into logs. If you’ve built alerting around agent health, treat backup failures as a real incident.

## Verification is not optional

The verifier is a gift. Use it, and use it separately from creation so you can re-check older archives.

```bash
openclaw backup verify ~/OpenClawBackups/2026-03-12T09-00-00.000Z-openclaw-backup.tar.gz
```

Verification is fast, deterministic, and should be part of a scheduled job. If you detect an archive failure early, you can re-run the backup before you need it.

## Invalid config behavior (and how to still get a backup)

OpenClaw intentionally lets `openclaw backup create` bypass normal config preflight so you can still recover during an incident. But workspace discovery depends on a valid config. If your config file exists but is invalid, `backup create` fails *only* when workspace backup is enabled. In that case, re-run with `--no-include-workspace` to capture state, config, credentials, and sessions without parsing workspaces. If you only need the config file itself, `--only-config` works even when the config is malformed.

## Restore drills: the part everyone skips (and regrets)

A backup without a restore drill is just optimism. The safest way to run drills without breaking production is to restore into an isolated profile or test machine.

**Option A: Restore into a new profile**

1. Create a fresh profile to isolate state: `openclaw --profile restore-drill`.
2. Extract the backup archive into a staging directory (not your live `~/.openclaw`).
3. Point the profile at the restored config and state directories.
4. Run `openclaw status` and verify memory, skills, and key configs are present.

**Option B: Restore on a spare machine or VM**

If you can spare a box, do a real cold-restore once a month. Restore into a clean install and verify the agent can run a basic workflow. This is the only way to surface dependencies on machine-specific paths or missing system packages.

## Concrete tradeoffs you should decide up front

1. **Include sessions or not?**
   - Session logs can be large. If you use them for audits or debugging, keep them. If you don’t, exclude them and store them elsewhere.

2. **Credentials: include or externalize?**
   - OpenClaw backs up credentials by default. If you use external secret managers, you may *want* to exclude credentials from backups and re-inject on restore. That’s safer but adds a restore step.

3. **Single archive vs. split archives**
   - A single archive is easy to handle but hard to partially restore. Split archives (config-only + state + workspace) give you flexibility but increase operational complexity.

4. **Local only vs. offsite**
   - Local-only is quick and cheap. Offsite is what saves you when a drive fails or ransomware hits.

5. **Size vs. verification time**
   - Verification time scales with archive size because it scans the tarball. If your workspaces are huge, either accept the time cost or split scope (config + state daily, full workspace weekly).

6. **Overwrite behavior**
   - OpenClaw never overwrites an existing archive. If you point `--output` at a fixed filename, your job will fail on the next run. Use timestamped filenames (the default) or a rotation step.

## Failure mode you will hit (and how to mitigate it)

**Failure mode:** You run `openclaw backup create --no-include-workspace` during a storage crunch, forget you did it, and later restore to find critical project files missing. The agent “starts,” but its workflows silently fail because the workspace it depends on isn’t there.

**Mitigation:**

- Use a naming convention or metadata log that records which backup policy was used. For example, log the command flags to a `backup.log` file alongside the archive.
- Run a post-restore checklist that validates presence of required workspace paths (e.g., `workspace/projects/customer-ops/` exists and contains expected files).
- If you must omit workspaces, take a separate workspace snapshot (even a plain tarball) and store it alongside the OpenClaw archive with matching timestamps.

## Implementation checklist (the short version)

Use this when setting up your backup workflow or reviewing it every quarter.

- Decide backup scope: default, `--only-config`, or `--no-include-workspace`.
- Choose a backup directory outside OpenClaw’s state/workspace trees.
- Run `openclaw backup create --verify --output <dir>` on a schedule.
- Run `openclaw backup verify <archive>` weekly on older archives.
- Keep at least 3 rolling backups locally.
- Store at least one offsite copy.
- Run a restore drill monthly (profile or VM).
- Document the flags and scope used for each archive.

## Final thought: make failure boring

The goal of backups isn’t to feel safe; it’s to make recovery boring. If you can restore your OpenClaw agent into a clean profile in under 30 minutes, you’re in a great place. If it takes a weekend, you’re one incident away from downtime.

Use `openclaw backup create` for consistency, `openclaw backup verify` for confidence, and restore drills for reality. The boring path is the best one.
