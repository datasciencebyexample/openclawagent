# OpenClaw Gateway Exposure Hardening: Bind Modes, Auth, and Safe Remote Access

If your OpenClaw agent is doing real work, the Gateway is the most valuable surface to protect. It powers the Control UI and WebSocket calls, so the question is not “can I access it remotely?” but “how do I expose it without creating a silent backdoor?” This post gives a concrete hardening recipe you can implement quickly and verify every time you change settings.

## Start with the exposure model you actually need

Pick one of these models and commit to it. Most problems happen when you drift between them without updating auth.

- **Loopback only (recommended).** The Gateway listens on 127.0.0.1 and is only reachable from the same machine. Safest default.
- **Private network access.** The Gateway is reachable on your LAN or tailnet. This is the right choice when you need remote access from your own devices but do not want to expose anything on the public Internet.
- **Public exposure (only if required).** The Gateway is reachable from the Internet. This should be rare. If you need it, prefer Tailscale Funnel with password auth and treat the Gateway like a production API with strict auth, network rules, and monitoring.

## Baseline configuration that should exist in every model

Even for localhost, you want explicit authentication. It prevents unexpected local processes from talking to your Gateway and makes your setup behave the same in dev and prod.

Use a token and keep it explicit in config. Here is a minimal JSON5 config that works for loopback while forcing auth:

```json5
{
  gateway: {
    bind: "loopback",
    auth: {
      mode: "token",
      token: "replace-with-a-long-random-token"
    }
  }
}
```

Practical guidance:

- Generate a token once and store it in a secure place. You can use `openclaw doctor --generate-gateway-token` if you want a fresh value without crafting it yourself.
- Keep the token in a file or secrets manager, then inject it into the config at startup. Avoid shell history where possible.
- Rotate the token on a schedule if your Gateway is reachable from other machines.

If you run the Gateway via a service manager, make sure the token is only readable by that service account. If you run it locally, treat the token like an API key.

## A safe remote access pattern that scales

The safest remote access is not “bind to 0.0.0.0” but “keep loopback and tunnel access.” This keeps the Gateway closed to everything except a trusted tunnel or tailnet identity.

### Option A: Private network serve (recommended)

- Keep `bind: "loopback"` (or use `bind: "tailnet"` if you only want the tailnet interface).
- Use your private network’s serve feature to expose the local port to authenticated devices. OpenClaw also supports integrated Tailscale Serve from the `openclaw gateway` command.
- Keep auth enabled; let the network identity handle first-layer auth and the token handle second-layer auth.

This gives you two gates: device identity and token.

If you use Tailscale Serve, you can optionally allow Tailscale identity headers for the Control UI and WebSocket auth. That is convenient for personal devices, but it assumes the Gateway host itself is trusted. API endpoints still require token or password auth. If you run untrusted code on the host, disable `gateway.auth.allowTailscale` and require token or password auth instead.

### Option B: SSH tunnel (good fallback)

Keep `bind: "loopback"`, establish an SSH tunnel from your client device, and point the Control UI at `http://127.0.0.1:<port>` on your client machine. The tunnel keeps the Gateway invisible to the LAN, and SSH gives you an audit trail in logs.

## When you must bind to LAN or tailnet

Sometimes you need the Gateway reachable by multiple services on your network or inside containers. If you choose this route, set a clear policy and make it visible.

A minimal LAN bind with token auth looks like this:

```json5
{
  gateway: {
    bind: "lan",
    port: 18789,
    auth: {
      mode: "token",
      token: "replace-with-a-long-random-token"
    }
  }
}
```

Tradeoffs to acknowledge:

- LAN bind increases your attack surface to every device on the network. If your Wi-Fi is shared, this is not acceptable.
- Tailnet bind reduces exposure compared to LAN but still requires token auth and device hygiene. It is safer, not risk-free.
- When you expose the Gateway, you must be prepared to rotate the token and update any clients that store it.

If you need LAN bind for containers, consider running the Gateway with host networking instead of binding the container port to all interfaces. That keeps the Gateway loopback-only while still reachable from colocated containers.

## Control UI auth gotchas you should plan for

The Control UI stores the token so it can authenticate the WebSocket connection. If you rotate the token, the UI will keep using the old one until you replace it. This is the most common “sudden unauthorized” failure.

Make token rotation part of your process:

1. Rotate the token in the Gateway config or environment.
2. Restart or reload the Gateway so it picks up the new value.
3. Update the Control UI settings with the new token.
4. Validate by opening a new session and checking that tool events stream normally.

If you run multiple UI clients (laptop, desktop, tablet), update them all. It is easy to forget one and later assume the Gateway is down. If you host the UI from a different origin (dev server or separate host), allow that origin explicitly with `gateway.controlUi.allowedOrigins`.

## Token vs password vs trusted proxy

You will see multiple auth modes in the Gateway configuration. Here is the practical view.

- **Token auth:** Best default. Easy to rotate and works well with local or remote clients.
- **Password auth:** Better when humans log in manually and you want to avoid storing tokens in a UI.
- **Trusted proxy:** Only use if you terminate auth upstream and can inject a trusted user header. If you go this route, set `gateway.trustedProxies` so the Gateway only trusts forwarded headers from your proxy IPs.

If you are unsure, choose token auth and keep it on loopback or a private network.

## Container and network edge cases that bite

Two common mistakes:

- **Docker bridge with loopback bind.** If the Gateway binds to 127.0.0.1 inside a container, your host cannot reach it over a published port. Use host networking or a LAN bind if you truly need host access.
- **Multiple listeners on the same port.** If you have an old Gateway process running, you can accidentally test against the wrong instance.

Mitigation: keep a single systemd service (or equivalent) and monitor that the process count is one. If you run in containers, use a health check and a unique port per environment.

## Failure mode and mitigation

**Failure mode:** You change `gateway.bind` to `lan` so a teammate can connect, but forget to set `gateway.auth.mode` and `gateway.auth.token`. The Gateway starts, and anyone on the LAN can connect without a token. If you then paste secrets into a chat session, you have exposed them to the whole network.

**Mitigation:**

- Treat any non-loopback bind as a breaking change. Make it a reviewed change, not a quick tweak.
- Add a startup check in your service wrapper: if `bind` is not `loopback` and `auth.mode` is not set, fail the start.
- Keep a simple “exposure checklist” in the same repo as your config so you do not skip steps when under pressure.

This is a small process change that prevents the single most damaging misconfiguration.

## Rollout checklist (keep it short)

Use this every time you change Gateway exposure settings.

- Confirm which exposure model you want: loopback, private network, or public.
- Verify `gateway.auth.mode` and its credential are set explicitly.
- Restart or reload the Gateway and confirm the active token matches what the UI is using.
- Validate connectivity from the intended client and confirm auth fails from an unintended client.
- Record the change in a short runbook note with the date and token rotation status.

## Final guidance

Most OpenClaw incidents start with a convenience change. The best hardening work is boring: keep loopback, use a tunnel, and keep token auth explicit. If you must expose the Gateway, do it intentionally, document it, and make rotation a routine. That gives you remote access without quietly expanding your blast radius.
