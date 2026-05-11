#!/usr/bin/env node
import { access, mkdir, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const nameIdx = process.argv.indexOf('--name');
if (nameIdx === -1 || !process.argv[nameIdx + 1]) {
  console.error('Usage: node scripts/create-agent.mjs --name <agent-name>');
  process.exit(1);
}

const name = process.argv[nameIdx + 1];

if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(name)) {
  console.error('Error: name must be kebab-case (e.g., my-agent)');
  process.exit(1);
}

const toPascal = (str) =>
  str
    .split('-')
    .map((s) => s[0].toUpperCase() + s.slice(1))
    .join('');

const toUpper = (str) => str.replace(/-/g, '_').toUpperCase();

const pascal = toPascal(name);
const upper = toUpper(name);
const dir = join(root, 'src', 'agents', name);

try {
  await access(dir);
  console.error(`Error: src/agents/${name}/ already exists`);
  process.exit(1);
} catch {}

const files = {
  [`${name}.constants.ts`]: `export const ${upper}_SERVICE = '${upper}_SERVICE' as const;
`,

  [`${name}.state.ts`]: `import { MessagesValue, ReducedValue, StateSchema } from '@langchain/langgraph';
import { z } from 'zod';

export const ${pascal}State = new StateSchema({
  messages: MessagesValue,
  llmCalls: new ReducedValue(z.number().default(0), {
    reducer: (x, y) => x + y,
  }),
});

export type ${pascal}State = typeof ${pascal}State.State;
`,

  [`${name}.graph.ts`]: `import { StructuredToolInterface } from '@langchain/core/tools';
import {
  BaseCheckpointSaver,
  END,
  START,
  StateGraph,
} from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { ConfigService } from '@nestjs/config';
import { getModel } from 'src/models';
import { createShouldContinue } from 'src/shared/graph.utils';
import { createLlmNode } from 'src/shared/nodes/llm.node';
import { ${pascal}State } from './${name}.state';

export const NODES = {
  LLM_CALL: 'llmCall',
  TOOL: 'toolNode',
} as const;

const shouldContinue = createShouldContinue<${pascal}State>(NODES.TOOL);

export const buildAgent = (
  configService: ConfigService,
  checkpointer: BaseCheckpointSaver,
  tools: StructuredToolInterface[],
  systemPrompt = 'You are a helpful personal assistant',
) => {
  const model = getModel(configService, tools);
  const llmNode = createLlmNode(model, systemPrompt);
  const toolNode = new ToolNode(tools);

  return new StateGraph(${pascal}State)
    .addNode(NODES.LLM_CALL, llmNode)
    .addNode(NODES.TOOL, toolNode)
    .addEdge(START, NODES.LLM_CALL)
    .addConditionalEdges(NODES.LLM_CALL, shouldContinue, [NODES.TOOL, END])
    .addEdge(NODES.TOOL, NODES.LLM_CALL)
    .compile({ checkpointer });
};
`,

  [`${name}.interface.ts`]: `import { BaseMessage } from '@langchain/core/messages';

export interface AgentResult {
  messages: BaseMessage[];
}

export interface I${pascal}Service {
  run(input: string, threadId: string): Promise<AgentResult>;
}
`,

  [`${name}.service.ts`]: `import { BaseCheckpointSaver } from '@langchain/langgraph';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CHECKPOINTER } from 'src/infrastructure/infrastructure.constants';
import { serializeContent } from 'src/shared/utils';
import { buildAgent } from './${name}.graph';
import { AgentResult, I${pascal}Service } from './${name}.interface';
import { ToolsService } from './tools';

@Injectable()
export class ${pascal}Service implements I${pascal}Service {
  private readonly logger = new Logger(${pascal}Service.name);
  private readonly agent: ReturnType<typeof buildAgent>;

  constructor(
    configService: ConfigService,
    @Inject(CHECKPOINTER) checkpointer: BaseCheckpointSaver,
    toolsService: ToolsService,
  ) {
    this.agent = buildAgent(
      configService,
      checkpointer,
      toolsService.getTools(),
    );
  }

  async run(input: string, threadId: string): Promise<AgentResult> {
    this.logger.log(\`Running agent [thread: \${threadId}] [\${input}]\`);

    const result = await this.agent.invoke(
      { messages: [input] },
      { configurable: { thread_id: threadId } },
    );

    const lastMsg = result.messages.at(-1);
    if (lastMsg) {
      this.logger.debug(\`[\${lastMsg.type}]: \${serializeContent(lastMsg.content)}\`);
    }

    return { messages: result.messages };
  }
}
`,

  [`${name}.module.ts`]: `import { Module } from '@nestjs/common';
import { CheckpointerModule } from 'src/infrastructure/checkpointer.module';
import { ${upper}_SERVICE } from './${name}.constants';
import { ${pascal}Service } from './${name}.service';
import { ToolsService } from './tools';

@Module({
  imports: [CheckpointerModule],
  providers: [
    ToolsService,
    ${pascal}Service,
    { provide: ${upper}_SERVICE, useExisting: ${pascal}Service },
  ],
  exports: [${upper}_SERVICE],
})
export class ${pascal}Module {}
`,

  ['tools/index.ts']: `export { ToolsService } from './tools.service';
`,

  ['tools/tools.service.ts']: `import { StructuredToolInterface } from '@langchain/core/tools';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ToolsService {
  private readonly tools: StructuredToolInterface[];

  constructor() {
    this.tools = [];
  }

  getTools(): StructuredToolInterface[] {
    return this.tools;
  }
}
`,
};

await mkdir(join(dir, 'tools'), { recursive: true });

for (const [file, content] of Object.entries(files)) {
  await writeFile(join(dir, file), content, 'utf-8');
  console.log(`  created  src/agents/${name}/${file}`);
}

console.log(`\nAgent '${name}' scaffolded at src/agents/${name}/`);
console.log(`Next: import ${pascal}Module into AiModule or AppModule.`);
