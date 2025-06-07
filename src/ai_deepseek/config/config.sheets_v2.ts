import { TableConfig } from '../types/analysis.types';

export const SHEETS_CONFIG_V2: TableConfig = {
  blocks: [
    {
      blockName: "Основная информация о звонке",
      headers: [
        { id: "record_id", label: "ID записи", type: "text" },
        { id: "call_date", label: "Дата и время звонка", type: "text" },
        { id: "department", label: "Отдел", type: "text" },
        { id: "abonent_name", label: "Имя абонента", type: "text" },
        { id: "abonent_phone", label: "Телефон абонента", type: "text" },
        { id: "client_email", label: "Email клиента", type: "text" },
        { id: "client_name", label: "Имя клиента", type: "text" },
        { id: "client_gc_id_link", label: "Ссылка на GC ID", type: "text" },
        { id: "orders", label: "Заказы", type: "text" },
        { id: "null_orders", label: "Пустые заказы", type: "text" },
        { id: "duration_seconds", label: "Длительность (сек)", type: "numeric" },
        { id: "manager_name", label: "Имя менеджера", type: "text" },
        { id: "client_occupation", label: "Род деятельности клиента", type: "text" },
        { id: "call_purpose", label: "Цель звонка", type: "text" },
        { id: "training_name", label: "Название курса/тренинга", type: "text" },
        { id: "payment_agreements", label: "Договоренности по оплате", type: "text" },
        { id: "additional_info", label: "Дополнительная информация", type: "text" }
      ]
    },
    {
      blockName: "Оценка этапов звонка",
      headers: [
        // Приветствие
        { id: "greeting_score", label: "Оценка приветствия", type: "numeric" },
        { id: "greeting_good", label: "Что было хорошо в приветствии", type: "text" },
        { id: "greeting_improve", label: "Что нужно улучшить в приветствии", type: "text" },
        { id: "greeting_recommendation", label: "Рекомендации по приветствию", type: "text" },
        
        // Программирование
        { id: "programming_score", label: "Оценка программирования", type: "numeric" },
        { id: "programming_good", label: "Что было хорошо в программировании", type: "text" },
        { id: "programming_improve", label: "Что нужно улучшить в программировании", type: "text" },
        { id: "programming_recommendation", label: "Рекомендации по программированию", type: "text" },
        
        // Выявление потребностей
        { id: "needs_score", label: "Оценка выявления потребностей", type: "numeric" },
        { id: "needs_good", label: "Что было хорошо в выявлении потребностей", type: "text" },
        { id: "needs_improve", label: "Что нужно улучшить в выявлении потребностей", type: "text" },
        { id: "needs_recommendation", label: "Рекомендации по выявлению потребностей", type: "text" },
        
        // Резюме
        { id: "summary_score", label: "Оценка резюме", type: "numeric" },
        { id: "summary_good", label: "Что было хорошо в резюме", type: "text" },
        { id: "summary_improve", label: "Что нужно улучшить в резюме", type: "text" },
        { id: "summary_recommendation", label: "Рекомендации по резюме", type: "text" },
        
        // Презентация
        { id: "presentation_score", label: "Оценка презентации", type: "numeric" },
        { id: "presentation_good", label: "Что было хорошо в презентации", type: "text" },
        { id: "presentation_improve", label: "Что нужно улучшить в презентации", type: "text" },
        { id: "presentation_recommendation", label: "Рекомендации по презентации", type: "text" },
        
        // Работа с возражениями
        { id: "objections_score", label: "Оценка работы с возражениями", type: "numeric" },
        { id: "objections_good", label: "Что было хорошо в работе с возражениями", type: "text" },
        { id: "objections_improve", label: "Что нужно улучшить в работе с возражениями", type: "text" },
        { id: "objections_recommendation", label: "Рекомендации по работе с возражениями", type: "text" },
        
        // Закрытие
        { id: "closure_score", label: "Оценка закрытия", type: "numeric" },
        { id: "closure_good", label: "Что было хорошо в закрытии", type: "text" },
        { id: "closure_improve", label: "Что нужно улучшить в закрытии", type: "text" },
        { id: "closure_recommendation", label: "Рекомендации по закрытию", type: "text" }
      ]
    },
    {
      blockName: "Общая оценка",
      headers: [
        { id: "total_score", label: "Общая оценка", type: "numeric" },
        { id: "overall_good", label: "Сильные стороны звонка", type: "text" },
        { id: "overall_improve", label: "Моменты для улучшения", type: "text" },
        { id: "overall_recommendations", label: "Общие рекомендации", type: "text" }
      ]
    },
    {
      blockName: "Шаблон рекомендаций",
      headers: [
        { id: "recommendation_greeting", label: "Позитивное начало", type: "text" },
        { id: "recommendation_points", label: "Пункты для улучшения", type: "text" },
        { id: "recommendation_closing", label: "Мотивирующее завершение", type: "text" }
      ]
    }
  ]
}; 