# Confidence Gates in OpenClaw: When Agents Should Ask Before Acting

Fast agents are great, but confident agents are safer. A confidence gate is a simple rule that forces a clarifying question when the agent is unsure.

## What a Confidence Gate Looks Like

- Low signal: missing inputs, ambiguous targets, or unclear success criteria
- High impact: actions that change data, spend money, or message users
- Risky scope: bulk actions or anything hard to undo

## A Practical Gate Pattern

1. Score the action confidence (high, medium, low)
2. If confidence is low, ask one precise question
3. If impact is high, require explicit confirmation even when confidence is medium
4. Log the decision so you can tune the gate later

## Example Prompt for a Gate

"I can proceed, but I need one detail: which workspace should I use for this export?"

## Takeaway

Confidence gates keep speed where it is safe and add friction only where it matters. They reduce mistakes without slowing everyday runs.
