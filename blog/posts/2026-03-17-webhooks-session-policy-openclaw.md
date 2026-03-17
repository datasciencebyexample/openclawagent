# OpenClaw Webhooks: Secure Event Ingress With Session Key Policy

Webhooks are the cleanest way to wake OpenClaw from outside systems. They let an external service push an event into the Gateway without spinning up a full interactive chat session, which is exactly what you want for emails, incident alerts, CI signals, and app events. But webhook ingress is also an easy place to over-trust external payloads or accidentally collapse multiple event streams into the same session. This post is a practical, defensive setup guide with concrete config, mapping strategy, and one failure mode you should plan for.

## When webhooks are the right choice

Use webhooks when you have a reliable external event source that can send an HTTP request and you want OpenClaw to respond on its own schedule. Typical cases:

- A SaaS event (new email, failed build, security alert) should trigger analysis or a summary.
- You need a one-way trigger that wakes the agent without giving end users direct access to the bot.
- You want a stable, auditable ingress with explicit auth and routing controls.

If you need a full, multi-turn conversation or interactive prompting, use a normal channel (Slack, Discord, WhatsApp, etc.) instead of webhooks.

## Minimal, safe enablement

Start by enabling hooks in the Gateway config. This gives you a single ingress surface with a dedicated token and optional restrictions on which agents are reachable.

```json
{
  hooks: {
    enabled: true,
    token: "${OPENCLAW_HOOKS_TOKEN}",
    path: "/hooks",
    allowedAgentIds: ["hooks", "main"]
  }
}
```

Operational guidance:

- Treat the hook token as a full-trust credential for that gateway. Keep it out of logs and rotate it like any other API key.
- Use a dedicated `hooks` agent where possible so webhook-triggered work has a smaller tool surface.
- Keep the webhook endpoint behind a trusted proxy, loopback, or tailnet; don’t expose it to the public internet without strong network controls.

## The three webhook patterns

OpenClaw gives you three shapes to choose from. Pick the one that matches your payload.

### 1) `POST /hooks/wake` for “just wake up”

This is the simplest option. You send a short `text` description, and OpenClaw enqueues a system event and (optionally) triggers a heartbeat immediately.

Use this when you want the agent to decide what to do next based on a short description, not a structured payload.

### 2) `POST /hooks/agent` for direct agent runs

This route runs an isolated agent turn and can optionally deliver the response to a channel. It accepts a richer payload including:

- `message` (required)
- `name` (human label for the event source)
- `agentId` (route to a specific agent)
- `sessionKey` (only allowed if explicitly enabled)
- `wakeMode` (`now` or `next-heartbeat`)
- `deliver`, `channel`, `to` for outbound routing
- `model`, `thinking`, `timeoutSeconds` for execution tuning

Practical use: webhook-triggered analysis of an alert, with delivery sent back to a Slack channel or DM.

### 3) `POST /hooks/<name>` with mappings

Mappings let you accept arbitrary payloads and turn them into either a `wake` or `agent` action. This is the cleanest way to build a stable, versioned integration: your external system keeps sending its native payload, and you translate it inside OpenClaw using `hooks.mappings` or a transform module.

Use mappings when you need:

- Payload normalization (different sources, same internal format)
- Structured parsing (extracting IDs, routing keys, or delivery targets)
- A stable contract that won’t break when external payloads change

## Session key policy: the quiet breaking change you should respect

By default, `/hooks/agent` does **not** allow callers to set `sessionKey`. This is intentional. If you allow arbitrary session keys from external payloads, you risk merging unrelated event streams into the same conversation or letting untrusted systems target sensitive sessions.

The recommended posture is:

```json
{
  hooks: {
    enabled: true,
    token: "${OPENCLAW_HOOKS_TOKEN}",
    defaultSessionKey: "hook:ingress",
    allowRequestSessionKey: false,
    allowedSessionKeyPrefixes: ["hook:"]
  }
}
```

Guidance:

