# SecretRefs in OpenClaw: Rotate Credentials Without Downtime

Secrets are the most fragile part of any agent deployment. They expire, get rotated, or drift across machines, and the first sign is usually a failed action in production. OpenClaw’s SecretRef system is designed to make that failure mode predictable: secrets resolve at activation, fail fast if missing, and keep a last-known-good snapshot during reloads.

This post shows how to adopt SecretRefs with practical examples, how to choose the right source (`env`, `file`, `exec`), and how to build a safe rotation workflow that avoids downtime. It also calls out a common failure mode and how to mitigate it with OpenClaw’s degraded-state signals.

## The Model: Eager Resolution + Atomic Snapshot

SecretRefs are not lazily fetched on every request. OpenClaw resolves them during activation and builds an in-memory snapshot of resolved credentials. Requests read from that snapshot. Reloads replace the snapshot atomically only if all references resolve successfully.

That model matters because it moves secret-provider outages off the hot path. If your secret backend goes down, your bot does not suddenly fail mid-request. You keep running on the last-known-good snapshot until a reload or restart forces a refresh.

Key behaviors to build around:

- Secret resolution happens at activation (startup and reload), not per request.
- Startup fails fast if any referenced credential cannot be resolved.
- Reload is atomic: either a complete success or a full rollback to the last-known-good snapshot.
- If plaintext and a ref both exist, the ref wins at runtime.

## Pick the Right SecretRef Source

OpenClaw uses one object shape everywhere:

```json
{ "source": "env" | "file" | "exec", "provider": "default", "id": "..." }
```

Choosing the source is a tradeoff between simplicity, security, and operational overhead.

### `source: "env"`

Best for small, local setups.

Pros:
- Lowest friction: no extra files or secret services.
- Easy to wire into systemd, launchd, or container env vars.

Cons:
- Rotation means updating environment variables and restarting the gateway.
- Harder to audit across machines.

Example:

```json
{ "source": "env", "provider": "default", "id": "OPENAI_API_KEY" }
```

### `source: "file"`

Best for teams that keep secrets in a structured file (or sync from a vault).

Pros:
- JSON pointer addresses make secrets explicit and organized.
- Can be paired with external tooling that writes the file atomically.

Cons:
- Requires disciplined file permissions.
- Rotation must preserve JSON pointer paths.

Example:

```json
{ "source": "file", "provider": "filemain", "id": "/providers/openai/apiKey" }
```

### `source: "exec"`

Best when you already use a secrets manager with CLI access.

Pros:
- Integrates with existing vault tooling.
- Rotations can be centralized and audited.

Cons:
- Adds a runtime dependency on the exec provider.
- Errors are more opaque if the exec command fails.

Example:

```json
{ "source": "exec", "provider": "vault", "id": "providers/openai/apiKey" }
```

Practical default: start with `env` for single-machine setups, move to `file` when you need rotation without process restarts, and use `exec` only if you already operate a secrets backend reliably.

## Where SecretRefs Belong (And How Precedence Works)

SecretRefs can be used in multiple config locations, including model provider keys, skill keys, and channel credentials. The rule is simple: if a ref exists, it is required at activation, and it overrides any plaintext value stored alongside it.

That means you can migrate in stages:

1. Add the `...Ref` fields while keeping plaintext in place.
2. Confirm activation succeeds and secrets resolve.
3. Remove plaintext after the ref is stable.

OpenClaw emits a warning when a ref overrides plaintext. Treat that as a migration signal rather than a failure.

## Implementation Guidance: A Minimal, Safe Setup

Here is a small, real-world pattern that works for most deployments:

1. Store your provider key as a SecretRef in `~/.openclaw/openclaw.json`.
2. Use `openclaw secrets configure` for guided setup.
3. Validate with `openclaw secrets audit --check` before and after changes.

Example config snippet (model provider):

```json
{
  "models": {
    "providers": {
      "openai": {
        "apiKey": { "source": "env", "provider": "default", "id": "OPENAI_API_KEY" }
      }
    }
  }
}
```

Example config snippet (skill key):

```json
{
  "skills": {
    "entries": {
      "my-skill": {
        "apiKey": { "source": "file", "provider": "filemain", "id": "/skills/my-skill/key" }
      }
    }
  }
}
```

The most important habit: always run the audit check after a change. It is faster than a failed startup and safer than discovering the issue during live traffic.

## Rotation Playbook: Predictable, Low-Risk

Rotation is where SecretRefs pay off. Use this playbook to keep rotation boring.

1. **Preflight the new secret**
   - Put the new secret in the source (env/file/exec backend).
   - Run `openclaw secrets audit --check` to confirm it resolves.

2. **Stage and verify**
   - If you run multiple gateways, update a canary first.
   - Monitor startup logs for secret validation warnings or failures.

3. **Apply with atomic reload**
   - Trigger a config reload through your usual deployment path.
   - If activation fails, OpenClaw keeps the last-known-good snapshot.

4. **Confirm behavior**
   - Run a known-good action that uses the rotated credential.
   - If your workflow allows it, call the model directly once to force usage.

5. **Roll forward, not backward**
   - Fix the secret source and re-run audit.
   - Avoid “rollback” to plaintext once refs are in place unless you are in an incident.

The atomic reload model means a rotation failure should not cause downtime. But you only get that benefit if you treat audit checks as a mandatory step.

## Failure Mode: Degraded Secrets After Reload

A common failure mode looks like this:

- Secrets resolve successfully at startup.
- Later, the secret provider becomes unavailable.
- A reload is triggered (by config change or restart).
- Activation fails, and OpenClaw keeps the last-known-good snapshot.

Your agent still works — which is good — but you are in a degraded state without immediate user-visible symptoms. If you do not watch for it, you can run for days on an expiring secret and only discover the issue when it finally fails.

### Mitigation: Alert on Degraded Signals

OpenClaw emits explicit degraded and recovered signals for secret reloads. Wire these into your alerting (or at least your log monitors). Practical baseline:

- Alert on a degraded signal within 1 minute.
- Page only if the degraded state persists longer than your credential TTL buffer.
- Clear the alert only after a recovered signal is observed.

Also add a scheduled audit check (daily or weekly) so you verify that the current reference source can still resolve even if no reload happened recently.

## Tradeoffs to Decide Up Front

Before moving all credentials to SecretRefs, decide these tradeoffs explicitly:

- **Fail-fast vs availability**: startup fails if any ref is missing. If you want “partial functionality,” you need to separate roles into different agents or gateways with different credentials.
- **Reload cadence**: frequent reloads help catch expired credentials sooner but can trigger more degraded events if your secret provider is flaky.
- **Source coupling**: `exec` is powerful but couples availability to your secrets backend. Choose it only if you can operate that backend reliably.

Making these decisions upfront avoids the worst version of secret failures: ones that look intermittent and are hard to reproduce.

## Verification Checklist (Copy/Paste)

- All credentials use SecretRefs; plaintext is removed or explicitly temporary.
- `openclaw secrets audit --check` passes before and after changes.
- Reloads are atomic and do not override last-known-good on failure.
- Monitoring watches for secret degraded and recovered signals.
- Rotation playbook is documented and tested on a canary gateway.
- A periodic audit job validates the secret source even without reloads.

If you implement just the audit + atomic reload pattern, you will avoid most credential outages. If you add degraded-state alerting, you will also avoid silent drift.

That combination turns secrets from a hidden operational risk into a predictable, verifiable part of your OpenClaw deployment.
