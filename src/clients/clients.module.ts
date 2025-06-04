import { Module } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderModel, NullOrderModel } from '../entities/orders';

@Module({
	controllers: [ClientsController],
	providers: [ClientsService],
	exports: [ClientsService],
	imports: [TypeOrmModule.forFeature([OrderModel, NullOrderModel])],
})
export class ClientsModule {}
