import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
// import { ManagerModel } from './managers/models/manager.model';
// import { ManagersModule } from './managers/managers.module';
// import { ClientsModule } from './clients/clients.module';
import { BeelineApiCallModule } from './beeline_api_call/beeline_api_call.module';
// import { XsiEventsModule } from './xsi-events/xsi-events.module';
import { TelegramBotModule } from './telegram_bot/telegram_bot.module';
import { TelegrafModule } from 'nestjs-telegraf';
import { ConfigService } from './config/config.service';
import { LoggerService } from './logger/logger.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { CronJobsModule } from './cron-jobs/cron-jobs.module';
import { AiDeepseekModule } from './ai_deepseek/ai_deepseek.module';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
		}),
		TelegrafModule.forRoot({
			token: '7506088721:AAF78PYd8iEdw_TAXaZfC7o4IQFy9AcrdHU',
			// middlewares: [new SessionFlavor()],
			// include: { all: true },
			// providers: [SessionFlavor],
		}),
		TelegramBotModule,
		DatabaseModule,
		BeelineApiCallModule,
		CronJobsModule,
		AiDeepseekModule,
		// ManagersModule,
		// ClientsModule,
		// BeelineApiCallModule,
		// XsiEventsModule,
	],
	controllers: [AppController],
	providers: [AppService, ConfigService, LoggerService],
})
export class AppModule {}
