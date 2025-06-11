import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiDeepseekService } from '../ai_deepseek/ai_deepseek.service';
import { AbonentRecord } from '../entities/beeline/abonent.record.entity';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class ConversationAnalyzerService implements OnModuleInit {
	private readonly logger = new Logger(ConversationAnalyzerService.name);
	private readonly exportTxtDir = path.join(process.cwd(), 'export', 'txt');
	private readonly exportJsonDir = path.join(process.cwd(), 'export', 'json');
	private isProcessing = false;

	constructor(
		private aiDeepseekService: AiDeepseekService,
		@InjectRepository(AbonentRecord)
		private readonly abonentRecordRepository: Repository<AbonentRecord>
	) { }

	async onModuleInit() {
		this.logger.log('Инициализация сервиса анализа разговоров...');
		await this.ensureDirectories();
		await this.processFiles();
	}

	private async ensureDirectories() {
		try {
			await fs.mkdir(this.exportTxtDir, { recursive: true });
			await fs.mkdir(this.exportJsonDir, { recursive: true });
			this.logger.log('Директории для экспорта созданы или уже существуют');
		} catch (error) {
			this.logger.error(`Ошибка при создании директорий: ${error.message}`);
			throw error;
		}
	}

	private async processFiles() {
		if (this.isProcessing) {
			this.logger.warn('Обработка файлов уже выполняется');
			return;
		}

		this.isProcessing = true;

		try {
			const files = await fs.readdir(this.exportTxtDir);
			const txtFiles = files.filter(file => file.endsWith('.txt'));

			if (txtFiles.length === 0) {
				this.logger.log('Нет файлов для обработки');
				return;
			}

			// Обрабатываем только первые 2 файла
			const filesToProcess = txtFiles.slice(0, 2);

			for (const file of filesToProcess) {
				await this.processFile(file);
			}

			this.logger.log(`Обработка файлов завершена. Обработано файлов: ${filesToProcess.length}`);
		} catch (error) {
			this.logger.error(`Ошибка при обработке файлов: ${error.message}`);
		} finally {
			this.isProcessing = false;
		}
	}

	private async processFile(filename: string) {
		const inputPath = path.join(this.exportTxtDir, filename);
		const outputPath = path.join(
			this.exportJsonDir,
			`${path.parse(filename).name}_analysis.json`
		);

		try {
			this.logger.log(`Начинаем обработку файла: ${filename}`);

			// Проверяем, существует ли уже файл с результатами
			try {
				await fs.access(outputPath);
				this.logger.warn(`Файл ${outputPath} уже существует, пропускаем обработку`);
				return;
			} catch {
				// Файл не существует, продолжаем обработку
			}

			// 185547108_client_9060845434.txt
			const clientPhone = filename.split('_')[2].split('.')[0];
			const recordId = filename.split('_')[0];
			
			// Анализируем разговор
			const result = await this.aiDeepseekService.analyzeConversationFile(inputPath, clientPhone, recordId);
			
			this.logger.log('Получен результат от Deepseek:');
			this.logger.log(JSON.stringify(result, null, 2));

			// Структурируем результат анализа
			const structuredResult = {
				record_id: recordId,
				client_phone: clientPhone,
				analysis_date: new Date().toISOString(),
				table: {
					blocks: [
						{
							blockName: 'Основная информация о звонке',
							headers: [
								{ id: 'manager_name', type: 'string', value: result.manager_name || '' },
								{ id: 'client_occupation', type: 'string', value: result.client_occupation || '' },
								{ id: 'call_purpose', type: 'string', value: result.call_purpose || '' },
								{ id: 'training_name', type: 'string', value: result.training_name || '' },
								{ id: 'payment_agreements', type: 'string', value: result.payment_agreements || '' },
								{ id: 'additional_info', type: 'string', value: result.additional_info || '' }
							]
						},
						{
							blockName: 'Оценка этапов звонка',
							headers: [
								{ id: 'greeting_score', type: 'string', value: result.greeting_score || '' },
								{ id: 'greeting_good', type: 'array', value: Array.isArray(result.greeting_good) ? result.greeting_good : [] },
								{ id: 'greeting_improve', type: 'array', value: Array.isArray(result.greeting_improve) ? result.greeting_improve : [] },
								{ id: 'greeting_recommendation', type: 'string', value: result.greeting_recommendation || '' },
								
								{ id: 'programming_score', type: 'string', value: result.programming_score || '' },
								{ id: 'programming_good', type: 'array', value: Array.isArray(result.programming_good) ? result.programming_good : [] },
								{ id: 'programming_improve', type: 'array', value: Array.isArray(result.programming_improve) ? result.programming_improve : [] },
								{ id: 'programming_recommendation', type: 'string', value: result.programming_recommendation || '' },
								
								{ id: 'needs_score', type: 'string', value: result.needs_score || '' },
								{ id: 'needs_good', type: 'array', value: Array.isArray(result.needs_good) ? result.needs_good : [] },
								{ id: 'needs_improve', type: 'array', value: Array.isArray(result.needs_improve) ? result.needs_improve : [] },
								{ id: 'needs_recommendation', type: 'string', value: result.needs_recommendation || '' },
								
								{ id: 'summary_score', type: 'string', value: result.summary_score || '' },
								{ id: 'summary_good', type: 'array', value: Array.isArray(result.summary_good) ? result.summary_good : [] },
								{ id: 'summary_improve', type: 'array', value: Array.isArray(result.summary_improve) ? result.summary_improve : [] },
								{ id: 'summary_recommendation', type: 'string', value: result.summary_recommendation || '' },
								
								{ id: 'presentation_score', type: 'string', value: result.presentation_score || '' },
								{ id: 'presentation_good', type: 'array', value: Array.isArray(result.presentation_good) ? result.presentation_good : [] },
								{ id: 'presentation_improve', type: 'array', value: Array.isArray(result.presentation_improve) ? result.presentation_improve : [] },
								{ id: 'presentation_recommendation', type: 'string', value: result.presentation_recommendation || '' },
								
								{ id: 'objections_score', type: 'string', value: result.objections_score || '' },
								{ id: 'objections_good', type: 'array', value: Array.isArray(result.objections_good) ? result.objections_good : [] },
								{ id: 'objections_improve', type: 'array', value: Array.isArray(result.objections_improve) ? result.objections_improve : [] },
								{ id: 'objections_recommendation', type: 'string', value: result.objections_recommendation || '' },
								
								{ id: 'closure_score', type: 'string', value: result.closure_score || '' },
								{ id: 'closure_good', type: 'array', value: Array.isArray(result.closure_good) ? result.closure_good : [] },
								{ id: 'closure_improve', type: 'array', value: Array.isArray(result.closure_improve) ? result.closure_improve : [] },
								{ id: 'closure_recommendation', type: 'string', value: result.closure_recommendation || '' }
							]
						},
						{
							blockName: 'Общая оценка',
							headers: [
								{ id: 'total_score', type: 'string', value: result.total_score || '' },
								{ id: 'overall_good', type: 'array', value: Array.isArray(result.overall_good) ? result.overall_good : [] },
								{ id: 'overall_improve', type: 'array', value: Array.isArray(result.overall_improve) ? result.overall_improve : [] },
								{ id: 'overall_recommendations', type: 'array', value: Array.isArray(result.overall_recommendations) ? result.overall_recommendations : [] }
							]
						},
						{
							blockName: 'Шаблон рекомендаций',
							headers: [
								{ id: 'recommendation_greeting', type: 'string', value: result.recommendation_greeting || '' },
								{ id: 'recommendation_points', type: 'array', value: Array.isArray(result.recommendation_points) ? result.recommendation_points : [] },
								{ id: 'recommendation_closing', type: 'string', value: result.recommendation_closing || '' }
							]
						}
					]
				}
			};

			this.logger.log('Подготовленный структурированный результат:');
			this.logger.log(JSON.stringify(structuredResult, null, 2));

			// Сохраняем структурированный результат
			await fs.writeFile(
				outputPath,
				JSON.stringify(structuredResult, null, 2),
				'utf-8'
			);

			// Обновляем запись в БД - помечаем как проанализированную и сохраняем результат
			try {
				const abonentRecord = await this.abonentRecordRepository.findOne({
					where: { beelineId: recordId }
				});

				if (abonentRecord) {
					abonentRecord.deepseek_analysed = true;
					abonentRecord.deepseek_analysis = structuredResult;
					await this.abonentRecordRepository.save(abonentRecord);
					this.logger.log(`✓ Запись ${recordId} обновлена в БД с результатами анализа`);
				} else {
					this.logger.warn(`⚠️ Запись с beelineId ${recordId} не найдена в БД`);
				}
			} catch (dbError) {
				this.logger.error(`❌ Ошибка обновления БД для записи ${recordId}: ${dbError.message}`);
			}

			this.logger.log(`Файл ${filename} успешно обработан. Результат сохранен в ${outputPath}`);
			
		} catch (error) {
			this.logger.error(`Ошибка при обработке файла ${filename}: ${error.message}`);
			// Записываем информацию об ошибке в отдельный файл
			const errorPath = path.join(
				this.exportJsonDir,
				`${path.parse(filename).name}_error.json`
			);
			await fs.writeFile(
				errorPath,
				JSON.stringify({ error: error.message, timestamp: new Date().toISOString() }, null, 2),
				'utf-8'
			);
		}
	}
} 