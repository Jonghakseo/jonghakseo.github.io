---
title: "A Craftsman Doesn't Blame Tools. They Build Them."
description: "A journey through coding agents, and the story of building my own tools with pi over one week."
publishDate: "2026-03-03"
tags: ["pi", "coding-agent", "developer-tools", "productivity"]
lang: "en"
translationQuality: "draft"
---

At the end of the retrospective I wrote yesterday, I briefly mentioned the pi agent. After publishing it, I realized this deserved its own dedicated post. As someone who's been using coding agents for a long time — and quite extensively — the week I spent with pi felt like a genuinely meaningful experience.

So let me cut to the chase: this is a chronicle of my journey through coding agents, and the story of how I finally got "my own tool."

---

## Grievances of a Coding Agent Power User

I've tried pretty much every notable coding agent out there — from Claude Code version 1.0, to Codex, Conductor, Amp, OpenCode, and Oh-My-OpenCode. As a team lead, I spend more time reviewing, designing, and setting direction than writing code myself. Coding agents have become a critical pillar of my productivity. (It's been about a month or two since I stopped writing code directly.)

Yet something always felt off. Like driving a car that runs great but has an uncomfortable steering wheel, or an engine that's powerful but seats that don't fit. Even while using someone else's "great tool," I never had the feeling that it was *my* tool.

Let me break down what I felt with each one.

### Claude Code

It's a good car. It drives well. But it always felt more like driver-assist than autonomous driving. A car where you can't take your hands off the wheel.

The biggest frustration was the narrow context window. The recent 1M token expansion partially opened things up, but in practice, once you go past 200K, latency spikes noticeably or performance degrades — you can feel it. When working on complex tasks, the context the agent needs to know quickly overflows, and I hit that wall far too often. It has sub-agents, agent teams, hooks, and skills. Feature-wise, it has everything. But control over sub-agents isn't explicit enough, and orchestrating things the way I wanted always fell just one step short.

That feeling of having everything yet still being left wanting. Too well-made to blame, too ill-fitting to be satisfied with.

### Codex

The intelligence and task execution capability of GPT 5.3 Codex is honestly impressive. The built-in review feature is powerful too. In domains where you can push through with raw model power, it felt best-in-class.

But it has no hooks. This is actually the most critical issue. Not being able to insert your own logic before and after the agent's actions means you can't complement the non-deterministic behavior of LLMs with the deterministic behavior of static tools. Our team already had an established hook-based workflow system, too. It's like a great off-the-rack suit where you can't shorten the sleeves. The model power is so good that I still use it alongside other tools, but there were always lingering frustrations that kept it from being my main tool.

### Gemini CLI

Do I even need to say anything? Even Google employees probably don't use it. Every now and then I try something, only to mutter "of course" and hit Ctrl+C.

### Conductor

You can run Claude Code and Codex in the same GUI, and the git worktree-based project management makes for good usability. Convenience features like GitHub integration keep getting added, though I'm not sure they're all that necessary... Still, my productivity definitely improved after adopting Conductor.

But there were structural problems. You can't swap between CC and Codex models per session, and since running CC in headless mode is the default, each turn triggers a session start and shutdown — a critical issue. The hook lifecycle effectively operates completely differently. On top of that, it gets heavy over time, and the lag became unbearable. It wasn't just me either — my teammates were suffering too.

### OpenCode / Oh-My-OpenCode

OpenCode is... not pretty. This is admittedly a personal reason, but when a tool you look at every day isn't aesthetically pleasing, you don't want to use it. It also had way too many features I didn't need.

Oh-My-OpenCode (OmO) seems like a project with great insights into agent orchestration. But the harness was too rigid. A powerful tool framework means, flip it around, that you have to adapt your work style to the tool.

I wanted the opposite. For the tool to adapt to me.

---

## Meeting pi

