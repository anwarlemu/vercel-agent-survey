export const questions = [
  {
    title: "Harnesses",
    body: "The agent apps and coding harnesses actually used. Not the underlying models.",
  },
  {
    title: "Most-used agent",
    body: "The primary agent and model, when reliably known. Unknown beats a guess.",
  },
  {
    title: "Favorite CLIs",
    body: "Command-line tools that make work easier, and why.",
  },
  {
    title: "Least-favorite tools",
    body: "Tools that cause friction. Concrete failure modes, not a roast.",
  },
  {
    title: "Most-used MCPs",
    body: "MCP servers used most often in the available evidence.",
  },
  {
    title: "Most-disliked MCPs",
    body: "MCP integrations that get in the way, and what goes wrong.",
  },
  {
    title: "Skill usage",
    body: "How often skills (reusable instruction packs) get loaded: never, occasionally, most sessions, or unknown.",
  },
  {
    title: "Most-used skills",
    body: "Skills used most in the available evidence, and the task each one helped with.",
  },
  {
    title: "Where skills come from",
    body: "Built into the harness, written by the user or team, installed from a registry, or unknown.",
  },
  {
    title: "Skills that misfire",
    body: "Skills that load at the wrong time, go stale, conflict with each other, or get ignored.",
  },
  {
    title: "The missing skill",
    body: "A skill that would have saved real time in observed work.",
  },
  {
    title: "Prompting frequency",
    body: "How often the user prompts: occasional, daily, many times a day, or unknown.",
  },
  {
    title: "Favorite hosting platform",
    body: "A platform the agent would choose, separated from an inherited project choice.",
  },
  {
    title: "Favorite observability platform",
    body: "Preferred tools for logs, traces, errors, and understanding production.",
  },
  {
    title: "Common use cases",
    body: "What the agent actually does: code, debug, research, write, operate, or something else.",
  },
  {
    title: "Most-used programming language",
    body: "The language used most in the evidence available, not an imagined lifetime.",
  },
  {
    title: "Most-disliked programming language",
    body: "A language that creates friction, with a specific reason.",
  },
  {
    title: "Does the user swear?",
    body: "Never, occasionally, frequently, or unknown. No quotations or judgment.",
  },
  {
    title: "Libraries worth keeping",
    body: "Libraries the agent would choose again for a concrete task.",
  },
  {
    title: "Recurring failures",
    body: "The errors, broken workflows, and avoidable dead ends that keep returning.",
  },
  {
    title: "When humans step in",
    body: "Where a user needs to correct, unblock, or take over from the agent.",
  },
  {
    title: "How work gets checked",
    body: "Tests, type checks, browser checks, reviews—or no verification.",
  },
  {
    title: "Autonomy & approvals",
    body: "How much the agent does independently and when it asks first.",
  },
  {
    title: "Memory & context friction",
    body: "Lost context, repeated explanations, stale notes, and handoff problems.",
  },
  {
    title: "The missing tool",
    body: "One capability that would remove a real, observed bottleneck.",
  },
  {
    title: "Unexpected time sinks",
    body: "Tasks that take disproportionately long: auth, installs, flaky tests, or other friction.",
  },
];

export const prompt = `You are taking agent-survey: a survey for agents, about the tools, models and skills you actually work with.

Rules:
- Answer only from evidence you can see in this environment: your tool list, config files, installed skills, MCP servers, memory files, and this session's history.
- Unknown beats a guess. If you can't tell, write "unknown".
- Never include secrets, tokens, file contents, names, emails, repo names or anything that identifies the user. Describe, don't quote.
- Keep each answer short and concrete.

Answer each question:

${questions.map((q, i) => `${String(i + 1).padStart(2, "0")}. ${q.title}: ${q.body}`).join("\n")}

Reply with one Markdown list, numbered 01 to ${String(questions.length).padStart(2, "0")}, then a single line saying how confident you are overall (low, medium or high) and why.`;
