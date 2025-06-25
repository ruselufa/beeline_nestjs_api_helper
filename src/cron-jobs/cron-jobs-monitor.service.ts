import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AbonentRecord } from '../entities/beeline/abonent.record.entity';
import { MoreThan } from 'typeorm';
import { AbonentsUpdaterService } from './abonents-updater.service';
import { RecordsLoaderService } from './records-loader.service';
import { TranscriptionTestService } from './transcription-test.service';
import { ConversationAnalyzerService } from './conversation-analyzer.service';
import { ExportGoogleSheetsService } from './export-google-sheets.service';

@Injectable()
export class CronJobsMonitorService {
  private readonly logger = new Logger(CronJobsMonitorService.name);

  constructor(
    @InjectRepository(AbonentRecord)
    private readonly abonentRecordRepository: Repository<AbonentRecord>,
    private readonly abonentsUpdaterService: AbonentsUpdaterService,
    private readonly recordsLoaderService: RecordsLoaderService,
    private readonly transcriptionTestService: TranscriptionTestService,
    private readonly conversationAnalyzerService: ConversationAnalyzerService,
    private readonly exportGoogleSheetsService: ExportGoogleSheetsService,
  ) {}

  async getDatabaseStats() {
    try {
      const totalRecords = await this.abonentRecordRepository.count();
      const recordsWithTranscription = await this.abonentRecordRepository.count({
        where: { transcribe_processed: true }
      });
      const recordsWithAnalysis = await this.abonentRecordRepository.count({
        where: { deepseek_analysed: true }
      });

      return {
        totalRecords,
        recordsWithTranscription,
        recordsWithAnalysis,
        transcriptionProgress: totalRecords > 0 ? Math.round((recordsWithTranscription / totalRecords) * 100) : 0,
        analysisProgress: totalRecords > 0 ? Math.round((recordsWithAnalysis / totalRecords) * 100) : 0,
      };
    } catch (error) {
      this.logger.error('Ошибка при получении статистики базы данных:', error);
      return null;
    }
  }

  getJobsStatus() {
    const now = new Date();
    
    return {
      timestamp: now.toISOString(),
      jobs: {
        abonentsUpdater: {
          name: 'Обновление абонентов',
          status: this.getJobStatus(this.abonentsUpdaterService),
          schedule: 'При старте приложения',
          description: 'Загружает и обновляет список абонентов из API Beeline',
          protection: 'isProcessing защита',
          lastRun: this.getLastRunInfo(this.abonentsUpdaterService),
        },
        recordsLoader: {
          name: 'Загрузка записей',
          status: this.getJobStatus(this.recordsLoaderService),
          schedule: 'При старте + 1 минута, затем ежедневно в 3:30',
          description: 'Загружает записи звонков из API Beeline',
          protection: 'isProcessing защита',
          lastRun: this.getLastRunInfo(this.recordsLoaderService),
        },
        transcription: {
          name: 'Транскрибация',
          status: this.getJobStatus(this.transcriptionTestService),
          schedule: 'Каждые 30 минут',
          description: 'Транскрибирует аудиофайлы записей звонков',
          protection: 'isProcessing защита',
          lastRun: this.getLastRunInfo(this.transcriptionTestService),
        },
        conversationAnalysis: {
          name: 'Анализ разговоров',
          status: this.getJobStatus(this.conversationAnalyzerService),
          schedule: 'Каждые 15 минут',
          description: 'Анализирует транскрибированные разговоры с помощью AI',
          protection: 'isProcessing защита',
          lastRun: this.getLastRunInfo(this.conversationAnalyzerService),
        },
        exportGoogleSheets: {
          name: 'Экспорт в Google Sheets',
          status: this.getJobStatus(this.exportGoogleSheetsService),
          schedule: 'Каждый час',
          description: 'Экспортирует обработанные данные в Google Sheets',
          protection: 'isProcessing защита',
          lastRun: this.getLastRunInfo(this.exportGoogleSheetsService),
        },
      },
      system: {
        totalJobs: 5,
        runningJobs: this.getRunningJobsCount(),
        protectionStatus: 'Все джобы защищены от параллельных запусков',
        recommendations: this.getRecommendations(),
      }
    };
  }

  private getJobStatus(service: any): string {
    if (service.isProcessing) {
      const runningTime = service.lastStartTime ? 
        Math.floor((Date.now() - service.lastStartTime.getTime()) / 1000) : 0;
      return `Выполняется (${runningTime} сек)`;
    }
    return 'Ожидает';
  }

  private getLastRunInfo(service: any): any {
    if (service.lastStartTime) {
      const runningTime = service.isProcessing ? 
        Math.floor((Date.now() - service.lastStartTime.getTime()) / 1000) : null;
      
      return {
        startTime: service.lastStartTime.toISOString(),
        runningTime: runningTime,
        isCurrentlyRunning: service.isProcessing,
      };
    }
    return null;
  }

  private getRunningJobsCount(): number {
    let count = 0;
    if (this.abonentsUpdaterService.isProcessing) count++;
    if (this.recordsLoaderService.isProcessing) count++;
    if (this.transcriptionTestService.isProcessing) count++;
    if (this.conversationAnalyzerService.isProcessing) count++;
    if (this.exportGoogleSheetsService.isProcessing) count++;
    return count;
  }

  private getRecommendations(): string[] {
    const recommendations = [];
    
    const runningJobs = this.getRunningJobsCount();
    if (runningJobs > 2) {
      recommendations.push('⚠️ Много джоб выполняются одновременно. Проверьте производительность системы.');
    }
    
    if (runningJobs === 0) {
      recommendations.push('✅ Все джобы завершены. Система работает нормально.');
    }

    // Проверяем длительно выполняющиеся джобы
    const services = [
      { name: 'Обновление абонентов', service: this.abonentsUpdaterService },
      { name: 'Загрузка записей', service: this.recordsLoaderService },
      { name: 'Транскрибация', service: this.transcriptionTestService },
      { name: 'Анализ разговоров', service: this.conversationAnalyzerService },
      { name: 'Экспорт в Google Sheets', service: this.exportGoogleSheetsService },
    ];

    services.forEach(({ name, service }) => {
      if (service.isProcessing && service.lastStartTime) {
        const runningTime = Math.floor((Date.now() - service.lastStartTime.getTime()) / 1000);
        if (runningTime > 300) { // 5 минут
          recommendations.push(`⚠️ ${name} выполняется более 5 минут (${runningTime} сек). Возможны проблемы.`);
        }
      }
    });

    return recommendations;
  }
} 