# OpenClaw `tools.profile` Upgrades: Prevent Silent Capability Regressions

If your OpenClaw agent suddenly stopped doing expected actions after an upgrade, there is a good chance the issue is not your prompts, model, or adapter. It is your tool profile.

In March 2026, OpenClaw changed default `tools.profile` behavior across releases: one release pushed many setups toward an ops-heavy default, and a later release shifted defaults back toward a messaging-first baseline for new initialization while adding warnings for existing ops-profile setups. If you rely on defaults, this kind of drift can quietly change what your agent can do.

This post gives you a practical way to make upgrades safe: pin tool profiles explicitly, map tasks to required tool groups, and add a lightweight verification gate that catches profile regressions before users do.

## Why This Matters in Real Deployments

`tools.profile` is not cosmetic. It controls which tool groups your agent can call.

From OpenClaw docs, profile choices include:

- `all-tools`: broad capability access
- `ops`: local operations, scripting, filesystem, and engineering workflows
- `messaging`: communication-centric capability set
- `none`: no tools

The docs also caution that defaults can vary by deployment path and version, and they recommend explicit configuration for reliability. That recommendation is easy to ignore when everything works. But once defaults move between releases, implicit behavior becomes operational risk.

The pattern looks like this:

1. You initialize with defaults and no explicit `tools.profile`
2. A release updates how defaults are inferred
3. Your bot still responds conversationally, so health checks look green
4. Action workflows fail because key tools are now out of profile
5. Users report "agent got dumb" without a clear error root cause

The dangerous part is step 3: standard liveness checks miss capability regressions.

## The Core Control: Pin `tools.profile` in Config

Do not treat tool access as an inferred default. Pin it.

Minimal baseline:

```json
{
  "tools": {
    "profile": "messaging"
  }
}
```

Ops-heavy baseline:

```json
{
  "tools": {
    "profile": "ops"
  }
}
```

Hybrid environments often start with `messaging` for user-facing assistants and run separate `ops` workers for maintenance workflows. That separation is usually better than putting everything on `all-tools`, because it constrains blast radius when prompts, adapters, or external inputs are unpredictable.

Practical rule:

- User-facing chat assistants: default to `messaging`
- Internal maintenance/automation workers: use `ops`
- Rare, tightly governed orchestrators: consider `all-tools`

If you have one bot doing all jobs, split roles before your next high-risk release window.

## Build a Capability Matrix Before You Choose a Profile

Most profile mistakes happen because teams choose a profile name before listing required operations.

Create a small matrix for each agent role:

- Critical user outcomes ("send status update", "read runbook", "execute script", "inspect logs")
- Required tool groups behind each outcome
- Minimum acceptable profile that covers those groups
- Disallowed tool groups for that role

Example:

- Support DM bot: send/reply, retrieve FAQ snippets, escalate to queue
- Needs messaging + retrieval; does not need shell execution
- Profile choice: `messaging`

- Incident responder bot: parse alerts, run diagnostics, capture artifacts
- Needs command/file execution and local operations
- Profile choice: `ops`

This reduces profile selection from guesswork to a testable contract.

## Failure Mode: "Healthy" Agent With Missing Tools

A common failure mode after default drift is deceptive health.

What you see:

- Bot starts successfully
- Model calls complete
- Heartbeat checks pass
- User asks for an action that depends on excluded tools
- Agent declines, hallucinates an action, or loops on clarification

Why this happens:

- Startup checks verify process/model availability, not capability coverage
- No preflight assertion compares expected tools vs active profile
- Monitoring tracks latency/errors, not task completion by capability class

### Mitigation: Add a Startup Capability Gate

Add a startup guard that fails fast if required capability groups are absent.

Pseudo-pattern:

```text
load role contract -> resolve configured tools.profile ->
expand profile to tool groups -> compare against required groups ->
exit non-zero (or quarantine) on mismatch
```

What to enforce:

- Required groups must be present
- Explicitly forbidden groups must be absent
- Any "default" profile resolution should log resolved value and source

This turns silent degradation into a deterministic deployment failure.

## Tradeoffs: `messaging` vs `ops` vs `all-tools`

### `messaging`

Pros:

- Smaller attack surface
- Better fit for user-facing agents
- Lower chance of unintended local side effects

Cons:

- Cannot satisfy ops-style actions without delegation
- Teams may over-prompt around missing capabilities

### `ops`

Pros:

- Strong for diagnostics and automation tasks
- Fewer handoffs for technical workflows

Cons:

- Higher risk if exposed to untrusted user inputs
- Requires tighter approval and sandbox controls

### `all-tools`

Pros:

- Maximum flexibility
- Useful for orchestrators in controlled environments

Cons:

- Hardest to reason about and secure
- Easiest profile to misuse in mixed-trust contexts

A practical architecture is role-based profile segmentation rather than one universal profile.

## Implementation Pattern: Role Contracts + Config Pinning

Use two files per role:

1. `role-contract.json`
- `requiredToolGroups`
- `forbiddenToolGroups`
- `owner`
- `changeApproval`

2. runtime config
- explicit `tools.profile`
- versioned with deploy artifacts

Validation step in CI/CD:

- Parse contract
- Parse runtime config
- Resolve `tools.profile` to groups
- Fail pipeline on mismatch

This keeps profile drift from slipping through local tests.

## Upgrade Playbook for March-Style Default Changes

When release notes mention tool profile default changes, run this playbook.

1. Inventory active roles
- List every deployed agent role and current configured profile
- Flag any role with implicit/default profile

2. Pin everything
- Set explicit `tools.profile` for every role
- Commit config with release identifier in notes

3. Run capability smoke tests
- One action per required tool group
- One negative test per forbidden group

4. Stage rollout
- Deploy to a canary cohort first
- Monitor task success, not just uptime

5. Watch for warnings
- Treat profile-related startup warnings as blockers
- Resolve before full rollout

6. Keep rollback simple
- Maintain last-known-good profile map
- If failure rate climbs, revert profile config first before deeper debugging

This workflow is short enough to run every release and catches most profile regressions.

## Verification Checklist (Copy/Paste for Ops Runbooks)

- Every agent role has explicit `tools.profile` (no implicit defaults)
- Role contract exists with required/forbidden groups
- Startup gate validates profile coverage before accepting traffic
- Capability smoke tests pass for all critical outcomes
- Monitoring includes task success by capability category
- Release-note profile warnings are tracked and resolved
- Rollback profile map is documented and tested

If any box is unchecked, your next upgrade can fail "quietly" even when infrastructure looks healthy.

## A Concrete Example Split

Suppose you run a Discord assistant that answers users, escalates approvals, and occasionally triggers maintenance jobs.

Safer split:

- `assistant-discord` role
- Profile: `messaging`
- Handles conversation, clarification, and queueing only

- `maintenance-worker` role
- Profile: `ops`
- Executes controlled diagnostics and scripted actions

- Optional `orchestrator` role
- Profile: `all-tools` only if truly needed
- Locked behind strict approval policy and audited actions

This split reduces the chance that a chat-facing prompt path gains accidental ops capabilities after a default change.

## What to Do Today

If you do one thing, make it this: remove ambiguity.

- Pin `tools.profile` explicitly for every deployed role
- Add a profile-to-capability validation gate
- Check release notes for default behavior changes before upgrading

OpenClaw is evolving quickly, and that is good for capability. But fast-moving defaults mean you should treat profile selection as part of your reliability and security model, not just a convenience setting.

When profiles are explicit and verified, upgrades become predictable instead of surprising.
