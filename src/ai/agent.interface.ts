import { BaseMessage } from '@langchain/core/messages';
import { AgentResult, AgentRunOptions } from 'src/shared/agent.types';
import { Artifact, ImageInput } from './ai.state';

export interface AiAgentRunOptions extends AgentRunOptions {
  contextImages?: ImageInput[];
}

export interface AiAgentResult extends AgentResult {
  artifacts: Artifact[];
}

export interface IAgentService {
  run(
    input: string | BaseMessage,
    options: AiAgentRunOptions,
  ): Promise<AiAgentResult>;
}
