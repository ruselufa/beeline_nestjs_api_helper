import { Injectable, Logger } from '@nestjs/common';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { GoogleAuth } from 'google-auth-library';
import { GoogleSheetsConfigService } from './google-sheets-config.service';
import { GoogleSheetsRow, WriteResult } from './types/google-sheets.types';
import * as fs from 'fs/promises';
import * as path from 'path';
import { google } from 'googleapis';

@Injectable()
export class GoogleSheetsService {
	private readonly logger = new Logger(GoogleSheetsService.name);
	private spreadsheet: GoogleSpreadsheet;

	constructor(
		private readonly configService: GoogleSheetsConfigService
	) {}

	private async mapDataToRow(data: GoogleSheetsRow): Promise<Record<string, any>> {
		const headers = await this.configService.getHeaders();
		const rowData: Record<string, any> = {};

		// Если данные пришли в формате блоков (как в JSON файле)
		if (data.table && Array.isArray(data.table.blocks)) {
			this.logger.log('Обработка данных в формате блоков...');
			
			data.table.blocks.forEach((block, blockIndex) => {
				this.logger.log(`Обработка блока ${blockIndex + 1}: ${block.blockName}`);
				
				if (Array.isArray(block.headers)) {
					block.headers.forEach(header => {
						try {
							const value = header.value;
							if (header.type === 'array' && Array.isArray(value)) {
								rowData[header.id] = value.join(', ');
							} else {
								rowData[header.id] = value;
							}
							this.logger.log(`Добавлено поле ${header.id}: ${rowData[header.id]}`);
						} catch (error) {
							this.logger.error(`Ошибка при обработке поля ${header.id}: ${error.message}`);
						}
					});
				}
			});
		} else {
			this.logger.log('Обработка данных в плоском формате...');
			
			// Базовые поля
			rowData.record_id = data.record_id || '';
			rowData.call_date = data.call_date || '';
			rowData.department = data.department || '';
			rowData.abonent_name = data.abonent_name || '';
			rowData.abonent_phone = data.abonent_phone || '';
			rowData.client_email = data.client_email || '';
			rowData.client_name = data.client_name || '';
			rowData.client_gc_id_link = data.client_gc_id_link || '';
			rowData.orders = Array.isArray(data.orders) ? data.orders.join(', ') : '';
			rowData.null_orders = Array.isArray(data.null_orders) ? data.null_orders.join(', ') : '';
			rowData.duration_seconds = data.duration_seconds || '';

			// Основная информация о звонке
			rowData.manager_name = data.manager_name || '';
			rowData.client_occupation = data.client_occupation || '';
			rowData.call_purpose = data.call_purpose || '';
			rowData.training_name = data.training_name || '';
			rowData.payment_agreements = data.payment_agreements || '';
			rowData.additional_info = data.additional_info || '';

			// Оценка этапов звонка
			rowData.greeting_score = data.greeting_score || '';
			rowData.greeting_good = Array.isArray(data.greeting_good) ? data.greeting_good.join(', ') : '';
			rowData.greeting_improve = Array.isArray(data.greeting_improve) ? data.greeting_improve.join(', ') : '';
			rowData.greeting_recommendation = data.greeting_recommendation || '';

			rowData.programming_score = data.programming_score || '';
			rowData.programming_good = Array.isArray(data.programming_good) ? data.programming_good.join(', ') : '';
			rowData.programming_improve = Array.isArray(data.programming_improve) ? data.programming_improve.join(', ') : '';
			rowData.programming_recommendation = data.programming_recommendation || '';

			rowData.needs_score = data.needs_score || '';
			rowData.needs_good = Array.isArray(data.needs_good) ? data.needs_good.join(', ') : '';
			rowData.needs_improve = Array.isArray(data.needs_improve) ? data.needs_improve.join(', ') : '';
			rowData.needs_recommendation = data.needs_recommendation || '';

			rowData.summary_score = data.summary_score || '';
			rowData.summary_good = Array.isArray(data.summary_good) ? data.summary_good.join(', ') : '';
			rowData.summary_improve = Array.isArray(data.summary_improve) ? data.summary_improve.join(', ') : '';
			rowData.summary_recommendation = data.summary_recommendation || '';

			rowData.presentation_score = data.presentation_score || '';
			rowData.presentation_good = Array.isArray(data.presentation_good) ? data.presentation_good.join(', ') : '';
			rowData.presentation_improve = Array.isArray(data.presentation_improve) ? data.presentation_improve.join(', ') : '';
			rowData.presentation_recommendation = data.presentation_recommendation || '';

			rowData.objections_score = data.objections_score || '';
			rowData.objections_good = Array.isArray(data.objections_good) ? data.objections_good.join(', ') : '';
			rowData.objections_improve = Array.isArray(data.objections_improve) ? data.objections_improve.join(', ') : '';
			rowData.objections_recommendation = data.objections_recommendation || '';

			rowData.closure_score = data.closure_score || '';
			rowData.closure_good = Array.isArray(data.closure_good) ? data.closure_good.join(', ') : '';
			rowData.closure_improve = Array.isArray(data.closure_improve) ? data.closure_improve.join(', ') : '';
			rowData.closure_recommendation = data.closure_recommendation || '';

			// Общая оценка
			rowData.total_score = data.total_score || '';
			rowData.overall_good = Array.isArray(data.overall_good) ? data.overall_good.join(', ') : '';
			rowData.overall_improve = Array.isArray(data.overall_improve) ? data.overall_improve.join(', ') : '';
			rowData.overall_recommendations = Array.isArray(data.overall_recommendations) ? data.overall_recommendations.join(', ') : '';

			// Шаблон рекомендаций
			rowData.recommendation_greeting = data.recommendation_greeting || '';
			rowData.recommendation_points = Array.isArray(data.recommendation_points) ? data.recommendation_points.join(', ') : '';
			rowData.recommendation_closing = data.recommendation_closing || '';
		}

		this.logger.log('Подготовленные данные для записи в таблицу:');
		this.logger.log(JSON.stringify(rowData, null, 2));

		return rowData;
	}

