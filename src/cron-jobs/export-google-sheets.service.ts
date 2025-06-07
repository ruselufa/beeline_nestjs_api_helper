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
            
            // Инициализируем таблицу
            try {
                await this.googleSheetsService.initializeTable();
                this.logger.log('✓ Таблица успешно инициализирована');
            } catch (error) {
                this.logger.error(`❌ Ошибка инициализации таблицы: ${error.message}`);
                return;
            }
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

        // Проверяем условия поиска
        const whereConditions = {
            beeline_download: true,
            transcribe_processed: true,
            deepseek_analysed: true,
            to_short: false,
            duration: MoreThan(240000),
            google_sheets_export: false
        };
        
        this.logger.log('Условия поиска записей:');
        this.logger.log(JSON.stringify(whereConditions, null, 2));

        const totalRecords = await this.abonentRecordRepository.count({
            where: whereConditions
        });
        
        this.logger.log(`Всего найдено записей длительностью > 4 минут для экспорта в Google Sheets: ${totalRecords}`);

        while (true) {
            const records = await this.abonentRecordRepository.find({
                where: whereConditions,
                order: { date: 'DESC' },
                skip: offset,
                take: batchSize
            });
            
            if (!records.length) {
                this.logger.log('Больше записей для обработки не найдено');
                break;
            }
            
            this.logger.log(`Найдено ${records.length} записей для обработки`);
            
            const rowsToExport: GoogleSheetsRow[] = [];
            
            for (const record of records) {
                try {
                    this.logger.log(`Обрабатываем запись ${record.id}...`);
                    const exportRow = await this.prepareRecordForExport(record);
                    if (exportRow) {
                        rowsToExport.push(exportRow);
                        this.logger.log(`Запись ${record.id} успешно подготовлена для экспорта`);
                    }
                } catch (error) {
                    this.logger.error(`Ошибка подготовки записи ${record.id}: ${error.message}`);
                }
            }

            // Экспортируем пакет записей в Google Sheets
            if (rowsToExport.length > 0) {
                this.logger.log(`Экспортируем ${rowsToExport.length} записей в Google Sheets...`);
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

    private async getClientData(phone: string): Promise<any> {
        // TODO: Реализовать получение данных клиента из БД
        // Пока возвращаем заглушку
        return {
            client_email: '',
            client_name: '',
            client_gc_id_link: '',
            orders: '[]',
            null_orders: '[]'
        };
    }

    private mapAnalysisData(jsonData: any): any {
        // Функция для безопасного преобразования в число
        const safeNumber = (value: any): number => {
            if (value === null || value === undefined || value === '') return 0;
            const num = Number(value);
            return isNaN(num) ? 0 : num;
        };

        // Функция для объединения массива в строку
        const arrayToString = (arr: any[]): string => {
            if (!Array.isArray(arr)) return '';
            return arr.join('\n');
        };

        // Извлекаем ключевые выводы
        const keyFindings = arrayToString(jsonData.keyFindings || []);
        
        // Формируем детальное резюме
        const detailedSummary = [
            `Оценка менеджера: ${jsonData.managerScore}/10`,
            `Потенциал сделки: ${jsonData.dealPotential}/10`,
            `Ожидаемая сумма: ${jsonData.estimatedDealAmount}`,
            '',
            'Ключевые выводы:',
            ...jsonData.keyFindings || [],
            '',
            'Рекомендации:',
            ...jsonData.recommendations || [],
            '',
            'Следующие шаги:',
            ...jsonData.nextSteps || []
        ].join('\n');

        return {
            // Продажи и резюме разговора
            sale_probability: safeNumber(jsonData.dealPotential) * 10, // Преобразуем из 10-балльной шкалы в проценты
            rating_explanation_1: `Оценка менеджера: ${jsonData.managerScore}/10\nПотенциал сделки: ${jsonData.dealPotential}/10\nОжидаемая сумма: ${jsonData.estimatedDealAmount}`,
            conversation_result: keyFindings,
            detailed_summary: detailedSummary,
            
            // Настрой клиента, потребности, возражения и факты
            attitude: safeNumber(jsonData.managerScore) * 10, // Преобразуем из 10-балльной шкалы в проценты
            rating_explanation_2: `Оценка менеджера: ${jsonData.managerScore}/10\nПотенциал сделки: ${jsonData.dealPotential}/10`,
            facts: keyFindings,
            needs: arrayToString(jsonData.recommendations || []),
            objections: keyFindings,
            
            // Работа менеджера и советы
            politeness: safeNumber(jsonData.managerScore) * 10, // Преобразуем из 10-балльной шкалы в проценты
            rating_explanation_3: `Оценка менеджера: ${jsonData.managerScore}/10\nПотенциал сделки: ${jsonData.dealPotential}/10`,
            presentation: safeNumber(jsonData.managerScore) * 10, // Преобразуем из 10-балльной шкалы в проценты
            rating_explanation_4: `Оценка менеджера: ${jsonData.managerScore}/10\nПотенциал сделки: ${jsonData.dealPotential}/10`,
            objection_handling: safeNumber(jsonData.managerScore) * 10, // Преобразуем из 10-балльной шкалы в проценты
            rating_explanation_5: `Оценка менеджера: ${jsonData.managerScore}/10\nПотенциал сделки: ${jsonData.dealPotential}/10`,
            mop_advice: arrayToString(jsonData.recommendations || []),
            
            // Дополнительные аспекты звонка
            next_step: arrayToString(jsonData.nextSteps || []),
            
            // Остальные поля заполняем нулями, так как их нет в JSON
            greeting: safeNumber(jsonData.managerScore) * 10, // Используем оценку менеджера как базовую оценку
            call_purpose: safeNumber(jsonData.managerScore) * 10,
            full_dialog_structure: safeNumber(jsonData.managerScore) * 10,
            needs_identification: safeNumber(jsonData.managerScore) * 10,
            client_summary: safeNumber(jsonData.managerScore) * 10,
            product_presentation: safeNumber(jsonData.managerScore) * 10,
            format_presentation: safeNumber(jsonData.managerScore) * 10,
            price_presentation: safeNumber(jsonData.managerScore) * 10,
            feedback_removal: safeNumber(jsonData.managerScore) * 10,
            objection_agreement: safeNumber(jsonData.managerScore) * 10,
            true_objection_reveal: safeNumber(jsonData.managerScore) * 10,
            objection_processing: safeNumber(jsonData.managerScore) * 10,
            deal_closure: safeNumber(jsonData.managerScore) * 10,
            active_listening: safeNumber(jsonData.managerScore) * 10,
            manager_active_position: safeNumber(jsonData.managerScore) * 10
        };
    }

    private async prepareRecordForExport(record: AbonentRecord): Promise<GoogleSheetsRow | null> {
        try {
            this.logger.log(`Подготовка записи ${record.id} для экспорта...`);
            
            // Получаем данные абонента
            const abonent = await this.abonentRepository.findOne({ 
                where: { phone: record.phone }
            });
            
            // Получаем данные клиента
            const clientData = await this.getClientData(record.phone);
            
            // Ищем JSON файл с анализом по телефону
            const jsonDir = path.join(process.cwd(), 'export', 'json');
            const files = await fs.readdir(jsonDir);
            const analysisFile = files.find(file => file.includes(`_client_${record.phone}_analysis.json`));
            
            let analysisData: any = {};
            if (analysisFile) {
                const jsonPath = path.join(jsonDir, analysisFile);
                this.logger.log(`Найден файл анализа: ${jsonPath}`);
                
                try {
                    const fileContent = await fs.readFile(jsonPath, 'utf-8');
                    // JSON файл содержит экранированную JSON строку, нужно дважды парсить
                    const parsedContent = JSON.parse(fileContent);
                    analysisData = this.mapAnalysisData(JSON.parse(parsedContent));
                    this.logger.log(`Данные анализа успешно прочитаны для записи ${record.id}`);
                } catch (error) {
                    this.logger.warn(`Не удалось прочитать файл анализа для записи ${record.id}: ${error.message}`);
                    // Используем пустые значения как запасной вариант
                    analysisData = {
                        sale_probability: 0,
                        rating_explanation_1: '',
                        conversation_result: '',
                        detailed_summary: '',
                        attitude: 0,
                        rating_explanation_2: '',
                        facts: '',
                        needs: '',
                        objections: '',
                        politeness: 0,
                        rating_explanation_3: '',
                        presentation: 0,
                        rating_explanation_4: '',
                        objection_handling: 0,
                        rating_explanation_5: '',
                        mop_advice: '',
                        greeting: 0,
                        call_purpose: 0,
                        full_dialog_structure: 0,
                        needs_identification: 0,
                        client_summary: 0,
                        product_presentation: 0,
                        format_presentation: 0,
                        price_presentation: 0,
                        feedback_removal: 0,
                        objection_agreement: 0,
                        true_objection_reveal: 0,
                        objection_processing: 0,
                        deal_closure: 0,
                        active_listening: 0,
                        next_step: '',
                        manager_active_position: 0
                    };
                }
            } else {
                this.logger.warn(`Файл анализа не найден для телефона ${record.phone}`);
            }

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
                
                // AI analysis fields
                ...analysisData
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
    
    
