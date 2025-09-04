import axios from 'axios';
import { DashboardStats, ManagerStat, DepartmentStat, DepartmentsOverview, DepartmentOverview, DateRange } from '../types/dashboard';
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
  },

  // Новые методы для обзора по отделам
  async getDepartmentsOverview(dateRange?: DateRange): Promise<DepartmentsOverview> {
    if (USE_MOCK_DATA) {
      await simulateApiDelay();
      // Возвращаем mock данные для обзора по отделам
      return {
        period: {
          start: dateRange?.start || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end: dateRange?.end || new Date().toISOString().split('T')[0]
        },
        metrics: {
          totalCalls: 1234,
          totalDuration: 456789,
          averageScore: 4.2
        },
        daily: [
          { date: '2025-09-01', totalCalls: 180, averageScore: 4.1, totalDuration: 65000, successRate: 85 },
          { date: '2025-09-02', totalCalls: 165, averageScore: 4.3, totalDuration: 58000, successRate: 88 },
          { date: '2025-09-03', totalCalls: 195, averageScore: 4.0, totalDuration: 72000, successRate: 82 },
          { date: '2025-09-04', totalCalls: 210, averageScore: 4.4, totalDuration: 78000, successRate: 90 },
        ]
      };
    }

    try {
      const params = new URLSearchParams();
      if (dateRange?.start) params.append('start', dateRange.start);
      if (dateRange?.end) params.append('end', dateRange.end);
      
      const response = await api.get(`/dashboard/departments/overview?${params}`);
      return response.data;
    } catch (error) {
      console.error('API Error, falling back to mock data:', error);
      await simulateApiDelay();
      return {
        period: {
          start: dateRange?.start || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end: dateRange?.end || new Date().toISOString().split('T')[0]
        },
        metrics: {
          totalCalls: 1234,
          totalDuration: 456789,
          averageScore: 4.2
        },
        daily: [
          { date: '2025-09-01', totalCalls: 180, averageScore: 4.1, totalDuration: 65000, successRate: 85 },
          { date: '2025-09-02', totalCalls: 165, averageScore: 4.3, totalDuration: 58000, successRate: 88 },
          { date: '2025-09-03', totalCalls: 195, averageScore: 4.0, totalDuration: 72000, successRate: 82 },
          { date: '2025-09-04', totalCalls: 210, averageScore: 4.4, totalDuration: 78000, successRate: 90 },
        ]
      };
    }
  },

  async getDepartmentOverview(department: string, dateRange?: DateRange): Promise<DepartmentOverview> {
    if (USE_MOCK_DATA) {
      await simulateApiDelay();
      return {
        department,
        period: {
          start: dateRange?.start || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end: dateRange?.end || new Date().toISOString().split('T')[0]
        },
        daily: [
          { date: '2025-09-01', totalCalls: 45, averageScore: 4.2, totalDuration: 18000, successRate: 87 },
          { date: '2025-09-02', totalCalls: 38, averageScore: 4.1, totalDuration: 15000, successRate: 84 },
          { date: '2025-09-03', totalCalls: 52, averageScore: 4.4, totalDuration: 21000, successRate: 92 },
          { date: '2025-09-04', totalCalls: 48, averageScore: 4.3, totalDuration: 19000, successRate: 89 },
        ],
        managers: [
          { id: 1, name: 'Иванов Иван', totalCalls: 85, totalDuration: 34000, averageScore: 4.3 },
          { id: 2, name: 'Петров Петр', totalCalls: 72, totalDuration: 28000, averageScore: 4.1 },
          { id: 3, name: 'Сидоров Сидор', totalCalls: 96, totalDuration: 38000, averageScore: 4.5 },
        ]
      };
    }

    try {
      const params = new URLSearchParams();
      if (dateRange?.start) params.append('start', dateRange.start);
      if (dateRange?.end) params.append('end', dateRange.end);
      
      const response = await api.get(`/dashboard/departments/${encodeURIComponent(department)}/overview?${params}`);
      return response.data;
    } catch (error) {
      console.error('API Error, falling back to mock data:', error);
      await simulateApiDelay();
      return {
        department,
        period: {
          start: dateRange?.start || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end: dateRange?.end || new Date().toISOString().split('T')[0]
        },
        daily: [
          { date: '2025-09-01', totalCalls: 45, averageScore: 4.2, totalDuration: 18000, successRate: 87 },
          { date: '2025-09-02', totalCalls: 38, averageScore: 4.1, totalDuration: 15000, successRate: 84 },
          { date: '2025-09-03', totalCalls: 52, averageScore: 4.4, totalDuration: 21000, successRate: 92 },
          { date: '2025-09-04', totalCalls: 48, averageScore: 4.3, totalDuration: 19000, successRate: 89 },
        ],
        managers: [
          { id: 1, name: 'Иванов Иван', totalCalls: 85, totalDuration: 34000, averageScore: 4.3 },
          { id: 2, name: 'Петров Петр', totalCalls: 72, totalDuration: 28000, averageScore: 4.1 },
          { id: 3, name: 'Сидоров Сидор', totalCalls: 96, totalDuration: 38000, averageScore: 4.5 },
        ]
      };
    }
  }
};
