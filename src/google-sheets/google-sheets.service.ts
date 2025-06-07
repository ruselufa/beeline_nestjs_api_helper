import { Injectable, Logger } from '@nestjs/common';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { GoogleAuth } from 'google-auth-library';
import { GoogleSheetsConfigService } from './google-sheets-config.service';
import { GoogleSheetsRow, WriteResult } from './types/google-sheets.types';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class GoogleSheetsService {
	private readonly logger = new Logger(GoogleSheetsService.name);
	private spreadsheet: GoogleSpreadsheet | null = null;

	constructor(private configService: GoogleSheetsConfigService) {}

	async initializeSpreadsheet(): Promise<GoogleSpreadsheet> {
		if (this.spreadsheet) {
			return this.spreadsheet;
		}

		try {
			const credentials = await this.configService.getCredentials();
			const spreadsheetId = await this.configService.getSpreadsheetId();

			const auth = new GoogleAuth({
				credentials: credentials,
				scopes: ['https://www.googleapis.com/auth/spreadsheets']
			});

			this.spreadsheet = new GoogleSpreadsheet(spreadsheetId, auth);
			await this.spreadsheet.loadInfo();

			this.logger.log(`Инициализирована Google таблица: ${this.spreadsheet.title}`);
			return this.spreadsheet;
		} catch (error) {
			this.logger.error(`Ошибка инициализации Google Sheets: ${error.message}`);
			throw error;
		}
	}

	async initializeTable(): Promise<void> {
		try {
			const spreadsheet = await this.initializeSpreadsheet();
			const headers = await this.configService.getHeaders();
			
			// Получаем существующий лист
			let sheet = spreadsheet.sheetsByIndex[0];
			
			if (!sheet) {
				// Если листа нет, создаем новый
				sheet = await spreadsheet.addSheet({ 
					title: 'Call Analysis',
					headerValues: headers,
					gridProperties: {
						rowCount: 1000,
						columnCount: headers.length,
						frozenRowCount: 1 // Фиксируем первую строку
					}
				});
				this.logger.log('Создан новый лист с заголовками');
			} else {
				// Проверяем количество колонок
				const currentProperties = sheet.gridProperties;
				if (currentProperties.columnCount < headers.length) {
					this.logger.warn(`Внимание: существующий лист имеет ${currentProperties.columnCount} колонок, а требуется ${headers.length}. 
						Некоторые заголовки не будут установлены. Рекомендуется создать новый лист вручную.`);
					
					// Ограничиваем количество заголовков текущим размером листа
					headers.length = currentProperties.columnCount;
				}
			}
			
			// Загружаем ячейки для проверки и форматирования заголовков
			await sheet.loadCells();
			
			// Проверяем и обновляем заголовки если нужно
			let needUpdate = false;
			for (let i = 0; i < headers.length; i++) {
				const cell = sheet.getCell(0, i);
				if (cell.value !== headers[i]) {
					needUpdate = true;
					break;
				}
			}
			
			if (needUpdate) {
				this.logger.log('Обновляем заголовки таблицы...');
				
				// Форматируем заголовки
				for (let i = 0; i < headers.length; i++) {
					const cell = sheet.getCell(0, i);
					cell.value = headers[i];
					
					// Форматирование текста
					cell.textFormat = { 
						bold: true,
						fontSize: 11
					};
					
					// Форматирование ячейки
					cell.backgroundColor = { red: 0.95, green: 0.95, blue: 0.95 };
					cell.horizontalAlignment = 'CENTER';
					cell.verticalAlignment = 'MIDDLE';
					cell.wrapStrategy = 'WRAP';
				}
				
				await sheet.saveUpdatedCells();
				this.logger.log('Заголовки успешно обновлены и отформатированы');
			} else {
				this.logger.log('Заголовки уже актуальны');
			}
			
			this.logger.log('Таблица успешно инициализирована');
		} catch (error) {
			this.logger.error(`Ошибка инициализации таблицы: ${error.message}`);
			throw error;
		}
	}

	async writeRow(data: GoogleSheetsRow): Promise<WriteResult> {
		try {
			const spreadsheet = await this.initializeSpreadsheet();
			
			// Получаем первый лист или создаем новый
			let sheet = spreadsheet.sheetsByIndex[0];
			if (!sheet) {
				const headers = await this.configService.getHeaders();
				sheet = await spreadsheet.addSheet({ 
					title: 'Call Analysis',
					headerValues: headers
				});
			} else {
				// Проверяем есть ли заголовки
				await sheet.loadHeaderRow();
				if (sheet.headerValues.length === 0) {
					const headers = await this.configService.getHeaders();
					await sheet.setHeaderRow(headers);
				}
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
			const spreadsheet = await this.initializeSpreadsheet();
			
			let sheet = spreadsheet.sheetsByIndex[0];
			if (!sheet) {
				const headers = await this.configService.getHeaders();
				sheet = await spreadsheet.addSheet({ 
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

	private async mapDataToRow(data: GoogleSheetsRow): Promise<any> {
		const headers = await this.configService.getHeaders();
		const row: any = {};
		
		headers.forEach(header => {
			row[header] = data[header as keyof GoogleSheetsRow] || '';
		});
		
		return row;
	}

	async testConnection(): Promise<boolean> {
		try {
			await this.initializeSpreadsheet();
			this.logger.log('✓ Подключение к Google Sheets успешно');
			return true;
		} catch (error) {
			this.logger.error(`❌ Ошибка подключения к Google Sheets: ${error.message}`);
			return false;
		}
	}
} 