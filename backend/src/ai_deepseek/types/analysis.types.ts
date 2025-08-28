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
    type: 'numeric' | 'text' | 'array';
    description?: string;
}

export interface TableBlock {
    blockName: string;
    headers: TableHeader[];
}

export interface TableConfig {
    blocks: TableBlock[];
}

export interface AnalysisConfig {
    table: TableConfig;
    scoring: {
        greeting: { max: number; description: string };
        programming: { max: number; description: string };
        needs_identification: { max: number; description: string };
        client_summary: { max: number; description: string };
        presentation: { max: number; description: string };
        objection_handling: { max: number; description: string };
        deal_closure: { max: number; description: string };
    };
} 