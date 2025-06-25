import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join as pathJoin } from 'path';
dotenv.config({ path: join(__dirname, '.env') });

async function bootstrap() {
	const app = await NestFactory.create<NestExpressApplication>(AppModule);
	
	// Настройка статических файлов
	app.useStaticAssets(pathJoin(__dirname, '..', 'public'), {
		prefix: '/',
	});
	
	app.setGlobalPrefix('api'); // Set the global prefix for all routes
	await app.listen(process.env.PORT ?? 3001);
}
bootstrap().catch((err) => {
	console.error('Ошибка запуска приложения:', err);
	process.exit(1);
});
