import { ILogObj, Logger } from 'tslog';
import { ILogger } from './logger.interface';
import { injectable } from 'inversify';
import 'reflect-metadata';

@injectable()
export class LoggerService implements ILogger {
	public logger: Logger<ILogObj>;
	constructor() {
		this.logger = new Logger<any>({
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
