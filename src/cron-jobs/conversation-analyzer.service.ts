import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AiDeepseekService } from '../ai_deepseek/ai_deepseek.service';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class ConversationAnalyzerService implements OnModuleInit {
	private readonly logger = new Logger(ConversationAnalyzerService.name);
	private readonly exportTxtDir = path.join(process.cwd(), 'export', 'txt');
	private readonly exportJsonDir = path.join(process.cwd(), 'export', 'json');
	private isProcessing = false;

	constructor(private aiDeepseekService: AiDeepseekService) { }

	async onModuleInit() {
		this.logger.log('Инициализация сервиса анализа разговоров...');
		// await this.ensureDirectories();
		// await this.processFiles();
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
			// Анализируем разговор
			const result = await this.aiDeepseekService.analyzeConversationFile(inputPath, clientPhone);

			// Сохраняем результат
			await fs.writeFile(
				outputPath,
				JSON.stringify(result, null, 2),
				'utf-8'
			);

			this.logger.log(`Файл ${filename} успешно обработан. Результат сохранен в ${outputPath}`);

			// Опционально: перемещаем обработанный файл в архив или удаляем
			// await fs.unlink(inputPath);

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