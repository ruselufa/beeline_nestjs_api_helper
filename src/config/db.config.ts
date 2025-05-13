import { ConfigService } from '@nestjs/config';
import { IDatabaseConfig } from './db.config.interface';

export const dbConfig = (configService: ConfigService): IDatabaseConfig => {
	const dbType = configService.get<string>('DB_TYPE') || 'postgres';
	const dbHost = configService.get<string>('DB_HOST') || 'localhost';
	const dbPort = configService.get<number>('DB_PORT') || 5432;
	const dbUsername = configService.get<string>('DB_USER') || 'postgres';
	const dbPassword = configService.get<string>('DB_PASSWORD') || 'postgres';
	const dbName = configService.get<string>('DB_NAME') || 'postgres';
	const dbSslMode = configService.get<string>('DB_SSL_MODE') || 'disable';

	if (!dbType || !dbHost || !dbPort || !dbUsername || !dbPassword || !dbName) {
		throw new Error(
			'Конфигурация базы данных не полная. Пожалуйста, проверьте переменные окружения DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD и DB_NAME.',
		);
	}

	return {
		type: 'postgres' as const,
		host: dbHost,
		port: dbPort,
		username: dbUsername,
		password: dbPassword,
		database: dbName,
		sslMode: dbSslMode,
		pool: {
			max: 5,
			min: 0,
			acquire: 30000,
			idle: 10000,
		},
		logging: configService.get<string>('NODE_ENV') === 'development',
		extra: {
			timestamps: true,
			underscored: true,
		},
	};
};

export const dbOrdersConfig = (configService: ConfigService): IDatabaseConfig => {
	const dbType = configService.get<string>('DB_ORDERS_TYPE') || 'postgres';
	const dbHost = configService.get<string>('DB_ORDERS_HOST') || 'localhost';
	const dbPort = configService.get<number>('DB_ORDERS_PORT') || 5432;
	const dbUsername = configService.get<string>('DB_ORDERS_USER') || 'postgres';
	const dbPassword = configService.get<string>('DB_ORDERS_PASSWORD') || 'postgres';
	const dbName = configService.get<string>('DB_ORDERS_NAME') || 'postgres';
	const dbSslMode = configService.get<string>('DB_ORDERS_SSL_MODE') || 'disable';

	if (!dbType || !dbHost || !dbPort || !dbUsername || !dbPassword || !dbName) {
		throw new Error(
			'Конфигурация базы данных не полная. Пожалуйста, проверьте переменные окружения DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD и DB_NAME.',
		);
	}

	return {
		type: 'postgres' as const,
		host: dbHost,
		port: dbPort,
		username: dbUsername,
		password: dbPassword,
		database: dbName,
		sslMode: dbSslMode,
		pool: {
			max: 5,
			min: 0,
			acquire: 30000,
			idle: 10000,
		},
		logging: configService.get<string>('NODE_ENV') === 'development',
		extra: {
			timestamps: true,
			underscored: true,
		},
	};
};
