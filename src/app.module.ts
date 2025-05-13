import { Module } from '@nestjs/common';
// import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
// import { ManagerModel } from './managers/models/manager.model';
// import { ManagersModule } from './managers/managers.module';
// import { ClientsModule } from './clients/clients.module';
// import { BeelineApiCallModule } from './beeline_api_call/beeline_api_call.module';
// import { XsiEventsModule } from './xsi-events/xsi-events.module';
import { TelegramBotModule } from './telegram_bot/telegram_bot.module';
import { TelegrafModule } from 'nestjs-telegraf';
import { ConfigService } from './config/config.service';
import { LoggerService } from './logger/logger.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';

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
