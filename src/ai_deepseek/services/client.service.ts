import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class ClientService {
  private readonly logger = new Logger(ClientService.name);

  constructor(
    @InjectDataSource('distributionbot')
    private distributionbotDataSource: DataSource,
  ) {}

  async getClientInfo(clientId: string) {
    try {
      const client = await this.distributionbotDataSource
        .createQueryBuilder()
        .select([
          'c.id as id',
          'c.name as name',
          'c.phone as phone',
          'd.name as department'
        ])
        .from('clients', 'c')
        .leftJoin('departments', 'd', 'c.department_id = d.id')
        .where('c.id = :clientId', { clientId })
        .getRawOne();

      return client;
    } catch (error) {
      this.logger.error(`Ошибка при получении информации о клиенте: ${error.message}`);
      throw error;
    }
  }
} 