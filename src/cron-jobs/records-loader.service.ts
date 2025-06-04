import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AbonentRecord } from '../entities/beeline/abonent.record.entity';
import { Abonent } from '../entities/beeline/abonent.entity';
import { BeelineApiCallService } from '../beeline_api_call/beeline_api_call.service';
import { Cron } from '@nestjs/schedule';

function chunks<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

@Injectable()
export class RecordsLoaderService implements OnApplicationBootstrap {
  constructor(
    private readonly beelineApiCallService: BeelineApiCallService,
    @InjectRepository(Abonent)
    private readonly abonentRepository: Repository<Abonent>,
    @InjectRepository(AbonentRecord)
    private readonly abonentRecordRepository: Repository<AbonentRecord>,
  ) {}

  async onApplicationBootstrap() {
    // try {
    //   // Получаем всех абонентов
    //   const abonents = await this.abonentRepository.find();
    //   console.log(`Найдено ${abonents.length} абонентов для загрузки записей`);

    //   // Для каждого абонента загружаем записи с момента последней сохраненной
    //   for (const [index, abonent] of abonents.entries()) {
    //     try {
    //       await this.loadAndSaveRecordsForUserFromLastRecord(abonent.userId);
    //       console.log(`Обработан абонент ${index + 1} из ${abonents.length}`);
    //     } catch (error) {
    //       console.error(`Ошибка при загрузке записей для пользователя ${abonent.userId}:`, error);
    //       // Продолжаем с следующим пользователем даже если произошла ошибка
    //       continue;
    //     }
    //   }
    //   console.log('Загрузка записей для всех пользователей завершена');
    // } catch (error) {
    //   console.error('Ошибка при загрузке записей для всех пользователей:', error);
    // }
  }

  // Делаем cron на каждый день в 3:30 ночи
  @Cron('30 3 * * *')
  async loadAllUsersRecords() {
    await this.loadAllAbonentsRecords();
  }

  private async loadAllAbonentsRecords() {
    const abonents = await this.abonentRepository.find();
    console.log(`Найдено ${abonents.length} абонентов для загрузки записей`);

    for (const chunk of chunks(abonents, 5)) {
      await Promise.all(chunk.map(async (abonent) => {
        try {
          await this.loadAndSaveRecordsForUserFromLastRecord(abonent.userId);
          console.log(`Обработан абонент ${abonent.userId}`);
        } catch (err) {
          console.error(`Ошибка: ${abonent.userId}`, err);
        }
      }));
    }
    console.log('Загрузка записей для всех пользователей завершена');
  }

  async loadAllUsersRecordsFromLastRecord() {
    try {
      // Получаем всех абонентов
      const abonents = await this.abonentRepository.find();
      console.log(`Найдено ${abonents.length} абонентов для загрузки записей`);

      // Для каждого абонента загружаем записи с момента последней сохраненной
      for (const abonent of abonents) {
        try {
          await this.loadAndSaveRecordsForUserFromLastRecord(abonent.userId);
        } catch (error) {
          console.error(`Ошибка при загрузке записей для пользователя ${abonent.userId}:`, error);
          // Продолжаем с следующим пользователем даже если произошла ошибка
          continue;
        }
      }
    } catch (error) {
      console.error('Ошибка при загрузке записей для всех пользователей:', error);
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

  private async getLastRecordDate(userId: string): Promise<string | undefined> {
    const lastRecord = await this.abonentRecordRepository.findOne({
      where: { abonent: { userId } },
      order: { date: 'DESC' },
    });

    return lastRecord 
      ? new Date(lastRecord.date.getTime() + 1000).toISOString()
      : undefined;
  }

  async loadAndSaveRecordsForUserFromLastRecord(userId: string, dateTo?: string) {
    const dateFrom = await this.getLastRecordDate(userId);
    const records = await this.beelineApiCallService.getAllRecordsByUserIdFromLastRecord(
      userId,
      dateFrom,
      dateTo
    );
    const abonent = await this.abonentRepository.findOne({ where: { userId } });

    if (!abonent) {
      console.log(`Абонент с userId ${userId} не найден`);
      return;
    }

    let savedCount = 0;
    for (const record of records) {
      // Проверка на дублирование по beelineId
      const exists = await this.abonentRecordRepository.findOne({
        where: { beelineId: record.id },
      });
      if (exists) {
        console.log(`Запись ${record.id} уже существует`);
        continue;
      }

      const entity = this.abonentRecordRepository.create({
        beelineId: record.id,
        beelineExternalId: record.externalId,
        callId: record.callId || null,
        phone: record.phone,
        direction: record.direction,
        date: new Date(Number(record.date)),
        duration: record.duration,
        fileSize: record.fileSize,
        comment: record.comment || '',
        abonent: abonent,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await this.abonentRecordRepository.save(entity);
      savedCount++;
      console.log(`Загружена и сохранена запись: ${record.id}`);
    }
    console.log(`Для пользователя ${userId} загружено и сохранено ${savedCount} новых записей`);
  }
} 