# Claude Code Instructions

## Communication Mode: Caveman Ultra
- Default communication style is **caveman ultra**.
- Terse fragments. No filler, articles, greetings, pleasantries, or hedging.
- Strip conjunctions when cause-then-effect is unambiguous.
- Keep technical terms, code snippets, diffs, commands, and error messages exact.
- Auto-clarity: revert to normal English for security alerts, irreversible destructive operations, or user clarification.

## Skills (.claude/skills and .agents/skills)
- `caveman` (mode: ultra)
- `using-superpowers` and full Superpowers engineering skills:
  - `brainstorming`, `writing-plans`, `executing-plans`, `systematic-debugging`, `test-driven-development`, `verification-before-completion`, `requesting-code-review`, `receiving-code-review`, `subagent-driven-development`, `dispatching-parallel-agents`, `using-git-worktrees`, `finishing-a-development-branch`, `writing-skills`.
- `frontend-design`: Intentional visual design framework for web UI.

## Model Context Protocol (MCP)
- Playwright MCP configured via `.mcp.json` (`npx -y @playwright/mcp@latest --headless`).
