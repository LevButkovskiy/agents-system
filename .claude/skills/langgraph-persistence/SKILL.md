---
name: langgraph-persistence
description: "INVOKE THIS SKILL when your LangGraph needs to persist state, remember conversations, travel through history, or configure subgraph checkpointer scoping. Covers checkpointers, thread_id, time travel, Store, and subgraph persistence modes."
---

<overview>
LangGraph's persistence layer enables durable execution by checkpointing graph state:

- **Checkpointer**: Saves/loads graph state at every super-step
- **Thread ID**: Identifies separate checkpoint sequences (conversations)
- **Store**: Cross-thread memory for user preferences, facts

**Two memory types:**
- **Short-term** (checkpointer): Thread-scoped conversation history
- **Long-term** (store): Cross-thread user preferences, facts
</overview>

<checkpointer-selection>

| Checkpointer | Use Case | Production Ready |
|--------------|----------|------------------|
| `MemorySaver` | Testing, development | No |
| `SqliteSaver` | Local development | Partial |
| `PostgresSaver` | Production | Yes |

</checkpointer-selection>

---

## Checkpointer Setup

<ex-basic-persistence>
<typescript>
Set up a basic graph with in-memory checkpointing and thread-based state persistence.
```typescript
import { MemorySaver, StateGraph, StateSchema, MessagesValue, START, END } from "@langchain/langgraph";
import { HumanMessage } from "@langchain/core/messages";

const State = new StateSchema({ messages: MessagesValue });

const addMessage = async (state: typeof State.State) => {
  return { messages: [{ role: "assistant", content: "Bot response" }] };
};

const graph = new StateGraph(State)
  .addNode("respond", addMessage)
  .addEdge(START, "respond")
  .addEdge("respond", END)
  .compile({ checkpointer: new MemorySaver() });

// ALWAYS provide thread_id
const config = { configurable: { thread_id: "conversation-1" } };

const result1 = await graph.invoke({ messages: [new HumanMessage("Hello")] }, config);
console.log(result1.messages.length);  // 2

const result2 = await graph.invoke({ messages: [new HumanMessage("How are you?")] }, config);
console.log(result2.messages.length);  // 4 (previous + new)
```
</typescript>
</ex-basic-persistence>

<ex-production-postgres>
<typescript>
Configure PostgreSQL-backed checkpointing for production deployments.
```typescript
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

// Run once during deployment (not at application startup):
//   await PostgresSaver.fromConnString(process.env.DATABASE_URL!).setup();

const checkpointer = PostgresSaver.fromConnString(process.env.DATABASE_URL!);
const graph = builder.compile({ checkpointer });
```
</typescript>
</ex-production-postgres>

---

## Thread Management

```typescript
// Different threads maintain separate state
const aliceConfig = { configurable: { thread_id: "user-alice" } };
const bobConfig = { configurable: { thread_id: "user-bob" } };

await graph.invoke({ messages: [new HumanMessage("Hi from Alice")] }, aliceConfig);
await graph.invoke({ messages: [new HumanMessage("Hi from Bob")] }, bobConfig);
// Alice's state is isolated from Bob's
```

---

## State History & Time Travel

<ex-resume-from-checkpoint>
<typescript>
Time travel: browse checkpoint history and replay or fork from a past state.
```typescript
const config = { configurable: { thread_id: "session-1" } };
const result = await graph.invoke({ messages: ["start"] }, config);

// Browse checkpoint history
const states: Awaited<ReturnType<typeof graph.getState>>[] = [];
for await (const state of graph.getStateHistory(config)) {
  states.push(state);
}

// Replay from a past checkpoint
const past = states[states.length - 2];
const replayed = await graph.invoke(null, past.config);

// Fork: update state at a past checkpoint, then resume
const forkConfig = await graph.updateState(past.config, { messages: ["edited"] });
const forked = await graph.invoke(null, forkConfig);
```
</typescript>
</ex-resume-from-checkpoint>

---

## Subgraph Checkpointer Scoping

| Feature | `checkpointer: false` | `undefined` (default) | `checkpointer: true` |
|---|---|---|---|
| Interrupts (HITL) | No | Yes | Yes |
| Multi-turn memory | No | No | Yes |
| Multiple calls (same subgraph) | Yes | Yes | **No** (namespace conflict) |

```typescript
// No interrupts needed
const subgraph = subgraphBuilder.compile({ checkpointer: false });

// Need interrupts but not cross-invocation persistence (default)
const subgraph = subgraphBuilder.compile();

// Need cross-invocation persistence (stateful)
const subgraph = subgraphBuilder.compile({ checkpointer: true });
```

> **Warning**: Stateful subgraphs (`checkpointer: true`) cannot be called multiple times within a single node — namespace conflict.

---

## Long-Term Memory (Store)

<ex-long-term-memory-store>
<typescript>
Use a Store for cross-thread memory to share user preferences across conversations.
```typescript
import { MemoryStore } from "@langchain/langgraph";

const store = new MemoryStore();
await store.put(["alice", "preferences"], "language", { preference: "short responses" });

const respond = async (state: typeof State.State, runtime: any) => {
  const item = await runtime.store?.get(["alice", "preferences"], "language");
  return { response: `Using preference: ${item?.value?.preference}` };
};

// Compile with BOTH checkpointer and store
const graph = builder.compile({ checkpointer, store });

// Both threads access same long-term memory
await graph.invoke({ userId: "alice" }, { configurable: { thread_id: "thread-1" } });
await graph.invoke({ userId: "alice" }, { configurable: { thread_id: "thread-2" } });
```
</typescript>
</ex-long-term-memory-store>

---

## Fixes

<fix-thread-id-required>
Always provide thread_id in config to enable state persistence.
```typescript
// WRONG: No thread_id — state NOT persisted!
await graph.invoke({ messages: [new HumanMessage("Hello")] });

// CORRECT
const config = { configurable: { thread_id: "session-1" } };
await graph.invoke({ messages: [new HumanMessage("Hello")] }, config);
```
</fix-thread-id-required>

<fix-inmemory-not-for-production>
Use PostgresSaver instead of MemorySaver for production persistence.
```typescript
// WRONG: Data lost on process restart
const checkpointer = new MemorySaver();

// CORRECT
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
const checkpointer = PostgresSaver.fromConnString("postgresql://...");
await checkpointer.setup();
```
</fix-inmemory-not-for-production>

<fix-update-state-with-reducers>
Use Overwrite to replace state values instead of passing through reducers.
```typescript
import { Overwrite } from "@langchain/langgraph";

// Current state: { items: ["A", "B"] }
await graph.updateState(config, { items: ["C"] });        // Result: ["A", "B", "C"] — Appended!
await graph.updateState(config, { items: new Overwrite(["C"]) });  // Result: ["C"] — Replaced
```
</fix-update-state-with-reducers>

<boundaries>
### What You Should NOT Do

- Use `MemorySaver` in production — data lost on restart
- Forget `thread_id` — state won't persist without it
- Expect `updateState` to bypass reducers — use `Overwrite` to replace
- Run the same stateful subgraph in parallel within one node — namespace conflict
- Access store directly in a node — use `runtime.store`
</boundaries>
