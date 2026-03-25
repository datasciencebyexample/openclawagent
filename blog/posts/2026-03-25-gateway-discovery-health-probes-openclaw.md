# OpenClaw Gateway Discovery and Health Probes: Keep Agents Online Without Guesswork

When an OpenClaw deployment grows beyond a single laptop, the hardest failures are the quiet ones: a gateway that looks “up” but can’t accept authenticated calls, a remote machine that’s running but not reachable, or two gateways that answer at once and send work to the wrong place. This post lays out a pragmatic, repeatable workflow for discovering gateways and probing their health so your agents stay reliable without manual babysitting.

The focus is on concrete, low-risk habits: always know which gateway you are targeting, verify auth explicitly, and turn discovery results into a stable registry you can monitor and automate against.

## What You’re Actually Trying To Prove

There are three distinct questions you need to answer in production. Treat them separately so the results are clear:

1. **Is the gateway process running?** This is a service-level signal: launchd/systemd, the daemon itself, and whether it is reporting as active.
2. **Is the gateway reachable over RPC?** This is a network and transport signal: can the CLI actually talk to the gateway URL you think it’s using.
3. **Is the gateway authenticated and ready for tools?** This is a policy/auth signal: even if it’s reachable, are you passing the right token/password for calls to succeed.

Each question needs a different command and different failure expectations. Mashing them together hides the root cause.

## Discovery: Find Gateways First, Then Pin Them

OpenClaw supports discovery via Bonjour (mDNS). Discovery is great for bootstrapping and local networks but is not stable enough to be your long-term source of truth.

**Bootstrap workflow:**

1. Discover gateways with a short timeout to reduce noise.
2. Record the gateway metadata you care about (role, address, port).
3. Pin those gateways into a small, explicit registry file for your automation and on-call checks.

Example discovery command:

```bash
openclaw gateway discover --timeout 4000
```

That output is a starting point. Don’t stop there. Create a registry in your repo or ops config (even a simple JSON/YAML file) that maps gateway names to explicit URLs and auth sources. The goal is to stop relying on discovery after initial setup, because mDNS can flap across VLANs, VPNs, or Wi‑Fi changes.

**Tradeoff:** mDNS is convenient and zero-config, but it is inherently local-network scoped. For anything beyond a single LAN or when reliability matters, you want explicit URLs and credentials in a registry.

## Health Checks: Use the Right Probe for the Right Signal

The gateway CLI gives you a layered set of commands. Use them in order, and be explicit about URLs and credentials.

### 1) Service status (is the process running?)

Use `gateway status` to see the daemon state and an optional RPC probe. This is the fastest “is it running?” signal.

```bash
openclaw gateway status
openclaw gateway status --json
```

When you are targeting a remote gateway, pass the URL and token explicitly so you can see if auth is working. Never assume it inherits credentials when you override the URL.

```bash
openclaw gateway status --url ws://127.0.0.1:18789 --token $OPENCLAW_GATEWAY_TOKEN
```

### 2) Health probe (is RPC actually responsive?)

Use `gateway health` to check the RPC path without doing anything heavy. It gives a clean signal you can run frequently.

```bash
openclaw gateway health --url ws://127.0.0.1:18789 --token $OPENCLAW_GATEWAY_TOKEN
```

### 3) Deep probe (is everything fully wired?)

Use `gateway probe` for “debug everything.” It’s the command you run when there’s a mismatch between service status and real behavior. It checks both the configured remote gateway and local loopback, which is useful for identifying split-brain or misrouted calls.

```bash
openclaw gateway probe --timeout 10000 --json
```

**When to use what:**

- `status` in dashboards and quick checks.
- `health` in fast, frequent monitors.
- `probe` in on-call incidents and rollout validation.

## Build a Tiny Gateway Registry

A registry is a simple file that records where your gateways live and how to authenticate to them. It removes guesswork and prevents the “wrong gateway” problem when you have multiple environments (local, staging, prod).

