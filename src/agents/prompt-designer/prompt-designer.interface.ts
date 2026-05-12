import { AgentResult, AgentRunOptions } from 'src/shared/agent.types';

export interface IPromptDesignerService {
  run(input: string, options: AgentRunOptions): Promise<AgentResult>;
}
