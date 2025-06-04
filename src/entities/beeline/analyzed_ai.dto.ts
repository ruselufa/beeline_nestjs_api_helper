type CreateAnalyzedAiDto = {
	conversationId: string;
	department: string;
	originalText: string;
	analysisResult: Record<string, any>;
	clientId: number;
	clientName?: string;
	clientPhone?: string;
	clientEmail?: string;
};