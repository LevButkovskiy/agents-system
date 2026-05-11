import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiModule } from './ai/ai.module';
import configuration from './configuration';
import { DatabaseModule } from './infrastructure/database.module';
import { TaskSchedulerModule } from './scheduler/task-scheduler.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [configuration],
    }),
    DatabaseModule,
    AiModule,
    TaskSchedulerModule,
  ],
})
export class AppModule {}
