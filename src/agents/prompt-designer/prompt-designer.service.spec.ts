import { MemorySaver } from '@langchain/langgraph';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { CHECKPOINTER } from '../../infrastructure/infrastructure.constants';
import { PromptDesignerService } from './prompt-designer.service';
import { PROMPT_DESIGNER_AGENT_TOOLS_TOKEN } from './tools';

describe('PromptDesignerService', () => {
  let service: PromptDesignerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromptDesignerService,
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
        {
          provide: PROMPT_DESIGNER_AGENT_TOOLS_TOKEN,
          useValue: [],
        },
      ],
    }).compile();

    service = module.get<PromptDesignerService>(PromptDesignerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
