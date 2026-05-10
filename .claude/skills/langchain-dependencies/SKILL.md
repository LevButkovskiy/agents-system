---
name: langchain-dependencies
description: "INVOKE THIS SKILL when setting up a new project or when asked about package versions, installation, or dependency management for LangChain, LangGraph, LangSmith, or Deep Agents. Covers required packages, minimum versions, environment requirements, versioning best practices, and common community tool packages for both Python and TypeScript."
---

<overview>
The LangChain ecosystem is split into focused, independently-versioned packages.

**Key principles:**
- **LangChain 1.0 is the current LTS release.** Always start new projects on 1.0+. LangChain 0.3 is legacy maintenance-only.
- **langchain-core** is the shared foundation: always install it explicitly.
- **langchain-community** (Python only) does NOT follow semantic versioning; pin it conservatively.
- Provider integrations (model, vector store, tools) are installed separately.
</overview>

---

## Environment Requirements

| Requirement | Python | TypeScript / Node |
|-------------|--------|-------------------|
| Runtime minimum | **Python 3.10+** | **Node.js 20+** |
| LangChain | **1.0+ (LTS)** | **1.0+ (LTS)** |
| LangSmith SDK | >= 0.3.0 | >= 0.3.0 |

---

## Framework Choice

Pick **one** agent orchestration layer:

| Framework | When to use | Core extra package |
|-----------|-------------|--------------------|
| **LangGraph** | Fine-grained graph control, custom workflows, loops, or branching | `langgraph` / `@langchain/langgraph` |
| **Deep Agents** | Batteries-included planning, memory, file context, and skills | `deepagents` |

---

## TypeScript — Always Required

| Package | Role | Min version |
|---------|------|-------------|
| `@langchain/core` | Base types & interfaces (peer dep) | 1.0 |
| `langchain` | Agents, chains, retrieval | 1.0 |
| `langsmith` | Tracing, evaluation, datasets | 0.3.0 |

## TypeScript — Orchestration (pick one)

| Package | Use when | Min version |
|---------|----------|-------------|
| `@langchain/langgraph` | Building custom graphs directly | 1.0 |
| `deepagents` | Using the Deep Agents framework | latest |

## TypeScript — Model Providers

| Package | Provider |
|---------|----------|
| `@langchain/openai` | OpenAI (GPT-4o, o3, …) |
| `@langchain/anthropic` | Anthropic (Claude) |
| `@langchain/google-genai` | Google (Gemini) |
| `@langchain/mistralai` | Mistral |
| `@langchain/groq` | Groq |
| `@langchain/aws` | AWS Bedrock |
| `@langchain/ollama` | Ollama (local models) |

## TypeScript — Common Tool & Retrieval Packages

| Package | Adds |
|---------|------|
| `@langchain/tavily` | Tavily web search |
| `@langchain/community` | Broad integrations (use sparingly) |
| `@langchain/pinecone` | Pinecone vector store |
| `@langchain/qdrant` | Qdrant vector store |

> **`@langchain/core` must be installed explicitly** in yarn workspaces and monorepos.

---

## Minimal TypeScript Templates

```json
// LangGraph project
{
  "dependencies": {
    "@langchain/core": "^1.0.0",
    "langchain": "^1.0.0",
    "@langchain/langgraph": "^1.0.0",
    "langsmith": "^0.3.0"
  }
}
```

---

## Versioning Policy

| Package group | Strategy |
|---------------|----------|
| `langchain`, `langchain-core` | Allow minor: `>=1.0,<2.0` |
| `@langchain/langgraph` | Allow minor: `>=1.0,<2.0` |
| Dedicated integration packages | Allow minor updates; use latest |
| `langchain-community` | **NOT semver — pin to minor series** |

---

## Environment Variables

```bash
LANGSMITH_API_KEY=<your-key>
ANTHROPIC_API_KEY=<your-key>
OPENAI_API_KEY=<your-key>
TAVILY_API_KEY=<your-key>
PINECONE_API_KEY=<your-key>
```

---

## Common Mistakes

<fix-legacy-version>
Never start a new project on LangChain 0.3 — use 1.0 LTS.
</fix-legacy-version>

<fix-core-not-installed>
`@langchain/core` is a peer dependency — always list it in package.json, especially in monorepos.
```json
// WRONG: missing @langchain/core
{ "dependencies": { "@langchain/langgraph": "^1.0.0" } }

// CORRECT
{ "dependencies": { "@langchain/core": "^1.0.0", "@langchain/langgraph": "^1.0.0" } }
```
</fix-core-not-installed>
