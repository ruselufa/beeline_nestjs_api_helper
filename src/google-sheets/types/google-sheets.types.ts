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
	manager_name?: string;
	manager_phone?: string;
	client_email?: string;
	client_name?: string;
	client_gc_id_link?: string;
	orders?: string[];
	null_orders?: string[];
	duration_seconds?: number;
	client_phone?: string;
	client_occupation?: string;
	call_purpose?: string;
	training_name?: string;
	payment_agreements?: string;
	additional_info?: string;
	greeting_score?: number;
	greeting_good?: string[] | string; // Может быть массивом или строкой
	greeting_improve?: string[] | string; // Может быть массивом или строкой
	greeting_recommendation?: string;
	programming_score?: number;
	programming_good?: string[] | string; // Может быть массивом или строкой
	programming_improve?: string[] | string; // Может быть массивом или строкой
	programming_recommendation?: string;
	needs_score?: number;
	needs_good?: string[] | string; // Может быть массивом или строкой
	needs_improve?: string[] | string; // Может быть массивом или строкой
	needs_recommendation?: string;
	summary_score?: number;
	summary_good?: string[] | string; // Может быть массивом или строкой
	summary_improve?: string[] | string; // Может быть массивом или строкой
	summary_recommendation?: string;
	presentation_score?: number;
	presentation_good?: string[] | string; // Может быть массивом или строкой
	presentation_improve?: string[] | string; // Может быть массивом или строкой
	presentation_recommendation?: string;
	objections_score?: number;
	objections_good?: string[] | string; // Может быть массивом или строкой
	objections_improve?: string[] | string; // Может быть массивом или строкой
	objections_recommendation?: string;
	closure_score?: number;
	closure_good?: string[] | string; // Может быть массивом или строкой
	closure_improve?: string[] | string; // Может быть массивом или строкой
	closure_recommendation?: string;
	total_score?: number;
	overall_good?: string[] | string; // Может быть массивом или строкой
	overall_improve?: string[] | string; // Может быть массивом или строкой
	overall_recommendations?: string[] | string; // Может быть массивом или строкой
	recommendation_greeting?: string;
	recommendation_points?: string[] | string; // Может быть массивом или строкой
	recommendation_closing?: string;
	abonent_name?: string;
	abonent_phone?: string;

	// Динамические поля из анализа (могут быть любого типа)
	[key: string]: any;

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