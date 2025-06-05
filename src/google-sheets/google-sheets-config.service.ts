import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { GoogleSheetsConfig, TableConfig, GoogleSheetsCredentials } from './types/google-sheets.types';

@Injectable()
export class GoogleSheetsConfigService {
	private readonly logger = new Logger(GoogleSheetsConfigService.name);
	private config: GoogleSheetsConfig | null = null;
	private tableConfig: TableConfig | null = null;
	private credentials: GoogleSheetsCredentials | null = null;

	constructor(private configService: ConfigService) {}

	async getGoogleSheetsConfig(): Promise<GoogleSheetsConfig> {
		if (this.config) {
			return this.config;
		}

		try {
			const env = this.configService.get<string>('NODE_ENV') || 'development';
			const configFileName = env === 'production' 
				? 'config_sheets_production.json' 
				: 'config_sheets_dev.json';
			
			const configPath = path.join(process.cwd(), 'src', 'config', 'google_sheets', configFileName);
			const configData = await fs.readFile(configPath, 'utf-8');
			
			this.config = JSON.parse(configData);
			this.logger.log(`Загружена конфигурация Google Sheets для среды: ${env}`);
			
			return this.config;
		} catch (error) {
			this.logger.error(`Ошибка загрузки конфигурации Google Sheets: ${error.message}`);
			throw error;
		}
	}

	async getTableConfig(): Promise<TableConfig> {
		if (this.tableConfig) {
			return this.tableConfig;
		}

		try {
			const configPath = path.join(process.cwd(), 'src', 'ai_deepseek', 'config.json');
			const configData = await fs.readFile(configPath, 'utf-8');
			const data = JSON.parse(configData);
			
			this.tableConfig = data.table;
			this.logger.log('Загружена конфигурация таблицы Google Sheets');
			
			return this.tableConfig;
		} catch (error) {
			this.logger.error(`Ошибка загрузки конфигурации таблицы: ${error.message}`);
			throw error;
		}
	}

	async getCredentials(): Promise<GoogleSheetsCredentials> {
		if (this.credentials) {
			return this.credentials;
		}

		try {
			const config = await this.getGoogleSheetsConfig();
			const credentialsPath = path.join(process.cwd(), config.credentials_path);
			const credentialsData = await fs.readFile(credentialsPath, 'utf-8');
			
			this.credentials = JSON.parse(credentialsData);
			this.logger.log('Загружены учетные данные Google Sheets');
			
			return this.credentials;
		} catch (error) {
			this.logger.error(`Ошибка загрузки учетных данных: ${error.message}`);
			throw error;
		}
	}

	async getSpreadsheetId(): Promise<string> {
		const config = await this.getGoogleSheetsConfig();
		return config.spreadsheet_id;
	}

	async getHeaders(): Promise<string[]> {
		// Базовые заголовки для таблицы
		const baseHeaders = [
			'record_id',
			'call_date', 
			'department',
			'abonent_name',
			'abonent_phone',
			'client_email',
			'client_name',
			'client_gc_id_link',
			'orders',
			'null_orders',
			'duration_seconds'
		];

		try {
			// Получаем заголовки из конфигурации AI
			const tableConfig = await this.getTableConfig();
			const aiHeaders: string[] = [];
			
			// Извлекаем все ID из всех блоков
			tableConfig.blocks.forEach(block => {
				block.headers.forEach(header => {
					aiHeaders.push(header.id);
				});
			});

			// Объединяем базовые заголовки с заголовками AI
			return [...baseHeaders, ...aiHeaders];
		} catch (error) {
			this.logger.warn(`Не удалось загрузить AI заголовки, используем базовые: ${error.message}`);
			
			// Фоллбэк на старые заголовки
			return [
				...baseHeaders,
				// AI analysis fields
				'sale_probability',
				'rating_explanation_1',
				'conversation_result',
				'detailed_summary',
				'attitude',
				'rating_explanation_2',
				'facts',
				'needs',
				'objections',
				'politeness',
				'rating_explanation_3',
				'presentation',
				'rating_explanation_4',
				'objection_handling',
				'rating_explanation_5',
				'mop_advice'
			];
		}
	}
} 