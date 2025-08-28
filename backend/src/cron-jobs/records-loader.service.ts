import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AbonentRecord } from '../entities/beeline/abonent.record.entity';
import { Abonent } from '../entities/beeline/abonent.entity';
import { BeelineApiCallService } from '../beeline_api_call/beeline_api_call.service';
import { Cron } from '@nestjs/schedule';
import { Worker } from 'worker_threads';
import * as path from 'path';
import { BaseCronService } from './base-cron.service';
import { Logger } from '@nestjs/common';

function chunks<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

@Injectable()
export class RecordsLoaderService extends BaseCronService implements OnApplicationBootstrap {
  protected readonly logger = new Logger(RecordsLoaderService.name);
  public isProcessing = false;
  public lastStartTime: Date | null = null;
  private worker: Worker | null = null;

  constructor(
    private readonly beelineApiCallService: BeelineApiCallService,
    @InjectRepository(Abonent)
    private readonly abonentRepository: Repository<Abonent>,
    @InjectRepository(AbonentRecord)
    private readonly abonentRecordRepository: Repository<AbonentRecord>,
  ) {
    super();
  }

  async onApplicationBootstrap() {
    this.logger.log('RecordsLoaderService инициализирован. Загрузка записей начнется через 1 минуту после старта приложения.');
    
    // Запускаем загрузку записей через 1 минуту после старта приложения
    setTimeout(async () => {
      this.logger.log('Запуск первичной загрузки записей (через 1 минуту после старта)...');
      // Устанавливаем флаги в начальное состояние ПЕРЕД вызовом
      this.isProcessing = false;
      this.lastStartTime = null;
      await this.loadAllUsersRecords();
    }, 1000); // 60000 мс = 1 минута
  }

  // Делаем загрузку каждый 15 минут
  @Cron('*/15 * * * *')
  async loadAllUsersRecords() {
    if (this.isProcessing) {
      const runningTime = Date.now() - this.lastStartTime.getTime();
      this.logger.warn(`Загрузка записей уже выполняется ${Math.floor(runningTime / 1000)} секунд, пропускаем запуск`);
      return;
    }

    this.isProcessing = true;
    this.lastStartTime = new Date();
    
    try {
      this.logger.log('Запуск cron-задачи: загрузка записей всех пользователей');
      // Временно используем обычную обработку вместо worker
      const results = await this.loadAllAbonentsRecords();
      this.logger.log(`Загрузка записей завершена. Успешно: ${results.success}, Ошибок: ${results.errors}`);
    } catch (error) {
      this.logger.error('Критическая ошибка выполнения загрузки записей:', error);
    } finally {
      this.isProcessing = false;
      this.lastStartTime = null;
    }
  }

  async loadRecordsWithWorker() {
    return new Promise((resolve, reject) => {
      // Определяем путь к worker файлу в зависимости от окружения
      const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
      const workerPath = isDev 
        ? path.join(process.cwd(), 'src', 'cron-jobs', 'records-worker.js')
        : path.join(__dirname, 'records-worker.js');

      // Создаем worker для загрузки записей
      this.worker = new Worker(workerPath, {
        workerData: {
          // Передаем необходимые данные в worker
        }
      });

      this.worker.on('message', (message) => {
        this.logger.log('Worker сообщение:', message);
        if (message.type === 'progress') {
          this.logger.log(`Прогресс загрузки записей: ${message.data}`);
        } else if (message.type === 'complete') {
          this.logger.log('Загрузка записей завершена в worker');
          this.worker?.terminate();
          this.worker = null;
          resolve(message.data);
        }
      });

      this.worker.on('error', (error) => {
        this.logger.error('Ошибка в worker:', error);
        this.worker?.terminate();
        this.worker = null;
        reject(error);
      });

      this.worker.on('exit', (code) => {
        if (code !== 0) {
          this.logger.error(`Worker завершился с кодом ${code}`);
          reject(new Error(`Worker завершился с кодом ${code}`));
        }
      });

      // Запускаем обработку в worker
      this.worker.postMessage({ type: 'start' });
    });
  }

  private async loadAllAbonentsRecords() {
    try {
      const abonents = await this.abonentRepository.find();
      this.logger.log(`Найдено ${abonents.length} абонентов для загрузки записей`);

      if (abonents.length === 0) {
        this.logger.log('Нет абонентов для обработки');
        return { success: 0, errors: 0, total: 0 };
      }

      // Используем пакетную обработку с обработкой ошибок
      return await this.processBatchWithErrorHandling(
        abonents,
        async (abonent) => {
          await this.loadAndSaveRecordsForUserFromLastRecord(abonent.userId);
        },
        5, // размер пакета
        'абонент'
      );
      
    } catch (error) {
      this.logger.error('Ошибка при получении списка абонентов:', error);
      throw error;
    }
  }

  async loadAllUsersRecordsFromLastRecord() {
    try {
      // Получаем всех абонентов
      const abonents = await this.abonentRepository.find();
      this.logger.log(`Найдено ${abonents.length} абонентов для загрузки записей`);

      if (abonents.length === 0) {
        this.logger.log('Нет абонентов для обработки');
        return { success: 0, errors: 0, total: 0 };
      }

      // Для каждого абонента загружаем записи с момента последней сохраненной
      return await this.processWithErrorHandling(
        abonents,
        async (abonent) => {
          await this.loadAndSaveRecordsForUserFromLastRecord(abonent.userId);
        },
        'абонент'
      );
      
    } catch (error) {
      this.logger.error('Ошибка при загрузке записей для всех пользователей:', error);
      throw error;
    }
  }

