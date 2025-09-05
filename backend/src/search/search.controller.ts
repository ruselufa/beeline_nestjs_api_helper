import { Controller, Post, Body, Query, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { SearchService, SearchResponse } from './search.service';

export class SearchDto {
  keywords: string[] | string;
  page?: number;
  limit?: number;
}

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Post('keywords')
  async searchByKeywords(@Body() searchDto: SearchDto): Promise<SearchResponse> {
    const { keywords, page = 1, limit = 50 } = searchDto;
    
    // Разбиваем строку по точке с запятой, если передана строка
    const keywordsArray = Array.isArray(keywords) 
      ? keywords 
      : typeof keywords === 'string' 
        ? keywords.split(';').map(k => k.trim()).filter(k => k.length > 0)
        : [];

    return this.searchService.searchByKeywords(keywordsArray, page, limit);
  }

  @Post('export-csv')
  async exportToCsv(
    @Body() body: { keywords: string[] | string },
    @Res() res: Response,
  ): Promise<void> {
    const { keywords } = body;
    
    // Разбиваем строку по точке с запятой, если передана строка
    const keywordsArray = Array.isArray(keywords) 
      ? keywords 
      : typeof keywords === 'string' 
        ? keywords.split(';').map(k => k.trim()).filter(k => k.length > 0)
        : [];

    const results = await this.searchService.searchAllResults(keywordsArray);

    // Формируем CSV
    const csvHeader = [
      'ID',
      'Телефон абонента', 
      'Имя менеджера',
      'Телефон менеджера',
      'Отдел менеджера',
      'Дата звонка',
      'Длительность (мин)',
      'Ключевые слова поиска',
      'Найденные слова',
      'Текст разговора'
    ].join(',');

    const csvRows = results.map(row => [
      row.id,
      `"${row.abonentPhone}"`,
      `"${row.managerName}"`,
      `"${row.managerPhone}"`,
      `"${row.managerDepartment}"`,
      `"${row.callDate.toISOString().split('T')[0]}"`,
      row.duration,
      `"${row.keywords.join('; ')}"`,
      `"${row.matchedKeywords.join('; ')}"`,
      `"${row.originalText.replace(/"/g, '""')}"` // Экранируем кавычки
    ].join(','));

    const csv = [csvHeader, ...csvRows].join('\n');

    // Устанавливаем заголовки для скачивания файла
    const filename = `search_results_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Добавляем BOM для корректного отображения русских символов в Excel
    res.write('\uFEFF');
    res.end(csv);
  }
}
