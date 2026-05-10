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
│   ├── models/          # LLM initialization
│   ├── nodes/           # Graph nodes (pure functions)
│   └── tools/           # LangChain tools (Zod schemas)
├── interfaces/
│   └── telegram/        # Telegram bot interface (Grammy)
└── app.module.ts        # Root module
```

New agents → `src/agents/<name>/` with own module, state, nodes, tools.

## LangGraph Conventions

- State via `Annotation.Root()` with reducers; nodes are pure `(state) => Partial<state>`
- Conditional routing via `addConditionalEdges`; tools bound via `model.bindTools(tools)`
- Checkpointing: `MemorySaver` (dev) or `PostgresSaver` (prod) for multi-turn memory
- Streaming: `graph.stream(input, { streamMode: 'values' | 'updates' })`

## Multi-Agent Patterns

Supervisor (LLM routes to subgraphs), Swarm (`Command({ goto })`), Parallel (`Send` API), Human-in-the-loop (`interrupt()`).

## Environment Variables

See `.env.example`. Required: `ANTHROPIC_API_KEY`, `TELEGRAM_BOT_TOKEN`.
Optional: `LANGSMITH_TRACING`, `LANGSMITH_API_KEY`, `LANGSMITH_PROJECT`.
Never commit `.env`.

## Testing

- Unit tests: `*.spec.ts` colocated with source files
- E2E tests: `test/` directory
- Test nodes in isolation, then integration-test the compiled graph

## Commits

Conventional commits: `feat:`, `fix:`, `chore:`, etc. — enforced by commitlint.
Pre-commit runs: lint-staged → auto-update this CLAUDE.md (via `scripts/update-claude-md.mjs`).
