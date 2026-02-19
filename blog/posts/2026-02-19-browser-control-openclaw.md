# Browser Control in OpenClaw: Give Your Agent Eyes on the Web

One of the most exciting things about OpenClaw is that your agent does not just chat — it can actually browse the web. Open tabs, read pages, click buttons, fill forms, take screenshots. All from the same conversation where you ask it to check your calendar or send a message.

This post covers how browser control works in OpenClaw, how to set it up, and what you can actually do with it.

## Why browser control matters

Most AI assistants can search the web. But searching and browsing are different things. Searching gives you links. Browsing means your agent can go to a page, read what is on it, interact with it, and report back.

That opens up a lot of practical use cases:

- Check the status of a deployment dashboard
- Fill out a form on a website you use regularly
- Grab a screenshot of a page for reference
- Read content behind a login (using the agent's own browser session)
- Verify that a website looks correct after a deploy

Your agent becomes less of a chatbot and more of a coworker who has their own browser open.

## Two modes: managed and relay

OpenClaw gives you two ways to use the browser.

**Managed browser (`openclaw` profile):** This is a separate, isolated browser that OpenClaw launches and controls directly. It has its own profile, its own cookies, its own tabs. It does not touch your personal browser at all. Think of it as the agent's own workstation.

**Chrome extension relay (`chrome` profile):** This connects to your existing browser through the OpenClaw browser extension. You click the toolbar icon on a tab, and the agent can see and interact with that tab. Useful when you want the agent to work with pages where you are already logged in.

The managed browser is the safer default for automation. The relay is handy for one-off tasks where your session matters.

## Getting started

Browser control is enabled by default. To check:

```bash
openclaw browser --browser-profile openclaw status
```

To launch the managed browser and open a page:

```bash
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw open https://example.com
```

Once it is running, your agent can use browser actions naturally. Just ask it things like:

- "Open the GitHub status page and tell me if anything is down"
- "Go to our dashboard and screenshot the metrics"
- "Fill out the feedback form on this page"

The agent uses snapshots (a structured view of the page) to understand what is on screen, then takes actions like clicking, typing, and scrolling.

## What the agent can do

Here is a quick rundown of browser capabilities:

- **Open and navigate** — Open URLs, switch tabs, go back and forward
- **Snapshot** — Get a structured, readable view of the page content
- **Screenshot** — Capture a visual image of the page
- **Click and type** — Interact with buttons, links, and form fields
- **Fill forms** — Enter text into inputs, select dropdowns
- **PDF export** — Save the current page as a PDF
- **Upload files** — Attach files to upload fields
- **Evaluate JavaScript** — Run custom scripts on the page

All of this happens through the same tool interface your agent already uses for everything else. No special setup beyond enabling the browser.

## Multiple profiles

If you need more than one browser context, OpenClaw supports multiple profiles. Each gets its own isolated session with separate cookies and state.

A common setup:

- `openclaw` — General agent browsing
- `work` — Logged into work tools
- `remote` — Connected to a browser on another machine via CDP

You configure these in `~/.openclaw/openclaw.json` under the `browser.profiles` section. Each profile can have its own color so you can visually tell them apart.

## Safety and isolation

The managed browser runs in its own profile directory, completely separate from your personal browsing. Your passwords, cookies, and history stay private. The agent only sees what is in its own browser.

The control service binds to localhost only, so nothing is exposed to the network. And since all actions go through the agent loop, you can see exactly what the agent is doing in your conversation.

## Practical ideas

Here are some ways people are using browser control with OpenClaw:

- **Morning briefing:** Agent opens a few dashboards, screenshots them, and sends a summary to your chat
- **Form automation:** Repetitive forms that need filling out on a schedule
- **Content monitoring:** Watch a page for changes and alert you when something updates
- **Research:** Have the agent browse multiple sources and compile findings
- **Testing:** After deploying a site, have the agent verify pages load correctly

Combined with cron jobs, you can schedule browser tasks to run automatically. Your agent checks a dashboard every morning before you wake up and sends you the highlights.

## Wrapping up

Browser control turns your OpenClaw agent from a text-only assistant into something that can see and interact with the web the same way you do. It is one of those features that feels small until you start using it, and then you wonder how you managed without it.

If you have not tried it yet, start with something simple: ask your agent to open a page and tell you what it sees. You might be surprised how useful it is.
