export interface AbonentsResponse {
	userId: string;
	phone: string;
	firstName?: string;
	lastName?: string;
	department: string;
	extension: string;
}

export interface ApiErrorResponse {
	message?: string;
	error?: string;
	statusCode?: number;
}

export interface RecordDetailsResponse {
	id: string;
	externalId: string;
	callId: string;
	phone: string;
	direction: string;
	date: string;
	duration: number;
	fileSize: number;
	comment: string;
	abonent: AbonentsResponse;
}