  async loadAndSaveRecordsForUser(userId: string, dateFrom?: string, dateTo?: string) {
    try {
      const records = await this.beelineApiCallService.getAllRecordsByUserId(userId, dateFrom, dateTo);
      const abonent = await this.abonentRepository.findOne({ where: { userId } });

      if (!abonent) {
        throw new Error(`Абонент с userId ${userId} не найден`);
      }

      let savedCount = 0;
      let errorCount = 0;

      for (const record of records) {
        try {
          // Проверка на дублирование по beelineId
          const exists = await this.abonentRecordRepository.findOne({
            where: { beelineId: record.id },
          });
          
          if (exists) {
            this.logger.log(`Запись ${record.id} уже существует`);
            continue;
          }

          const entity = this.abonentRecordRepository.create({
            beelineId: record.id,
            beelineExternalId: record.externalId,
            callId: record.callId || null,
            phone: record.phone,
            direction: record.direction,
            date: new Date(Number(record.date)), // если приходит timestamp
            duration: record.duration,
            fileSize: record.fileSize,
            comment: record.comment || '',
            abonent: abonent,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          
          await this.abonentRecordRepository.save(entity);
          savedCount++;
          this.logger.log(`✅ Загружен и сохранен запись: ${record.id}`);
          
        } catch (error) {
          errorCount++;
          this.logger.error(`❌ Ошибка при обработке записи ${record.id}: ${error.message}`);
          this.logErrorDetails(error, record);
          
          // Продолжаем с следующей записью
          continue;
        }
      }
      
      this.logger.log(`📊 Загрузка завершена для пользователя ${userId}. Успешно: ${savedCount}, Ошибок: ${errorCount}`);
      return { savedCount, errorCount, total: records.length };
      
    } catch (error) {
      this.logger.error(`❌ Ошибка при загрузке записей для пользователя ${userId}: ${error.message}`);
      throw error;
    }
  }

  private async getLastRecordDate(userId: string): Promise<string | undefined> {
    try {
      const lastRecord = await this.abonentRecordRepository.findOne({
        where: { abonent: { userId } },
        order: { date: 'DESC' },
      });

      return lastRecord 
        ? new Date(lastRecord.date.getTime() + 1000).toISOString()
        : undefined;
    } catch (error) {
      this.logger.error(`❌ Ошибка при получении даты последней записи для ${userId}: ${error.message}`);
      return undefined;
    }
  }

  async loadAndSaveRecordsForUserFromLastRecord(userId: string, dateTo?: string) {
    try {
      const dateFrom = await this.getLastRecordDate(userId);
      const records = await this.beelineApiCallService.getAllRecordsByUserIdFromLastRecord(
        userId,
        dateFrom,
        dateTo
      );
      
      const abonent = await this.abonentRepository.findOne({ where: { userId } });

      if (!abonent) {
        this.logger.warn(`Абонент с userId ${userId} не найден`);
        return { savedCount: 0, errorCount: 0, total: 0 };
      }

      if (records.length === 0) {
        this.logger.log(`Нет новых записей для пользователя ${userId}`);
        return { savedCount: 0, errorCount: 0, total: 0 };
      }

      let savedCount = 0;
      let errorCount = 0;

      // Обрабатываем записи с обработкой ошибок
      for (const record of records) {
        try {
          // Проверка на дублирование по beelineId
          const exists = await this.abonentRecordRepository.findOne({
            where: { beelineId: record.id },
          });
          
          if (exists) {
            this.logger.log(`Запись ${record.id} уже существует`);
            continue;
          }

          const entity = this.abonentRecordRepository.create({
            beelineId: record.id,
            beelineExternalId: record.externalId,
            callId: record.callId || null,
            phone: record.phone,
            direction: record.direction,
            date: new Date(Number(record.date)),
            duration: record.duration,
            fileSize: record.fileSize,
            comment: record.comment || '',
            abonent: abonent,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          
          await this.abonentRecordRepository.save(entity);
          savedCount++;
          this.logger.log(`✅ Загружена и сохранена запись: ${record.id}`);
          
        } catch (error) {
          errorCount++;
          this.logger.error(`❌ Ошибка при обработке записи ${record.id}: ${error.message}`);
          this.logErrorDetails(error, record);
          
          // Продолжаем с следующей записью
          continue;
        }
      }
      
      this.logger.log(`📊 Для пользователя ${userId} загружено и сохранено ${savedCount} новых записей, ошибок: ${errorCount}`);
      return { savedCount, errorCount, total: records.length };
      
    } catch (error) {
      this.logger.error(`❌ Ошибка при загрузке записей для пользователя ${userId}: ${error.message}`);
      this.logErrorDetails(error, { userId });
      
      // Возвращаем пустой результат при ошибке, но не прерываем весь процесс
      return { savedCount: 0, errorCount: 1, total: 0 };
    }
  }
} 