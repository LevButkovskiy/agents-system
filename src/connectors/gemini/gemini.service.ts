import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface GeminiImageInput {
  data: string;
  mimeType: string;
}

type GeminiPart =
  | { text: string }
  | { inlineData: { data: string; mimeType: string } };

type GeminiContent = { parts: GeminiPart[] };

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
};

@Injectable()
export class GeminiService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.proxyapi.ru/google/v1beta/models';
  private readonly IMAGE_MODEL = 'gemini-2.5-flash-image';

  constructor(configService: ConfigService) {
    this.apiKey = configService.getOrThrow<string>('gemini.apiKey');
  }

  async generateImage(
    prompt: string,
  ): Promise<{ base64: string; mimeType: string } | null> {
    const json = await this.generateContent(this.IMAGE_MODEL, [
      { parts: [{ text: prompt }] },
    ]);
    return this.extractImagePart(json);
  }

  async editImage(
    prompt: string,
    images: GeminiImageInput[],
  ): Promise<{ base64: string; mimeType: string } | null> {
    const parts: GeminiPart[] = [
      { text: prompt },
      ...images.map((img) => ({
        inlineData: { data: img.data, mimeType: img.mimeType },
      })),
    ];
    const json = await this.generateContent(this.IMAGE_MODEL, [{ parts }]);
    return this.extractImagePart(json);
  }

  private extractImagePart(
    json: GeminiResponse,
  ): { base64: string; mimeType: string } | null {
    const imagePart = json.candidates?.[0]?.content?.parts?.find(
      (p): p is { inlineData: { data: string; mimeType: string } } =>
        'inlineData' in p && !!p.inlineData,
    );
    return imagePart
      ? {
          base64: imagePart.inlineData.data,
          mimeType: imagePart.inlineData.mimeType,
        }
      : null;
  }

  private async generateContent(
    model: string,
    contents: GeminiContent[],
  ): Promise<GeminiResponse> {
    const res = await fetch(`${this.baseUrl}/${model}:generateContent`, {
      method: 'POST',
      body: JSON.stringify({ contents }),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Gemini API error: ${res.status} ${res.statusText}`);
    }

    return res.json() as Promise<GeminiResponse>;
  }
}
