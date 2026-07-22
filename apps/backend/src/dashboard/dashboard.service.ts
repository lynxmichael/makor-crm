import { Injectable } from '@nestjs/common';

@Injectable()
export class DashboardService {
  getDashboard() {
    return {
      message: 'Dashboard API',
    };
  }
}
