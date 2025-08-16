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
import { Cron } from '@nestjs/schedule';
import { Worker } from 'worker_threads';
import { BaseCronService } from './base-cron.service';

@Injectable()
export class ExportGoogleSheetsService extends BaseCronService implements OnApplicationBootstrap {
    protected readonly logger = new Logger(ExportGoogleSheetsService.name);
    public isProcessing = false;
    public lastStartTime: Date | null = null;
    private worker: Worker | null = null;

    constructor(
        @InjectRepository(AbonentRecord)
        private readonly abonentRecordRepository: Repository<AbonentRecord>,
        @InjectRepository(AnalyzedAi)
        private readonly analyzedAiRepository: Repository<AnalyzedAi>,
        @InjectRepository(Abonent)
        private readonly abonentRepository: Repository<Abonent>,
        private readonly googleSheetsService: GoogleSheetsService,
    ) {
        super();
    }

    async onApplicationBootstrap() {
        this.logger.log('ExportGoogleSheetsService инициализирован. Экспорт в Google Sheets будет выполняться по расписанию.');
        
        // Тестируем подключение к Google Sheets при старте
        const isConnected = await this.googleSheetsService.testConnection();
        if (isConnected) {
            this.logger.log('✓ Подключение к Google Sheets успешно установлено');
        } else {
            this.logger.error('❌ Не удалось подключиться к Google Sheets');
        }

        setTimeout(async () => {
            this.isProcessing = false;
            this.lastStartTime = null;
            await this.processExport();
        }, 1000);
    }

    // Запускаем экспорт каждый 30 минут
    @Cron('*/30 * * * *')
    async processExport() {
        if (this.isProcessing) {
            const runningTime = Date.now() - this.lastStartTime.getTime();
            this.logger.warn(`Экспорт в Google Sheets уже выполняется ${Math.floor(runningTime / 1000)} секунд, пропускаем запуск`);
            return;
        }

        this.isProcessing = true;
        this.lastStartTime = new Date();
        
        try {
            this.logger.log('Запуск cron-задачи: экспорт в Google Sheets');
            // Временно используем обычную обработку вместо worker
            const results = await this.processExportToGoogleSheets();
            this.logger.log(`Экспорт в Google Sheets завершен. Успешно: ${results.success}, Ошибок: ${results.errors}`);
        } catch (error) {
            this.logger.error('Критическая ошибка выполнения экспорта в Google Sheets:', error);
        } finally {
            this.isProcessing = false;
            this.lastStartTime = null;
        }
    }

    async processExportWithWorker() {
        return new Promise((resolve, reject) => {
            // Определяем путь к worker файлу в зависимости от окружения
            const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
            const workerPath = isDev 
                ? path.join(process.cwd(), 'src', 'cron-jobs', 'export-worker.js')
                : path.join(__dirname, 'export-worker.js');

            // Создаем worker для экспорта в Google Sheets
            this.worker = new Worker(workerPath, {
                workerData: {
                    // Передаем необходимые данные в worker
                }
            });

            this.worker.on('message', (message) => {
                this.logger.log('Worker сообщение:', message);
                if (message.type === 'progress') {
                    this.logger.log(`Прогресс экспорта в Google Sheets: ${message.data}`);
                } else if (message.type === 'complete') {
                    this.logger.log('Экспорт в Google Sheets завершен в worker');
                    this.worker?.terminate();
                    this.worker = null;
                    resolve(message.data);
                }
            });

            this.worker.on('error', (error) => {
                this.logger.error('Ошибка в worker:', error);
                this.worker?.terminate();
                this.worker = null;
                reject(error);
            });

            this.worker.on('exit', (code) => {
                if (code !== 0) {
                    this.logger.error(`Worker завершился с кодом ${code}`);
                    reject(new Error(`Worker завершился с кодом ${code}`));
                }
            });

            // Запускаем обработку в worker
            this.worker.postMessage({ type: 'start' });
        });
    }

    async processExportToGoogleSheets() {
        try {
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
            this.logger.log(JSON.stringify(whereConditions, null, 10));

            const totalRecords = await this.abonentRecordRepository.count({
                where: whereConditions
            });
            
            this.logger.log(`Всего найдено записей длительностью > 4 минут для экспорта в Google Sheets: ${totalRecords}`);

            if (totalRecords === 0) {
                this.logger.log('Нет записей для экспорта');
                return { success: 0, errors: 0, total: 0 };
            }

            // Получаем все записи для обработки
            const records = await this.abonentRecordRepository.find({
                where: whereConditions,
                order: { date: 'DESC' },
                relations: ['abonent']
            });

            // Используем базовый метод обработки с обработкой ошибок
            return await this.processWithErrorHandling(
                records,
                async (record) => {
                    await this.processRecordForExport(record);
                },
                'запись экспорта'
            );

        } catch (error) {
            this.logger.error('Критическая ошибка при получении записей для экспорта:', error);
            throw error;
        }
    }

