import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dbConfig, dbOrdersConfig } from 'src/config/db.config';
import * as beelineEntities from '../entities/beeline';
import * as orderEntities from '../entities/orders';

@Module({
	imports: [
		ConfigModule,
		TypeOrmModule.forRootAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (configService: ConfigService) => ({
				...dbConfig(configService),
				entities: Object.values(beelineEntities),
				synchronize: true,
			}),
		}),
		TypeOrmModule.forRootAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (configService: ConfigService) => ({
				...dbOrdersConfig(configService),
				name: 'orders',
				entities: Object.values(orderEntities),
				synchronize: false,
			}),
		}),
		TypeOrmModule.forFeature(Object.values(beelineEntities)),
		TypeOrmModule.forFeature(Object.values(orderEntities), 'orders'),
	],
	controllers: [],
	providers: [],
	exports: [TypeOrmModule],
})
export class DatabaseModule {}
