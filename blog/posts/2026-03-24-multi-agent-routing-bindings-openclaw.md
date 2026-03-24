# OpenClaw Multi-Agent Routing: Bindings That Keep Work and Personal Worlds Apart

Running multiple OpenClaw agents in one gateway is powerful, but only if inbound traffic is routed predictably. A good routing plan avoids context leaks, keeps the right tools in the right workspace, and gives you confident control over where each message lands. This post walks through a practical, production-safe approach to multi-agent routing with bindings, including CLI workflows, config structure, and how to avoid the most common misroutes.

## The core model: agents + bindings + matches

OpenClaw supports multiple isolated agents inside a single gateway. Each agent has its own workspace, identity, and session state. Routing bindings decide which inbound channel traffic is handled by which agent.

There are two important layers:

1. **Agent definitions**: the list of agents and their workspaces.
2. **Bindings**: match rules that map inbound traffic (channel, account, peer) to an agent.

The minimum requirement is one agent with `default: true`. Everything else is explicit, deterministic routing.

## A practical baseline config

Use this config layout to separate personal and work traffic, with a safe default:

```json
{
  "agents": {
    "list": [
      { "id": "home", "default": true, "workspace": "~/.openclaw/workspace-home" },
      { "id": "work", "workspace": "~/.openclaw/workspace-work" }
    ]
  },
  "bindings": [
    { "agentId": "home", "match": { "channel": "whatsapp", "accountId": "personal" } },
    { "agentId": "work", "match": { "channel": "whatsapp", "accountId": "biz" } },
    { "agentId": "work", "match": { "channel": "discord", "guildId": "ops-guild" } }
  ]
}
```

Why this structure works:

- **Default agent**: `home` catches anything unmatched. That’s usually safer because personal context is less risky than work context (especially if work tools can modify systems).
- **Explicit bindings**: business accounts and work servers route to `work` without relying on guessing or conversation history.
- **Channel-specific**: you can mix Discord + WhatsApp + Telegram with targeted routing.

## CLI-first workflow (fast and safe)

You can create and tune bindings without touching JSON. This is safer during iterative rollout because it reduces config errors and avoids file edits mid-test.

```bash
openclaw agents list
openclaw agents add work --workspace ~/.openclaw/workspace-work

openclaw agents bindings
openclaw agents bind --agent work --bind whatsapp:biz
openclaw agents bind --agent work --bind discord:ops-guild

openclaw agents bindings --agent work
```

If you already have a binding for a channel and later provide a more specific account scope, OpenClaw upgrades that binding in place instead of creating duplicates. This is useful when you start broad and then narrow once you discover the right account IDs.

## Understanding binding scope (and why it matters)

Bindings can match at multiple levels of specificity. The decision logic matters, so treat it like a routing table:

- **Channel only**: `whatsapp` (default account only)
- **Channel + accountId**: `whatsapp:biz` (stronger match)
- **Channel + accountId "*"**: catch-all for any account on that channel
- **Peer-specific** (optional): match individual conversations or groups

Key rule: a channel-only binding (no `accountId`) only matches the channel’s default account, not all accounts. If you want a channel-wide catch-all, use `accountId: "*"`.

That single detail is where most routing mistakes happen. If you bind `whatsapp` expecting to route everything, you’ll miss traffic from non-default accounts. The fix is explicit.

## Add peer-level routing for high-risk flows

Peer-level bindings let you pin a specific conversation or group to an agent, even if it shares the same account. This is ideal for:

- A high-sensitivity ops channel on Discord
- A finance group on WhatsApp
- A single VIP client thread

You can add a peer match in config when you know the identifiers. Use this sparingly: it creates a powerful override and can be confusing if you forget it exists. Keep a short comment or document the reasoning in your ops notes.

## Identity matters more than you think

Different agents should look and act different. A simple identity setup avoids confusion and helps humans know which agent they’re talking to:

```bash
openclaw agents set-identity --agent work --name "OpenClaw Work" --emoji ":briefcase:" --avatar avatars/work.png
openclaw agents set-identity --agent home --name "OpenClaw Home" --emoji ":house:" --avatar avatars/home.png
```

When a message lands in the wrong agent, the user can spot it immediately and correct it, which reduces silent damage. If you can’t set avatars, at least set the name.

## Tradeoffs and when to split gateways instead

Routing within one gateway is convenient, but not always the best choice. Consider a second gateway if:

- **Work tools are high-impact** and you don’t want any chance of cross-routing.
- **Compliance requirements** demand hard isolation between data sources.
- **Plugins vary** (some only installed for work), and you don’t want them visible to personal workflows.

If you stay in one gateway, tighten policy guardrails for each agent, especially tool access and approval requirements. The convenience is real, but so is the risk.

## Failure mode: misrouting to the wrong agent

**What happens:** A binding you expected to be global isn’t. Messages from a non-default account fall through to the default agent. That agent might respond with the wrong identity, wrong context, or even run the wrong tools.

**Mitigation:**

- Replace channel-only bindings with explicit account bindings.
- Add a catch-all binding for critical channels using `accountId: "*"`.
- Audit with `openclaw agents bindings --json` and confirm that every channel/account combo you care about is covered.
- Add a lightweight safety check in your agent prompt: if the message includes a work-only keyword and the agent is not the work agent, ask for confirmation rather than act.

## Safe rollout sequence

Use this staged rollout to avoid surprises:

1. **Create agents and identities.** Make them visually distinct.
2. **Bind one channel/account** to the work agent and verify traffic.
3. **Add bindings incrementally** as you validate each channel’s account IDs.
4. **Introduce peer-level bindings** only after channel-level routing is stable.
5. **Add a “wrong agent” guard** in prompts for the default agent (e.g., “If user says ‘ticket’ or ‘incident’, confirm this should be handled here”).

The goal is not perfection on day one; it’s a controlled, observable migration.

## Verification checklist (use every time you adjust bindings)

- Confirm agents exist and workspaces are correct.
- Verify identities are distinct and recognizable.
- Run `openclaw agents bindings` and check every expected channel/account pair.
- Send a test message through each bound channel and confirm the agent identity.
- Confirm the default agent does **not** receive work-only traffic.
- Update any monitoring/alerts that assume a single agent.

## When you should not use bindings

Bindings are excellent for routing, but they do not solve:

- **Cross-tool safety**: use policy guardrails and approvals.
- **Data isolation**: use separate gateways or machine-level separation if required.
- **Conversation continuity** across agents: avoid moving a thread mid-flight unless you can accept context loss.

If your goal is strict isolation, split the gateways instead of overloading bindings with responsibility they are not designed to handle.

## Final take

Multi-agent routing is one of the highest leverage configuration changes you can make in OpenClaw. It lets you scale safely across personal, work, and specialized assistants without needing multiple machines. The key is being explicit: define agents, bind with account-level matches, and validate every route. Do that, and your assistants will stay in their lanes — which is exactly what you want when automation gets real.
