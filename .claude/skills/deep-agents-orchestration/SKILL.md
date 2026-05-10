---
name: deep-agents-orchestration
description: "INVOKE THIS SKILL when using subagents, task planning, or human approval in Deep Agents. Covers SubAgentMiddleware, TodoList for planning, and HITL interrupts."
---

<overview>
Deep Agents include three orchestration capabilities:

1. **SubAgentMiddleware**: Delegate work via `task` tool to specialized agents
2. **TodoListMiddleware**: Plan and track tasks via `write_todos` tool
3. **HumanInTheLoopMiddleware**: Require approval before sensitive operations

All three are automatically included in `createDeepAgent()`.
</overview>

---

## Subagents (Task Delegation)

<when-to-use-subagents>

| Use Subagents When | Use Main Agent When |
|-------------------|-------------------|
| Task needs specialized tools | General-purpose tools sufficient |
| Want to isolate complex work | Single-step operation |
| Need clean context for main agent | Context bloat acceptable |

</when-to-use-subagents>

**Default subagent**: "general-purpose" — automatically available with same tools/config as main agent.

<ex-custom-subagents>
<typescript>
Create a custom "researcher" subagent with specialized tools for academic paper search.
```typescript
import { createDeepAgent } from "deepagents";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

const searchPapers = tool(
  async ({ query }) => `Found 10 papers about ${query}`,
  { name: "search_papers", description: "Search papers", schema: z.object({ query: z.string() }) }
);

const agent = await createDeepAgent({
  subagents: [
    {
      name: "researcher",
      description: "Conduct web research and compile findings",
      systemPrompt: "Search thoroughly, return concise summary",
      tools: [searchPapers],
    }
  ]
});

// Main agent delegates: task(agent="researcher", instruction="Research AI trends")
```
</typescript>
</ex-custom-subagents>

<fix-subagents-are-stateless>
Subagents are stateless — provide complete instructions in a single call.
```typescript
// WRONG: Subagents don't remember previous calls
// task research: Find data
// task research: What did you find?  // Starts fresh!

// CORRECT: Complete instructions upfront
// task research: Find data on AI, save to /research/, return summary
```
</fix-subagents-are-stateless>

<fix-custom-subagents-dont-inherit-skills>
Custom subagents don't inherit skills from the main agent.
```typescript
// WRONG: Custom subagent won't have main agent's skills
const agent = await createDeepAgent({
  skills: ["/main-skills/"],
  subagents: [{ name: "helper", ... }]  // No skills inherited
});

// CORRECT: Provide skills explicitly (general-purpose subagent DOES inherit)
const agent = await createDeepAgent({
  skills: ["/main-skills/"],
  subagents: [{ name: "helper", skills: ["/helper-skills/"], ... }]
});
```
</fix-custom-subagents-dont-inherit-skills>

---

## TodoList (Task Planning)

<ex-todolist-usage>
<typescript>
Invoke an agent that automatically creates a todo list for a multi-step task.
```typescript
import { createDeepAgent } from "deepagents";

const agent = await createDeepAgent();  // TodoListMiddleware included

const result = await agent.invoke({
  messages: [{ role: "user", content: "Create a REST API: design models, implement CRUD, add auth, write tests" }]
}, { configurable: { thread_id: "session-1" } });
```
</typescript>
</ex-todolist-usage>

<fix-todolist-requires-thread-id>
Todo list state requires a thread_id for persistence across invocations.
```typescript
// WRONG: Fresh state each time without thread_id
agent.invoke({ messages: [...] });

// CORRECT
const config = { configurable: { thread_id: "user-session" } };
agent.invoke({ messages: [...] }, config);
```
</fix-todolist-requires-thread-id>

---

## Human-in-the-Loop (Approval Workflows)

<ex-hitl-setup>
<typescript>
Configure which tools require human approval before execution.
```typescript
import { createDeepAgent } from "deepagents";
import { MemorySaver } from "@langchain/langgraph";

const agent = await createDeepAgent({
  interruptOn: {
    write_file: true,
    execute_sql: { allowedDecisions: ["approve", "reject"] },
    read_file: false,  // No interrupts
  },
  checkpointer: new MemorySaver()  // REQUIRED
});
```
</typescript>
</ex-hitl-setup>

<ex-approval-workflow>
<typescript>
Complete workflow: trigger an interrupt, check state, approve action, and resume execution.
```typescript
import { createDeepAgent } from "deepagents";
import { MemorySaver, Command } from "@langchain/langgraph";

const agent = await createDeepAgent({
  interruptOn: { write_file: true },
  checkpointer: new MemorySaver()
});

const config = { configurable: { thread_id: "session-1" } };

// Step 1: Agent proposes write_file — execution pauses
let result = await agent.invoke({
  messages: [{ role: "user", content: "Write config to /prod.yaml" }]
}, config);

// Step 2: Check for interrupts
const state = await agent.getState(config);
if (state.next) console.log("Pending action");

// Step 3: Approve and resume
result = await agent.invoke(
  new Command({ resume: { decisions: [{ type: "approve" }] } }), config
);
```
</typescript>
</ex-approval-workflow>

<fix-checkpointer-required>
Checkpointer is required when using interruptOn for HITL workflows.
```typescript
// WRONG
const agent = await createDeepAgent({ interruptOn: { write_file: true } });

// CORRECT
const agent = await createDeepAgent({ interruptOn: { write_file: true }, checkpointer: new MemorySaver() });
```
</fix-checkpointer-required>

<fix-thread-id-required-for-resumption>
A consistent thread_id is required to resume interrupted workflows.
```typescript
// CORRECT
const config = { configurable: { thread_id: "session-1" } };
await agent.invoke({ ... }, config);
await agent.invoke(new Command({ resume: { decisions: [{ type: "approve" }] } }), config);
```
</fix-thread-id-required-for-resumption>

<boundaries>
### What Agents CANNOT Configure

- Tool names (`task`, `write_todos`)
- HITL protocol (approve/edit/reject structure)
- Skip checkpointer requirement for interrupts
- Make subagents stateful (they're ephemeral)
</boundaries>
