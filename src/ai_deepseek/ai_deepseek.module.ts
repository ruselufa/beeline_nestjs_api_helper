import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AiDeepseekService } from './ai_deepseek.service';
import { ClientsService } from '../clients/clients.service';
import { AnalyzedAi } from '../entities';

@Module({
	imports: [
		HttpModule,
		ConfigModule,
		TypeOrmModule.forFeature([AnalyzedAi]),
		TypeOrmModule.forFeature([], 'distributionbot')
	],
	providers: [AiDeepseekService, ClientsService],
	exports: [AiDeepseekService]
})
export class AiDeepseekModule { } 