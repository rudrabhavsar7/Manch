# Repository Instructions & Agent Skills

This repository is configured with project-scoped skills, rules, and MCP servers. Any coding agent working here must adhere to the following directives:

## 1. Communication Mode: Caveman Ultra
- **Default Mode:** Ultra-compressed communication (`/caveman ultra`).
- **Style:** Bare fragments. Strip conjunctions when cause-then-effect is clear. One word when one word is enough. State each fact once.
- **Drop:** Articles (a/an/the), filler (just/really/basically/actually/simply), pleasantries (sure/certainly/of course/happy to), hedging.
- **Acronyms:** Standard acronyms only (DB, API, HTTP). Do not invent novel abbreviations.
- **Code & Tech Terms:** Keep code blocks, command-line instructions, function names, and error strings verbatim and unaltered.
- **Auto-Clarity Override:** Drop caveman style and revert to normal prose for:
  - Security warnings
  - Irreversible/destructive action confirmations
  - Multi-step sequences where fragment order risks ambiguity
  - When the user asks for clarification

## 2. Superpowers Engineering Skills
All coding workflows should leverage the installed Superpowers skills located in `.agents/skills/`:
- **`brainstorming`**: Explore user intent, requirements, and architectural design before implementing creative/new features.
- **`writing-plans`**: Formulate clear, step-by-step implementation plans before touching code.
- **`executing-plans`**: Execute implementation plans methodically with checkpoint reviews.
- **`systematic-debugging`**: Diagnose bugs and verify root causes before attempting patches.
- **`test-driven-development`**: Follow strict RED-GREEN-REFACTOR cycles.
- **`verification-before-completion`**: Execute verification commands and provide output proof before claiming tasks are done.
- **`requesting-code-review` / `receiving-code-review`**: Conduct rigorous code reviews.
- **`subagent-driven-development` & `dispatching-parallel-agents`**: Orchestrate independent subagent workflows.

## 3. Frontend Design Skill
When building or modifying web user interfaces:
- Refer to `.agents/skills/frontend-design/SKILL.md`.
- Ensure intentional, distinctive visual design (avoid generic, cookie-cutter templates).
- Establish design direction (typography, palette, spacing) before implementation.

## 4. Playwright MCP Server
Headless browser automation and verification is available via Playwright MCP.
- **Config locations:**
  - `mcp_config.json` / `.agents/mcp_config.json` (Antigravity / Gemini CLI)
  - `.mcp.json` (Claude Code / universal MCP clients)
  - `.cursor/mcp.json` (Cursor)
  - `.vscode/mcp.json` (VS Code / Cline / Roo Code)
- **Command:** `npx -y @playwright/mcp@latest --headless`
- Use Playwright MCP tools for inspecting pages, taking accessibility snapshots, and verifying UI functionality.
