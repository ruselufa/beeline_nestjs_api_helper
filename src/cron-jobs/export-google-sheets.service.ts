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
import { SHEETS_CONFIG_V2 } from '../ai_deepseek/config/config.sheets_v2';

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
                    // for (const record of records.slice(0, rowsToExport.length)) {
                    //     record.google_sheets_export = true;
                    //     await this.abonentRecordRepository.save(record);
                    // }
                    
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

        // Извлекаем данные из JSON
        const callInfo = jsonData.call_info || {};
        const stageAssessment = jsonData.stage_assessment || {};
        const overallAssessment = jsonData.overall_assessment || {};
        const recommendationTemplate = jsonData.recommendation_template || {};

        return {
            // Основная информация о звонке
            record_id: callInfo.record_id || '',
            call_date: callInfo.call_date || '',
            department: callInfo.department || '',
            manager_name: callInfo.manager_name || '',
            client_name: callInfo.client_name || '',
            client_occupation: callInfo.client_occupation || '',
            call_purpose: callInfo.call_purpose || '',
            training_name: callInfo.training_name || '',
            payment_agreements: callInfo.payment_agreements || '',
            additional_info: callInfo.additional_info || '',

            // Оценка этапов звонка
            // Приветствие
            greeting_score: safeNumber(stageAssessment.greeting?.score),
            greeting_good: arrayToString(stageAssessment.greeting?.good_points || []),
            greeting_improve: arrayToString(stageAssessment.greeting?.improvement_points || []),
            greeting_recommendation: stageAssessment.greeting?.recommendation || '',

            // Программирование
            programming_score: safeNumber(stageAssessment.programming?.score),
            programming_good: arrayToString(stageAssessment.programming?.good_points || []),
            programming_improve: arrayToString(stageAssessment.programming?.improvement_points || []),
            programming_recommendation: stageAssessment.programming?.recommendation || '',

            // Выявление потребностей
            needs_score: safeNumber(stageAssessment.needs_identification?.score),
            needs_good: arrayToString(stageAssessment.needs_identification?.good_points || []),
            needs_improve: arrayToString(stageAssessment.needs_identification?.improvement_points || []),
            needs_recommendation: stageAssessment.needs_identification?.recommendation || '',

            // Резюме
            summary_score: safeNumber(stageAssessment.client_summary?.score),
            summary_good: arrayToString(stageAssessment.client_summary?.good_points || []),
            summary_improve: arrayToString(stageAssessment.client_summary?.improvement_points || []),
            summary_recommendation: stageAssessment.client_summary?.recommendation || '',

            // Презентация
            presentation_score: safeNumber(stageAssessment.presentation?.score),
            presentation_good: arrayToString(stageAssessment.presentation?.good_points || []),
            presentation_improve: arrayToString(stageAssessment.presentation?.improvement_points || []),
            presentation_recommendation: stageAssessment.presentation?.recommendation || '',

            // Работа с возражениями
            objections_score: safeNumber(stageAssessment.objection_handling?.score),
            objections_good: arrayToString(stageAssessment.objection_handling?.good_points || []),
            objections_improve: arrayToString(stageAssessment.objection_handling?.improvement_points || []),
            objections_recommendation: stageAssessment.objection_handling?.recommendation || '',

            // Закрытие
            closure_score: safeNumber(stageAssessment.deal_closure?.score),
            closure_good: arrayToString(stageAssessment.deal_closure?.good_points || []),
            closure_improve: arrayToString(stageAssessment.deal_closure?.improvement_points || []),
            closure_recommendation: stageAssessment.deal_closure?.recommendation || '',

            // Общая оценка
            total_score: safeNumber(overallAssessment.total_score),
            overall_good: arrayToString(overallAssessment.strengths || []),
            overall_improve: arrayToString(overallAssessment.weaknesses || []),
            overall_recommendations: arrayToString(overallAssessment.recommendations || []),

            // Шаблон рекомендаций
            recommendation_greeting: recommendationTemplate.greeting || '',
            recommendation_points: arrayToString(recommendationTemplate.improvement_points || []),
            recommendation_closing: recommendationTemplate.closing || ''
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
            
            // Получаем данные из JSON файла
            const jsonDir = path.join(process.cwd(), 'export', 'json');
            const files = await fs.readdir(jsonDir);
            const analysisFile = files.find(file => file.includes(`_client_${record.phone}_analysis.json`));
            
            let analysisData = null;
            if (analysisFile) {
                const jsonPath = path.join(jsonDir, analysisFile);
                const jsonContent = await fs.readFile(jsonPath, 'utf-8');
                try {
                    // Удаляем все маркеры кода и лишние пробелы
                    const cleanJson = jsonContent
                        .replace(/^```json\n|\n```$/g, '') // Удаляем маркеры кода
                        .replace(/^\s+|\s+$/g, ''); // Удаляем лишние пробелы в начале и конце
                    
                    this.logger.log('Очищенное содержимое файла:');
                    this.logger.log(cleanJson);
                    
                    analysisData = JSON.parse(cleanJson);
                    this.logger.log(`Загружены данные анализа из файла ${analysisFile}`);
                } catch (error) {
                    this.logger.error(`Ошибка парсинга JSON файла ${analysisFile}: ${error.message}`);
                    return null;
                }
            }

            // Формируем базовую строку для экспорта
            const exportRow: GoogleSheetsRow = {
                record_id: record.id.toString(),
                call_date: record.date.toISOString(),
                department: abonent?.department || 'Неизвестно',
                abonent_name: abonent ? `${abonent.firstName} ${abonent.lastName}`.trim() : 'Неизвестно',
                abonent_phone: record.phone,
                client_email: clientData.client_email,
                client_name: clientData.client_name,
                client_gc_id_link: clientData.client_gc_id_link,
                orders: JSON.parse(clientData.orders || '[]'),
                null_orders: JSON.parse(clientData.null_orders || '[]'),
                duration_seconds: Math.floor(record.duration / 1000),
            };

            // Если есть данные анализа, добавляем их
            if (analysisData && analysisData.table && Array.isArray(analysisData.table.blocks)) {
                this.logger.log('Начинаем обработку блоков данных...');
                
                analysisData.table.blocks.forEach((block, blockIndex) => {
                    this.logger.log(`Обработка блока ${blockIndex + 1}: ${block.blockName}`);
                    
                    if (Array.isArray(block.headers)) {
                        block.headers.forEach(header => {
                            try {
                                const value = header.value;
                                if (header.type === 'array' && Array.isArray(value)) {
                                    exportRow[header.id] = value.join(', ');
                                } else if (header.type === 'numeric') {
                                    exportRow[header.id] = value.toString();
                                } else {
                                    exportRow[header.id] = value;
                                }
                                this.logger.log(`Добавлено поле ${header.id}: ${exportRow[header.id]}`);
                            } catch (error) {
                                this.logger.error(`Ошибка при обработке поля ${header.id}: ${error.message}`);
                            }
                        });
                    }
                });
            } else {
                this.logger.warn('Данные анализа отсутствуют или имеют неверный формат');
            }

            this.logger.log('Подготовленные данные для экспорта:');
            this.logger.log(JSON.stringify(exportRow, null, 2));

            return exportRow;
        } catch (error) {
            this.logger.error(`Ошибка подготовки записи ${record.id}: ${error.message}`);
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
    
    
