import axios from 'axios';
import { DashboardStats, ManagerStat, DepartmentStat } from '../types/dashboard';
import { mockDashboardStats, mockManagerStats, mockDepartmentStats } from './mockData';

// const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const API_BASE_URL = 'http://localhost:3001/api';
// const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK === 'true' || !import.meta.env.VITE_API_URL;
const USE_MOCK_DATA = false;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Функция для имитации задержки API
const simulateApiDelay = (ms: number = 500) => 
  new Promise(resolve => setTimeout(resolve, ms));

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    if (USE_MOCK_DATA) {
      await simulateApiDelay();
      return mockDashboardStats;
    }
    
    try {
      const response = await api.get('/dashboard/stats');
      return response.data;
    } catch (error) {
      console.error('API Error, falling back to mock data:', error);
      await simulateApiDelay();
      return mockDashboardStats;
    }
  },
  
  async getManagerStats(managerId: number): Promise<ManagerStat> {
    if (USE_MOCK_DATA) {
      await simulateApiDelay();
      const mockData = mockManagerStats[managerId];
      if (!mockData) {
        throw new Error(`Manager with ID ${managerId} not found`);
      }
      return mockData;
    }
    
    try {
      const response = await api.get(`/managers/${managerId}/stats`);
      return response.data;
    } catch (error) {
      console.error('API Error, falling back to mock data:', error);
      await simulateApiDelay();
      const mockData = mockManagerStats[managerId];
      if (!mockData) {
        throw new Error(`Manager with ID ${managerId} not found`);
      }
      return mockData;
    }
  },
  
  async getDepartmentStats(department: string): Promise<DepartmentStat> {
    if (USE_MOCK_DATA) {
      await simulateApiDelay();
      const mockData = mockDepartmentStats[department];
      if (!mockData) {
        throw new Error(`Department ${department} not found`);
      }
      return mockData;
    }
    
    try {
      const response = await api.get(`/departments/${department}/stats`);
      return response.data;
    } catch (error) {
      console.error('API Error, falling back to mock data:', error);
      await simulateApiDelay();
      const mockData = mockDepartmentStats[department];
      if (!mockData) {
        throw new Error(`Department ${department} not found`);
      }
      return mockData;
    }
  },

  async getManagerCalls(managerId: number, limit: number = 50): Promise<any[]> {
    if (USE_MOCK_DATA) {
      await simulateApiDelay();
      // Возвращаем подмножество звонков для конкретного менеджера
      return mockDashboardStats.recentCalls
        .filter(call => call.managerName === mockManagerStats[managerId]?.name)
        .slice(0, limit);
    }
    
    try {
      const response = await api.get(`/managers/${managerId}/calls`, {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      console.error('API Error, falling back to mock data:', error);
      await simulateApiDelay();
      return mockDashboardStats.recentCalls
        .filter(call => call.managerName === mockManagerStats[managerId]?.name)
        .slice(0, limit);
    }
  },

  async getDepartmentCalls(department: string, limit: number = 50): Promise<any[]> {
    if (USE_MOCK_DATA) {
      await simulateApiDelay();
      // Возвращаем подмножество звонков для конкретного отдела
      return mockDashboardStats.recentCalls
        .filter(call => call.department === department)
        .slice(0, limit);
    }
    
    try {
      const response = await api.get(`/departments/${department}/calls`, {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      console.error('API Error, falling back to mock data:', error);
      await simulateApiDelay();
      return mockDashboardStats.recentCalls
        .filter(call => call.department === department)
        .slice(0, limit);
    }
  }
};
