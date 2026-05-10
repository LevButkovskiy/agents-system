import { currentDate } from './current-date';

const toolsByName = {
  [currentDate.name]: currentDate,
};

const tools = Object.values(toolsByName);

export { tools, toolsByName };