I discovered that pi was essentially the core of [openClaw](https://github.com/openclaw/openclaw), and after reading [Armin Ronacher's blog post](https://lucumr.pocoo.org/2026/1/31/pi/), I casually decided to give it a try.

The Philosophy section in pi's README is pretty bold:

> **No MCP.** Build it as an Extension.
> **No sub-agents.** Build your own or install a package.
> **No permission popups.** Run in a container, or build your own.
> **No plan mode.** Write to a file, or build your own.
> **No built-in to-dos.** They confuse the model. Build your own.

Your first reaction might be "What? It has nothing?" I think mine was too.

But this isn't really "No" — it's closer to YAGNI (You Ain't Gonna Need It). Features I don't need cluttering my workflow is a pretty unpleasant experience, and pi removes that unpleasantness by instead giving you the skeleton to build what you actually need.

It took less than two days to go from a taste test to a full buffet.

---

## A Week of Modifications

It's been a week since I started using pi. Every single day of that week, I've been augmenting pi's capabilities and tailoring it to fit me perfectly. I haven't opened any other CLI or tool since.

During regular work, whenever I hit a friction point in my process, I immediately internalize it as a pi capability to streamline things. This cycle is exhilarating.

Discover friction → Implement extension → Apply instantly → Back to work.

This loop runs incredibly fast. Let me walk through what I've built.

### mcp-bridge — If It's Not Officially Supported, Build It

pi doesn't officially support MCP. Its creator Mario Zechner even wrote a post arguing [you might not need MCP](https://mariozechner.at/posts/2025-11-02-what-if-you-dont-need-mcp/).

But I needed it. As I mentioned in my retrospective, I'd already built and was running MCP servers for Jira, Slack, Google, Notion, Figma, and more on our internal AI Platform, and I needed to use them directly from my coding agent. So I built an extension called `mcp-bridge`.

Building it myself actually had advantages. I gained the ability to control things at the middleware level between the MCP server and the agent. Custom truncation logic for overly long responses, permission checks only for specific dangerous tools, hiding certain tool calls or blocking them under specific conditions — all became possible. If it had been official support, this kind of fine-grained control would have been difficult.

### '>>' Context Fork — The Feature I Wanted Most

While using Claude Code, I always had this thought:

*"At this point, I want to fork a new agent with this exact context and explore an idea that's slightly off-topic."*

I implemented it in pi as the `>>` shorthand.

```
>> Is there a different approach we could take?
>> Commit this.
>>? Organize what we're discussing into an HTML doc and open it.
```

Using `>>` immediately spawns a new agent with the current context. Without polluting the main agent's context, I can explore or validate creative ideas that diverge from the topic. Conversely, I can keep the main agent available for conversation at any time while delegating simple commits or code tasks.

No need to open a new session. No need to re-explain the context. Just `>> Commit this.` — one line. This was impossible with any other tool, and it's the feature I'm most satisfied with right now.

I even set up simple symbols after `>>` to extremely simplify and personalize sub-agent selection.

`>>? (Researcher)`, `>># (Planner)`, `>>@ (Browser)` and so on... The convenience is hard to overstate. I was surprised myself that this level of customization was even possible.

![Forking a sub-agent with >> in pi](../craftsman-makes-tools/subagent-fork.png)
*A single `>>` line forks a new agent with the current context*

![Sub-agent running in the background](../craftsman-makes-tools/subagent-running.png)
*While the sub-agent works, the main agent stays free*

### '<>' and '><' — Moving Freely Between Layers

If `>>` is the experience of "spawning a child agent," then `<>` and `><` are about moving freely between that child and its parent.

- `<> <runId>` — *enter* an already-running sub-agent session.
- `><` — *come back up* from a sub-agent to the parent.

Here's what it looks like in practice. You fire off `>> review this PR`. Back in the main agent, you're working on something else — then you decide you want to give the review agent some extra context. `<> <runId>` and you teleport right into that agent's session. Say what you need to say, then `><` to return to main.

Fork as many agents as you want. Drop into any of them whenever you feel like it. Come back up whenever you're done. The agent hierarchy is real, but the boundaries feel naturally open — like switching between browser tabs, except those tabs are thinking agents at different levels of context.

Once this system becomes second nature, something shifts. You're not just "sending agents off and hoping for the best." You can step into any agent, course-correct in real time, and step back out. It turns delegation from an act of faith into something you can actually steer.

![Entering a sub-agent session with <> and returning with ><](../craftsman-makes-tools/subagent-enter.png)
*`<> <runId>` to step into the agent, say what you need, then `><` to come back*

### /github Overlay

After doing code reviews or opening PRs, checking if AI reviews were done or CI had finished meant going to GitHub every time. Open the browser, navigate to the PR page, scroll down...

Tedious. So I built the `/github` command. It pops up as an overlay. The PR status I care about — review status, CI results, merge readiness — is available right inside the terminal. Once I built it, window switching disappeared. This seems trivial but it's significant.

![GitHub PR status overlay inside the terminal](../craftsman-makes-tools/github-overlay.png)
*PR status, CI results, and review comments — all without leaving the terminal*

### Screen Saver

This is one I actually want to show off. Since pi is TUI-based, when you have multiple terminals open and step away briefly, it's hard to remember what each terminal was doing when you come back.

I built a screen saver. After 5 minutes of no input, it displays the session's topic, repo, and branch information on screen. When you return, you can immediately grasp the context. It's a minor feature, but the cognitive load reduction when working with multiple sessions is dramatic.

![Screensaver showing active task names across multiple sessions](../craftsman-makes-tools/screensaver.png)
*After 5 minutes of inactivity, the current task name fills the screen. A lifesaver when running multiple sessions*

### And More

- **Memory Layer** — Gave the agent long-term memory with `remember`, `recall`, and `forget`. Store your coding style, project conventions, and technical decisions so you never have to explain from scratch each session. Claude Code style.
- **to-html Skill** — Instantly convert conversation content or research results into elegantly formatted HTML documents.
- **Subagent System** — Delegate complex tasks to multiple agents for parallel processing.
- **files, todos Extensions** — Took other users' extension code and customized it to my taste.

![Built-in diff viewer](../craftsman-makes-tools/diff-viewer.png)
*A custom-built diff viewer. Check what the sub-agent changed without leaving the terminal*

---

## What "Extensible" Really Means

Many tools claim to be "extensible." But in my experience, extensibility exists on a spectrum.

The level where you can change options (themes, keybindings). The level where you can add features through defined interfaces (MCP servers, VSCode extensions). And the level where you can redefine the tool's behavior itself.

pi's Extension system operates at the third level. It's not just about "adding" features — you can change how the tool fundamentally behaves. You can replace built-in tools, swap the editor, freely arrange UI widgets, and redefine the compaction logic.

```typescript
export default function (pi: ExtensionAPI) {
  pi.registerTool({ name: "deploy", ... });
  pi.registerCommand("stats", { ... });
  pi.on("tool_call", async (event, ctx) => { ... });
}
```

A single TypeScript file handles tools, commands, event handlers, and UI. One `/reload` and your changes are live.

Why does this matter? Because the distance from feeling friction to resolving it becomes extremely short. Need to check GitHub status but don't want to open a browser? Build a `/github` overlay. Use it immediately. Losing context across multiple terminals? Build a screen saver. Use it immediately. Need MCP? Build mcp-bridge. Use it immediately.

That "immediately" is the key. No need to fork the repo, no need to submit a PR, no need to wait for the next release. The thrill I felt last year when automating workflows by building our AI Platform — that same thrill came back, this time from modifying the agent tool itself.

---

## Room for Improvement

I'll be honest — there are shortcomings too. The ecosystem is still small.

I'm using extensions called `files` and `todos` that I found in another user's blog post. Being able to grab them and immediately customize them to my liking is one of pi's strengths, but I wish there were a stronger culture of sharing useful extensions like these.

pi's package system (`pi install npm:...`, `pi install git:...`) is already well-established. The infrastructure for sharing and managing through npm or git is in place. Extensions are trickling in on the Discord community, but I hope this momentum grows. From my experience running open source projects, someone has to start sharing first for an ecosystem to flourish.

---

## Closing Thoughts

It's only been a week, but the time I've spent with pi feels like a period at the end of my coding agent wanderings. Rather than searching for a better tool, it feels like I've moved to the stage of building my own.

The stability of Claude Code, the model power of Codex, the orchestration ideas from Conductor, the agent design insights from OmO — all were meaningful experiences. And it was precisely because of those experiences that I could draw what I truly wanted on pi's blank canvas.

As I wrote in my previous post, I'm someone who enjoys solving any problem with software. No matter how much AI does for you, I'm the kind of person who finds joy in figuring out "how can I orchestrate all these AIs to maximize quality?" pi seems like the tool that lets me pursue that question most directly.

A craftsman doesn't blame the tools. But today's craftsman goes one step further — they build them. And pi is where that building is easiest.

---

I've open-sourced my pi configuration and extensions [here](https://github.com/Jonghakseo/my-pi). Hope it's useful as a reference.
