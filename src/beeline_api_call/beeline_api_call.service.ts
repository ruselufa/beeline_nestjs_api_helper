import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AbonentRecord } from '../entities/abonent.record.entity';
import {
	AbonentsResponse,
	ApiErrorResponse,
	RecordDetailsResponse,
} from './beeline_api_call.interface';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class BeelineApiCallService {
	constructor(
		private readonly httpService: HttpService,
		@InjectRepository(AbonentRecord)
		private readonly abonentRecordRepository: Repository<AbonentRecord>,
	) {}

	async getAllAbonents(): Promise<AbonentsResponse[]> {
		// const token = process.env.API_AUTH_TOKEN;
		const token = '655bc2aa-198f-44a8-a66b-11c90a72f684';
		if (!token) {
			throw new Error('API_AUTH_TOKEN is not defined in environment variables');
		}

		const url = 'https://cloudpbx.beeline.ru/apis/portal/abonents';
		try {
			const response = await firstValueFrom(
				this.httpService.get<AbonentsResponse[]>(url, {
					headers: {
						'Content-Type': 'application/json',
						'X-MPBX-API-AUTH-TOKEN': token,
					},
				}),
			);
			return response.data;
		} catch (error: unknown) {
			if (error instanceof AxiosError && error.response) {
				const errorData = error.response.data as ApiErrorResponse;
				const message = errorData.message || errorData.error || error.message;
				throw new Error(`Failed to get all abonents: ${message}`);
			} else if (error instanceof Error) {
				throw new Error(`Failed to get all abonents: ${error.message}`);
			}
			throw new Error('Unknown error occurred while getting all abonents');
		}
	}

	async getRecordFile(recordId: string): Promise<Buffer> {
		const token = '655bc2aa-198f-44a8-a66b-11c90a72f684';
		const url = `https://cloudpbx.beeline.ru/apis/portal/v2/records/${recordId}/download`;

		try {
			const response = await firstValueFrom(
				this.httpService.get(url, {
					headers: {
						'X-MPBX-API-AUTH-TOKEN': token,
					},
					responseType: 'arraybuffer', // 🟡 важно для mp3-файла
				}),
			);

			return Buffer.from(response.data); // возвращаем буфер
		} catch (error) {
			throw new Error('Не удалось получить mp3 файл. Ошибка: ' + error);
		}
	}

	async getRecordInfo(recordId: string): Promise<RecordDetailsResponse> {
		const token = '655bc2aa-198f-44a8-a66b-11c90a72f684';
		const url = `https://cloudpbx.beeline.ru/apis/portal/v2/records/${recordId}`;

		try {
			const response = await firstValueFrom(
				this.httpService.get<RecordDetailsResponse>(url, {
					headers: {
						'X-MPBX-API-AUTH-TOKEN': token,
					},
				}),
			);
			return response.data;
		} catch (error: unknown) {
			if (error instanceof AxiosError && error.response) {
				const errorData = error.response.data as ApiErrorResponse;
				const message = errorData.message || errorData.error || error.message;
				throw new Error(`Failed to get record info: ${message}`);
			} else if (error instanceof Error) {
				throw new Error(`Failed to get record info: ${error.message}`);
			}
			throw new Error('Unknown error occurred while getting record info');
		}
	}

	private formatDateForUrl(dateString: string): string {
		// Не кодируем дату, так как axios сам закодирует параметры
		return dateString;
	}

	async getAllRecordsByUserId(
		userId?: string,
		dateFrom?: string,
		dateTo?: string,
	): Promise<any[]> {
		const token = '655bc2aa-198f-44a8-a66b-11c90a72f684';
		const url = 'https://cloudpbx.beeline.ru/apis/portal/records';
		let allRecords: any[] = [];
		let lastId: string | undefined = undefined;
		let hasMore = true;

		while (hasMore) {
			const params: any = {};
			if (userId) params.userId = userId;
			if (dateFrom) params.dateFrom = this.formatDateForUrl(dateFrom);
			if (dateTo) params.dateTo = this.formatDateForUrl(dateTo);
			if (lastId) params.id = lastId;

			const response = await firstValueFrom(
				this.httpService.get<any[]>(url, {
					headers: {
						'X-MPBX-API-AUTH-TOKEN': token,
					},
					params,
				}),
			);

			const records = response.data;
			allRecords = allRecords.concat(records);

			if (records.length < 100) {
				hasMore = false;
			} else {
				lastId = records[records.length - 1].id;
			}
		}
		// console.log(allRecords);
		return allRecords;
	}

	async getAllRecordsByUserIdFromLastRecord(
		userId: string,
		dateFrom?: string,
		dateTo?: string,
	): Promise<any[]> {
		const token = '655bc2aa-198f-44a8-a66b-11c90a72f684';
		const url = 'https://cloudpbx.beeline.ru/apis/portal/records';
		let allRecords: any[] = [];
		let lastId: string | undefined = undefined;
		let hasMore = true;

		while (hasMore) {
			const params: any = {};
			params.userId = userId;
			if (dateFrom) params.dateFrom = this.formatDateForUrl(dateFrom);
			if (dateTo) params.dateTo = this.formatDateForUrl(dateTo);
			if (lastId) params.id = lastId;

			const response = await firstValueFrom(
				this.httpService.get<any[]>(url, {
					headers: {
						'X-MPBX-API-AUTH-TOKEN': token,
					},
					params,
				}),
			);

			const records = response.data;
			allRecords = allRecords.concat(records);

			if (records.length < 100) {
				hasMore = false;
			} else {
				lastId = records[records.length - 1].id;
			}
		}
		return allRecords;
	}

	async saveRecordMp3ToImportFolder(recordId: string, phone: string): Promise<string> {
		try {
			const buffer = await this.getRecordFile(recordId);
			const dir = path.join(process.cwd(), 'import', 'mp3');
			if (!fs.existsSync(dir)) {
				try {
					fs.mkdirSync(dir, { recursive: true });
					console.log(`[saveRecordMp3ToImportFolder] Папка создана: ${dir}`);
				} catch (mkdirErr) {
					console.error(`[saveRecordMp3ToImportFolder] Не удалось создать папку: ${dir}`, mkdirErr);
					throw new Error('Ошибка создания папки для mp3-файлов');
				}
			}
			const filePath = path.join(dir, `${recordId}_client_${phone}.mp3`);
			try {
				fs.writeFileSync(filePath, buffer);
				console.log(`[saveRecordMp3ToImportFolder] Файл сохранён: ${filePath}`);
			} catch (writeErr) {
				console.error(`[saveRecordMp3ToImportFolder] Не удалось сохранить файл: ${filePath}`, writeErr);
				throw new Error('Ошибка сохранения mp3-файла');
			}
			return filePath;
		} catch (err) {
			console.error(`[saveRecordMp3ToImportFolder] Ошибка при сохранении mp3 для recordId=${recordId}:`, err);
			throw new Error(`Не удалось сохранить mp3-файл для recordId=${recordId}: ${err.message}`);
		}
	}
}
