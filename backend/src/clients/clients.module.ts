import { Module } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
	controllers: [ClientsController],
	providers: [ClientsService],
	exports: [ClientsService],
	imports: [DatabaseModule]
})
export class ClientsModule {}
