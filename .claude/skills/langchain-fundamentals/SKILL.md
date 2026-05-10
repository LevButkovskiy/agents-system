---
name: langchain-fundamentals
description: Create LangChain agents with create_agent, define tools, and use middleware for human-in-the-loop and error handling.
---

<oneliner>
Build production agents using `create_agent()`, middleware patterns, and the `@tool` decorator / `tool()` function. When creating LangChain agents, you MUST use create_agent(), with middleware for custom flows. All other alternatives are outdated.
</oneliner>

<create_agent>
## Creating Agents with create_agent

`create_agent()` is the recommended way to build agents. It handles the agent loop, tool execution, and state management.

### Agent Configuration Options

| Parameter | Purpose | Example |
|-----------|---------|---------|
| `model` | LLM to use | `"anthropic:claude-sonnet-4-5"` or model instance |
| `tools` | List of tools | `[search, calculator]` |
| `systemPrompt` | Agent instructions | `"You are a helpful assistant"` |
| `checkpointer` | State persistence | `MemorySaver()` |
| `middleware` | Processing hooks | `[humanInTheLoopMiddleware({...})]` |
</create_agent>

<ex-basic-agent>
<typescript>
```typescript
import { createAgent } from "langchain";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

const getWeather = tool(
  async ({ location }) => `Weather in ${location}: Sunny, 72F`,
  {
    name: "get_weather",
    description: "Get current weather for a location.",
    schema: z.object({ location: z.string().describe("City name") }),
  }
);

const agent = createAgent({
  model: "anthropic:claude-sonnet-4-5",
  tools: [getWeather],
  systemPrompt: "You are a helpful assistant.",
});

const result = await agent.invoke({
  messages: [{ role: "user", content: "What's the weather in Paris?" }],
});
console.log(result.messages[result.messages.length - 1].content);
```
</typescript>
</ex-basic-agent>

<ex-agent-with-persistence>
<typescript>
Add MemorySaver checkpointer to maintain conversation state across invocations.
```typescript
import { createAgent } from "langchain";
import { MemorySaver } from "@langchain/langgraph";

const agent = createAgent({
  model: "anthropic:claude-sonnet-4-5",
  tools: [search],
  checkpointer: new MemorySaver(),
});

const config = { configurable: { thread_id: "user-123" } };
await agent.invoke({ messages: [{ role: "user", content: "My name is Alice" }] }, config);
const result = await agent.invoke({ messages: [{ role: "user", content: "What's my name?" }] }, config);
// Agent remembers: "Your name is Alice"
```
</typescript>
</ex-agent-with-persistence>

<tools>
## Defining Tools (TypeScript)

```typescript
import { tool } from "@langchain/core/tools";
import { z } from "zod";

const add = tool(
  async ({ a, b }) => a + b,
  {
    name: "add",
    description: "Add two numbers.",
    schema: z.object({
      a: z.number().describe("First number"),
      b: z.number().describe("Second number"),
    }),
  }
);
```
</tools>

<middleware>
## Middleware for Agent Control

Key imports:
```typescript
import { humanInTheLoopMiddleware, createMiddleware } from "langchain";
```

Key patterns:
- **HITL**: `middleware: [humanInTheLoopMiddleware({ interruptOn: { dangerous_tool: true } })]` — requires `checkpointer` + `thread_id`
- **Resume after interrupt**: `agent.invoke(new Command({ resume: { decisions: [{ type: "approve" }] } }), config)`
- **Custom middleware**: `createMiddleware({ wrapToolCall: async (request, handler) => { ... } })`
</middleware>

<structured_output>
## Structured Output

```typescript
import { ChatAnthropic } from "@langchain/anthropic";
import { z } from "zod";

const ContactInfo = z.object({
  name: z.string(),
  email: z.string().email(),
  phone: z.string().describe("Phone number with area code"),
});

const model = new ChatAnthropic({ model: "claude-sonnet-4-6" });
const structuredModel = model.withStructuredOutput(ContactInfo);
const response = await structuredModel.invoke("Extract: John, john@example.com, 555-1234");
```
</structured_output>

<fix-missing-tool-description>
Clear descriptions help the agent know when to use each tool.
```typescript
// WRONG: Vague description
const badTool = tool(async ({ input }) => "result", {
  name: "bad_tool",
  description: "Does stuff.",
  schema: z.object({ input: z.string() }),
});

// CORRECT: Clear, specific description
const search = tool(async ({ query }) => webSearch(query), {
  name: "search",
  description: "Search the web for current information about a topic. Use this when you need recent data or facts.",
  schema: z.object({
    query: z.string().describe("The search query (2-10 words recommended)"),
  }),
});
```
</fix-missing-tool-description>

<fix-no-checkpointer>
Add checkpointer and thread_id for conversation memory across invocations.
```typescript
// WRONG: No persistence
const agent = createAgent({ model: "anthropic:claude-sonnet-4-5", tools: [search] });

// CORRECT
const agent = createAgent({
  model: "anthropic:claude-sonnet-4-5",
  tools: [search],
  checkpointer: new MemorySaver(),
});
const config = { configurable: { thread_id: "session-1" } };
```
</fix-no-checkpointer>

<fix-infinite-loop>
Set recursionLimit in the invoke config to prevent runaway agent loops.
```typescript
const result = await agent.invoke(
  { messages: [["user", "Do research"]] },
  { recursionLimit: 10 },
);
```
</fix-infinite-loop>

<fix-accessing-result-wrong>
Access the messages array from the result, not result.content directly.
```typescript
// WRONG
console.log(result.content); // undefined!

// CORRECT
console.log(result.messages[result.messages.length - 1].content);
```
</fix-accessing-result-wrong>
