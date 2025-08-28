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
	
	// Настройка CORS для frontend
	app.enableCors({
		origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
		credentials: true,
	});
	
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
