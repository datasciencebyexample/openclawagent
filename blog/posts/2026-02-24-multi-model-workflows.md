# Multi-Model Workflows in OpenClaw: Picking the Right Brain for Every Task

Not every task needs the same model. A quick reminder doesn't need the same horsepower as a deep research session. OpenClaw lets you mix and match models across sessions, sub-agents, and cron jobs — so you can optimize for speed, cost, and quality all at once.

## Why Multiple Models?

Large language models aren't one-size-fits-all. A flagship model like Claude Opus is brilliant for nuanced reasoning, creative writing, and complex multi-step tasks. But for a simple "remind me in 20 minutes" or a quick status check? That's like hiring a PhD to flip a light switch.

OpenClaw gives you the tools to be intentional about which model handles what.

## Session-Level Model Overrides

Every OpenClaw session has a default model set in your gateway config. But you can override it per session using the `/model` command or programmatically through session status controls.

This means your main chat can run on a powerful model while background tasks use something lighter and faster. The override sticks for the session's lifetime, so you set it once and forget it.

## Sub-Agents With Different Models

This is where it gets interesting. When you spawn a sub-agent with `sessions_spawn`, you can specify a different model for that task. A quick example:

- Your main session runs on Claude Opus for rich conversation
- A sub-agent doing a simple file cleanup runs on a faster, cheaper model
- Another sub-agent doing deep research runs on a model with extended thinking

Each sub-agent is isolated, so model choices don't interfere with each other. You get parallel execution with purpose-built model selection.

## Cron Jobs and Model Selection

Scheduled tasks through OpenClaw's cron system also support model overrides. Your daily email summary might run on a mid-tier model — fast enough to scan and summarize, smart enough to catch what matters. Meanwhile, a weekly deep-dive analysis job can use a heavier model with more thinking time.

The key fields in a cron job definition:

- **model** — which model to use for the job
- **thinking** — the reasoning level (off, low, medium, high)
- **timeoutSeconds** — how long the job can run

Matching these to the task complexity keeps your costs predictable and your results sharp.

## Practical Strategies

Here are a few patterns that work well:

**The Tiered Approach:** Set your default model to something balanced. Override to a premium model only for sessions or tasks that genuinely need deeper reasoning. Use lightweight models for routine automation.

**The Specialist Pattern:** Different sub-agents for different specialties. One model might be better at code generation, another at creative writing, another at data analysis. Route tasks accordingly.

**The Cost Cap:** For high-frequency tasks like heartbeat checks or quick lookups, always use the most efficient model available. Save the heavy hitters for tasks where quality directly matters.

## Getting Started

If you're already running OpenClaw, you're probably using a single model for everything. Try this:

1. Check your current setup with `/status` to see your default model
2. Next time you spawn a sub-agent, explicitly set a lighter model
3. Review your cron jobs — are any of them over-powered for what they do?
4. Experiment with thinking levels — not every task needs deep reasoning

The goal isn't to use the cheapest model everywhere. It's to use the *right* model everywhere. Your agent gets faster, your costs go down, and the quality stays high where it counts.

## The Bigger Picture

Multi-model workflows are part of a broader shift in how we think about AI agents. Instead of one monolithic brain doing everything, you're building a team — each member picked for their strengths. OpenClaw makes this practical by letting you configure models at every level: gateway defaults, session overrides, sub-agent spawns, and scheduled jobs.

Your agent doesn't need to be one thing. It can be exactly what each moment requires.
