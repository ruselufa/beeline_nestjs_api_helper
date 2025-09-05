import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search as SearchIcon, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { searchService } from '../services/searchService';
import { SearchResponse, SearchResult } from '../types/search';

const Search: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [submittedKeywords, setSubmittedKeywords] = useState<string[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // React Query для поиска
  const { data: searchResults, isLoading, error, refetch } = useQuery<SearchResponse>({
    queryKey: ['search', submittedKeywords, currentPage, pageSize],
    queryFn: () => searchService.searchByKeywords({
      keywords: submittedKeywords,
      page: currentPage,
      limit: pageSize
    }),
    enabled: submittedKeywords.length > 0,
  });

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    
    const keywords = searchQuery
      .split(';')
      .map(k => k.trim())
      .filter(k => k.length > 0);
    
    setSubmittedKeywords(keywords);
    setCurrentPage(1);
    setExpandedRows(new Set());
  };

  const handleExportCsv = async () => {
    if (submittedKeywords.length === 0) return;
    
    try {
      const blob = await searchService.exportToCsv(submittedKeywords);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `search_results_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Ошибка при экспорте:', error);
    }
  };

  const toggleRowExpansion = (id: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const highlightKeywords = (text: string, keywords: string[]): React.ReactNode => {
    if (!text || keywords.length === 0) return text;

    let highlightedText = text;
    keywords.forEach(keyword => {
      const regex = new RegExp(`(${keyword})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
    });

    return <span dangerouslySetInnerHTML={{ __html: highlightedText }} />;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo(0, 0);
  };

  const renderPagination = () => {
    if (!searchResults || searchResults.totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(searchResults.totalPages, startPage + maxVisiblePages - 1);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`px-3 py-1 mx-1 rounded ${
            i === currentPage
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {i}
        </button>
      );
    }

    return (
      <div className="flex justify-center items-center mt-6 space-x-2">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 rounded bg-gray-200 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300"
        >
          ← Предыдущая
        </button>
        {pages}
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === searchResults.totalPages}
          className="px-3 py-1 rounded bg-gray-200 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300"
        >
          Следующая →
        </button>
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Поиск по словам</h1>

        {/* Форма поиска */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col space-y-4">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Введите ключевые слова через точку с запятой
              </label>
              <div className="flex space-x-4">
                <input
                  id="search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Например: проблема; ошибка; не работает"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleSearch}
                  disabled={!searchQuery.trim()}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <SearchIcon className="w-4 h-4" />
                  <span>Найти</span>
                </button>
              </div>
            </div>

            {/* Настройки пагинации */}
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">
                Показывать по:
              </label>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-3 py-1 border border-gray-300 rounded"
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
              <span className="text-sm text-gray-500">записей на странице</span>
            </div>
          </div>
        </div>

        {/* Результаты поиска */}
        {isLoading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-600">Поиск...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            Ошибка при поиске. Попробуйте еще раз.
          </div>
        )}

        {searchResults && (
          <div>
            {/* Заголовок результатов */}
            <div className="bg-white rounded-lg shadow-md p-4 mb-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Результаты поиска
                  </h2>
                  <p className="text-gray-600">
                    Найдено {searchResults.total} записей по запросу: 
                    <span className="font-medium"> "{submittedKeywords.join('; ')}"</span>
                  </p>
                  <p className="text-sm text-gray-500">
                    Страница {currentPage} из {searchResults.totalPages}
                  </p>
                </div>
                <button
                  onClick={handleExportCsv}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Выгрузить в CSV</span>
                </button>
              </div>
            </div>

            {/* Таблица результатов */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Телефон абонента
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Менеджер
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Дата звонка
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Длительность
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Найденные слова
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Действия
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {searchResults.results.map((result) => (
                      <React.Fragment key={result.id}>
                        <tr className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {result.abonentPhone}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {result.managerName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {result.managerPhone}
                              </div>
                              <div className="text-xs text-gray-400">
                                {result.managerDepartment}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(result.callDate)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {result.duration} мин
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-wrap gap-1">
                              {result.matchedKeywords.map((keyword, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"
                                >
                                  {keyword}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <button
                              onClick={() => toggleRowExpansion(result.id)}
                              className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                            >
                              {expandedRows.has(result.id) ? (
                                <>
                                  <ChevronUp className="w-4 h-4" />
                                  <span>Скрыть</span>
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-4 h-4" />
                                  <span>Показать еще</span>
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                        {expandedRows.has(result.id) && (
                          <tr>
                            <td colSpan={6} className="px-4 py-4 bg-gray-50">
                              <div className="border rounded-lg p-4 bg-white">
                                <h4 className="font-medium text-gray-900 mb-2">
                                  Текст разговора:
                                </h4>
                                <div className="text-sm text-gray-700 leading-relaxed max-h-96 overflow-y-auto">
                                  {highlightKeywords(result.originalText, result.matchedKeywords)}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Пагинация */}
            {renderPagination()}
          </div>
        )}

        {searchResults && searchResults.results.length === 0 && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
            По вашему запросу ничего не найдено. Попробуйте изменить ключевые слова.
          </div>
        )}
      </div>
    </div>
  );
};

export default Search;
