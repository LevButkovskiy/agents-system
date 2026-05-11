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
├── ai/                  # Core agent module (LangGraph state machine)
│   ├── models/          # LLM wrappers (LangChain)
│   ├── nodes/           # Graph nodes (pure functions)
│   └── tools/           # LangChain tools (Zod schemas)
├── connectors/          # Outbound API integrations (one subdir per service)
│   └── gemini/          # Google Gemini via ProxyAPI (image gen/editing)
├── interfaces/          # Inbound user-facing channels (one subdir per channel)
│   └── telegram/        # Telegram bot (Grammy)
└── app.module.ts        # Root module
```

### Module scalability rules

- **`connectors/<name>/`** — one NestJS module per external API (Gemini, OpenAI, StabilityAI, …). Pure HTTP client, no business logic. Export a single injectable service. Consumed by `ai/tools/` or future agent modules.
- **`interfaces/<name>/`** — one NestJS module per user-facing channel (Telegram, REST, WebSocket, …). Translates protocol events into `AiService` calls. No AI logic.
- **`ai/`** — agent logic only. Imports from `connectors/` when tools need external APIs. Never imports from `interfaces/`.
- New external API → new `connectors/<name>/` module, no changes to `ai/` or `interfaces/`.
- New user channel → new `interfaces/<name>/` module, no changes to `ai/` or `connectors/`.
- New agent → `src/agents/<name>/` with own module, state, nodes, tools.

## LangGraph Conventions

- State via `StateSchema` with `ReducedValue` reducers; nodes are pure `(state) => Partial<state>`
- Conditional routing via `addConditionalEdges`; tools bound via `model.bindTools(tools)`
- Checkpointing: `MemorySaver` (dev) or `PostgresSaver` (prod) for multi-turn memory
- Streaming: `graph.stream(input, { streamMode: 'values' | 'updates' })`
- Tools access graph state via `getCurrentTaskInput<AppState>()` (no schema exposure needed)

## Multi-Agent Patterns

Supervisor (LLM routes to subgraphs), Swarm (`Command({ goto })`), Parallel (`Send` API), Human-in-the-loop (`interrupt()`).

## Environment Variables

See `.env.example`. Required: `ANTHROPIC_API_KEY`, `TELEGRAM_BOT_TOKEN`.
Optional: `LANGSMITH_TRACING`, `LANGSMITH_API_KEY`, `LANGSMITH_PROJECT`, `NODE_ENV`, `TELEGRAM_STREAMING` (enable streaming replies), `PROXYAPI_KEY` (image generation via ProxyAPI).
Production only: `DATABASE_URL` (PostgreSQL, for persistent checkpointing).
Never commit `.env`.

## Testing

- Unit tests: `*.spec.ts` colocated with source files
- E2E tests: `test/` directory
- Test nodes in isolation, then integration-test the compiled graph

## Commits

Conventional commits: `feat:`, `fix:`, `chore:`, etc. — enforced by commitlint.
Pre-commit runs: lint-staged → auto-update this CLAUDE.md (via `scripts/update-claude-md.mjs`).
