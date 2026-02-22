# Heartbeats in OpenClaw: Building a Proactive Agent That Checks In

Most AI assistants sit around waiting for you to say something. OpenClaw flips that model on its head with **heartbeats** — a simple polling system that lets your agent wake up on its own, look around, and take action without being asked.

## What Are Heartbeats?

A heartbeat is a periodic nudge from OpenClaw to your agent. Every 30 minutes or so, the system sends a heartbeat prompt, and your agent gets a chance to do something useful — check your email, glance at your calendar, review notifications, or just tidy up its own memory files.

If nothing needs attention, the agent replies with `HEARTBEAT_OK` and goes back to sleep. No noise, no wasted tokens.

## Why This Matters

Think about what a good personal assistant actually does. They don't just answer questions — they anticipate. They notice things. "Hey, you have a meeting in an hour" or "That email from your boss looks urgent" are the kinds of nudges that make an assistant genuinely helpful.

Heartbeats give your OpenClaw agent the same ability. Instead of a purely reactive tool, you get something closer to a teammate who keeps an eye on things.

## Setting Up Your Heartbeat Routine

The magic lives in a file called `HEARTBEAT.md` in your workspace. Your agent reads this file every time a heartbeat fires, and follows whatever checklist you put there.

A simple example:

```markdown
## Heartbeat Checklist
- Check email for anything urgent
- Look at calendar for events in the next 2 hours
- If it's been 8+ hours since last check-in, say hi
```

Keep it short. Every item burns tokens, so focus on what actually matters to you.

## Tracking What's Been Checked

Smart agents don't re-check the same thing every 30 minutes. OpenClaw agents can maintain a `heartbeat-state.json` file to track when each category was last checked:

```json
{
  "lastChecks": {
    "email": 1740261600,
    "calendar": 1740258000,
    "weather": null
  }
}
```

This way, your agent can rotate through different checks — email this heartbeat, calendar the next, weather once a day — without hammering every API on every cycle.

## Heartbeats vs Cron Jobs

OpenClaw also has a full cron system (we covered that in a previous post). So when do you use heartbeats versus cron?

**Use heartbeats when:**
- You want to batch multiple checks together in one pass
- Timing can be approximate (every ~30 min is fine)
- The agent needs conversational context from recent messages
- You want to minimize API calls by combining tasks

**Use cron when:**
- Exact timing matters ("9 AM every Monday")
- The task should run in isolation from your main session
- You want a one-shot reminder ("remind me in 20 minutes")
- Output should go directly to a specific channel

In practice, most people use both. Heartbeats handle the ambient awareness, and cron handles the precise scheduling.

## Knowing When to Stay Quiet

The best part of the heartbeat system is what happens most of the time: nothing. A well-configured agent checks in, sees nothing important, and stays silent. No "just checking in!" messages at 2 AM. No unnecessary pings.

The general rules are simple:
- Late night? Stay quiet unless something is urgent.
- Just checked 10 minutes ago? Skip this one.
- Human is clearly in the middle of something? `HEARTBEAT_OK`.

This restraint is what makes the system feel natural rather than annoying.

## Proactive Memory Maintenance

One underrated use of heartbeats is memory housekeeping. Every few days, your agent can use a heartbeat cycle to review its daily notes, distill important insights into long-term memory, and clean up outdated information.

It's like journaling — the daily files are raw notes, and the periodic review turns them into lasting knowledge. All happening in the background without you lifting a finger.

## Getting Started

If you're running OpenClaw, heartbeats are already built in. Create a `HEARTBEAT.md` in your workspace with a simple checklist, and your agent will start picking it up on the next cycle. Tweak the checklist as you learn what's useful and what's noise.

The goal isn't to build a hyper-vigilant monitoring system. It's to give your agent just enough awareness to be genuinely helpful — the kind of assistant that notices things before you have to ask.
