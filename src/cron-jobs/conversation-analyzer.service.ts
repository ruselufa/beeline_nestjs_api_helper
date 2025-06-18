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
	private readonly exportDir = path.join(process.cwd(), 'export');
	private isProcessing = false;

	constructor(
		private aiDeepseekService: AiDeepseekService,
		@InjectRepository(AbonentRecord)
		private readonly abonentRecordRepository: Repository<AbonentRecord>
	) { }

	async onModuleInit() {
		this.logger.log('Инициализация сервиса анализа разговоров...');
		// await this.processFiles();
	}

	private async processFiles() {
		if (this.isProcessing) {
			this.logger.warn('Обработка файлов уже выполняется');
			return;
		}

		this.isProcessing = true;

		try {
			const files = await fs.readdir(path.join(this.exportDir, 'txt'));
			const txtFiles = files.filter(file => file.endsWith('.txt'));

			this.logger.log(`Найдено ${txtFiles.length} файлов для обработки`);

			for (const file of txtFiles) {
				try {
					await this.processFile(file);
				} catch (error) {
					this.logger.error(`Ошибка при обработке файла ${file}: ${error.message}`);
					continue;
				}
			}

			this.logger.log('Обработка файлов завершена');
		} catch (error) {
			this.logger.error(`Ошибка при обработке файлов: ${error.message}`);
			throw error;
		} finally {
			this.isProcessing = false;
		}
	}

	private async processFile(filePath: string): Promise<void> {
		try {
			const outputPath = path.join(this.exportDir, 'json', path.basename(filePath, '.txt') + '_analysis.json');
			
			// Проверяем, существует ли уже файл анализа
			try {
				await fs.access(outputPath);
				this.logger.log(`Файл анализа уже существует: ${outputPath}`);
				return;
			} catch {
				// Файл не существует, продолжаем обработку
			}

			// Извлекаем clientPhone и recordId из имени файла
			const fileName = path.basename(filePath, '.txt');
			const [recordId, , clientPhone] = fileName.split('_');

			// Получаем результат анализа от Deepseek
			const analysisResult = await this.aiDeepseekService.analyzeConversationFile(
				path.join(this.exportDir, 'txt', fileName + '.txt'),
				clientPhone,
				recordId
			);

			// Создаем структурированный результат
			const structuredResult = {
				record_id: recordId,
				client_phone: clientPhone,
				analysis_date: new Date().toISOString(),
				table: analysisResult.table,
				scoring: analysisResult.scoring
			};

			// Сохраняем структурированный результат в файл
			await fs.writeFile(outputPath, JSON.stringify(structuredResult, null, 2));
			this.logger.log(`Файл ${filePath} успешно обработан. Результат сохранен в ${outputPath}`);

		} catch (error) {
			this.logger.error(`Ошибка при обработке файла ${filePath}: ${error.message}`);
			throw error;
		}
	}
} 