Example (YAML):

```yaml
gateways:
  local:
    url: ws://127.0.0.1:18789
    auth: env:OPENCLAW_GATEWAY_TOKEN
  staging:
    url: wss://gw-staging.example.com:18789
    auth: secretref:gateway.staging.token
  prod:
    url: wss://gw-prod.example.com:18789
    auth: secretref:gateway.prod.token
```

Even if you don’t have a formal config system, a file like this gives your automation and your humans a shared source of truth. It also makes it trivial to script health checks across multiple gateways with consistent flags.

## Implementation Pattern: A Safe Probe Script

Here’s a pattern that’s small enough to keep in a repo and reliable enough to run from cron or CI.

**Steps:**

1. Load gateway registry
2. For each gateway, run `status --json` with explicit `--url` and auth
3. If status is OK, run `health`
4. If health fails, run `probe` and alert

**Command flow (example for one gateway):**

```bash
openclaw gateway status --json --url "$GW_URL" --token "$GW_TOKEN"
openclaw gateway health --url "$GW_URL" --token "$GW_TOKEN"
openclaw gateway probe --json --timeout 10000 --url "$GW_URL" --token "$GW_TOKEN"
```

**Why this ordering matters:**

- `status` tells you whether the service is alive and how it was launched.
- `health` confirms the transport and auth path without long-running checks.
- `probe` is expensive and verbose, so you only run it when you need deeper context.

## Tradeoffs: Local Convenience vs Remote Predictability

When you override `--url`, you are explicitly saying “do not use any implicit config.” This is good for clarity but easy to mess up if you don’t pass auth alongside it. The payoff is that your checks become portable and deterministic across machines and CI.

**Pros of explicit URLs + auth:**

- No hidden dependency on local config
- Works in CI and remote automation
- Makes mistakes obvious

**Cons:**

- More CLI flags to manage
- Easy to forget `--token` or `--password`

That tradeoff is worth it for any environment that has more than one gateway or more than one operator.

## Failure Mode and Mitigation

**Failure mode:** You set `--url` for a remote gateway but forget to pass `--token` or `--password`. The command fails with an auth error, and you assume the gateway is down. You restart it unnecessarily, potentially dropping live sessions.

**Mitigation:**

- Always pair `--url` with explicit auth flags in scripts.
- Add a preflight check that ensures your auth source is present (env var or SecretRef resolution) before running any gateway commands.
- For on-call playbooks, include a “validate auth inputs” step before escalation.

A second, common failure is accidentally probing the wrong gateway when multiple are discoverable on the network. This leads to “healthy” results for the wrong environment.

**Mitigation:**

- Use discovery only for bootstrapping.
- Store explicit URLs in a registry and always pass them in automation.
- Include a gateway role label in your registry (local/staging/prod) and echo it in command output so humans notice mismatches quickly.

## Rollout Checklist

Use this checklist when you set up gateway monitoring or move from a single gateway to multiple environments:

- Confirm each gateway has a stable URL you can reach from your monitoring host.
- Record each gateway in a registry file with explicit auth source.
- Validate `openclaw gateway status --json` works for each registry entry.
- Validate `openclaw gateway health` works for each registry entry.
- Run `openclaw gateway probe` once to baseline expected output and timing.
- Add a watchdog that alerts on `health` failures and escalates to `probe`.
- Document the expected auth source for each environment (env var vs SecretRef).

## Closing Guidance

The gateway is the heartbeat of OpenClaw. Discovery gets you started, but explicit URLs and explicit auth keep you stable when there are multiple environments and real traffic. The small amount of extra effort pays off the first time an incident happens at 2 a.m. and you need a signal you can trust.

If you only do one thing after reading this, do this: turn discovery results into a pinned registry, then make all your health checks use explicit URLs and auth. That one habit removes most of the hidden ambiguity in gateway operations.
