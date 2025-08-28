import React from 'react';
import { Phone, Star, Clock, Users, TrendingUp, TrendingDown } from 'lucide-react';

interface SummaryData {
  totalCalls: number;
  averageScore: number;
  totalDuration: number;
  activeManagers: number;
}

interface SummaryCardsProps {
  summary?: SummaryData;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ summary }) => {
  if (!summary) return null;

  const cards = [
    {
      title: 'Всего звонков',
      value: summary.totalCalls.toLocaleString('ru-RU'),
      icon: Phone,
      color: 'bg-blue-500',
      change: '+12%',
      trend: 'up' as const,
    },
    {
      title: 'Средний балл',
      value: summary.averageScore.toFixed(1),
      icon: Star,
      color: 'bg-yellow-500',
      change: '+0.3',
      trend: 'up' as const,
    },
    {
      title: 'Общее время',
      value: `${Math.round(summary.totalDuration / 60000)} мин`,
      icon: Clock,
      color: 'bg-green-500',
      change: '+5%',
      trend: 'up' as const,
    },
    {
      title: 'Активных менеджеров',
      value: summary.activeManagers,
      icon: Users,
      color: 'bg-purple-500',
      change: '+2',
      trend: 'up' as const,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        
        return (
          <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${card.color}`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center">
              {card.trend === 'up' ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span className={`ml-2 text-sm font-medium ${
                card.trend === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                {card.change}
              </span>
              <span className="ml-2 text-sm text-gray-500">с прошлой недели</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
