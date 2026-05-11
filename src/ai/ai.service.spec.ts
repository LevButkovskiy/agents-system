import { MemorySaver } from '@langchain/langgraph';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { CHECKPOINTER } from './ai.constants';
import { AiService } from './ai.service';
import { ToolsService } from './tools';

describe('AiService', () => {
  let service: AiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) =>
              key === 'model' ? 'anthropic' : undefined,
            ),
            getOrThrow: jest.fn(() => 'test-api-key'),
          },
        },
        { provide: CHECKPOINTER, useValue: new MemorySaver() },
        { provide: ToolsService, useValue: { getTools: jest.fn(() => []) } },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
