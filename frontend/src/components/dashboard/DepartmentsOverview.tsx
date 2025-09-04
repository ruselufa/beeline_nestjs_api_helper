import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, Users, Clock, Star } from 'lucide-react';
import { DateRangePicker } from '../common/DateRangePicker';
import { dashboardService } from '../../services/dashboardService';
import { DateRange } from '../../types/dashboard';

export const DepartmentsOverview: React.FC = () => {
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const end = new Date();
    const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  });

  const [appliedRange, setAppliedRange] = useState<DateRange>(dateRange);

  const { data: overview, isLoading, refetch } = useQuery({
    queryKey: ['departmentsOverview', appliedRange],
    queryFn: () => dashboardService.getDepartmentsOverview(appliedRange),
  });

  const handleApply = () => {
    setAppliedRange(dateRange);
  };

  const formatDuration = (milliseconds: number) => {
    const minutes = Math.floor(milliseconds / 60000);
    return `${minutes} мин`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Обзор по отделам</h2>
      </div>

      <DateRangePicker
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onApply={handleApply}
        loading={isLoading}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : overview ? (
        <div className="space-y-6">
          {/* Сводная статистика */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Всего звонков</p>
                  <p className="text-xl font-semibold text-gray-900">{overview.metrics.totalCalls.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Star className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Средний балл</p>
                  <p className="text-xl font-semibold text-gray-900">{overview.metrics.averageScore}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Clock className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Общее время</p>
                  <p className="text-xl font-semibold text-gray-900">{formatDuration(overview.metrics.totalDuration)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* График количества звонков */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Динамика звонков по дням</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={overview.daily}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => `Дата: ${formatDate(value as string)}`}
                  formatter={(value: number, name: string) => {
                    if (name === 'totalCalls') return [value, 'Звонков'];
                    if (name === 'averageScore') return [value, 'Средний балл'];
                    if (name === 'totalDuration') return [formatDuration(value), 'Время'];
                    return [value, name];
                  }}
                />
                <Legend 
                  formatter={(value) => {
                    if (value === 'totalCalls') return 'Количество звонков';
                    if (value === 'averageScore') return 'Средний балл';
                    return value;
                  }}
                />
                <Bar dataKey="totalCalls" fill="#3B82F6" name="totalCalls" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* График среднего балла */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Динамика среднего балла</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={overview.daily}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                />
                <YAxis domain={[0, 10]} />
                <Tooltip 
                  labelFormatter={(value) => `Дата: ${formatDate(value as string)}`}
                  formatter={(value: number, name: string) => {
                    if (name === 'averageScore') return [value, 'Средний балл'];
                    return [value, name];
                  }}
                />
                <Legend 
                  formatter={(value) => {
                    if (value === 'averageScore') return 'Средний балл';
                    return value;
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="averageScore" 
                  stroke="#F59E0B" 
                  strokeWidth={3}
                  dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }}
                  name="averageScore"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          Данные не найдены
        </div>
      )}
    </div>
  );
};
