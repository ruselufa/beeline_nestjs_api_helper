import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
// import { GoogleSpreadsheet } from 'google-spreadsheet';
// import { GoogleAuth } from 'google-auth-library';
// import * as fs from 'fs';
// import * as path from 'path';
import { InjectRepository } from '@nestjs/typeorm';
import { AbonentRecord } from '../entities/beeline/abonent.record.entity';
import { AnalyzedAi } from '../entities/beeline/analyzed_ai.entity';
import { Abonent } from '../entities/beeline/abonent.entity';
import { MoreThan, Repository } from 'typeorm';
import { GoogleSheetsService } from '../google-sheets/google-sheets.service';
import { GoogleSheetsRow } from '../google-sheets/types/google-sheets.types';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class ExportGoogleSheetsService implements OnApplicationBootstrap {
    private readonly logger = new Logger(ExportGoogleSheetsService.name);

    constructor(
        @InjectRepository(AbonentRecord)
        private readonly abonentRecordRepository: Repository<AbonentRecord>,
        @InjectRepository(AnalyzedAi)
        private readonly analyzedAiRepository: Repository<AnalyzedAi>,
        @InjectRepository(Abonent)
        private readonly abonentRepository: Repository<Abonent>,
        private readonly googleSheetsService: GoogleSheetsService,
    ) {}

    async onApplicationBootstrap() {
        this.logger.log('Инициализация сервиса экспорта в Google Sheets...');
        
        // Тестируем подключение к Google Sheets
        const isConnected = await this.googleSheetsService.testConnection();
        if (isConnected) {
            this.logger.log('✓ Подключение к Google Sheets успешно установлено');
        } else {
            this.logger.error('❌ Не удалось подключиться к Google Sheets');
            return;
        }

        // Запускаем обработку через небольшую задержку
        setTimeout(() => {
            this.processExportToGoogleSheets();
        }, 2000);
    }

    private async processExportToGoogleSheets() {
        let offset = 0;
        const batchSize = 10; // Уменьшил размер пакета для Google Sheets
        let processedTotal = 0;

        const totalRecords = await this.abonentRecordRepository.count({
            where: {
                beeline_download: true,
                transcribe_processed: true,
                deepseek_analysed: true,
                to_short: false,
                duration: MoreThan(240000),
                google_sheets_export: false
            }
        });
        
        this.logger.log(`Всего найдено записей длительностью > 4 минут для экспорта в Google Sheets: ${totalRecords}`);

        while (true) {
            const records = await this.abonentRecordRepository.find({
                where: {
                    beeline_download: true,
                    transcribe_processed: true,
                    deepseek_analysed: true,
                    to_short: false,
                    duration: MoreThan(240000),
                    google_sheets_export: false
                },
                order: { date: 'DESC' },
                skip: offset,
                take: batchSize
            });
            
            if (!records.length) break;
            
            const rowsToExport: GoogleSheetsRow[] = [];
            
            for (const record of records) {
                try {
                    const exportRow = await this.prepareRecordForExport(record);
                    if (exportRow) {
                        rowsToExport.push(exportRow);
                    }
                } catch (error) {
                    this.logger.error(`Ошибка подготовки записи ${record.id}: ${error.message}`);
                }
            }

            // Экспортируем пакет записей в Google Sheets
            if (rowsToExport.length > 0) {
                const result = await this.googleSheetsService.writeMultipleRows(rowsToExport);
                
                if (result.success) {
                    // Помечаем записи как экспортированные
                    for (const record of records.slice(0, rowsToExport.length)) {
                        record.google_sheets_export = true;
                        await this.abonentRecordRepository.save(record);
                    }
                    
                    processedTotal += rowsToExport.length;
                    this.logger.log(`✓ Экспортировано ${rowsToExport.length} записей в Google Sheets`);
                } else {
                    this.logger.error(`❌ Ошибка экспорта в Google Sheets: ${result.error}`);
                    break; // Прерываем при ошибке
                }
            }
            
            offset += batchSize;
            
            // Пауза между пакетами для избежания rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        this.logger.log(`Обработка завершена. Всего обработано записей: ${processedTotal} из ${totalRecords}`);
    }

    private async prepareRecordForExport(record: AbonentRecord): Promise<GoogleSheetsRow | null> {
        try {
            // Получаем данные абонента
            const abonent = await this.abonentRepository.findOne({ 
                where: { id: Number(record.abonent) } 
            });

            // Получаем анализ AI
            const aiAnalysis = await this.analyzedAiRepository.findOne({
                where: { conversationId: `conv_${record.id}` }
            });

            // Читаем JSON файл с анализом
            const jsonFilePath = path.join(process.cwd(), 'export', 'json', `${record.id}_${record.phone}.json`);
            let analysisData: any = {};
            
            try {
                const rawJsonData = await this.googleSheetsService.readJsonFile(jsonFilePath);
                // JSON файл содержит экранированную JSON строку, нужно дважды парсить
                if (typeof rawJsonData === 'string') {
                    analysisData = JSON.parse(rawJsonData);
                } else {
                    analysisData = rawJsonData;
                }
            } catch (error) {
                this.logger.warn(`JSON файл не найден для записи ${record.id}: ${jsonFilePath}`);
                
                // Используем данные из БД если JSON файл не найден
                if (aiAnalysis) {
                    analysisData = aiAnalysis.analysisResult;
                }
            }

            // TODO: Поиск клиента в базе данных distributionbot
            // Пока временно используем заглушки
            const clientData = {
                client_email: 'client@example.com',
                client_name: 'Test Client',
                client_gc_id_link: '',
                orders: JSON.stringify([]),
                null_orders: JSON.stringify([])
            };

            // Формируем строку для экспорта
            const exportRow: GoogleSheetsRow = {
                record_id: record.id.toString(),
                call_date: record.date ? new Date(record.date).toISOString() : '',
                department: abonent?.department || 'Неизвестно',
                abonent_name: abonent ? `${abonent.firstName} ${abonent.lastName}` : 'Неизвестно',
                abonent_phone: record.phone || '',
                client_email: clientData.client_email,
                client_name: clientData.client_name,
                client_gc_id_link: clientData.client_gc_id_link,
                orders: clientData.orders,
                null_orders: clientData.null_orders,
                duration_seconds: Math.floor(record.duration / 1000),
                
                // AI analysis fields from config.json - Продажи и резюме разговора
                sale_probability: analysisData.sale_probability || 0,
                rating_explanation_1: analysisData.rating_explanation_1 || '',
                conversation_result: analysisData.conversation_result || '',
                detailed_summary: analysisData.detailed_summary || '',
                
                // Настрой клиента, потребности, возражения и факты
                attitude: analysisData.attitude || 0,
                rating_explanation_2: analysisData.rating_explanation_2 || '',
                facts: analysisData.facts || '',
                needs: analysisData.needs || '',
                objections: analysisData.objections || '',
                
                // Работа менеджера и советы
                politeness: analysisData.politeness || 0,
                rating_explanation_3: analysisData.rating_explanation_3 || '',
                presentation: analysisData.presentation || 0,
                rating_explanation_4: analysisData.rating_explanation_4 || '',
                objection_handling: analysisData.objection_handling || 0,
                rating_explanation_5: analysisData.rating_explanation_5 || '',
                mop_advice: analysisData.mop_advice || '',
                
                // Дополнительные аспекты звонка
                greeting: analysisData.greeting || 0,
                call_purpose: analysisData.call_purpose || 0,
                full_dialog_structure: analysisData.full_dialog_structure || 0,
                needs_identification: analysisData.needs_identification || 0,
                client_summary: analysisData.client_summary || 0,
                product_presentation: analysisData.product_presentation || 0,
                format_presentation: analysisData.format_presentation || 0,
                price_presentation: analysisData.price_presentation || 0,
                feedback_removal: analysisData.feedback_removal || 0,
                objection_agreement: analysisData.objection_agreement || 0,
                true_objection_reveal: analysisData.true_objection_reveal || 0,
                objection_processing: analysisData.objection_processing || 0,
                deal_closure: analysisData.deal_closure || 0,
                active_listening: analysisData.active_listening || 0,
                next_step: analysisData.next_step || 0,
                manager_active_position: analysisData.manager_active_position || 0
            };

            return exportRow;
            
        } catch (error) {
            this.logger.error(`Ошибка подготовки записи ${record.id} для экспорта: ${error.message}`);
            return null;
        }
    }

    // Метод для поиска клиента в базе данных distributionbot (для будущей реализации)
    private async findClientInDistributionBot(phone: string): Promise<any> {
        // TODO: Реализовать поиск в OrderModel и NullOrderModel
        // 1. Поиск в таблице OrderModel по номеру телефона
        // 2. Поиск в таблице NullOrderModel по номеру телефона
        // 3. Возврат объединенных данных или "Клиент не найден"
        
        return {
            found: false,
            message: "Клиент не найден",
            orders: [],
            nullOrders: []
        };
    }
}
    
    
