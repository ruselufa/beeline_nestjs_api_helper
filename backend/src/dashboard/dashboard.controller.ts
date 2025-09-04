import { Controller, Get, Param, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  async getDashboardStats() {
    return await this.dashboardService.getDashboardStats();
  }

  @Get('managers/:id/stats')
  async getManagerStats(@Param('id') id: string) {
    // TODO: Реализовать детальную статистику менеджера
    return { message: 'Manager stats endpoint - в разработке', managerId: id };
  }

  @Get('departments/:name/stats')
  async getDepartmentStats(@Param('name') name: string) {
    // TODO: Реализовать детальную статистику отдела
    return { message: 'Department stats endpoint - в разработке', departmentName: name };
  }

  @Get('managers/:id/calls')
  async getManagerCalls(
    @Param('id') id: string,
    @Query('limit') limit: string = '50',
  ) {
    const managerId = parseInt(id, 10);
    const limitNum = parseInt(limit, 10);
    return this.dashboardService.getManagerCalls(managerId, limitNum);
  }

  @Get('departments/:name/calls')
  async getDepartmentCalls(
    @Param('name') name: string,
    @Query('limit') limit: string = '50',
  ) {
    // TODO: Реализовать получение звонков отдела
    return { 
      message: 'Department calls endpoint - в разработке', 
      departmentName: name, 
      limit: parseInt(limit) 
    };
  }

  // Новый: обзор по всем отделам за период (по дням)
  @Get('departments/overview')
  async getDepartmentsOverview(
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    const endDate = end ? new Date(end) : new Date();
    const startDate = start ? new Date(start) : new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    return this.dashboardService.getDepartmentsOverview(startDate, endDate);
  }

  // Новый: обзор по конкретному отделу за период
  @Get('departments/:name/overview')
  async getDepartmentOverview(
    @Param('name') name: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    const endDate = end ? new Date(end) : new Date();
    const startDate = start ? new Date(start) : new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    return this.dashboardService.getDepartmentOverview(name, startDate, endDate);
  }
}