	async initializeTable(): Promise<void> {
		try {
			const config = await this.configService.getGoogleSheetsConfig();
			const headers = await this.configService.getHeaders();
			const credentials = await this.configService.getCredentials();
			
			this.logger.log(`Получены заголовки: ${headers.join(', ')}`);
			
			// Настраиваем аутентификацию
			const auth = new GoogleAuth({
				credentials: credentials,
				scopes: ['https://www.googleapis.com/auth/spreadsheets']
			});

			// Инициализируем таблицу
			this.spreadsheet = new GoogleSpreadsheet(config.spreadsheet_id, auth);
			await this.spreadsheet.loadInfo();

			// Получаем первый лист
			let sheet = this.spreadsheet.sheetsByIndex[0];
			if (!sheet) {
				// Если листа нет, создаем новый
				sheet = await this.spreadsheet.addSheet({
					title: 'Call Analysis',
					headerValues: headers,
					gridProperties: {
						rowCount: 1000,
						columnCount: headers.length,
						frozenRowCount: 1
					}
				});
				this.logger.log('Создан новый лист с заголовками');
			} else {
				// Обновляем заголовки
				this.logger.log('Обновляем заголовки таблицы...');
				await sheet.setHeaderRow(headers);
				this.logger.log('Заголовки обновлены');
			}

			this.logger.log('✓ Таблица успешно инициализирована');
		} catch (error) {
			this.logger.error(`Ошибка инициализации таблицы: ${error.message}`);
			throw error;
		}
	}

	private areHeadersValid(currentHeaders: string[], requiredHeaders: string[]): boolean {
		if (currentHeaders.length !== requiredHeaders.length) {
			return false;
		}
		return currentHeaders.every((header, index) => header === requiredHeaders[index]);
	}

	async writeRow(data: GoogleSheetsRow): Promise<WriteResult> {
		try {
			// Убеждаемся, что таблица инициализирована
			if (!this.spreadsheet) {
				await this.initializeTable();
			}
			
			// Получаем первый лист
			let sheet = this.spreadsheet.sheetsByIndex[0];
			if (!sheet) {
				const headers = await this.configService.getHeaders();
				sheet = await this.spreadsheet.addSheet({ 
					title: 'Call Analysis',
					headerValues: headers
				});
			}

			// Преобразуем данные в массив значений согласно заголовкам
			const rowData = await this.mapDataToRow(data);
			
			// Добавляем строку
			await sheet.addRow(rowData);

			this.logger.log(`Успешно добавлена строка для записи: ${data.record_id}`);
			
			return {
				success: true,
				rowsWritten: 1
			};
		} catch (error) {
			this.logger.error(`Ошибка записи в Google Sheets: ${error.message}`);
			return {
				success: false,
				error: error.message
			};
		}
	}

	async writeMultipleRows(dataArray: GoogleSheetsRow[]): Promise<WriteResult> {
		try {
			// Убеждаемся, что таблица инициализирована
			if (!this.spreadsheet) {
				await this.initializeTable();
			}
			
			let sheet = this.spreadsheet.sheetsByIndex[0];
			if (!sheet) {
				const headers = await this.configService.getHeaders();
				sheet = await this.spreadsheet.addSheet({ 
					title: 'Call Analysis',
					headerValues: headers
				});
			} else {
				await sheet.loadHeaderRow();
				if (sheet.headerValues.length === 0) {
					const headers = await this.configService.getHeaders();
					await sheet.setHeaderRow(headers);
				}
			}

			// Преобразуем все данные в массив строк
			const rowsData = await Promise.all(dataArray.map(data => this.mapDataToRow(data)));
			
			// Добавляем все строки за один раз
			await sheet.addRows(rowsData);

			this.logger.log(`Успешно добавлено ${dataArray.length} строк в Google Sheets`);
			
			return {
				success: true,
				rowsWritten: dataArray.length
			};
		} catch (error) {
			this.logger.error(`Ошибка записи множественных строк в Google Sheets: ${error.message}`);
			return {
				success: false,
				error: error.message
			};
		}
	}

	async readJsonFile(filePath: string): Promise<any> {
		try {
			const fileContent = await fs.readFile(filePath, 'utf-8');
			return JSON.parse(fileContent);
		} catch (error) {
			this.logger.error(`Ошибка чтения JSON файла ${filePath}: ${error.message}`);
			throw error;
		}
	}

	async readJsonFiles(directory: string): Promise<any[]> {
		try {
			const files = await fs.readdir(directory);
			const jsonFiles = files.filter(file => file.endsWith('.json'));
			
			const jsonData = [];
			for (const file of jsonFiles) {
				const filePath = path.join(directory, file);
				const data = await this.readJsonFile(filePath);
				jsonData.push({
					filename: file,
					data: data
				});
			}

			this.logger.log(`Прочитано ${jsonFiles.length} JSON файлов из директории ${directory}`);
			return jsonData;
		} catch (error) {
			this.logger.error(`Ошибка чтения JSON файлов из директории ${directory}: ${error.message}`);
			throw error;
		}
	}

	async testConnection(): Promise<boolean> {
		try {
			await this.spreadsheet;
			this.logger.log('✓ Подключение к Google Sheets успешно');
			return true;
		} catch (error) {
			this.logger.error(`❌ Ошибка подключения к Google Sheets: ${error.message}`);
			return false;
		}
	}
} 