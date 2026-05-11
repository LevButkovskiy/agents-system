import { BaseMessage } from '@langchain/core/messages';
import { Artifact, ImageInput } from './state';

export interface AgentResult {
  messages: BaseMessage[];
  artifacts: Artifact[];
}

export interface IAgentService {
  run(
    input: string | BaseMessage,
    threadId: string,
    contextImages?: ImageInput[],
  ): Promise<AgentResult>;
}
