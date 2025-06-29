import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BeelineApiCallService } from '../beeline_api_call/beeline_api_call.service';
import { Abonent } from '../entities/beeline/abonent.entity';
import { Worker } from 'worker_threads';
import * as path from 'path';
import { WorkerUtils } from './worker-utils';

@Injectable()
export class AbonentsUpdaterService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AbonentsUpdaterService.name);
  public isProcessing = false;
  public lastStartTime: Date | null = null;
  private worker: Worker | null = null;

  constructor(
    private readonly beelineApiCallService: BeelineApiCallService,
    @InjectRepository(Abonent)
    private readonly abonentRepository: Repository<Abonent>,
  ) {}

  async onApplicationBootstrap() {
    this.logger.log('Приложение запущено, начинаю первичное обновление абонентов...');
    // await this.updateAbonents();
  }

  async updateAbonents() {
    if (this.isProcessing) {
      const runningTime = Date.now() - this.lastStartTime.getTime();
      this.logger.warn(`Обновление абонентов уже выполняется ${Math.floor(runningTime / 1000)} секунд, пропускаем запуск`);
      return;
    }

    this.isProcessing = true;
    this.lastStartTime = new Date();
    
    try {
      this.logger.log('Начинаю обновление абонентов...');
      // Временно используем обычную обработку вместо worker
      await this.updateAbonentsNormal();
      this.logger.log('Обновление абонентов успешно завершено');
    } catch (error) {
      this.logger.error('Ошибка при обновлении абонентов:', error);
    } finally {
      this.isProcessing = false;
      this.lastStartTime = null;
    }
  }

  async updateAbonentsNormal() {
    const abonents = await this.beelineApiCallService.getAllAbonents();
    this.logger.log(`Получено ${abonents.length} абонентов`);
    
    for (const abonentData of abonents) {
      const existingAbonent = await this.abonentRepository.findOne({
        where: { userId: abonentData.userId }
      });

      if (existingAbonent) {
        // Обновляем существующего абонента
        await this.abonentRepository.update(existingAbonent.id, {
          phone: abonentData.phone,
          firstName: abonentData.firstName || '',
          lastName: abonentData.lastName || '',
          department: abonentData.department,
          extension: abonentData.extension,
          updatedAt: new Date(),
        });
        this.logger.log(`Обновлен абонент: ${abonentData.firstName || ''} ${abonentData.lastName || ''}`);
      } else {
        // Создаем нового абонента
        const newAbonent = this.abonentRepository.create({
          userId: abonentData.userId,
          phone: abonentData.phone,
          firstName: abonentData.firstName || '',
          lastName: abonentData.lastName || '',
          department: abonentData.department,
          extension: abonentData.extension,
          email: '', // Пустая строка, так как в API нет email
          createdAt: new Date(),
          updatedAt: new Date(),
          active: true,
        });
        await this.abonentRepository.save(newAbonent);
        this.logger.log(`Добавлен новый абонент: ${abonentData.firstName || ''} ${abonentData.lastName || ''}`);
      }
    }
  }
} 