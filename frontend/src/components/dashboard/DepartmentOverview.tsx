import React from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Users, Phone, Star, TrendingUp, TrendingDown, Minus, Clock } from 'lucide-react';
import { DepartmentStat } from '../../types/dashboard';

interface DepartmentOverviewProps {
  data?: DepartmentStat[];
}

export const DepartmentOverview: React.FC<DepartmentOverviewProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Обзор по отделам
        </h2>
        <p className="text-gray-500">Нет данных для отображения</p>
      </div>
    );
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  // Сортируем отделы по среднему баллу
  const sortedDepartments = [...data].sort((a, b) => b.averageScore - a.averageScore);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Обзор по отделам
        </h2>
        <Link 
          to="/departments" 
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          Посмотреть все →
        </Link>
      </div>
      
      <div className="space-y-4">
        {sortedDepartments.slice(0, 6).map((department, index) => (
          <div key={department.name} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
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
                
                {/* Название отдела */}
                <div>
                  <Link 
                    to={`/department/${encodeURIComponent(department.name)}`}
                    className="font-medium text-gray-900 hover:text-blue-600 transition-colors duration-200"
                  >
                    {department.name}
                  </Link>
                  <p className="text-sm text-gray-500">
                    {department.managerCount} менеджеров
                  </p>
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
                    {department.totalCalls.toLocaleString('ru-RU')}
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="text-sm text-gray-500">Балл</span>
                  </div>
                  <p className="font-semibold text-gray-900">
                    {department.averageScore.toFixed(1)}
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500">Время</span>
                  </div>
                  <p className="font-semibold text-gray-900">
                    {Math.round(department.totalDuration / 60000)} мин
                  </p>
                </div>
                
                {/* Тренд */}
                <div className="flex items-center space-x-1">
                  {getTrendIcon(department.trend)}
                  <span className={`text-sm font-medium ${getTrendColor(department.trend)}`}>
                    {department.trend === 'up' ? '+' : department.trend === 'down' ? '-' : '0'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Лучший менеджер */}
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-500">Лучший менеджер:</span>
                <span className="text-sm font-medium text-gray-900">
                  {department.topManager}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
