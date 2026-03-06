# Rate Limits and Backoff in OpenClaw: Keep Agents Fast Without Getting Throttled

APIs will shut you down if you hammer them. OpenClaw works best when your agent expects rate limits, backs off gracefully, and keeps progress visible.

## Why Backoff Matters

Rate limits are normal, not failure. A good agent treats 429s and transient errors as a signal to slow down, not to stop.

## A Simple Strategy That Works

- Budgeted concurrency: cap parallel calls per provider
- Exponential backoff with jitter: increase wait time and add randomness
- Retry windows: stop after a bounded time and report partial results
- Cooldown cache: remember which endpoints are hot and pause them first

## A Practical Flow

1. Detect rate-limit responses or timeout bursts
2. Reduce concurrency for that provider
3. Retry with exponential backoff + jitter
4. Surface a status update so the user sees progress

## Takeaway

Agents that respect rate limits stay reliable. Build backoff into your OpenClaw workflows and you get speed when it is available, and stability when it is not.
