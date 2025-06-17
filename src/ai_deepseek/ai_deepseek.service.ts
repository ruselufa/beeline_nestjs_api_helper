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
import { salesPromptV2 } from './prompts/sales.prompt_v2';
import { qualityPromptV2 } from './prompts/quality.prompt_v2';
import { AnalyzedAi } from '../entities/beeline/analyzed_ai.entity';
// import { ClientsService } from 'src/clients/clients.service';
import { AbonentRecord } from 'src/entities/beeline/abonent.record.entity';
import { Abonent } from 'src/entities/beeline/abonent.entity';
import { CreateAnalyzedAiDto } from '../entities/beeline/analyzed_ai.dto';

@Injectable()
export class AiDeepseekService implements OnModuleDestroy {
	private readonly apiKey: string;
	private readonly apiUrl: string = 'https://api.deepseek.com/v1/chat/completions';
	private readonly logger = new Logger(AiDeepseekService.name);

	constructor(
		private configService: ConfigService,
		private httpService: HttpService,
		// private clientsService: ClientsService,
		@InjectRepository(AbonentRecord)
		private abonentRecordRepository: Repository<AbonentRecord>,
		@InjectRepository(Abonent)
		private abonentRepository: Repository<Abonent>,
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
		return department.toLowerCase().includes('Отдел Качества') || department.toLowerCase().includes('Отдел Продукта')
			? qualityPromptV2
			: salesPromptV2;
	}

	async analyzeConversation(text: string, clientPhone: string, abonentDepartment: string, recordId?: number): Promise<any> {
		try {
			this.logger.log(`Начинаем анализ разговора для клиента`);

			const systemPrompt = this.getPromptByDepartment(abonentDepartment);

			const requestOptions: DeepseekRequestOptions = {
				model: 'deepseek-reasoner',
				messages: [
					{ role: 'system', content: systemPrompt },
					{ role: 'user', content: text }
				],
				temperature: 0.7,
				max_tokens: 8000
			};

			const response = await firstValueFrom(
				this.httpService.post<DeepseekResponse>(
					this.apiUrl,
					requestOptions
				)
			);

			const analysisResult = response.data.choices[0].message.content;
			this.logger.log('Анализ разговора: ', response.data.choices[0].message);

			// Улучшенный парсинг JSON
			let parsedResult;
			try {
				// Извлекаем JSON из markdown блока
				const jsonMatch = analysisResult.match(/```json\n([\s\S]*?)(?=\n```|$)/);
				if (jsonMatch && jsonMatch[1]) {
					const jsonStr = jsonMatch[1].trim();
					this.logger.log('Извлеченный JSON:');
					this.logger.log(jsonStr);
					parsedResult = JSON.parse(jsonStr);
					// this.logger.log(parsedResult);
				} else {
					// Если не нашли markdown блок, пробуем парсить весь контент
					parsedResult = JSON.parse(analysisResult);
				}

				// Проверяем структуру результата
				if (!parsedResult.table || !parsedResult.table.blocks) {
					throw new Error('Неверная структура ответа: отсутствует table.blocks');
				}

				// Проверяем наличие всех необходимых блоков
				const requiredBlocks = ['Основная информация о звонке', 'Оценка этапов звонка', 'Общая оценка и рекомендации'];
				const blocks = parsedResult.table.blocks.map(block => block.blockName);
				const missingBlocks = requiredBlocks.filter(block => !blocks.includes(block));
				
				if (missingBlocks.length > 0) {
					throw new Error(`Отсутствуют обязательные блоки: ${missingBlocks.join(', ')}`);
				}

				// Проверяем наличие всех необходимых полей в каждом блоке
				parsedResult.table.blocks.forEach(block => {
					if (!block.headers || !Array.isArray(block.headers)) {
						throw new Error(`Неверная структура блока ${block.blockName}: отсутствует массив headers`);
					}

					block.headers.forEach(header => {
						if (!header.id || !header.label || !header.type) {
							throw new Error(`Неверная структура заголовка в блоке ${block.blockName}: отсутствуют обязательные поля`);
						}
					});
				});

			} catch (parseError) {
				this.logger.error(`Не удалось распарсить JSON ответ: ${parseError.message}`);
				this.logger.error('Исходный ответ:');
				this.logger.error(analysisResult);
				throw parseError;
			}

			// Сохраняем результат в БД
			const createAnalyzedAiDto: CreateAnalyzedAiDto = {
				conversationId: `conv_${recordId || Date.now().toString()}`,
				department: abonentDepartment,
				originalText: text,
				analysisResult: parsedResult,
				clientPhone: clientPhone,
			}

			await this.analyzedAiRepository.save(createAnalyzedAiDto);

			this.logger.log('✓ Анализ успешно сохранен в базе данных');

			return parsedResult;

		} catch (error) {
			this.logger.error(`❌ Ошибка при анализе разговора: ${error.message}`);
			throw error;
		}
	}

	async analyzeConversationFile(filePath: string, clientPhone: string, recordId): Promise<any> {
		try {
			const fileContent = await fs.readFile(filePath, 'utf-8');
			const record = await this.abonentRecordRepository.findOne({ 
				where: { beelineId: recordId },
				relations: ['abonent']
			});
			
			if (!record) {
				this.logger.error(`Запись с beelineId ${recordId} не найдена в базе данных`);
				throw new Error(`Record not found: ${recordId}`);
			}
			
			if (!record.abonent) {
				this.logger.error(`Связанный абонент не найден для записи ${recordId}`);
				throw new Error(`Abonent not found for record: ${recordId}`);
			}
			return await this.analyzeConversation(fileContent, clientPhone, record.abonent.department, record.id);
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

				// Извлекаем clientPhone из имени файла (предполагается формат: client_123.txt)
				const clientPhone = file.split('_')[1].split('.')[0];
				const recordId = file.split('_')[0];

				try {
					await this.analyzeConversationFile(filePath, clientPhone, recordId);
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