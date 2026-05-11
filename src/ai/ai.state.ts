import { MessagesValue, ReducedValue, StateSchema } from '@langchain/langgraph';
import { z } from 'zod';

const ImageInputSchema = z.object({
  data: z.string(),
  mimeType: z.string(),
});

export type ImageInput = z.infer<typeof ImageInputSchema>;

const ImageArtifactSchema = z.object({
  type: z.literal('image'),
  mimeType: z.string(),
  base64: z.string(),
});

const FileArtifactSchema = z.object({
  type: z.literal('file'),
  mimeType: z.string(),
  filename: z.string(),
  base64: z.string(),
});

const TextArtifactSchema = z.object({
  type: z.literal('text'),
  mimeType: z.string(),
  content: z.string(),
  filename: z.string().optional(),
});

export const ArtifactSchema = z.discriminatedUnion('type', [
  ImageArtifactSchema,
  FileArtifactSchema,
  TextArtifactSchema,
]);

export type Artifact = z.infer<typeof ArtifactSchema>;
export type ImageArtifact = z.infer<typeof ImageArtifactSchema>;
export type FileArtifact = z.infer<typeof FileArtifactSchema>;
export type TextArtifact = z.infer<typeof TextArtifactSchema>;

export const State = new StateSchema({
  messages: MessagesValue,
  llmCalls: new ReducedValue(z.number().default(0), {
    reducer: (x, y) => x + y,
  }),
  artifacts: new ReducedValue(z.array(ArtifactSchema).default([]), {
    reducer: (_x, y) => y,
  }),
  contextImages: new ReducedValue(z.array(ImageInputSchema).default([]), {
    reducer: (_x, y) => y,
  }),
  userId: new ReducedValue(z.string().default(''), {
    reducer: (_, next) => next,
  }),
});

export type AppState = typeof State.State;
