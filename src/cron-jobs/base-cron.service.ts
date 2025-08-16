import { Logger } from '@nestjs/common';

export abstract class BaseCronService {
  protected abstract readonly logger: Logger;
  
  /**
   * Обрабатывает массив элементов с обработкой ошибок
   * Продолжает работу при ошибках, не прерывая весь процесс
   */
  protected async processWithErrorHandling<T>(
    items: T[],
    processor: (item: T) => Promise<void>,
    itemName: string = 'элемент'
  ): Promise<{ success: number; errors: number; total: number }> {
    let successCount = 0;
    let errorCount = 0;
    const total = items.length;
    
    this.logger.log(`Начинаем обработку ${total} ${itemName}ов`);
    
    for (const item of items) {
      try {
        await processor(item);
        successCount++;
        this.logger.log(`✅ ${itemName} успешно обработан`);
      } catch (error) {
        errorCount++;
        this.logger.error(`❌ Ошибка при обработке ${itemName}: ${error.message}`);
        
        // Логируем детали ошибки
        this.logErrorDetails(error, item);
        
        // Продолжаем с следующим элементом
        continue;
      }
      
      // Небольшая пауза между элементами
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.logger.log(`🎯 Обработка завершена. Успешно: ${successCount}, Ошибок: ${errorCount}, Всего: ${total}`);
    
    return { success: successCount, errors: errorCount, total };
  }
  
  /**
   * Обрабатывает элементы пакетами с обработкой ошибок
   */
  protected async processBatchWithErrorHandling<T>(
    items: T[],
    processor: (item: T) => Promise<void>,
    batchSize: number = 5,
    itemName: string = 'элемент'
  ): Promise<{ success: number; errors: number; total: number }> {
    let successCount = 0;
    let errorCount = 0;
    const total = items.length;
    
    this.logger.log(`Начинаем пакетную обработку ${total} ${itemName}ов (размер пакета: ${batchSize})`);
    
    // Разбиваем на пакеты
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      this.logger.log(`Обрабатываем пакет ${Math.floor(i / batchSize) + 1}/${Math.ceil(items.length / batchSize)}`);
      
      // Обрабатываем пакет параллельно
      const batchResults = await Promise.allSettled(
        batch.map(async (item) => {
          try {
            await processor(item);
            return { success: true };
          } catch (error) {
            this.logger.error(`❌ Ошибка при обработке ${itemName}: ${error.message}`);
            this.logErrorDetails(error, item);
            return { success: false, error };
          }
        })
      );
      
      // Подсчитываем результаты пакета
      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            successCount++;
          } else {
            errorCount++;
          }
        } else {
          errorCount++;
        }
      });
      
      // Пауза между пакетами
      if (i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    this.logger.log(`🎯 Пакетная обработка завершена. Успешно: ${successCount}, Ошибок: ${errorCount}, Всего: ${total}`);
    
    return { success: successCount, errors: errorCount, total };
  }
  
  /**
   * Логирует детали ошибки с анализом типа
   */
  protected logErrorDetails(error: any, item: any) {
    const errorMessage = error.message?.toLowerCase() || '';
    
    if (errorMessage.includes('enoent') || errorMessage.includes('file not found')) {
      this.logger.error(' Файл не найден');
    } else if (errorMessage.includes('econnreset') || errorMessage.includes('connection reset')) {
      this.logger.error('🌐 Сетевая ошибка - соединение разорвано');
    } else if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
      this.logger.error('⏰ Таймаут операции');
    } else if (errorMessage.includes('permission') || errorMessage.includes('access denied')) {
      this.logger.error('🔒 Ошибка прав доступа');
    } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      this.logger.error('🌐 Проблема с сетью');
    } else if (errorMessage.includes('download') || errorMessage.includes('upload')) {
      this.logger.error('📥 Ошибка передачи файла');
    } else if (errorMessage.includes('database') || errorMessage.includes('sql')) {
      this.logger.error('🗄️ Ошибка базы данных');
    } else {
      this.logger.error(`🔍 Неизвестный тип ошибки: ${error.name || 'Unknown'}`);
    }
    
    // Логируем дополнительную информацию об ошибке
    if (error.code) {
      this.logger.error(`📋 Код ошибки: ${error.code}`);
    }
    if (error.status) {
      this.logger.error(`📊 HTTP статус: ${error.status}`);
    }
    if (error.cause) {
      this.logger.error(`🔗 Причина: ${error.cause.message || error.cause}`);
    }
  }
  
  /**
   * Повторяет операцию с экспоненциальной задержкой
   */
  protected async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        this.logger.warn(`Попытка ${attempt}/${maxRetries} не удалась: ${error.message}`);
        
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt - 1); // Экспоненциальная задержка
          this.logger.log(`⏳ Ожидание ${delay}мс перед повторной попыткой...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }
  
  /**
   * Проверяет существование файла с обработкой ошибок
   */
  protected async safeFileExists(filePath: string): Promise<boolean> {
    try {
      const fs = await import('fs/promises');
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Безопасно удаляет файл с обработкой ошибок
   */
  protected async safeDeleteFile(filePath: string): Promise<boolean> {
    try {
      const fs = await import('fs/promises');
      await fs.unlink(filePath);
      this.logger.log(`🗑️ Файл успешно удален: ${filePath}`);
      return true;
    } catch (error) {
      this.logger.warn(`⚠️ Не удалось удалить файл ${filePath}: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Форматирует время в читаемом виде
   */
  protected formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}ч ${minutes % 60}м ${seconds % 60}с`;
    } else if (minutes > 0) {
      return `${minutes}м ${seconds % 60}с`;
    } else {
      return `${seconds}с`;
    }
  }
  
  /**
   * Выводит прогресс обработки
   */
  protected logProgress(current: number, total: number, startTime: number, itemName: string = 'элементов') {
    const percentage = Math.round((current / total) * 100);
    const elapsed = Date.now() - startTime;
    const elapsedFormatted = this.formatTime(elapsed);
    
    this.logger.log(`📊 Прогресс: ${current}/${total} ${itemName} (${percentage}%) - Прошло времени: ${elapsedFormatted}`);
  }
} 