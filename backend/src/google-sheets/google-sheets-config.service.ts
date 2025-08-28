import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { GoogleSheetsConfig, GoogleSheetsCredentials } from './types/google-sheets.types';
import { TableConfig } from '../ai_deepseek/types/analysis.types';
import { SHEETS_CONFIG_V2 } from '../ai_deepseek/config/config.sheets_v2';

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
			// Используем SHEETS_CONFIG_V2 вместо загрузки из файла
			this.tableConfig = SHEETS_CONFIG_V2;
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
		try {
			// Используем новую конфигурацию SHEETS_CONFIG_V2
			const headers: string[] = [];
			
			// Извлекаем все ID из всех блоков
			SHEETS_CONFIG_V2.blocks.forEach(block => {
				// this.logger.log(`Обрабатываем блок: ${block.blockName}`);
				block.headers.forEach(header => {
					// this.logger.log(`Добавляем заголовок: ${header.id} (${header.label})`);
					if (!headers.includes(header.id)) {
						headers.push(header.id);
					}
				});
			});

			// this.logger.log(`Итоговые заголовки: ${headers.join(', ')}`);
			return headers;
		} catch (error) {
			this.logger.warn(`Не удалось загрузить заголовки: ${error.message}`);
			return [];
		}
	}
} 