import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dbConfig } from 'src/config/db.config';
import * as entities from '../entities';

@Module({
	imports: [
		ConfigModule,
		TypeOrmModule.forRootAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (configService: ConfigService) => ({
				...dbConfig(configService),
				entites: Object.values(entities),
				synchronize: true,
			}),
		}),

		TypeOrmModule.forRootAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (configService: ConfigService) => ({
				...dbConfig(configService),
				name: 'read',
				entites: Object.values(entities),
				synchronize: true,
			}),
		}),

		TypeOrmModule.forFeature(Object.values(entities)),
	],
	controllers: [],
	providers: [],
	exports: [TypeOrmModule],
})
export class DatabaseModule {}
