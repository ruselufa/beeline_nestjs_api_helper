import { Module } from '@nestjs/common';
import { BeelineApiCallService } from './beeline_api_call.service';
import { BeelineApiCallController } from './beeline_api_call.controller';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AbonentRecord } from '../entities/abonent.record.entity';

@Module({
	controllers: [BeelineApiCallController],
	providers: [BeelineApiCallService],
	exports: [BeelineApiCallService],
	imports: [
		HttpModule,
		TypeOrmModule.forFeature([AbonentRecord]),
	],
})
export class BeelineApiCallModule {}
