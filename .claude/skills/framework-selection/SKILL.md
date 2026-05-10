---
name: framework-selection
description: "INVOKE THIS SKILL at the START of any LangChain/LangGraph/Deep Agents project, before writing any agent code. Determines which framework layer is right for the task: LangChain, LangGraph, Deep Agents, or a combination. Must be consulted before other agent skills."
---

<overview>
LangChain, LangGraph, and Deep Agents are **layered**, not competing choices. Each builds on the one below it:

```
┌─────────────────────────────────────────┐
│              Deep Agents                │  ← highest level: batteries included
│   (planning, memory, skills, files)     │
├─────────────────────────────────────────┤
│               LangGraph                 │  ← orchestration: graphs, loops, state
│    (nodes, edges, state, persistence)   │
├─────────────────────────────────────────┤
│               LangChain                 │  ← foundation: models, tools, chains
│      (models, tools, prompts, RAG)      │
└─────────────────────────────────────────┘
```

Picking a higher layer does not cut you off from lower layers — you can use LangGraph graphs inside Deep Agents, and LangChain primitives inside both.

> **This skill should be loaded at the top of any project before selecting other skills or writing agent code.** The framework you choose dictates which other skills to invoke next.
</overview>

---

## Decision Guide

<decision-table>

Answer these questions in order:

| Question | Yes → | No → |
|----------|-------|------|
| Does the task require breaking work into sub-tasks, managing files across a long session, persistent memory, or loading on-demand skills? | **Deep Agents** | ↓ |
| Does the task require complex control flow — loops, dynamic branching, parallel workers, human-in-the-loop, or custom state? | **LangGraph** | ↓ |
| Is this a single-purpose agent that takes input, runs tools, and returns a result? | **LangChain** (`create_agent`) | ↓ |
| Is this a pure model call, chain, or retrieval pipeline with no agent loop? | **LangChain** (chain) | — |

</decision-table>

---

## Framework Profiles

<langchain-profile>

### LangChain — Use when the task is focused and self-contained

**Best for:**
- Single-purpose agents that use a fixed set of tools
- RAG pipelines and document Q&A
- Model calls, prompt templates, output parsing
- Quick prototypes where agent logic is simple

**Skills to invoke next:** `langchain-fundamentals`, `langchain-rag`, `langchain-middleware`

</langchain-profile>

<langgraph-profile>

### LangGraph — Use when you need to own the control flow

**Best for:**
- Agents with branching logic or loops (e.g. retry-until-correct, reflection)
- Multi-step workflows where different paths depend on intermediate results
- Human-in-the-loop approval at specific steps
- Parallel fan-out / fan-in (map-reduce patterns)
- Persistent state across invocations within a session

**Skills to invoke next:** `langgraph-fundamentals`, `langgraph-human-in-the-loop`, `langgraph-persistence`

</langgraph-profile>

<deep-agents-profile>

### Deep Agents — Use when the task is open-ended and multi-dimensional

**Best for:**
- Long-running tasks that require breaking work into a todo list
- Agents that need to read, write, and manage files across a session
- Delegating subtasks to specialized subagents
- Loading domain-specific skills on demand
- Persistent memory that survives across multiple sessions

**Middleware — built-in and extensible:**

| Middleware | What it provides | Always on? |
|------------|-----------------|------------|
| `TodoListMiddleware` | `write_todos` tool — agent plans and tracks multi-step tasks | ✓ |
| `FilesystemMiddleware` | `ls`, `read_file`, `write_file`, `edit_file`, `glob`, `grep` tools | ✓ |
| `SubAgentMiddleware` | `task` tool — delegate work to named subagents | ✓ |
| `SkillsMiddleware` | Load SKILL.md files on demand from a skills directory | Opt-in |
| `MemoryMiddleware` | Long-term memory across sessions via a `Store` instance | Opt-in |
| `HumanInTheLoopMiddleware` | Interrupt and request human approval before sensitive tool calls | Opt-in |

**Skills to invoke next:** `deep-agents-core`, `deep-agents-memory`, `deep-agents-orchestration`

</deep-agents-profile>

---

## Mixing Layers

<mixing-layers>

| Scenario | Recommended pattern |
|----------|---------------------|
| Main agent needs planning + memory, but one subtask requires precise graph control | Deep Agents orchestrator → LangGraph subagent |
| Specialized pipeline (e.g. RAG, reflection loop) is called by a broader agent | LangGraph graph wrapped as a tool or subagent |
| High-level coordination but low-level graph for a specific domain | Deep Agents + LangGraph compiled graph as a subagent |

</mixing-layers>

---

## Quick Reference

| | LangChain | LangGraph | Deep Agents |
|---|-----------|-----------|-------------|
| **Control flow** | Fixed (tool loop) | Custom (graph) | Managed (middleware) |
| **Planning** | ✗ | Manual | ✓ TodoListMiddleware |
| **File management** | ✗ | Manual | ✓ FilesystemMiddleware |
| **Persistent memory** | ✗ | With checkpointer | ✓ MemoryMiddleware |
| **Subagent delegation** | ✗ | Manual | ✓ SubAgentMiddleware |
| **On-demand skills** | ✗ | ✗ | ✓ SkillsMiddleware |
| **Human-in-the-loop** | ✗ | Manual interrupt | ✓ HumanInTheLoopMiddleware |
| **Custom graph edges** | ✗ | ✓ Full control | Limited |
| **Setup complexity** | Low | Medium | Low |
