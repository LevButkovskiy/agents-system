import { AgentResult, AgentRunOptions } from 'src/shared/agent.types';

export interface ISchedulerService {
  getPendingInterrupt(options: AgentRunOptions): Promise<string | undefined>;
  run(input: string, options: AgentRunOptions): Promise<AgentResult>;
}
