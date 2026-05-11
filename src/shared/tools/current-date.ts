import { tool } from '@langchain/core/tools';

export const currentDate = tool(
  () => {
    const now = new Date();
    return now.toISOString();
  },
  {
    name: 'current_date',
    description:
      'Returns the current date and time in ISO 8601 format. ' +
      'Use this tool whenever the user asks about today, the current date, ' +
      'what day it is, or any relative date reference such as "tomorrow", ' +
      '"next week", "yesterday", "in 3 days", "this month", etc. ' +
      'Always call this tool first before doing any date arithmetic.',
  },
);
