import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DeepseekResponse, DeepseekRequestOptions, DeepseekMessage } from './types';
import { getSalesPrompt, getQualityPrompt } from './prompts';
import { AnalyzedAi } from '../entities';
import { ClientService } from './services/client.service';

@Injectable()
export class AiDeepseekService implements OnModuleDestroy {
  private readonly apiKey: string;
  private readonly apiUrl: string = 'https://api.deepseek.com/v1/chat/completions';
  private readonly logger = new Logger(AiDeepseekService.name);

  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
    private clientService: ClientService,
    @InjectRepository(AnalyzedAi)
    private analyzedAiRepository: Repository<AnalyzedAi>
  ) {
    this.apiKey = this.configService.get<string>('DEEPSEEK_API_KEY');
    if (!this.apiKey) {
      throw new Error('DEEPSEEK_API_KEY не найден в конфигурации');
    }
    
    this.httpService.axiosRef.defaults.headers.common['Authorization'] = `Bearer ${this.apiKey}`;
    this.httpService.axiosRef.defaults.headers.common['Content-Type'] = 'application/json';
    this.httpService.axiosRef.defaults.timeout = 600000;
  }

  private getPromptByDepartment(department: string): string {
    return department.toLowerCase().includes('quality') ? 
      getQualityPrompt() : 
      getSalesPrompt();
  }

  async analyzeConversation(text: string, clientId: string): Promise<any> {
    try {
      this.logger.log(`Начинаем анализ разговора для клиента ${clientId}`);
      
      // Получаем информацию о клиенте
      const clientInfo = await this.clientService.getClientInfo(clientId);
      const systemPrompt = this.getPromptByDepartment(clientInfo.department);

      const requestOptions: DeepseekRequestOptions = {
        model: 'deepseek-reasoner',
        messages: [
          { role: 'system', content: systemPrompt },
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

      const analysisResult = response.data.choices[0].message.content;

      // Сохраняем результат в БД
      const analyzedConversation = this.analyzedAiRepository.create({
        conversationId: `conv_${Date.now()}`,
        department: clientInfo.department,
        originalText: text,
        analysisResult: typeof analysisResult === 'string' ? 
          JSON.parse(analysisResult) : analysisResult,
        clientId,
        clientName: clientInfo.name,
        clientPhone: clientInfo.phone
      });

      await this.analyzedAiRepository.save(analyzedConversation);
      
      this.logger.log('✓ Анализ успешно сохранен в базе данных');

      return analysisResult;

    } catch (error) {
      this.logger.error(`❌ Ошибка при анализе разговора: ${error.message}`);
      throw error;
    }
  }

  async analyzeConversationFile(filePath: string, clientId: string): Promise<any> {
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      return await this.analyzeConversation(fileContent, clientId);
    } catch (error) {
      this.logger.error(`Ошибка при обработке файла ${filePath}: ${error.message}`);
      throw error;
    }
  }

  async analyzeConversationFiles(directory: string): Promise<void> {
    try {
      const files = await fs.readdir(directory);
      const txtFiles = files.filter(file => file.endsWith('.txt'));

      this.logger.log(`Найдено ${txtFiles.length} файлов для анализа`);

      for (const file of txtFiles) {
        const filePath = path.join(directory, file);
        
        // Извлекаем clientId из имени файла (предполагается формат: client_123.txt)
        const clientId = file.split('_')[1].split('.')[0];
        
        try {
          await this.analyzeConversationFile(filePath, clientId);
          this.logger.log(`✓ Успешно проанализирован файл: ${file}`);
        } catch (error) {
          this.logger.error(`❌ Ошибка при анализе файла ${file}: ${error.message}`);
          continue;
        }
      }

      this.logger.log('✓ Анализ всех файлов завершен');
    } catch (error) {
      this.logger.error(`❌ Ошибка при обработки директории: ${error.message}`);
      throw error;
    }
  }

  async onModuleDestroy() {
    this.logger.log('Сервис AiDeepseek завершает работу');
  }
} 