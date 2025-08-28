import React from 'react';
import { useParams } from 'react-router-dom';

export const DepartmentDetail: React.FC = () => {
  const { name } = useParams();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">
        Отдел: {decodeURIComponent(name || '')}
      </h1>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <p className="text-gray-600">Страница в разработке...</p>
      </div>
    </div>
  );
};
