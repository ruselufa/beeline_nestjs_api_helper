import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { GoogleAuth } from 'google-auth-library';
import * as fs from 'fs';
import * as path from 'path';
import { InjectRepository } from '@nestjs/typeorm';
import { AbonentRecord } from '../entities/abonent.record.entity';
import { MoreThan } from 'typeorm';

@Injectable()
export class ExportGoogleSheetsService implements OnApplicationBootstrap {
    private readonly logger = new Logger(ExportGoogleSheetsService.name);

    constructor(
        @InjectRepository(AbonentRecord)
    ) {}

    async onApplicationBootstrap() {
        this.logger.log('Инициализация сервиса экспорта в Google Sheets...');
        setTimeout(() => {
            this.processExportToGoogleSheets();
        }, 1000);
    }

    private async processExportToGoogleSheets() {
        let offset = 0;
        const batchSize = 20;
        let processedTotal = 0;

        const totalRecords = await this.abonentRecordRepository.count({
            where: {
                beeline_download: true,
                transcribe_processed: true,
                to_short: false,
                duration: MoreThan(240000),
                google_sheets_export: false
            }
        });
        console.log(`Всего найдено записей длительностью > 4 минут для экспорта в Google Sheets: ${totalRecords}`);

        while (true) {
            const records = await this.abonentRecordRepository.find({
                where: {
                    beeline_download: true,
                    transcribe_processed: true,
                    to_short: false,
                    duration: MoreThan(240000),
                    google_sheets_export: false
                },
                order: { date: 'DESC' },
                skip: offset,
                take: batchSize
            });
            if (!records.length) break;
            
            for (const record of records) {
                // TODO: Тело цикла закинуть
            }
            offset += batchSize;
        }
        console.log(`Обработка завершена. Всего обработано записей: ${processedTotal} из ${totalRecords}`);
    }

    // TODO: Настроить подключение к Google Sheets

    // TODO: Настроить чтение файлов из директории export/json


    /* TODO: Настроить поиск в БД
    ** 1. Настроить поиск клиента в базе данных distributionbot в таблицах OrderModel и NullOrderModel по номеру телефона
    ** 2. Если клиент не найден, то выдать текст: "Клиент не найден" и остальные поля оставить пустыми
    ** 3. Если клиент найден, то выдать текст: "Клиент найден", то все найденные записи в обеих таблицах скомпоновать в объект массивов
    ** 4. Объект массивов должен содержать следующие поля:
    **    - email
    **    - order_title
    **    - order_price
    **    - order_status
    **    - order_manager
    */

    /* TODO: Настроить запись в Google Sheets
    ** 1. Настроить запись в Google Sheets по полям
    **    - record_id
    **    - call_date
    **    - department
    **    - abonent_name
    **    - abonent_phone
    **    - json поля из файла
    **    - client_email
    **    - client_name
    **    - client_gc_id_link
    **    - orders
    **    - null_orders
    **    - duration seconds
    ** После записи в таблицу заносить в базу данных user_record факт записи в Google Sheets. Если запись неудачная, то ничего не заносить в поле
    */



}
    
    
