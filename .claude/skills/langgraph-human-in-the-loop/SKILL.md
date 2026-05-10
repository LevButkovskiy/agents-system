---
name: langgraph-human-in-the-loop
description: "INVOKE THIS SKILL when implementing human-in-the-loop patterns, pausing for approval, or handling errors in LangGraph. Covers interrupt(), Command(resume=...), approval/validation workflows, and the 4-tier error handling strategy."
---

<overview>
LangGraph's human-in-the-loop patterns let you pause graph execution, surface data to users, and resume with their input:

- **`interrupt(value)`** — pauses execution, surfaces a value to the caller
- **`Command(resume=value)`** — resumes execution, providing the value back to `interrupt()`
- **Checkpointer** — required to save state while paused
- **Thread ID** — required to identify which paused execution to resume
</overview>

---

## Requirements

Three things are required for interrupts to work:

1. **Checkpointer** — compile with `checkpointer: new MemorySaver()` (dev) or `PostgresSaver` (prod)
2. **Thread ID** — pass `{ configurable: { thread_id: "..." } }` to every `invoke`/`stream` call
3. **JSON-serializable payload** — the value passed to `interrupt()` must be JSON-serializable

---

## Basic Interrupt + Resume

**Critical**: when the graph resumes, the node restarts from the **beginning** — all code before `interrupt()` re-runs.

<ex-basic-interrupt-resume>
<typescript>
Pause execution for human review and resume with Command.
```typescript
import { interrupt, Command, MemorySaver, StateGraph, StateSchema, START, END } from "@langchain/langgraph";
import { z } from "zod";

const State = new StateSchema({
  approved: z.boolean().default(false),
});

const approvalNode = async (state: typeof State.State) => {
  const approved = interrupt("Do you approve this action?");
  return { approved };
};

const checkpointer = new MemorySaver();
const graph = new StateGraph(State)
  .addNode("approval", approvalNode)
  .addEdge(START, "approval")
  .addEdge("approval", END)
  .compile({ checkpointer });

const config = { configurable: { thread_id: "thread-1" } };

// Initial run — hits interrupt and pauses
let result = await graph.invoke({ approved: false }, config);
console.log(result.__interrupt__);
// [{ value: 'Do you approve this action?', ... }]

// Resume with the human's response
result = await graph.invoke(new Command({ resume: true }), config);
console.log(result.approved);  // true
```
</typescript>
</ex-basic-interrupt-resume>

---

## Approval Workflow

<ex-approval-workflow>
<typescript>
Interrupt for human review, then route to send or end based on the decision.
```typescript
import { interrupt, Command, END, GraphNode } from "@langchain/langgraph";

const humanReview: GraphNode<typeof EmailAgentState> = async (state) => {
  // interrupt() must come first — any code before it will re-run on resume
  const humanDecision = interrupt({
    emailId: state.emailContent,
    draftResponse: state.responseText,
    action: "Please review and approve/edit this response",
  });

  if (humanDecision.approved) {
    return new Command({
      update: { responseText: humanDecision.editedResponse || state.responseText },
      goto: "sendReply",
    });
  } else {
    return new Command({ update: {}, goto: END });
  }
};
```
</typescript>
</ex-approval-workflow>

---

## Validation Loop

<ex-validation-loop>
<typescript>
Validate human input in a loop, re-prompting until valid.
```typescript
import { interrupt } from "@langchain/langgraph";

const getAgeNode = (state: typeof State.State) => {
  let prompt = "What is your age?";

  while (true) {
    const answer = interrupt(prompt);

    if (typeof answer === "number" && answer > 0) {
      return { age: answer };
    } else {
      prompt = `'${answer}' is not a valid age. Please enter a positive number.`;
    }
  }
};
```
</typescript>
</ex-validation-loop>

---

## Multiple Interrupts (Parallel Branches)

<ex-multiple-interrupts>
<typescript>
Resume multiple parallel interrupts by mapping interrupt IDs to values.
```typescript
import { Command, isInterrupted, INTERRUPT } from "@langchain/langgraph";

const interruptedResult = await graph.invoke({ vals: [] }, config);

const resumeMap: Record<string, string> = {};
if (isInterrupted(interruptedResult)) {
  for (const i of interruptedResult[INTERRUPT]) {
    if (i.id != null) {
      resumeMap[i.id] = `answer for ${i.value}`;
    }
  }
}
const result = await graph.invoke(new Command({ resume: resumeMap }), config);
```
</typescript>
</ex-multiple-interrupts>

---

## Side Effects Before Interrupt Must Be Idempotent

When the graph resumes, the node restarts from the **beginning** — ALL code before `interrupt()` re-runs.

```typescript
// GOOD: Upsert is idempotent — safe before interrupt
const nodeA = async (state: typeof State.State) => {
  await db.upsertUser({ userId: state.userId, status: "pending_approval" });
  const approved = interrupt("Approve this change?");
  return { approved };
};

// GOOD: Side effect AFTER interrupt — only runs once
const nodeA = async (state: typeof State.State) => {
  const approved = interrupt("Approve this change?");
  if (approved) {
    await db.createAuditLog({ userId: state.userId, action: "approved" });
  }
  return { approved };
};

// BAD: Insert creates duplicates on each resume!
const nodeA = async (state: typeof State.State) => {
  await db.createAuditLog({ ... });  // Runs again on resume!
  const approved = interrupt("Approve this change?");
  return { approved };
};
```

---

## Fixes

<fix-checkpointer-required-for-interrupts>
```typescript
// WRONG
const graph = builder.compile();

// CORRECT
const graph = builder.compile({ checkpointer: new MemorySaver() });
```
</fix-checkpointer-required-for-interrupts>

<fix-resume-with-command>
Use Command to resume from an interrupt (regular object restarts graph).
```typescript
// WRONG
await graph.invoke({ resumeData: "approve" }, config);

// CORRECT
await graph.invoke(new Command({ resume: "approve" }), config);
```
</fix-resume-with-command>

<boundaries>
### What You Should NOT Do

- Use interrupts without a checkpointer — will fail
- Resume without the same thread_id — creates a new thread instead of resuming
- Pass `Command({ update: ... })` as invoke input — graph appears stuck (use plain dict)
- Perform non-idempotent side effects before `interrupt()` — creates duplicates on resume
- Assume code before `interrupt()` only runs once — it re-runs every resume
</boundaries>
