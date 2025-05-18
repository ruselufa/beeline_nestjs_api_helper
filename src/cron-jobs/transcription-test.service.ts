import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { TranscriptionService } from '../transcription/transcription.service';
import * as path from 'path';

@Injectable()
export class TranscriptionTestService implements OnApplicationBootstrap {
  constructor(private readonly transcriptionService: TranscriptionService) {}

  async onApplicationBootstrap() {
    await this.testTranscription();
  }

  private async testTranscription() {
    try {
      console.log('\n=== Начало тестовой транскрибации ===');
      const testMp3Path = path.join(process.cwd(), 'import', 'mp3', 'file.mp3');
      
      console.log(`Путь к тестовому файлу: ${testMp3Path}`);
      
      try {
        // Отправляем файл на транскрибацию
        const transcriptionResponse = await this.transcriptionService.transcribeAudio(testMp3Path);
        console.log('\nФайл отправлен на транскрибацию:');
        console.log(`- ID файла: ${transcriptionResponse.file_id}`);
        console.log(`- Статус: ${transcriptionResponse.status}`);
        console.log(`- Позиция в очереди: ${transcriptionResponse.queue_position}`);
        console.log('\nМетрики сервиса:');
        console.log(`- Размер очереди: ${transcriptionResponse.metrics.queue_size}`);
        console.log(`- Среднее время обработки: ${transcriptionResponse.metrics.avg_processing_time} сек`);
        console.log(`- Средняя скорость: ${transcriptionResponse.metrics.avg_processing_speed} МБ/сек`);
        console.log(`- Обработано файлов: ${transcriptionResponse.metrics.files_processed}`);
        
        // Проверяем статус каждые 30 секунд
        const checkStatus = async () => {
          const status = await this.transcriptionService.getStatus(transcriptionResponse.file_id);
          console.log('\nПроверка статуса транскрибации:');
          console.log(`- Текущий статус: ${status.status}`);
          console.log(`- Время создания: ${status.created_at}`);
          
          if (status.status === 'completed') {
            console.log('\nТранскрибация завершена!');
            console.log(`- Время обработки: ${status.processing_time} сек`);
            console.log(`- Размер файла: ${status.file_size} байт`);
            
            const result = await this.transcriptionService.downloadResult(transcriptionResponse.file_id);
            console.log('\nРезультат транскрибации:');
            console.log(result);
            return;
          }
          
          if (status.status === 'error') {
            console.error('\nОшибка транскрибации:', status.error);
            return;
          }
          
          // Если обработка еще идет, проверяем снова через 30 секунд
          console.log('\nОжидание 30 секунд до следующей проверки...');
          setTimeout(checkStatus, 30000);
        };
        
        // Запускаем первую проверку
        console.log('\nЗапуск мониторинга статуса...');
        setTimeout(checkStatus, 30000);
        
      } catch (error) {
        console.error('\nОшибка при тестовой транскрибации:', error);
      }
    } catch (error) {
      console.error('\nКритическая ошибка:', error);
    }
  }
} 