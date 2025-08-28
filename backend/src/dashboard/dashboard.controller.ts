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
    // TODO: Реализовать получение звонков менеджера
    return { 
      message: 'Manager calls endpoint - в разработке', 
      managerId: id, 
      limit: parseInt(limit) 
    };
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
}
