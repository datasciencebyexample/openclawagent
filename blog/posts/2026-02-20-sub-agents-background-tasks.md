# Sub-Agents in OpenClaw: Background Tasks That Think for Themselves

One of the most powerful features hiding in OpenClaw is the ability to spawn sub-agents — isolated background sessions that go off, do work, and report back when they're done. Think of them as coworkers you can delegate to without micromanaging.

## Why Sub-Agents?

Your main agent session is great for conversation, but some tasks take time. Research, code reviews, data processing, long-running automations — these shouldn't block your chat. Sub-agents let your agent fork off work into isolated sessions that run in parallel.

The key insight: sub-agents aren't just background threads. Each one gets its own session context, can use its own model, and announces results back to you automatically when it finishes.

## How It Works

When your agent decides a task is complex enough to delegate, it spawns a sub-agent with a specific task description. The sub-agent runs independently — it has access to the same tools (files, web, browser, etc.) but operates in its own session bubble.

Here's what makes this powerful:

- **Parallel execution** — Spawn multiple sub-agents for different research threads at once
- **Model flexibility** — Use a faster model for simple tasks, a stronger one for complex reasoning
- **Isolation** — Sub-agents don't pollute your main conversation history
- **Auto-announcement** — Results get pushed back to you without polling

## Real-World Use Cases

### Research and Summarization

Ask your agent to research three competing products. Instead of doing them sequentially (slow), it spawns three sub-agents that each investigate one product simultaneously. Results flow back as each finishes.

### Code Review

Working on a big PR? A sub-agent can review the diff in the background while you keep chatting about architecture decisions in your main session.

### Periodic Reports

Combine sub-agents with OpenClaw's cron system. Schedule a daily job that spawns a sub-agent to gather metrics, compile a report, and deliver it to your Discord or Telegram.

### Multi-Step Workflows

Need to scrape five websites, cross-reference data, and produce a summary? Each scraping task becomes a sub-agent. The main agent coordinates and synthesizes once all results are in.

## Managing Your Sub-Agents

You're not flying blind once tasks are delegated. OpenClaw gives you controls to:

- **List** active sub-agents and see what they're working on
- **Steer** a running sub-agent with new instructions if priorities change
- **Kill** a sub-agent that's gone off track or is no longer needed

This means you can course-correct without starting over — a huge time saver for long-running tasks.

## Tips for Getting the Most Out of Sub-Agents

1. **Be specific in task descriptions.** The clearer the prompt, the better the result. Sub-agents don't have your conversation history for context.

2. **Use labels.** Give sub-agents meaningful labels so you can track which is doing what when you have several running.

3. **Don't over-parallelize.** Three focused sub-agents beat ten vague ones. Each spawned session has overhead.

4. **Combine with cron for automation.** Scheduled jobs that spawn sub-agents are perfect for daily digests, monitoring, and reporting workflows.

5. **Let results come to you.** Sub-agents auto-announce when done. Resist the urge to keep checking on them — that defeats the purpose.

## The Bigger Picture

Sub-agents represent a shift in how we think about AI assistants. Instead of a single chatbot answering questions, you get an orchestrator that delegates, coordinates, and synthesizes. Your agent becomes a manager, not just a worker.

This is where personal AI starts to feel genuinely useful — not just answering one question at a time, but tackling complex, multi-step problems the way a small team would.

If you haven't tried spawning a sub-agent yet, start simple: ask your agent to research something in the background while you keep working. Once you see results flowing back automatically, you'll wonder how you ever worked without it.
