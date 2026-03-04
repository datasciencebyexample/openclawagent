# Dry-Run Simulations in OpenClaw: Preview Agent Actions Before They Execute

Blind automation is where most surprises happen. A simple dry-run mode lets your agent simulate what it would do, show you the plan, and only then commit to real actions.

## What Dry-Run Means

A dry-run is a no-side-effects run that still produces outputs:

- The actions the agent would take
- The inputs it would use
- The files or systems it would touch

Think of it as a preview pass, not a slower production run.

## A Simple Pattern That Works

Add a `dry_run` switch to your workflow:

1. Plan: generate the action list and targets
2. Report: show the plan in plain language
3. Execute: only if `dry_run` is false

This keeps the same logic path for both modes, which reduces drift.

## Where Dry-Run Pays Off

It is most useful in high-impact workflows:

- File changes across many locations
- External API calls with billing or rate limits
- Bulk messaging or notifications

If an action is hard to undo, it belongs behind a dry-run preview.

## Takeaway

A dry-run mode turns "trust me" automation into "show me" automation. In OpenClaw, it is the easiest way to keep speed without gambling on side effects.
