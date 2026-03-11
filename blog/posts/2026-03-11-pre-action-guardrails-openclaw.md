# Pre-Action Guardrails in OpenClaw: Block Risky Tool Calls Before They Run

Prompting is not a safety boundary. Once your agent can call tools, you need a system that can say “no” deterministically before anything runs. That is what pre-action guardrails provide: a policy check in front of every tool call, enforced by the runtime rather than the model’s willingness to comply.

This post shows how to add pre-action guardrails to an OpenClaw agent, how to scope policies without breaking legitimate work, and how to roll out enforcement without shipping downtime. You will leave with a concrete installation path, a policy structure you can customize, and a checklist to verify the guardrails are actually doing the job.

## The Core Idea: Policy Before Execution

A guardrail is not a prompt. It is a policy engine that evaluates every tool call and returns ALLOW or DENY before the tool runs. In practice, that gives you three essential safety guarantees:

- Deterministic blocking for known-dangerous actions (for example, destructive shell commands).
- A single policy surface that applies across all tools, not just the ones you remember to wrap.
- A reliable audit trail because every decision is recorded at the boundary.

If your agent can call `exec.run`, then the boundary that matters is what runs on the machine. The only way to ensure consistent safety is to intercept tool calls before execution and fail closed when policy is uncertain.

## What To Guard First (A Practical Priority Order)

Do not try to guard everything on day one. Start with the tools and scopes that can do irreversible damage.

1. **Shell execution**: any path that can delete files, exfiltrate data, or modify system state.
2. **File reads/writes**: especially paths that include secrets, configs, or production credentials.
3. **Network actions**: webhooks, HTTP calls, or messaging tools that can publish or leak data.
4. **Git operations**: repository writes, force pushes, or large PRs that can disrupt CI.

The guardrail policy should explicitly cover these tool categories first. Everything else can be added once your baseline safety is stable.

## Implementation: Installing a Guardrail Plugin

The fastest path is to install a guardrail plugin that hooks into OpenClaw’s “before tool call” lifecycle. One example is the APort guardrail plugin, which installs as a local skill and enforces policy for every tool call.

Minimal setup (local-first):

```bash
npx @aporthq/aport-agent-guardrails
```

Once installed, OpenClaw loads the guardrail automatically at startup. A useful verification step is to run the status script the installer provides:

```bash
~/.openclaw/.skills/aport-status.sh
```

If you prefer a different vendor or a fully self-hosted policy engine, the same pattern applies: you want a plugin that can intercept tool calls and fail closed before execution.

## Write Your First Policy: Small, Explicit, and Fail-Closed

A policy should be explicit about what is allowed. Start with a tight allowlist, then expand as you see legitimate requests blocked. Here is a minimal pattern that works for most teams:

```json
{
  "version": 1,
  "defaults": {
    "mode": "deny"
  },
  "rules": [
    {
      "tool": "exec.run",
      "allow": [
        "ls",
        "cat",
        "rg",
        "git status"
      ],
      "deny": [
        "rm -rf",
        "sudo",
        "chmod 777"
      ]
    },
    {
      "tool": "files.write",
      "allow_paths": [
        "~/openclaw/workspace",
        "~/openclaw/tmp"
      ],
      "deny_paths": [
        "~/.ssh",
        "~/.aws",
        "~/Library/Keychains"
      ]
    }
  ]
}
```

This is intentionally conservative. It forces you to decide where writes can happen and which shell commands are safe by default. In a production setting you would likely move from command string matching to tighter patterns, but this is enough to stop catastrophic mistakes immediately.

## Tradeoffs You Need To Decide Up Front

Guardrails are not free. A good rollout starts with explicit decisions about tradeoffs you are willing to accept.

- **Safety vs flexibility**: a strict allowlist prevents bad actions but can block legitimate troubleshooting. Plan a fast policy update loop.
- **Latency vs coverage**: every call adds a policy check. If latency matters, keep your policy engine local and small.
- **Granularity vs complexity**: per-tool rules give precision but are harder to maintain. Coarse rules are simpler but leak risk.
- **Audit vs privacy**: logging decisions is essential for safety, but you must avoid storing sensitive payloads.

Write these decisions down. It makes enforcement less painful because the team can see the reasons behind a strict policy.

## Failure Mode: Over-Blocking Causes “Silent Fail” Behavior

A common failure mode appears right after you flip enforcement on:

- The agent attempts a legitimate action.
- The guardrail denies it.
- The agent responds with a vague error or simply retries.
- The user sees a slow or stuck experience and loses trust.

This is not a guardrail bug; it is a rollout bug. If you switch from zero policy to strict deny, you create an avalanche of blocked actions and no clear signal of why.

### Mitigation: Audit Mode + Transparent Deny Messages

Mitigation has two parts:

1. **Audit mode first**: run the policy in “observe only” for a day or two. Collect the top 20 blocked actions and decide whether each should be allowed, denied, or handled by a different tool.
2. **Actionable error messages**: when you do enforce, surface the denial clearly. Provide the exact rule that blocked it and, if safe, the shortest alternative that is allowed.

This turns the guardrail from a mysterious blocker into a visible safety boundary the user can understand.

## Practical Guardrail Design Patterns

Here are patterns that tend to work well in real deployments:

- **Scoped workspaces**: restrict file writes to a dedicated project directory, and deny everything else by default.
- **Command templates**: allow a small set of parameterized commands (for example, `rg <pattern> <dir>` or `git status`), and block everything else.
- **High-risk tool split**: separate read-only tools from write-capable tools so the agent can keep working even when write permissions are denied.
- **Sensitive output redaction**: if your guardrail supports output scanning, redact secrets before the response is delivered.

The goal is to minimize the surface area where policy needs to reason about arbitrary input.

## Rollout Plan: From Local Test to Production Enforcement

A working rollout usually follows this sequence:

1. **Local dry run**
   - Install the guardrail in a local dev agent.
   - Start in audit mode.
   - Capture the top blocked actions.

2. **Canary agent**
   - Flip a single low-traffic agent to enforce mode.
   - Measure deny rate and response quality.

3. **Policy iteration**
   - Add explicit allows for the legitimate top requests.
   - Keep a short list of never-allowed commands and paths.

4. **Wider rollout**
   - Expand enforcement to more agents.
   - Alert if the deny rate spikes or if the policy engine is unreachable.

Each step should produce a concrete policy diff, not just “we’ll fix it later.”

## Verification Checklist (Copy/Paste)

- Guardrail plugin loads on startup and reports active status.
- All high-risk tools are covered by explicit rules.
- Deny behavior fails closed if the policy engine is unavailable.
- Audit mode logs are reviewed before enforcement.
- Enforce mode denies are visible to the user with clear reasons.
- A canary agent runs enforcement before full rollout.
- Deny rate is monitored and alerting is in place.

## Where This Fits In Your Safety Stack

Pre-action guardrails are not a replacement for approval queues, safe prompts, or careful tool design. They are the safety boundary that makes everything else trustworthy. If you can only implement one hard safety control, make it a guardrail that runs before tool execution. Everything else is optional.

Once this is in place, you can safely iterate on more ambitious automation because the platform can always say “no” when a request crosses the line.
