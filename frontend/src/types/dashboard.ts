export interface ManagerStat {
  id: number;
  name: string;
  department: string;
  totalCalls: number;
  averageScore: number;
  totalDuration: number;
  trend: 'up' | 'down' | 'stable';
  lastCallDate: Date;
  successRate: number;
}

export interface CallData {
  date: string;
  totalCalls: number;
  averageScore: number;
  totalDuration: number;
  successRate: number;
}

export interface DepartmentStat {
  name: string;
  totalCalls: number;
  averageScore: number;
  totalDuration: number;
  managerCount: number;
  topManager: string;
  trend: 'up' | 'down' | 'stable';
}

export interface CallRecord {
  id: number;
  managerId: number;
  managerName: string;
  clientPhone: string;
  duration: number;
  score: number;
  date: Date;
  department: string;
  analysis: {
    quality: number;
    sales: number;
    recommendations: string[];
  };
}

export interface DashboardStats {
  managerStats: ManagerStat[];
  callAnalytics: CallData[];
  departmentStats: DepartmentStat[];
  recentCalls: CallRecord[];
  summary: {
    totalCalls: number;
    averageScore: number;
    totalDuration: number;
    activeManagers: number;
  };
}

// Новые типы для обзора по отделам
export interface DepartmentsOverview {
  period: {
    start: string;
    end: string;
  };
  metrics: {
    totalCalls: number;
    totalDuration: number;
    averageScore: number;
  };
  daily: CallData[];
}

export interface DepartmentOverview {
  department: string;
  period: {
    start: string;
    end: string;
  };
  daily: CallData[];
  managers: {
    id: number;
    name: string;
    totalCalls: number;
    totalDuration: number;
    averageScore: number;
  }[];
}

export interface DateRange {
  start: string;
  end: string;
}

// Детальная информация о звонке менеджера
export interface ManagerCallRecord {
  id: number;
  beelineId: string;
  beelineExternalId: string;
  callId: string;
  phone: string;
  direction: string;
  date: Date;
  createdAt: Date;
  duration: number;
  fileSize: number;
  comment: string;
  score: number;
  managerName: string;
  department: string;
  deepseekAnalysis: any; // Полный JSON анализа
}
