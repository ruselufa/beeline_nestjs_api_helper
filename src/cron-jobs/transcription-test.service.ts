import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TranscriptionService } from '../transcription/transcription.service';
import { BeelineApiCallService } from '../beeline_api_call/beeline_api_call.service';
import { AbonentRecord } from '../entities/beeline/abonent.record.entity';
import * as path from 'path';
import * as fs from 'fs';
import { MoreThan } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { Worker } from 'worker_threads';

@Injectable()
export class TranscriptionTestService implements OnApplicationBootstrap {
  public isProcessing = false;
  public lastStartTime: Date | null = null;
  private worker: Worker | null = null;

  constructor(
    private readonly transcriptionService: TranscriptionService,
    private readonly beelineApiCallService: BeelineApiCallService,
    @InjectRepository(AbonentRecord)
    private readonly abonentRecordRepository: Repository<AbonentRecord>,
  ) {}

  // ===== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ДЛЯ ВРЕМЕНИ =====
  private formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
      return `${hours}ч ${minutes % 60}м ${seconds % 60}с`;
    } else if (minutes > 0) {
      return `${minutes}м ${seconds % 60}с`;
    } else {
      return `${seconds}с`;
    }
  }

  private calculateETA(processedCount: number, totalCount: number, processingTimes: number[]): string {
    if (processedCount === 0 || processingTimes.length === 0) {
      return 'неизвестно';
    }
    const averageTime = processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length;
    const remainingRecords = totalCount - processedCount;
    const estimatedTimeMs = averageTime * remainingRecords;
    return this.formatTime(estimatedTimeMs);
  }

  private getAverageProcessingTime(processingTimes: number[]): string {
    if (processingTimes.length === 0) {
      return 'неизвестно';
    }
    const averageTime = processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length;
    return this.formatTime(averageTime);
  }

  async onApplicationBootstrap() {
    console.log('TranscriptionTestService инициализирован. Первый запуск транскрибации через 2 минуты.');
    
    // Запускаем транскрибацию через 2 минуты после старта приложения
    setTimeout(async () => {
      console.log('Запуск первичной транскрибации (через 2 минуты после старта)...');
      // Устанавливаем флаги в начальное состояние ПЕРЕД вызовом
      this.isProcessing = false;
      this.lastStartTime = null;
      await this.processTranscription();
    }, 1000); // 120000 мс = 2 минуты
  }

  // Запускаем транскрибацию каждые 30 минут
  // @Cron('*/1 * * * *')
  async processTranscription() {
    if (this.isProcessing) {
      const runningTime = Date.now() - this.lastStartTime.getTime();
      console.warn(`Транскрибация уже выполняется ${Math.floor(runningTime / 1000)} секунд, пропускаем запуск`);
      return;
    }

    this.isProcessing = true;
    this.lastStartTime = new Date();
    
    try {
      console.log('Запуск cron-задачи: обработка транскрибации');
      // Временно используем обычную обработку вместо worker
      await this.processFreshRecordsForTranscription();
      console.log('Транскрибация успешно завершена');
    } catch (error) {
      console.error('Ошибка выполнения транскрибации:', error);
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
        console.log('Worker сообщение:', message);
        if (message.type === 'progress') {
          console.log(`Прогресс транскрибации: ${message.data}`);
        } else if (message.type === 'complete') {
          console.log('Транскрибация завершена в worker');
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

  async processFreshRecordsForTranscription() {
    let offset = 0;
    const batchSize = 20;
    let processedTotal = 0;
    const processingTimes: number[] = [];

    // Получаем общее количество записей для обработки (только длинные)
    const totalRecords = await this.abonentRecordRepository.count({
      where: {
        beeline_download: false,
        transcribe_processed: false,
        to_short: false,
        duration: MoreThan(240000)
      }
    });
    const startTime = Date.now();
    console.log(`Всего найдено записей длительностью > 4 минут для обработки: ${totalRecords}`);

    while (true) {
      // Получаем batchSize свежих записей, которые не были скачаны и не слишком короткие
      const records = await this.abonentRecordRepository.find({
        where: {
          beeline_download: false,
          transcribe_processed: false,
          to_short: false,
          duration: MoreThan(240000)
        },
        order: { date: 'DESC' },
        skip: offset,
        take: batchSize,
      });
      if (!records.length) break;
      
      for (const record of records) {
        if (record.duration < 240000) {
          record.to_short = true;
          await this.abonentRecordRepository.save(record);
          continue;
        }
        
        const recordStartTime = Date.now();
        try {
          console.log(`Начинаем обработку записи ${record.beelineId}...`);
          
          // 1. Скачиваем mp3
          await this.beelineApiCallService.saveRecordMp3ToImportFolder(record.beelineId, record.phone);
          record.beeline_download = true;
          await this.abonentRecordRepository.save(record);
          console.log(`MP3 файл скачан для записи ${record.beelineId}`);
          
          // 2. Отправляем на транскрибацию
          const mp3Path = path.join(process.cwd(), 'import', 'mp3', `${record.beelineId}_client_${record.phone}.mp3`);
          const transcription = await this.transcriptionService.transcribeAudio(mp3Path);
          console.log(`Транскрибация запущена для записи ${record.beelineId}`);
          
          // 2.5. Ждем завершения транскрибации
          let status;
          let attempts = 0;
          const maxAttempts = 30; // максимум 5 минут ожидания
          
          do {
            await new Promise(resolve => setTimeout(resolve, 10000)); // ждем 10 секунд
            status = await this.transcriptionService.getStatus(transcription.file_id);
            attempts++;
            console.log(`Статус транскрибации ${record.beelineId}: ${status.status} (попытка ${attempts}/${maxAttempts})`);
          } while (status.status === 'processing' && attempts < maxAttempts);
          
          if (status.status !== 'completed') {
            throw new Error(`Транскрибация не завершена для записи ${record.beelineId}. Статус: ${status.status}`);
          }
          
          // 3. Получаем результат
          const txt = await this.transcriptionService.downloadResult(transcription.file_id);
          console.log(`Результат транскрибации получен для записи ${record.beelineId}`);
          
          // 4. Сохраняем результат в export/txt/{beelineId}_client_{phone}.txt
          const exportDir = path.join(process.cwd(), 'export', 'txt');
          if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });
          const txtPath = path.join(exportDir, `${record.beelineId}_client_${record.phone}.txt`);
          fs.writeFileSync(txtPath, txt);
          
          // 5. Помечаем как обработанную только после успешного сохранения
          record.transcribe_processed = true;
          await this.abonentRecordRepository.save(record);
          console.log(`Запись ${record.beelineId} помечена как транскрибированная`);
          
          // 6. Удаляем mp3-файл
          try {
            fs.unlinkSync(mp3Path);
            console.log(`mp3-файл удалён: ${mp3Path}`);
          } catch (delErr) {
            console.error(`Не удалось удалить mp3-файл: ${mp3Path}`, delErr);
          }
          
          processedTotal++;
          // === Время обработки ===
          const recordProcessingTime = Date.now() - recordStartTime;
          processingTimes.push(recordProcessingTime);
          // === Статистика ===
          const averageTime = this.getAverageProcessingTime(processingTimes);
          const eta = this.calculateETA(processedTotal, totalRecords, processingTimes);
          const elapsedTime = this.formatTime(Date.now() - startTime);
          console.log(`✅ Запись ${record.beelineId} успешно обработана за ${this.formatTime(recordProcessingTime)}`);
          console.log(`📊 Прогресс: ${processedTotal}/${totalRecords} (${Math.round(processedTotal/totalRecords*100)}%)`);
          console.log(`⏱️  Среднее время обработки: ${averageTime}`);
          console.log(`⏳ Прошло времени: ${elapsedTime}`);
          console.log(`⏳ Примерное время завершения: ${eta}`);
          console.log(`📈 Осталось записей: ${totalRecords - processedTotal}`);
          console.log('─'.repeat(80));
          // Пауза между записями для снижения нагрузки на сервер
          await new Promise(resolve => setTimeout(resolve, 2000));
          
        } catch (err) {
          const recordProcessingTime = Date.now() - recordStartTime;
          console.error(`❌ Ошибка при обработке записи ${record.beelineId} (затрачено времени: ${this.formatTime(recordProcessingTime)}):`, err);
          
          // Логируем детали ошибки
          if (err.message.includes('ECONNRESET')) {
            console.error(`Сетевая ошибка для записи ${record.beelineId} - соединение разорвано`);
          } else if (err.message.includes('timeout')) {
            console.error(`Таймаут для записи ${record.beelineId}`);
          } else if (err.message.includes('download')) {
            console.error(`Ошибка скачивания для записи ${record.beelineId}`);
          }
          
          // При ошибке сбрасываем флаг скачивания, чтобы запись можно было обработать позже
          if (record.beeline_download) {
            record.beeline_download = false;
            await this.abonentRecordRepository.save(record);
            console.log(`Флаг beeline_download сброшен для записи ${record.beelineId} из-за ошибки`);
          }
          
          // Пауза после ошибки
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
      offset += batchSize;
    }
    // Финальная статистика
    const totalTime = Date.now() - startTime;
    const finalAverageTime = this.getAverageProcessingTime(processingTimes);
    console.log('🎉 Обработка завершена!');
    console.log(`📊 Итоговая статистика:`);
    console.log(`   • Обработано записей: ${processedTotal}`);
    console.log(`   • Общее время: ${this.formatTime(totalTime)}`);
    console.log(`   • Среднее время на запись: ${finalAverageTime}`);
    console.log(`   • Успешных записей: ${processingTimes.length}`);
    console.log(`   • Ошибок: ${processedTotal - processingTimes.length}`);
  }
} 