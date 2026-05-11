import { BaseMessage } from '@langchain/core/messages';

export interface AgentRunOptions {
  threadId: string;
  userId: string;
}

export interface AgentResult {
  messages: BaseMessage[];
  interrupt?: string;
}
