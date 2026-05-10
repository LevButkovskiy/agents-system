---
name: deep-agents-core
description: "INVOKE THIS SKILL when using the Deep Agents framework (deepagents package). Covers create_deep_agent / createDeepAgent, built-in middleware, backends, skills system, and critical configuration constraints."
---

<overview>
Deep Agents is an opinionated framework built on LangChain/LangGraph featuring built-in middleware for task planning, context management, task delegation, long-term memory, human-in-the-loop workflows, and on-demand skill loading.

**Core Middleware (always included):**
- `TodoListMiddleware` → `write_todos` tool for task breakdown
- `FilesystemMiddleware` → `ls`, `read_file`, `write_file`, `edit_file`, `glob`, `grep`
- `SubAgentMiddleware` → `task` tool for subagent delegation

**Optional Middleware:**
- `MemoryMiddleware` for persistent storage
- `HumanInTheLoopMiddleware` for approval workflows
- `SkillsMiddleware` for specialized capabilities
</overview>

---

## When to Use Deep Agents

Use Deep Agents for:
- Multi-step tasks requiring planning
- Large contexts needing file management
- Applications with specialized subagents
- Persistent memory across sessions

For simple single-purpose tasks with context fitting in one prompt, use standard LangChain agents.

---

## Configuration

<ex-filesystem-backend-with-skills>
<typescript>
```typescript
import { createDeepAgent, FilesystemBackend } from "deepagents";
import { MemorySaver } from "@langchain/langgraph";

const agent = await createDeepAgent({
  backend: new FilesystemBackend({ rootDir: ".", virtualMode: true }),
  skills: ["./skills/"],
  checkpointer: new MemorySaver()
});
```
</typescript>
</ex-filesystem-backend-with-skills>

<ex-store-backend>
<typescript>
```typescript
import { createDeepAgent, StoreBackend } from "deepagents";
import { InMemoryStore } from "@langchain/langgraph";

const store = new InMemoryStore();

const agent = await createDeepAgent({
  backend: (rt) => new StoreBackend(rt),
  store,
  skills: ["/skills/"]
});
```
</typescript>
</ex-store-backend>

---

## Critical Requirements

- **Interrupts require checkpointer:** `interruptOn` needs `new MemorySaver()` or equivalent
- **Store backend requires Store instance:** Don't configure without `new InMemoryStore()` or similar
- **Maintain thread_id:** Use consistent `configurable: { thread_id: "..." }` for conversation context
- **SKILL.md frontmatter mandatory:** All skill files require YAML header with `name` and `description`
- **Backend needed for skills:** `FilesystemBackend` or `StoreBackend` required for skill loading
- **Subagents don't inherit skills:** Explicitly provide skill directories to custom subagents

---

## Configuration Boundaries

**Agents CAN customize:**
- Model selection and parameters
- Custom tools
- System prompts
- Backend storage
- Tool approval settings
- Specialized subagents

**Agents CANNOT modify:**
- Core middleware (TodoList, Filesystem, SubAgent always present)
- Built-in tool names (`write_todos`, `task`, filesystem operations)
- SKILL.md frontmatter format

---

## Skills System

Skills use progressive disclosure — agents only load content when relevant. Each skill requires a `SKILL.md` file with YAML frontmatter:

```yaml
---
name: skill-identifier
description: Clear description (max 1024 chars) — agents match based on this alone
---
```

Skills load on-demand unlike static `AGENTS.md` memory files.
