import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../services/dashboardService';
import { SummaryCards } from '../components/dashboard/SummaryCards';
import { ManagerStats } from '../components/dashboard/ManagerStats';
import { CallAnalytics } from '../components/dashboard/CallAnalytics';
import { DepartmentOverview } from '../components/dashboard/DepartmentOverview';
import { DepartmentsOverview } from '../components/dashboard/DepartmentsOverview';
import { RecentCalls } from '../components/dashboard/RecentCalls';

export const Dashboard: React.FC = () => {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardService.getStats,
    refetchInterval: 30000, // Обновляем каждые 30 секунд
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 text-lg mb-2">Ошибка загрузки данных</div>
        <p className="text-gray-600">Не удалось загрузить статистику дашборда</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">
          Дашборд анализа звонков
        </h1>
        <div className="text-sm text-gray-500">
          Последнее обновление: {new Date().toLocaleTimeString('ru-RU')}
        </div>
      </div>
      
      {/* Общая статистика */}
      <SummaryCards summary={stats?.summary} />
      
      {/* Топ менеджеров */}
      <ManagerStats stats={stats?.managerStats} />
      
      {/* Аналитика звонков */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CallAnalytics data={stats?.callAnalytics} />
        <DepartmentOverview data={stats?.departmentStats} />
      </div>
      
      {/* Обзор по отделам с графиками */}
      <DepartmentsOverview />
      
      {/* Последние звонки */}
      <RecentCalls calls={stats?.recentCalls} />
    </div>
  );
};
