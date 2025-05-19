import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BeelineApiCallModule } from '../beeline_api_call/beeline_api_call.module';
import { AbonentsUpdaterService } from './abonents-updater.service';
import { Abonent } from '../entities/abonent.entity';
import { AbonentRecord } from '../entities/abonent.record.entity';
import { RecordsLoaderService } from './records-loader.service';
import { TranscriptionModule } from '../transcription/transcription.module';
import { TranscriptionTestService } from './transcription-test.service';
import { ConversationAnalyzerService } from './conversation-analyzer.service';
import { AiDeepseekModule } from '../ai_deepseek/ai_deepseek.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BeelineApiCallModule,
    TypeOrmModule.forFeature([Abonent, AbonentRecord]),
    TranscriptionModule,
    AiDeepseekModule
  ],
  providers: [
    AbonentsUpdaterService,
    RecordsLoaderService,
    TranscriptionTestService,
    ConversationAnalyzerService
  ],
  exports: [
    AbonentsUpdaterService,
    RecordsLoaderService,
    TranscriptionTestService,
    ConversationAnalyzerService
  ]
})
export class CronJobsModule {} 