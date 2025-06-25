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

@Injectable()
export class TranscriptionTestService implements OnApplicationBootstrap {
  public isProcessing = false;
  public lastStartTime: Date | null = null;

  constructor(
    private readonly transcriptionService: TranscriptionService,
    private readonly beelineApiCallService: BeelineApiCallService,
    @InjectRepository(AbonentRecord)
    private readonly abonentRecordRepository: Repository<AbonentRecord>,
  ) {}

  async onApplicationBootstrap() {
    // Убираем автоматический запуск при старте приложения
    // Оставляем только cron-задачу для регулярного запуска
    console.log('TranscriptionTestService инициализирован. Транскрибация будет выполняться по расписанию.');
  }

  // Запускаем транскрибацию каждые 30 минут
  @Cron('*/30 * * * *')
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
      await this.processFreshRecordsForTranscription();
      console.log('Транскрибация успешно завершена');
    } catch (error) {
      console.error('Ошибка выполнения транскрибации:', error);
    } finally {
      this.isProcessing = false;
      this.lastStartTime = null;
    }
  }

  async processFreshRecordsForTranscription() {
    let offset = 0;
    const batchSize = 20;
    let processedTotal = 0;

    // Получаем общее количество записей для обработки (только длинные)
    const totalRecords = await this.abonentRecordRepository.count({
      where: {
        beeline_download: false,
        transcribe_processed: false,
        to_short: false,
        duration: MoreThan(240000)
      }
    });
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
          console.log(`Запись ${record.beelineId} успешно обработана и транскрибирована. (Прогресс: ${processedTotal}/${totalRecords}, осталось: ${totalRecords - processedTotal})`);
          
        } catch (err) {
          console.error(`Ошибка при обработке записи ${record.beelineId}:`, err);
          
          // При ошибке сбрасываем флаг скачивания, чтобы запись можно было обработать позже
          if (record.beeline_download) {
            record.beeline_download = false;
            await this.abonentRecordRepository.save(record);
            console.log(`Флаг beeline_download сброшен для записи ${record.beelineId} из-за ошибки`);
          }
        }
      }
      offset += batchSize;
    }
    console.log(`Обработка завершена. Всего обработано записей: ${processedTotal} из ${totalRecords}`);
  }
} 