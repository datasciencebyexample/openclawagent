# Cron Jobs and Scheduled Agents in OpenClaw

One of the most useful things an AI agent can do is work when you are not watching. OpenClaw has a built-in cron system that lets your agent run tasks on a schedule, fire one-shot reminders, and do background work in isolated sessions.

This post covers what cron jobs are in OpenClaw, how to create them, and practical examples you can use right away.

## What is a cron job in OpenClaw?

A cron job is a scheduled task that OpenClaw runs automatically. You define when it should run and what it should do. When the time comes, OpenClaw either injects a message into your main session or spins up an isolated session to handle the task independently.

There are three schedule types:

- **At** — Run once at a specific time. Great for reminders.
- **Every** — Run on a repeating interval. Good for periodic checks.
- **Cron expression** — Classic cron syntax for precise recurring schedules like "9 AM every Monday."

## Two ways to run: main vs isolated

Every cron job targets either the **main session** or an **isolated session**. The difference matters.

**Main session** jobs inject a system event into your active conversation. Your agent sees it as context and can respond naturally. Use this when you want the agent to alert you about something in your current chat.

**Isolated session** jobs spin up a fresh agent session, run the task, and optionally announce the result back to you. Use this for autonomous work that does not need your conversation history, like checking the weather, summarizing emails, or running a report.

A good rule of thumb: if the task needs to talk to you, use main. If it just needs to get done, use isolated.

## Creating a cron job

Your agent can create cron jobs using the cron tool. Here are some practical examples.

### One-shot reminder

Tell your agent "remind me to call the dentist at 3 PM" and it creates an at-schedule job:

```json
{
  "schedule": { "kind": "at", "at": "2026-02-18T15:00:00-05:00" },
  "payload": { "kind": "systemEvent", "text": "Reminder: call the dentist." },
  "sessionTarget": "main",
  "notify": true
}
```

When 3 PM hits, your agent gets the reminder text and relays it to you.

### Periodic check every 6 hours

Want your agent to check your inbox a few times a day? Set up a recurring job:

```json
{
  "schedule": { "kind": "every", "everyMs": 21600000 },
  "payload": {
    "kind": "agentTurn",
    "message": "Check for urgent unread emails and summarize anything important."
  },
  "sessionTarget": "isolated"
}
```

Every 6 hours, a fresh session spins up, checks email, and announces back if there is anything worth knowing.

### Classic cron: Monday morning briefing

For a weekly standup summary delivered at 9 AM Eastern every Monday:

```json
{
  "schedule": { "kind": "cron", "expr": "0 9 * * 1", "tz": "America/New_York" },
  "payload": {
    "kind": "agentTurn",
    "message": "Prepare a weekly briefing: calendar highlights, open tasks, and anything I should know."
  },
  "sessionTarget": "isolated"
}
```

## Heartbeats vs cron: when to use which

OpenClaw also has a heartbeat system where your agent wakes up periodically in the main session. So when should you use heartbeats and when should you use cron?

**Use heartbeats** when you want to batch several small checks together (inbox, calendar, notifications) in the main session and timing does not need to be exact.

**Use cron** when timing matters, the task should run in isolation, or you want a different model or thinking level for the job.

You can combine both. Many setups use heartbeats for lightweight periodic awareness and cron for precise, standalone tasks.

## Managing your jobs

Your agent can list, update, disable, and remove cron jobs at any time. Just ask:

- "Show me my scheduled jobs"
- "Disable the Monday briefing"
- "Change the email check to every 4 hours"
- "Delete the dentist reminder"

## Tips for good cron usage

1. **Set timezone explicitly** for cron expressions so your schedules do not drift with UTC.
2. **Use isolated sessions** for heavy tasks to keep your main conversation clean.
3. **Set `notify: true`** on reminders so you actually get notified.
4. **Keep job messages specific.** "Check email" is vague. "Check for urgent unread emails from the last 6 hours and summarize them" gives your agent clear direction.
5. **Review jobs periodically.** Old reminders and expired one-shots can pile up.

## Wrapping up

Cron jobs turn your OpenClaw agent from something you talk to into something that works for you in the background. Whether it is a simple reminder or a daily autonomous workflow, scheduled tasks are one of the easiest ways to get more value from your setup.

Try creating a reminder or a periodic check and see how it fits into your routine.
