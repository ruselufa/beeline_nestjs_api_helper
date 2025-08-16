import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TranscriptionService } from '../transcription/transcription.service';
import { BeelineApiCallService } from '../beeline_api_call/beeline_api_call.service';
import { AbonentRecord } from '../entities/beeline/abonent.record.entity';
import * as path from 'path';
import * as fs from 'fs';
import { MoreThan, Repository as TypeOrmRepository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { Worker } from 'worker_threads';
import { BaseCronService } from './base-cron.service';
import { Logger } from '@nestjs/common';

@Injectable()
export class TranscriptionTestService extends BaseCronService implements OnApplicationBootstrap {
  protected readonly logger = new Logger(TranscriptionTestService.name);
  public isProcessing = false;
  public lastStartTime: Date | null = null;
  private worker: Worker | null = null;

  constructor(
    private readonly transcriptionService: TranscriptionService,
    private readonly beelineApiCallService: BeelineApiCallService,
    @InjectRepository(AbonentRecord)
    private readonly abonentRecordRepository: TypeOrmRepository<AbonentRecord>,
  ) {
    super();
  }

  async onApplicationBootstrap() {
    this.logger.log('TranscriptionTestService инициализирован. Первый запуск транскрибации через 2 минуты.');
    
    // Запускаем транскрибацию через 2 минуты после старта приложения
    setTimeout(async () => {
      this.logger.log('Запуск первичной транскрибации (через 2 минуты после старта)...');
      // Устанавливаем флаги в начальное состояние ПЕРЕД вызовом
      this.isProcessing = false;
      this.lastStartTime = null;
      await this.processTranscription();
    }, 30000); // 30000 мс = 30 секунд
  }

  // Запускаем транскрибацию каждый час
  @Cron('0 * * * *')
  async processTranscription() {
    if (this.isProcessing) {
      const runningTime = Date.now() - this.lastStartTime.getTime();
      this.logger.warn(`Транскрибация уже выполняется ${Math.floor(runningTime / 1000)} секунд, пропускаем запуск`);
      return;
    }

    this.isProcessing = true;
    this.lastStartTime = new Date();
    
    try {
      this.logger.log('Запуск cron-задачи: обработка транскрибации');
      // Временно используем обычную обработку вместо worker
      const results = await this.processFreshRecordsForTranscription();
      this.logger.log(`Транскрибация завершена. Успешно: ${results.success}, Ошибок: ${results.errors}`);
    } catch (error) {
      this.logger.error('Критическая ошибка выполнения транскрибации:', error);
    } finally {
      this.isProcessing = false;
      this.lastStartTime = null;
    }
  }

  async processTranscriptionWithWorker() {
    return new Promise((resolve, reject) => {
      // Определяем путь к worker файлу в зависимости от окружения
      const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
      const workerPath = isDev 
        ? path.join(process.cwd(), 'src', 'cron-jobs', 'transcription-worker.js')
        : path.join(__dirname, 'transcription-worker.js');

      // Создаем worker для транскрибации
      this.worker = new Worker(workerPath, {
        workerData: {
          // Передаем необходимые данные в worker
        }
      });

      this.worker.on('message', (message) => {
        this.logger.log('Worker сообщение:', message);
        if (message.type === 'progress') {
          this.logger.log(`Прогресс транскрибации: ${message.data}`);
        } else if (message.type === 'complete') {
          this.logger.log('Транскрибация завершена в worker');
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

  async processFreshRecordsForTranscription() {
    const startTime = Date.now();
    
    try {
      // Получаем общее количество записей для обработки (только длинные)
      const totalRecords = await this.abonentRecordRepository.count({
        where: {
          beeline_download: false,
          transcribe_processed: false,
          to_short: false,
          duration: MoreThan(240000)
        }
      });

      if (totalRecords === 0) {
        this.logger.log('Нет записей для обработки транскрибации');
        return { success: 0, errors: 0, total: 0 };
      }

      this.logger.log(`Всего найдено записей длительностью > 4 минут для обработки: ${totalRecords}`);

      // Получаем все записи для обработки
      const records = await this.abonentRecordRepository.find({
        where: {
          beeline_download: false,
          transcribe_processed: false,
          to_short: false,
          duration: MoreThan(240000)
        },
        order: { date: 'DESC' }
      });

      // Используем базовый метод обработки с обработкой ошибок
      return await this.processWithErrorHandling(
        records,
        async (record) => {
          await this.processRecord(record, startTime, totalRecords);
        },
        'запись транскрибации'
      );

    } catch (error) {
      this.logger.error('Критическая ошибка при получении записей для транскрибации:', error);
      throw error;
    }
  }

  private async processRecord(record: AbonentRecord, startTime: number, totalRecords: number): Promise<void> {
    try {
      this.logger.log(` Начинаем обработку записи ${record.beelineId}...`);
      
      // Проверяем длительность записи
      if (record.duration < 240000) {
        record.to_short = true;
        await this.abonentRecordRepository.save(record);
        this.logger.log(`⏱️ Запись ${record.beelineId} помечена как короткая`);
        return;
      }
      
      // 1. Скачиваем mp3
      await this.beelineApiCallService.saveRecordMp3ToImportFolder(record.beelineId, record.phone);
      
      // Проверяем, что файл действительно скачался
      const mp3Path = path.join(process.cwd(), 'import', 'mp3', `${record.beelineId}_client_${record.phone}.mp3`);
      if (!await this.safeFileExists(mp3Path)) {
        throw new Error(`Файл не был скачан: ${mp3Path}`);
      }
      
      record.beeline_download = true;
      await this.abonentRecordRepository.save(record);
      this.logger.log(`📥 MP3 файл скачан для записи ${record.beelineId}`);
      
      // 2. Отправляем на транскрибацию
      const transcription = await this.transcriptionService.transcribeAudio(mp3Path);
      this.logger.log(` Транскрибация запущена для записи ${record.beelineId}`);
      
      // 2.5. Ждем завершения транскрибации
      const status = await this.waitForTranscriptionCompletion(transcription.file_id, record.beelineId);
      
      if (status.status !== 'completed') {
        throw new Error(`Транскрибация не завершена для записи ${record.beelineId}. Статус: ${status.status}`);
      }
      
      // 3. Получаем результат
      const txt = await this.transcriptionService.downloadResult(transcription.file_id);
      this.logger.log(` Результат транскрибации получен для записи ${record.beelineId}`);
      
      // 4. Сохраняем результат
      const exportDir = path.join(process.cwd(), 'export', 'txt');
      if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });
      const txtPath = path.join(exportDir, `${record.beelineId}_client_${record.phone}.txt`);
      fs.writeFileSync(txtPath, txt);
      
      // 5. Помечаем как обработанную
      record.transcribe_processed = true;
      await this.abonentRecordRepository.save(record);
      this.logger.log(`✅ Запись ${record.beelineId} помечена как транскрибированная`);
      
      // 6. Удаляем mp3-файл
      await this.safeDeleteFile(mp3Path);
      
      this.logger.log(`✅ Запись ${record.beelineId} успешно обработана`);
      
    } catch (error) {
      this.logger.error(`❌ Ошибка при обработке записи ${record.beelineId}: ${error.message}`);
      
      // Анализируем тип ошибки
      this.logErrorDetails(error, record);
      
      // При ошибке сбрасываем флаг скачивания
      if (record.beeline_download) {
        record.beeline_download = false;
        await this.abonentRecordRepository.save(record);
        this.logger.log(`🔄 Флаг beeline_download сброшен для записи ${record.beelineId}`);
      }
      
      // Перебрасываем ошибку для обработки в базовом классе
      throw error;
    }
  }

  private async waitForTranscriptionCompletion(fileId: string, recordId: string): Promise<any> {
    let attempts = 0;
    const maxAttempts = 30; // максимум 5 минут ожидания
    
    do {
      await new Promise(resolve => setTimeout(resolve, 10000)); // ждем 10 секунд
      const status = await this.transcriptionService.getStatus(fileId);
      attempts++;
      this.logger.log(`⏳ Статус транскрибации ${recordId}: ${status.status} (попытка ${attempts}/${maxAttempts})`);
      
      if (status.status === 'completed' || status.status === 'error') {
        return status;
      }
    } while (attempts < maxAttempts);
    
    return { status: 'timeout' };
  }
} 