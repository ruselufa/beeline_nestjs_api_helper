import 'dotenv/config'
import { NestFactory } from '@nestjs/core';
import { CronJobsModule } from './src/cron-jobs/cron-jobs.module';
import { AbonentsUpdaterService } from './src/cron-jobs/abonents-updater.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(CronJobsModule);
  const service = app.get(AbonentsUpdaterService);
  await service.onApplicationBootstrap(); // или другой нужный метод
  await app.close();
}
bootstrap();