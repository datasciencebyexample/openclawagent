# Idempotent Actions in OpenClaw: Make Retries Safe and Predictable

Agents retry. Networks drop. APIs time out. If a workflow can safely run twice without creating a mess, you get reliability without fear.

## What Idempotent Means

An idempotent action produces the same outcome even if it runs more than once. The second run should be a no-op or converge to the same state.

## Patterns That Work Well

- Idempotency keys: attach a unique request key so the backend deduplicates repeats
- Check-before-write: read state first, then write only if needed
- Upserts: update-or-insert instead of blind creates
- Append-only logs: record events, then derive state from them

## A Practical Flow

1. Generate a stable idempotency key from the task and target
2. Check current state and decide if action is already done
3. Execute if needed, then write a completion marker

This reduces double-charges, duplicate messages, and conflicting edits.

## Takeaway

Idempotency turns retries from a risk into a feature. If your OpenClaw workflows can safely re-run, you get resilience without chaos.
