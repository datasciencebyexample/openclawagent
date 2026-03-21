# OpenClaw Tool-Loop Detection: Guardrails Against Runaway Tool Calls

Tool-call loops are one of the most expensive failure modes in agent systems. A single broken tool can trigger repeated retries, burn tokens, and stall the user experience without ever making progress. OpenClaw includes a built-in tool-loop detection guard that watches recent tool calls and suppresses repetitive patterns. It is disabled by default, so you need to turn it on intentionally.

This post explains what the guard detects, how to configure it, and how to roll it out safely with concrete examples.

## What loop detection actually protects you from

The loop detector is designed to catch patterns that keep repeating without progress. The most common cases are:
- Repeated failures with the same tool and similar inputs.
- High-frequency loops where a tool call returns no useful output and the agent immediately tries again.
- Known “polling” loops that get stuck because a condition never changes.

The goal is to stop unproductive repetition while still allowing legitimate retries for transient failures and rate limits.

## The configuration surface

Loop detection lives under `tools.loopDetection` and can be set globally and overridden per agent. The guard is off by default. Enable it only where you need it.

Baseline (JSON5):

```json5
{
  tools: {
    loopDetection: {
      enabled: true,
      historySize: 20,
      detectorCooldownMs: 12000,
      repeatThreshold: 3,
      criticalThreshold: 6,
      detectors: {
        repeatedFailure: true,
        knownPollLoop: true,
        repeatingNoProgress: true
      }
    }
  }
}
```

Key fields:
- `enabled`: Master switch. `false` means the guard never runs.
- `historySize`: How many recent tool calls are examined.
- `detectorCooldownMs`: Time window used for no-progress detection.
- `repeatThreshold`: Minimum repeats before the guard starts suppressing.
- `criticalThreshold`: Higher bar for stricter suppression.
- `detectors.*`: Toggle specific detectors on/off.

Per-agent overrides are useful when only a subset of your agents are prone to loops, or when one agent needs stricter settings:

```json5
{
  agents: {
    list: [
      {
        id: "safe-runner",
        tools: {
          loopDetection: {
            enabled: true,
            repeatThreshold: 2,
            criticalThreshold: 5
          }
        }
      }
    ]
  }
}
```

### Version note: check your config reference

Some OpenClaw versions expose a slightly different loop-detection schema in the configuration reference. If your config reference shows `warningThreshold` / `criticalThreshold` / `globalCircuitBreakerThreshold` and detectors like `genericRepeat`, `knownPollNoProgress`, or `pingPong`, use those keys instead. The intent is the same: define the warning threshold, the stricter blocking threshold, and (optionally) a hard stop for global loop conditions.

Practical mapping guidance:
- `warningThreshold` roughly maps to `repeatThreshold`.
- `globalCircuitBreakerThreshold` is an extra hard-stop that doesn’t exist in the older schema.
- `genericRepeat` maps to repeated same-tool calls; `knownPollNoProgress` maps to poll loops; `pingPong` covers A/B/A/B patterns.

Use whatever your local reference accepts. If validation fails, you’re on the other schema.

### Practical defaults for different use cases

You can reuse the baseline, but high-throughput bots need tighter thresholds, while stateful assistants may need looser ones.

1. High-volume chat bots (Discord/Telegram)
- `repeatThreshold`: 2 or 3
- `criticalThreshold`: 5
- `historySize`: 15
- `detectorCooldownMs`: 10000–15000

These bots often hit API rate limits or malformed content errors. You want to stop repeat failures quickly so you don’t spam channels or burn tokens.

2. Stateful workflow agents (ticket triage, provisioning)
- `repeatThreshold`: 3 or 4
- `criticalThreshold`: 6–8
- `historySize`: 20–30
- `detectorCooldownMs`: 15000–30000

These agents sometimes need to call the same tool multiple times to complete a workflow (lookup, then write, then verify). A slightly higher threshold avoids blocking legitimate multi-step logic.

3. Polling-style automations (check a job status, wait, recheck)
- Keep `knownPollLoop: true`, but raise thresholds
- Add explicit delays in your tool or agent logic
- Consider disabling `knownPollLoop` only if polling is your primary workload

