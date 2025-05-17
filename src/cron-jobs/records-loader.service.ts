import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AbonentRecord } from '../entities/abonent.record.entity';
import { Abonent } from '../entities/abonent.entity';
import { BeelineApiCallService } from '../beeline_api_call/beeline_api_call.service';

@Injectable()
export class RecordsLoaderService implements OnApplicationBootstrap {
  constructor(
    private readonly beelineApiCallService: BeelineApiCallService,
    @InjectRepository(AbonentRecord)
    private readonly abonentRecordRepository: Repository<AbonentRecord>,
    @InjectRepository(Abonent)
    private readonly abonentRepository: Repository<Abonent>,
  ) {}

  async onApplicationBootstrap() {
    // Получаем всех абонентов из базы
    const abonents = await this.abonentRepository.find();
    for (const [index, abonent] of abonents.entries()) {
      await this.loadAndSaveRecordsForUser(abonent.userId);
      console.log(`Обработан абонент ${index + 1} из ${abonents.length}`);
    }
  }

  async loadAndSaveRecordsForUser(userId: string, dateFrom?: string, dateTo?: string) {
    const records = await this.beelineApiCallService.getAllRecordsByUserId(userId, dateFrom, dateTo);
    const abonent = await this.abonentRepository.findOne({ where: { userId } });

    for (const record of records) {
      // Проверка на дублирование по beelineId
      const exists = await this.abonentRecordRepository.findOne({
        where: { beelineId: record.id },
      });
      if (exists) {
        console.log(`Запись ${record.id} уже существует`);
        continue;
      };

      // Пропускаем, если нет callId
      // if (!record.callId) continue;

      const entity = this.abonentRecordRepository.create({
        beelineId: record.id,
        beelineExternalId: record.externalId,
        callId: record.callId || null,
        phone: record.phone,
        direction: record.direction,
        date: new Date(Number(record.date)), // если приходит timestamp
        duration: record.duration,
        fileSize: record.fileSize,
        comment: record.comment || '',
        abonent: abonent,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await this.abonentRecordRepository.save(entity);
      console.log(`Загружен и сохранен запись: ${record.id}`);
    }
    console.log(`Загружено и сохранено ${records.length} записей`);
  }
} 