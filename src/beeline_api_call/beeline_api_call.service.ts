import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import {
	AbonentsResponse,
	ApiErrorResponse,
	RecordDetailsResponse,
} from './beeline_api_call.interface';

@Injectable()
export class BeelineApiCallService {
	constructor(private readonly httpService: HttpService) {}

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
}
