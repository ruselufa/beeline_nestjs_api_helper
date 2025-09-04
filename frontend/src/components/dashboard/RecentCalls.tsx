import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Clock, Star, User, Calendar } from 'lucide-react';
import { CallRecord } from '../../types/dashboard';

interface RecentCallsProps {
  calls?: CallRecord[];
}

export const RecentCalls: React.FC<RecentCallsProps> = ({ calls }) => {
  if (!calls || calls.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Последние звонки
        </h2>
        <p className="text-gray-500">Нет данных для отображения</p>
      </div>
    );
  }

  const formatDuration = (duration: number) => {
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600 bg-green-100';
    if (score >= 6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Последние проанализированные звонки
      </h2>
      
      <div className="space-y-3">
        {calls.slice(0, 10).map((call) => (
          <div key={call.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200">
            <div className="flex items-center space-x-4">
              {/* Иконка звонка */}
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Phone className="h-5 w-5 text-blue-600" />
              </div>
              
              {/* Информация о звонке */}
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <Link 
                      to={`/manager/${call.managerId}`}
                      className="font-medium text-gray-900 hover:text-blue-600 transition-colors duration-200"
                    >
                      {call.managerName}
                    </Link>
                  </div>
                  <span className="text-gray-400">•</span>
                  <span className="text-sm text-gray-600">
                    {call.clientPhone}
                  </span>
                </div>
                
                <div className="flex items-center space-x-4 mt-1">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500">
                      {formatDate(call.date)}
                    </span>
                  </div>
                  <span className="text-gray-400">•</span>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500">
                      {formatDuration(call.duration)}
                    </span>
                  </div>
                  <span className="text-gray-400">•</span>
                  <span className="text-sm text-gray-500">
                    {call.department}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Оценка и анализ */}
            <div className="flex items-center space-x-4">
              {/* Общий балл */}
              <div className="text-center">
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(call.score)}`}>
                  {call.score.toFixed(1)}
                </div>
                <p className="text-xs text-gray-500 mt-1">Общий балл</p>
              </div>
              
              {/* Детальный анализ */}
              <div className="text-right">
                <div className="flex items-center space-x-3">
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-900">
                      {call.analysis.quality.toFixed(1)}
                    </div>
                    <p className="text-xs text-gray-500">Качество</p>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-900">
                      {call.analysis.sales.toFixed(1)}
                    </div>
                    <p className="text-xs text-gray-500">Продажи</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Кнопка "Показать все" */}
      <div className="mt-6 text-center">
        <button className="btn-secondary">
          Показать все звонки
        </button>
      </div>
    </div>
  );
};
