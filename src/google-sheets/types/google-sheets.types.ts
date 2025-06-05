export interface GoogleSheetsConfig {
	credentials_path: string;
	spreadsheet_id: string;
}

export interface TableBlock {
	blockName: string;
	headers: TableHeader[];
}

export interface TableHeader {
	id: string;
	label: string;
}

export interface TableConfig {
	blocks: TableBlock[];
}

export interface GoogleSheetsRow {
	record_id: string;
	call_date: string;
	department: string;
	abonent_name: string;
	abonent_phone: string;
	client_email?: string;
	client_name?: string;
	client_gc_id_link?: string;
	duration_seconds: number;
	// Client data
	orders?: string;
	null_orders?: string;
	
	// AI analysis fields based on config.json
	sale_probability?: number;
	rating_explanation_1?: string;
	conversation_result?: string;
	detailed_summary?: string;
	attitude?: number;
	rating_explanation_2?: string;
	facts?: string;
	needs?: string;
	objections?: string;
	politeness?: number;
	rating_explanation_3?: string;
	presentation?: number;
	rating_explanation_4?: string;
	objection_handling?: number;
	rating_explanation_5?: string;
	mop_advice?: string;
	
	// Additional fields from config.json
	greeting?: number;
	call_purpose?: number;
	full_dialog_structure?: number;
	needs_identification?: number;
	client_summary?: number;
	product_presentation?: number;
	format_presentation?: number;
	price_presentation?: number;
	feedback_removal?: number;
	objection_agreement?: number;
	true_objection_reveal?: number;
	objection_processing?: number;
	deal_closure?: number;
	active_listening?: number;
	next_step?: number;
	manager_active_position?: number;
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