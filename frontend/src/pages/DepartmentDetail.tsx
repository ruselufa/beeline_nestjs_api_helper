import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { ArrowLeft, Users, Phone, Star, Clock, TrendingUp } from 'lucide-react';
import { DateRangePicker } from '../components/common/DateRangePicker';
import { dashboardService } from '../services/dashboardService';
import { DateRange } from '../types/dashboard';

export const DepartmentDetail: React.FC = () => {
  const { name } = useParams<{ name: string }>();
  const departmentName = decodeURIComponent(name || '');

  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const end = new Date();
    const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  });

  const [appliedRange, setAppliedRange] = useState<DateRange>(dateRange);

  const { data: overview, isLoading } = useQuery({
    queryKey: ['departmentOverview', departmentName, appliedRange],
    queryFn: () => dashboardService.getDepartmentOverview(departmentName, appliedRange),
    enabled: !!departmentName
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

  if (!departmentName) {
    return (
      <div className="p-6">
        <p className="text-gray-600">Отдел не найден</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Заголовок */}
      <div className="flex items-center gap-4">
        <Link 
          to="/" 
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          Назад к дашборду
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {departmentName}
        </h1>
        <p className="text-gray-600 mt-1">
          Детальная аналитика отдела
        </p>
      </div>

      {/* Выбор периода */}
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
          {/* График динамики отдела */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Динамика отдела</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={overview.daily}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                />
                <YAxis yAxisId="calls" orientation="left" />
                <YAxis yAxisId="score" orientation="right" domain={[0, 10]} />
                <Tooltip 
                  labelFormatter={(value) => `Дата: ${formatDate(value as string)}`}
                  formatter={(value: number, name: string) => {
                    if (name === 'totalCalls') return [value, 'Звонков'];
                    if (name === 'averageScore') return [value, 'Средний балл'];
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
                <Bar yAxisId="calls" dataKey="totalCalls" fill="#3B82F6" name="totalCalls" />
                <Line 
                  yAxisId="score"
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

          {/* Статистика по менеджерам */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Менеджеры отдела</h3>
            
            {overview.managers && overview.managers.length > 0 ? (
              <div className="space-y-4">
                {overview.managers
                  .sort((a, b) => b.averageScore - a.averageScore)
                  .map((manager, index) => (
                  <div key={manager.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {/* Ранг */}
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 0 ? 'bg-yellow-400 text-yellow-900' :
                          index === 1 ? 'bg-gray-300 text-gray-700' :
                          index === 2 ? 'bg-orange-400 text-orange-900' :
                          'bg-gray-200 text-gray-600'
                        }`}>
                          {index + 1}
                        </div>
                        
                        {/* Имя менеджера */}
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {manager.name}
                          </h4>
                        </div>
                      </div>
                      
                      {/* Статистика */}
                      <div className="flex items-center space-x-6">
                        <div className="text-center">
                          <div className="flex items-center space-x-1">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-500">Звонки</span>
                          </div>
                          <p className="font-semibold text-gray-900">
                            {manager.totalCalls}
                          </p>
                        </div>
                        
                        <div className="text-center">
                          <div className="flex items-center space-x-1">
                            <Star className="h-4 w-4 text-yellow-400 fill-current" />
                            <span className="text-sm text-gray-500">Балл</span>
                          </div>
                          <p className="font-semibold text-gray-900">
                            {manager.averageScore.toFixed(1)}
                          </p>
                        </div>
                        
                        <div className="text-center">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-500">Время</span>
                          </div>
                          <p className="font-semibold text-gray-900">
                            {formatDuration(manager.totalDuration)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                Нет данных по менеджерам за выбранный период
              </p>
            )}
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
