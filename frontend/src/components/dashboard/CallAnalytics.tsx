import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CallData } from '../../types/dashboard';

interface CallAnalyticsProps {
  data?: CallData[];
}

export const CallAnalytics: React.FC<CallAnalyticsProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Динамика звонков
        </h2>
        <p className="text-gray-500">Нет данных для отображения</p>
      </div>
    );
  }

  // Форматируем данные для графика
  const chartData = data.map(item => ({
    ...item,
    date: new Date(item.date).toLocaleDateString('ru-RU', { 
      month: 'short', 
      day: 'numeric' 
    }),
    avgScore: item.averageScore,
    totalCalls: item.totalCalls,
    duration: Math.round(item.totalDuration / 60000), // Переводим в минуты
  }));

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Динамика звонков
      </h2>
      
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis 
            dataKey="date" 
            stroke="#6b7280"
            fontSize={12}
          />
          <YAxis 
            yAxisId="left" 
            stroke="#6b7280"
            fontSize={12}
            label={{ 
              value: 'Количество звонков', 
              angle: -90, 
              position: 'insideLeft',
              fontSize: 12,
              fill: '#6b7280'
            }}
          />
          <YAxis 
            yAxisId="right" 
            orientation="right" 
            stroke="#6b7280"
            fontSize={12}
            label={{ 
              value: 'Средний балл', 
              angle: 90, 
              position: 'insideRight',
              fontSize: 12,
              fill: '#6b7280'
            }}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
            labelStyle={{ fontWeight: 'bold', color: '#374151' }}
          />
          <Legend />
          
          {/* Линия количества звонков */}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="totalCalls"
            stroke="#3B82F6"
            strokeWidth={3}
            dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
            name="Количество звонков"
          />
          
          {/* Линия среднего балла */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="avgScore"
            stroke="#10B981"
            strokeWidth={3}
            dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2 }}
            name="Средний балл"
          />
        </LineChart>
      </ResponsiveContainer>
      
      {/* Дополнительная статистика */}
      <div className="mt-6 grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600">
            {data.reduce((sum, item) => sum + item.totalCalls, 0).toLocaleString('ru-RU')}
          </p>
          <p className="text-sm text-gray-500">Всего звонков</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">
            {(data.reduce((sum, item) => sum + item.averageScore, 0) / data.length).toFixed(1)}
          </p>
          <p className="text-sm text-gray-500">Средний балл</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-purple-600">
            {Math.round(data.reduce((sum, item) => sum + item.totalDuration, 0) / 60000).toLocaleString('ru-RU')}
          </p>
          <p className="text-sm text-gray-500">Общее время (мин)</p>
        </div>
      </div>
    </div>
  );
};
