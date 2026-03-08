# Secure DM Session Isolation in OpenClaw: Prevent Cross-User Context Leaks

OpenClaw’s default DM behavior is great for personal continuity: direct messages can share a single main session so your assistant remembers context over time. But that default becomes risky the moment multiple people can message the same bot account.

If two users land in one shared DM session, the model can blend context across people. That usually appears as “weird memory,” but operationally it is a privacy and trust failure.

This post walks through a practical hardening pattern using OpenClaw’s `session.dmScope`, `session.identityLinks`, and pairing/security controls. The goal is simple: keep your agent helpful without allowing cross-user context leakage.

## The Core Risk: Shared DM Context in Multi-User Inboxes

OpenClaw supports several DM scoping modes. The default (`main`) is continuity-first. In a single-user setup, that is often ideal.

In a multi-user environment (support inboxes, shared bot identities, public DMs, community bots), the risk profile changes:

- User A asks for account help
- User B messages the same bot later
- Both messages resolve to one DM session key
- The model can carry assumptions or facts from A into B’s response

This is not always an explicit data dump. More often it shows up as subtle contamination: wrong names, wrong project assumptions, or policy decisions based on another user’s history.

## The Practical Baseline: Enable Secure DM Mode

For multi-user setups, use:

```json
{
  "session": {
    "dmScope": "per-channel-peer"
  }
}
```

What this does:

- Session key includes both channel and sender identity
- Each DM participant gets isolated context
- Continuity remains within that participant’s DM thread, not globally

If you run multiple accounts on the same channel adapter, step up to:

```json
{
  "session": {
    "dmScope": "per-account-channel-peer"
  }
}
```

That adds account identity into routing, which avoids collisions in multi-account deployments.

## Picking the Right `dmScope`: Speed vs Isolation Tradeoff

There is no universally perfect scope; you choose based on threat model and UX.

### `main` (default)

Best for:

- One trusted human user
- Personal assistant workflows
- Maximum long-term continuity

Tradeoff:

- Unsafe if untrusted or multiple DM senders are possible

### `per-peer`

Best for:

- Same person contacting from multiple channels
- You want continuity across channels without global sharing

Tradeoff:

- Depends on stable sender IDs and good identity mapping

### `per-channel-peer` (recommended secure baseline)

Best for:

- Shared inboxes
- Community-facing bots
- Team support bots

Tradeoff:

- Less cross-channel memory unless you explicitly link identities

### `per-account-channel-peer`

Best for:

- Multi-account adapters
- Environments with account-level routing complexity

Tradeoff:

- Strongest isolation, highest fragmentation if identity linking is incomplete

## Regain Useful Continuity Safely with `session.identityLinks`

A common concern after enabling isolation is: “Now my user loses memory when switching channels.”

This is where `session.identityLinks` helps. You can map provider-specific IDs to a canonical identity so the same person can share a session where appropriate, while still preventing unrelated users from merging.

Practical pattern:

1. Keep strict DM scope (`per-channel-peer` or `per-account-channel-peer`)
2. Add explicit identity links only for verified mappings
3. Review mappings periodically (especially after account migrations)

Do not auto-link identities just because display names look similar. Display names are weak signals and can create accidental merges.

## Add Sender Admission Controls Before Isolation Is Tested

Session isolation reduces leakage risk, but access control still matters.

In OpenClaw security modes, you can enforce how unknown DM senders are treated:

- `pairing`: challenge unknown senders with approval flow
- `allowlist`: block unknown senders
- `open`: allow any sender (explicitly risky, requires deliberate opt-in)
- `disabled`: ignore DMs

A practical rollout sequence for production bots:

1. Start with `pairing`
2. Enable secure DM scope
3. Observe real traffic for one week
4. Move to `allowlist` for high-sensitivity environments

This sequence keeps onboarding manageable while minimizing exposure during migration.

## Failure Mode: Identity Collisions Re-Merge Isolated Users

A subtle but serious failure mode is incorrect identity linking.

Example:

- Two different users are mapped to one canonical identity by mistake
- Session isolation appears enabled in config
- In practice, both users now share the same DM memory through the bad link

Why this is dangerous:

- It bypasses your isolation intent
- It is easy to miss in normal QA if test users are limited
- It can survive long enough to contaminate agent memory/state

### Mitigation

Use a two-layer guard:

1. Verification gate before identity link creation
- Require strong proof (signed account claim, verified handle ownership, or admin-reviewed mapping)
- Never auto-link on username similarity

2. Drift detection and audit
- Log identity-link create/update/delete events
- Add a daily check for many-to-one spikes (multiple new peers mapped to a single canonical identity)
- Alert and quarantine suspicious mappings

Minimal operations checklist for mitigation:

- Every link has `created_by`, `created_at`, and reason
- Every automated link rule has a confidence threshold
- Low-confidence links require human approval
- Rollback path exists to detach a bad mapping quickly

## Configuration Pattern You Can Apply Today

A production-friendly baseline that balances safety and usability:

```json
{
  "session": {
    "dmScope": "per-channel-peer",
    "identityLinks": {
      "enabled": true,
      "requireVerification": true
    }
  },
  "security": {
    "dmMode": "pairing"
  }
}
```

Notes:

- Keep `identityLinks` policy strict until you have strong verification signals
- Prefer explicit mappings over inferred mappings
- Pairing gives you a clean approval checkpoint while policies mature

(Exact key shapes can vary by version; align this pattern to your deployed config schema.)

## Rollout Strategy: Migrate Without Breaking User Experience

Blindly flipping DM scope in production can surprise users and support teams. Use a phased rollout:

1. Baseline and snapshot
- Record current behavior: active DM senders, average reply latency, top intents
- Snapshot critical config and identity-link state

2. Shadow validation
- Compute what new session keys would be under target `dmScope`
- Check for unexpected key collisions before enabling

3. Controlled rollout
- Enable secure DM mode for a subset of channels/accounts
- Monitor for context-loss complaints and routing anomalies

4. Identity-link hardening
- Add only verified mappings for users who need cross-channel continuity
- Keep a manual approval queue for edge cases

5. Full cutover and audit
- Expand to all relevant channels
- Run security audit and review warnings tied to session/sandbox/tooling posture

## Verification Checklist

Use this short checklist after rollout:

- Two distinct users messaging the same bot do not share context
- Same user continuity behaves as expected in your chosen scope
- Unknown sender behavior matches policy (`pairing` or `allowlist`)
- Identity-link changes are logged and reviewable
- Security audit warnings are reviewed and either fixed or explicitly accepted
- Support runbook documents how to resolve “lost memory” vs “wrong merged identity” incidents

## What You Gain

Moving from `main` to secure DM scoping is one of the highest-leverage risk reductions you can make in OpenClaw when DMs are multi-user.

You keep agent speed and conversational quality, but with a safer boundary model:

- Isolation by default
- Continuity by verified linking
- Admission control at inbox edges
- Auditable operations when things drift

If your bot can receive DMs from more than one person, treat secure DM session isolation as baseline architecture, not an optional hardening step.
