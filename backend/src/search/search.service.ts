import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { AnalyzedAi } from '../entities/beeline/analyzed_ai.entity';
import { AbonentRecord } from '../entities/beeline/abonent.record.entity';

export interface SearchResult {
  id: number;
  abonentName: string;
  abonentPhone: string;
  managerName: string;
  managerPhone: string;
  managerDepartment: string;
  callDate: Date;
  duration: number;
  originalText: string;
  keywords: string[];
  matchedKeywords: string[];
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  keywords: string[];
}

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(AnalyzedAi)
    private readonly analyzedAiRepository: Repository<AnalyzedAi>,
    @InjectRepository(AbonentRecord)
    private readonly recordRepository: Repository<AbonentRecord>,
  ) {}

  async searchByKeywords(
    keywords: string[],
    page: number = 1,
    limit: number = 50,
  ): Promise<SearchResponse> {
    // Создаем условия поиска для каждого ключевого слова
    const searchConditions = keywords.map(keyword => 
      `analyzed_ai.originalText ILIKE '%${keyword.trim()}%'`
    );
    
    // Объединяем условия через AND (все слова должны быть найдены)
    const whereCondition = searchConditions.join(' AND ') + ' AND user_record.abonentId NOT IN (38, 41)';

    // Выполняем поиск с JOIN к user_record по conversationId
    const queryBuilder = this.analyzedAiRepository
      .createQueryBuilder('analyzed_ai')
      .leftJoin('user_record', 'user_record', 'analyzed_ai.conversationId = CONCAT(\'conv_\', user_record.id)')
      .leftJoin('abonent', 'abonent', 'user_record.abonentId = abonent.id')
      .select([
        'analyzed_ai.id',
        'analyzed_ai.conversationId',
        'analyzed_ai.originalText',
        'user_record.id as record_id',
        'user_record.phone',
        'user_record.date',
        'user_record.duration',
        'abonent.firstName',
        'abonent.lastName',
        'abonent.phone as managerPhone',
        'abonent.department'
      ])
      .where(whereCondition)
      .orderBy('user_record.date', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit);

    const rawResults = await queryBuilder.getRawMany();
    
    // Отладка завершена - данные получаются корректно
    
    const totalQuery = this.analyzedAiRepository
      .createQueryBuilder('analyzed_ai')
      .leftJoin('user_record', 'user_record', 'analyzed_ai.conversationId = CONCAT(\'conv_\', user_record.id)')
      .where(whereCondition);
    
    const total = await totalQuery.getCount();

    // Преобразуем результаты в нужный формат
    const results: SearchResult[] = rawResults.map(row => {
      // Находим какие именно ключевые слова найдены в тексте
      const matchedKeywords = keywords.filter(keyword => 
        row.analyzed_ai_originalText?.toLowerCase().includes(keyword.toLowerCase())
      );

      // Данные менеджера получаются корректно

      return {
        id: row.record_id || 0,
        abonentName: 'Не указано', // Убираем поле abonentName из БД
        abonentPhone: row.user_record_phone || 'Не указан',
        managerName: row.abonent_firstName 
          ? `${row.abonent_firstName}${row.abonent_lastName ? ' ' + row.abonent_lastName : ''}`.trim()
          : 'Не указан',
        managerPhone: row.managerphone || 'Не указан',
        managerDepartment: row.abonent_department || 'Не указан',
        callDate: row.user_record_date || new Date(),
        duration: Math.round((row.user_record_duration || 0) / 1000 / 60), // из миллисекунд в минуты
        originalText: row.analyzed_ai_originalText || '',
        keywords,
        matchedKeywords,
      };
    });

    return {
      results,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      keywords,
    };
  }

  async searchAllResults(keywords: string[]): Promise<SearchResult[]> {
    // Для экспорта в CSV - получаем все результаты без пагинации
    const searchConditions = keywords.map(keyword => 
      `analyzed_ai.originalText ILIKE '%${keyword.trim()}%'`
    );
    
    const whereCondition = searchConditions.join(' AND ');

    const queryBuilder = this.analyzedAiRepository
      .createQueryBuilder('analyzed_ai')
      .leftJoin('user_record', 'user_record', 'analyzed_ai.conversationId = CONCAT(\'conv_\', user_record.id)')
      .leftJoin('abonent', 'abonent', 'user_record.abonentId = abonent.id')
      .select([
        'analyzed_ai.id',
        'analyzed_ai.conversationId',
        'analyzed_ai.originalText',
        'user_record.id as record_id',
        'user_record.phone',
        'user_record.date',
        'user_record.duration',
        'abonent.firstName',
        'abonent.lastName',
        'abonent.phone as managerPhone',
        'abonent.department'
      ])
      .where(whereCondition)
      .orderBy('user_record.date', 'DESC');

    const rawResults = await queryBuilder.getRawMany();

    return rawResults.map(row => {
      const matchedKeywords = keywords.filter(keyword => 
        row.analyzed_ai_originalText?.toLowerCase().includes(keyword.toLowerCase())
      );

      return {
        id: row.record_id || 0,
        abonentName: 'Не указано', // Убираем поле abonentName из БД
        abonentPhone: row.user_record_phone || 'Не указан',
        managerName: row.abonent_firstName 
          ? `${row.abonent_firstName}${row.abonent_lastName ? ' ' + row.abonent_lastName : ''}`.trim()
          : 'Не указан',
        managerPhone: row.managerphone || 'Не указан',
        managerDepartment: row.abonent_department || 'Не указан',
        callDate: row.user_record_date || new Date(),
        duration: Math.round((row.user_record_duration || 0) / 1000 / 60), // из миллисекунд в минуты
        originalText: row.analyzed_ai_originalText || '',
        keywords,
        matchedKeywords,
      };
    });
  }
}
