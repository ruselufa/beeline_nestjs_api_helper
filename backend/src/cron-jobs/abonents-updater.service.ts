import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BeelineApiCallService } from '../beeline_api_call/beeline_api_call.service';
import { Abonent } from '../entities/beeline/abonent.entity';
import { Worker } from 'worker_threads';
import * as path from 'path';
import { WorkerUtils } from './worker-utils';
import { Cron } from '@nestjs/schedule';
import { BaseCronService } from './base-cron.service';

@Injectable()
export class AbonentsUpdaterService extends BaseCronService implements OnApplicationBootstrap {
  protected readonly logger = new Logger(AbonentsUpdaterService.name);
  public isProcessing = false;
  public lastStartTime: Date | null = null;
  private worker: Worker | null = null;

  constructor(
    private readonly beelineApiCallService: BeelineApiCallService,
    @InjectRepository(Abonent)
    private readonly abonentRepository: Repository<Abonent>,
  ) {
    super();
  }

  async onApplicationBootstrap() {
    this.logger.log('Приложение запущено, начинаю первичное обновление абонентов...');
    // await this.updateAbonents();
  }

  // Делаем cron на каждый день в 3:30 ночи
  @Cron('30 3 * * *')
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
      const results = await this.updateAbonentsNormal();
      this.logger.log(`Обновление абонентов завершено. Успешно: ${results.success}, Ошибок: ${results.errors}`);
    } catch (error) {
      this.logger.error('Критическая ошибка при обновлении абонентов:', error);
    } finally {
      this.isProcessing = false;
      this.lastStartTime = null;
    }
  }

  async updateAbonentsNormal() {
    try {
      const abonents = await this.beelineApiCallService.getAllAbonents();
      this.logger.log(`Получено ${abonents.length} абонентов`);
      
      if (abonents.length === 0) {
        this.logger.log('Нет абонентов для обработки');
        return { success: 0, errors: 0, total: 0 };
      }

      // Используем базовый метод обработки с обработкой ошибок
      return await this.processWithErrorHandling(
        abonents,
        async (abonentData) => {
          await this.processAbonent(abonentData);
        },
        'абонент'
      );
      
    } catch (error) {
      this.logger.error('Ошибка при получении списка абонентов:', error);
      throw error;
    }
  }

  private async processAbonent(abonentData: any): Promise<void> {
    try {
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
        this.logger.log(`✅ Обновлен абонент: ${abonentData.firstName || ''} ${abonentData.lastName || ''}`);
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
        this.logger.log(`✅ Добавлен новый абонент: ${abonentData.firstName || ''} ${abonentData.lastName || ''}`);
      }
    } catch (error) {
      this.logger.error(`❌ Ошибка при обработке абонента ${abonentData.userId}: ${error.message}`);
      
      // Анализируем тип ошибки
      this.logErrorDetails(error, abonentData);
      
      // Продолжаем с следующим абонентом
      throw error; // Перебрасываем ошибку для обработки в базовом классе
    }
  }

  async updateAbonentsWithWorker() {
    return new Promise((resolve, reject) => {
      // Определяем путь к worker файлу в зависимости от окружения
      const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
      const workerPath = isDev 
        ? path.join(process.cwd(), 'src', 'cron-jobs', 'abonents-worker.js')
        : path.join(__dirname, 'abonents-worker.js');

      // Создаем worker для обновления абонентов
      this.worker = new Worker(workerPath, {
        workerData: {
          // Передаем необходимые данные в worker
        }
      });

      this.worker.on('message', (message) => {
        this.logger.log('Worker сообщение:', message);
        if (message.type === 'progress') {
          this.logger.log(`Прогресс обновления абонентов: ${message.data}`);
        } else if (message.type === 'complete') {
          this.logger.log('Обновление абонентов завершено в worker');
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
} 