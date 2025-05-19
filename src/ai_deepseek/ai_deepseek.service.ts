import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DeepseekResponse, DeepseekRequestOptions, DeepseekMessage } from './types';
import { getSystemPrompt } from './prompts/system.prompt';

@Injectable()
export class AiDeepseekService implements OnModuleDestroy {
  private readonly apiKey: string;
  private readonly apiUrl: string = 'https://api.deepseek.com/v1/chat/completions';
  private readonly logger = new Logger(AiDeepseekService.name);
  private readonly systemPrompt: string;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService
  ) {
    this.apiKey = this.configService.get<string>('DEEPSEEK_API_KEY');
    if (!this.apiKey) {
      throw new Error('DEEPSEEK_API_KEY не найден в конфигурации');
    }

    this.systemPrompt = getSystemPrompt();
    
    // Настраиваем дефолтные заголовки для всех запросов
    this.httpService.axiosRef.defaults.headers.common['Authorization'] = `Bearer ${this.apiKey}`;
    this.httpService.axiosRef.defaults.headers.common['Content-Type'] = 'application/json';
    this.httpService.axiosRef.defaults.timeout = 600000; // 10 минут
  }

  /**
   * Анализирует текст разговора с помощью Deepseek API
   * @param text текст разговора для анализа
   * @returns результат анализа в структурированном формате
   */
  async analyzeConversation(text: string): Promise<any> {
    try {
      this.logger.log(`Начинаем анализ разговора длиной ${text.length} символов...`);
      this.logger.log('Отправляем запрос к DeepSeek API...');

      const requestOptions: DeepseekRequestOptions = {
        model: 'deepseek-reasoner',
        messages: [
          { role: 'system', content: this.systemPrompt },
          { role: 'user', content: text }
        ],
        temperature: 0.7,
        max_tokens: 4000
      };

      const response = await firstValueFrom(
        this.httpService.post<DeepseekResponse>(
          this.apiUrl,
          requestOptions
        )
      );

      this.logger.log(`Получен ответ от сервера, статус: ${response.status}`);

      // Сохраняем ответ для отладки
      await this.saveDebugResponse(response.data);

      this.logger.log('✓ Ответ успешно получен и обработан');

      return response.data.choices[0].message.content;

    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        this.logger.error('❌ Превышено время ожидания ответа от DeepSeek API');
      } else {
        this.logger.error(`❌ Ошибка при запросе к DeepSeek API: ${error.message}`);
        if (error.response) {
          this.logger.error(`Детали ошибки: ${JSON.stringify(error.response.data)}`);
        }
      }
      throw error;
    }
  }

  /**
   * Анализирует текстовый файл с разговором
   * @param filePath путь к файлу с текстом разговора
   * @returns результат анализа в структурированном формате
   */
  async analyzeConversationFile(filePath: string): Promise<any> {
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      return await this.analyzeConversation(fileContent);
    } catch (error) {
      throw new Error(`Ошибка при обработке файла: ${error.message}`);
    }
  }

  /**
   * Сохраняет ответ API в файл для отладки
   */
  private async saveDebugResponse(response: DeepseekResponse): Promise<void> {
    try {
      const debugDir = path.join(process.cwd(), 'debug_files');
      await fs.mkdir(debugDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const debugFile = path.join(debugDir, `debug_response_${timestamp}.json`);

      await fs.writeFile(
        debugFile,
        JSON.stringify(response, null, 2),
        'utf-8'
      );

      this.logger.log(`Ответ сохранен в файл: ${debugFile}`);
    } catch (error) {
      this.logger.error(`Ошибка при сохранении отладочного файла: ${error.message}`);
    }
  }

  /**
   * Закрытие сервиса при остановке приложения
   */
  async onModuleDestroy() {
    this.logger.log('Сервис AiDeepseek завершает работу');
  }
} 