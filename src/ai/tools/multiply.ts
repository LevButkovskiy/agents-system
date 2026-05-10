import { tool } from '@langchain/core/tools';
import { z } from 'zod';

const multiply = tool(({ a, b }: { a: number; b: number }) => a * b, {
  name: 'multiply',
  description: 'Multiply two numbers',
  schema: z.object({
    a: z.number().describe('First number'),
    b: z.number().describe('Second number'),
  }),
});

export { multiply };
