import { MessagesValue, ReducedValue, StateSchema } from '@langchain/langgraph';
import { z } from 'zod';

export const TaskDesignSchema = z.object({
  originalRequest: z.string().describe('Исходный запрос пользователя'),
  goal: z.string().describe('Четкая формулировка цели задачи'),
  context: z.string().describe('Контекст, предпосылки и фоновая информация'),
  keywords: z
    .array(z.string())
    .describe('Ключевые слова и термины для фокусировки агента'),
  constraints: z.array(z.string()).describe('Ограничения, лимиты и запреты'),
  steps: z.array(z.string()).describe('Пошаговый план выполнения задачи'),
  expectedOutput: z.string().describe('Описание ожидаемого результата'),
  systemPrompt: z
    .string()
    .describe('Готовый системный промпт для агента-исполнителя'),
  successCriteria: z
    .array(z.string())
    .describe('Критерии успешного выполнения'),
  toolsNeeded: z
    .array(z.string())
    .describe('Рекомендуемые инструменты и навыки'),
});

export type TaskDesign = z.infer<typeof TaskDesignSchema>;

export const PromptDesignerState = new StateSchema({
  messages: MessagesValue,
  llmCalls: new ReducedValue(z.number().default(0), {
    reducer: (x, y) => x + y,
  }),
  userId: new ReducedValue(z.string().default(''), {
    reducer: (_, next) => next,
  }),
});

export type PromptDesignerState = typeof PromptDesignerState.State;
