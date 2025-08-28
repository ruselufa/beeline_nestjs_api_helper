import * as path from 'path';

/**
 * Утилита для определения путей к worker файлам
 */
export class WorkerUtils {
  /**
   * Получает путь к worker файлу в зависимости от окружения
   * @param workerName - имя worker файла (без расширения)
   * @returns полный путь к worker файлу
   */
  static getWorkerPath(workerName: string): string {
    const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
    
    if (isDev) {
      // В режиме разработки используем исходные файлы из src
      return path.join(process.cwd(), 'src', 'cron-jobs', `${workerName}.js`);
    } else {
      // В продакшене используем скомпилированные файлы из dist
      return path.join(__dirname, `${workerName}.js`);
    }
  }

  /**
   * Проверяет существование worker файла
   * @param workerPath - путь к worker файлу
   * @returns true если файл существует
   */
  static async workerExists(workerPath: string): Promise<boolean> {
    try {
      const fs = await import('fs/promises');
      await fs.access(workerPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Логирует информацию о worker файле
   * @param workerName - имя worker
   * @param workerPath - путь к worker файлу
   */
  static logWorkerInfo(workerName: string, workerPath: string): void {
    console.log(`[WorkerUtils] ${workerName}: ${workerPath}`);
  }
} 