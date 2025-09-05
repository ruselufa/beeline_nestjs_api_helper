import axios from 'axios';
import { SearchRequest, SearchResponse } from '../types/search';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const searchService = {
  async searchByKeywords(request: SearchRequest): Promise<SearchResponse> {
    const response = await axios.post(`${API_BASE_URL}/search/keywords`, request);
    return response.data;
  },

  async exportToCsv(keywords: string[] | string): Promise<Blob> {
    const response = await axios.post(
      `${API_BASE_URL}/search/export-csv`,
      { keywords },
      { responseType: 'blob' }
    );
    return response.data;
  }
};
