---
name: langgraph-fundamentals
description: "INVOKE THIS SKILL when writing ANY LangGraph code. Covers StateGraph, state schemas, nodes, edges, Command, Send, invoke, streaming, and error handling."
---

<overview>
LangGraph models agent workflows as **directed graphs**:

- **StateGraph**: Main class for building stateful graphs
- **Nodes**: Functions that perform work and update state
- **Edges**: Define execution order (static or conditional)
- **START/END**: Special nodes marking entry and exit points
- **State with Reducers**: Control how state updates are merged

Graphs must be `compile()`d before execution.
</overview>

<design-methodology>

### Designing a LangGraph application

1. **Map out discrete steps** — sketch a flowchart. Each step becomes a node.
2. **Identify what each step does** — categorize: LLM step, data step, action step, user input step.
3. **Design your state** — shared memory for all nodes. Store raw data, format prompts on-demand inside nodes.
4. **Build your nodes** — implement each step as a function that takes state and returns partial updates.
5. **Wire it together** — connect nodes with edges, add conditional routing, compile with a checkpointer if needed.

</design-methodology>

---

## State Management

<state-update-strategies>

| Need | Solution | Example |
|------|----------|---------|
| Overwrite value | No reducer (default) | Simple fields like counters |
| Append to list | Reducer (concat) | Message history, logs |
| Custom logic | Custom reducer function | Complex merging |

</state-update-strategies>

<ex-state-with-reducer>
<typescript>
Use StateSchema with ReducedValue for accumulating arrays.
```typescript
import { StateSchema, ReducedValue, MessagesValue } from "@langchain/langgraph";
import { z } from "zod";

const State = new StateSchema({
  name: z.string(),  // Default: overwrites
  messages: MessagesValue,  // Built-in for messages
  items: new ReducedValue(
    z.array(z.string()).default(() => []),
    { reducer: (current, update) => current.concat(update) }
  ),
});
```
</typescript>
</ex-state-with-reducer>

<fix-forgot-reducer-for-list>
Without ReducedValue, arrays are overwritten not appended.
```typescript
// WRONG: Array will be overwritten
const State = new StateSchema({ items: z.array(z.string()) });

// CORRECT: Use ReducedValue
const State = new StateSchema({
  items: new ReducedValue(
    z.array(z.string()).default(() => []),
    { reducer: (current, update) => current.concat(update) }
  ),
});
```
</fix-forgot-reducer-for-list>

---

## Nodes

```typescript
import { GraphNode, StateSchema } from "@langchain/langgraph";

const plainNode: GraphNode<typeof State> = (state) => {
  return { results: "done" };
};

const nodeWithConfig: GraphNode<typeof State> = (state, config) => {
  const threadId = config?.configurable?.thread_id;
  return { results: `Thread: ${threadId}` };
};
```

---

## Edges

| Need | Edge Type | When to Use |
|------|-----------|-------------|
| Always go to same node | `addEdge()` | Fixed, deterministic flow |
| Route based on state | `addConditionalEdges()` | Dynamic branching |
| Update state AND route | `Command` | Combine logic in single node |
| Fan-out to multiple nodes | `Send` | Parallel processing |

<ex-basic-graph>
<typescript>
Simple two-node graph with linear edges.
```typescript
import { StateGraph, StateSchema, START, END } from "@langchain/langgraph";
import { z } from "zod";

const State = new StateSchema({
  input: z.string(),
  output: z.string().default(""),
});

const graph = new StateGraph(State)
  .addNode("process", async (state) => ({ output: `Processed: ${state.input}` }))
  .addNode("finalize", async (state) => ({ output: state.output.toUpperCase() }))
  .addEdge(START, "process")
  .addEdge("process", "finalize")
  .addEdge("finalize", END)
  .compile();

const result = await graph.invoke({ input: "hello" });
console.log(result.output);  // "PROCESSED: HELLO"
```
</typescript>
</ex-basic-graph>

<ex-conditional-edges>
<typescript>
addConditionalEdges routes based on function return value.
```typescript
const graph = new StateGraph(State)
  .addNode("classify", async (state) => ({
    route: state.query.toLowerCase().includes("weather") ? "weather" : "general"
  }))
  .addNode("weather", async () => ({ result: "Sunny, 72F" }))
  .addNode("general", async () => ({ result: "General response" }))
  .addEdge(START, "classify")
  .addConditionalEdges("classify", (state) => state.route, ["weather", "general"])
  .addEdge("weather", END)
  .addEdge("general", END)
  .compile();
```
</typescript>
</ex-conditional-edges>

---

## Command

Command combines state updates and routing in a single return value.

```typescript
import { Command } from "@langchain/langgraph";

const nodeA = async (state: typeof State.State) => {
  const newCount = state.count + 1;
  if (newCount > 5) {
    return new Command({ update: { count: newCount }, goto: "node_c" });
  }
  return new Command({ update: { count: newCount }, goto: "node_b" });
};

// Pass { ends } to declare valid goto destinations
builder.addNode("node_a", nodeA, { ends: ["node_b", "node_c"] });
```

> **Warning**: `Command` only adds dynamic edges — static edges defined with `addEdge` still execute too.

---

## Send API (Fan-out)

```typescript
import { Send } from "@langchain/langgraph";

const orchestrator = (state: typeof State.State) => {
  return state.tasks.map((task) => new Send("worker", { task }));
};

// Results field MUST have a reducer to accumulate parallel worker outputs
const State = new StateSchema({
  tasks: z.array(z.string()),
  results: new ReducedValue(
    z.array(z.string()).default(() => []),
    { reducer: (curr, upd) => curr.concat(upd) }
  ),
});
```

---

## Running Graphs

```typescript
// Invoke (returns final state)
const result = await graph.invoke({ input: "hello" });
const result = await graph.invoke({ input: "hello" }, { configurable: { thread_id: "1" } });

// Stream LLM tokens
for await (const chunk of graph.stream(
  { messages: [new HumanMessage("Hello")] },
  { streamMode: "messages" }
)) {
  const [token, metadata] = chunk;
  if (token.content) process.stdout.write(token.content);
}
```

---

## Error Handling

| Error Type | Who Fixes | Strategy |
|---|---|---|
| Transient (network, rate limits) | System | `retryPolicy: { maxAttempts: 3 }` |
| LLM-recoverable (tool failures) | LLM | `ToolNode(tools, { handleToolErrors: true })` |
| User-fixable (missing info) | Human | `interrupt(...)` |

```typescript
import { ToolNode } from "@langchain/langgraph/prebuilt";

const toolNode = new ToolNode(tools, { handleToolErrors: true });
workflow.addNode("tools", toolNode, { retryPolicy: { maxAttempts: 3, initialInterval: 1.0 } });
```

---

## Common Fixes

<fix-compile-before-execution>
Must compile() to get executable graph.
```typescript
// WRONG
await builder.invoke({ input: "test" });

// CORRECT
const graph = builder.compile();
await graph.invoke({ input: "test" });
```
</fix-compile-before-execution>

<fix-infinite-loop-needs-exit>
Use conditional edges with END return to break loops.
```typescript
builder.addConditionalEdges("node_a", (state) => state.count > 10 ? END : "node_b");
```
</fix-infinite-loop-needs-exit>

<boundaries>
### What You Should NOT Do

- Mutate state directly — always return partial update dicts from nodes
- Route back to START — it's entry-only; use a named node instead
- Forget reducers on list fields — without one, last write wins
- Mix static edges with Command goto without understanding both will execute
</boundaries>
