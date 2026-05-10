---
name: langchain-rag
description: "INVOKE THIS SKILL when building ANY retrieval-augmented generation (RAG) system. Covers document loaders, RecursiveCharacterTextSplitter, embeddings, and vector stores (Chroma, FAISS, Pinecone)."
---

<overview>
Retrieval Augmented Generation (RAG) enhances LLM responses by fetching relevant context from external knowledge sources.

**Pipeline:**
1. **Index**: Load → Split → Embed → Store
2. **Retrieve**: Query → Embed → Search → Return docs
3. **Generate**: Docs + Query → LLM → Response
</overview>

<vectorstore-selection>

| Vector Store | Use Case | Persistence |
|--------------|----------|-------------|
| **InMemory** | Testing | Memory only |
| **FAISS** | Local, high performance | Disk |
| **Chroma** | Development | Disk |
| **Pinecone** | Production, managed | Cloud |

</vectorstore-selection>

---

## Complete RAG Pipeline (TypeScript)

<ex-basic-rag-setup>
```typescript
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";

// 1. Load documents
const docs = [
  new Document({ pageContent: "LangChain is a framework for LLM apps.", metadata: {} }),
  new Document({ pageContent: "RAG = Retrieval Augmented Generation.", metadata: {} }),
];

// 2. Split documents
const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 500, chunkOverlap: 50 });
const splits = await splitter.splitDocuments(docs);

// 3. Create embeddings and store
const embeddings = new OpenAIEmbeddings({ model: "text-embedding-3-small" });
const vectorstore = await MemoryVectorStore.fromDocuments(splits, embeddings);

// 4. Create retriever
const retriever = vectorstore.asRetriever({ k: 4 });

// 5. Use in RAG
const model = new ChatOpenAI({ model: "gpt-4.1" });
const query = "What is RAG?";
const relevantDocs = await retriever.invoke(query);
const context = relevantDocs.map(doc => doc.pageContent).join("\n\n");
const response = await model.invoke([
  { role: "system", content: `Use this context:\n\n${context}` },
  { role: "user", content: query },
]);
```
</ex-basic-rag-setup>

---

## Vector Stores

<ex-chroma-vectorstore>
```typescript
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { OpenAIEmbeddings } from "@langchain/openai";

const vectorstore = await Chroma.fromDocuments(
  splits,
  new OpenAIEmbeddings(),
  { collectionName: "my-collection", url: "http://localhost:8000" }
);
```
</ex-chroma-vectorstore>

<ex-faiss-vectorstore>
```typescript
import { FaissStore } from "@langchain/community/vectorstores/faiss";

const vectorstore = await FaissStore.fromDocuments(splits, embeddings);
await vectorstore.save("./faiss_index");
const loaded = await FaissStore.load("./faiss_index", embeddings);
```
</ex-faiss-vectorstore>

---

## Retrieval

```typescript
// Basic search
const results = await vectorstore.similaritySearch(query, 5);

// MMR (balance relevance and diversity)
const retriever = vectorstore.asRetriever({
  searchType: "mmr",
  searchKwargs: { fetchK: 20, lambda: 0.5, k: 5 },
});
```

---

## RAG as Agent Tool

```typescript
const searchDocs = tool(
  async (input) => {
    const docs = await retriever.invoke(input.query);
    return docs.map(d => d.pageContent).join("\n\n");
  },
  {
    name: "search_docs",
    description: "Search documentation for relevant information.",
    schema: z.object({ query: z.string() }),
  }
);
```

---

## Common Fixes

<fix-chunk-size>
Chunk size 500-1500 is typically good.
```typescript
// WRONG
new RecursiveCharacterTextSplitter({ chunkSize: 50 });

// CORRECT
new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
```
</fix-chunk-size>

<fix-consistent-embeddings>
Use the same embedding model for indexing and querying.
```typescript
const embeddings = new OpenAIEmbeddings({ model: "text-embedding-3-small" });
const vectorstore = await Chroma.fromDocuments(docs, embeddings);
const retriever = vectorstore.asRetriever();  // Uses same embeddings
```
</fix-consistent-embeddings>
