import React from 'react';
import { Link } from 'react-router-dom';
import { Star, Phone, Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ManagerStat } from '../../types/dashboard';

interface ManagerStatsProps {
  stats?: ManagerStat[];
}

export const ManagerStats: React.FC<ManagerStatsProps> = ({ stats }) => {
  if (!stats || stats.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Топ менеджеров
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

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Топ менеджеров
        </h2>
        <Link 
          to="/managers" 
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          Посмотреть всех →
        </Link>
      </div>
      
      <div className="space-y-4">
        {stats.slice(0, 5).map((manager, index) => (
          <div key={manager.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
            <div className="flex items-center space-x-4">
              {/* Ранг */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                index === 0 ? 'bg-yellow-400 text-yellow-900' :
                index === 1 ? 'bg-gray-300 text-gray-700' :
                index === 2 ? 'bg-orange-400 text-orange-900' :
                'bg-gray-200 text-gray-600'
              }`}>
                {index + 1}
              </div>
              
              {/* Аватар и имя */}
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold text-sm">
                    {manager.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <Link 
                    to={`/manager/${manager.id}`}
                    className="font-medium text-gray-900 hover:text-blue-600 transition-colors duration-200"
                  >
                    {manager.name}
                  </Link>
                  <p className="text-sm text-gray-500">{manager.department}</p>
                </div>
              </div>
            </div>
            
            {/* Статистика */}
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <div className="flex items-center space-x-1">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-500">Звонки</span>
                </div>
                <p className="font-semibold text-gray-900">{manager.totalCalls}</p>
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
                  {Math.round(manager.totalDuration / 60000)} мин
                </p>
              </div>
              
              {/* Тренд */}
              <div className="flex items-center space-x-1">
                {getTrendIcon(manager.trend)}
                <span className={`text-sm font-medium ${getTrendColor(manager.trend)}`}>
                  {manager.trend === 'up' ? '+' : manager.trend === 'down' ? '-' : '0'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
