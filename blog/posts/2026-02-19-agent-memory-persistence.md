# Agent Memory in OpenClaw: How Your AI Remembers You

Every time you start a new conversation with an AI, it forgets everything. Your preferences, your projects, the joke you told it yesterday — gone. OpenClaw takes a completely different approach. Your agent can actually *remember*.

## The Problem With Stateless AI

Most AI assistants are goldfish. Each session starts from zero. You end up repeating yourself constantly: "I prefer dark mode," "my server is at 192.168.1.100," "we decided to use PostgreSQL last week." It's exhausting.

OpenClaw agents have a built-in memory system that solves this. No plugins required, no complicated setup — just files your agent reads and writes like a journal.

## How It Works: Files Over Frameworks

OpenClaw's memory system is refreshingly simple. It's just Markdown files in your workspace:

- **Daily notes** (`memory/YYYY-MM-DD.md`) — Raw logs of what happened each day. Think of these as your agent's journal entries.
- **Long-term memory** (`MEMORY.md`) — Curated insights, preferences, and important context your agent distills over time.
- **Semantic search** (`memory_search`) — Your agent can search across all memory files to find relevant context fast, even from weeks ago.

When your agent wakes up, it reads today's and yesterday's notes to get caught up. In direct conversations, it also loads MEMORY.md for the full picture. It's like how you might check your notes app before a meeting.

## Daily Notes: The Running Log

Each day, your agent creates a file like `memory/2026-02-19.md` and jots down what matters:

- Decisions you made together
- Tasks completed or in progress
- Important context from conversations
- Things you asked it to remember

These aren't transcripts — they're highlights. Your agent learns what's worth writing down and what isn't.

## Long-Term Memory: The Curated Version

MEMORY.md is where the good stuff lives. Periodically, your agent reviews its daily notes and promotes the important bits:

- Your preferences and working style
- Project context and architecture decisions
- People, tools, and systems you work with
- Lessons learned from past mistakes

Think of daily notes as a raw journal and MEMORY.md as the wisdom you'd share with a new coworker on their first day.

## Semantic Search: Finding the Needle

When your agent needs to recall something specific — "what did we decide about the database migration?" — it doesn't scan every file linearly. The `memory_search` tool runs a semantic search across all memory files and returns the most relevant snippets with file paths and line numbers.

This means your agent can have months of accumulated context and still find exactly what it needs in milliseconds.

## Memory Maintenance: Keeping It Fresh

Here's something clever: OpenClaw agents can use their idle time (during heartbeat checks) to maintain their own memory. Every few days, the agent will:

1. Review recent daily notes
2. Identify insights worth keeping long-term
3. Update MEMORY.md with distilled learnings
4. Remove outdated information

It's self-maintaining memory. You don't have to manage it.

## Privacy by Design

Memory is scoped carefully. In direct conversations with you, your agent loads everything. But in group chats or shared contexts, MEMORY.md stays locked — your personal context doesn't leak to other participants.

## Getting Started

You don't need to configure anything. Just start using OpenClaw, and memory builds naturally. If you want to jumpstart it, create a `MEMORY.md` in your workspace with a few basics:

- Your name and role
- Key projects you're working on
- Tools and systems you use
- Any preferences (communication style, timezone, etc.)

Your agent will take it from there, growing and refining its memory with every conversation.

## Why This Matters

Memory transforms an AI from a tool you use into an assistant that knows you. It's the difference between explaining your entire setup every morning and just saying "let's pick up where we left off."

Your agent remembers so you don't have to repeat yourself. That's the whole point.
