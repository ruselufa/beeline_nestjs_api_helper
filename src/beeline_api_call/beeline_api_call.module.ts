import { Module } from '@nestjs/common';
import { BeelineApiCallService } from './beeline_api_call.service';
import { BeelineApiCallController } from './beeline_api_call.controller';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from '../database/database.module';

@Module({
	controllers: [BeelineApiCallController],
	providers: [BeelineApiCallService],
	exports: [BeelineApiCallService],
	imports: [
		HttpModule,
		DatabaseModule,
	],
})
export class BeelineApiCallModule {}
