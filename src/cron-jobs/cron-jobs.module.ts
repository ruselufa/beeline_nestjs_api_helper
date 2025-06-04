import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BeelineApiCallModule } from '../beeline_api_call/beeline_api_call.module';
import { AbonentsUpdaterService } from './abonents-updater.service';
import { RecordsLoaderService } from './records-loader.service';
import { TranscriptionModule } from '../transcription/transcription.module';
import { TranscriptionTestService } from './transcription-test.service';
import { ConversationAnalyzerService } from './conversation-analyzer.service';
import { AiDeepseekModule } from '../ai_deepseek/ai_deepseek.module';
import { ExportGoogleSheetsService } from './export-google-sheets.service';
import { DatabaseModule } from '../database/database.module';
@Module({
  imports: [
    ScheduleModule.forRoot(),
    BeelineApiCallModule,
    DatabaseModule,
    TranscriptionModule,
    AiDeepseekModule
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