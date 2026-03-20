# Session Store Hygiene in OpenClaw: Keep Context Accurate Without Bloated History

Session state is the backbone of OpenClaw behavior. If it drifts, you get weird user context, broken token counts, or duplicated conversations. This post is a practical guide to keeping session storage accurate and lightweight, without throwing away useful history. You will get concrete config settings, operational steps, tradeoffs, and a failure mode to avoid.

You will get:
- A clean mental model of where session state lives and who owns it.
- Practical config for expiration, compaction, and context limits.
- A safe cleanup workflow with CLI commands and verification steps.
- Tradeoffs, one common failure mode, and a mitigation plan.
- A short rollout checklist.

## The core rule: the gateway is the source of truth

OpenClaw session state belongs to the gateway. UI clients should read session lists and token counts from the gateway store, not from local transcript files. This matters most in remote mode, where the real session store is on the gateway host, not your laptop. If your UI tries to “fix” token counts by parsing transcripts, you will drift from the authoritative totals and create confusing mismatch bugs.

Practical implication: treat the gateway session store as the system of record. Any operational action (cleanup, migration, verification) should target the gateway host.

## Where session state actually lives

Per agent, OpenClaw keeps:
- Store file: `~/.openclaw/agents/<agentId>/sessions/sessions.json`
- Transcripts: `~/.openclaw/agents/<agentId>/sessions/<SessionId>.jsonl`

The store maps `sessionKey -> { sessionId, updatedAt, ... }`. The transcripts are the message history. UI lists should be populated from the store, and transcripts are used for replay and debugging.

A useful property: deleting entries from `sessions.json` is safe. They will be recreated on demand. That makes cleanup easier, but only if you do it intentionally.

## Configure the lifespan and size of sessions

If you never expire sessions, history grows without bound. That increases memory pressure and makes context windows harder to reason about. A practical baseline is to expire old sessions, cap messages per session, and enable compaction so old detail gets summarized or trimmed.

Example (JSON5):

```json5
{
  sessions: {
    maxAge: "14d",
    maxMessages: 120,
    compaction: {
      enabled: true,
      threshold: 60
    },
    contextWindow: 30,
    contextTokens: 6000
  }
}
```

Guidance for tuning:
- `maxAge`: pick a number aligned with your product usage pattern. For personal bots, 7-14 days works well. For enterprise workflows, 30 days may be better.
- `maxMessages`: cap it to prevent prompt bloat. A higher cap means more context but slower and more expensive runs.
- `compaction.threshold`: set it to about half of `maxMessages` so compaction happens before you hit the ceiling.
- `contextWindow` and `contextTokens`: set the upper bound of what gets sent to the model. Keep it lower than your total transcript so the model stays focused.

## Normalize identity across channels

If the same user chats from multiple platforms, you can accidentally fragment their context into multiple sessions. Use `session.identityLinks` to map provider-specific peer IDs to a canonical identity. This helps when you use per-peer or per-channel-peer routing and want a single shared DM session across channels.

Pattern:
- Pick a canonical user ID (email, internal user ID, or CRM ID).
- Map each provider ID to that canonical identity.
- Verify that new sessions route to the expected shared session, not a new one.

This is one of the highest leverage session hygiene steps because it prevents “context split-brain.”

## Safe cleanup: remove clutter without breaking active sessions

Cleanup is usually safe if you avoid deleting transcript files for active sessions. The store is the index; the transcripts are the history. You can clear old sessions via CLI instead of editing files by hand.

Minimal workflow:
1. List sessions: `openclaw sessions list`
2. Inspect a session: `openclaw sessions show <id>`
3. Clear old sessions: `openclaw sessions clear --older-than 14d`

If you need to clear only certain channels, export the list and script against `sessionKey` or metadata (channel, room, subject). Keep an audit log of what you removed.

## Compaction strategy: keep important context without full history

Compaction reduces session size while preserving the gist. This is a tradeoff: you save tokens and storage, but you lose some details. Use it when your sessions often outlive their immediate task.

Practical approach:
- Enable compaction only after sessions pass a certain size.
- For high-precision tasks (code editing, legal, financial), consider a higher threshold or disabling compaction for those agents.
- For chatty integrations (Discord, Telegram), compaction is usually a win.

Tip: If your agent stores key facts in memory or notes, compaction does not hurt as much because the key facts remain accessible.

## Token count accuracy: don’t “fix” numbers in the UI

Token counts shown in UIs should come from the gateway store fields (`inputTokens`, `outputTokens`, `totalTokens`, `contextTokens`). Clients should not parse transcripts to “fix” totals. This is a common source of mismatch bugs, especially in remote mode where the UI’s local transcripts are incomplete or stale.

If you see mismatched totals:
- First check whether the UI is reading the gateway store.
- Then verify that the gateway’s session store file is on the host you expect.

## Tradeoffs to consider

Session hygiene is about choosing what to keep and what to forget.

Key tradeoffs:
- Short `maxAge` reduces storage and drift, but can drop useful long-running context.
- Low `maxMessages` keeps prompts fast, but may trim earlier decisions the agent still needs.
- Aggressive compaction is cost-efficient, but may remove details required for precise follow-ups.
- Identity linking improves continuity, but can accidentally merge sessions that should stay separate if your mapping logic is too broad.

The right balance depends on how stateful your workflows are. For highly stateful workflows, increase retention and rely on compaction. For high-throughput chat, prefer shorter retention and tighter context windows.

## Failure mode: manual edits to `sessions.json` cause ghost sessions

Failure mode:
- You edit `sessions.json` directly to remove clutter or fix a problem.
- A typo or partial write corrupts the file.
- The gateway recreates sessions with new IDs, and your UI shows “ghost” sessions or duplicate threads.

Mitigation:
- Avoid manual edits. Use `openclaw sessions clear` for cleanup and rely on automatic recreation.
- If you must edit, write to a temp file and atomically replace it.
- Keep a backup of `sessions.json` before changes so you can restore.

This is a silent failure: the gateway keeps running, but users see inconsistent thread lists.

## Rollout and verification checklist

Use this checklist when you update session hygiene settings:

- Confirm the session store is on the gateway host you expect.
- Set or review `maxAge`, `maxMessages`, and compaction settings.
- Configure `contextWindow` and `contextTokens` to match your model limits.
- Add identity links for multi-channel users if needed.
- Run `openclaw sessions list` and spot-check a few active sessions.
- Clear old sessions with `openclaw sessions clear --older-than <Nd>`.
- Verify that token counts in the UI match the gateway store.
- Monitor logs for session recreation warnings after cleanup.

## Closing guidance

Session hygiene is a low-effort, high-impact practice. Treat the gateway as the source of truth, control session growth with explicit limits, and clean up with the CLI instead of manual edits. Once you do this, context stays accurate, UIs stay consistent, and the agent behaves like a reliable long-term collaborator instead of a forgetful chatbot.
