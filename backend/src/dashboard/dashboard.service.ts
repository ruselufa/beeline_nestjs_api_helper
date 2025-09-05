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

  /**
   * Список отделов, которые нужно исключать из менеджерских метрик и обзорных графиков
   */
  private readonly EXCLUDED_DEPARTMENTS: string[] = [
    'Отдел Качества',
    'Отдел Продукта',
    'Остальные',
    'Уволенные рабочие',
    'Заблокированные',
  ];

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
    console.log('🔍 AnalyzedAi records count:', analyzedRecords.length);
    if (analyzedRecords.length > 0) {
      console.log('🔍 First AnalyzedAi record:', JSON.stringify(analyzedRecords[0].analysisResult, null, 2));
    }
    
    const averageScore = analyzedRecords.length > 0 
      ? analyzedRecords.reduce((sum, record) => {
          const analysis = record.analysisResult as any;
          // Извлекаем total_score из table.blocks[2].headers
          const totalScoreHeader = analysis?.table?.blocks?.[2]?.headers?.find((h: any) => h.id === 'total_score');
          const score = totalScoreHeader?.value || 0;
          console.log('🔍 Score from AnalyzedAi:', score, 'from totalScoreHeader:', totalScoreHeader);
          return sum + score;
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

    return managers
      .filter(manager => !this.EXCLUDED_DEPARTMENTS.includes(manager.department))
      .map(manager => {
      const records = manager.abonentRecords || [];
      const totalCalls = records.length;
      const totalDuration = records.reduce((sum, record) => sum + (record.duration || 0), 0);
      
      // Вычисляем средний балл для менеджера
      const analyzedRecords = records.filter(record => record.deepseek_analysed);
      console.log(`🔍 Manager ${manager.firstName} ${manager.lastName}: analyzed records:`, analyzedRecords.length);
      if (analyzedRecords.length > 0) {
        console.log('🔍 First analyzed record:', JSON.stringify(analyzedRecords[0].deepseek_analysis, null, 2));
      }
      
      const averageScore = analyzedRecords.length > 0
        ? analyzedRecords.reduce((sum, record) => {
            const analysis = record.deepseek_analysis as any;
            // Извлекаем total_score из table.blocks[2].headers
            const totalScoreHeader = analysis?.table?.blocks?.[2]?.headers?.find((h: any) => h.id === 'total_score');
            const score = totalScoreHeader?.value || 0;
            console.log('🔍 Score from AbonentRecord:', score, 'from totalScoreHeader:', totalScoreHeader);
            return sum + score;
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
        lastCallDate: records.length > 0 ? (records[0].date || records[0].createdAt) : new Date(),
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
        date: Between(startDate, endDate),
      },
      relations: ['abonent'],
    });

    // Группируем по дням по реальной дате звонка
    const dailyStats = new Map<string, { totalCalls: number; totalDuration: number; scores: number[] }>();

    records.forEach(record => {
      // Используем дату звонка, а не создания записи
      const callDate = record.date ? new Date(record.date).toISOString().split('T')[0] : record.createdAt.toISOString().split('T')[0];
      const existing = dailyStats.get(callDate) || { totalCalls: 0, totalDuration: 0, scores: [] };
      
      existing.totalCalls++;
      existing.totalDuration += record.duration || 0;
      
      if (record.deepseek_analysed && record.deepseek_analysis) {
        const analysis = record.deepseek_analysis as any;
        const totalScoreHeader = analysis?.table?.blocks?.[2]?.headers?.find((h: any) => h.id === 'total_score');
        const score = totalScoreHeader?.value;
        if (score !== undefined) {
          existing.scores.push(score);
        }
      }
      
      dailyStats.set(callDate, existing);
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
      if (this.EXCLUDED_DEPARTMENTS.includes(dept)) {
        return;
      }
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
          const totalScoreHeader = analysis?.table?.blocks?.[2]?.headers?.find((h: any) => h.id === 'total_score');
          const score = totalScoreHeader?.value;
          if (score !== undefined) {
            existing.scores.push(score);
          }
        }
      });

      departmentMap.set(dept, existing);
    });

    return Array.from(departmentMap.entries())
      .map(([name, stats]) => {
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
      .filter(dept => !this.EXCLUDED_DEPARTMENTS.includes(dept.name)) // Исключаем отделы
      .sort((a, b) => b.averageScore - a.averageScore);
  }

  /**
   * Обзор по всем оставшимся отделам за период (по дням)
   */
  async getDepartmentsOverview(startDate: Date, endDate: Date) {
    const records = await this.recordRepository.find({
      where: {
        date: Between(startDate, endDate), // Используем дату звонка
      },
      relations: ['abonent'],
    });

    const filtered = records.filter(r => !this.EXCLUDED_DEPARTMENTS.includes(r.abonent?.department));

    const daily = new Map<string, { calls: number; duration: number; scores: number[] }>();
    for (const rec of filtered) {
      // Используем дату звонка, а не создания записи
      const callDate = rec.date ? new Date(rec.date).toISOString().split('T')[0] : rec.createdAt.toISOString().split('T')[0];
      const agg = daily.get(callDate) || { calls: 0, duration: 0, scores: [] };
      agg.calls += 1;
      agg.duration += rec.duration || 0;
      if (rec.deepseek_analysed && rec.deepseek_analysis) {
        const analysis = rec.deepseek_analysis as any;
        const totalScoreHeader = analysis?.table?.blocks?.[2]?.headers?.find((h: any) => h.id === 'total_score');
        const score = totalScoreHeader?.value;
        if (score !== undefined) agg.scores.push(score);
      }
      daily.set(callDate, agg);
    }

    const dailySeries = Array.from(daily.entries())
      .map(([date, d]) => ({
        date,
        totalCalls: d.calls,
        totalDuration: d.duration,
        averageScore: d.scores.length > 0 ? Math.round((d.scores.reduce((s, v) => s + v, 0) / d.scores.length) * 10) / 10 : 0,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const totals = dailySeries.reduce(
      (acc, d) => {
        acc.totalCalls += d.totalCalls;
        acc.totalDuration += d.totalDuration;
        acc._scoreSum += d.averageScore;
        acc._scoreDays += d.averageScore > 0 ? 1 : 0;
        return acc;
      },
      { totalCalls: 0, totalDuration: 0, _scoreSum: 0, _scoreDays: 0 },
    );

    const averageScore = totals._scoreDays > 0 ? Math.round((totals._scoreSum / totals._scoreDays) * 10) / 10 : 0;

    return {
      period: { start: startDate.toISOString(), end: endDate.toISOString() },
      metrics: { totalCalls: totals.totalCalls, totalDuration: totals.totalDuration, averageScore },
      daily: dailySeries,
    };
  }

  /**
   * Обзор по конкретному отделу за период (по дням) + агрегаты по менеджерам
   */
  async getDepartmentOverview(department: string, startDate: Date, endDate: Date) {
    const records = await this.recordRepository.find({
      where: {
        date: Between(startDate, endDate), // Используем дату звонка
      },
      relations: ['abonent'],
    });

    const filtered = records.filter(r => r.abonent?.department === department);

    const daily = new Map<string, { calls: number; duration: number; scores: number[] }>();
    const managerAgg = new Map<number, { name: string; calls: number; duration: number; scores: number[] }>();

    for (const rec of filtered) {
      // Используем дату звонка, а не создания записи
      const callDate = rec.date ? new Date(rec.date).toISOString().split('T')[0] : rec.createdAt.toISOString().split('T')[0];
      const agg = daily.get(callDate) || { calls: 0, duration: 0, scores: [] };
      agg.calls += 1;
      agg.duration += rec.duration || 0;
      if (rec.deepseek_analysed && rec.deepseek_analysis) {
        const analysis = rec.deepseek_analysis as any;
        const totalScoreHeader = analysis?.table?.blocks?.[2]?.headers?.find((h: any) => h.id === 'total_score');
        const score = totalScoreHeader?.value;
        if (score !== undefined) agg.scores.push(score);
      }
      daily.set(callDate, agg);

      // per manager aggregate
      const managerId = rec.abonent?.id;
      if (managerId) {
        const current = managerAgg.get(managerId) || {
          name: `${rec.abonent.firstName} ${rec.abonent.lastName}`,
          calls: 0,
          duration: 0,
          scores: [],
        };
        current.calls += 1;
        current.duration += rec.duration || 0;
        if (rec.deepseek_analysed && rec.deepseek_analysis) {
          const analysis = rec.deepseek_analysis as any;
          const totalScoreHeader = analysis?.table?.blocks?.[2]?.headers?.find((h: any) => h.id === 'total_score');
          const score = totalScoreHeader?.value;
          if (score !== undefined) current.scores.push(score);
        }
        managerAgg.set(managerId, current);
      }
    }

    const dailySeries = Array.from(daily.entries())
      .map(([date, d]) => ({
        date,
        totalCalls: d.calls,
        totalDuration: d.duration,
        averageScore: d.scores.length > 0 ? Math.round((d.scores.reduce((s, v) => s + v, 0) / d.scores.length) * 10) / 10 : 0,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const managers = Array.from(managerAgg.entries()).map(([id, m]) => ({
      id,
      name: m.name,
      totalCalls: m.calls,
      totalDuration: m.duration,
      averageScore: m.scores.length > 0 ? Math.round((m.scores.reduce((s, v) => s + v, 0) / m.scores.length) * 10) / 10 : 0,
    }));

    return {
      department,
      period: { start: startDate.toISOString(), end: endDate.toISOString() },
      daily: dailySeries,
      managers,
    };
  }

  private async getRecentCalls() {
    const records = await this.recordRepository.find({
      where: {
        deepseek_analysed: true,
      },
      relations: ['abonent'],
      order: {
        date: 'DESC', // Сортируем по дате звонка, а не создания записи
      },
      take: 20,
    });

    return records
      .map(record => {
        const analysis = record.deepseek_analysis as any;
        const totalScoreHeader = analysis?.table?.blocks?.[2]?.headers?.find((h: any) => h.id === 'total_score');
        const score = totalScoreHeader?.value || 0;
        
        return {
          id: record.id,
          managerId: record.abonent.id,
          managerName: `${record.abonent.firstName} ${record.abonent.lastName}`,
          clientPhone: record.phone || 'Не указан',
          duration: record.duration || 0,
          score: score,
          date: record.date || record.createdAt, // Используем дату звонка, если доступна
          department: record.abonent.department || 'Не указан',
          analysis: {
            quality: analysis?.quality_score || 0,
            sales: analysis?.sales_score || 0,
            recommendations: analysis?.recommendations || [],
          },
        };
      })
      .filter(call => call.score > 0); // Только проанализированные звонки с баллом > 0
  }

  /**
   * Получить все проанализированные звонки конкретного менеджера
   */
  async getManagerCalls(managerId: number, limit: number = 50) {
    const records = await this.recordRepository.find({
      where: {
        deepseek_analysed: true,
        abonent: { id: managerId },
      },
      relations: ['abonent'],
      order: {
        date: 'DESC', // Сортируем по дате звонка
      },
      take: limit,
    });

    return records
      .map(record => {
        const analysis = record.deepseek_analysis as any;
        const totalScoreHeader = analysis?.table?.blocks?.[2]?.headers?.find((h: any) => h.id === 'total_score');
        const score = totalScoreHeader?.value || 0;
        
        return {
          id: record.id,
          beelineId: record.beelineId,
          beelineExternalId: record.beelineExternalId,
          callId: record.callId,
          phone: record.phone,
          direction: record.direction,
          date: record.date,
          createdAt: record.createdAt,
          duration: record.duration,
          fileSize: record.fileSize,
          comment: record.comment,
          score: score,
          managerName: `${record.abonent.firstName} ${record.abonent.lastName}`,
          department: record.abonent.department || 'Не указан',
          // Полный JSON анализа
          deepseekAnalysis: record.deepseek_analysis,
        };
      })
      .filter(call => call.score > 0); // Только проанализированные звонки с баллом > 0
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
