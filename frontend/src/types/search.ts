export interface SearchResult {
  id: number;
  abonentName: string;
  abonentPhone: string;
  managerName: string;
  managerPhone: string;
  managerDepartment: string;
  callDate: string;
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

export interface SearchRequest {
  keywords: string[];
  page?: number;
  limit?: number;
}
