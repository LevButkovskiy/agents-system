---
name: deep-agents-memory
description: "INVOKE THIS SKILL when your Deep Agent needs memory, persistence, or filesystem access. Covers StateBackend (ephemeral), StoreBackend (persistent), FilesystemMiddleware, and CompositeBackend for routing."
---

<overview>
Deep Agents use pluggable backends for file operations and memory:

**Short-term (StateBackend)**: Persists within a single thread, lost when thread ends
**Long-term (StoreBackend)**: Persists across threads and sessions
**Hybrid (CompositeBackend)**: Route different paths to different backends

FilesystemMiddleware provides tools: `ls`, `read_file`, `write_file`, `edit_file`, `glob`, `grep`
</overview>

<backend-selection>

| Use Case | Backend | Why |
|----------|---------|-----|
| Temporary working files | StateBackend | Default, no setup |
| Local development CLI | FilesystemBackend | Direct disk access |
| Cross-session memory | StoreBackend | Persists across threads |
| Hybrid storage | CompositeBackend | Mix ephemeral + persistent |

</backend-selection>

---

## Composite Backend (Hybrid)

<ex-composite-backend-for-hybrid>
<typescript>
Configure CompositeBackend to route paths to different storage backends.
```typescript
import { createDeepAgent, CompositeBackend, StateBackend, StoreBackend } from "deepagents";
import { InMemoryStore } from "@langchain/langgraph";

const store = new InMemoryStore();

const agent = await createDeepAgent({
  backend: (config) => new CompositeBackend(
    new StateBackend(config),
    { "/memories/": new StoreBackend(config) }
  ),
  store
});

// /draft.txt -> ephemeral (StateBackend)
// /memories/user-prefs.txt -> persistent (StoreBackend)
```
</typescript>
</ex-composite-backend-for-hybrid>

---

## Filesystem Backend (Local Dev)

<ex-filesystem-backend-local-dev>
<typescript>
Use FilesystemBackend for local development with real disk access and human-in-the-loop.
```typescript
import { createDeepAgent, FilesystemBackend } from "deepagents";
import { MemorySaver } from "@langchain/langgraph";

const agent = await createDeepAgent({
  backend: new FilesystemBackend({ rootDir: ".", virtualMode: true }),
  interruptOn: { write_file: true, edit_file: true },
  checkpointer: new MemorySaver()
});
```
</typescript>

**Security: Never use FilesystemBackend in web servers — use StateBackend or sandbox instead.**
</ex-filesystem-backend-local-dev>

---

## Store in Custom Tools

<ex-store-in-custom-tools>
<typescript>
Access the store directly in custom tools for long-term memory operations.
```typescript
import { tool, ToolRuntime } from "langchain";
import { createAgent } from "langchain";
import { InMemoryStore } from "@langchain/langgraph";
import { z } from "zod";

const getUserPreference = tool(
  async ({ key }, runtime: ToolRuntime) => {
    const result = await runtime.store?.get(["user_prefs"], key);
    return result ? String(result.value) : "Not found";
  },
  {
    name: "get_user_preference",
    description: "Get a user preference from long-term storage.",
    schema: z.object({ key: z.string() }),
  }
);
```
</typescript>
</ex-store-in-custom-tools>

---

## Fixes

<fix-storebackend-requires-store>
StoreBackend requires a store instance.
```typescript
// WRONG
const agent = await createDeepAgent({ backend: (c) => new StoreBackend(c) });

// CORRECT
const agent = await createDeepAgent({ backend: (c) => new StoreBackend(c), store: new InMemoryStore() });
```
</fix-storebackend-requires-store>

<fix-statebackend-files-dont-persist>
StateBackend files are thread-scoped — use same thread_id or StoreBackend for cross-thread access.
```typescript
// WRONG: thread-2 can't read file from thread-1
await agent.invoke({ messages: [...] }, { configurable: { thread_id: "thread-1" } });
await agent.invoke({ messages: [...] }, { configurable: { thread_id: "thread-2" } });  // File not found!
```
</fix-statebackend-files-dont-persist>

<fix-production-store>
Use PostgresStore for production (InMemoryStore lost on restart).
```typescript
// WRONG
const store = new InMemoryStore();

// CORRECT
const store = new PostgresStore({ connectionString: "..." });
```
</fix-production-store>
