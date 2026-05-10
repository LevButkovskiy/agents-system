import { Body, Controller, Post } from '@nestjs/common';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('run')
  async run(@Body() body: { input: string; threadId: string }) {
    return this.aiService.run(body.input, body.threadId);
  }
}
