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

@Injectable()
export class ConversationAnalyzerService implements OnApplicationBootstrap {
	private readonly logger = new Logger(ConversationAnalyzerService.name);
	private readonly exportDir = path.join(process.cwd(), 'export');
	public isProcessing = false;
	public lastStartTime: Date | null = null;

	constructor(
		private aiDeepseekService: AiDeepseekService,
		@InjectRepository(AbonentRecord)
		private readonly abonentRecordRepository: Repository<AbonentRecord>,
		@InjectRepository(AnalyzedAi)
		private readonly analyzedAiRepository: Repository<AnalyzedAi>,
	) { }

	async onApplicationBootstrap() {
		// Убираем автоматический запуск при старте приложения
		// Оставляем только cron-задачу для регулярного запуска
		console.log('ConversationAnalyzerService инициализирован. Анализ разговоров будет выполняться по расписанию.');
	}

	// Запускаем анализ каждые 15 минут
	@Cron('*/15 * * * *')
	async processAnalysis() {
		if (this.isProcessing) {
			const runningTime = Date.now() - this.lastStartTime.getTime();
			console.warn(`Анализ разговоров уже выполняется ${Math.floor(runningTime / 1000)} секунд, пропускаем запуск`);
			return;
		}

		this.isProcessing = true;
		this.lastStartTime = new Date();
		
		try {
			console.log('Запуск cron-задачи: анализ разговоров');
			await this.processFreshRecordsForAnalysis();
			console.log('Анализ разговоров успешно завершен');
		} catch (error) {
			console.error('Ошибка выполнения анализа разговоров:', error);
		} finally {
			this.isProcessing = false;
			this.lastStartTime = null;
		}
	}

	async processFreshRecordsForAnalysis() {
		if (this.isProcessing) {
			this.logger.warn('Обработка записей уже выполняется');
			return;
		}

		this.isProcessing = true;

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

			let processedCount = 0;
			for (const record of records) {
				try {
					await this.processRecord(record);
					processedCount++;
					this.logger.log(`Запись ${record.beelineId} успешно проанализирована. (Прогресс: ${processedCount}/${records.length})`);
				} catch (error) {
					this.logger.error(`Ошибка при анализе записи ${record.beelineId}: ${error.message}`);
					continue;
				}
			}

			this.logger.log(`Анализ завершен. Обработано записей: ${processedCount} из ${records.length}`);
		} catch (error) {
			this.logger.error(`Ошибка при обработке записей: ${error.message}`);
			throw error;
		} finally {
			this.isProcessing = false;
		}
	}

	private async processRecord(record: AbonentRecord): Promise<void> {
		try {
			// Проверяем, что txt файл существует
			const txtPath = path.join(this.exportDir, 'txt', `${record.beelineId}_client_${record.phone}.txt`);
			const txtExists = await fs.access(txtPath).then(() => true).catch(() => false);
			
			if (!txtExists) {
				this.logger.warn(`TXT файл не найден для записи ${record.beelineId}: ${txtPath}`);
				return;
			}

			// Проверяем, что JSON файл анализа еще не существует
			const outputPath = path.join(this.exportDir, 'json', `${record.beelineId}_client_${record.phone}_analysis.json`);
			const jsonExists = await fs.access(outputPath).then(() => true).catch(() => false);
			
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

			this.logger.log(`Запись ${record.beelineId} успешно проанализирована. Результат сохранен в ${outputPath}`);

		} catch (error) {
			this.logger.error(`Ошибка при обработке записи ${record.beelineId}: ${error.message}`);
			throw error;
		}
	}

	// Оставляем старый метод для обратной совместимости
	async processFiles() {
		this.logger.warn('Метод processFiles устарел. Используйте processFreshRecordsForAnalysis');
		await this.processFreshRecordsForAnalysis();
	}
} 