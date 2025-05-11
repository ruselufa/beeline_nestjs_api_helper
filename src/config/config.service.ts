import { Injectable } from '@nestjs/common';
import { config, DotenvConfigOutput, DotenvParseOutput } from 'dotenv';
import { ILogger } from '../logger/logger.interface';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class ConfigService {
	private config: DotenvParseOutput;
	constructor(private readonly logger: LoggerService) {
		const result: DotenvConfigOutput = config();
		if (result.error) {
			this.logger.error('[ConfigService] Не удалось прочитать файл .env или он отсутствует');
		} else {
			this.logger.log('[ConfigService] Конфигурация .env загружена');
			this.config = result.parsed;
		}
	}

	get(key: string): string {
		return this.config[key];
	}
}
