# Circuit Breakers in OpenClaw: Stop Cascading Failures Before They Start

When an external dependency flakes out, agents tend to do the worst possible thing: retry faster, across more parallel runs, with even more load. That turns a single bad API into a cascading failure that floods your logs, burns rate limits, and confuses users. A circuit breaker is a small control loop that says: "We are hurting this dependency; pause, cool down, then try again carefully." This post shows how to add circuit breakers around OpenClaw tool calls in a way that is practical, observable, and safe to roll out.

You will get:
- A concrete breaker design with thresholds, cool-downs, and half-open probes.
- Where to place breakers in OpenClaw flows.
- A failure mode and mitigation so you do not over-block valid work.
- A short rollout checklist.

## What a breaker actually does (and does not do)

A breaker is not a retry system. It is a state machine that gates whether a tool call is allowed to run.

Typical states:
- `closed`: normal traffic. We record errors and latency, but allow calls.
- `open`: calls are blocked for a cool-down window. We return a structured error quickly.
- `half_open`: we allow a tiny number of probe calls. If they succeed, we close; if they fail, we open again.

OpenClaw already has backoff and retry patterns in most tool wrappers. The breaker complements that by reducing demand when a dependency is unhealthy. The minimum success criteria is that a burst of failures causes a short pause, and the pause automatically ends when health returns.

## Where to implement breakers in OpenClaw

There are three common injection points. Pick the one that aligns with how your agent is deployed.

1. Tool wrapper (most direct)
- Wrap each external tool in a breaker check.
- Best for self-hosted tools or when you want per-tool semantics.
- Drawback: you must update every tool wrapper.

2. Pre-action guardrail layer
- If you already use a policy layer that inspects tool calls, add breaker checks there.
- Best when you want a single enforcement point and consistent denial responses.
- Drawback: you need your guardrail layer to know tool identity and dependency.

3. Gateway middleware
- Put a breaker in the gateway that fronts multiple tools.
- Best for shared dependencies and when you want global circuit control.

If you are unsure, start with the guardrail layer because it centralizes logic and gives consistent user messages.

## A concrete breaker design you can implement today

A practical breaker for agent tools has four elements:

1. Error classification
- Only count errors that indicate dependency failure. Do not count user errors.
- Example classification:
  - Count: `timeout`, `connection_error`, `http_429`, `http_5xx`.
  - Ignore: `http_400`, `http_401`, `http_403`, `validation_error`.

2. Sliding window and threshold
- Track N recent calls within a time window.
- If error rate exceeds a threshold, open the breaker.

3. Cool-down window
- After opening, block calls for a fixed duration.
- Make it short to begin with (30-120 seconds) so you do not over-block.

4. Half-open probes
- After cool-down, allow a small number of calls (1-3).
- If they succeed, close. If they fail, open again with a longer cool-down.

Here is a minimal configuration you can adapt:

```yaml
breaker:
  name: external-weather-api
  window_seconds: 120
  min_calls: 10
  error_rate_threshold: 0.5
  open_seconds: 60
  half_open_max_probes: 2
  backoff_multiplier: 2
  counted_errors:
    - timeout
    - connection_error
    - http_429
    - http_5xx
```

This says: if at least 10 calls occur in 2 minutes and half fail for dependency reasons, open the breaker for 60 seconds. After that, allow 2 probe calls. If they fail, reopen for 120 seconds, then 240, etc.

## Where to store breaker state

You need a place to store breaker state that is consistent across concurrent sessions.

Options:
- In-memory (per process). Easy, but not shared across multiple gateway instances.
- Local file (shared with a lock). Works for a single host and survives restarts if you write periodically.
- External store (Redis or a small KV). Best for multiple nodes.

If you are a single-node deployment, start with a local file and a short TTL. The key requirement is atomic updates; otherwise you get flickering open/close behavior under load.

## Designing breaker keys: per tool, per user, or global

Keying strategy changes behavior significantly.

Per tool (recommended default)
- Key: `tool_id` or `dependency_name`.
- Pros: a failing dependency does not block unrelated tools.
- Cons: if multiple tools call the same dependency, you may under-block.

Per dependency
- Key: `dependency_name` that can be shared across tools.
- Pros: protects the upstream service more effectively.
- Cons: a small failure in one tool can block healthy usage in another.

Per user or per tenant
- Key: `dependency_name:tenant_id`.
- Pros: noisy tenants do not ruin it for everyone else.
- Cons: can still overload upstream; harder to reason about global health.

A pragmatic compromise is: per dependency global breaker plus an optional per-tenant breaker with a lower threshold. If either breaker is open, block the call.

## Integration pattern: guardrail gate + structured fallback

The cleanest user experience is to intercept tool calls before execution and return a structured response that the agent can reason about.

Pseudo flow:
1. Guardrail receives `tool_call` with `dependency_name`.
2. Breaker check returns `allowed` or `blocked` with `retry_after`.
3. If blocked, respond with a structured error the agent can use to adjust the plan.

Example response the agent can interpret:

```json
{
  "error": "dependency_unavailable",
  "dependency": "external-weather-api",
  "retry_after_seconds": 60,
  "message": "Weather API is temporarily unavailable. Try again soon or ask for a cached result."
}
```

This gives the agent a chance to pivot: use cached data, defer the action, or ask the user for confirmation to retry later.

## Tradeoffs and tuning guidance

- Thresholds: A low error threshold (like 20%) opens quickly but may trip on transient blips. A higher threshold (50-70%) waits longer but gives more load to a failing service. Start around 50% with `min_calls` at 10-20.
- Cool-down: Short cool-downs reduce user disruption but risk hammering a struggling API. Use 60 seconds to start, then exponential backoff for repeated failures.
- Window size: Small windows react faster but are noisy; large windows are stable but slow. 1-2 minutes is a reasonable default.
- Probe count: One probe is simple but can close the breaker on luck. Two or three is safer if you can afford it.

If your upstream enforces strict rate limits, bias toward earlier opens and longer cool-downs. If the upstream is flaky but tolerant, keep cool-downs short and rely on probes to re-open quickly.

## Failure mode: breaker opens on client errors

A common mistake is to count all non-200 responses as errors. If users send bad input and trigger `http_400`, the breaker will open and block all subsequent calls. It looks like a dependency outage but is actually user error.

Mitigation:
- Classify errors carefully. Count only dependency failures (timeouts, 429s, 5xx).
- Record a separate metric for user errors so you can debug the real issue without tripping the breaker.
- Add a safeguard: if the majority of errors in the window are `http_4xx`, do not open the breaker.

This keeps the breaker focused on upstream health, not input quality.

## Verification and rollout checklist

Use this short checklist when you ship breakers to production:

1. Enable in audit mode first: log breaker decisions without blocking.
2. Verify error classification with real logs for at least one day.
3. Set conservative thresholds and short cool-downs for the first week.
4. Add a metric for `breaker_state` and `blocked_calls` per dependency.
5. Provide a clear user-facing message for blocked calls.
6. Run a synthetic test that forces timeouts and verifies open/half-open transitions.
7. Document how to manually reset a breaker in case of a stuck open state.

## Practical next steps

If you already have OpenClaw guardrails, add a breaker check there first. If not, add a thin wrapper around your most sensitive tools (payment, messaging, or external data). Start with one dependency, monitor for a week, then expand to others.

The goal is simple: when a dependency is unhealthy, your agents should calm down, not panic. A small breaker layer makes that happen with surprisingly little code.
