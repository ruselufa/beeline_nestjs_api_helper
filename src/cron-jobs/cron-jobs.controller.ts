import { Controller, Post, Get, Logger, HttpException, HttpStatus } from '@nestjs/common';
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
  async runAnalysis() {
    try {
      console.log('Ручной запуск анализа разговоров...');
      await this.conversationAnalyzerService.processFreshRecordsForAnalysis();
      return { message: 'Анализ разговоров успешно запущен' };
    } catch (error) {
      console.error('Ошибка при запуске анализа:', error);
      throw new HttpException(
        `Ошибка при запуске анализа: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('export-sheets')
  async runExportSheets() {
    try {
      console.log('Ручной запуск экспорта в Google Sheets...');
      await this.exportGoogleSheetsService.processExportToGoogleSheets();
      return { message: 'Экспорт в Google Sheets успешно запущен' };
    } catch (error) {
      console.error('Ошибка при запуске экспорта:', error);
      throw new HttpException(
        `Ошибка при запуске экспорта: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('status')
  async getStatus() {
    try {
      const status = this.cronJobsMonitorService.getJobsStatus();
      return status;
    } catch (error) {
      console.error('Ошибка при получении статуса:', error);
      throw new HttpException(
        `Ошибка при получении статуса: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('monitor')
  async getMonitorStatus() {
    try {
      const status = await this.cronJobsMonitorService.getDatabaseStats();
      return status;
    } catch (error) {
      console.error('Ошибка при получении мониторинга:', error);
      throw new HttpException(
        `Ошибка при получении мониторинга: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
} 