Polling is the most likely to trigger false positives. It is better to keep the detector on and make the polling pattern “visible” by adding state changes and delays.

## How the guard reacts

When a loop is detected, OpenClaw reports a loop event and suppresses the next tool-cycle based on severity. In practice, you should expect:
- A warning and temporary suppression on the first hits.
- Escalation only when repeated evidence accumulates.

## A safe rollout plan

Start in a single agent, observe behavior, then expand. A low-risk path looks like this:

1. Enable globally with conservative thresholds.
2. Pick one agent that is “loop-prone” (high tool usage, frequent retries).
3. Override that agent with slightly stricter thresholds.
4. Monitor logs for loop events and ensure they correspond to real stalls.
5. Expand to more agents once false positives are under control.

This limits blast radius while you learn which workflows repeat legitimately.

## Tuning heuristics that actually work

If you encounter too many suppressions, do not disable the guard immediately. Instead, tune the knobs that match the failure pattern.

1. Too many false positives on legitimate retries
- Increase `repeatThreshold` by 1 or 2.
- Increase `criticalThreshold` by 2.
- Reduce `historySize` so older calls do not “count” against the agent.

2. Polling loops get blocked too soon
- Increase `detectorCooldownMs` so it requires tighter timing before firing.
- Add explicit delays between polls in your tool logic.
- Disable only `knownPollLoop` if your workload is mostly polling.

3. Repeated failure loops slip through
- Increase `historySize` so the detector sees longer patterns.
- Lower `repeatThreshold` to 2.
- Ensure your tool returns explicit failure signals rather than silent empty output.

The goal is to make “real progress” visible. If each call changes state or advances a workflow step, the detector is less likely to trigger.

## Loop detection and retry policy are different layers

Retry policy lives at the channel/request level and is designed to handle transient network failures or rate limits. Loop detection lives at the tool-call level and targets agent behavior that is stuck.

Practical guidance:
- Keep provider retries enabled for transient failures.
- Use loop detection to stop the agent from repeatedly calling the same tool after retries have already failed.
- Make sure your tool error messages are meaningful so the agent can decide to stop rather than repeat.

Use loop detection as the guardrail, not as a substitute for retries.

## Concrete example: guard a filesystem tool

Imagine an agent that reads a config file, but the file does not exist yet. It tries to read it, gets a failure, and immediately tries again with the same path. That is a classic loop.

A practical mitigation:
- Use loop detection to stop repeated reads.
- Add an explicit fallback: if file read fails twice, prompt the user for a path or create a default file.

In other words, combine guardrails with a failure-aware path. The guard stops the runaway behavior, and the fallback gives the agent a productive next step.

## Failure mode: false positives on multi-step tool workflows

Failure mode:
- Your agent calls the same tool several times as part of a legitimate workflow (e.g., list -> filter -> write -> verify).
- The detector sees repetition and suppresses the final step.
- The workflow stalls even though it was progressing.

Mitigation:
- Raise `repeatThreshold` for that agent by 1–2.
- Reduce `historySize` to focus on the last few calls rather than the full workflow.
- Modify your tool wrapper to add a “stage” or “purpose” field in the input payload so the detector can see that the calls are not identical.

This mitigation is better than disabling the guard completely because you keep protection against real stalls while accommodating legitimate repetition.

## Rollout and verification checklist

Use this checklist before you enable loop detection for all agents:

- Enable `tools.loopDetection` with baseline thresholds.
- Add a per-agent override for your highest-risk agent.
- Trigger a known failure loop in a test environment and verify suppression occurs.
- Trigger a legitimate multi-step workflow and confirm it completes.
- Review loop event logs and verify they correspond to real stalls.
- Adjust thresholds and detector toggles based on observed false positives.
- Expand to more agents only after the test workflows succeed.

## Closing guidance

Loop detection is a pragmatic safety net. It protects against runaway tool calls without forcing you to redesign your entire agent stack. Start with conservative thresholds, tune them based on real failures, and keep the guard enabled for agents that call external systems often. With a few small settings, you can cut off the worst failure loops and keep your agents responsive, predictable, and cheaper to run.
