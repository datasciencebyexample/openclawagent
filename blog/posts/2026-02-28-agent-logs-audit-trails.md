# Agent Logs and Audit Trails in OpenClaw: Know What Happened and Why

When you automate real work, "it worked" is not enough. You need to know what ran, what it touched, and how to replay it when something goes wrong. OpenClaw's logging and audit trail approach is built for that reality.

## The Two Logs You Actually Need

Most teams get value quickly by separating two kinds of history:

- **Execution logs** show the live stream: prompts, tool calls, and outputs.
- **Audit trails** show the durable summary: who triggered what, which permissions were used, and what artifacts were produced.

Execution logs are for debugging. Audit trails are for accountability.

## What Should Be Recorded Every Time

If you want logs that solve problems instead of creating noise, capture a minimal, consistent set of fields:

- Session or task ID
- Trigger source (user, cron, webhook, sub-agent)
- Model and thinking level
- Tools invoked and parameters (sanitized)
- File reads/writes and command boundaries
- Outcome status (success, partial, failed)

This keeps your history actionable while respecting privacy.

## A Simple Audit Trail Pattern

A practical pattern is to write a compact summary file per run, then link it to the full execution log:

1. Start the run and assign an ID.
2. Log all tool calls to the execution stream.
3. Write a short JSON or Markdown audit record at the end.

The audit record should fit on one screen and answer, "What happened, and is it safe?"

## Why This Changes Team Trust

Teams stop trusting automation when they cannot explain what the agent did. Good audit trails reverse that. They make it easy to answer questions like:

- "Who asked for this run?"
- "Which files changed?"
- "Did it request elevated permissions?"
- "Can we replay it safely?"

That clarity makes approvals faster and keeps human oversight lightweight.

## Where OpenClaw Fits

OpenClaw already gives you the right hooks: tool call boundaries, sandbox controls, and session metadata. If you log those consistently, you have an audit trail that scales from a personal agent to a production assistant.

## Getting Started This Week

Start with a lightweight rule:

1. Write one audit record per run.
2. Log tool calls with timestamps.
3. Store both in a predictable folder and name by date and session ID.

You do not need a perfect logging system. You need a trail you can trust when the stakes go up.
