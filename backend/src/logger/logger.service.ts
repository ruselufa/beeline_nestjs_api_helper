import { Injectable } from '@nestjs/common';
import { ILogObj, Logger } from 'tslog';

@Injectable()
export class LoggerService {
	public logger: Logger<ILogObj>;
	constructor() {
		this.logger = new Logger<ILogObj>({
			type: 'pretty',
			hideLogPositionForProduction: true,
			// displayInstanceName: false,
			// displayLoggerName: false,
			// displayFilePath: 'hidden',
			// displayFunctionName: false;
		});
	}
	log(...args: unknown[]): void {
		this.logger.info(...args);
	}

	error(...args: unknown[]): void {
		// отправка в sentry / rollbar
		this.logger.error(...args);
	}

	warn(...args: unknown[]): void {
		this.logger.warn(...args);
	}
}
