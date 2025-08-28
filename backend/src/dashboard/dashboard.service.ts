import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Abonent } from '../entities/beeline/abonent.entity';
import { AbonentRecord } from '../entities/beeline/abonent.record.entity';
import { AnalyzedAi } from '../entities/beeline/analyzed_ai.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Abonent)
    private abonentRepository: Repository<Abonent>,
    @InjectRepository(AbonentRecord)
    private recordRepository: Repository<AbonentRecord>,
    @InjectRepository(AnalyzedAi)
    private analyzedAiRepository: Repository<AnalyzedAi>,
  ) {}

  async getDashboardStats() {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Получаем общую статистику
    const totalCalls = await this.recordRepository.count();
    const activeManagers = await this.abonentRepository.count();
    
    // Получаем записи за последнюю неделю для анализа трендов
    const recentRecords = await this.recordRepository.find({
      where: {
        createdAt: Between(weekAgo, now),
      },
      relations: ['abonent'],
    });

    // Вычисляем средний балл
    const analyzedRecords = await this.analyzedAiRepository.find();
    const averageScore = analyzedRecords.length > 0 
      ? analyzedRecords.reduce((sum, record) => {
          const analysis = record.analysisResult as any;
          return sum + (analysis?.overall_score || 0);
        }, 0) / analyzedRecords.length
      : 0;

    // Общее время звонков
    const totalDuration = recentRecords.reduce((sum, record) => sum + (record.duration || 0), 0);

    // Статистика по менеджерам
    const managerStats = await this.getManagerStats();

    // Аналитика звонков по дням
    const callAnalytics = await this.getCallAnalytics(weekAgo, now);

    // Статистика по отделам
    const departmentStats = await this.getDepartmentStats();

    // Последние звонки
    const recentCalls = await this.getRecentCalls();

    return {
      summary: {
        totalCalls,
        averageScore: Math.round(averageScore * 10) / 10,
        totalDuration,
        activeManagers,
      },
      managerStats,
      callAnalytics,
      departmentStats,
      recentCalls,
    };
  }

  private async getManagerStats() {
    const managers = await this.abonentRepository.find({
      relations: ['abonentRecords'],
    });

    return managers.map(manager => {
      const records = manager.abonentRecords || [];
      const totalCalls = records.length;
      const totalDuration = records.reduce((sum, record) => sum + (record.duration || 0), 0);
      
      // Вычисляем средний балл для менеджера
      const analyzedRecords = records.filter(record => record.deepseek_analysed);
      const averageScore = analyzedRecords.length > 0
        ? analyzedRecords.reduce((sum, record) => {
            const analysis = record.deepseek_analysis as any;
            return sum + (analysis?.overall_score || 0);
          }, 0) / analyzedRecords.length
        : 0;

      // Определяем тренд (упрощенно)
      const trend = this.calculateTrend(records);

      return {
        id: manager.id,
        name: `${manager.firstName} ${manager.lastName}`,
        department: manager.department || 'Не указан',
        totalCalls,
        averageScore: Math.round(averageScore * 10) / 10,
        totalDuration,
        trend,
        lastCallDate: records.length > 0 ? records[0].createdAt : new Date(),
        successRate: Math.round((analyzedRecords.length / totalCalls) * 100) || 0,
      };
    })
    .filter(manager => manager.totalCalls > 0)
    .sort((a, b) => b.averageScore - a.averageScore)
    .slice(0, 10);
  }

  private async getCallAnalytics(startDate: Date, endDate: Date) {
    const records = await this.recordRepository.find({
      where: {
        createdAt: Between(startDate, endDate),
      },
      relations: ['abonent'],
    });

    // Группируем по дням
    const dailyStats = new Map<string, { totalCalls: number; totalDuration: number; scores: number[] }>();

    records.forEach(record => {
      const date = record.createdAt.toISOString().split('T')[0];
      const existing = dailyStats.get(date) || { totalCalls: 0, totalDuration: 0, scores: [] };
      
      existing.totalCalls++;
      existing.totalDuration += record.duration || 0;
      
      if (record.deepseek_analysed && record.deepseek_analysis) {
        const analysis = record.deepseek_analysis as any;
        if (analysis?.overall_score) {
          existing.scores.push(analysis.overall_score);
        }
      }
      
      dailyStats.set(date, existing);
    });

    return Array.from(dailyStats.entries()).map(([date, stats]) => ({
      date,
      totalCalls: stats.totalCalls,
      averageScore: stats.scores.length > 0 
        ? Math.round(stats.scores.reduce((sum, score) => sum + score, 0) / stats.scores.length * 10) / 10
        : 0,
      totalDuration: stats.totalDuration,
      successRate: Math.round((stats.scores.length / stats.totalCalls) * 100),
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  private async getDepartmentStats() {
    const managers = await this.abonentRepository.find({
      relations: ['abonentRecords'],
    });

    const departmentMap = new Map<string, {
      totalCalls: number;
      totalDuration: number;
      scores: number[];
      managerCount: number;
      managers: string[];
    }>();

    managers.forEach(manager => {
      const dept = manager.department || 'Не указан';
      const existing = departmentMap.get(dept) || {
        totalCalls: 0,
        totalDuration: 0,
        scores: [],
        managerCount: 0,
        managers: [],
      };

      existing.managerCount++;
      existing.managers.push(`${manager.firstName} ${manager.lastName}`);

      const records = manager.abonentRecords || [];
      existing.totalCalls += records.length;
      existing.totalDuration += records.reduce((sum, record) => sum + (record.duration || 0), 0);

      records.forEach(record => {
        if (record.deepseek_analysed && record.deepseek_analysis) {
          const analysis = record.deepseek_analysis as any;
          if (analysis?.overall_score) {
            existing.scores.push(analysis.overall_score);
          }
        }
      });

      departmentMap.set(dept, existing);
    });

    return Array.from(departmentMap.entries()).map(([name, stats]) => {
      const averageScore = stats.scores.length > 0
        ? Math.round(stats.scores.reduce((sum, score) => sum + score, 0) / stats.scores.length * 10) / 10
        : 0;

      // Находим лучшего менеджера в отделе
      const topManager = stats.managers[0] || 'Не указан';

      return {
        name,
        totalCalls: stats.totalCalls,
        averageScore,
        totalDuration: stats.totalDuration,
        managerCount: stats.managerCount,
        topManager,
        trend: 'stable', // Упрощенно
      };
    })
    .sort((a, b) => b.averageScore - a.averageScore);
  }

  private async getRecentCalls() {
    const records = await this.recordRepository.find({
      where: {
        deepseek_analysed: true,
      },
      relations: ['abonent'],
      order: {
        createdAt: 'DESC',
      },
      take: 20,
    });

    return records.map(record => {
      const analysis = record.deepseek_analysis as any;
      
      return {
        id: record.id,
        managerName: `${record.abonent.firstName} ${record.abonent.lastName}`,
        clientPhone: record.phone || 'Не указан',
        duration: record.duration || 0,
        score: analysis?.overall_score || 0,
        date: record.createdAt,
        department: record.abonent.department || 'Не указан',
        analysis: {
          quality: analysis?.quality_score || 0,
          sales: analysis?.sales_score || 0,
          recommendations: analysis?.recommendations || [],
        },
      };
    });
  }

  private calculateTrend(records: AbonentRecord[]): 'up' | 'down' | 'stable' {
    if (records.length < 2) return 'stable';
    
    // Упрощенная логика определения тренда
    const recentRecords = records.slice(0, Math.min(5, records.length));
    const olderRecords = records.slice(-Math.min(5, records.length));
    
    const recentAvg = recentRecords.reduce((sum, record) => sum + (record.duration || 0), 0) / recentRecords.length;
    const olderAvg = olderRecords.reduce((sum, record) => sum + (record.duration || 0), 0) / olderRecords.length;
    
    if (recentAvg > olderAvg * 1.1) return 'up';
    if (recentAvg < olderAvg * 0.9) return 'down';
    return 'stable';
  }
}
