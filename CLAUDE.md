# Agent System — CLAUDE.md

Pet project for experimenting with multi-agent systems using NestJS + LangChain + LangGraph.

## Stack

- **Runtime:** Node.js + TypeScript (ES2023, `nodenext` modules)
- **Framework:** NestJS 11
- **AI/Agents:** LangChain, LangGraph, `@langchain/anthropic` (Claude)
- **Interface:** Grammy (Telegram bot)
- **Tracing:** LangSmith
- **Quality:** ESLint, Prettier, Husky, Commitlint (conventional commits)

## Commands

```bash
npm run start:dev    # dev server with watch
npm run build        # compile to dist/
npm run test         # unit tests
npm run test:cov     # coverage
npm run test:e2e     # e2e tests
npm run lint         # ESLint + Prettier fix
```

## Architecture

```
src/
├── configuration.ts     # Root config (env → typed object)
├── shared/              # Cross-cutting utilities (serializeContent, etc.)
├── infrastructure/      # Shared NestJS infrastructure (CheckpointerModule)
├── ai/                  # Core agent module (LangGraph state machine)
│   ├── agent.graph.ts   # Graph builder (NODES, shouldContinue, buildAgent)
│   ├── agent.interface.ts # IAgentService contract + AgentResult type
│   ├── models/          # LLM wrappers (LangChain)
│   ├── nodes/           # Graph nodes (pure functions)
│   └── tools/           # LangChain tools (Zod schemas + per-connector modules)
├── connectors/          # Outbound API integrations (one subdir per service)
│   └── gemini/          # Google Gemini via ProxyAPI (image gen/editing)
├── interfaces/          # Inbound user-facing channels (one subdir per channel)
│   └── telegram/        # Telegram bot (Grammy)
└── app.module.ts        # Root module
```

### Module scalability rules

- **`connectors/<name>/`** — one NestJS module per external API (Gemini, OpenAI, StabilityAI, …). Pure HTTP client, no business logic. Export a single injectable service.
- **`ai/tools/<connector>-tools.module.ts`** — one NestJS module per connector tool group. Imports the connector module, provides tools via a typed `<NAME>_TOOLS_TOKEN`. `ToolsService` injects each token and assembles the flat list.
- **`interfaces/<name>/`** — one NestJS module per user-facing channel (Telegram, REST, WebSocket, …). Depends on `IAgentService`, not concrete `AiService`. No AI logic.
- **`ai/`** — agent logic only. Imports from `connectors/` (via tool modules) and `infrastructure/`. Never imports from `interfaces/`.
- New external API → new `connectors/<name>/` module + `ai/tools/<name>-tools.module.ts`; inject token into `ToolsService`.
- New user channel → new `interfaces/<name>/` module; depends on `IAgentService`.
- New agent → `src/agents/<name>/` with own module, state, nodes, tools; shares `CheckpointerModule`.

## LangGraph Conventions

- State via `StateSchema` with `ReducedValue` reducers; nodes are pure `(state) => Partial<state>`
- Conditional routing via `addConditionalEdges`; tools bound via `model.bindTools(tools)`
- Checkpointing: `MemorySaver` (dev) or `PostgresSaver` (prod) for multi-turn memory
- Tools access graph state via `getCurrentTaskInput<AppState>()` (no schema exposure needed)
- Each agent's graph lives in `agent.graph.ts`; system prompt is a parameter to `createLlmNode(model, systemPrompt)`

## Multi-Agent Patterns

Supervisor (LLM routes to subgraphs), Swarm (`Command({ goto })`), Parallel (`Send` API), Human-in-the-loop (`interrupt()`).

## Environment Variables

See `.env.example`. Required: `ANTHROPIC_API_KEY`, `TELEGRAM_BOT_TOKEN`.
Optional: `LANGSMITH_TRACING`, `LANGSMITH_API_KEY`, `LANGSMITH_PROJECT`, `NODE_ENV`, `MODEL` (LLM provider key, default `anthropic`), `PROXYAPI_KEY` (image generation via ProxyAPI).
Production only: `DATABASE_URL` (PostgreSQL, for persistent checkpointing).
Never commit `.env`.

## Service Method Conventions

Every service method takes a single typed DTO object as its only argument — no exceptions, no primitives.

```typescript
// ✓
list(dto: ListTasksDto): Promise<Task[]>
findDue(dto: FindDueTasksDto): Promise<Task[]>

// ✗
list(userId: string): Promise<Task[]>
findDue(now: Date): Promise<Task[]>
```

**Why:** Adding a parameter to a method with positional arguments is a breaking change — every caller must be updated. With a DTO, new fields are added as optional properties; all existing callers continue to work without modification. The cost of wrapping one scalar in a DTO is trivial; the cost of a cross-codebase refactor when the second parameter arrives is not.

**DTO naming:** `<Verb><Entity>Dto` — `CreateTaskDto`, `ListTasksDto`, `FindDueTasksDto`. Place all DTOs for a service in a colocated `*.types.ts` file. Related DTOs may use `extends`: `UpdateTaskDto extends TaskDto`.

## Testing

- Unit tests: `*.spec.ts` colocated with source files
- E2E tests: `test/` directory
- Test nodes in isolation, then integration-test the compiled graph

## Commits

Conventional commits: `feat:`, `fix:`, `chore:`, etc. — enforced by commitlint.
Pre-commit runs: lint-staged → auto-update this CLAUDE.md (via `scripts/update-claude-md.mjs`).
