import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BeelineApiCallModule } from '../beeline_api_call/beeline_api_call.module';
import { AbonentsUpdaterService } from './abonents-updater.service';
import { Abonent } from '../entities/abonent.entity';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BeelineApiCallModule,
    TypeOrmModule.forFeature([Abonent]),
  ],
  providers: [AbonentsUpdaterService],
})
export class CronJobsModule {} 