    private async processRecordForExport(record: AbonentRecord): Promise<void> {
        try {
            this.logger.log(`Обрабатываем запись ${record.id}...`);
            
            // Подготавливаем запись для экспорта
            const exportRow = await this.prepareRecordForExport(record);
            if (!exportRow) {
                this.logger.warn(`Запись ${record.id} не может быть подготовлена для экспорта`);
                return;
            }

            // Экспортируем одну запись
            const result = await this.googleSheetsService.writeMultipleRows([exportRow]);
            
            if (result.success) {
                // Помечаем запись как экспортированную
                record.google_sheets_export = true;
                await this.abonentRecordRepository.save(record);
                this.logger.log(`✅ Запись ${record.id} успешно экспортирована в Google Sheets`);
            } else {
                throw new Error(`Ошибка экспорта в Google Sheets: ${result.error}`);
            }
            
        } catch (error) {
            this.logger.error(`❌ Ошибка при обработке записи ${record.id} для экспорта: ${error.message}`);
            
            // Анализируем тип ошибки
            this.logErrorDetails(error, record);
            
            // Перебрасываем ошибку для обработки в базовом классе
            throw error;
        }
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
            
            // Получаем данные абонента по userId из записи
            const abonent = await this.abonentRepository.findOne({ 
                where: { userId: record.abonent?.userId || record.abonent?.id?.toString() }
            });
            
            if (!abonent) {
                this.logger.warn(`Абонент не найден для записи ${record.id} с phone: ${record.phone}`);
            } else {
                this.logger.log(`Найден абонент: ${abonent.firstName} ${abonent.lastName} (${abonent.department})`);
            }
            
            // Получаем данные клиента
            const clientData = await this.getClientData(record.phone);
            
            // Проверяем, что JSON файл анализа существует
            const jsonPath = path.join(process.cwd(), 'export', 'json', `${record.beelineId}_client_${record.phone}_analysis.json`);
            const jsonExists = await this.safeFileExists(jsonPath);
            
            if (!jsonExists) {
                this.logger.warn(`JSON файл анализа не найден для записи ${record.id}: ${jsonPath}`);
                return null;
            }
            
            let analysisData = null;
            try {
                const jsonContent = await fs.readFile(jsonPath, 'utf-8');
                // Удаляем все маркеры кода и лишние пробелы
                const cleanJson = jsonContent
                    .replace(/^```json\n|\n```$/g, '') // Удаляем маркеры кода
                    .replace(/^\s+|\s+$/g, ''); // Удаляем лишние пробелы в начале и конце
                
                analysisData = JSON.parse(cleanJson);
                this.logger.log(`Загружены данные анализа из файла ${record.beelineId}_client_${record.phone}_analysis.json`);
            } catch (error) {
                this.logger.error(`Ошибка парсинга JSON файла для записи ${record.id}: ${error.message}`);
                return null;
            }

            // Формируем базовую строку для экспорта с правильными данными
            const exportRow: GoogleSheetsRow = {
                record_id: record.beelineId.toString(),
                call_date: record.date.toISOString(),
                department: abonent?.department || 'Неизвестно',
                client_phone: record.phone,
                manager_name: abonent ? `${abonent.firstName || ''} ${abonent.lastName || ''}`.trim() || 'Неизвестно' : 'Неизвестно',
                manager_phone: abonent?.phone || '',
                client_email: clientData.client_email,
                client_name: clientData.client_name,
                client_gc_id_link: clientData.client_gc_id_link,
                orders: JSON.parse(clientData.orders || '[]'),
                null_orders: JSON.parse(clientData.null_orders || '[]'),
                duration_seconds: Math.floor(record.duration / 1000),
                abonent_name: abonent ? `${abonent.firstName || ''} ${abonent.lastName || ''}`.trim() || 'Неизвестно' : 'Неизвестно',
                abonent_phone: abonent?.phone || '',
            };

            // Если есть данные анализа, добавляем их
            if (analysisData && analysisData.table && Array.isArray(analysisData.table.blocks)) {
                analysisData.table.blocks.forEach((block, blockIndex) => {
                    if (Array.isArray(block.headers)) {
                        block.headers.forEach(header => {
                            try {
                                const value = header.value;
                                
                                // Улучшенная обработка массивов
                                if (header.type === 'array') {
                                    if (Array.isArray(value)) {
                                        // Если это массив, объединяем элементы через запятую и пробел
                                        exportRow[header.id] = value.join(', ');
                                    } else if (typeof value === 'string') {
                                        // Если это строка, оставляем как есть
                                        exportRow[header.id] = value;
                                    } else {
                                        // Если значение null/undefined, устанавливаем пустую строку
                                        exportRow[header.id] = '';
                                    }
                                } else if (header.type === 'numeric') {
                                    // Обработка числовых значений
                                    if (value === null || value === undefined || value === '') {
                                        exportRow[header.id] = '0';
                                    } else {
                                        const num = Number(value);
                                        exportRow[header.id] = isNaN(num) ? '0' : num.toString();
                                    }
                                } else {
                                    // Обработка текстовых значений
                                    exportRow[header.id] = value || '';
                                }
                            } catch (error) {
                                this.logger.error(`Ошибка при обработке поля ${header.id}: ${error.message}`);
                                // Устанавливаем пустое значение при ошибке
                                exportRow[header.id] = '';
                            }
                        });
                    }
                });
            } else {
                this.logger.warn('Данные анализа отсутствуют или имеют неверный формат');
            }

            this.logger.log(`Запись ${record.id} успешно подготовлена для экспорта`);
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
    
    
