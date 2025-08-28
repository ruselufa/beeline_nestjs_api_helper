import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiDeepseekService } from '../ai_deepseek/ai_deepseek.service';
import { AbonentRecord } from '../entities/beeline/abonent.record.entity';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Cron } from '@nestjs/schedule';
import { MoreThan } from 'typeorm';
import { AnalyzedAi } from '../entities/beeline/analyzed_ai.entity';
import { Worker } from 'worker_threads';
import { BaseCronService } from './base-cron.service';

interface QueueItem {
	record: AbonentRecord;
	resolve: (value: any) => void;
	reject: (error: any) => void;
}

@Injectable()
export class ConversationAnalyzerService extends BaseCronService implements OnApplicationBootstrap {
	protected readonly logger = new Logger(ConversationAnalyzerService.name);
	private readonly exportDir = path.join(process.cwd(), 'export');
	public isProcessing = false;
	public lastStartTime: Date | null = null;
	private worker: Worker | null = null;

	// Система очереди
	private queue: QueueItem[] = [];
	private activeRequests = 0;
	private maxConcurrentRequests = 20; // Уменьшаем до 20 одновременных запросов для стабильности
	private requestsPerMinute = 30; // Уменьшаем до 30 запросов в минуту для разумного темпа
	private requestTimestamps: number[] = []; // Временные метки запросов для rate limiting
	private isQueueProcessing = false;
	
	// Адаптивные настройки при ошибках
	private adaptiveMode = false;
	private originalMaxConcurrent = 20;
	private originalRequestsPerMinute = 30;
	private consecutiveErrors = 0;
	private readonly maxConsecutiveErrors = 3; // Максимум 3 ошибки подряд

	constructor(
		private aiDeepseekService: AiDeepseekService,
		@InjectRepository(AbonentRecord)
		private readonly abonentRecordRepository: Repository<AbonentRecord>,
		@InjectRepository(AnalyzedAi)
		private readonly analyzedAiRepository: Repository<AnalyzedAi>,
	) { 
		super();
	}

	async onApplicationBootstrap() {
		this.logger.log('ConversationAnalyzerService инициализирован. Первый запуск анализа разговоров через 3 минуты.');
		
		// Запускаем анализ разговоров через 3 минуты после старта приложения
		setTimeout(async () => {
			this.logger.log('Запуск первичного анализа разговоров (через 3 минуты после старта)...');
			// Устанавливаем флаг в false ПЕРЕД вызовом processAnalysis
			this.isProcessing = false;
			this.lastStartTime = null;
			await this.processAnalysis();
		}, 3000); // 180000 мс = 3 минуты
	}

	// Запускаем анализ в 21.30
	@Cron('30 21 * * *')
	async processAnalysis() {
		if (this.isProcessing) {
			const runningTime = Date.now() - this.lastStartTime.getTime();
			this.logger.warn(`Анализ разговоров уже выполняется ${Math.floor(runningTime / 1000)} секунд, пропускаем запуск`);
			return;
		}

		this.isProcessing = true;
		this.lastStartTime = new Date();
		
		try {
			this.logger.log('Запуск cron-задачи: анализ разговоров');
			// Используем новую систему очереди
			const results = await this.processFreshRecordsForAnalysisWithQueue();
			this.logger.log(`Анализ разговоров завершен. Успешно: ${results.success}, Ошибок: ${results.errors}`);
		} catch (error) {
			this.logger.error('Критическая ошибка выполнения анализа разговоров:', error);
		} finally {
			this.isProcessing = false;
			this.lastStartTime = null;
		}
	}

