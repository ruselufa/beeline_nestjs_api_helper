export interface GoogleSheetsConfig {
	credentials_path: string;
	spreadsheet_id: string;
}

export interface TableHeader {
	id: string;
	label: string;
	type: string;
	value: any;
}

export interface TableBlock {
	blockName: string;
	headers: TableHeader[];
}

export interface TableConfig {
	blocks: TableBlock[];
}

export interface TableData {
	blocks: TableBlock[];
}

export interface GoogleSheetsRow {
	// Базовая структура для плоских данных
	record_id?: string;
	call_date?: string;
	department?: string;
	abonent_name?: string;
	abonent_phone?: string;
	client_email?: string;
	client_name?: string;
	client_gc_id_link?: string;
	orders?: string[];
	null_orders?: string[];
	duration_seconds?: number;
	manager_name?: string;
	client_occupation?: string;
	call_purpose?: string;
	training_name?: string;
	payment_agreements?: string;
	additional_info?: string;
	greeting_score?: number;
	greeting_good?: string[];
	greeting_improve?: string[];
	greeting_recommendation?: string;
	programming_score?: number;
	programming_good?: string[];
	programming_improve?: string[];
	programming_recommendation?: string;
	needs_score?: number;
	needs_good?: string[];
	needs_improve?: string[];
	needs_recommendation?: string;
	summary_score?: number;
	summary_good?: string[];
	summary_improve?: string[];
	summary_recommendation?: string;
	presentation_score?: number;
	presentation_good?: string[];
	presentation_improve?: string[];
	presentation_recommendation?: string;
	objections_score?: number;
	objections_good?: string[];
	objections_improve?: string[];
	objections_recommendation?: string;
	closure_score?: number;
	closure_good?: string[];
	closure_improve?: string[];
	closure_recommendation?: string;
	total_score?: number;
	overall_good?: string;
	overall_improve?: string;
	overall_recommendations?: string;
	recommendation_greeting?: string;
	recommendation_points?: string;
	recommendation_closing?: string;

	// Структура для данных из JSON файла
	table?: TableData;
}

export interface GoogleSheetsCredentials {
	type: string;
	project_id: string;
	private_key_id: string;
	private_key: string;
	client_email: string;
	client_id: string;
	auth_uri: string;
	token_uri: string;
	auth_provider_x509_cert_url: string;
	client_x509_cert_url: string;
}

export interface WriteResult {
	success: boolean;
	error?: string;
	rowsWritten?: number;
} 