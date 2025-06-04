import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DeepseekResponse, DeepseekRequestOptions, DeepseekMessage } from './types';
import { getSalesPrompt, getQualityPrompt } from './prompts';
import { AnalyzedAi } from '../entities/beeline/analyzed_ai.entity';
import { ClientsService } from 'src/clients/clients.service';
import { AbonentRecord } from 'src/entities/beeline/abonent.record.entity';
import { Abonent } from 'src/entities/beeline/abonent.entity';

@Injectable()
export class AiDeepseekService implements OnModuleDestroy {
	private readonly apiKey: string;
	private readonly apiUrl: string = 'https://api.deepseek.com/v1/chat/completions';
	private readonly logger = new Logger(AiDeepseekService.name);

	constructor(
		private configService: ConfigService,
		private httpService: HttpService,
		private clientsService: ClientsService,
		@InjectRepository(AbonentRecord)
		private abonentRecordRepository: Repository<AbonentRecord>,
		@InjectRepository(Abonent)
		private abonentRepository: Repository<Abonent>,
		@InjectRepository(AnalyzedAi)
		private analyzedAiRepository: Repository<AnalyzedAi>
	) {
		this.apiKey = this.configService.get<string>('DEEPSEEK_API_KEY');
		if (!this.apiKey) {
			throw new Error('DEEPSEEK_API_KEY не найден в конфигурации');
		}

		this.httpService.axiosRef.defaults.headers.common['Authorization'] = `Bearer ${this.apiKey}`;
		this.httpService.axiosRef.defaults.headers.common['Content-Type'] = 'application/json';
		this.httpService.axiosRef.defaults.timeout = 600000;
	}

	private getPromptByDepartment(department: string): string {
		return department.toLowerCase().includes('Отдел Качества') || department.toLowerCase().includes('Отдел Продукта')
			? getQualityPrompt()
			: getSalesPrompt();
	}

	async analyzeConversation(text: string, clientPhone: string, abonentDepartment: string): Promise<any> {
		try {
			this.logger.log(`Начинаем анализ разговора для клиента`);

			// Получаем информацию о клиенте
			const clientInfo = await this.clientsService.getClientByPhone(clientPhone);

			let clientId: number | null = null;
			let clientName: string | null = null;
			let clientEmail: string | null = null;

			if (clientInfo) {
				const client = clientInfo.orders[0] ?? clientInfo.nullOrders[0];
				if (client) {
					clientId = client.idAzatGc ?? null;
					clientName = client.userName ?? null;
					clientEmail = client.userEmail ?? null;
				} else {
					this.logger.log('❌ Не удалось найти клиента в базе данных');
					return null;
				}
			}
			const systemPrompt = this.getPromptByDepartment(abonentDepartment);
			//   const systemPrompt = getSalesPrompt();

			const requestOptions: DeepseekRequestOptions = {
				model: 'deepseek-reasoner',
				messages: [
					{ role: 'system', content: systemPrompt },
					{ role: 'user', content: text }
				],
				temperature: 0.7,
				max_tokens: 4000
			};

			const response = await firstValueFrom(
				this.httpService.post<DeepseekResponse>(
					this.apiUrl,
					requestOptions
				)
			);

			const analysisResult = response.data.choices[0].message.content;

			// Сохраняем результат в БД
			const createAnalyzedAiDto: CreateAnalyzedAiDto = {
				conversationId: `conv_${Date.now().toString()}`,
				department: abonentDepartment,
				originalText: text,
				analysisResult: typeof analysisResult === 'string' ?
					JSON.parse(analysisResult) : analysisResult,
				clientId: clientId,
				clientName: clientName,
				clientPhone: clientPhone,
				clientEmail: clientEmail
			}

			await this.analyzedAiRepository.save(createAnalyzedAiDto);

			this.logger.log('✓ Анализ успешно сохранен в базе данных');

			return analysisResult;

		} catch (error) {
			this.logger.error(`❌ Ошибка при анализе разговора: ${error.message}`);
			throw error;
		}
	}

	async analyzeConversationFile(filePath: string, clientPhone: string, recordId): Promise<any> {
		try {
			const fileContent = await fs.readFile(filePath, 'utf-8');
			const record = await this.abonentRecordRepository.findOne({ where: { id: recordId } });
			const abonentDepartment = await this.abonentRepository.findOne({ where: { id: Number(record.abonent) } });
			return await this.analyzeConversation(fileContent, clientPhone, abonentDepartment.department);
		} catch (error) {
			this.logger.error(`Ошибка при обработке файла ${filePath}: ${error.message}`);
			throw error;
		}
	}

	async analyzeConversationFiles(directory: string): Promise<void> {
		try {
			const files = await fs.readdir(directory);
			const txtFiles = files.filter(file => file.endsWith('.txt'));

			this.logger.log(`Найдено ${txtFiles.length} файлов для анализа`);

			for (const file of txtFiles) {
				const filePath = path.join(directory, file);

				// Извлекаем clientPhone из имени файла (предполагается формат: client_123.txt)
				const clientPhone = file.split('_')[1].split('.')[0];
				const recordId = file.split('_')[0];

				try {
					await this.analyzeConversationFile(filePath, clientPhone, recordId);
					this.logger.log(`✓ Успешно проанализирован файл: ${file}`);
				} catch (error) {
					this.logger.error(`❌ Ошибка при анализе файла ${file}: ${error.message}`);
					continue;
				}
			}

			this.logger.log('✓ Анализ всех файлов завершен');
		} catch (error) {
			this.logger.error(`❌ Ошибка при обработки директории: ${error.message}`);
			throw error;
		}
	}

	async onModuleDestroy() {
		this.logger.log('Сервис AiDeepseek завершает работу');
	}
} 