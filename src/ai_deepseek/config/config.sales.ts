export interface TableHeader {
  id: string;
  label: string;
  type?: 'numeric';
}

export interface TableBlock {
  blockName: string;
  headers: TableHeader[];
}

export interface TableConfig {
  blocks: TableBlock[];
}

export const CONFIG: { table: TableConfig } = {
  table: {
    blocks: [
      {
        blockName: "Продажи и резюме разговора",
        headers: [
          {
            id: "sale_probability",
            label: "Вероятность продажи %",
            type: "numeric"
          },
          { id: "rating_explanation_1", label: "Объяснение оценки" },
          { id: "conversation_result", label: "Итог разговора" },
          { id: "detailed_summary", label: "Подробное резюме разговора" }
        ]
      },
      {
        blockName: "Настрой клиента, потребности, возражения и факты",
        headers: [
          { id: "attitude", label: "Настрой %", type: "numeric" },
          { id: "rating_explanation_2", label: "Объяснение оценки" },
          { id: "facts", label: "Факты" },
          { id: "needs", label: "Потребности" },
          { id: "objections", label: "Возражения" }
        ]
      },
      {
        blockName: "Работа менеджера и советы",
        headers: [
          { id: "politeness", label: "Вежливость %", type: "numeric" },
          { id: "rating_explanation_3", label: "Объяснение оценки" },
          { id: "presentation", label: "Презентация %", type: "numeric" },
          { id: "rating_explanation_4", label: "Объяснение оценки" },
          {
            id: "objection_handling",
            label: "Отработка возражений %",
            type: "numeric"
          },
          { id: "rating_explanation_5", label: "Объяснение оценки" },
          { id: "mop_advice", label: "Советы МОПу" }
        ]
      },
      {
        blockName: "Дополнительные аспекты звонка",
        headers: [
          { id: "greeting", label: "Приветствие", type: "numeric" },
          { id: "call_purpose", label: "Цель звонка", type: "numeric" },
          {
            id: "full_dialog_structure",
            label: "Программирование на весь формат диалога",
            type: "numeric"
          },
          {
            id: "needs_identification",
            label: "Выявление потребностей",
            type: "numeric"
          },
          {
            id: "client_summary",
            label: "Резюме данных от клиента",
            type: "numeric"
          },
          {
            id: "product_presentation",
            label: "Презентация продукта",
            type: "numeric"
          },
          {
            id: "format_presentation",
            label: "Презентация формата",
            type: "numeric"
          },
          {
            id: "price_presentation",
            label: "Презентация цены. Запаковка цены от большего к меньшему",
            type: "numeric"
          },
          {
            id: "feedback_removal",
            label: "Снятие обратной связи",
            type: "numeric"
          },
          {
            id: "objection_agreement",
            label: "Присоединение к возражению",
            type: "numeric"
          },
          {
            id: "true_objection_reveal",
            label: "Вскрытие истинного возражения",
            type: "numeric"
          },
          {
            id: "objection_processing",
            label: "Отработка возражений",
            type: "numeric"
          },
          {
            id: "deal_closure",
            label: "Завершение сделки",
            type: "numeric"
          },
          {
            id: "active_listening",
            label: "Активное слушание клиента",
            type: "numeric"
          },
          {
            id: "next_step",
            label: "Следующий шаг",
            type: "numeric"
          },
          {
            id: "manager_active_position",
            label: "Активная позиция менеджера",
            type: "numeric"
          }
        ]
      }
    ]
  }
}; 