- Keep `allowRequestSessionKey` off unless you truly need caller-driven routing.
- Set a stable `defaultSessionKey` so webhook traffic lands in a dedicated session.
- If you allow request keys, restrict them with `allowedSessionKeyPrefixes` and use a `hook:` namespace.

This protects your main session from external systems and keeps webhook events auditable.

## Designing reliable session keys (if you must)

If you do need per-event or per-source sessions, design a deterministic keying scheme. A good pattern is:

- `hook:<source>:<tenant>:<thread-or-entity>`

Examples:

- `hook:github:org-repo:issue-123`
- `hook:ci:buildkite:pipeline-a`
- `hook:alerts:datadog:service-api`

This gives you replay-safe, partitioned sessions that won’t collide. It also keeps audit trails readable.

Tradeoff: more sessions means more memory and more state files. If you only need a summary, prefer a single `hook:ingress` session and thread the external ID inside the message instead.

## Mappings and transforms: where integrations become durable

`hooks.mappings` lets you declare how incoming payloads map to an action. For more complex logic, use a transform module under a dedicated `hooks.transformsDir`. That module can normalize payloads, calculate a session key, and choose delivery targets.

Practical pattern:

1. Keep the webhook endpoint stable (`/hooks/<name>`).
2. Parse payloads in a transform module.
3. Emit a canonical message format with a session key and optional delivery routing.

This keeps external systems dumb and OpenClaw smart, so you can evolve your routing without touching the source system.

Security note: transform modules must live under the hooks transforms root. Path traversal is rejected, which prevents loading unexpected code. Treat this as a production deployment boundary and only update transforms through controlled releases.

## Failure mode: session collisions that blur unrelated events

**What happens:** You enable `allowRequestSessionKey=true` without a prefix policy. An external system sends a `sessionKey` that accidentally matches an existing internal session. Over time, alerts, emails, or CI events all land in the same conversation. The agent starts mixing unrelated context, and summaries become misleading.

**Mitigation:**

- Keep `allowRequestSessionKey=false` unless the integration truly requires it.
- If you enable it, enforce `allowedSessionKeyPrefixes: ["hook:"]`.
- Use a deterministic session key scheme that includes the source and entity ID.
- Add a mapping that rejects payloads without an expected `source` or `id` field, so missing identifiers don’t collapse into the default session.

This turns a confusing, silent failure into an explicit, safe routing policy.

## Practical implementation flow

Here is a pragmatic sequence that keeps risk low while you roll in webhook automation:

1. **Create a dedicated `hooks` agent.** Give it a narrower `tools.profile` and stricter sandboxing than your main agent.
2. **Enable hooks with a dedicated token.** Store it in a secret manager and inject via env var.
3. **Start with `/hooks/wake`.** Use short, high-level messages while you validate auth and ingress reliability.
4. **Add mappings for structured payloads.** Keep the request URL stable and evolve transformations internally.
5. **Decide on session policy early.** Set a `defaultSessionKey` and only enable request keys if you need partitioning.
6. **Choose delivery routing deliberately.** If `deliver=true`, specify `channel` and `to` so replies land where people will see them.
7. **Define idempotency expectations.** If the external system retries, make sure your transform or downstream logic deduplicates by event ID.

## Rollout checklist

Use this short checklist to ship webhooks safely:

- Add `hooks.enabled`, `hooks.token`, and a dedicated `hooks` agent.
- Set `hooks.defaultSessionKey` to an isolated namespace.
- Keep `hooks.allowRequestSessionKey=false` unless you need it.
- If you allow request keys, require `allowedSessionKeyPrefixes: ["hook:"]`.
- Start with `/hooks/wake`, then move to mappings.
- Use a transform module for payload normalization and session key generation.
- Choose explicit delivery routing (`deliver`, `channel`, `to`) for human-visible responses.
- Redact or omit sensitive payloads from webhook logs.

## Final thought

Webhooks are a powerful way to connect OpenClaw to the rest of your systems, but they are also a fast path for accidental context contamination. Treat session keys as a routing policy, not a convenience. With a dedicated agent, strict session key prefixes, and a transform-first approach, you get reliable automation that stays safe even as your event volume grows.
