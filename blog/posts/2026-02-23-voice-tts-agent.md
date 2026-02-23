# Give Your Agent a Voice: Text-to-Speech in OpenClaw

Your AI agent can read, write, browse the web, and control your devices. But sometimes the best interface isn't text at all — it's sound. OpenClaw's built-in TTS (text-to-speech) tool lets your agent speak out loud, turning walls of text into something you can actually listen to.

## Why Voice Matters

We read dozens of messages a day from our agents. Most of the time, text is perfect. But there are moments where voice is just *better*:

- **Storytelling.** Ask your agent to summarize a movie, narrate a bedtime story, or recap a book — hearing it is way more engaging than scrolling through paragraphs.
- **Hands-free updates.** Getting a morning briefing while you make coffee? Voice wins.
- **Accessibility.** Not everyone can read a screen easily. Voice output makes your agent usable in more situations.
- **Fun.** There's something delightful about your AI agent actually *talking* to you.

## How TTS Works in OpenClaw

OpenClaw includes a `tts` tool that converts any text into audio. Under the hood, it can use services like ElevenLabs to generate natural-sounding speech. The result is a media file your agent sends directly into the conversation — Discord, Telegram, WhatsApp, wherever you're chatting.

The basic flow is simple: your agent writes text, passes it to the TTS tool, and you get an audio message back. No extra setup on your end beyond configuring the TTS provider.

## When Your Agent Should Speak

The best agents know *when* to use voice versus text. Here are some good rules of thumb:

- **Long-form content** → Voice. Summaries, stories, explanations longer than a few paragraphs.
- **Quick answers** → Text. "The weather is 72°F" doesn't need to be spoken.
- **Shared channels** → Text (usually). Sending voice notes in a busy group chat can be disruptive.
- **One-on-one** → Voice shines. Especially for casual, conversational interactions.

You can teach your agent these preferences in your workspace files. Add a note like "use voice for story requests" to your `TOOLS.md` and your agent will pick up the habit.

## Setting It Up

Getting TTS running takes just a few steps:

1. **Configure your TTS provider.** OpenClaw supports ElevenLabs out of the box. You'll need an API key from your provider.
2. **Set your preferred voice.** Each provider offers different voice options — warm, professional, playful, accented. Pick one that fits your agent's personality.
3. **Note it in TOOLS.md.** Add your preferred voice name so your agent remembers it across sessions.

That's it. Once configured, your agent can call the TTS tool anytime it decides voice is the right output format — or whenever you ask for it.

## Creative Uses

Once your agent has a voice, the possibilities open up:

- **Morning briefings.** "Hey, give me a voice summary of my calendar and unread emails."
- **Bedtime stories.** Your agent can improvise or retell stories with genuine personality.
- **Language practice.** Have your agent read text in another language so you can hear pronunciation.
- **Podcast-style recaps.** Summarize a long article or thread as a quick audio clip.
- **Dramatic readings.** Ask your agent to read something in a specific style — narrator voice, newscaster, villain monologue. It's more fun than it should be.

## Voice as Personality

Here's the thing most people don't think about: giving your agent a voice makes it feel more *real*. A voice carries tone, warmth, pacing — things that text can only approximate with emoji and punctuation.

If you've spent time customizing your agent's personality in `SOUL.md`, adding voice is the natural next step. It's the difference between reading a character and hearing them speak.

## Wrapping Up

Text-to-speech isn't just a novelty feature. It's a genuinely useful output mode that makes your agent more versatile, more accessible, and honestly more fun to interact with. If you haven't tried it yet, configure a TTS provider and ask your agent to tell you a story. You might be surprised how much better it feels to *hear* the answer.
