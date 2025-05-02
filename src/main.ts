import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import { join } from 'path';
dotenv.config({ path: join(__dirname, '.env') });

async function bootstrap() {
	const app = await NestFactory.create(AppModule);
	app.setGlobalPrefix('api'); // Set the global prefix for all routes
	await app.listen(process.env.PORT ?? 3001);
}
bootstrap().catch((err) => {
	console.error('Ошибка запуска приложения:', err);
	process.exit(1);
});
