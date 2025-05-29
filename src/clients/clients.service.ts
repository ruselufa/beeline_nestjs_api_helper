import { Injectable } from '@nestjs/common';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderModel } from '../entities/orders/order.model.entity';
import { NullOrderModel } from '../entities/orders/null-order.model.entity';

@Injectable()
export class ClientsService {
	constructor(
		@InjectRepository(OrderModel)
		@InjectRepository(NullOrderModel)
		private readonly orderModelRepository: Repository<OrderModel>,
		private readonly nullOrderModelRepository: Repository<NullOrderModel>,
	) { }

	create(createClientDto: CreateClientDto) {
		return 'This action adds a new client';
	}

	findAll() {
		return `This action returns all clients`;
	}

	findOne(id: number) {
		return `This action returns a #${id} client`;
	}

	update(id: number, updateClientDto: UpdateClientDto) {
		return `This action updates a #${id} client`;
	}

	remove(id: number) {
		return `This action removes a #${id} client`;
	}

	async getClientByPhone(phone: string): Promise<{ orders: OrderModel[], nullOrders: NullOrderModel[] } | null> {
		const clientOrders = await this.orderModelRepository.find({ where: { userPhone: phone } });
		const nullClient = await this.nullOrderModelRepository.find({ where: { userPhone: phone } });
		if (clientOrders.length > 0 || nullClient.length > 0) {
			return {
				orders: clientOrders,
				nullOrders: nullClient,
			};
		}
		return null;
	}
}
