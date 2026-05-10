import { add } from './add';
import { divide } from './divide';
import { multiply } from './multiply';

const toolsByName = {
  [add.name]: add,
  [multiply.name]: multiply,
  [divide.name]: divide,
};

const tools = Object.values(toolsByName);

export { tools, toolsByName };
