import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

interface SubscriptionResponse {
	status: string;
	subscriptionId: string;
	expiresIn: number;
}

interface ApiErrorResponse {
	message?: string;
	error?: string;
	statusCode?: number;
}

@Injectable()
export class XsiEventsService {
	constructor(private readonly httpService: HttpService) {}

	async subscribeToEvents(): Promise<SubscriptionResponse> {
		const token = process.env.XSI_TOKEN;
		if (!token) {
			throw new Error('XSI_TOKEN is not defined in environment variables');
		}

		const url = 'https://cloudpbx.beeline.ru/apis/portal/subscription';
		const body = {
			pattern: '1234567890',
			expires: 36000,
			subscriptionType: 'Call',
			url: 'https://example.com/callback',
		};

		try {
			const response = await firstValueFrom(
				this.httpService.put<SubscriptionResponse>(url, body, {
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
				throw new Error(`Failed to subscribe to events: ${message}`);
			} else if (error instanceof Error) {
				throw new Error(`Failed to subscribe to events: ${error.message}`);
			}
			throw new Error('Unknown error occurred while subscribing to events');
		}
	}
}
