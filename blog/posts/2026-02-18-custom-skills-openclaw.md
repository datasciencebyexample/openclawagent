# Custom Skills in OpenClaw: Teach Your Agent New Tricks

OpenClaw comes with built-in skills for things like weather, GitHub, and Discord. But the real power comes when you create your own. A custom skill lets you give your agent step-by-step instructions for any workflow you care about, from publishing blog posts to managing deployments.

This post walks through what a skill is, how to create one, and how to load it into your agent.

## What is a skill?

A skill is a folder containing a `SKILL.md` file. That file tells your agent what the skill does and how to use it. Think of it as a recipe card: when the agent sees a task that matches the skill description, it reads the file and follows the instructions.

Skills can be bundled with OpenClaw, installed from ClawHub, or created by you in any directory on your machine.

## Anatomy of a skill

A minimal skill looks like this:

```
my-skills/
  my-cool-skill/
    SKILL.md
```

The `SKILL.md` file has two parts: frontmatter and instructions.

```markdown
---
name: my-cool-skill
description: Does something cool when asked.
---

# My Cool Skill

## Steps

1. Do the first thing.
2. Then do the second thing.
3. Ask the user before doing the third thing.
```

The `name` field identifies the skill. The `description` field is what the agent uses to decide whether this skill is relevant to a task. Make it specific and practical.

## Writing good instructions

The body of `SKILL.md` is plain Markdown. Write it the way you would explain a process to a capable colleague. A few tips:

- **Be specific.** Instead of "update the config," say "add an entry to `config/settings.json` with the fields `name` and `version`."
- **Use sections.** Break the workflow into clear phases like Research, Draft, Review, and Publish.
- **Say when to ask.** If a step needs confirmation, write "ask the user before proceeding." The agent will follow that.
- **Include examples.** Show file paths, JSON shapes, or command snippets so the agent does not have to guess.

## Loading your skill into OpenClaw

Once your skill folder exists, you need to tell OpenClaw where to find it. Add the parent directory to `skills.load.extraDirs` in your OpenClaw config:

```json
{
  "skills": {
    "load": {
      "extraDirs": ["/path/to/my-skills"]
    }
  }
}
```

After a gateway restart, OpenClaw scans that directory and picks up any skill folders inside it. With file watching enabled (the default), changes to your `SKILL.md` are picked up automatically on the next agent turn.

You can also ask your agent to patch the config for you. Just tell it the path and it will handle the rest.

## Per-skill configuration

If your skill needs environment variables or an API key, you can configure those under `skills.entries` in the config:

```json
{
  "skills": {
    "entries": {
      "my-cool-skill": {
        "enabled": true,
        "env": {
          "MY_API_KEY": "your-key-here"
        }
      }
    }
  }
}
```

You can also disable a skill without removing it by setting `enabled` to `false`.

## A real example

Say you maintain a blog and want your agent to handle the full workflow: research a topic, draft a post, update metadata, and push to deploy. You would create a skill like this:

```
blog-skills/
  blog-writer/
    SKILL.md
```

Your `SKILL.md` would describe the repo location, file naming conventions, the JSON metadata format, and the git workflow. The agent reads it once and follows it every time you say "write a blog post."

No plugins to install. No code to write. Just a Markdown file that describes how you want things done.

## Where to go from here

- Browse community skills on ClawHub at clawhub.com.
- Look at the built-in skills in your OpenClaw installation for more examples.
- Start small. A single `SKILL.md` with five clear steps is more useful than an elaborate framework.

Custom skills turn your agent from a general assistant into one that knows your specific workflows. The best part is that they are just text files, so you can version them, share them, and improve them over time.
