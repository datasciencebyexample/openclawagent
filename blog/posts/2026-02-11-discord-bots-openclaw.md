# Discord Bots in OpenClaw: A Friendly Beginner's Guide

If you are new to Discord, it can feel like a big jump from "chat app" to "bot platform." The good news is that Discord is one of the easiest places to run bots because it gives you a first-class bot account, a clean install flow, and clear permissions.

This post explains how Discord works in plain terms, why it is a great fit for OpenClaw, and the exact steps to create a Discord bot and connect it to your OpenClaw agent.

## Discord in 60 seconds (for total beginners)

Discord is organized around **servers**. Servers are invite-only by default and act as hubs for a community, team, or group of friends. You can create your own server or join existing ones. Inside each server are **channels**, which are separate rooms for text or voice conversations.

If you have never used Discord before, think of it like this:

- A server is the building.
- Channels are the rooms.
- You and your bot are both "members" of the building.

Once your bot is added to a server, it can listen and respond in the channels you allow.

## Why Discord is an easy bot platform

Discord is designed for integrations. A Discord "app" can include a **bot user** that behaves like a normal server member. You can install that bot to a server with an install link, and you can control exactly what it is allowed to do using scopes and permissions.

That makes it a great fit for OpenClaw because you get:

- A dedicated bot identity (not your personal account)
- A simple install flow (copy a link, add to server)
- Clear permission controls
- A clean way to separate different agents by using different bots

## Step-by-step: Create a Discord bot and connect it to OpenClaw

### 1) Create a Discord app

Open the Discord Developer Portal and create a new application. This gives you an Application ID and a place to configure your bot.

### 2) Generate a bot token

In the app settings, go to the Bot page and click "Reset Token" to create a bot token. You will only see the token once, so store it somewhere safe.

### 3) Set up the install link

In the OAuth2 URL Generator for your app, select the `bot` scope and choose the permissions your bot needs. After you pick the scope, Discord generates a URL you can use to install the app.

### 4) Install the bot to your server

Copy the install link from the Installation page, open it in your browser, and add the bot to a test server where you have permission to manage the server. Once it is installed, you should see the bot in the server member list.

### 5) Connect the bot to OpenClaw

Now plug the token into your OpenClaw Discord channel config. The exact file or environment variable name depends on your OpenClaw setup, but the shape usually looks like this:

```json
{
  "channels": {
    "discord": {
      "botToken": "YOUR_BOT_TOKEN"
    }
  },
  "agents": {
    "list": [
      { "id": "main", "identity": { "name": "OpenClaw" } }
    ]
  }
}
```

If your OpenClaw config uses different field names, keep the same idea: store the bot token securely, point the Discord channel to it, and map the agent you want to run.

## Intents and message content (quick heads-up)

Discord uses **intents** to control which events your bot receives. Some are standard, and some are **privileged** (for example, access to message content or member events). You can toggle intents in the Bot settings page. If your bot becomes verified or grows large, you may need to request approval for privileged intents.

For many OpenClaw setups, you can start without privileged intents, then enable them only if you actually need to read message content directly.

## Why Discord works well for OpenClaw

OpenClaw thrives when the channel is predictable and the identity is clear. Discord gives you that by design. A bot is a separate account, it lives inside servers, and its permissions are explicit. That means you can:

- Keep your personal account separate
- Run multiple agents as different bots
- Limit access to specific servers or channels
- Onboard teams quickly with a single install link

## Quick checklist

- Create a Discord app
- Add the bot user
- Generate and save the bot token
- Set scopes, permissions, and an install link
- Install the bot to a test server
- Add the token to your OpenClaw config

Once that is done, you can start building real workflows on Discord with OpenClaw.
