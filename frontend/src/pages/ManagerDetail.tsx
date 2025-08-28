import React from 'react';
import { useParams } from 'react-router-dom';

export const ManagerDetail: React.FC = () => {
  const { id } = useParams();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">
        Детали менеджера #{id}
      </h1>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <p className="text-gray-600">Страница в разработке...</p>
      </div>
    </div>
  );
};
