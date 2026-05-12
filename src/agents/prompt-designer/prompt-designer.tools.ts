import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { TaskDesignSchema } from './prompt-designer.state';

export const askClarifyingQuestionTool = tool(
  ({ questions }) => {
    return questions.map((q, i) => `${i + 1}. ${q}`).join('\n');
  },
  {
    name: 'ask_clarifying_question',
    description:
      'Ask the user 1-3 concise clarifying questions when the request is ambiguous, ' +
      'underspecified, or lacks critical details. Use this tool INSTEAD of writing questions ' +
      'in plain text. This is the ONLY valid way to ask clarifying questions.',
    schema: z.object({
      questions: z
        .array(z.string())
        .min(1)
        .max(3)
        .describe('1-3 concise targeted clarifying questions'),
    }),
  },
);

export const submitTaskDesignTool = tool(
  (design) => {
    return JSON.stringify(design, null, 2);
  },
  {
    name: 'submit_task_design',
    description:
      'SUBMIT the final structured task design. This is the ONLY valid way to deliver your work. ' +
      'Use this tool IMMEDIATELY when you have enough information to build a complete design. ' +
      'NEVER write the design as plain text in the chat — always call this tool. ' +
      'NEVER say the design is ready, never summarize it, never preview it — just CALL this tool. ' +
      'Do NOT use this tool if you still need to ask clarifying questions.',
    schema: TaskDesignSchema,
  },
);
