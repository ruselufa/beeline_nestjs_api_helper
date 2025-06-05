import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { AiDeepseekService } from './ai_deepseek.service';
// import { ClientsModule } from '../clients/clients.module';
import { DatabaseModule } from '../database/database.module';

@Module({
	imports: [
		HttpModule,
		ConfigModule,
		// ClientsModule,
		DatabaseModule,
	],
	providers: [AiDeepseekService],
	exports: [AiDeepseekService]
})
export class AiDeepseekModule { } 