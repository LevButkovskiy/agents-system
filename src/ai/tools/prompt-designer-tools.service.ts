import { BaseMessage, ToolMessage } from '@langchain/core/messages';
import { StructuredToolInterface, tool } from '@langchain/core/tools';
import { getCurrentTaskInput } from '@langchain/langgraph';
import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { PROMPT_DESIGNER_SERVICE } from '../../agents/prompt-designer/prompt-designer.constants';
import type { IPromptDesignerService } from '../../agents/prompt-designer/prompt-designer.interface';
import { serializeContent } from '../../shared/utils';
import type { AppState } from '../ai.state';

const DESIGNER_TOOL_NAMES = new Set([
  'submit_task_design',
  'ask_clarifying_question',
]);

const extractDesignerResult = (messages: BaseMessage[]): string => {
  const toolMsg = messages.findLast(
    (m): m is ToolMessage =>
      ToolMessage.isInstance(m) &&
      m.name !== undefined &&
      DESIGNER_TOOL_NAMES.has(m.name),
  );
  if (toolMsg) return serializeContent(toolMsg.content);
  return serializeContent(messages.at(-1)?.content ?? 'Done.');
};

@Injectable()
export class PromptDesignerToolsService {
  constructor(
    @Inject(PROMPT_DESIGNER_SERVICE)
    private readonly promptDesignerService: IPromptDesignerService,
  ) {}

  getTools(): StructuredToolInterface[] {
    return [
      tool(
        async ({ request }) => {
          const { userId } = getCurrentTaskInput<AppState>();
          const threadId = `prompt-designer:${userId}`;

          const result = await this.promptDesignerService.run(request, {
            threadId,
            userId,
          });

          return extractDesignerResult(result.messages);
        },
        {
          name: 'design_agent_task',
          description:
            'Delegate task prompt engineering to the Prompt Designer agent. Use for: ' +
            'analyzing a user request, breaking it down into structured tasks, generating ' +
            'system prompts with keywords, constraints, success criteria, and step-by-step ' +
            'plans for other AI agents to execute. ' +
            "If the designer asks clarifying questions, pass the user's answers back through this tool.",
          schema: z.object({
            request: z
              .string()
              .describe(
                "The user's raw request or follow-up answer that needs to be analyzed " +
                  'and transformed into a structured agent task. Include the full conversation context.',
              ),
          }),
        },
      ),
    ];
  }
}