	async processAnalysisWithWorker() {
		return new Promise((resolve, reject) => {
			// Определяем путь к worker файлу в зависимости от окружения
			const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
			const workerPath = isDev 
				? path.join(process.cwd(), 'src', 'cron-jobs', 'analysis-worker.js')
				: path.join(__dirname, 'analysis-worker.js');

			// Создаем worker для анализа разговоров
			this.worker = new Worker(workerPath, {
				workerData: {
					// Передаем необходимые данные в worker
				}
			});

			this.worker.on('message', (message) => {
				this.logger.log('Worker сообщение:', message);
				if (message.type === 'progress') {
					this.logger.log(`Прогресс анализа разговоров: ${message.data}`);
				} else if (message.type === 'complete') {
					this.logger.log('Анализ разговоров завершен в worker');
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

	async processFreshRecordsForAnalysis() {
		try {
			// Ищем записи, которые готовы для анализа
			const records = await this.abonentRecordRepository.find({
				where: {
					transcribe_processed: true,
					deepseek_analysed: false,
					to_short: false,
					duration: MoreThan(240000)
				},
				order: { date: 'DESC' }
			});

			this.logger.log(`Найдено ${records.length} записей для анализа`);

			if (records.length === 0) {
				this.logger.log('Нет записей для анализа');
				return { success: 0, errors: 0, total: 0 };
			}

			// Используем базовый метод обработки с обработкой ошибок
			return await this.processWithErrorHandling(
				records,
				async (record) => {
					await this.processRecord(record);
				},
				'запись анализа'
			);

		} catch (error) {
			this.logger.error(`Ошибка при обработке записей: ${error.message}`);
			throw error;
		}
	}

	private async processRecord(record: AbonentRecord): Promise<void> {
		try {
			// Проверяем, что txt файл существует
			const txtPath = path.join(this.exportDir, 'txt', `${record.beelineId}_client_${record.phone}.txt`);
			const txtExists = await this.safeFileExists(txtPath);
			
			if (!txtExists) {
				this.logger.warn(`TXT файл не найден для записи ${record.beelineId}: ${txtPath}`);
				return;
			}

			// Проверяем, что JSON файл анализа еще не существует
			const outputPath = path.join(this.exportDir, 'json', `${record.beelineId}_client_${record.phone}_analysis.json`);
			const jsonExists = await this.safeFileExists(outputPath);
			
			if (jsonExists) {
				this.logger.log(`Файл анализа уже существует для записи ${record.beelineId}: ${outputPath}`);
				// Обновляем флаг в БД, если файл уже есть
				record.deepseek_analysed = true;
				await this.abonentRecordRepository.save(record);
				return;
			}

			// Получаем результат анализа от Deepseek
			const analysisResult = await this.aiDeepseekService.analyzeConversationFile(
				txtPath,
				record.phone,
				record.beelineId
			);

			// Создаем структурированный результат
			const structuredResult = {
				record_id: record.beelineId,
				client_phone: record.phone,
				analysis_date: new Date().toISOString(),
				table: analysisResult.table,
				scoring: analysisResult.scoring
			};

			// Создаем папку json если её нет
			const jsonDir = path.join(this.exportDir, 'json');
			await fs.mkdir(jsonDir, { recursive: true });

			// Сохраняем структурированный результат в файл
			await fs.writeFile(outputPath, JSON.stringify(structuredResult, null, 2));
			
			// Обновляем запись в БД
			record.deepseek_analysed = true;
			record.deepseek_analysis = structuredResult;
			await this.abonentRecordRepository.save(record);

			this.logger.log(`✅ Запись ${record.beelineId} успешно проанализирована. Результат сохранен в ${outputPath}`);

		} catch (error) {
			this.logger.error(`❌ Ошибка при обработке записи ${record.beelineId}: ${error.message}`);
			
			// Анализируем тип ошибки
			this.logErrorDetails(error, record);
			
			// Перебрасываем ошибку для обработки в базовом классе
			throw error;
		}
	}

	// Оставляем старый метод для обратной совместимости
	async processFiles() {
		this.logger.warn('Метод processFiles устарел. Используйте processFreshRecordsForAnalysis');
		return await this.processFreshRecordsForAnalysis();
	}

	async processFreshRecordsForAnalysisWithQueue() {
		try {
			// Ищем записи, которые готовы для анализа
			const records = await this.abonentRecordRepository.find({
				where: {
					transcribe_processed: true,
					deepseek_analysed: false,
					to_short: false,
					duration: MoreThan(240000)
				},
				order: { date: 'DESC' }
			});

			this.logger.log(`Найдено ${records.length} записей для анализа через очередь`);

			if (records.length === 0) {
				this.logger.log('Нет записей для анализа');
				return { success: 0, errors: 0, total: 0 };
			}

			// Добавляем все записи в очередь
			const promises = records.map(record => this.addToQueue(record));
			
			// Запускаем обработку очереди
			await this.startQueueProcessing();
			
			// Ждем завершения всех запросов
			const results = await Promise.allSettled(promises);
			
			// Подсчитываем результаты
			const successful = results.filter(r => r.status === 'fulfilled').length;
			const failed = results.filter(r => r.status === 'rejected').length;
			
			this.logger.log(`Обработка очереди завершена. Успешно: ${successful}, Ошибок: ${failed}`);
			
			return { success: successful, errors: failed, total: records.length };
			
		} catch (error) {
			this.logger.error(`Ошибка при обработке записей через очередь: ${error.message}`);
			throw error;
		}
	}

	private async addToQueue(record: AbonentRecord): Promise<void> {
		return new Promise((resolve, reject) => {
			this.queue.push({ record, resolve, reject });
			this.logger.log(`Запись ${record.beelineId} добавлена в очередь. Размер очереди: ${this.queue.length}`);
		});
	}

	private async startQueueProcessing() {
		if (this.isQueueProcessing) {
			this.logger.log('Обработка очереди уже запущена');
			return;
		}

		this.isQueueProcessing = true;
		this.logger.log('Запуск обработки очереди запросов');

		while (this.queue.length > 0 || this.activeRequests > 0) {
			// Очищаем старые временные метки (старше 1 минуты)
			const oneMinuteAgo = Date.now() - 60000;
			this.requestTimestamps = this.requestTimestamps.filter(timestamp => timestamp > oneMinuteAgo);

			// Проверяем rate limiting
			if (this.requestTimestamps.length >= this.requestsPerMinute) {
				const oldestTimestamp = this.requestTimestamps[0];
				const waitTime = 60000 - (Date.now() - oldestTimestamp);
				if (waitTime > 0) {
					this.logger.log(`Rate limit достигнут. Ожидание ${Math.ceil(waitTime / 1000)} секунд`);
					await new Promise(resolve => setTimeout(resolve, waitTime));
					continue;
				}
			}

			// Проверяем, можем ли мы запустить новый запрос
			if (this.activeRequests < this.maxConcurrentRequests && this.queue.length > 0) {
				const item = this.queue.shift();
				if (item) {
					this.activeRequests++;
					this.requestTimestamps.push(Date.now());
					
					this.logger.log(`Запуск обработки записи ${item.record.beelineId}. Активных запросов: ${this.activeRequests}, В очереди: ${this.queue.length}`);
					
					// Запускаем обработку записи
					this.processRecordWithQueue(item.record)
						.then(result => {
							item.resolve(result);
						})
						.catch(error => {
							item.reject(error);
						})
						.finally(() => {
							this.activeRequests--;
							this.logger.log(`Запрос завершен. Активных запросов: ${this.activeRequests}, В очереди: ${this.queue.length}`);
						});
				}
			} else {
				// Ждем немного перед следующей итерацией
				await new Promise(resolve => setTimeout(resolve, 100));
			}
		}

		this.isQueueProcessing = false;
		this.logger.log('Обработка очереди завершена');
	}

	private async processRecordWithQueue(record: AbonentRecord): Promise<void> {
		try {
			// Проверяем, что txt файл существует
			const txtPath = path.join(this.exportDir, 'txt', `${record.beelineId}_client_${record.phone}.txt`);
			const txtExists = await this.safeFileExists(txtPath);
			
			if (!txtExists) {
				this.logger.warn(`TXT файл не найден для записи ${record.beelineId}: ${txtPath}`);
				return;
			}

			// Проверяем, что JSON файл анализа еще не существует
			const outputPath = path.join(this.exportDir, 'json', `${record.beelineId}_client_${record.phone}_analysis.json`);
			const jsonExists = await this.safeFileExists(outputPath);
			
			if (jsonExists) {
				this.logger.log(`Файл анализа уже существует для записи ${record.beelineId}: ${outputPath}`);
				// Обновляем флаг в БД, если файл уже есть
				record.deepseek_analysed = true;
				await this.abonentRecordRepository.save(record);
				return;
			}

			// Получаем результат анализа от Deepseek с обработкой ошибок
			let analysisResult;
			try {
				analysisResult = await this.aiDeepseekService.analyzeConversationFile(
					txtPath,
					record.phone,
					record.beelineId
				);
				
				// Успешный запрос - сбрасываем счетчик ошибок
				this.handleApiSuccess();
				
			} catch (error) {
				// Проверяем, является ли это ошибкой неполного JSON
				if ((error as any).isIncompleteJson) {
					this.logger.error(`❌ Неполный/некорректный JSON ответ для записи ${record.beelineId}. Запись НЕ будет помечена как проанализированная.`);
					this.logger.error(`🔍 Детали: ${error.message}`);
					if ((error as any).errorPosition) {
						this.logger.error(`📍 Позиция ошибки: ${(error as any).errorPosition}`);
					}
					
					// НЕ помечаем запись как проанализированную
					// НЕ создаем JSON файл
					// Просто переходим к следующей записи
					return; // Выходим без ошибки, чтобы не прерывать обработку очереди
				}
				
				// Проверяем ошибки парсинга JSON (SyntaxError)
				if (error instanceof SyntaxError || error.name === 'SyntaxError') {
					this.logger.error(`❌ Ошибка парсинга JSON для записи ${record.beelineId}: ${error.message}`);
					this.logger.error(`🔍 Тип ошибки: ${error.name}`);
					this.logger.error(`📝 Запись НЕ будет помечена как проанализированная и будет пропущена.`);
					
					// НЕ помечаем запись как проанализированную
					// НЕ создаем JSON файл
					// Просто переходим к следующей записи
					return; // Выходим без ошибки
				}
				
				// Проверяем сетевые ошибки
				if (this.isNetworkError(error)) {
					this.logger.error(`🌐 Сетевая ошибка для записи ${record.beelineId}: ${error.message}`);
					this.logger.error(`🔍 Код ошибки: ${error.code}, Причина: ${error.cause?.message || 'неизвестно'}`);
					
					// НЕ помечаем запись как проанализированную при сетевых ошибках
					// НЕ создаем JSON файл
					// Просто переходим к следующей записи
					return; // Выходим без ошибки
				}
				
				// Обрабатываем другие ошибки API
				this.handleApiError(error);
				
				// Если это 429 или 500 ошибка, добавляем задержку
				if (error.status === 429 || error.status === 500) {
					const delay = Math.min(60000, 10000 * this.consecutiveErrors); // От 10 до 60 секунд для 500 ошибок
					this.logger.warn(`Получена ${error.status} ошибка, ожидание ${delay}мс перед повтором`);
					await new Promise(resolve => setTimeout(resolve, delay));
					
					// Повторяем запрос один раз
					try {
						analysisResult = await this.aiDeepseekService.analyzeConversationFile(
							txtPath,
							record.phone,
							record.beelineId
						);
						this.handleApiSuccess();
					} catch (retryError) {
						// Проверяем, является ли повторная ошибка тоже неполным JSON или сетевой
						if ((retryError as any).isIncompleteJson || this.isNetworkError(retryError)) {
							this.logger.error(`❌ Повторная ошибка для записи ${record.beelineId}. Запись пропущена.`);
							return; // Выходим без ошибки
						}
						
						// Проверяем повторные ошибки парсинга JSON
						if (retryError instanceof SyntaxError || retryError.name === 'SyntaxError') {
							this.logger.error(`❌ Повторная ошибка парсинга JSON для записи ${record.beelineId}: ${retryError.message}`);
							this.logger.error(`📝 Запись пропущена.`);
							return; // Выходим без ошибки
						}
						
						this.handleApiError(retryError);
						throw retryError;
					}
				} else {
					throw error;
				}
			}

			// Создаем структурированный результат только если анализ прошел успешно
			const structuredResult = {
				record_id: record.beelineId,
				client_phone: record.phone,
				analysis_date: new Date().toISOString(),
				table: analysisResult.table,
				scoring: analysisResult.scoring
			};

			// Создаем папку json если её нет
			const jsonDir = path.join(this.exportDir, 'json');
			await fs.mkdir(jsonDir, { recursive: true });

			// Сохраняем структурированный результат в файл
			await fs.writeFile(outputPath, JSON.stringify(structuredResult, null, 2));
			
			// Обновляем запись в БД только при успешном анализе
			record.deepseek_analysed = true;
			record.deepseek_analysis = structuredResult;
			await this.abonentRecordRepository.save(record);

			this.logger.log(`✅ Запись ${record.beelineId} успешно проанализирована через очередь. Результат сохранен в ${outputPath}`);

		} catch (error) {
			this.logger.error(`❌ Ошибка при обработке записи ${record.beelineId} через очередь: ${error.message}`);
			
			// Проверяем, является ли это ошибкой парсинга JSON
			if (error instanceof SyntaxError || error.name === 'SyntaxError') {
				this.logger.error(`🔍 Обнаружена ошибка парсинга JSON: ${error.name}`);
				this.logger.error(`📝 Запись ${record.beelineId} будет пропущена и не помечена как проанализированная.`);
				
				// НЕ выбрасываем ошибку, чтобы не прерывать обработку очереди
				// Просто логируем и продолжаем работу
				return;
			}
			
			// Анализируем тип ошибки
			this.logErrorDetails(error, record);
			
			// Перебрасываем ошибку для обработки в базовом классе
			throw error;
		}
	}

	// Методы для адаптивного управления нагрузкой
	private isNetworkError(error: any): boolean {
		const networkErrorCodes = [
			'ECONNRESET',      // Соединение сброшено
			'ECONNREFUSED',    // Соединение отклонено
			'ENOTFOUND',       // Хост не найден
			'ETIMEDOUT',       // Таймаут соединения
			'ENETUNREACH',     // Сеть недоступна
			'ECONNABORTED',    // Соединение прервано
			'ERR_NETWORK',     // Общая сетевая ошибка
			'ERR_INTERNET_DISCONNECTED', // Интернет отключен
			'ERR_NETWORK_CHANGED'        // Сеть изменилась
		];
		
		return (
			networkErrorCodes.includes(error.code) ||
			error.message?.includes('network') ||
			error.message?.includes('connection') ||
			error.message?.includes('timeout') ||
			error.message?.includes('aborted') ||
			error.cause?.code === 'ECONNRESET'
		);
	}

	private handleApiError(error: any) {
		this.consecutiveErrors++;
		this.logger.warn(`API ошибка (${this.consecutiveErrors}/${this.maxConsecutiveErrors}): ${error.message}`);
		this.logger.warn(`Статус ошибки: ${error.status}, Тип: ${error.type || 'неизвестно'}, Код: ${error.code || 'неизвестно'}`);
		
		// Для неполных JSON, сетевых ошибок и ошибок парсинга не включаем адаптивный режим
		if (!(error as any).isIncompleteJson && !this.isNetworkError(error) && !(error instanceof SyntaxError) && error.name !== 'SyntaxError') {
			// Если получили 429, 500 или много ошибок подряд, включаем адаптивный режим
			if (error.status === 429 || error.status === 500 || this.consecutiveErrors >= this.maxConsecutiveErrors) {
				this.enableAdaptiveMode();
			}
		}
	}

	private handleApiSuccess() {
		// Сбрасываем счетчик ошибок при успешном запросе
		if (this.consecutiveErrors > 0) {
			this.consecutiveErrors = 0;
			this.logger.log('API работает стабильно, сбрасываем счетчик ошибок');
		}
		
		// Если в адаптивном режиме и нет ошибок, постепенно возвращаем нормальные настройки
		if (this.adaptiveMode && this.consecutiveErrors === 0) {
			this.graduallyRestoreSettings();
		}
	}

	private enableAdaptiveMode() {
		if (!this.adaptiveMode) {
			this.adaptiveMode = true;
			this.maxConcurrentRequests = Math.max(5, Math.floor(this.originalMaxConcurrent * 0.5));
			this.requestsPerMinute = Math.max(10, Math.floor(this.originalRequestsPerMinute * 0.5));
			this.logger.warn(`Включен адаптивный режим: ${this.maxConcurrentRequests} одновременных, ${this.requestsPerMinute} в минуту`);
		}
	}

	private graduallyRestoreSettings() {
		// Постепенно возвращаем нормальные настройки
		if (this.maxConcurrentRequests < this.originalMaxConcurrent) {
			this.maxConcurrentRequests = Math.min(this.originalMaxConcurrent, this.maxConcurrentRequests + 2);
		}
		if (this.requestsPerMinute < this.originalRequestsPerMinute) {
			this.requestsPerMinute = Math.min(this.originalRequestsPerMinute, this.requestsPerMinute + 5);
		}
		
		// Если вернулись к исходным настройкам, выключаем адаптивный режим
		if (this.maxConcurrentRequests >= this.originalMaxConcurrent && this.requestsPerMinute >= this.originalRequestsPerMinute) {
			this.adaptiveMode = false;
			this.logger.log('Адаптивный режим отключен, возвращены исходные настройки');
		}
	}

	// Методы для мониторинга состояния очереди
	getQueueStatus() {
		return {
			queueLength: this.queue.length,
			activeRequests: this.activeRequests,
			maxConcurrentRequests: this.maxConcurrentRequests,
			requestsPerMinute: this.requestsPerMinute,
			currentRequestsInLastMinute: this.requestTimestamps.length,
			isQueueProcessing: this.isQueueProcessing,
			isProcessing: this.isProcessing,
			lastStartTime: this.lastStartTime,
			adaptiveMode: this.adaptiveMode,
			consecutiveErrors: this.consecutiveErrors,
			originalSettings: {
				maxConcurrent: this.originalMaxConcurrent,
				requestsPerMinute: this.originalRequestsPerMinute
			}
		};
	}

	// Метод для принудительной очистки очереди
	clearQueue() {
		const queueLength = this.queue.length;
		this.queue = [];
		this.logger.log(`Очередь очищена. Удалено ${queueLength} записей`);
		return { cleared: queueLength };
	}

	// Метод для изменения настроек очереди
	updateQueueSettings(maxConcurrent?: number, requestsPerMinute?: number) {
		if (maxConcurrent !== undefined) {
			this.originalMaxConcurrent = maxConcurrent;
			if (!this.adaptiveMode) {
				this.maxConcurrentRequests = maxConcurrent;
			}
			this.logger.log(`Максимум одновременных запросов изменен на: ${maxConcurrent}`);
		}
		if (requestsPerMinute !== undefined) {
			this.originalRequestsPerMinute = requestsPerMinute;
			if (!this.adaptiveMode) {
				this.requestsPerMinute = requestsPerMinute;
			}
			this.logger.log(`Лимит запросов в минуту изменен на: ${requestsPerMinute}`);
		}
		return {
			maxConcurrentRequests: this.maxConcurrentRequests,
			requestsPerMinute: this.requestsPerMinute,
			originalSettings: {
				maxConcurrent: this.originalMaxConcurrent,
				requestsPerMinute: this.originalRequestsPerMinute
			},
			adaptiveMode: this.adaptiveMode
		};
	}

	// Метод для принудительного отключения адаптивного режима
	disableAdaptiveMode() {
		if (this.adaptiveMode) {
			this.adaptiveMode = false;
			this.maxConcurrentRequests = this.originalMaxConcurrent;
			this.requestsPerMinute = this.originalRequestsPerMinute;
			this.consecutiveErrors = 0;
			this.logger.log('Адаптивный режим принудительно отключен');
		}
		return {
			adaptiveMode: false,
			maxConcurrentRequests: this.maxConcurrentRequests,
			requestsPerMinute: this.requestsPerMinute
		};
	}
} 