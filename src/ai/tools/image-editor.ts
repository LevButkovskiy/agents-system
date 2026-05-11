import { tool } from '@langchain/core/tools';
import { getCurrentTaskInput } from '@langchain/langgraph';
import { z } from 'zod';
import { GeminiService } from '../../connectors/gemini/gemini.service';
import { AppState } from '../state';

export const IMAGE_EDITOR_TOOL_NAME = 'image_editor' as const;

export const createImageEditorTool = (geminiService: GeminiService) =>
  tool(
    async ({ prompt }: { prompt: string }) => {
      const state = getCurrentTaskInput<AppState>();
      const images = state?.contextImages ?? [];

      if (!images.length) throw new Error('No images in conversation context');

      const result = await geminiService.editImage(prompt, images);

      if (!result) throw new Error('Image editing failed');

      return JSON.stringify({
        type: 'image',
        mimeType: result.mimeType,
        base64: result.base64,
      });
    },
    {
      name: IMAGE_EDITOR_TOOL_NAME,
      description:
        'Creates a new image based on the images the user sent in this conversation and a text prompt. ' +
        'The images are taken from context automatically — only provide a prompt describing what to do. ' +
        'Use this when the user has shared one or more photos and wants to edit, remix, ' +
        'combine, or generate something new based on them.',
      schema: z.object({
        prompt: z
          .string()
          .describe('Instruction for how to create or transform the new image'),
      }),
    },
  );
