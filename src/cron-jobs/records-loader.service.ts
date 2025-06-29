import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AbonentRecord } from '../entities/beeline/abonent.record.entity';
import { Abonent } from '../entities/beeline/abonent.entity';
import { BeelineApiCallService } from '../beeline_api_call/beeline_api_call.service';
import { Cron } from '@nestjs/schedule';
import { Worker } from 'worker_threads';
import * as path from 'path';

function chunks<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

@Injectable()
export class RecordsLoaderService implements OnApplicationBootstrap {
  public isProcessing = false;
  public lastStartTime: Date | null = null;
  private worker: Worker | null = null;

  constructor(
    private readonly beelineApiCallService: BeelineApiCallService,
    @InjectRepository(Abonent)
    private readonly abonentRepository: Repository<Abonent>,
    @InjectRepository(AbonentRecord)
    private readonly abonentRecordRepository: Repository<AbonentRecord>,
  ) {}

  async onApplicationBootstrap() {
    console.log('RecordsLoaderService инициализирован. Загрузка записей начнется через 1 минуту после старта приложения.');
    
    // Запускаем загрузку записей через 1 минуту после старта приложения
    // setTimeout(async () => {
    //   console.log('Запуск первичной загрузки записей (через 1 минуту после старта)...');
    //   // Устанавливаем флаги в начальное состояние ПЕРЕД вызовом
    //   this.isProcessing = false;
    //   this.lastStartTime = null;
    //   await this.loadAllUsersRecords();
    // }, 60000); // 60000 мс = 1 минута
  }

  // Делаем cron на каждый день в 3:30 ночи
  @Cron('30 3 * * *')
  async loadAllUsersRecords() {
    if (this.isProcessing) {
      const runningTime = Date.now() - this.lastStartTime.getTime();
      console.warn(`Загрузка записей уже выполняется ${Math.floor(runningTime / 1000)} секунд, пропускаем запуск`);
      return;
    }

    this.isProcessing = true;
    this.lastStartTime = new Date();
    
    try {
      console.log('Запуск cron-задачи: загрузка записей всех пользователей');
      // Временно используем обычную обработку вместо worker
      await this.loadAllAbonentsRecords();
      console.log('Загрузка записей успешно завершена');
    } catch (error) {
      console.error('Ошибка выполнения загрузки записей:', error);
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
        console.log('Worker сообщение:', message);
        if (message.type === 'progress') {
          console.log(`Прогресс загрузки записей: ${message.data}`);
        } else if (message.type === 'complete') {
          console.log('Загрузка записей завершена в worker');
          this.worker?.terminate();
          this.worker = null;
          resolve(message.data);
        }
      });

      this.worker.on('error', (error) => {
        console.error('Ошибка в worker:', error);
        this.worker?.terminate();
        this.worker = null;
        reject(error);
      });

      this.worker.on('exit', (code) => {
        if (code !== 0) {
          console.error(`Worker завершился с кодом ${code}`);
          reject(new Error(`Worker завершился с кодом ${code}`));
        }
      });

      // Запускаем обработку в worker
      this.worker.postMessage({ type: 'start' });
    });
  }

  private async loadAllAbonentsRecords() {
    const abonents = await this.abonentRepository.find();
    console.log(`Найдено ${abonents.length} абонентов для загрузки записей`);

    for (const chunk of chunks(abonents, 5)) {
      await Promise.all(chunk.map(async (abonent) => {
        try {
          await this.loadAndSaveRecordsForUserFromLastRecord(abonent.userId);
          console.log(`Обработан абонент ${abonent.userId}`);
        } catch (err) {
          console.error(`Ошибка: ${abonent.userId}`, err);
        }
      }));
    }
    console.log('Загрузка записей для всех пользователей завершена');
  }

  async loadAllUsersRecordsFromLastRecord() {
    try {
      // Получаем всех абонентов
      const abonents = await this.abonentRepository.find();
      console.log(`Найдено ${abonents.length} абонентов для загрузки записей`);

      // Для каждого абонента загружаем записи с момента последней сохраненной
      for (const abonent of abonents) {
        try {
          await this.loadAndSaveRecordsForUserFromLastRecord(abonent.userId);
        } catch (error) {
          console.error(`Ошибка при загрузке записей для пользователя ${abonent.userId}:`, error);
          // Продолжаем с следующим пользователем даже если произошла ошибка
          continue;
        }
      }
    } catch (error) {
      console.error('Ошибка при загрузке записей для всех пользователей:', error);
    }
  }

  async loadAndSaveRecordsForUser(userId: string, dateFrom?: string, dateTo?: string) {
    const records = await this.beelineApiCallService.getAllRecordsByUserId(userId, dateFrom, dateTo);
    const abonent = await this.abonentRepository.findOne({ where: { userId } });

    for (const record of records) {
      // Проверка на дублирование по beelineId
      const exists = await this.abonentRecordRepository.findOne({
        where: { beelineId: record.id },
      });
      if (exists) {
        console.log(`Запись ${record.id} уже существует`);
        continue;
      };

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
      console.log(`Загружен и сохранен запись: ${record.id}`);
    }
    console.log(`Загружено и сохранено ${records.length} записей`);
  }

  private async getLastRecordDate(userId: string): Promise<string | undefined> {
    const lastRecord = await this.abonentRecordRepository.findOne({
      where: { abonent: { userId } },
      order: { date: 'DESC' },
    });

    return lastRecord 
      ? new Date(lastRecord.date.getTime() + 1000).toISOString()
      : undefined;
  }

  async loadAndSaveRecordsForUserFromLastRecord(userId: string, dateTo?: string) {
    const dateFrom = await this.getLastRecordDate(userId);
    const records = await this.beelineApiCallService.getAllRecordsByUserIdFromLastRecord(
      userId,
      dateFrom,
      dateTo
    );
    const abonent = await this.abonentRepository.findOne({ where: { userId } });

    if (!abonent) {
      console.log(`Абонент с userId ${userId} не найден`);
      return;
    }

    let savedCount = 0;
    for (const record of records) {
      // Проверка на дублирование по beelineId
      const exists = await this.abonentRecordRepository.findOne({
        where: { beelineId: record.id },
      });
      if (exists) {
        console.log(`Запись ${record.id} уже существует`);
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
      console.log(`Загружена и сохранена запись: ${record.id}`);
    }
    console.log(`Для пользователя ${userId} загружено и сохранено ${savedCount} новых записей`);
  }
} 