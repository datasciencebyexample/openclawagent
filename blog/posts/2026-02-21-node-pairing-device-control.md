# Node Pairing in OpenClaw: Control Your Devices From Anywhere

Your AI agent lives on a server or desktop, but your life happens across phones, laptops, tablets, and more. OpenClaw's node pairing system bridges that gap — letting your agent reach out and interact with any paired device as naturally as you'd pick up your phone.

## What Is a Node?

In OpenClaw, a "node" is any device that's been paired with your gateway. Once paired, your agent can run commands on it, snap photos from its cameras, grab screenshots, check its location, and send notifications — all through simple tool calls.

Think of it like giving your agent hands on every device you own.

## How Pairing Works

Pairing is a one-time approval flow. A device requests to pair, you approve it from your main session, and from that point forward the agent can interact with it freely. The trust model is explicit: nothing happens without your initial approval.

Once paired, the node shows up in your agent's `nodes` tool. A quick `nodes status` call shows every connected device, its online status, and what capabilities it supports.

## What Can Your Agent Actually Do?

Here's where it gets fun. With a paired node, your agent can:

- **Run commands** — Execute shell commands on a remote machine. Check disk space on your home server, restart a service, pull a git repo. Anything you'd SSH in to do, your agent can handle.

- **Take photos** — Snap pictures from front or back cameras on a phone. Useful for quick visual checks ("what does the whiteboard say?") or just seeing what's going on.

- **Grab screenshots** — Capture what's currently on a device's screen. Great for debugging or checking on a running process.

- **Check location** — Get a device's current GPS coordinates. Helpful for location-based reminders or just answering "where did I leave my phone?"

- **Send notifications** — Push alerts directly to a device with custom titles, messages, and priority levels. Your agent can tap you on the shoulder when something important happens.

## A Practical Example

Say you're at work and you want your agent to check if a package was delivered. If you've got a phone at home paired as a node, your agent can snap a photo from the camera pointed at your front door, analyze the image, and tell you — all without you lifting a finger.

Or imagine you're running a long build on your home machine. Your agent can periodically check in via `nodes run`, and when it finishes, push a notification straight to your phone.

## Nodes + Cron = Autonomous Monitoring

Combine node pairing with OpenClaw's cron system and things get really powerful. Schedule your agent to:

- Check your home server's health every hour
- Snap a security photo at random intervals
- Monitor a process and alert you when it completes
- Track device locations for geo-fenced reminders

The agent runs these autonomously in isolated sessions — you only hear about it when something needs your attention.

## Security First

Node pairing is designed with a clear trust boundary. Every device must be explicitly approved. Commands are logged. Camera and location access are gated by capability flags that the node itself advertises. Your agent can't access anything the device hasn't opted into.

If a device goes offline, the agent handles it gracefully — no crashes, just a note that the node isn't currently reachable.

## Getting Started

1. Install the OpenClaw node agent on your device (phone, laptop, Raspberry Pi — whatever you want to control).
2. Initiate pairing from the device.
3. Approve the pairing request from your main session.
4. Start using `nodes` commands in your agent's toolkit.

That's it. No complicated networking, no port forwarding, no SSH key juggling. The gateway handles the connection.

## Why It Matters

Most AI assistants live in a chat window. They can talk, but they can't *do*. Node pairing is what turns OpenClaw from a chatbot into an actual agent — one that can see, act, and reach across your devices to get things done.

Your agent shouldn't just answer questions. It should be able to check the camera, restart the server, and let you know when dinner's ready — all in the same conversation.
