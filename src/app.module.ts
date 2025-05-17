import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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
import { Abonent } from './entities/abonent.entity';
import { AbonentRecord } from './entities/abonent.record.entity';
import { Client } from './entities/client.entity';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
		}),
		TypeOrmModule.forRoot({
			type: 'postgres',
			host: process.env.DB_HOST,
			port: parseInt(process.env.DB_PORT),
			username: process.env.DB_USER,
			password: process.env.DB_PASSWORD,
			database: process.env.DB_NAME,
			entities: [Abonent, AbonentRecord, Client],
			synchronize: true,
			ssl: process.env.DB_SSL_MODE === 'require' ? { rejectUnauthorized: false } : false,
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
		// TypeOrmModule.forRoot({
		// 	type: 'postgres',
		// 	host: process.env.DB_HOST,
		// 	port: parseInt(process.env.DB_PORT),
		// 	username: process.env.DB_USER,
		// 	password: process.env.DB_PASSWORD,
		// 	database: process.env.DB_NAME,
		// 	entities: [ManagerModel],
		// 	synchronize: false,
		// 	ssl: process.env.DB_SSL_MODE === 'require' ? { rejectUnauthorized: false } : false,
		// }),
		// ManagersModule,
		// ClientsModule,
		// BeelineApiCallModule,
		// XsiEventsModule,
	],
	controllers: [AppController],
	providers: [AppService, ConfigService, LoggerService],
})
export class AppModule {}
