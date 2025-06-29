import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { TranscriptionResponse, TranscriptionStatus, TranscriptionMetrics } from './transcription.interface';
import * as FormData from 'form-data';
import * as fs from 'fs';

@Injectable()
export class TranscriptionService {
  private readonly apiUrl: string;

  constructor(private readonly httpService: HttpService) {
    this.apiUrl = process.env.TRANSCRIPTION_API_URL || 'http://localhost:8001';
  }

  async transcribeAudio(audioPath: string): Promise<TranscriptionResponse> {
    try {
      const formData = new FormData();
      formData.append('file', fs.createReadStream(audioPath));

      const response = await firstValueFrom(
        this.httpService.post<TranscriptionResponse>(`${this.apiUrl}/transcribe`, formData, {
          headers: {
            ...formData.getHeaders(),
          },
        }),
      );

      return response.data;
    } catch (error) {
      throw new Error(`Ошибка при отправке файла на транскрибацию: ${error.message}`);
    }
  }

  async getStatus(fileId: string): Promise<TranscriptionStatus> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<TranscriptionStatus>(`${this.apiUrl}/status/${fileId}`),
      );

      return response.data;
    } catch (error) {
      throw new Error(`Ошибка при получении статуса транскрибации: ${error.message}`);
    }
  }

  async getMetrics(): Promise<TranscriptionMetrics> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<TranscriptionMetrics>(`${this.apiUrl}/metrics`),
      );

      return response.data;
    } catch (error) {
      throw new Error(`Ошибка при получении метрик: ${error.message}`);
    }
  }

  async downloadResult(fileId: string): Promise<string> {
    const maxRetries = 3;
    const retryDelay = 2000; // 2 секунды

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Попытка ${attempt}/${maxRetries} скачивания результата для ${fileId}`);
        
        const response = await firstValueFrom(
          this.httpService.get(`${this.apiUrl}/download/${fileId}`, {
            responseType: 'text',
            timeout: 30000, // 30 секунд таймаут
            headers: {
              'Connection': 'keep-alive',
              'Keep-Alive': 'timeout=30, max=1000'
            }
          }),
        );

        console.log(`Результат успешно скачан для ${fileId}`);
        return response.data;
      } catch (error) {
        console.error(`Попытка ${attempt}/${maxRetries} неудачна для ${fileId}:`, error.message);
        
        if (attempt === maxRetries) {
          throw new Error(`Ошибка при скачивании результата после ${maxRetries} попыток: ${error.message}`);
        }
        
        // Ждем перед следующей попыткой
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }
    }
  }
} 