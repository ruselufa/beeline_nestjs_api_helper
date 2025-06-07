import { AnalysisConfig, TableConfig } from '../types/analysis.types';

export interface CallSummary {
    client_name: string;
    client_occupation: string;
    call_purpose: string;
    training_name: string;
    payment_agreements: string;
    additional_info: string;
}

export interface CallStageAssessment {
    score: number;
    what_was_good: string[];
    what_to_improve: string[];
    recommendation: string;
}

export interface CallStages {
    greeting: CallStageAssessment;
    programming: CallStageAssessment;
    needs_identification: CallStageAssessment;
    client_summary: CallStageAssessment;
    presentation: CallStageAssessment;
    objection_handling: CallStageAssessment;
    deal_closure: CallStageAssessment;
}

export interface OverallAssessment {
    manager_name: string;
    total_score: number;
    what_was_good: string[];
    what_to_improve: string[];
    recommendations: string[];
}

export interface RecommendationTemplate {
    greeting: string;
    points: string[];
    closing: string;
}

export interface CallAnalysis {
    call_summary: CallSummary;
    call_stages: CallStages;
    overall_assessment: OverallAssessment;
    recommendation_template: RecommendationTemplate;
}

export interface TableHeader {
    id: string;
    label: string;
    type?: 'numeric' | 'text' | 'array';
    description?: string;
}

export interface TableBlock {
    blockName: string;
    headers: TableHeader[];
}

export const CONFIG_V2: AnalysisConfig = {
    table: {
        blocks: [
            {
                blockName: "Основная информация о звонке",
                headers: [
                    { id: "client_name", label: "Имя клиента", type: "text" },
                    { id: "client_occupation", label: "Род деятельности", type: "text" },
                    { id: "call_purpose", label: "Цель звонка", type: "text" },
                    { id: "training_name", label: "Название обучения", type: "text" },
                    { id: "payment_agreements", label: "Договоренности по оплате", type: "text" },
                    { id: "additional_info", label: "Дополнительная информация", type: "text" }
                ]
            },
            {
                blockName: "Оценка этапов звонка",
                headers: [
                    { id: "greeting_score", label: "Приветствие", type: "numeric" },
                    { id: "greeting_good", label: "Что хорошо в приветствии", type: "array" },
                    { id: "greeting_improve", label: "Что улучшить в приветствии", type: "array" },
                    { id: "greeting_recommendation", label: "Рекомендация по приветствию", type: "text" },
                    
                    { id: "programming_score", label: "Программирование", type: "numeric" },
                    { id: "programming_good", label: "Что хорошо в программировании", type: "array" },
                    { id: "programming_improve", label: "Что улучшить в программировании", type: "array" },
                    { id: "programming_recommendation", label: "Рекомендация по программированию", type: "text" },
                    
                    { id: "needs_score", label: "Выявление потребностей", type: "numeric" },
                    { id: "needs_good", label: "Что хорошо в выявлении потребностей", type: "array" },
                    { id: "needs_improve", label: "Что улучшить в выявлении потребностей", type: "array" },
                    { id: "needs_recommendation", label: "Рекомендация по выявлению потребностей", type: "text" },
                    
                    { id: "summary_score", label: "Резюмирование", type: "numeric" },
                    { id: "summary_good", label: "Что хорошо в резюмировании", type: "array" },
                    { id: "summary_improve", label: "Что улучшить в резюмировании", type: "array" },
                    { id: "summary_recommendation", label: "Рекомендация по резюмированию", type: "text" },
                    
                    { id: "presentation_score", label: "Презентация", type: "numeric" },
                    { id: "presentation_good", label: "Что хорошо в презентации", type: "array" },
                    { id: "presentation_improve", label: "Что улучшить в презентации", type: "array" },
                    { id: "presentation_recommendation", label: "Рекомендация по презентации", type: "text" },
                    
                    { id: "objections_score", label: "Отработка возражений", type: "numeric" },
                    { id: "objections_good", label: "Что хорошо в отработке возражений", type: "array" },
                    { id: "objections_improve", label: "Что улучшить в отработке возражений", type: "array" },
                    { id: "objections_recommendation", label: "Рекомендация по отработке возражений", type: "text" },
                    
                    { id: "closure_score", label: "Закрытие сделки", type: "numeric" },
                    { id: "closure_good", label: "Что хорошо в закрытии сделки", type: "array" },
                    { id: "closure_improve", label: "Что улучшить в закрытии сделки", type: "array" },
                    { id: "closure_recommendation", label: "Рекомендация по закрытию сделки", type: "text" }
                ]
            },
            {
                blockName: "Общая оценка и рекомендации",
                headers: [
                    { id: "manager_name", label: "Имя менеджера", type: "text" },
                    { id: "total_score", label: "Общая оценка", type: "numeric" },
                    { id: "what_was_good", label: "Что было хорошо", type: "array" },
                    { id: "what_to_improve", label: "Что нужно улучшить", type: "array" },
                    { id: "recommendations", label: "Рекомендации", type: "array" }
                ]
            }
        ]
    },
    scoring: {
        greeting: { 
            max: 1,
            description: "Полное приветствие, представление, название компании, уточнение по заявке"
        },
        programming: {
            max: 1,
            description: "Полное программирование с проверкой согласия"
        },
        needs_identification: {
            max: 2,
            description: "Глубокое выявление, открытые вопросы, активное слушание"
        },
        client_summary: {
            max: 1,
            description: "Полное резюмирование с проверкой понимания"
        },
        presentation: {
            max: 2,
            description: "Презентация по потребностям, язык выгод"
        },
        objection_handling: {
            max: 1,
            description: "Полная отработка с уточнением"
        },
        deal_closure: {
            max: 1,
            description: "Четкое закрытие с договоренностью"
        }
    }
}; 