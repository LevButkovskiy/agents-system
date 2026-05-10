import { ToolNode } from '@langchain/langgraph/prebuilt';
import { tools } from '../tools';

export const createToolNode = () => new ToolNode(tools);
