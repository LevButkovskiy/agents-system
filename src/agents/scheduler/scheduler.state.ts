import { MessagesValue, ReducedValue, StateSchema } from '@langchain/langgraph';
import { z } from 'zod';

export const SchedulerState = new StateSchema({
  messages: MessagesValue,
  llmCalls: new ReducedValue(z.number().default(0), {
    reducer: (x, y) => x + y,
  }),
  userId: new ReducedValue(z.string().default(''), {
    reducer: (_, next) => next,
  }),
});

export type SchedulerState = typeof SchedulerState.State;
