# Context Packets in OpenClaw: Give Agents the Right Info at the Right Time

Agents fail less when they start with the right context. In OpenClaw, the simplest way to do that is to assemble short, purpose-built context packets instead of dumping everything into every prompt.

## What a Context Packet Is

A context packet is a small, structured bundle you attach to a single run:

- A task brief in plain language
- Any required constraints or policies
- The minimum data needed to decide and act

Think of it as a run-specific briefing, not a permanent memory dump.

## Why It Works

Most agent errors come from two things: missing information or too much noise. Context packets solve both:

- They force you to pick the signal that matters
- They keep the model from hallucinating around irrelevant details
- They reduce token waste so the agent can focus on the task

## A Simple Packet Template

Keep it short and consistent:

1. Goal: one sentence
2. Constraints: what must not happen
3. Inputs: the data needed to decide
4. Output format: what success should look like

If you can’t fill a section, remove it. Dead fields create confusion.

## Where to Use Them

Context packets shine in repeatable workflows:

- Daily summaries
- Customer support triage
- Data cleanup jobs
- Content drafts with strict tone rules

The more repeatable the task, the more value you get from a clean packet.

## Takeaway

A small, focused context packet beats a giant prompt every time. In OpenClaw, it’s the easiest way to keep agents sharp, efficient, and predictable.
