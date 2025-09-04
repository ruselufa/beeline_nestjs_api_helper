import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Phone, Clock, Star, Calendar, User, FileText, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react';
import { dashboardService } from '../services/dashboardService';
import { ManagerCallRecord } from '../types/dashboard';

export const ManagerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const managerId = parseInt(id || '0', 10);
  const [limit, setLimit] = useState(50);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const { data: calls, isLoading } = useQuery({
    queryKey: ['managerCalls', managerId, limit],
    queryFn: () => dashboardService.getManagerCalls(managerId, limit),
    enabled: !!managerId
  });

  const formatDuration = (milliseconds: number) => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} МБ`;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('ru-RU');
  };

  const getDirectionLabel = (direction: string) => {
    return direction === 'OUTBOUND' ? 'Исходящий' : 'Входящий';
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600 bg-green-100';
    if (score >= 6) return 'text-yellow-600 bg-yellow-100';
    if (score >= 4) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const toggleRowExpansion = (callId: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(callId)) {
      newExpanded.delete(callId);
    } else {
      newExpanded.add(callId);
    }
    setExpandedRows(newExpanded);
  };

  // Словарь переводов для заголовков
  const fieldTranslations: Record<string, string> = {
    // Основная информация
    'client_name': 'Имя клиента',
    'client_occupation': 'Профессия клиента', 
    'call_purpose': 'Цель звонка',
    'training_name': 'Название обучения',
    'payment_agreements': 'Условия оплаты',
    'additional_info': 'Дополнительная информация',
    'manager_name': 'Имя менеджера',
    
    // Оценки (убираем _score и переводим)
    'greeting': 'Приветствие',
    'programming': 'Программирование',
    'needs': 'Выявление потребностей',
    'summary': 'Резюмирование',
    'presentation': 'Презентация',
    'objections': 'Работа с возражениями',
    'closure': 'Закрытие',
    'total': 'Общий балл',
    
    // Подкатегории Good/Improve/Recommendation
    'good': 'Хорошо',
    'improve': 'Улучшить', 
    'recommendation': 'Рекомендация'
  };

  const translateFieldName = (fieldId: string): string => {
    // Убираем _score, _good, _improve, _recommendation
    let cleanId = fieldId.replace(/_score$|_good$|_improve$|_recommendation$/, '');
    
    // Ищем перевод
    return fieldTranslations[cleanId] || fieldTranslations[fieldId] || 
           cleanId.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
  };

  const cleanValue = (value: any): string => {
    if (typeof value === 'string') {
      // Убираем квадратные скобки и кавычки в начале и конце
      return value.replace(/^[\["']+|[\]"']+$/g, '').trim();
    }
    if (Array.isArray(value)) {
      return value.map(v => typeof v === 'string' ? v.replace(/^[\["']+|[\]"']+$/g, '').trim() : v).join(', ');
    }
    return String(value);
  };

  const extractAnalysisData = (analysis: any) => {
    if (!analysis || !analysis.table || !analysis.table.blocks) {
      return { basic: [], scores: [], recommendations: [], goodPoints: [], improvements: [] };
    }

    const blocks = analysis.table.blocks;
    const basic: Array<{ label: string; value: any }> = [];
    const scores: Array<{ label: string; value: number }> = [];
    const recommendations: string[] = [];
    const goodPoints: string[] = [];
    const improvements: string[] = [];

    // Извлекаем данные из блоков
    blocks.forEach((block: any, blockIndex: number) => {
      if (block.headers) {
        block.headers.forEach((header: any) => {
          if (header.id && header.value !== undefined) {
            // Определяем тип данных по ID
            if (header.id.includes('_score')) {
              scores.push({
                label: translateFieldName(header.id),
                value: typeof header.value === 'number' ? header.value : parseFloat(header.value) || 0
              });
            } else if (header.id === 'recommendations') {
              if (Array.isArray(header.value)) {
                recommendations.push(...header.value.map((rec: any) => cleanValue(rec)));
              } else {
                recommendations.push(cleanValue(header.value));
              }
            } else if (header.id.includes('_recommendation')) {
              recommendations.push(cleanValue(header.value));
            } else if (header.id.includes('_good')) {
              goodPoints.push(cleanValue(header.value));
            } else if (header.id.includes('_improve')) {
              improvements.push(cleanValue(header.value));
            } else if (!header.id.includes('_score') && !header.id.includes('total')) {
              basic.push({
                label: translateFieldName(header.id),
                value: cleanValue(header.value)
              });
            }
          }
        });
      }
    });

    return { basic, scores, recommendations, goodPoints, improvements };
  };

  if (!managerId) {
    return (
      <div className="p-6">
        <p className="text-gray-600">Менеджер не найден</p>
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
          {calls && calls.length > 0 ? calls[0].managerName : `Менеджер #${managerId}`}
        </h1>
        <p className="text-gray-600 mt-1">
          {calls && calls.length > 0 ? calls[0].department : 'Детальная статистика менеджера'}
        </p>
      </div>

      {/* Контролы */}
      <div className="flex items-center gap-4">
        <select
          value={limit}
          onChange={(e) => setLimit(parseInt(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value={25}>25 звонков</option>
          <option value={50}>50 звонков</option>
          <option value={100}>100 звонков</option>
          <option value={200}>200 звонков</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : calls && calls.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Проанализированные звонки ({calls.length})
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Звонок
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Клиент
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Дата/Время
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Длительность
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Балл
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Детали
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {calls.map((call) => {
                  const isExpanded = expandedRows.has(call.id);
                  const analysisData = extractAnalysisData(call.deepseekAnalysis);
                  
                  return (
                    <React.Fragment key={call.id}>
                      {/* Основная строка */}
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">
                              {getDirectionLabel(call.direction)}
                            </div>
                            <div className="text-gray-500 font-mono text-xs">
                              {call.callId}
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">
                              {call.phone}
                            </div>
                            {call.comment && (
                              <div className="text-gray-500 text-xs truncate max-w-32">
                                {call.comment}
                              </div>
                            )}
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(call.createdAt)}
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">
                              {formatDuration(call.duration)}
                            </div>
                            <div className="text-gray-500 text-xs">
                              {formatFileSize(call.fileSize)}
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreColor(call.score)}`}>
                            {call.score.toFixed(1)}
                          </span>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => toggleRowExpansion(call.id)}
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronDown className="h-4 w-4" />
                                Скрыть
                              </>
                            ) : (
                              <>
                                <ChevronRight className="h-4 w-4" />
                                Показать
                              </>
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* Развернутая строка с деталями */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} className="px-6 py-4 bg-gray-50">
                            <div className="space-y-6">
                              {/* Технические данные */}
                              <div>
                                <h4 className="font-medium text-gray-900 mb-3">Технические данные</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-500">Beeline ID:</span>
                                    <div className="font-mono text-gray-900">{call.beelineId}</div>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">External ID:</span>
                                    <div className="font-mono text-gray-900">{call.beelineExternalId}</div>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Дата звонка:</span>
                                    <div className="text-gray-900">{formatDate(call.date)}</div>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Направление:</span>
                                    <div className="text-gray-900">{getDirectionLabel(call.direction)}</div>
                                  </div>
                                </div>
                              </div>

                              {/* Анализ DeepSeek */}
                              {analysisData.basic.length > 0 && (
                                <div>
                                  <h4 className="font-medium text-gray-900 mb-3">Основная информация</h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    {analysisData.basic.map((item, index) => (
                                      <div key={index}>
                                        <span className="text-gray-500 capitalize">{item.label}:</span>
                                        <div className="text-gray-900">
                                          {typeof item.value === 'object' 
                                            ? JSON.stringify(item.value) 
                                            : String(item.value)
                                          }
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Оценки */}
                              {analysisData.scores.length > 0 && (
                                <div>
                                  <h4 className="font-medium text-gray-900 mb-3">Детальные оценки</h4>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {analysisData.scores.map((score, index) => (
                                      <div key={index} className="text-center p-3 bg-white rounded-lg border">
                                        <div className="text-lg font-semibold text-gray-900">
                                          {score.value.toFixed(1)}
                                        </div>
                                        <div className="text-xs text-gray-500 capitalize">
                                          {score.label}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Хорошо */}
                              {analysisData.goodPoints && analysisData.goodPoints.length > 0 && (
                                <div>
                                  <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                                    <span className="text-green-600">✓</span>
                                    Что хорошо
                                  </h4>
                                  <ul className="space-y-2 text-sm">
                                    {analysisData.goodPoints.map((point, index) => (
                                      <li key={index} className="flex items-start gap-2">
                                        <span className="text-green-600 mt-1">•</span>
                                        <span className="text-gray-700">{point}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Нужно улучшить */}
                              {analysisData.improvements && analysisData.improvements.length > 0 && (
                                <div>
                                  <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                                    <span className="text-orange-600">⚠</span>
                                    Нужно улучшить
                                  </h4>
                                  <ul className="space-y-2 text-sm">
                                    {analysisData.improvements.map((improvement, index) => (
                                      <li key={index} className="flex items-start gap-2">
                                        <span className="text-orange-600 mt-1">•</span>
                                        <span className="text-gray-700">{improvement}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Рекомендации */}
                              {analysisData.recommendations.length > 0 && (
                                <div>
                                  <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                                    <span className="text-blue-600">💡</span>
                                    Рекомендации
                                  </h4>
                                  <ul className="space-y-2 text-sm">
                                    {analysisData.recommendations.map((rec, index) => (
                                      <li key={index} className="flex items-start gap-2">
                                        <span className="text-blue-600 mt-1">•</span>
                                        <span className="text-gray-700">{rec}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Полный JSON (свернутый) */}
                              <details className="text-sm">
                                <summary className="cursor-pointer font-medium text-gray-900 hover:text-blue-600">
                                  Полный JSON анализа
                                </summary>
                                <pre className="mt-3 p-4 bg-white rounded border text-xs overflow-auto max-h-64 whitespace-pre-wrap">
                                  {JSON.stringify(call.deepseekAnalysis, null, 2)}
                                </pre>
                              </details>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <Phone className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>У этого менеджера нет проанализированных звонков</p>
        </div>
      )}
    </div>
  );
};