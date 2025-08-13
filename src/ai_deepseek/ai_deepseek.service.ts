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
		this.httpService.axiosRef.defaults.timeout = 300000; // Уменьшаем до 5 минут
		this.httpService.axiosRef.defaults.maxRedirects = 5;
		this.httpService.axiosRef.defaults.validateStatus = (status) => status < 500; // Принимаем только статусы < 500
	}

	private getPromptByDepartment(department: string): string {
		return department.toLowerCase().includes('Отдел Качества') || department.toLowerCase().includes('Отдел Продукта')
			? qualityPromptV2
			: salesPromptV2;
	}

	// Создаем специальный класс ошибки для неполных JSON ответов
	private isIncompleteJsonError(error: any, jsonString: string): boolean {
		// Проверяем типичные признаки неполного JSON
		const errorMessage = error.message.toLowerCase();
		const jsonLower = jsonString.toLowerCase();
		
		// Все возможные ошибки парсинга JSON
		const jsonParseErrors = [
			'unexpected end of json input',
			'unexpected token',
			'unterminated string',
			'expected \',\' or \'}\' after property value',
			'expected \',\' or \']\' after array element',
			'unexpected number',
			'unexpected string',
			'unexpected boolean',
			'unexpected null',
			'unexpected end of data',
			'bad escaped character',
			'bad control character',
			'bad unicode escape',
			'duplicate key',
			'number too big',
			'number too small'
		];
		
		// Проверяем на ошибки парсинга
		const hasJsonParseError = jsonParseErrors.some(err => errorMessage.includes(err));
		
		// Проверяем структурную целостность JSON
		const hasStructuralIssues = (
			(jsonLower.includes('"table"') && !jsonLower.includes('"scoring"')) ||
			(jsonLower.includes('"blocks"') && !jsonLower.includes(']')) ||
			(jsonLower.includes('"headers"') && !jsonLower.includes(']'))
		);
		
		// Проверяем на незакрытые кавычки или скобки
		const hasUnclosedElements = (
			(jsonString.split('"').length % 2 !== 1) || // Нечетное количество кавычек
			(jsonString.split('{').length !== jsonString.split('}').length) || // Неравное количество скобок
			(jsonString.split('[').length !== jsonString.split(']').length) // Неравное количество квадратных скобок
		);
		
		return hasJsonParseError || hasStructuralIssues || hasUnclosedElements;
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
				max_tokens: 16000
			};

			// Логируем размер запроса для отладки
			const requestSize = JSON.stringify(requestOptions).length;
			this.logger.log(`Размер запроса: ${requestSize} байт`);
			
			if (requestSize > 50000) {
				this.logger.warn(`Большой размер запроса: ${requestSize} байт. Возможны проблемы с API`);
			}

			const response = await firstValueFrom(
				this.httpService.post<DeepseekResponse>(
					this.apiUrl,
					requestOptions
				)
			);

			const analysisResult = response.data.choices[0].message.content;
			// this.logger.log('Анализ разговора: ', response.data.choices[0].message);

			// Улучшенный парсинг JSON с обработкой неполных ответов
			let parsedResult;
			let jsonString = '';
			
			try {
				// Извлекаем JSON из markdown блока
				const jsonMatch = analysisResult.match(/```json\n([\s\S]*?)(?=\n```|$)/);
				if (jsonMatch && jsonMatch[1]) {
					jsonString = jsonMatch[1].trim();
					// this.logger.log('Извлеченный JSON:');
					// this.logger.log(jsonString);
					parsedResult = JSON.parse(jsonString);
				} else {
					// Если не нашли markdown блок, пробуем парсить весь контент
					jsonString = analysisResult.trim();
					parsedResult = JSON.parse(jsonString);
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
				// Проверяем, является ли это ошибкой неполного JSON
				if (this.isIncompleteJsonError(parseError, jsonString)) {
					this.logger.error(`❌ Получен неполный/некорректный JSON ответ от DeepSeek для записи ${recordId}`);
					this.logger.error(`🔍 Тип ошибки: ${parseError.message}`);
					this.logger.error(`📏 Размер ответа: ${analysisResult.length} символов`);
					this.logger.error(`📏 Размер JSON: ${jsonString.length} символов`);
					this.logger.error(`📍 Позиция ошибки: ${parseError.message.match(/position (\d+)/)?.[1] || 'неизвестно'}`);
					
					// Показываем контекст вокруг ошибки
					const position = parseInt(parseError.message.match(/position (\d+)/)?.[1] || '0');
					if (position > 0) {
						const start = Math.max(0, position - 100);
						const end = Math.min(jsonString.length, position + 100);
						this.logger.error(`🔍 Контекст ошибки (позиция ${position}):`);
						this.logger.error(`   ...${jsonString.slice(start, position)}[ОШИБКА]${jsonString.slice(position, end)}...`);
					}
					
					// Создаем специальную ошибку для неполного JSON
					const incompleteError = new Error(`Неполный/некорректный JSON ответ от DeepSeek: ${parseError.message}`);
					incompleteError.name = 'IncompleteJsonError';
					(incompleteError as any).isIncompleteJson = true;
					(incompleteError as any).originalError = parseError;
					(incompleteError as any).jsonString = jsonString;
					(incompleteError as any).errorPosition = position;
					
					throw incompleteError;
				}
				
				this.logger.error(`❌ Не удалось распарсить JSON ответ: ${parseError.message}`);
				// this.logger.error('Исходный ответ:');
				// this.logger.error(analysisResult);
				throw parseError;
			}

			// Сохраняем результат в БД только если парсинг прошел успешно
			const createAnalyzedAiDto: CreateAnalyzedAiDto = {
				conversationId: `conv_${recordId || Date.now().toString()}`,
				department: abonentDepartment,
				originalText: text,
				analysisResult: parsedResult,
				clientPhone: clientPhone,
			}

			await this.analyzedAiRepository.save(createAnalyzedAiDto);

			this.logger.log('✅ Анализ успешно сохранен в базе данных');

			return parsedResult;

		} catch (error) {
			this.logger.error(`❌ Ошибка при анализе разговора: ${error.message}`);
			
			// Логируем дополнительную информацию для неполных JSON
			if ((error as any).isIncompleteJson) {
				this.logger.error(`🔍 Детали неполного/некорректного JSON:`);
				this.logger.error(`   - Тип ошибки: ${error.name}`);
				this.logger.error(`   - Оригинальная ошибка: ${(error as any).originalError?.message}`);
				this.logger.error(`   - Размер JSON: ${(error as any).jsonString?.length || 'неизвестно'} символов`);
				if ((error as any).errorPosition) {
					this.logger.error(`   - Позиция ошибки: ${(error as any).errorPosition}`);
				}
				
				// Анализируем структуру JSON для диагностики
				const jsonStr = (error as any).jsonString || '';
				if (jsonStr) {
					const openBraces = (jsonStr.match(/\{/g) || []).length;
					const closeBraces = (jsonStr.match(/\}/g) || []).length;
					const openBrackets = (jsonStr.match(/\[/g) || []).length;
					const closeBrackets = (jsonStr.match(/\]/g) || []).length;
					const quotes = (jsonStr.match(/"/g) || []).length;
					
					this.logger.error(`   - Диагностика структуры:`);
					this.logger.error(`     Скобки: {${openBraces}} }${closeBraces} [${openBrackets}] ]${closeBrackets}`);
					this.logger.error(`     Кавычки: ${quotes} (должно быть четное число)`);
				}
			}
			
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