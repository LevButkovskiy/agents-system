import { ToolMessage } from '@langchain/core/messages';
import { RunnableConfig } from '@langchain/core/runnables';
import { StructuredToolInterface } from '@langchain/core/tools';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { AppState, Artifact, ArtifactSchema } from '../ai.state';

function artifactConfirmation(artifact: Artifact): string {
  switch (artifact.type) {
    case 'image':
      return 'Image generated successfully and will be sent to the user.';
    case 'file':
      return `File "${artifact.filename}" generated successfully and will be sent to the user.`;
    case 'text':
      return `Text content${artifact.filename ? ` "${artifact.filename}"` : ''} generated successfully and will be sent to the user.`;
  }
}

export function createToolNode(tools: StructuredToolInterface[]) {
  const prebuiltNode = new ToolNode(tools);

  return async function toolNode(
    state: AppState,
    config: RunnableConfig,
  ): Promise<Partial<AppState>> {
    const result = (await prebuiltNode.invoke(state, config)) as {
      messages: ToolMessage[];
    };

    const newArtifacts: Artifact[] = [];

    const messages = result.messages.map((msg) => {
      if (!ToolMessage.isInstance(msg) || typeof msg.content !== 'string') {
        return msg;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(msg.content);
      } catch {
        return msg;
      }

      const artifact = ArtifactSchema.safeParse(parsed);
      if (!artifact.success) {
        return msg;
      }

      newArtifacts.push(artifact.data);
      return new ToolMessage({
        tool_call_id: msg.tool_call_id,
        content: artifactConfirmation(artifact.data),
      });
    });

    return {
      messages,
      ...(newArtifacts.length > 0 && { artifacts: newArtifacts }),
    };
  };
}
