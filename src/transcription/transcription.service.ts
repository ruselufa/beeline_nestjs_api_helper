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
    this.apiUrl = process.env.TRANSCRIPTION_API_URL || 'http://localhost:8000';
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
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.apiUrl}/download/${fileId}`, {
          responseType: 'text',
        }),
      );

      return response.data;
    } catch (error) {
      throw new Error(`Ошибка при скачивании результата: ${error.message}`);
    }
  }
} 