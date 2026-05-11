import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { GeminiService } from '../../connectors/gemini/gemini.service';

export const createImageGeneratorTool = (geminiService: GeminiService) =>
  tool(
    async ({ prompt }: { prompt: string }) => {
      const result = await geminiService.generateImage(prompt);

      if (!result) throw new Error('Image generation failed');

      return JSON.stringify({
        type: 'image',
        mimeType: result.mimeType,
        base64: result.base64,
      });
    },
    {
      name: 'image_generator',
      description: 'Generates an image from a text prompt.',
      schema: z.object({
        prompt: z
          .string()
          .describe('Text description of the image to generate'),
      }),
    },
  );
