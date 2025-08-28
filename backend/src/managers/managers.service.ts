import { Injectable } from '@nestjs/common';
import { CreateManagerDto } from './dto/create-manager.dto';
import { UpdateManagerDto } from './dto/update-manager.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { ManagerModel } from './models/manager.model';
import { Repository } from 'typeorm';

@Injectable()
export class ManagersService {
	constructor(
		@InjectRepository(ManagerModel)
		private readonly managerRepository: Repository<ManagerModel>,
	) {}
	create(createManagerDto: CreateManagerDto) {
		const manager = this.managerRepository.create(createManagerDto);
		return this.managerRepository.save(manager);
	}

	findAll() {
		return `This action returns all managers`;
	}

	findOne(id: number) {
		return `This action returns a #${id} manager`;
	}

	update(id: number, updateManagerDto: UpdateManagerDto) {
		const newManagerState = this.managerRepository.create(updateManagerDto);
		return this.managerRepository.update(id, newManagerState);
	}

	remove(id: number) {
		return `This action removes a #${id} manager`;
	}
}
