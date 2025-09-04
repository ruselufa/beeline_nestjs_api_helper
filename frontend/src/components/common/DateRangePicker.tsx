import React, { useState } from 'react';
import { Calendar, Play } from 'lucide-react';
import { DateRange } from '../../types/dashboard';

interface DateRangePickerProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  onApply: () => void;
  loading?: boolean;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  dateRange,
  onDateRangeChange,
  onApply,
  loading = false
}) => {
  const [localRange, setLocalRange] = useState<DateRange>(dateRange);

  const handleStartChange = (value: string) => {
    const newRange = { ...localRange, start: value };
    setLocalRange(newRange);
    onDateRangeChange(newRange);
  };

  const handleEndChange = (value: string) => {
    const newRange = { ...localRange, end: value };
    setLocalRange(newRange);
    onDateRangeChange(newRange);
  };

  const handleQuickSelect = (days: number) => {
    const end = new Date();
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
    
    const newRange = {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
    
    setLocalRange(newRange);
    onDateRangeChange(newRange);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Период:</span>
        </div>
        
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={localRange.start}
            onChange={(e) => handleStartChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <span className="text-gray-500">—</span>
          <input
            type="date"
            value={localRange.end}
            onChange={(e) => handleEndChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleQuickSelect(7)}
            className="px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            7 дней
          </button>
          <button
            onClick={() => handleQuickSelect(30)}
            className="px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            30 дней
          </button>
          <button
            onClick={() => handleQuickSelect(90)}
            className="px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            3 месяца
          </button>
        </div>

        <button
          onClick={onApply}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md transition-colors text-sm font-medium"
        >
          <Play className="h-4 w-4" />
          {loading ? 'Загрузка...' : 'Применить'}
        </button>
      </div>
    </div>
  );
};
