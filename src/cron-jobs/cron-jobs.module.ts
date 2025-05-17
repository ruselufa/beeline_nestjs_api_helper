import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BeelineApiCallModule } from '../beeline_api_call/beeline_api_call.module';
import { AbonentsUpdaterService } from './abonents-updater.service';
import { Abonent } from '../entities/abonent.entity';
import { AbonentRecord } from '../entities/abonent.record.entity';
import { RecordsLoaderService } from './records-loader.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BeelineApiCallModule,
    TypeOrmModule.forFeature([Abonent, AbonentRecord]),
  ],
  providers: [AbonentsUpdaterService, RecordsLoaderService],
  exports: [RecordsLoaderService],
})
export class CronJobsModule {} 