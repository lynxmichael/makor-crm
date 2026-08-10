import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getInfo() {
    return {
      name: 'MAKOR CRM API',
      description: 'API du CRM interne de MAKOR Group Telecom',
      docs: '/docs',
      health: '/api/v1/health',
    };
  }
}
