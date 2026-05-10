import { tool } from '@langchain/core/tools';
import { z } from 'zod';

const divide = tool(({ a, b }: { a: number; b: number }) => a / b, {
  name: 'divide',
  description: 'Divide two numbers',
  schema: z.object({
    a: z.number().describe('First number'),
    b: z.number().describe('Second number'),
  }),
});

export { divide };
