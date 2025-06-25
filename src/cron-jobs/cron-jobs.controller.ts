import { Controller, Post, Get, Logger } from '@nestjs/common';
import { AbonentsUpdaterService } from './abonents-updater.service';
import { RecordsLoaderService } from './records-loader.service';
import { TranscriptionTestService } from './transcription-test.service';
import { ConversationAnalyzerService } from './conversation-analyzer.service';
import { ExportGoogleSheetsService } from './export-google-sheets.service';
import { CronJobsMonitorService } from './cron-jobs-monitor.service';

@Controller('cron-jobs')
export class CronJobsController {
  private readonly logger = new Logger(CronJobsController.name);

  constructor(
    private readonly abonentsUpdaterService: AbonentsUpdaterService,
    private readonly recordsLoaderService: RecordsLoaderService,
    private readonly transcriptionTestService: TranscriptionTestService,
    private readonly conversationAnalyzerService: ConversationAnalyzerService,
    private readonly exportGoogleSheetsService: ExportGoogleSheetsService,
    private readonly cronJobsMonitorService: CronJobsMonitorService,
  ) {}

  @Post('update-abonents')
  async updateAbonents() {
    this.logger.log('Ручной запуск обновления абонентов');
    await this.abonentsUpdaterService.updateAbonents();
    return { message: 'Обновление абонентов запущено' };
  }

  @Post('load-records')
  async loadRecords() {
    this.logger.log('Ручной запуск загрузки записей');
    await this.recordsLoaderService.loadAllUsersRecords();
    return { message: 'Загрузка записей запущена' };
  }

  @Post('transcribe')
  async transcribe() {
    this.logger.log('Ручной запуск транскрибации');
    await this.transcriptionTestService.processFreshRecordsForTranscription();
    return { message: 'Транскрибация запущена' };
  }

  @Post('analyze')
  async analyze() {
    this.logger.log('Ручной запуск анализа разговоров');
    await this.conversationAnalyzerService.processRecordsForAnalysis();
    return { message: 'Анализ разговоров запущен' };
  }

  @Post('export-sheets')
  async exportSheets() {
    this.logger.log('Ручной запуск экспорта в Google Sheets');
    await this.exportGoogleSheetsService.processExportToGoogleSheets();
    return { message: 'Экспорт в Google Sheets запущен' };
  }

  @Get('status')
  async getStatus() {
    return {
      message: 'Cron-jobs статус',
      services: {
        abonentsUpdater: 'Активен',
        recordsLoader: 'Активен', 
        transcriptionTest: 'Активен',
        conversationAnalyzer: 'Активен',
        exportGoogleSheets: 'Активен'
      },
      schedules: {
        abonentsUpdater: 'При старте приложения',
        recordsLoader: 'При старте + 1 минута + каждый день в 3:30',
        transcriptionTest: 'Каждые 30 минут',
        conversationAnalyzer: 'Каждые 15 минут',
        exportGoogleSheets: 'Каждый час'
      }
    };
  }

  @Get('monitor')
  async getMonitorStatus() {
    this.logger.log('Запрос статуса мониторинга');
    const status = await this.cronJobsMonitorService.getSystemStatus();
    return {
      message: 'Статус мониторинга системы',
      timestamp: new Date().toISOString(),
      ...status
    };
  }

  @Get('monitor/detailed')
  async getDetailedMonitorStatus() {
    this.logger.log('Запрос детального статуса мониторинга');
    const status = await this.cronJobsMonitorService.getDetailedStatus();
    return {
      message: 'Детальный статус мониторинга системы',
      timestamp: new Date().toISOString(),
      ...status
    };
  }
} 