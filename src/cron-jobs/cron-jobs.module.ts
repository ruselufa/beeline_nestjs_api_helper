import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BeelineApiCallModule } from '../beeline_api_call/beeline_api_call.module';
import { AbonentsUpdaterService } from './abonents-updater.service';
import { RecordsLoaderService } from './records-loader.service';
import { TranscriptionModule } from '../transcription/transcription.module';
import { TranscriptionTestService } from './transcription-test.service';
import { ConversationAnalyzerService } from './conversation-analyzer.service';
import { AiDeepseekModule } from '../ai_deepseek/ai_deepseek.module';
import { ExportGoogleSheetsService } from './export-google-sheets.service';
import { DatabaseModule } from '../database/database.module';
import { GoogleSheetsModule } from '../google-sheets/google-sheets.module';
import { AbonentRecord } from '../entities/beeline/abonent.record.entity';
import { AnalyzedAi } from '../entities/beeline/analyzed_ai.entity';
import { Abonent } from '../entities/beeline/abonent.entity';

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([AbonentRecord, AnalyzedAi, Abonent]),
    ScheduleModule.forRoot(),
    BeelineApiCallModule,
    TranscriptionModule,
    AiDeepseekModule,
    GoogleSheetsModule
  ],
  providers: [
    AbonentsUpdaterService,
    RecordsLoaderService,
    TranscriptionTestService,
    ConversationAnalyzerService,
    ExportGoogleSheetsService
  ],
  exports: [
    AbonentsUpdaterService,
    RecordsLoaderService,
    TranscriptionTestService,
    ConversationAnalyzerService,
    ExportGoogleSheetsService
  ]
})
export class CronJobsModule {} 